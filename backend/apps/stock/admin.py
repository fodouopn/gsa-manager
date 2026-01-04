"""
Admin configuration for stock app.
"""
from django.contrib import admin
from .models import StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Admin interface for StockMovement model."""
    list_display = ['product', 'qty_signee', 'type', 'reference', 'created_by', 'created_at']
    list_filter = ['type', 'created_at', 'created_by']
    search_fields = ['product__nom', 'reference', 'reason']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
