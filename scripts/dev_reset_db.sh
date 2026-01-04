#!/bin/bash

# Script pour réinitialiser la base de données

set -e

echo "🔄 Réinitialisation de la base de données..."

cd "$(dirname "$0")/../docker/dev"

# Arrêter les services
echo "🛑 Arrêt des services..."
docker compose down

# Supprimer le volume de données PostgreSQL
echo "🗑️  Suppression des données PostgreSQL..."
docker volume rm docker_postgres_data 2>/dev/null || echo "Volume déjà supprimé ou inexistant"

# Redémarrer les services
echo "🚀 Redémarrage des services..."
docker compose up -d

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 5

# Exécuter les migrations
echo "📦 Exécution des migrations..."
docker compose exec backend python manage.py migrate

# Créer le super admin (via signal)
echo "👤 Création du super admin..."
# Le super admin est créé automatiquement via le signal post_migrate

# Seed des données de démonstration
echo "🌱 Chargement des données de démonstration..."
docker compose exec backend python manage.py shell < ../../backend/scripts/seed_demo_data.py || echo "⚠️  Seed script non disponible, ignoré"

echo "✅ Base de données réinitialisée avec succès!"
