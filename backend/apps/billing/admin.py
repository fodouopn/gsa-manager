"""
Admin configuration for billing app.
"""
from django.contrib import admin
from .models import Invoice, InvoiceLine, Payment, CompanySettings


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin interface for Invoice model."""
    list_display = ['numero', 'client', 'statut', 'type', 'total', 'paye', 'reste', 'created_at']
    list_filter = ['statut', 'type', 'created_at', 'validated_at']
    search_fields = ['numero', 'client__nom', 'client__entreprise']
    ordering = ['-created_at']
    readonly_fields = ['numero', 'validated_at', 'validated_by', 'pdf_path']


@admin.register(InvoiceLine)
class InvoiceLineAdmin(admin.ModelAdmin):
    """Admin interface for InvoiceLine model."""
    list_display = ['invoice', 'product', 'qty', 'prix_unit_applique', 'total_ligne', 'created_at']
    list_filter = ['created_at']
    search_fields = ['invoice__numero', 'product__nom']
    ordering = ['invoice', 'created_at']
    readonly_fields = ['prix_unit_applique', 'total_ligne']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin interface for Payment model."""
    list_display = ['invoice', 'montant', 'mode', 'date', 'created_at']
    list_filter = ['mode', 'date', 'created_at']
    search_fields = ['invoice__numero']
    ordering = ['-date', '-created_at']


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    """Admin interface for CompanySettings model."""
    list_display = ['nom', 'ville', 'pays', 'telephone', 'email']
    
    def has_add_permission(self, request):
        # Only allow one company settings instance
        return not CompanySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of company settings
        return False
