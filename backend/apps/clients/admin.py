"""
Admin configuration for clients app.
"""
from django.contrib import admin
from .models import Client, ClientPrice


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Admin interface for Client model."""
    list_display = ['nom', 'prenom', 'entreprise', 'email', 'telephone', 'actif', 'created_at']
    list_filter = ['actif', 'pays', 'ville', 'created_at']
    search_fields = ['nom', 'prenom', 'entreprise', 'email', 'telephone']
    ordering = ['nom', 'prenom']


@admin.register(ClientPrice)
class ClientPriceAdmin(admin.ModelAdmin):
    """Admin interface for ClientPrice model."""
    list_display = ['client', 'product', 'prix', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['client__nom', 'client__entreprise', 'product__nom']
    ordering = ['client__nom', 'product__nom']
