"""
Admin configuration for catalog app.
"""
from django.contrib import admin
from .models import Product, BasePrice


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model."""
    list_display = ['nom', 'unite_vente', 'actif', 'created_at']
    list_filter = ['actif', 'unite_vente', 'created_at']
    search_fields = ['nom']
    ordering = ['nom']


@admin.register(BasePrice)
class BasePriceAdmin(admin.ModelAdmin):
    """Admin interface for BasePrice model."""
    list_display = ['product', 'prix_base', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['product__nom']
    ordering = ['product__nom']
