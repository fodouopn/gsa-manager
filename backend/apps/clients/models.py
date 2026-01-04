"""
Client models - Clients and client-specific prices.
"""
from django.db import models
from django.core.validators import MinValueValidator
from apps.catalog.models import Product


class Client(models.Model):
    """Client model."""
    nom = models.CharField(max_length=200, verbose_name='Nom')
    prenom = models.CharField(max_length=100, blank=True, verbose_name='Prénom')
    entreprise = models.CharField(max_length=200, blank=True, verbose_name='Entreprise')
    email = models.EmailField(blank=True, verbose_name='Email')
    telephone = models.CharField(max_length=20, blank=True, verbose_name='Téléphone')
    adresse = models.TextField(blank=True, verbose_name='Adresse')
    code_postal = models.CharField(max_length=10, blank=True, verbose_name='Code postal')
    ville = models.CharField(max_length=100, blank=True, verbose_name='Ville')
    pays = models.CharField(max_length=100, default='France', verbose_name='Pays')
    siret = models.CharField(max_length=14, blank=True, verbose_name='SIRET')
    tva_intracommunautaire = models.CharField(max_length=20, blank=True, verbose_name='TVA intracommunautaire')
    notes = models.TextField(blank=True, verbose_name='Notes')
    actif = models.BooleanField(default=True, verbose_name='Actif')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        ordering = ['nom', 'prenom']
        indexes = [
            models.Index(fields=['nom', 'prenom']),
            models.Index(fields=['entreprise']),
            models.Index(fields=['actif']),
        ]

    def __str__(self):
        if self.entreprise:
            return f"{self.entreprise} ({self.nom} {self.prenom})"
        return f"{self.nom} {self.prenom}"

    @property
    def nom_complet(self):
        """Return full name."""
        return f"{self.nom} {self.prenom}".strip()


class ClientPrice(models.Model):
    """Client-specific price for a product."""
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='client_prices',
        verbose_name='Client'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='client_prices',
        verbose_name='Produit'
    )
    prix = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Prix client'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Prix client'
        verbose_name_plural = 'Prix clients'
        unique_together = [['client', 'product']]
        ordering = ['client__nom', 'product__nom']
        indexes = [
            models.Index(fields=['client', 'product']),
        ]

    def __str__(self):
        return f"{self.client} - {self.product} : {self.prix} €"
