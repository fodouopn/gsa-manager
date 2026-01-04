#!/bin/bash
# Script de test pour créer un produit via l'API
# Montre que les permissions backend fonctionnent

echo "=== Test de création de produit via API ==="
echo ""

# 1. Se connecter et obtenir le token
echo "1. Connexion en tant que superadmin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Erreur de connexion"
  echo "Réponse: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Connexion réussie"
echo ""

# 2. Créer un produit
echo "2. Création d'un produit..."
PRODUCT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/catalog/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "nom": "Coca-Cola 33cl",
    "marque": "Coca-Cola",
    "unite_vente": "UNITE",
    "actif": true
  }')

echo "Réponse: $PRODUCT_RESPONSE"
echo ""

# 3. Vérifier la liste des produits
echo "3. Liste des produits créés..."
curl -s -X GET http://localhost:8000/api/catalog/products/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

echo ""
echo "=== Test terminé ==="

