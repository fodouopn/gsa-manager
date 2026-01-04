"""
Admin configuration for users app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserPermission, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'created_at']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Rôle GSA', {'fields': ('role',)}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Rôle GSA', {'fields': ('role',)}),
    )


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    """Admin interface for UserPermission model."""
    list_display = ['user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__username', 'user__email']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Utilisateur', {'fields': ('user',)}),
        ('Permissions Factures', {
            'fields': ('can_create_invoices', 'can_validate_invoices', 'can_delete_invoices', 'can_manage_payments'),
            'classes': ('collapse',)
        }),
        ('Permissions Stock', {
            'fields': ('can_manage_stock', 'can_adjust_stock', 'can_manage_purchases'),
            'classes': ('collapse',)
        }),
        ('Permissions Conteneurs', {
            'fields': ('can_manage_containers', 'can_validate_containers'),
            'classes': ('collapse',)
        }),
        ('Permissions Clients', {
            'fields': ('can_manage_clients', 'can_manage_client_prices'),
            'classes': ('collapse',)
        }),
        ('Permissions Produits', {
            'fields': ('can_manage_products',),
            'classes': ('collapse',)
        }),
        ('Permissions Rapports', {
            'fields': ('can_view_reports', 'can_export_data'),
            'classes': ('collapse',)
        }),
        ('Permissions Administration', {
            'fields': ('can_manage_users', 'can_manage_company_settings'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin interface for PasswordResetToken model."""
    list_display = ['user', 'token', 'created_at', 'expires_at', 'used']
    list_filter = ['used', 'created_at', 'expires_at']
    search_fields = ['user__username', 'user__email', 'token']
    ordering = ['-created_at']
    readonly_fields = ['token', 'created_at']
