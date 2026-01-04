"""
Utility functions for user permissions.
"""
from .models import User, UserPermission


def user_has_permission(user, permission_name):
    """
    Check if a user has a specific permission.
    Returns True if user has permission, False otherwise.
    """
    if not user or not user.is_authenticated:
        return False
    
    # Super admin always has all permissions
    if user.role == 'SUPER_ADMIN':
        return True
    
    # Check custom permissions
    try:
        custom_perms = user.custom_permissions
        return custom_perms.has_permission(permission_name)
    except UserPermission.DoesNotExist:
        # No custom permissions, use role defaults
        return user._get_role_default_permission(permission_name)

