"""
Script de seed pour données de démonstration.
À exécuter via: python manage.py shell < scripts/seed_demo_data.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gsa_backend.settings')
django.setup()

from apps.catalog.models import Product, BasePrice, UniteVente
from apps.clients.models import Client, ClientPrice
from apps.containers.models import Container, ContainerStatus, ManifestLine
from django.utils import timezone
from datetime import timedelta

# Produits
print("📦 Création des produits...")
products_data = [
    {"nom": "Jus de Bissap", "marque": "Vitamalt", "unite_vente": UniteVente.BOUTEILLE},
    {"nom": "Jus de Gingembre", "marque": "Vitamalt", "unite_vente": UniteVente.BOUTEILLE},
    {"nom": "Bière 33 Export", "marque": "Castel", "unite_vente": UniteVente.BOUTEILLE},
    {"nom": "Bière Mützig", "marque": "Mützig", "unite_vente": UniteVente.BOUTEILLE},
    {"nom": "Eau minérale", "marque": "Source du Pays", "unite_vente": UniteVente.BOUTEILLE},
]

products = []
for data in products_data:
    product, created = Product.objects.get_or_create(
        nom=data["nom"],
        marque=data["marque"],
        defaults={"unite_vente": data["unite_vente"]}
    )
    products.append(product)
    if created:
        print(f"  ✓ {product.nom} créé")

# Prix de base
print("💰 Création des prix de base...")
base_prices = [
    (products[0], 2.50),
    (products[1], 2.50),
    (products[2], 1.80),
    (products[3], 1.90),
    (products[4], 1.20),
]

for product, price in base_prices:
    BasePrice.objects.get_or_create(
        product=product,
        defaults={"prix_base": price}
    )
    print(f"  ✓ Prix de base {product.nom}: {price} €")

# Clients
print("👥 Création des clients...")
clients_data = [
    {
        "nom": "Dupont",
        "prenom": "Jean",
        "entreprise": "Restaurant Le Cameroun",
        "email": "jean.dupont@example.com",
        "telephone": "0123456789",
        "adresse": "123 Rue de la République",
        "code_postal": "75001",
        "ville": "Paris",
    },
    {
        "nom": "Martin",
        "prenom": "Marie",
        "entreprise": "Épicerie Africaine",
        "email": "marie.martin@example.com",
        "telephone": "0987654321",
        "adresse": "456 Avenue des Champs",
        "code_postal": "75008",
        "ville": "Paris",
    },
]

clients = []
for data in clients_data:
    client, created = Client.objects.get_or_create(
        email=data["email"],
        defaults=data
    )
    clients.append(client)
    if created:
        print(f"  ✓ {client.nom_complet} créé")

# Prix clients spécifiques
print("💵 Création des prix clients...")
ClientPrice.objects.get_or_create(
    client=clients[0],
    product=products[0],
    defaults={"prix": 2.30}  # Prix réduit pour client fidèle
)
print(f"  ✓ Prix spécial créé pour {clients[0].nom_complet}")

# Conteneur exemple
print("📦 Création d'un conteneur exemple...")
container, created = Container.objects.get_or_create(
    ref="CONT-2024-001",
    defaults={
        "date_arrivee_estimee": timezone.now().date() + timedelta(days=30),
        "statut": ContainerStatus.PREVU,
    }
)
if created:
    print(f"  ✓ Conteneur {container.ref} créé")
    
    # Manifest lines
    ManifestLine.objects.get_or_create(
        container=container,
        product=products[0],
        defaults={"qty_prevue": 1000}
    )
    ManifestLine.objects.get_or_create(
        container=container,
        product=products[2],
        defaults={"qty_prevue": 500}
    )
    print(f"  ✓ Lignes manifest créées")

print("✅ Données de démonstration chargées avec succès!")

