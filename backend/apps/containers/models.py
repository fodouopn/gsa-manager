"""
Container models - Import management and unloading tracking.
"""
from django.db import models
from django.core.validators import MinValueValidator
from apps.catalog.models import Product


class ContainerStatus(models.TextChoices):
    """Container status choices."""
    PREVU = 'PREVU', 'Prévu'
    EN_COURS = 'EN_COURS', 'En cours'
    DECHARGE = 'DECHARGE', 'Déchargé'
    VALIDE = 'VALIDE', 'Validé'


class Container(models.Model):
    """Container model."""
    ref = models.CharField(max_length=100, unique=True, verbose_name='Référence')
    date_arrivee_estimee = models.DateField(verbose_name='Date d\'arrivée estimée')
    date_arrivee_reelle = models.DateField(null=True, blank=True, verbose_name='Date d\'arrivée réelle')
    statut = models.CharField(
        max_length=20,
        choices=ContainerStatus.choices,
        default=ContainerStatus.PREVU,
        verbose_name='Statut'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')
    validated_at = models.DateTimeField(null=True, blank=True, verbose_name='Date de validation')
    validated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_containers',
        verbose_name='Validé par'
    )

    class Meta:
        verbose_name = 'Conteneur'
        verbose_name_plural = 'Conteneurs'
        ordering = ['-date_arrivee_estimee', '-created_at']
        indexes = [
            models.Index(fields=['statut']),
            models.Index(fields=['date_arrivee_estimee']),
        ]

    def __str__(self):
        return f"{self.ref} - {self.get_statut_display()}"


class ManifestLine(models.Model):
    """Expected quantities in container (manifest)."""
    container = models.ForeignKey(
        Container,
        on_delete=models.CASCADE,
        related_name='manifest_lines',
        verbose_name='Conteneur'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='manifest_lines',
        verbose_name='Produit'
    )
    qty_prevue = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Quantité prévue'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Ligne manifest (prévu)'
        verbose_name_plural = 'Lignes manifest (prévu)'
        unique_together = [['container', 'product']]
        ordering = ['container', 'product__nom']

    def __str__(self):
        return f"{self.container.ref} - {self.product} : {self.qty_prevue} prévu"


class ReceivedLine(models.Model):
    """Actual received quantities in container."""
    container = models.ForeignKey(
        Container,
        on_delete=models.CASCADE,
        related_name='received_lines',
        verbose_name='Conteneur'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='received_lines',
        verbose_name='Produit'
    )
    qty_recue = models.PositiveIntegerField(
        validators=[MinValueValidator(0)],
        verbose_name='Quantité reçue'
    )
    casse = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Casse'
    )
    commentaire = models.TextField(blank=True, verbose_name='Commentaire')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        verbose_name = 'Ligne réception (réel)'
        verbose_name_plural = 'Lignes réception (réel)'
        unique_together = [['container', 'product']]
        ordering = ['container', 'product__nom']

    def __str__(self):
        return f"{self.container.ref} - {self.product} : {self.qty_recue} reçu"


class UnloadingEventType(models.TextChoices):
    """Unloading event types."""
    START = 'START', 'Début'
    PAUSE = 'PAUSE', 'Pause'
    RESUME = 'RESUME', 'Reprise'
    END = 'END', 'Fin'
    EDIT = 'EDIT', 'Modification'


class UnloadingSession(models.Model):
    """Unloading session for a container."""
    container = models.OneToOneField(
        Container,
        on_delete=models.CASCADE,
        related_name='unloading_session',
        verbose_name='Conteneur'
    )
    nb_personnes = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name='Nombre de personnes'
    )
    somme_allouee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Somme allouée'
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='Début')
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name='Fin')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Session de déchargement'
        verbose_name_plural = 'Sessions de déchargement'
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.container.ref} - {self.created_at}"


class UnloadingEvent(models.Model):
    """Event in unloading session (start, pause, resume, end, edit)."""
    session = models.ForeignKey(
        UnloadingSession,
        on_delete=models.CASCADE,
        related_name='events',
        verbose_name='Session'
    )
    type = models.CharField(
        max_length=20,
        choices=UnloadingEventType.choices,
        verbose_name='Type'
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='Horodatage')
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unloading_events',
        verbose_name='Utilisateur'
    )
    meta = models.JSONField(default=dict, blank=True, verbose_name='Métadonnées')

    class Meta:
        verbose_name = 'Événement de déchargement'
        verbose_name_plural = 'Événements de déchargement'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['session', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.session.container.ref} - {self.get_type_display()} - {self.timestamp}"
