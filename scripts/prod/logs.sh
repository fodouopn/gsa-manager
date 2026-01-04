#!/bin/bash

# Script pour consulter les logs facilement
# Usage: ./scripts/prod/logs.sh [service]
# Exemple: ./scripts/prod/logs.sh backend

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PROD_DIR="$PROJECT_ROOT/docker/prod"

cd "$PROD_DIR"

# Use docker compose or docker-compose
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# If service name provided, show logs for that service only
if [ -n "$1" ]; then
    $DOCKER_COMPOSE logs -f "$1"
else
    # Show logs for all services
    $DOCKER_COMPOSE logs -f
fi

