"""
Views for stock app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Sum
from django.utils import timezone
from .models import StockMovement, MovementType, Purchase, PurchaseLine, PurchaseStatus, PurchasePayment
from .serializers import (
    StockMovementSerializer,
    StockCurrentSerializer,
    StockAdjustmentSerializer,
    PurchaseSerializer,
    PurchaseDetailSerializer,
    PurchaseLineSerializer,
    PurchasePaymentSerializer
)
from apps.catalog.models import Product
from apps.users.permissions import IsReadOnlyOrAuthenticated, IsLogistique
from apps.audit.utils import create_audit_log
from django.http import FileResponse
from datetime import datetime, date
import os


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing stock movements."""
    queryset = StockMovement.objects.select_related('product', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'type', 'created_by']
    search_fields = ['reference', 'reason']
    ordering_fields = ['created_at', 'qty_signee']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current stock for all products or a specific product."""
        product_id = request.query_params.get('product_id', None)
        
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
                stock = StockMovement.get_current_stock(product)
                serializer = StockCurrentSerializer({
                    'product': product.id,
                    'product_detail': product,
                    'stock_courant': stock
                })
                return Response(serializer.data)
            except Product.DoesNotExist:
                return Response(
                    {'error': 'Product not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Get stock for all products
            products = Product.objects.filter(actif=True)
            stock_data = []
            for product in products:
                stock = StockMovement.get_current_stock(product)
                stock_data.append({
                    'product': product.id,
                    'product_detail': product,
                    'stock_courant': stock
                })
            serializer = StockCurrentSerializer(stock_data, many=True)
            return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get stock movement history for a product."""
        product_id = request.query_params.get('product_id', None)
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(pk=product_id)
            movements = StockMovement.objects.filter(product=product).order_by('-created_at')
            serializer = StockMovementSerializer(movements, many=True)
            
            # Add running total
            data = serializer.data
            total = 0
            for item in reversed(data):
                total += item['qty_signee']
                item['stock_apres'] = total
            
            return Response(list(reversed(data)))
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'], permission_classes=[IsLogistique])
    def adjust(self, request):
        """Create a stock adjustment (requires LOGISTIQUE permission)."""
        serializer = StockAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        product_id = serializer.validated_data['product']
        qty_signee = serializer.validated_data['qty_signee']
        movement_type = serializer.validated_data['type']
        reason = serializer.validated_data['reason']
        reference = serializer.validated_data.get('reference', '')
        
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create movement
        movement = StockMovement.objects.create(
            product=product,
            qty_signee=qty_signee,
            type=movement_type,
            reference=reference or f"AJUST-{product.id}",
            created_by=request.user,
            reason=reason
        )
        
        # Log audit - convert Decimal to float for JSON serialization
        import json
        from decimal import Decimal
        
        def convert_decimals(obj):
            """Recursively convert Decimal to float for JSON serialization."""
            if isinstance(obj, Decimal):
                return float(obj)
            elif isinstance(obj, dict):
                return {key: convert_decimals(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_decimals(item) for item in obj]
            return obj
        
        movement_data = StockMovementSerializer(movement).data
        movement_data_converted = convert_decimals(movement_data)
        
        create_audit_log(
            instance=movement,
            action='STOCK_ADJUSTMENT',
            user=request.user,
            after_data=movement_data_converted,
            reason=f'Ajustement stock: {reason}',
            request=request
        )
        
        serializer_response = StockMovementSerializer(movement)
        return Response(serializer_response.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def print_stock(self, request):
        """Generate PDF report of stock at a specific date."""
        from .utils import generate_stock_pdf, WEASYPRINT_AVAILABLE
        from django.conf import settings
        
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
                from calendar import monthrange
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
        
        if not WEASYPRINT_AVAILABLE:
            return Response(
                {'error': 'PDF generation is not available. WeasyPrint system dependencies are missing.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            pdf_path = generate_stock_pdf(target_date)
            full_path = os.path.join(settings.MEDIA_ROOT, pdf_path)
            
            return FileResponse(
                open(full_path, 'rb'),
                content_type='application/pdf',
                filename=f"stock_{date_param}.pdf"
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PurchaseViewSet(viewsets.ModelViewSet):
    """ViewSet for Purchase management."""
    queryset = Purchase.objects.select_related('created_by', 'validated_by', 'fournisseur').prefetch_related('purchase_lines__product').all()
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'fournisseur', 'created_by']
    search_fields = ['reference', 'fournisseur__nom', 'fournisseur__entreprise']
    ordering_fields = ['date_achat', 'created_at']
    ordering = ['-date_achat', '-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PurchaseDetailSerializer
        return PurchaseSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsLogistique])
    def validate(self, request, pk=None):
        """Validate a purchase and create stock movements."""
        purchase = self.get_object()

        if purchase.statut == PurchaseStatus.VALIDE:
            return Response(
                {'error': 'Purchase already validated'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not purchase.purchase_lines.exists():
            return Response(
                {'error': 'Cannot validate purchase without lines. Please add at least one line.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create stock movements for each line
        movements_created = []
        for line in purchase.purchase_lines.all():
            movement = StockMovement.objects.create(
                product=line.product,
                qty_signee=line.qty,
                type=MovementType.RECEPTION,
                reference=f"ACHAT-{purchase.reference}",
                created_by=request.user,
                reason=f"Achat chez {purchase.fournisseur.nom_complet if purchase.fournisseur else 'Fournisseur inconnu'}"
            )
            movements_created.append(movement)

        # Update purchase status
        purchase.statut = PurchaseStatus.VALIDE
        purchase.validated_at = timezone.now()
        purchase.validated_by = request.user
        purchase.save()

        serializer = self.get_serializer(purchase)
        return Response({
            'message': f'Achat validé avec succès. {len(movements_created)} mouvements de stock créés.',
            'purchase': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def supplier_debts(self, request):
        """Get unpaid invoices for suppliers (clients who are also suppliers)."""
        from apps.billing.models import Invoice, InvoiceStatus
        from apps.clients.models import Client
        
        # Get all clients who have purchases (suppliers)
        suppliers = Client.objects.filter(purchases_as_supplier__isnull=False).distinct()
        
        debts_data = []
        for supplier in suppliers:
            # Get unpaid invoices for this supplier
            unpaid_invoices = Invoice.objects.filter(
                client=supplier,
                statut=InvoiceStatus.VALIDEE,
                reste__gt=0
            )
            
            total_due = unpaid_invoices.aggregate(total=Sum('reste'))['total'] or 0
            invoice_count = unpaid_invoices.count()
            
            if total_due > 0:
                debts_data.append({
                    'supplier': {
                        'id': supplier.id,
                        'nom_complet': supplier.nom_complet,
                        'entreprise': supplier.entreprise,
                    },
                    'total_due': float(total_due),
                    'invoice_count': invoice_count,
                    'invoices': [
                        {
                            'id': inv.id,
                            'numero': inv.numero,
                            'date': inv.created_at,
                            'total': float(inv.total_ttc),
                            'reste': float(inv.reste),
                        }
                        for inv in unpaid_invoices[:10]  # Limit to 10 most recent
                    ]
                })
        
        return Response(debts_data, status=status.HTTP_200_OK)


class PurchaseLineViewSet(viewsets.ModelViewSet):
    """ViewSet for PurchaseLine management."""
    queryset = PurchaseLine.objects.select_related('purchase', 'product').all()
    serializer_class = PurchaseLineSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['purchase', 'product']


class PurchasePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for PurchasePayment management."""
    queryset = PurchasePayment.objects.select_related('purchase', 'created_by').all()
    serializer_class = PurchasePaymentSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['purchase', 'mode', 'date']

    def perform_create(self, serializer):
        """Create payment and set created_by."""
        serializer.save(created_by=self.request.user)
