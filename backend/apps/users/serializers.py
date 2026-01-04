"""
Serializers for users app.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Role, UserPermission


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'is_active', 'is_staff',
            'created_at', 'updated_at', 'password'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_password(self, value):
        """Validate password if provided."""
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        """Create user with hashed password."""
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        """Update user, handling password separately."""
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users (requires password)."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'is_active', 'is_staff'
        ]

    def create(self, validated_data):
        """Create user with hashed password."""
        user = User.objects.create_user(**validated_data)
        return user


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user lists."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'is_active', 'created_at'
        ]


class UserPermissionSerializer(serializers.ModelSerializer):
    """Serializer for UserPermission model."""
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserPermission
        fields = [
            'id', 'user', 'user_username',
            'can_create_invoices', 'can_validate_invoices', 'can_delete_invoices', 'can_manage_payments',
            'can_manage_stock', 'can_adjust_stock', 'can_manage_purchases',
            'can_manage_containers', 'can_validate_containers',
            'can_manage_clients', 'can_manage_client_prices',
            'can_manage_products',
            'can_view_reports', 'can_export_data',
            'can_manage_users',
            'can_manage_company_settings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for User with permissions."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    custom_permissions = UserPermissionSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'is_active', 'is_staff',
            'custom_permissions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
