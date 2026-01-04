"""
Views for clients app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Client, ClientPrice
from .serializers import (
    ClientSerializer,
    ClientPriceSerializer,
    ClientDetailSerializer
)
from apps.users.permissions import IsReadOnlyOrAuthenticated, IsCommercial
from apps.audit.utils import create_audit_log
from apps.catalog.models import Product
from .utils import generate_client_detail_pdf
from django.http import FileResponse
from django.conf import settings
import os


class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet for Client management."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['actif', 'pays', 'ville']
    search_fields = ['nom', 'prenom', 'entreprise', 'email', 'telephone']
    ordering_fields = ['nom', 'created_at', 'updated_at']
    ordering = ['nom']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return ClientDetailSerializer
        return ClientSerializer

    def perform_create(self, serializer):
        """Create client and log audit."""
        instance = serializer.save()
        create_audit_log(
            instance=instance,
            action='CREATE',
            user=self.request.user,
            after_data=serializer.data,
            request=self.request
        )

    def perform_update(self, serializer):
        """Update client and log audit."""
        instance = self.get_object()
        before_data = ClientSerializer(instance).data
        instance = serializer.save()
        after_data = serializer.data
        create_audit_log(
            instance=instance,
            action='UPDATE',
            user=self.request.user,
            before_data=before_data,
            after_data=after_data,
            request=self.request
        )

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        """Get all prices for a client."""
        client = self.get_object()
        prices = client.client_prices.select_related('product').all()
        serializer = ClientPriceSerializer(prices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def price_for_product(self, request):
        """Get client price for a specific product."""
        client_id = request.query_params.get('client_id')
        product_id = request.query_params.get('product_id')
        
        if not client_id or not product_id:
            return Response(
                {'error': 'client_id and product_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            client_price = ClientPrice.objects.get(
                client_id=client_id,
                product_id=product_id
            )
            serializer = ClientPriceSerializer(client_price)
            return Response(serializer.data)
        except ClientPrice.DoesNotExist:
            # Return base price if no client-specific price
            try:
                product = Product.objects.get(pk=product_id)
                base_price = product.base_price.prix_base if hasattr(product, 'base_price') else None
                return Response({
                    'client': int(client_id),
                    'product': int(product_id),
                    'prix': base_price,
                    'is_base_price': True
                })
            except Product.DoesNotExist:
                return Response(
                    {'error': 'Product not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

    @action(detail=True, methods=['get'])
    def total_due(self, request, pk=None):
        """Get total amount due for unpaid invoices of this client.
        Also includes excess payments on purchases (if we paid more than purchase amount)."""
        from django.db.models import Sum
        from apps.billing.models import Invoice, InvoiceStatus
        from apps.stock.models import Purchase, PurchaseStatus
        
        client = self.get_object()
        
        # Calculate total due from validated invoices with reste > 0
        unpaid_invoices = Invoice.objects.filter(
            client=client,
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0
        )
        total_due_invoices = unpaid_invoices.aggregate(
            total=Sum('reste')
        )['total'] or 0
        
        # Calculate excess payments on purchases (if client is also a supplier)
        # Si on a payé plus que le montant de l'achat, l'excédent est ce que le client nous doit
        purchases = Purchase.objects.filter(
            fournisseur=client,
            statut=PurchaseStatus.VALIDE
        )
        excess_purchase_payments = 0
        
        for purchase in purchases:
            purchase_total = purchase.total
            purchase_paid = purchase.paye
            
            # Si on a payé plus que le montant de l'achat, l'excédent est ce que le client nous doit
            if purchase_paid > purchase_total:
                excess_purchase_payments += (purchase_paid - purchase_total)
        
        # Total dû = factures impayées + excédents de paiements sur purchases
        total_due = float(total_due_invoices) + float(excess_purchase_payments)
        
        # Count unpaid invoices
        unpaid_count = unpaid_invoices.count()
        
        return Response({
            'client_id': client.id,
            'total_due': total_due,
            'unpaid_count': unpaid_count,
            'total_due_invoices': float(total_due_invoices),
            'excess_purchase_payments': float(excess_purchase_payments)
        })

    @action(detail=True, methods=['get'])
    def total_owed_to_client(self, request, pk=None):
        """Get total amount that the company owes to this client (credits/avoirs + unpaid purchases + excess payments on purchases)."""
        from django.db.models import Sum
        from apps.billing.models import Invoice, InvoiceStatus
        from apps.stock.models import Purchase, PurchaseStatus
        
        client = self.get_object()
        
        # Calculate total from avoir invoices (credit notes)
        avoir_invoices = Invoice.objects.filter(
            client=client,
            statut=InvoiceStatus.AVOIR
        )
        total_avoirs = avoir_invoices.aggregate(
            total=Sum('total_ttc')
        )['total'] or 0
        
        # Calculate excess payments on invoices (facture par facture)
        # Si le client a payé plus que le montant d'une facture, l'excédent est un crédit
        validated_invoices = Invoice.objects.filter(
            client=client,
            statut__in=[InvoiceStatus.VALIDEE, InvoiceStatus.ACCEPTEE]
        )
        
        excess_invoice_payments = 0
        for invoice in validated_invoices:
            invoice_total = float(invoice.total_ttc)
            invoice_paid = float(invoice.paye)
            # Si le client a payé plus que le montant de la facture, l'excédent est un crédit
            if invoice_paid > invoice_total:
                excess_invoice_payments += (invoice_paid - invoice_total)
        
        # Calculate purchases (if client is also a supplier)
        purchases = Purchase.objects.filter(
            fournisseur=client,
            statut=PurchaseStatus.VALIDE
        ).prefetch_related('payments')
        
        total_unpaid_purchases = 0
        excess_purchase_payments = 0
        purchase_count = 0
        
        for purchase in purchases:
            purchase_total = float(purchase.total)
            purchase_paid = float(purchase.paye)
            purchase_rest = float(purchase.reste)
            
            # Reste à payer sur les purchases
            if purchase_rest > 0:
                total_unpaid_purchases += purchase_rest
                purchase_count += 1
            
            # Excédents de paiements sur purchases (si on a payé plus que le montant de l'achat)
            # Ces excédents sont des crédits qu'on doit au client/fournisseur
            if purchase_paid > purchase_total:
                excess = purchase_paid - purchase_total
                excess_purchase_payments += excess
        
        # What we owe = avoirs + excess payments on invoices + unpaid purchases + excess payments on purchases
        total_owed = float(total_avoirs) + excess_invoice_payments + float(total_unpaid_purchases) + float(excess_purchase_payments)
        
        # Count avoir invoices
        avoir_count = avoir_invoices.count()
        
        return Response({
            'client_id': client.id,
            'total_owed': total_owed,
            'avoir_count': avoir_count,
            'avoirs_amount': float(total_avoirs),
            'excess_invoice_payments': excess_invoice_payments,
            'unpaid_purchases_amount': float(total_unpaid_purchases),
            'excess_purchase_payments': float(excess_purchase_payments),
            'unpaid_purchases_count': purchase_count,
            'has_purchases': purchases.exists()
        })

    @action(detail=True, methods=['get'])
    def print_client_detail(self, request, pk=None):
        """Generate and download PDF for client detail with invoices."""
        client = self.get_object()
        
        try:
            filepath = generate_client_detail_pdf(client)
            full_path = os.path.join(settings.MEDIA_ROOT, filepath)
            
            if not os.path.exists(full_path):
                return Response(
                    {'error': 'PDF file not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return FileResponse(
                open(full_path, 'rb'),
                content_type='application/pdf',
                filename=f"client_{client.id}_{client.nom_complet.replace(' ', '_')}.pdf"
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def print_clients(self, request):
        """Generate PDF report of clients with dues at a specific date."""
        from .utils import generate_clients_pdf
        from django.http import FileResponse
        from django.conf import settings
        from datetime import datetime
        from calendar import monthrange
        import os
        
        date_param = request.query_params.get('date', None)
        if not date_param:
            return Response(
                {'error': 'Date parameter is required (format: YYYY-MM-DD, YYYY-MM, or YYYY)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date parameter
        try:
            if len(date_param) == 4:  # YYYY
                target_date = datetime.strptime(date_param, '%Y').date().replace(month=12, day=31)
            elif len(date_param) == 7:  # YYYY-MM
                target_date = datetime.strptime(date_param, '%Y-%m').date()
                # Get last day of month
                last_day = monthrange(target_date.year, target_date.month)[1]
                target_date = target_date.replace(day=last_day)
            elif len(date_param) == 10:  # YYYY-MM-DD
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            else:
                raise ValueError("Invalid date format")
        except ValueError as e:
            return Response(
                {'error': f'Invalid date format: {str(e)}. Use YYYY-MM-DD, YYYY-MM, or YYYY'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_path = generate_clients_pdf(target_date)
            full_path = os.path.join(settings.MEDIA_ROOT, pdf_path)
            
            return FileResponse(
                open(full_path, 'rb'),
                content_type='application/pdf',
                filename=f"clients_{date_param}.pdf"
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ClientPriceViewSet(viewsets.ModelViewSet):
    """ViewSet for ClientPrice management."""
    queryset = ClientPrice.objects.select_related('client', 'product').all()
    serializer_class = ClientPriceSerializer
    permission_classes = [IsCommercial]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client', 'product']
    ordering_fields = ['prix', 'created_at']
    ordering = ['client__nom', 'product__nom']

    def perform_create(self, serializer):
        """Create client price and log audit."""
        instance = serializer.save()
        create_audit_log(
            instance=instance,
            action='CREATE_CLIENT_PRICE',
            user=self.request.user,
            after_data=serializer.data,
            reason=f'Création prix client pour {instance.client} - {instance.product}',
            request=self.request
        )

    def perform_update(self, serializer):
        """Update client price and log audit."""
        instance = self.get_object()
        before_data = ClientPriceSerializer(instance).data
        instance = serializer.save()
        after_data = serializer.data
        create_audit_log(
            instance=instance,
            action='UPDATE_CLIENT_PRICE',
            user=self.request.user,
            before_data=before_data,
            after_data=after_data,
            reason=f'Modification prix client pour {instance.client} - {instance.product}',
            request=self.request
        )

    def perform_destroy(self, instance):
        """Delete client price and log audit."""
        before_data = ClientPriceSerializer(instance).data
        create_audit_log(
            instance=instance,
            action='DELETE_CLIENT_PRICE',
            user=self.request.user,
            before_data=before_data,
            reason=f'Suppression prix client pour {instance.client} - {instance.product}',
            request=self.request
        )
        instance.delete()
