"""
User models with role-based access control.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    """User roles for RBAC."""
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Administrateur'
    ADMIN_GSA = 'ADMIN_GSA', 'Administrateur GSA'
    LOGISTIQUE = 'LOGISTIQUE', 'Logistique'
    COMMERCIAL = 'COMMERCIAL', 'Commercial'
    LECTURE = 'LECTURE', 'Lecture seule'


class User(AbstractUser):
    """Custom User model with roles."""
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.LECTURE,
        verbose_name='Rôle'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')
    is_active = models.BooleanField(default=True, verbose_name='Actif')

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def has_role(self, *roles):
        """Check if user has one of the specified roles."""
        return self.role in roles

    def is_super_admin(self):
        """Check if user is super admin."""
        return self.role == Role.SUPER_ADMIN

    def is_admin_gsa(self):
        """Check if user is admin GSA."""
        return self.role == Role.ADMIN_GSA

    def is_logistique(self):
        """Check if user is logistique."""
        return self.role == Role.LOGISTIQUE

    def is_commercial(self):
        """Check if user is commercial."""
        return self.role == Role.COMMERCIAL

    def is_lecture(self):
        """Check if user is lecture only."""
        return self.role == Role.LECTURE
    
    def has_custom_permission(self, permission_name):
        """Check if user has a specific custom permission."""
        try:
            custom_perms = self.custom_permissions
            return custom_perms.has_permission(permission_name)
        except UserPermission.DoesNotExist:
            # No custom permissions, use role defaults
            return self._get_role_default_permission(permission_name)
    
    def _get_role_default_permission(self, permission_name):
        """Get default permission value based on user role."""
        # Super admin has all permissions
        if self.role == Role.SUPER_ADMIN:
            return True
        
        # Admin GSA has most permissions
        if self.role == Role.ADMIN_GSA:
            return permission_name not in ['can_manage_users']
        
        # Commercial permissions
        if self.role == Role.COMMERCIAL:
            commercial_permissions = [
                'can_create_invoices', 'can_manage_payments', 'can_manage_clients',
                'can_manage_client_prices', 'can_view_reports'
            ]
            return permission_name in commercial_permissions
        
        # Logistique permissions
        if self.role == Role.LOGISTIQUE:
            logistique_permissions = [
                'can_manage_stock', 'can_adjust_stock', 'can_manage_purchases',
                'can_manage_containers', 'can_validate_containers', 'can_manage_products',
                'can_view_reports'
            ]
            return permission_name in logistique_permissions
        
        # Lecture seule - no write permissions
        if self.role == Role.LECTURE:
            return False
        
        return False


class UserPermission(models.Model):
    """Custom permissions for a user (overrides role defaults)."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='custom_permissions',
        verbose_name='Utilisateur'
    )
    
    # Invoice permissions
    can_create_invoices = models.BooleanField(null=True, blank=True, verbose_name='Créer des factures')
    can_validate_invoices = models.BooleanField(null=True, blank=True, verbose_name='Valider des factures')
    can_delete_invoices = models.BooleanField(null=True, blank=True, verbose_name='Supprimer des factures')
    can_manage_payments = models.BooleanField(null=True, blank=True, verbose_name='Gérer les paiements')
    
    # Stock permissions
    can_manage_stock = models.BooleanField(null=True, blank=True, verbose_name='Gérer le stock')
    can_adjust_stock = models.BooleanField(null=True, blank=True, verbose_name='Ajuster le stock')
    can_manage_purchases = models.BooleanField(null=True, blank=True, verbose_name='Gérer les achats')
    
    # Container permissions
    can_manage_containers = models.BooleanField(null=True, blank=True, verbose_name='Gérer les conteneurs')
    can_validate_containers = models.BooleanField(null=True, blank=True, verbose_name='Valider les conteneurs')
    
    # Client permissions
    can_manage_clients = models.BooleanField(null=True, blank=True, verbose_name='Gérer les clients')
    can_manage_client_prices = models.BooleanField(null=True, blank=True, verbose_name='Gérer les prix clients')
    
    # Product permissions
    can_manage_products = models.BooleanField(null=True, blank=True, verbose_name='Gérer les produits')
    
    # Report permissions
    can_view_reports = models.BooleanField(null=True, blank=True, verbose_name='Voir les rapports')
    can_export_data = models.BooleanField(null=True, blank=True, verbose_name='Exporter les données')
    
    # User management permissions
    can_manage_users = models.BooleanField(null=True, blank=True, verbose_name='Gérer les utilisateurs')
    
    # Company settings permissions
    can_manage_company_settings = models.BooleanField(null=True, blank=True, verbose_name='Gérer les paramètres entreprise')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')
    
    class Meta:
        verbose_name = 'Permission utilisateur'
        verbose_name_plural = 'Permissions utilisateur'
    
    def __str__(self):
        return f"Permissions pour {self.user.username}"
    
    def has_permission(self, permission_name):
        """Check if user has a specific permission (considering role defaults)."""
        # Get permission value (None means use role default)
        permission_value = getattr(self, permission_name, None)
        
        if permission_value is not None:
            # Custom permission set, use it
            return permission_value
        
        # Use role defaults
        return self._get_role_default(permission_name)
    
    def _get_role_default(self, permission_name):
        """Get default permission value based on user role."""
        role = self.user.role
        
        # Super admin has all permissions
        if role == Role.SUPER_ADMIN:
            return True
        
        # Admin GSA has most permissions
        if role == Role.ADMIN_GSA:
            return permission_name not in ['can_manage_users']  # Only super admin manages users
        
        # Commercial permissions
        if role == Role.COMMERCIAL:
            commercial_permissions = [
                'can_create_invoices', 'can_manage_payments', 'can_manage_clients',
                'can_manage_client_prices', 'can_view_reports'
            ]
            return permission_name in commercial_permissions
        
        # Logistique permissions
        if role == Role.LOGISTIQUE:
            logistique_permissions = [
                'can_manage_stock', 'can_adjust_stock', 'can_manage_purchases',
                'can_manage_containers', 'can_validate_containers', 'can_manage_products',
                'can_view_reports'
            ]
            return permission_name in logistique_permissions
        
        # Lecture seule - no write permissions
        if role == Role.LECTURE:
            return False
        
        return False


class PasswordResetToken(models.Model):
    """Token for password reset."""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Utilisateur'
    )
    token = models.CharField(max_length=100, unique=True, verbose_name='Token')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    expires_at = models.DateTimeField(verbose_name='Date d\'expiration')
    used = models.BooleanField(default=False, verbose_name='Utilisé')
    
    class Meta:
        verbose_name = 'Token de réinitialisation'
        verbose_name_plural = 'Tokens de réinitialisation'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Token pour {self.user.username} - {self.token[:10]}..."
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at