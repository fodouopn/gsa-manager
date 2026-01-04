"""
Serializers for billing app.
"""
from rest_framework import serializers
from .models import Invoice, InvoiceLine, Payment, CompanySettings, InvoiceStatus, InvoiceType, PaymentMode, InvoiceAcceptance, InvoiceAcceptanceToken, InvoiceContestation
from apps.clients.serializers import ClientSerializer
from apps.catalog.serializers import ProductSerializer
from apps.users.serializers import UserListSerializer


class InvoiceLineSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceLine model."""
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = InvoiceLine
        fields = [
            'id', 'invoice', 'product', 'product_detail', 'qty',
            'prix_unit_applique', 'total_ligne', 'created_at'
        ]
        read_only_fields = ['id', 'prix_unit_applique', 'total_ligne', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'montant', 'mode', 'mode_display',
            'date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    client_detail = ClientSerializer(source='client', read_only=True)
    validated_by_username = serializers.CharField(source='validated_by.username', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'numero', 'client', 'client_detail', 'statut', 'statut_display',
            'type', 'type_display', 'total', 'tva_incluse', 'tva_jus', 'tva_biere', 'total_ttc', 'paye', 'reste',
            'prochaine_date_relance', 'pdf_path', 'validated_at', 'validated_by',
            'validated_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'numero', 'total', 'tva_jus', 'tva_biere', 'total_ttc', 'paye', 'reste', 'pdf_path',
            'validated_at', 'validated_by', 'created_at', 'updated_at'
        ]


class InvoiceContestationSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceContestation."""
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)
    
    class Meta:
        model = InvoiceContestation
        fields = [
            'id', 'contested_at', 'contested_by_name', 'contested_by_email',
            'reason', 'resolved', 'resolved_at', 'resolved_by', 'resolved_by_username',
            'resolution_notes'
        ]
        read_only_fields = ['id', 'contested_at', 'resolved_at', 'resolved_by']


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for Invoice with lines and payments."""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    client_detail = ClientSerializer(source='client', read_only=True)
    invoice_lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    validated_by_username = serializers.CharField(source='validated_by.username', read_only=True)
    contestation = InvoiceContestationSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'numero', 'client', 'client_detail', 'statut', 'statut_display',
            'type', 'type_display', 'total', 'tva_incluse', 'tva_jus', 'tva_biere', 'total_ttc', 'paye', 'reste',
            'prochaine_date_relance', 'pdf_path', 'invoice_lines', 'payments',
            'validated_at', 'validated_by', 'validated_by_username',
            'contestation', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'numero', 'total', 'tva_jus', 'tva_biere', 'total_ttc', 'paye', 'reste', 'pdf_path',
            'validated_at', 'validated_by', 'created_at', 'updated_at'
        ]


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Serializer for CompanySettings model."""
    logo_url = serializers.SerializerMethodField()
    
    # Make site_web optional and allow empty strings
    site_web = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = CompanySettings
        fields = [
            'id', 'nom', 'adresse', 'ville', 'code_postal', 'pays',
            'telephone', 'email', 'site_web', 'logo', 'logo_url',
            'numero_compte_bancaire', 'tva_jus', 'tva_biere', 'message_facture'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'nom': {'required': True},
            'site_web': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                # Use localhost for frontend compatibility
                url = request.build_absolute_uri(obj.logo.url)
                # Replace backend:8000 with localhost:8000 for frontend access
                url = url.replace('backend:8000', 'localhost:8000')
                return url
            return obj.logo.url
        return None


class InvoiceAcceptanceSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceAcceptance model."""
    
    class Meta:
        model = InvoiceAcceptance
        fields = [
            'id', 'invoice', 'accepted_at', 'ip_address', 'user_agent',
            'pdf_hash', 'acceptance_text_version', 'accepted_name'
        ]
        read_only_fields = ['id', 'accepted_at']


class InvoiceAcceptanceTokenSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceAcceptanceToken model (admin use)."""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = InvoiceAcceptanceToken
        fields = [
            'id', 'invoice', 'token_hash', 'expires_at', 'used_at',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'token_hash', 'created_at']


class PublicInvoiceLineSerializer(serializers.Serializer):
    """Simplified serializer for public invoice lines (no nested relations)."""
    id = serializers.IntegerField()
    product = serializers.IntegerField()
    product_detail = serializers.DictField(required=False, allow_null=True)
    qty = serializers.DecimalField(max_digits=10, decimal_places=2)
    prix_unit_applique = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_ligne = serializers.DecimalField(max_digits=10, decimal_places=2)


class PublicInvoiceSummarySerializer(serializers.Serializer):
    """Serializer for public invoice summary (limited data)."""
    invoice_number = serializers.CharField()
    client_name = serializers.CharField()
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_ht = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    tva_jus = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    tva_biere = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    tva = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)  # Total TVA for compatibility
    paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    remaining = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    accepted = serializers.BooleanField()
    accepted_at = serializers.DateTimeField(required=False, allow_null=True)
    accepted_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    pdf_download_url = serializers.CharField()
    invoice_lines = PublicInvoiceLineSerializer(many=True, required=False)
