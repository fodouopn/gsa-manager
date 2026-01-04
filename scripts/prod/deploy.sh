#!/bin/bash
set -e

# Script de déploiement pour GSA Manager production
# Usage: ./scripts/prod/deploy.sh

echo "=========================================="
echo "GSA Manager - Déploiement Production"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PROD_DIR="$PROJECT_ROOT/docker/prod"

cd "$PROD_DIR"

# Check prerequisites
echo -e "${YELLOW}Vérification des prérequis...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erreur: Docker n'est pas installé${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Erreur: Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Erreur: Le fichier .env n'existe pas${NC}"
    echo "Copiez .env.example vers .env et remplissez les valeurs"
    exit 1
fi

# Check if Caddyfile exists
if [ ! -f Caddyfile ]; then
    echo -e "${RED}Erreur: Le fichier Caddyfile n'existe pas${NC}"
    exit 1
fi

echo -e "${GREEN}Prérequis OK${NC}"

# Pull latest code (if using git)
if [ -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${YELLOW}Pull du code depuis Git...${NC}"
    cd "$PROJECT_ROOT"
    git pull || echo -e "${YELLOW}Warning: Impossible de pull depuis Git${NC}"
    cd "$PROD_DIR"
fi

# Build Docker images
echo -e "${YELLOW}Construction des images Docker...${NC}"
$DOCKER_COMPOSE build --no-cache

# Stop existing services
echo -e "${YELLOW}Arrêt des services existants...${NC}"
$DOCKER_COMPOSE down

# Start services
echo -e "${YELLOW}Démarrage des services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${YELLOW}Attente du démarrage des services...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}Exécution des migrations Django...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py migrate --noinput || echo -e "${YELLOW}Warning: Migrations échouées (peut être normal si déjà à jour)${NC}"

# Collect static files
echo -e "${YELLOW}Collecte des fichiers statiques...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py collectstatic --noinput --clear || echo -e "${YELLOW}Warning: Collectstatic échoué${NC}"

# Check service health
echo -e "${YELLOW}Vérification de la santé des services...${NC}"
sleep 5

# Check backend health
if $DOCKER_COMPOSE exec -T backend curl -f http://localhost:8000/api/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend est en ligne${NC}"
else
    echo -e "${RED}✗ Backend n'est pas accessible${NC}"
fi

# Check frontend health
if $DOCKER_COMPOSE exec -T frontend curl -f http://localhost:80/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend est en ligne${NC}"
else
    echo -e "${YELLOW}⚠ Frontend peut prendre quelques secondes à démarrer${NC}"
fi

# Show running services
echo -e "${YELLOW}Services en cours d'exécution:${NC}"
$DOCKER_COMPOSE ps

echo ""
echo -e "${GREEN}=========================================="
echo "Déploiement terminé avec succès!"
echo "==========================================${NC}"
echo ""
echo "Pour consulter les logs:"
echo "  $DOCKER_COMPOSE logs -f"
echo ""
echo "Pour arrêter les services:"
echo "  $DOCKER_COMPOSE down"
echo ""

