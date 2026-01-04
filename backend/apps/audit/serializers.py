"""
Serializers for audit app.
"""
from rest_framework import serializers
from .models import AuditLog
from apps.users.serializers import UserListSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    user_detail = UserListSerializer(source='user', read_only=True)
    entity_type_name = serializers.CharField(source='entity_type.model', read_only=True)
    entity_str = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'entity_type', 'entity_type_name', 'entity_id', 'entity_str',
            'action', 'before_json', 'after_json', 'user', 'user_detail',
            'reason', 'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_entity_str(self, obj):
        """Get string representation of the entity."""
        try:
            model_class = obj.entity_type.model_class()
            if model_class:
                instance = model_class.objects.filter(pk=obj.entity_id).first()
                if instance:
                    return str(instance)
        except Exception:
            pass
        return f"{obj.entity_type_name} #{obj.entity_id}"
