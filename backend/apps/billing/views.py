"""
Views for billing app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from datetime import timedelta
import os
from .models import Invoice, InvoiceLine, Payment, CompanySettings, InvoiceStatus, InvoiceAcceptanceToken
from .utils import generate_acceptance_token, hash_token, get_invoice_pdf_path
from .serializers import (
    InvoiceSerializer,
    InvoiceDetailSerializer,
    InvoiceLineSerializer,
    PaymentSerializer,
    CompanySettingsSerializer
)
from apps.users.permissions import IsReadOnlyOrAuthenticated, IsCommercial, IsAdminGSA, HasCustomPermission
from apps.users.utils import user_has_permission
from apps.audit.utils import create_audit_log
from apps.clients.models import ClientPrice
from apps.catalog.models import Product, BasePrice
from apps.stock.models import StockMovement, MovementType


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Invoice management."""
    queryset = Invoice.objects.select_related('client', 'validated_by').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'type', 'client']
    search_fields = ['numero', 'client__nom', 'client__entreprise']
    ordering_fields = ['created_at', 'total', 'numero']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return InvoiceDetailSerializer
        return InvoiceSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create']:
            # Check custom permission for creating invoices
            class CanCreateInvoices(HasCustomPermission):
                permission_name = 'can_create_invoices'
            return [IsAuthenticated(), CanCreateInvoices()]
        elif self.action in ['validate']:
            # Check custom permission for validating invoices
            class CanValidateInvoices(HasCustomPermission):
                permission_name = 'can_validate_invoices'
            return [IsAuthenticated(), CanValidateInvoices()]
        elif self.action in ['update', 'partial_update', 'cancel', 'create_avoir']:
            return [IsAuthenticated(), IsCommercial()]
        return [IsReadOnlyOrAuthenticated()]

    def perform_create(self, serializer):
        """Create invoice and log audit."""
        instance = serializer.save()
        create_audit_log(
            instance=instance,
            action='CREATE_INVOICE',
            user=self.request.user,
            after_data=serializer.data,
            request=self.request
        )

    def perform_update(self, serializer):
        """Update invoice if brouillon, log audit."""
        instance = self.get_object()
        if instance.statut == InvoiceStatus.ACCEPTEE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot modify an accepted invoice. The invoice has been accepted by the client.'
            )
        if instance.statut != InvoiceStatus.BROUILLON:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot modify a validated invoice. Create an avoir instead.'
            )
        
        before_data = InvoiceSerializer(instance).data
        # Check if tva_incluse is being updated
        tva_incluse_changed = 'tva_incluse' in serializer.validated_data
        
        instance = serializer.save()
        
        # Recalculate totals if tva_incluse was changed
        if tva_incluse_changed:
            instance.calculate_totals()
            # Refresh instance to get updated totals
            instance.refresh_from_db()
        
        after_data = InvoiceSerializer(instance).data
        
        create_audit_log(
            instance=instance,
            action='UPDATE_INVOICE',
            user=self.request.user,
            before_data=before_data,
            after_data=after_data,
            request=self.request
        )

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate invoice: generate number, PDF, create stock movements, lock lines."""
        invoice = self.get_object()
        
        if invoice.statut != InvoiceStatus.BROUILLON:
            return Response(
                {'error': 'Invoice is not in BROUILLON status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if invoice has lines
        if not invoice.invoice_lines.exists():
            return Response(
                {'error': 'Cannot validate invoice without lines. Please add at least one line.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate invoice number
        invoice.numero = Invoice.generate_invoice_number()
        
        # Check stock availability for each line
        for line in invoice.invoice_lines.all():
            stock = StockMovement.get_current_stock(line.product)
            if stock < line.qty:
                return Response(
                    {
                        'error': f'Insufficient stock for {line.product.nom}. Available: {stock}, Required: {line.qty}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create stock movements (VENTE - negative quantities)
        movements_created = []
        try:
            for line in invoice.invoice_lines.all():
                movement = StockMovement.objects.create(
                    product=line.product,
                    qty_signee=-line.qty,  # Negative for sale
                    type=MovementType.VENTE,
                    reference=f"FACT-{invoice.numero}",
                    created_by=request.user
                )
                movements_created.append(movement)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating stock movements for invoice {invoice.numero}: {str(e)}")
            return Response(
                {'error': f'Error creating stock movements: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update invoice status FIRST (before PDF generation)
        invoice.statut = InvoiceStatus.VALIDEE
        invoice.validated_at = timezone.now()
        invoice.validated_by = request.user
        invoice.update_payment_status()  # Set prochaine_date_relance if needed
        invoice.save()
        
        # Log audit BEFORE PDF generation (so validation is logged even if PDF fails)
        create_audit_log(
            instance=invoice,
            action='VALIDATE_INVOICE',
            user=request.user,
            after_data=InvoiceSerializer(invoice).data,
            reason=f'Validation facture {invoice.numero} - {len(movements_created)} mouvements créés',
            request=request
        )
        
        # Generate PDF AFTER status update and audit log (optional)
        from .utils import generate_invoice_pdf, WEASYPRINT_AVAILABLE
        pdf_error = None
        if WEASYPRINT_AVAILABLE:
            try:
                invoice.pdf_path = generate_invoice_pdf(invoice)
                invoice.save()
            except Exception as e:
                # Log error but don't fail validation - PDF can be generated later
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error generating PDF for invoice {invoice.numero}: {str(e)}")
                pdf_error = str(e)
                # Don't set placeholder - leave pdf_path empty so we know it needs generation
        else:
            # WeasyPrint not available - skip PDF generation
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"PDF generation skipped for invoice {invoice.numero}: WeasyPrint dependencies not available")
            pdf_error = "PDF generation is not available. WeasyPrint system dependencies are missing."
        
        serializer = self.get_serializer(invoice)
        response_data = {
            'message': f'Facture validée avec succès. {len(movements_created)} mouvements de stock créés.',
            'invoice': serializer.data
        }
        if pdf_error:
            response_data['warning'] = f'La facture a été validée mais la génération du PDF a échoué. Vous pouvez générer le PDF plus tard.'
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invoice (brouillon, validated, accepted, or contested)."""
        invoice = self.get_object()
        
        # Don't allow cancellation of already cancelled invoices or credit notes
        if invoice.statut in [InvoiceStatus.ANNULEE, InvoiceStatus.AVOIR]:
            return Response(
                {'error': 'Cannot cancel an already cancelled invoice or credit note'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For validated/accepted/contested invoices, create reverse stock movements
        # For brouillon invoices, no stock movements needed (they never created any)
        movements_created = []
        if invoice.statut not in [InvoiceStatus.BROUILLON]:
            if invoice.invoice_lines.exists():
                for line in invoice.invoice_lines.all():
                    movement = StockMovement.objects.create(
                        product=line.product,
                        qty_signee=line.qty,  # Positive to reverse the sale
                        type=MovementType.AJUSTEMENT,
                        reference=f"ANNUL-{invoice.numero or f'Brouillon-{invoice.id}'}",
                        created_by=request.user,
                        reason=f'Annulation facture {invoice.numero or f"Brouillon-{invoice.id}"}'
                    )
                    movements_created.append(movement)
        
        invoice.statut = InvoiceStatus.ANNULEE
        invoice.save()
        
        create_audit_log(
            instance=invoice,
            action='CANCEL_INVOICE',
            user=request.user,
            after_data=InvoiceSerializer(invoice).data,
            reason=f'Annulation facture {invoice.numero}',
            request=request
        )
        
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_for_acceptance(self, request, pk=None):
        """Generate acceptance token and return acceptance URL."""
        invoice = self.get_object()
        
        # Check invoice is validated
        if invoice.statut != InvoiceStatus.VALIDEE:
            return Response(
                {'error': 'La facture doit être validée avant de pouvoir être envoyée pour acceptation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check PDF exists
        pdf_path = get_invoice_pdf_path(invoice)
        if not pdf_path or not os.path.exists(pdf_path):
            return Response(
                {'error': 'Le PDF de la facture n\'existe pas. Veuillez d\'abord générer le PDF.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate token
        token_brut = generate_acceptance_token()
        token_hash = hash_token(token_brut)
        
        # Create token object (expires in 14 days)
        expires_at = timezone.now() + timedelta(days=14)
        token_obj = InvoiceAcceptanceToken.objects.create(
            invoice=invoice,
            token_hash=token_hash,
            expires_at=expires_at,
            created_by=request.user
        )
        
        # Build acceptance URL
        # Frontend runs on localhost:5173 in development
        from django.conf import settings
        if settings.DEBUG:
            frontend_base = 'http://localhost:5173'
        else:
            # In production, use the frontend URL from settings or request origin
            frontend_base = request.build_absolute_uri('/').rstrip('/').replace('backend:8000', 'localhost:5173')
        accept_url = f"{frontend_base}/accept/invoice/{token_brut}"
        
        return Response({
            'accept_url': accept_url,
            'expires_at': expires_at.isoformat(),
            'token_id': token_obj.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download invoice PDF. Generate if not exists."""
        from django.http import FileResponse
        from django.conf import settings
        from .utils import generate_invoice_pdf, WEASYPRINT_AVAILABLE
        import os
        
        invoice = self.get_object()
        
        # Check if invoice is validated
        if invoice.statut != InvoiceStatus.VALIDEE:
            return Response(
                {'error': 'Invoice must be validated before PDF can be generated'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if WeasyPrint is available
        if not WEASYPRINT_AVAILABLE:
            return Response(
                {
                    'error': 'PDF generation is not available. WeasyPrint system dependencies are missing. '
                             'Please install: apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libgobject-2.0-0'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Generate PDF if it doesn't exist
        if not invoice.pdf_path:
            try:
                invoice.pdf_path = generate_invoice_pdf(invoice)
                invoice.save()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error generating PDF for invoice {invoice.numero}: {str(e)}")
                return Response(
                    {'error': f'Error generating PDF: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        pdf_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
        
        # Regenerate if file doesn't exist
        if not os.path.exists(pdf_path):
            try:
                invoice.pdf_path = generate_invoice_pdf(invoice)
                invoice.save()
                pdf_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error regenerating PDF for invoice {invoice.numero}: {str(e)}")
                return Response(
                    {'error': f'Error generating PDF: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        try:
            invoice_number = invoice.numero or f"Brouillon-{invoice.id}"
            return FileResponse(
                open(pdf_path, 'rb'),
                content_type='application/pdf',
                filename=f"{invoice_number}.pdf"
            )
        except FileNotFoundError:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"PDF file not found for invoice {invoice.numero}: {pdf_path}")
            return Response(
                {'error': 'Le fichier PDF est introuvable. Veuillez régénérer le PDF.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error reading PDF file for invoice {invoice.numero}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Erreur lors de la lecture du fichier PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def postpone_reminder(self, request, pk=None):
        """Postpone reminder date for an invoice."""
        invoice = self.get_object()
        
        if invoice.statut != InvoiceStatus.VALIDEE or invoice.reste == 0:
            return Response(
                {'error': 'Can only postpone reminder for unpaid validated invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        days = request.data.get('days', 7)
        try:
            days = int(days)
        except (ValueError, TypeError):
            days = 7
        
        old_date = invoice.prochaine_date_relance
        from datetime import timedelta
        if invoice.prochaine_date_relance:
            invoice.prochaine_date_relance = invoice.prochaine_date_relance + timedelta(days=days)
        else:
            invoice.prochaine_date_relance = timezone.now().date() + timedelta(days=days)
        invoice.save()
        
        create_audit_log(
            instance=invoice,
            action='POSTPONE_REMINDER',
            user=request.user,
            before_data={'prochaine_date_relance': str(old_date) if old_date else None},
            after_data={'prochaine_date_relance': str(invoice.prochaine_date_relance)},
            reason=f'Report relance de {days} jours',
            request=request
        )
        
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_avoir(self, request, pk=None):
        """Create an avoir (credit note) for a validated invoice."""
        invoice_origine = self.get_object()
        
        if invoice_origine.statut != InvoiceStatus.VALIDEE:
            return Response(
                {'error': 'Can only create avoir for validated invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create avoir invoice
        avoir = Invoice.objects.create(
            client=invoice_origine.client,
            statut=InvoiceStatus.AVOIR,
            type=invoice_origine.type,
            validated_at=timezone.now(),
            validated_by=request.user
        )
        
        # Copy lines with negative quantities
        for line in invoice_origine.invoice_lines.all():
            InvoiceLine.objects.create(
                invoice=avoir,
                product=line.product,
                qty=line.qty,
                prix_unit_applique=line.prix_unit_applique
            )
        
        avoir.calculate_totals()
        avoir.numero = Invoice.generate_invoice_number()
        avoir.save()
        
        create_audit_log(
            instance=avoir,
            action='CREATE_AVOIR',
            user=request.user,
            after_data=InvoiceSerializer(avoir).data,
            reason=f'Création avoir pour facture {invoice_origine.numero}',
            request=request
        )
        
        serializer = self.get_serializer(avoir)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def contest(self, request, pk=None):
        """Contest an accepted invoice."""
        from .models import InvoiceContestation
        from .utils import get_client_ip
        
        invoice = self.get_object()
        
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
            user=request.user if request.user.is_authenticated else None,
            before_data={'statut': 'ACCEPTEE'},
            after_data={'statut': 'CONTESTEE'},
            reason=f'Contestée. Raison: {reason[:100]}',
            request=request
        )
        
        serializer = self.get_serializer(invoice)
        return Response({
            'status': 'contested',
            'contested_at': contestation.contested_at.isoformat(),
            'invoice': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def resolve_contestation(self, request, pk=None):
        """Resolve a contested invoice."""
        from .models import InvoiceContestation
        
        invoice = self.get_object()
        
        # Check if invoice is contested
        if invoice.statut != InvoiceStatus.CONTESTEE:
            return Response(
                {'error': 'Cette facture n\'est pas contestée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            contestation = invoice.contestation
        except InvoiceContestation.DoesNotExist:
            return Response(
                {'error': 'Aucune contestation trouvée pour cette facture'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get resolution data
        resolution_notes = request.data.get('resolution_notes', '').strip() or None
        new_status = request.data.get('new_status', 'VALIDEE')
        
        # Validate new status
        if new_status not in [InvoiceStatus.VALIDEE, InvoiceStatus.ACCEPTEE, InvoiceStatus.ANNULEE]:
            new_status = InvoiceStatus.VALIDEE
        
        # Update contestation
        contestation.resolved = True
        contestation.resolved_at = timezone.now()
        contestation.resolved_by = request.user
        contestation.resolution_notes = resolution_notes
        contestation.save()
        
        # Update invoice status
        old_status = invoice.statut
        invoice.statut = new_status
        invoice.save()
        
        # Create audit log
        create_audit_log(
            instance=invoice,
            action='RESOLVE_CONTESTATION',
            user=request.user,
            before_data={'statut': old_status},
            after_data={'statut': new_status},
            reason=f'Contestation résolue. Notes: {resolution_notes[:100] if resolution_notes else "Aucune"}',
            request=request
        )
        
        serializer = self.get_serializer(invoice)
        return Response({
            'status': 'resolved',
            'resolved_at': contestation.resolved_at.isoformat(),
            'new_status': new_status,
            'invoice': serializer.data
        }, status=status.HTTP_200_OK)


class InvoiceLineViewSet(viewsets.ModelViewSet):
    """ViewSet for InvoiceLine management."""
    queryset = InvoiceLine.objects.select_related('invoice', 'product').all()
    serializer_class = InvoiceLineSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['invoice', 'product']

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsCommercial()]
        return [IsReadOnlyOrAuthenticated()]

    def perform_create(self, serializer):
        """Create invoice line with price snapshot."""
        invoice = serializer.validated_data['invoice']
        product = serializer.validated_data['product']
        qty = serializer.validated_data['qty']
        
        # Check invoice is brouillon and not accepted
        if invoice.statut == InvoiceStatus.ACCEPTEE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot add lines to an accepted invoice. The invoice has been accepted by the client.'
            )
        if invoice.statut != InvoiceStatus.BROUILLON:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot add lines to a validated invoice'
            )
        
        # Get price: ClientPrice if exists, else BasePrice
        prix_unit = None
        try:
            client_price = ClientPrice.objects.get(
                client=invoice.client,
                product=product
            )
            prix_unit = client_price.prix
        except ClientPrice.DoesNotExist:
            try:
                base_price = product.base_price
                prix_unit = base_price.prix_base
            except BasePrice.DoesNotExist:
                from rest_framework import serializers as drf_serializers
                raise drf_serializers.ValidationError(
                    f'No price found for product {product.nom}'
                )
        
        # Create line with snapshot price
        instance = serializer.save(
            prix_unit_applique=prix_unit
        )
        
        # Update invoice total
        invoice.calculate_totals()

    def perform_update(self, serializer):
        """Update invoice line if invoice is brouillon."""
        instance = self.get_object()
        if instance.invoice.statut == InvoiceStatus.ACCEPTEE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot modify lines of an accepted invoice. The invoice has been accepted by the client.'
            )
        if instance.invoice.statut != InvoiceStatus.BROUILLON:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot modify lines of a validated invoice'
            )
        
        # Price cannot be changed (snapshot)
        if 'prix_unit_applique' in serializer.validated_data:
            del serializer.validated_data['prix_unit_applique']
        
        serializer.save()
        instance.invoice.calculate_totals()

    def perform_destroy(self, instance):
        """Delete invoice line if invoice is brouillon."""
        if instance.invoice.statut == InvoiceStatus.ACCEPTEE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot delete lines of an accepted invoice. The invoice has been accepted by the client.'
            )
        if instance.invoice.statut != InvoiceStatus.BROUILLON:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot delete lines of a validated invoice'
            )
        invoice = instance.invoice
        instance.delete()
        invoice.calculate_totals()


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Payment management."""
    queryset = Payment.objects.select_related('invoice').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsCommercial]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['invoice', 'mode', 'date']

    def perform_create(self, serializer):
        """Create payment and update invoice."""
        instance = serializer.save()
        create_audit_log(
            instance=instance,
            action='CREATE_PAYMENT',
            user=self.request.user,
            after_data=serializer.data,
            reason=f'Paiement facture {instance.invoice.numero}',
            request=self.request
        )


class CompanySettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for CompanySettings management (singleton)."""
    queryset = CompanySettings.objects.all()
    serializer_class = CompanySettingsSerializer
    permission_classes = [IsAdminGSA]
    
    def get_object(self):
        """Get or create company settings (singleton)."""
        # For detail views, we need to handle the pk parameter
        # but since it's a singleton, we ignore pk and return the single instance
        return CompanySettings.get_settings()
    
    def get_queryset(self):
        """Return queryset with the single instance."""
        return CompanySettings.objects.filter(pk=CompanySettings.get_settings().pk)
    
    def list(self, request, *args, **kwargs):
        """Return the single company settings instance."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Update existing settings if they exist, otherwise create."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Update company settings."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"CompanySettings validation errors: {serializer.errors}")
            logger.error(f"Request data: {request.data}")
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(serializer.errors)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update company settings."""
        return self.update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        """Update company settings and log audit."""
        instance = serializer.save()
        create_audit_log(
            instance=instance,
            action='UPDATE_COMPANY_SETTINGS',
            user=self.request.user,
            after_data=serializer.data,
            reason='Mise à jour des paramètres de l\'entreprise',
            request=self.request
        )
