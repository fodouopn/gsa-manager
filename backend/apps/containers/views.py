"""
Views for containers app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import (
    Container, ManifestLine, ReceivedLine,
    UnloadingSession, UnloadingEvent, UnloadingEventType
)
from .serializers import (
    ContainerSerializer,
    ContainerDetailSerializer,
    ManifestLineSerializer,
    ReceivedLineSerializer,
    UnloadingSessionSerializer,
    UnloadingEventSerializer
)
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsReadOnlyOrAuthenticated, IsLogistique
from apps.audit.utils import create_audit_log
from .models import ContainerStatus


class ContainerViewSet(viewsets.ModelViewSet):
    """ViewSet for Container management."""
    queryset = Container.objects.all()
    serializer_class = ContainerSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut']
    search_fields = ['ref']
    ordering_fields = ['date_arrivee_estimee', 'created_at']
    ordering = ['-date_arrivee_estimee', '-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return ContainerDetailSerializer
        return ContainerSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'validate']:
            return [IsAuthenticated(), IsLogistique()]
        return [IsReadOnlyOrAuthenticated()]

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate container and create stock movements."""
        container = self.get_object()
        
        if container.statut == ContainerStatus.VALIDE:
            return Response(
                {'error': 'Container already validated'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check that received lines exist
        received_lines = container.received_lines.all()
        if not received_lines.exists():
            return Response(
                {'error': 'No received lines found. Please fill received quantities first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import here to avoid circular import
        from apps.stock.models import StockMovement, MovementType
        
        # Create stock movements for each received line
        movements_created = []
        for received_line in received_lines:
            if received_line.qty_recue > 0:
                movement = StockMovement.objects.create(
                    product=received_line.product,
                    qty_signee=received_line.qty_recue,
                    type=MovementType.RECEPTION,
                    reference=f"CONT-{container.ref}",
                    created_by=request.user
                )
                movements_created.append(movement)
        
        # Update container status
        container.statut = ContainerStatus.VALIDE
        container.validated_at = timezone.now()
        container.validated_by = request.user
        container.save()
        
        # Log audit
        create_audit_log(
            instance=container,
            action='VALIDATE_CONTAINER',
            user=request.user,
            after_data=ContainerSerializer(container).data,
            reason=f'Validation conteneur {container.ref} - {len(movements_created)} mouvements créés',
            request=request
        )
        
        serializer = self.get_serializer(container)
        return Response({
            'message': f'Container validated. {len(movements_created)} stock movements created.',
            'container': serializer.data
        })

    @action(detail=False, methods=['get'])
    def print_containers(self, request):
        """Generate PDF report of containers at a specific date."""
        from .utils import generate_containers_pdf
        from django.http import FileResponse
        from django.conf import settings
        from datetime import datetime
        from calendar import monthrange
        import os
        
        date_param = request.query_params.get('date', None)
        date_field = request.query_params.get('date_field', 'created_at')
        
        if not date_param:
            return Response(
                {'error': 'Date parameter is required (format: YYYY-MM-DD, YYYY-MM, or YYYY)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date parameter
        try:
            if len(date_param) == 4:  # YYYY
                target_date = datetime.strptime(date_param, '%Y').date().replace(month=12, day=31)
            elif len(date_param) == 7:  # YYYY-MM
                target_date = datetime.strptime(date_param, '%Y-%m').date()
                # Get last day of month
                last_day = monthrange(target_date.year, target_date.month)[1]
                target_date = target_date.replace(day=last_day)
            elif len(date_param) == 10:  # YYYY-MM-DD
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            else:
                raise ValueError("Invalid date format")
        except ValueError as e:
            return Response(
                {'error': f'Invalid date format: {str(e)}. Use YYYY-MM-DD, YYYY-MM, or YYYY'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_path = generate_containers_pdf(target_date, date_field)
            full_path = os.path.join(settings.MEDIA_ROOT, pdf_path)
            
            return FileResponse(
                open(full_path, 'rb'),
                content_type='application/pdf',
                filename=f"containers_{date_param}.pdf"
            )
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ManifestLineViewSet(viewsets.ModelViewSet):
    """ViewSet for ManifestLine management."""
    queryset = ManifestLine.objects.select_related('container', 'product').all()
    serializer_class = ManifestLineSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['container', 'product']


class ReceivedLineViewSet(viewsets.ModelViewSet):
    """ViewSet for ReceivedLine management."""
    queryset = ReceivedLine.objects.select_related('container', 'product').all()
    serializer_class = ReceivedLineSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['container', 'product']

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Can only modify if container not validated
            return [IsAuthenticated(), IsLogistique()]
        return [IsReadOnlyOrAuthenticated()]

    def perform_create(self, serializer):
        """Create received line and check container status."""
        container = serializer.validated_data['container']
        if container.statut == ContainerStatus.VALIDE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot add received lines to a validated container'
            )
        serializer.save()

    def perform_update(self, serializer):
        """Update received line and check container status."""
        instance = self.get_object()
        if instance.container.statut == ContainerStatus.VALIDE:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                'Cannot modify received lines of a validated container'
            )
        serializer.save()


class UnloadingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for UnloadingSession management."""
    queryset = UnloadingSession.objects.select_related('container').prefetch_related('events').all()
    serializer_class = UnloadingSessionSerializer
    permission_classes = [IsReadOnlyOrAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['container']

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'start', 'pause', 'resume', 'end']:
            return [IsAuthenticated(), IsLogistique()]
        return [IsReadOnlyOrAuthenticated()]

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start unloading session."""
        session = self.get_object()
        if session.started_at:
            return Response(
                {'error': 'Session already started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.started_at = timezone.now()
        session.save()
        
        UnloadingEvent.objects.create(
            session=session,
            type=UnloadingEventType.START,
            user=request.user,
            meta={'action': 'start'}
        )
        
        return Response(UnloadingSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause unloading session."""
        session = self.get_object()
        if not session.started_at or session.ended_at:
            return Response(
                {'error': 'Session not started or already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UnloadingEvent.objects.create(
            session=session,
            type=UnloadingEventType.PAUSE,
            user=request.user,
            meta={'action': 'pause'}
        )
        
        return Response(UnloadingSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume unloading session."""
        session = self.get_object()
        if not session.started_at or session.ended_at:
            return Response(
                {'error': 'Session not started or already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UnloadingEvent.objects.create(
            session=session,
            type=UnloadingEventType.RESUME,
            user=request.user,
            meta={'action': 'resume'}
        )
        
        return Response(UnloadingSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """End unloading session."""
        session = self.get_object()
        if not session.started_at:
            return Response(
                {'error': 'Session not started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if session.ended_at:
            return Response(
                {'error': 'Session already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.ended_at = timezone.now()
        session.save()
        
        UnloadingEvent.objects.create(
            session=session,
            type=UnloadingEventType.END,
            user=request.user,
            meta={'action': 'end'}
        )
        
        return Response(UnloadingSessionSerializer(session).data)
