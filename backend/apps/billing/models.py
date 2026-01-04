"""
Billing models - Invoices, invoice lines, and payments.
"""
from django.db import models
from django.db.models import Sum, F
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import timedelta
from apps.catalog.models import Product
from apps.clients.models import Client


class InvoiceStatus(models.TextChoices):
    """Invoice status choices."""
    BROUILLON = 'BROUILLON', 'Brouillon'
    VALIDEE = 'VALIDEE', 'Validée'
    ACCEPTEE = 'ACCEPTEE', 'Acceptée'
    CONTESTEE = 'CONTESTEE', 'Contestée'
    ANNULEE = 'ANNULEE', 'Annulée'
    AVOIR = 'AVOIR', 'Avoir'


class InvoiceType(models.TextChoices):
    """Invoice type choices."""
    LIVRAISON = 'LIVRAISON', 'Livraison'
    RETRAIT = 'RETRAIT', 'Retrait'


class PaymentMode(models.TextChoices):
    """Payment mode choices."""
    CASH = 'CASH', 'Espèces'
    VIREMENT = 'VIREMENT', 'Virement'
    CB = 'CB', 'Carte bancaire'
    CHEQUE = 'CHEQUE', 'Chèque'


class CompanySettings(models.Model):
    """Company information for invoices."""
    nom = models.CharField(max_length=200, default="GOÛTS ET SAVEURS D'AFRIQUE", verbose_name="Nom de l'entreprise")
    adresse = models.TextField(blank=True, verbose_name="Adresse")
    ville = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    code_postal = models.CharField(max_length=20, blank=True, verbose_name="Code postal")
    pays = models.CharField(max_length=100, default="Sénégal", verbose_name="Pays")
    telephone = models.CharField(max_length=50, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    site_web = models.URLField(blank=True, default="www.gsa-boissons.com", verbose_name="Site web")
    logo = models.ImageField(upload_to='company/', blank=True, null=True, verbose_name="Logo")
    numero_compte_bancaire = models.CharField(max_length=100, blank=True, verbose_name="Numéro de compte bancaire")
    tva_jus = models.DecimalField(max_digits=5, decimal_places=2, default=5.50, verbose_name="TVA Jus (%)")
    tva_biere = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, verbose_name="TVA Bière (%)")
    message_facture = models.TextField(default="Merci pour votre confiance !", verbose_name="Message sur la facture")
    
    class Meta:
        verbose_name = "Paramètres de l'entreprise"
        verbose_name_plural = "Paramètres de l'entreprise"
    
    def __str__(self):
        return self.nom
    
    @classmethod
    def get_settings(cls):
        """Get or create company settings (singleton pattern)."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class Invoice(models.Model):
    """Invoice model."""
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='invoices')
    numero = models.CharField(max_length=50, unique=True, blank=True, null=True)
    type = models.CharField(max_length=20, choices=InvoiceType.choices, default=InvoiceType.LIVRAISON)
    statut = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.BROUILLON)
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_invoices')
    
    # Financial fields
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tva_incluse = models.BooleanField(default=True, verbose_name="TVA incluse")
    tva_jus = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="TVA Jus")
    tva_biere = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="TVA Bière")
    total_ttc = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paye = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reste = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Payment tracking
    prochaine_date_relance = models.DateField(null=True, blank=True)
    
    # PDF
    pdf_path = models.CharField(max_length=500, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
    
    def __str__(self):
        return f"{self.numero or 'Brouillon'} - {self.client.nom_complet}"
    
    def calculate_totals(self):
        """Calculate invoice totals from lines."""
        lines = self.invoice_lines.all()
        self.total = sum(line.total_ligne for line in lines)
        
        # Calculate TVA by category
        company_settings = CompanySettings.get_settings()
        total_jus = sum(
            line.total_ligne for line in lines 
            if line.product.categorie == 'JUS'
        )
        total_biere = sum(
            line.total_ligne for line in lines 
            if line.product.categorie == 'BIERE'
        )
        
        # Calculate TVA only if tva_incluse is True
        if self.tva_incluse:
            self.tva_jus = total_jus * (company_settings.tva_jus / 100)
            self.tva_biere = total_biere * (company_settings.tva_biere / 100)
            total_tva = self.tva_jus + self.tva_biere
        else:
            self.tva_jus = 0
            self.tva_biere = 0
            total_tva = 0
        
        self.total_ttc = self.total + total_tva
        
        # Calculate payments
        self.paye = self.payments.aggregate(total=Sum('montant'))['total'] or 0
        self.reste = self.total_ttc - self.paye
        
        self.save()
    
    def update_payment_status(self):
        """Update payment status and reminder date."""
        if self.reste > 0:
            # Set reminder date to 30 days from validation
            if self.validated_at:
                self.prochaine_date_relance = (self.validated_at + timedelta(days=30)).date()
        else:
            self.prochaine_date_relance = None
        self.save()
    
    @staticmethod
    def generate_invoice_number():
        """Generate unique invoice number."""
        year = timezone.now().year
        last_invoice = Invoice.objects.filter(
            numero__startswith=f"GSA-{year}-"
        ).order_by('-numero').first()
        
        if last_invoice and last_invoice.numero:
            try:
                last_num = int(last_invoice.numero.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"GSA-{year}-{next_num:06d}"


class InvoiceLine(models.Model):
    """Invoice line model."""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='invoice_lines')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    prix_unit_applique = models.DecimalField(max_digits=10, decimal_places=2)
    total_ligne = models.DecimalField(max_digits=10, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Ligne de facture"
        verbose_name_plural = "Lignes de facture"
    
    def __str__(self):
        return f"{self.invoice.numero} - {self.product.nom} x{self.qty}"
    
    def save(self, *args, **kwargs):
        self.total_ligne = self.qty * self.prix_unit_applique
        super().save(*args, **kwargs)
        self.invoice.calculate_totals()


class Payment(models.Model):
    """Payment model."""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    montant = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    mode = models.CharField(max_length=20, choices=PaymentMode.choices)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
    
    def __str__(self):
        return f"{self.invoice.numero} - {self.montant}€ - {self.get_mode_display()}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.invoice.calculate_totals()
        self.invoice.update_payment_status()
    
    def delete(self, *args, **kwargs):
        invoice = self.invoice
        super().delete(*args, **kwargs)
        invoice.calculate_totals()
        invoice.update_payment_status()


class InvoiceAcceptance(models.Model):
    """Model to store invoice acceptance by client."""
    invoice = models.OneToOneField(
        Invoice,
        on_delete=models.CASCADE,
        related_name='acceptance',
        verbose_name='Facture'
    )
    accepted_at = models.DateTimeField(auto_now_add=True, verbose_name='Date d\'acceptation')
    ip_address = models.CharField(max_length=45, verbose_name='Adresse IP')
    user_agent = models.TextField(verbose_name='User Agent')
    pdf_hash = models.CharField(max_length=64, verbose_name='Hash PDF (SHA-256)')
    acceptance_text_version = models.CharField(max_length=20, default='v1', verbose_name='Version texte acceptation')
    accepted_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Nom acceptant')
    
    class Meta:
        verbose_name = 'Acceptation de facture'
        verbose_name_plural = 'Acceptations de factures'
        ordering = ['-accepted_at']
    
    def __str__(self):
        return f"Acceptation {self.invoice.numero} - {self.accepted_at}"


class InvoiceAcceptanceToken(models.Model):
    """Model to store secure tokens for invoice acceptance."""
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='acceptance_tokens',
        verbose_name='Facture'
    )
    token_hash = models.CharField(max_length=64, unique=True, verbose_name='Hash token (SHA-256)')
    expires_at = models.DateTimeField(verbose_name='Date d\'expiration')
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='Date d\'utilisation')
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_acceptance_tokens',
        verbose_name='Créé par'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    
    class Meta:
        verbose_name = 'Token d\'acceptation'
        verbose_name_plural = 'Tokens d\'acceptation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Token pour {self.invoice.numero} - Expire: {self.expires_at}"
    
    def is_valid(self):
        """Check if token is valid (not expired and not used)."""
        from django.utils import timezone
        return timezone.now() < self.expires_at and self.used_at is None
    
    def is_expired(self):
        """Check if token is expired."""
        from django.utils import timezone
        return timezone.now() >= self.expires_at


class InvoiceContestation(models.Model):
    """Model to track invoice contestations."""
    invoice = models.OneToOneField(
        Invoice,
        on_delete=models.CASCADE,
        related_name='contestation',
        verbose_name='Facture'
    )
    contested_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de contestation')
    contested_by_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Nom du contestant')
    contested_by_email = models.EmailField(blank=True, null=True, verbose_name='Email du contestant')
    reason = models.TextField(blank=True, null=True, verbose_name='Raison de la contestation')
    ip_address = models.CharField(max_length=45, blank=True, null=True, verbose_name='Adresse IP')
    user_agent = models.TextField(blank=True, null=True, verbose_name='User Agent')
    resolved = models.BooleanField(default=False, verbose_name='Résolue')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='Date de résolution')
    resolved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_contestations',
        verbose_name='Résolue par'
    )
    resolution_notes = models.TextField(blank=True, null=True, verbose_name='Notes de résolution')
    
    class Meta:
        verbose_name = 'Contestation de facture'
        verbose_name_plural = 'Contestations de factures'
        ordering = ['-contested_at']
    
    def __str__(self):
        return f"Contestation {self.invoice.numero} - {self.contested_at}"
