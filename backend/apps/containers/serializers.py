"""
Serializers for containers app.
"""
from rest_framework import serializers
from .models import (
    Container, ManifestLine, ReceivedLine,
    UnloadingSession, UnloadingEvent
)
from apps.catalog.serializers import ProductSerializer


class ManifestLineSerializer(serializers.ModelSerializer):
    """Serializer for ManifestLine."""
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ManifestLine
        fields = [
            'id', 'container', 'product', 'product_detail',
            'qty_prevue', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReceivedLineSerializer(serializers.ModelSerializer):
    """Serializer for ReceivedLine."""
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ReceivedLine
        fields = [
            'id', 'container', 'product', 'product_detail',
            'qty_recue', 'casse', 'commentaire', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContainerSerializer(serializers.ModelSerializer):
    """Serializer for Container."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    validated_by_username = serializers.CharField(source='validated_by.username', read_only=True)
    total_qty_prevue = serializers.SerializerMethodField()
    total_qty_recue = serializers.SerializerMethodField()

    class Meta:
        model = Container
        fields = [
            'id', 'ref', 'date_arrivee_estimee', 'date_arrivee_reelle',
            'statut', 'statut_display', 'validated_at', 'validated_by',
            'validated_by_username', 'total_qty_prevue', 'total_qty_recue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'validated_at', 'validated_by', 'created_at', 'updated_at']

    def get_total_qty_prevue(self, obj):
        """Calculate total expected quantity from manifest lines."""
        from django.db.models import Sum
        total = obj.manifest_lines.aggregate(total=Sum('qty_prevue'))['total']
        return total or 0

    def get_total_qty_recue(self, obj):
        """Calculate total received quantity from received lines."""
        from django.db.models import Sum
        total = obj.received_lines.aggregate(total=Sum('qty_recue'))['total']
        return total or 0


class ContainerDetailSerializer(serializers.ModelSerializer):
    """Serializer for Container with manifest and received lines."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    manifest_lines = ManifestLineSerializer(many=True, read_only=True)
    received_lines = ReceivedLineSerializer(many=True, read_only=True)
    unloading_session = serializers.SerializerMethodField()

    class Meta:
        model = Container
        fields = [
            'id', 'ref', 'date_arrivee_estimee', 'date_arrivee_reelle',
            'statut', 'statut_display', 'validated_at', 'validated_by',
            'manifest_lines', 'received_lines', 'unloading_session',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'validated_at', 'validated_by', 'created_at', 'updated_at']

    def get_unloading_session(self, obj):
        """Get unloading session if exists."""
        if hasattr(obj, 'unloading_session'):
            return UnloadingSessionSerializer(obj.unloading_session).data
        return None


class UnloadingEventSerializer(serializers.ModelSerializer):
    """Serializer for UnloadingEvent."""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UnloadingEvent
        fields = [
            'id', 'session', 'type', 'type_display', 'timestamp',
            'user', 'user_username', 'meta'
        ]
        read_only_fields = ['id', 'timestamp']


class UnloadingSessionSerializer(serializers.ModelSerializer):
    """Serializer for UnloadingSession."""
    container_ref = serializers.CharField(source='container.ref', read_only=True)
    events = UnloadingEventSerializer(many=True, read_only=True)

    class Meta:
        model = UnloadingSession
        fields = [
            'id', 'container', 'container_ref', 'nb_personnes',
            'somme_allouee', 'started_at', 'ended_at', 'events', 'created_at'
        ]
        read_only_fields = ['id', 'started_at', 'ended_at', 'created_at']
