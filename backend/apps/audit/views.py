"""
Views for audit app.
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.users.permissions import IsReadOnlyOrAuthenticated


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing audit logs."""
    queryset = AuditLog.objects.select_related('user', 'entity_type').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'user', 'entity_type']
    search_fields = ['reason', 'action']
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter queryset based on query parameters."""
        queryset = super().get_queryset()
        
        # Filter by entity_id if provided
        entity_id = self.request.query_params.get('entity_id', None)
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            try:
                date_from = timezone.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                queryset = queryset.filter(created_at__gte=date_from)
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                date_to = timezone.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                queryset = queryset.filter(created_at__lte=date_to)
            except (ValueError, AttributeError):
                pass
        
        # Filter by last N days
        days = self.request.query_params.get('days', None)
        if days:
            try:
                days = int(days)
                date_from = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(created_at__gte=date_from)
            except (ValueError, TypeError):
                pass
        
        return queryset
