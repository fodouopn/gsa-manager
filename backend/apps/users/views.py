"""
Views for users app - JWT authentication and user management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User, UserPermission
from .serializers import (
    UserSerializer, UserCreateSerializer, UserListSerializer,
    UserDetailSerializer, UserPermissionSerializer
)
from .permissions import IsSuperAdmin, IsAdminGSA


class HealthView(viewsets.ViewSet):
    """Health check endpoint."""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='health')
    def health(self, request):
        """Health check endpoint."""
        return Response({'status': 'ok'})


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management."""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'list':
            return UserListSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'destroy']:
            # Only super admin can create/delete users
            return [IsAuthenticated(), IsSuperAdmin()]
        elif self.action in ['update', 'partial_update']:
            # Super admin can update any user, or user can update themselves
            return [IsAuthenticated()]
        elif self.action == 'list':
            # Admin GSA and super admin can list users
            return [IsAuthenticated(), IsAdminGSA()]
        return [IsAuthenticated()]
    
    def update(self, request, *args, **kwargs):
        """Update user - allow users to update their own profile."""
        instance = self.get_object()
        # Check if user is updating themselves or is super admin
        if instance != request.user and not request.user.is_superuser:
            return Response(
                {'error': 'You can only update your own profile'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update user - allow users to update their own profile."""
        instance = self.get_object()
        # Check if user is updating themselves or is super admin
        if instance != request.user and not request.user.is_superuser:
            return Response(
                {'error': 'You can only update your own profile'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Return current user information."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Set password for a user (super admin only, or user changing their own password)."""
        user = self.get_object()
        password = request.data.get('password')
        current_password = request.data.get('current_password')
        
        # If user is changing their own password, verify current password
        if user == request.user and current_password:
            if not user.check_password(current_password):
                return Response(
                    {'error': 'Current password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # If user is not super admin and not changing their own password, deny
        if user != request.user and not request.user.is_superuser:
            return Response(
                {'error': 'You can only change your own password'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(password)
        user.save()
        return Response({'message': 'Password updated successfully'})


class UserPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user permissions."""
    queryset = UserPermission.objects.select_related('user').all()
    serializer_class = UserPermissionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_queryset(self):
        """Filter by user if provided."""
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def perform_create(self, serializer):
        """Create or update user permissions."""
        user = serializer.validated_data['user']
        # Get or create permissions
        permission, created = UserPermission.objects.get_or_create(user=user)
        # Update with provided data
        for key, value in serializer.validated_data.items():
            if key != 'user':
                setattr(permission, key, value)
        permission.save()
        serializer.instance = permission
    
    def perform_update(self, serializer):
        """Update user permissions."""
        instance = serializer.instance
        # Update with provided data
        for key, value in serializer.validated_data.items():
            if key != 'user':
                setattr(instance, key, value)
        instance.save()
