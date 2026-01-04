"""
Admin configuration for audit app.
"""
from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuditLog model."""
    list_display = ['action', 'entity_type', 'entity_id', 'user', 'created_at']
    list_filter = ['action', 'entity_type', 'created_at', 'user']
    search_fields = ['action', 'reason', 'user__username', 'user__email']
    readonly_fields = [
        'entity_type', 'entity_id', 'action', 'before_json', 'after_json',
        'user', 'reason', 'ip_address', 'user_agent', 'created_at'
    ]
    ordering = ['-created_at']
    
    def has_add_permission(self, request):
        """Audit logs are created automatically, not manually."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs are immutable."""
        return False
