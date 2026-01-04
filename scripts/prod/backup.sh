#!/bin/bash
set -e

# Script de backup pour GSA Manager production
# Usage: ./scripts/prod/backup.sh
# Configurez BACKUP_DIR et BACKUP_RETENTION_DAYS dans .env

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

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default backup directory
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gsa}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Date for backup filename
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="gsa_backup_${DATE}"

echo -e "${YELLOW}=========================================="
echo "GSA Manager - Backup"
echo "==========================================${NC}"

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Backup PostgreSQL database
echo -e "${YELLOW}Backup de la base de données PostgreSQL...${NC}"
DB_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_database.sql"

$DOCKER_COMPOSE exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup base de données créé: ${DB_BACKUP_FILE}${NC}"
    # Compress database backup
    gzip "$DB_BACKUP_FILE"
    echo -e "${GREEN}✓ Backup base de données compressé${NC}"
else
    echo -e "${RED}✗ Erreur lors du backup de la base de données${NC}"
    exit 1
fi

# Backup media files
echo -e "${YELLOW}Backup des fichiers médias...${NC}"
MEDIA_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_media.tar.gz"

# Get the volume name for backend_media
VOLUME_NAME="$(basename $(pwd))_backend_media"

# Create a temporary container to access the volume
docker run --rm \
    -v "$VOLUME_NAME:/media:ro" \
    -v "$BACKUP_DIR:/backup" \
    alpine tar czf "/backup/$(basename $MEDIA_BACKUP_FILE)" -C /media .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup médias créé: ${MEDIA_BACKUP_FILE}${NC}"
else
    echo -e "${RED}✗ Erreur lors du backup des médias${NC}"
    exit 1
fi

# Create a combined backup archive (optional)
COMBINED_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_complete.tar.gz"
echo -e "${YELLOW}Création de l'archive complète...${NC}"

TEMP_DIR=$(mktemp -d)
cp "${DB_BACKUP_FILE}.gz" "$TEMP_DIR/"
cp "$MEDIA_BACKUP_FILE" "$TEMP_DIR/"

tar czf "$COMBINED_BACKUP_FILE" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Archive complète créée: ${COMBINED_BACKUP_FILE}${NC}"

# Clean old backups
echo -e "${YELLOW}Nettoyage des anciens backups (plus de ${BACKUP_RETENTION_DAYS} jours)...${NC}"
find "$BACKUP_DIR" -name "gsa_backup_*" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
echo -e "${GREEN}✓ Nettoyage terminé${NC}"

# Show backup size
BACKUP_SIZE=$(du -h "$COMBINED_BACKUP_FILE" | cut -f1)
echo ""
echo -e "${GREEN}=========================================="
echo "Backup terminé avec succès!"
echo "==========================================${NC}"
echo "Archive complète: ${COMBINED_BACKUP_FILE}"
echo "Taille: ${BACKUP_SIZE}"
echo ""

