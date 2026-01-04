#!/bin/bash
set -e

# Script de restauration pour GSA Manager production
# Usage: ./scripts/prod/restore.sh <backup_file>
# Exemple: ./scripts/prod/restore.sh /var/backups/gsa/gsa_backup_20240101_120000_complete.tar.gz

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}Erreur: Spécifiez le fichier de backup à restaurer${NC}"
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Erreur: Le fichier de backup n'existe pas: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PROD_DIR="$PROJECT_ROOT/docker/prod"

cd "$PROD_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo -e "${YELLOW}=========================================="
echo "GSA Manager - Restauration"
echo "==========================================${NC}"
echo -e "${RED}ATTENTION: Cette opération va écraser les données actuelles!${NC}"
read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
    echo "Restauration annulée"
    exit 0
fi

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Extract backup to temporary directory
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}Extraction de l'archive de backup...${NC}"
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find database and media backup files
DB_BACKUP=$(find "$TEMP_DIR" -name "*_database.sql.gz" | head -1)
MEDIA_BACKUP=$(find "$TEMP_DIR" -name "*_media.tar.gz" | head -1)

if [ -z "$DB_BACKUP" ] || [ -z "$MEDIA_BACKUP" ]; then
    echo -e "${RED}Erreur: Fichiers de backup introuvables dans l'archive${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Stop services
echo -e "${YELLOW}Arrêt des services...${NC}"
$DOCKER_COMPOSE down

# Restore database
echo -e "${YELLOW}Restauration de la base de données...${NC}"
gunzip -c "$DB_BACKUP" | $DOCKER_COMPOSE run --rm -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" || {
    echo -e "${RED}Erreur lors de la restauration de la base de données${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
}

# Start services
echo -e "${YELLOW}Redémarrage des services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
sleep 10

# Restore media files
echo -e "${YELLOW}Restauration des fichiers médias...${NC}"
VOLUME_NAME="$(basename $(pwd))_backend_media"

# Remove existing media files
docker run --rm \
    -v "$VOLUME_NAME:/media" \
    alpine sh -c "rm -rf /media/* /media/.*[!.]* 2>/dev/null || true"

# Restore media files
docker run --rm \
    -v "$VOLUME_NAME:/media" \
    -v "$MEDIA_BACKUP:/backup/media.tar.gz:ro" \
    alpine sh -c "cd /media && tar xzf /backup/media.tar.gz"

echo -e "${GREEN}✓ Fichiers médias restaurés${NC}"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}=========================================="
echo "Restauration terminée avec succès!"
echo "==========================================${NC}"
echo ""

