"""
Catalog models - Products and base prices.
"""
from django.db import models
from django.core.validators import MinValueValidator


class UniteVente(models.TextChoices):
    """Sales unit choices."""
    BOUTEILLE = 'BOUTEILLE', 'Bouteille'
    PACK = 'PACK', 'Pack'
    CARTON = 'CARTON', 'Carton'


class CategorieProduit(models.TextChoices):
    """Product category choices."""
    BIERE = 'BIERE', 'Bière'
    JUS = 'JUS', 'Jus'


class Product(models.Model):
    """Product model."""
    nom = models.CharField(max_length=200, verbose_name='Nom')
    unite_vente = models.CharField(
        max_length=20,
        choices=UniteVente.choices,
        default=UniteVente.BOUTEILLE,
        verbose_name='Unité de vente'
    )
    categorie = models.CharField(
        max_length=10,
        choices=CategorieProduit.choices,
        default=CategorieProduit.BIERE,
        verbose_name='Catégorie'
    )
    actif = models.BooleanField(default=True, verbose_name='Actif')
    seuil_stock = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(0)],
        verbose_name='Seuil de stock'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'
        ordering = ['nom']
        unique_together = [['nom', 'unite_vente']]

    def __str__(self):
        return f"{self.nom} ({self.get_unite_vente_display()})"


class BasePrice(models.Model):
    """Base price for a product."""
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='base_price',
        verbose_name='Produit'
    )
    prix_base = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Prix de base'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Prix de base'
        verbose_name_plural = 'Prix de base'
        ordering = ['product__nom']

    def __str__(self):
        return f"{self.product} - {self.prix_base} €"
