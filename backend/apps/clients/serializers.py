"""
Serializers for clients app.
"""
from rest_framework import serializers
from .models import Client, ClientPrice
from apps.catalog.serializers import ProductSerializer


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model."""
    nom_complet = serializers.CharField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'nom', 'prenom', 'nom_complet', 'entreprise', 'email',
            'telephone', 'adresse', 'code_postal', 'ville', 'pays',
            'siret', 'tva_intracommunautaire', 'notes', 'actif',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientPriceSerializer(serializers.ModelSerializer):
    """Serializer for ClientPrice model."""
    client_nom = serializers.CharField(source='client.nom_complet', read_only=True)
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = ClientPrice
        fields = [
            'id', 'client', 'client_nom', 'product', 'product_detail',
            'prix', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientDetailSerializer(serializers.ModelSerializer):
    """Serializer for Client with embedded prices."""
    nom_complet = serializers.CharField(read_only=True)
    client_prices = ClientPriceSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'nom', 'prenom', 'nom_complet', 'entreprise', 'email',
            'telephone', 'adresse', 'code_postal', 'ville', 'pays',
            'siret', 'tva_intracommunautaire', 'notes', 'actif',
            'client_prices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
