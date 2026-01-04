"""
Serializers for stock app.
"""
from rest_framework import serializers
from .models import StockMovement, MovementType, Purchase, PurchaseLine, PurchaseStatus, PurchasePayment, PurchasePaymentMode
from apps.catalog.serializers import ProductSerializer
from apps.users.serializers import UserListSerializer
from apps.clients.serializers import ClientSerializer


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer for StockMovement model."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    product_detail = ProductSerializer(source='product', read_only=True)
    created_by_detail = UserListSerializer(source='created_by', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_detail', 'qty_signee', 'type', 'type_display',
            'reference', 'created_by', 'created_by_detail', 'reason', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StockCurrentSerializer(serializers.Serializer):
    """Serializer for current stock display."""
    product = serializers.IntegerField()
    product_detail = ProductSerializer(read_only=True)
    stock_courant = serializers.IntegerField()


class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustment."""
    product = serializers.IntegerField()
    qty_signee = serializers.IntegerField()
    type = serializers.ChoiceField(choices=[MovementType.AJUSTEMENT, MovementType.CASSE])
    reason = serializers.CharField(required=True, allow_blank=False)
    reference = serializers.CharField(required=False, allow_blank=True)


class PurchaseLineSerializer(serializers.ModelSerializer):
    """Serializer for PurchaseLine model."""
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = PurchaseLine
        fields = [
            'id', 'purchase', 'product', 'product_detail', 'qty', 'prix_unitaire', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PurchaseSerializer(serializers.ModelSerializer):
    """Serializer for Purchase model."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    validated_by_username = serializers.CharField(source='validated_by.username', read_only=True)
    fournisseur_detail = ClientSerializer(source='fournisseur', read_only=True)
    total_achat = serializers.DecimalField(source='total', max_digits=10, decimal_places=2, read_only=True)
    total_paye = serializers.DecimalField(source='paye', max_digits=10, decimal_places=2, read_only=True)
    reste_a_payer = serializers.DecimalField(source='reste', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'fournisseur', 'fournisseur_detail', 'date_achat', 'reference', 'statut', 'statut_display',
            'created_by', 'created_by_username', 'validated_at', 'validated_by',
            'validated_by_username', 'created_at', 'updated_at', 'total_achat', 'total_paye', 'reste_a_payer'
        ]
        read_only_fields = [
            'id', 'reference', 'statut', 'validated_at', 'validated_by', 'created_at', 'updated_at',
            'total_achat', 'total_paye', 'reste_a_payer'
        ]


class PurchasePaymentSerializer(serializers.ModelSerializer):
    """Serializer for PurchasePayment model."""
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = PurchasePayment
        fields = [
            'id', 'purchase', 'montant', 'mode', 'mode_display', 'date', 'reference',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PurchaseDetailSerializer(serializers.ModelSerializer):
    """Serializer for Purchase with lines."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    validated_by_username = serializers.CharField(source='validated_by.username', read_only=True)
    fournisseur_detail = ClientSerializer(source='fournisseur', read_only=True)
    purchase_lines = PurchaseLineSerializer(many=True, read_only=True)
    payments = PurchasePaymentSerializer(many=True, read_only=True)
    total_achat = serializers.DecimalField(source='total', max_digits=10, decimal_places=2, read_only=True)
    total_paye = serializers.DecimalField(source='paye', max_digits=10, decimal_places=2, read_only=True)
    reste_a_payer = serializers.DecimalField(source='reste', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'fournisseur', 'fournisseur_detail', 'date_achat', 'reference', 'statut', 'statut_display',
            'created_by', 'created_by_username', 'validated_at', 'validated_by',
            'validated_by_username', 'purchase_lines', 'payments', 'total_achat', 'total_paye', 'reste_a_payer',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reference', 'statut', 'validated_at', 'validated_by', 'created_at', 'updated_at',
            'total_achat', 'total_paye', 'reste_a_payer'
        ]
