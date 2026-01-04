"""
Public views for invoice acceptance (no authentication required).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db import transaction
from django.http import FileResponse
from django.conf import settings
import os
from datetime import timedelta

from .models import Invoice, InvoiceAcceptance, InvoiceAcceptanceToken, InvoiceStatus
from .serializers import PublicInvoiceSummarySerializer
from .utils import (
    hash_token, verify_token, calculate_pdf_hash, get_client_ip, get_invoice_pdf_path
)
from apps.audit.utils import create_audit_log


def _get_token_object(token):
    """Get token object from token string."""
    token_hash = hash_token(token)
    try:
        token_obj = InvoiceAcceptanceToken.objects.get(token_hash=token_hash)
        return token_obj
    except InvoiceAcceptanceToken.DoesNotExist:
        return None

def _validate_token(token):
    """Validate token and return token object or error response."""
    token_obj = _get_token_object(token)
    
    if not token_obj:
        return None, Response(
            {'error': 'Token invalide'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if token_obj.is_expired():
        return None, Response(
            {'error': 'Token expiré', 'expires_at': token_obj.expires_at.isoformat()},
            status=status.HTTP_410_GONE
        )
    
    return token_obj, None


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def invoice_acceptance(request, token):
    """Handle invoice acceptance - GET for summary, POST for acceptance."""
    token_obj, error_response = _validate_token(token)
    if error_response:
        return error_response
    
    invoice = token_obj.invoice
    
    # Handle POST request (accept invoice)
    if request.method == 'POST':
        # Check if token already used
        if token_obj.used_at is not None:
            return Response(
                {'error': 'Ce lien a déjà été utilisé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if invoice is validated
        if invoice.statut != InvoiceStatus.VALIDEE:
            return Response(
                {'error': 'La facture doit être validée avant acceptation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already accepted
        if invoice.statut == InvoiceStatus.ACCEPTEE:
            try:
                acceptance = invoice.acceptance
                return Response(
                    {
                        'status': 'already_accepted',
                        'accepted_at': acceptance.accepted_at.isoformat(),
                        'accepted_name': acceptance.accepted_name,
                        'pdf_download_url': f"/api/billing/public/invoices/pdf/{token}/"
                    },
                    status=status.HTTP_200_OK
                )
            except InvoiceAcceptance.DoesNotExist:
                pass
        
        # Validate request data
        accept = request.data.get('accept', False)
        if not accept or accept is not True:
            return Response(
                {'error': 'Le champ accept doit être true'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        accepted_name = request.data.get('accepted_name', '').strip() or None
        
        # Get PDF path and calculate hash
        pdf_path = get_invoice_pdf_path(invoice)
        if not pdf_path or not os.path.exists(pdf_path):
            return Response(
                {'error': 'PDF de la facture introuvable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        pdf_hash = calculate_pdf_hash(pdf_path)
        
        # Get client info
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Create acceptance in transaction
        with transaction.atomic():
            # Create InvoiceAcceptance
            acceptance = InvoiceAcceptance.objects.create(
                invoice=invoice,
                ip_address=ip_address,
                user_agent=user_agent,
                pdf_hash=pdf_hash,
                acceptance_text_version='v1',
                accepted_name=accepted_name
            )
            
            # Mark token as used
            token_obj.used_at = timezone.now()
            token_obj.save()
            
            # Update invoice status
            invoice.statut = InvoiceStatus.ACCEPTEE
            invoice.save()
            
            # Create audit log
            create_audit_log(
                instance=invoice,
                action='ACCEPTED_BY_CLIENT',
                user=None,  # No authenticated user
                before_data={'statut': 'VALIDEE'},
                after_data={'statut': 'ACCEPTEE'},
                reason=f'Acceptée via token. IP: {ip_address}, Name: {accepted_name or "Non renseigné"}',
                request=request
            )
        
        return Response({
            'status': 'accepted',
            'accepted_at': acceptance.accepted_at.isoformat(),
            'accepted_name': acceptance.accepted_name,
            'pdf_download_url': f"/api/billing/public/invoices/pdf/{token}/"
        }, status=status.HTTP_200_OK)
    
    # Handle GET request (get invoice summary)
    # Check if invoice is validated
    if invoice.statut != InvoiceStatus.VALIDEE and invoice.statut != InvoiceStatus.ACCEPTEE:
        return Response(
            {'error': 'Facture non disponible. La facture doit être validée.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get acceptance if exists
    acceptance = None
    try:
        acceptance = invoice.acceptance
    except InvoiceAcceptance.DoesNotExist:
        pass
    
    # Build PDF download URL
    pdf_download_url = f"/api/billing/public/invoices/pdf/{token}/"
    
    # Get invoice lines - use simplified serializer for public view
    from .serializers import PublicInvoiceLineSerializer
    from apps.catalog.serializers import ProductSerializer
    invoice_lines = invoice.invoice_lines.all()
    lines_data = []
    for line in invoice_lines:
        # Serialize product_detail separately to avoid nested relation issues
        product_detail_data = ProductSerializer(line.product).data if line.product else None
        line_data = {
            'id': line.id,
            'product': line.product_id,
            'product_detail': product_detail_data,
            'qty': float(line.qty),
            'prix_unit_applique': float(line.prix_unit_applique),
            'total_ligne': float(line.total_ligne),
        }
        lines_data.append(line_data)
    
    # Build summary
    summary_data = {
        'invoice_number': invoice.numero or f'Brouillon-{invoice.id}',
        'client_name': invoice.client.nom_complet,
        'total': float(invoice.total_ttc),
        'total_ht': float(invoice.total),
        'tva_jus': float(invoice.tva_jus),
        'tva_biere': float(invoice.tva_biere),
        'tva': float(invoice.tva_jus + invoice.tva_biere),  # Total TVA for compatibility
        'paid': float(invoice.paye),
        'remaining': float(invoice.reste),
        'status': invoice.statut,
        'accepted': acceptance is not None,
        'accepted_at': acceptance.accepted_at.isoformat() if acceptance else None,
        'accepted_name': acceptance.accepted_name if acceptance else None,
        'pdf_download_url': pdf_download_url,
        'invoice_lines': lines_data,
    }
    
    serializer = PublicInvoiceSummarySerializer(summary_data)
    return Response(serializer.data)
    """Accept invoice via token."""
    token_obj, error_response = _validate_token(token)
    if error_response:
        return error_response
    
    # Check if token already used
    if token_obj.used_at is not None:
        return Response(
            {'error': 'Ce lien a déjà été utilisé'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    invoice = token_obj.invoice
    
    # Check if invoice is validated
    if invoice.statut != InvoiceStatus.VALIDEE:
        return Response(
            {'error': 'La facture doit être validée avant acceptation'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already accepted
    if invoice.statut == InvoiceStatus.ACCEPTEE:
        try:
            acceptance = invoice.acceptance
            return Response(
                {
                    'status': 'already_accepted',
                    'accepted_at': acceptance.accepted_at.isoformat(),
                    'accepted_name': acceptance.accepted_name,
                    'pdf_download_url': f"/api/billing/public/invoices/pdf/{token}/"
                },
                status=status.HTTP_200_OK
            )
        except InvoiceAcceptance.DoesNotExist:
            pass
    
    # Validate request data
    accept = request.data.get('accept', False)
    if not accept or accept is not True:
        return Response(
            {'error': 'Le champ accept doit être true'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    accepted_name = request.data.get('accepted_name', '').strip() or None
    
    # Get PDF path and calculate hash
    pdf_path = get_invoice_pdf_path(invoice)
    if not pdf_path or not os.path.exists(pdf_path):
        return Response(
            {'error': 'PDF de la facture introuvable'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    pdf_hash = calculate_pdf_hash(pdf_path)
    
    # Get client info
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Create acceptance in transaction
    with transaction.atomic():
        # Create InvoiceAcceptance
        acceptance = InvoiceAcceptance.objects.create(
            invoice=invoice,
            ip_address=ip_address,
            user_agent=user_agent,
            pdf_hash=pdf_hash,
            acceptance_text_version='v1',
            accepted_name=accepted_name
        )
        
        # Mark token as used
        token_obj.used_at = timezone.now()
        token_obj.save()
        
        # Update invoice status
        invoice.statut = InvoiceStatus.ACCEPTEE
        invoice.save()
        
        # Create audit log
        create_audit_log(
            instance=invoice,
            action='ACCEPTED_BY_CLIENT',
            user=None,  # No authenticated user
            before_data={'statut': 'VALIDEE'},
            after_data={'statut': 'ACCEPTEE'},
            reason=f'Acceptée via token. IP: {ip_address}, Name: {accepted_name or "Non renseigné"}',
            request=request
        )
    
    return Response({
        'status': 'accepted',
        'accepted_at': acceptance.accepted_at.isoformat(),
        'accepted_name': acceptance.accepted_name,
        'pdf_download_url': f"/api/billing/public/invoices/pdf/{token}/"
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def download_pdf(request, token):
    """Download invoice PDF via token."""
    token_obj, error_response = _validate_token(token)
    if error_response:
        return error_response
    
    invoice = token_obj.invoice
    
    # Check if invoice is validated or accepted
    if invoice.statut not in [InvoiceStatus.VALIDEE, InvoiceStatus.ACCEPTEE]:
        return Response(
            {'error': 'Facture non disponible'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get PDF path
    pdf_path = get_invoice_pdf_path(invoice)
    if not pdf_path or not os.path.exists(pdf_path):
        return Response(
            {'error': 'PDF introuvable'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Stream PDF file
    filename = os.path.basename(pdf_path)
    response = FileResponse(
        open(pdf_path, 'rb'),
        content_type='application/pdf'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@api_view(['POST'])
@permission_classes([AllowAny])
def contest_invoice(request, token):
    """Contest an accepted invoice via token."""
    from .models import InvoiceContestation
    
    token_obj, error_response = _validate_token(token)
    if error_response:
        return error_response
    
    invoice = token_obj.invoice
    
    # Check if invoice is accepted
    if invoice.statut != InvoiceStatus.ACCEPTEE:
        return Response(
            {'error': 'Seules les factures acceptées peuvent être contestées'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already contested
    if invoice.statut == InvoiceStatus.CONTESTEE:
        try:
            contestation = invoice.contestation
            return Response(
                {
                    'status': 'already_contested',
                    'contested_at': contestation.contested_at.isoformat(),
                    'reason': contestation.reason,
                },
                status=status.HTTP_200_OK
            )
        except InvoiceContestation.DoesNotExist:
            pass
    
    # Get contestation data
    reason = request.data.get('reason', '').strip()
    contested_by_name = request.data.get('contested_by_name', '').strip() or None
    contested_by_email = request.data.get('contested_by_email', '').strip() or None
    
    if not reason:
        return Response(
            {'error': 'La raison de la contestation est requise'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get client info
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Create contestation
    contestation = InvoiceContestation.objects.create(
        invoice=invoice,
        reason=reason,
        contested_by_name=contested_by_name,
        contested_by_email=contested_by_email,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Update invoice status
    invoice.statut = InvoiceStatus.CONTESTEE
    invoice.save()
    
    # Create audit log
    create_audit_log(
        instance=invoice,
        action='CONTEST_INVOICE',
        user=None,  # No authenticated user
        before_data={'statut': 'ACCEPTEE'},
        after_data={'statut': 'CONTESTEE'},
        reason=f'Contestée via token. Raison: {reason[:100]}, IP: {ip_address}',
        request=request
    )
    
    return Response({
        'status': 'contested',
        'contested_at': contestation.contested_at.isoformat(),
        'message': 'Votre contestation a été enregistrée. Nous vous contacterons sous peu.'
    }, status=status.HTTP_200_OK)

