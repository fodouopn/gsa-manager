"""
Custom permissions for RBAC.
"""
from rest_framework import permissions
from .models import Role


class IsSuperAdmin(permissions.BasePermission):
    """Only super admin can access."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.SUPER_ADMIN
        )


class IsAdminGSA(permissions.BasePermission):
    """Super admin or admin GSA can access."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.SUPER_ADMIN, Role.ADMIN_GSA]
        )


class IsLogistique(permissions.BasePermission):
    """Logistique, admin or super admin can access."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.SUPER_ADMIN, Role.ADMIN_GSA, Role.LOGISTIQUE]
        )


class IsCommercial(permissions.BasePermission):
    """Commercial, admin or super admin can access."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.SUPER_ADMIN, Role.ADMIN_GSA, Role.COMMERCIAL]
        )


class IsReadOnlyOrAuthenticated(permissions.BasePermission):
    """Read-only for all authenticated users, write for specific roles."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role != Role.LECTURE
        )


class HasCustomPermission(permissions.BasePermission):
    """Check if user has a specific custom permission."""
    permission_name = None
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not self.permission_name:
            return False
        
        from .utils import user_has_permission
        return user_has_permission(request.user, self.permission_name)

