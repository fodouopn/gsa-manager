#!/bin/bash

# Script pour arrêter l'environnement de développement

set -e

echo "🛑 Arrêt de l'environnement GSA Manager..."

cd "$(dirname "$0")/../docker/dev"

docker compose down

echo "✅ Environnement arrêté"
