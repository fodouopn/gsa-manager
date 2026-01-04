"""
Serializers for catalog app.
"""
from rest_framework import serializers
from .models import Product, BasePrice, UniteVente


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""
    unite_vente_display = serializers.CharField(source='get_unite_vente_display', read_only=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    base_price_value = serializers.SerializerMethodField()
    
    def get_base_price_value(self, obj):
        """Get base price value, return None if no base price exists."""
        try:
            return obj.base_price.prix_base
        except BasePrice.DoesNotExist:
            return None

    class Meta:
        model = Product
        fields = [
            'id', 'nom', 'unite_vente', 'unite_vente_display',
            'categorie', 'categorie_display',
            'actif', 'base_price_value', 'seuil_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BasePriceSerializer(serializers.ModelSerializer):
    """Serializer for BasePrice model."""
    product_nom = serializers.CharField(source='product.nom', read_only=True)

    class Meta:
        model = BasePrice
        fields = [
            'id', 'product', 'product_nom',
            'prix_base', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductWithPriceSerializer(serializers.ModelSerializer):
    """Serializer for Product with embedded base price."""
    unite_vente_display = serializers.CharField(source='get_unite_vente_display', read_only=True)
    base_price = BasePriceSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'nom', 'unite_vente', 'unite_vente_display',
            'actif', 'base_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
