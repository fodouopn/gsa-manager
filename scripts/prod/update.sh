#!/bin/bash
set -e

# Script de mise à jour pour GSA Manager production
# Usage: ./scripts/prod/update.sh

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

echo -e "${YELLOW}=========================================="
echo "GSA Manager - Mise à jour"
echo "==========================================${NC}"

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Pull latest code
if [ -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${YELLOW}Pull du code depuis Git...${NC}"
    cd "$PROJECT_ROOT"
    git pull
    cd "$PROD_DIR"
fi

# Rebuild images
echo -e "${YELLOW}Reconstruction des images Docker...${NC}"
$DOCKER_COMPOSE build

# Restart services with zero downtime (rolling update)
echo -e "${YELLOW}Mise à jour des services...${NC}"

# Update backend
echo -e "${YELLOW}Mise à jour du backend...${NC}"
$DOCKER_COMPOSE up -d --no-deps backend

# Wait for backend to be healthy
sleep 10

# Run migrations
echo -e "${YELLOW}Exécution des migrations...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py migrate --noinput || true

# Collect static files
echo -e "${YELLOW}Collecte des fichiers statiques...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py collectstatic --noinput || true

# Update frontend
echo -e "${YELLOW}Mise à jour du frontend...${NC}"
$DOCKER_COMPOSE up -d --no-deps frontend

# Update other services
echo -e "${YELLOW}Mise à jour des autres services...${NC}"
$DOCKER_COMPOSE up -d

# Show status
echo -e "${YELLOW}Statut des services:${NC}"
$DOCKER_COMPOSE ps

echo ""
echo -e "${GREEN}=========================================="
echo "Mise à jour terminée avec succès!"
echo "==========================================${NC}"
echo ""

