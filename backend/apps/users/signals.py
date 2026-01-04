"""
Signals for users app - auto-create super admin.
"""
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.conf import settings
from .models import User, Role


@receiver(post_migrate)
def create_super_admin(sender, **kwargs):
    """Create super admin user after migrations if it doesn't exist."""
    if sender.name == 'apps.users':
        email = getattr(settings, 'SUPER_ADMIN_EMAIL', 'admin@gsa.fr')
        password = getattr(settings, 'SUPER_ADMIN_PASSWORD', 'admin123')
        
        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                username=email.split('@')[0],
                email=email,
                password=password,
                role=Role.SUPER_ADMIN,
                is_staff=True,
                is_superuser=True
            )
            print(f"Super admin créé : {email}")

