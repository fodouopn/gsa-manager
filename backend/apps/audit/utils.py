"""
Utility functions for audit logging.
"""
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog


def create_audit_log(
    instance,
    action,
    user=None,
    before_data=None,
    after_data=None,
    reason='',
    request=None
):
    """
    Create an audit log entry.
    
    Args:
        instance: The model instance being audited
        action: Action name (e.g., 'CREATE', 'UPDATE', 'DELETE', 'VALIDATE')
        user: User performing the action
        before_data: Dict of data before the action
        after_data: Dict of data after the action
        reason: Reason for the action
        request: HTTP request (optional, for IP and user agent)
    """
    entity_type = ContentType.objects.get_for_model(instance.__class__)
    
    ip_address = None
    user_agent = ''
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # If user not provided, try to get from request
    if not user and request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    
    audit_log = AuditLog.objects.create(
        entity_type=entity_type,
        entity_id=instance.pk,
        action=action,
        before_json=before_data,
        after_json=after_data,
        user=user,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return audit_log


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_model_changes(instance, action, user=None, reason='', request=None):
    """
    Log changes to a model instance.
    Automatically captures before/after state.
    """
    # Get current state as dict
    after_data = {}
    for field in instance._meta.fields:
        if field.name not in ['id', 'created_at', 'updated_at']:
            value = getattr(instance, field.name, None)
            if hasattr(value, 'pk'):  # Foreign key
                value = value.pk
            after_data[field.name] = str(value) if value is not None else None
    
    # For updates, we'd need to track the old state
    # This is a simplified version - in production, you might use django-auditlog
    before_data = None
    
    return create_audit_log(
        instance=instance,
        action=action,
        user=user,
        before_data=before_data,
        after_data=after_data,
        reason=reason,
        request=request
    )

