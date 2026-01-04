"""
Admin configuration for containers app.
"""
from django.contrib import admin
from .models import Container, ManifestLine, ReceivedLine, UnloadingSession, UnloadingEvent


@admin.register(Container)
class ContainerAdmin(admin.ModelAdmin):
    """Admin interface for Container model."""
    list_display = ['ref', 'date_arrivee_estimee', 'date_arrivee_reelle', 'statut', 'validated_at', 'created_at']
    list_filter = ['statut', 'date_arrivee_estimee', 'created_at']
    search_fields = ['ref']
    ordering = ['-date_arrivee_estimee', '-created_at']


@admin.register(ManifestLine)
class ManifestLineAdmin(admin.ModelAdmin):
    """Admin interface for ManifestLine model."""
    list_display = ['container', 'product', 'qty_prevue', 'created_at']
    list_filter = ['container', 'created_at']
    search_fields = ['container__ref', 'product__nom']
    ordering = ['container', 'product__nom']


@admin.register(ReceivedLine)
class ReceivedLineAdmin(admin.ModelAdmin):
    """Admin interface for ReceivedLine model."""
    list_display = ['container', 'product', 'qty_recue', 'casse', 'created_at']
    list_filter = ['container', 'created_at']
    search_fields = ['container__ref', 'product__nom']
    ordering = ['container', 'product__nom']


@admin.register(UnloadingSession)
class UnloadingSessionAdmin(admin.ModelAdmin):
    """Admin interface for UnloadingSession model."""
    list_display = ['container', 'nb_personnes', 'somme_allouee', 'started_at', 'ended_at', 'created_at']
    list_filter = ['created_at']
    search_fields = ['container__ref']
    ordering = ['-created_at']


@admin.register(UnloadingEvent)
class UnloadingEventAdmin(admin.ModelAdmin):
    """Admin interface for UnloadingEvent model."""
    list_display = ['session', 'type', 'timestamp', 'user']
    list_filter = ['type', 'timestamp']
    search_fields = ['session__container__ref', 'user__username']
    ordering = ['-timestamp']
