"""
Audit models for complete traceability.
"""
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.users.models import User


class AuditLog(models.Model):
    """Audit log for tracking all critical actions."""
    entity_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name='Type d\'entité'
    )
    entity_id = models.PositiveIntegerField(verbose_name='ID de l\'entité')
    entity = GenericForeignKey('entity_type', 'entity_id')
    
    action = models.CharField(max_length=50, verbose_name='Action')
    before_json = models.JSONField(null=True, blank=True, verbose_name='État avant')
    after_json = models.JSONField(null=True, blank=True, verbose_name='État après')
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Utilisateur'
    )
    reason = models.TextField(blank=True, verbose_name='Raison')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    
    # Additional metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='Adresse IP')
    user_agent = models.TextField(blank=True, verbose_name='User Agent')

    class Meta:
        verbose_name = 'Log d\'audit'
        verbose_name_plural = 'Logs d\'audit'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.action} - {self.entity_type} #{self.entity_id} - {self.created_at}"
