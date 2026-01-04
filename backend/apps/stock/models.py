"""
Stock models - Stock movements only (no direct quantity field).
"""
from django.db import models
from django.db.models import Sum, Q
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.catalog.models import Product


class PurchaseStatus(models.TextChoices):
    """Purchase status choices."""
    BROUILLON = 'BROUILLON', 'Brouillon'
    VALIDE = 'VALIDE', 'Validé'


class Purchase(models.Model):
    """Purchase model for direct purchases from suppliers (without container)."""
    fournisseur = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='purchases_as_supplier',
        null=True,
        blank=True,
        verbose_name='Fournisseur'
    )
    date_achat = models.DateField(default=timezone.now, verbose_name='Date d\'achat')
    reference = models.CharField(max_length=100, unique=True, blank=True, null=True, verbose_name='Référence')
    statut = models.CharField(
        max_length=20,
        choices=PurchaseStatus.choices,
        default=PurchaseStatus.BROUILLON,
        verbose_name='Statut'
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchases',
        verbose_name='Créé par'
    )
    validated_at = models.DateTimeField(null=True, blank=True, verbose_name='Date de validation')
    validated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_purchases',
        verbose_name='Validé par'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Achat'
        verbose_name_plural = 'Achats'
        ordering = ['-date_achat', '-created_at']
        indexes = [
            models.Index(fields=['statut']),
            models.Index(fields=['date_achat']),
            models.Index(fields=['reference']),
        ]

    def generate_reference(self):
        """Generate automatic reference in format ACHAT-YYYY-NNNNNN."""
        if not self.reference:
            today = timezone.now()
            year = today.year
            # Find last purchase reference for this year
            last_purchase = Purchase.objects.filter(
                reference__startswith=f'ACHAT-{year}-'
            ).order_by('-reference').first()
            
            if last_purchase and last_purchase.reference:
                try:
                    last_num_str = last_purchase.reference.split('-')[-1]
                    last_num = int(last_num_str)
                    next_num = last_num + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            
            self.reference = f"ACHAT-{year}-{next_num:06d}"

    def save(self, *args, **kwargs):
        """Auto-generate reference if not provided."""
        self.generate_reference()
        super().save(*args, **kwargs)

    @property
    def total(self):
        """Get total amount from purchase lines."""
        return sum(line.qty * line.prix_unitaire for line in self.purchase_lines.all())
    
    @property
    def paye(self):
        """Get total paid amount."""
        return self.payments.aggregate(total=Sum('montant'))['total'] or 0
    
    @property
    def reste(self):
        """Get remaining amount to pay."""
        return self.total - self.paye

    def __str__(self):
        fournisseur_name = self.fournisseur.nom_complet if self.fournisseur else "Fournisseur inconnu"
        return f"{self.reference} - {fournisseur_name} - {self.get_statut_display()}"


class PurchaseLine(models.Model):
    """Line item for a purchase."""
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='purchase_lines',
        verbose_name='Achat'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='purchase_lines',
        verbose_name='Produit'
    )
    qty = models.IntegerField(validators=[MinValueValidator(1)], verbose_name='Quantité')
    prix_unitaire = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Prix unitaire'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Ligne d\'achat'
        verbose_name_plural = 'Lignes d\'achat'
        unique_together = [['purchase', 'product']]
        ordering = ['created_at']

    def __str__(self):
        return f"{self.purchase.reference} - {self.product.nom} ({self.qty})"


class PurchasePaymentMode(models.TextChoices):
    """Payment modes for purchases."""
    CASH = 'CASH', 'Espèces'
    VIREMENT = 'VIREMENT', 'Virement'
    CB = 'CB', 'Carte bancaire'
    CHEQUE = 'CHEQUE', 'Chèque'


class PurchasePayment(models.Model):
    """Payment model for purchases."""
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='Achat'
    )
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Montant'
    )
    mode = models.CharField(
        max_length=20,
        choices=PurchasePaymentMode.choices,
        verbose_name='Mode de paiement'
    )
    date = models.DateField(default=timezone.now, verbose_name='Date')
    reference = models.CharField(max_length=200, blank=True, verbose_name='Référence')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_payments',
        verbose_name='Créé par'
    )

    class Meta:
        verbose_name = 'Paiement achat'
        verbose_name_plural = 'Paiements achats'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.purchase.reference} - {self.montant}€ - {self.get_mode_display()}"


class MovementType(models.TextChoices):
    """Stock movement types."""
    RECEPTION = 'RECEPTION', 'Réception'
    VENTE = 'VENTE', 'Vente'
    AJUSTEMENT = 'AJUSTEMENT', 'Ajustement'
    CASSE = 'CASSE', 'Casse'


class StockMovement(models.Model):
    """Stock movement - the only way to modify stock."""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='stock_movements',
        verbose_name='Produit'
    )
    qty_signee = models.IntegerField(verbose_name='Quantité signée')
    type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
        verbose_name='Type'
    )
    reference = models.CharField(max_length=200, blank=True, verbose_name='Référence')
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements',
        verbose_name='Créé par'
    )
    reason = models.TextField(blank=True, verbose_name='Raison (obligatoire pour ajustement)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['type']),
            models.Index(fields=['reference']),
        ]

    def __str__(self):
        return f"{self.product} - {self.get_type_display()} : {self.qty_signee:+d} - {self.created_at}"

    @staticmethod
    def get_current_stock(product):
        """
        Calculate current stock for a product.
        Stock = sum of all movements (positive for RECEPTION, negative for VENTE, etc.)
        """
        movements = StockMovement.objects.filter(product=product)
        total = movements.aggregate(total=Sum('qty_signee'))['total'] or 0
        return total

    @staticmethod
    def get_stock_by_product():
        """
        Get current stock for all products.
        Returns a dict: {product_id: stock_quantity}
        """
        from django.db.models import Sum
        results = (
            StockMovement.objects
            .values('product')
            .annotate(total=Sum('qty_signee'))
        )
        return {item['product']: item['total'] or 0 for item in results}
