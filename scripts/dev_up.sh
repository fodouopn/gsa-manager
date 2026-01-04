#!/bin/bash

# Script pour démarrer l'environnement de développement

set -e

echo "🚀 Démarrage de l'environnement GSA Manager..."

cd "$(dirname "$0")/../docker/dev"

# Copier .env.example vers .env si .env n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env depuis env.example..."
    cp env.example .env
    echo "⚠️  Veuillez vérifier et ajuster les variables dans .env si nécessaire"
fi

# Démarrer les services Docker
echo "🐳 Démarrage des conteneurs Docker..."
docker compose up -d --build

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 5

# Créer les migrations
echo "📦 Création des migrations..."
docker compose exec backend python manage.py makemigrations

# Exécuter les migrations
echo "📦 Exécution des migrations..."
docker compose exec backend python manage.py migrate

# Créer le super admin (via signal)
echo "👤 Création du super admin..."
# Le super admin est créé automatiquement via le signal post_migrate

# Seed des données de démonstration
echo "🌱 Chargement des données de démonstration..."
docker compose exec backend python manage.py shell < ../../backend/scripts/seed_demo_data.py || echo "⚠️  Seed script non disponible, ignoré"

echo "✅ Environnement démarré avec succès!"
echo ""
echo "📋 Accès:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:8000/api"
echo "   - Django Admin: http://localhost:8000/admin"
echo ""
echo "🔑 Identifiants par défaut:"
echo "   - Email: admin@gsa.fr"
echo "   - Password: admin123"
