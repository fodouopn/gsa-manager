#!/bin/bash
set -e

# Script de vérification de santé pour GSA Manager production
# Usage: ./scripts/prod/health_check.sh

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
echo "GSA Manager - Vérification de santé"
echo "==========================================${NC}"

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker est installé${NC}"
fi

# Check services status
echo -e "${YELLOW}Vérification des services...${NC}"
SERVICES=$($DOCKER_COMPOSE ps --services)

for service in $SERVICES; do
    STATUS=$($DOCKER_COMPOSE ps $service | tail -n +2 | awk '{print $1}')
    if [ "$STATUS" = "Up" ] || [ "$STATUS" = "running" ]; then
        echo -e "${GREEN}✓ Service $service est en cours d'exécution${NC}"
    else
        echo -e "${RED}✗ Service $service n'est pas en cours d'exécution${NC}"
    fi
done

# Check disk space
echo -e "${YELLOW}Vérification de l'espace disque...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ Espace disque: ${DISK_USAGE}% utilisé${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠ Espace disque: ${DISK_USAGE}% utilisé (attention)${NC}"
else
    echo -e "${RED}✗ Espace disque: ${DISK_USAGE}% utilisé (critique!)${NC}"
fi

# Check memory
echo -e "${YELLOW}Vérification de la mémoire...${NC}"
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ Mémoire: ${MEM_USAGE}% utilisée${NC}"
elif [ "$MEM_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠ Mémoire: ${MEM_USAGE}% utilisée (attention)${NC}"
else
    echo -e "${RED}✗ Mémoire: ${MEM_USAGE}% utilisée (critique!)${NC}"
fi

# Check backend health endpoint
echo -e "${YELLOW}Vérification du backend...${NC}"
if $DOCKER_COMPOSE exec -T backend curl -f http://localhost:8000/api/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend répond correctement${NC}"
else
    echo -e "${RED}✗ Backend ne répond pas${NC}"
fi

# Check frontend
echo -e "${YELLOW}Vérification du frontend...${NC}"
if $DOCKER_COMPOSE exec -T frontend curl -f http://localhost:80/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend répond correctement${NC}"
else
    echo -e "${YELLOW}⚠ Frontend peut prendre quelques secondes à répondre${NC}"
fi

# Check database connection
echo -e "${YELLOW}Vérification de la base de données...${NC}"
if $DOCKER_COMPOSE exec -T postgres pg_isready -U ${POSTGRES_USER:-gsa_user} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Base de données est accessible${NC}"
else
    echo -e "${RED}✗ Base de données n'est pas accessible${NC}"
fi

# Check Redis
echo -e "${YELLOW}Vérification de Redis...${NC}"
if $DOCKER_COMPOSE exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis répond correctement${NC}"
else
    echo -e "${RED}✗ Redis ne répond pas${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Vérification terminée"
echo "==========================================${NC}"
echo ""

