# Guide de test de l'API Backend

## 1. Se connecter et obtenir un token

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Réponse attendue :**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Copiez le token `access` pour les prochaines requêtes.

---

## 2. Créer un produit

```bash
curl -X POST http://localhost:8000/api/catalog/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTRE_ACCESS_TOKEN>" \
  -d '{
    "nom": "Coca-Cola 33cl",
    "marque": "Coca-Cola",
    "unite_vente": "BOUTEILLE",
    "actif": true
  }'
```

**Réponse attendue :**
```json
{
  "id": 1,
  "nom": "Coca-Cola 33cl",
  "marque": "Coca-Cola",
  "unite_vente": "BOUTEILLE",
  "unite_vente_display": "Bouteille",
  "actif": true,
  "base_price_value": null,
  "created_at": "2026-01-XX...",
  "updated_at": "2026-01-XX..."
}
```

---

## 3. Lister tous les produits

```bash
curl -X GET http://localhost:8000/api/catalog/products/ \
  -H "Authorization: Bearer <VOTRE_ACCESS_TOKEN>"
```

---

## 4. Modifier un produit

```bash
curl -X PUT http://localhost:8000/api/catalog/products/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTRE_ACCESS_TOKEN>" \
  -d '{
    "nom": "Coca-Cola 33cl",
    "marque": "Coca-Cola",
    "unite_vente": "PACK",
    "actif": true
  }'
```

---

## 5. Supprimer un produit

```bash
curl -X DELETE http://localhost:8000/api/catalog/products/1/ \
  -H "Authorization: Bearer <VOTRE_ACCESS_TOKEN>"
```

---

## 6. Créer un client

```bash
curl -X POST http://localhost:8000/api/clients/clients/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTRE_ACCESS_TOKEN>" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "entreprise": "Boutique Africaine",
    "email": "jean.dupont@example.com",
    "telephone": "+33123456789",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "code_postal": "75001",
    "pays": "FRANCE",
    "actif": true
  }'
```

---

## 7. Vérifier les permissions

Essayez de créer un produit avec un utilisateur LECTURE (devrait échouer) :

```bash
# D'abord, créez un utilisateur LECTURE via Django Admin
# Puis connectez-vous avec cet utilisateur
# Ensuite, essayez de créer un produit → devrait retourner 403 Forbidden
```

---

## Endpoints disponibles

### Authentification
- `POST /api/auth/login/` - Connexion
- `POST /api/auth/refresh/` - Rafraîchir token

### Utilisateurs
- `GET /api/users/` - Liste (SUPER_ADMIN seulement)
- `GET /api/users/me/` - Mon profil
- `POST /api/users/` - Créer (SUPER_ADMIN seulement)

### Catalogue
- `GET /api/catalog/products/` - Liste produits
- `POST /api/catalog/products/` - Créer produit
- `GET /api/catalog/products/{id}/` - Détail produit
- `PUT /api/catalog/products/{id}/` - Modifier produit
- `DELETE /api/catalog/products/{id}/` - Supprimer produit
- `GET /api/catalog/products/{id}/base_price/` - Voir prix de base
- `POST /api/catalog/products/{id}/base_price/` - Définir prix de base

### Clients
- `GET /api/clients/clients/` - Liste clients
- `POST /api/clients/clients/` - Créer client
- `GET /api/clients/clients/{id}/` - Détail client
- `PUT /api/clients/clients/{id}/` - Modifier client
- `DELETE /api/clients/clients/{id}/` - Supprimer client
- `GET /api/clients/clients/{id}/prices/` - Prix spécifiques
- `POST /api/clients/client-prices/` - Créer prix client

### Conteneurs
- `GET /api/containers/containers/` - Liste conteneurs
- `POST /api/containers/containers/` - Créer conteneur
- `POST /api/containers/containers/{id}/validate/` - Valider conteneur
- `POST /api/containers/unloading-sessions/{id}/start/` - Démarrer déchargement
- `POST /api/containers/unloading-sessions/{id}/end/` - Terminer déchargement

### Stock
- `GET /api/stock/movements/` - Liste mouvements
- `GET /api/stock/current/` - Stock actuel par produit
- `POST /api/stock/movements/adjust/` - Ajuster stock

### Factures
- `GET /api/billing/invoices/` - Liste factures
- `POST /api/billing/invoices/` - Créer facture
- `POST /api/billing/invoices/{id}/validate/` - Valider facture
- `POST /api/billing/invoices/{id}/cancel/` - Annuler facture
- `POST /api/billing/payments/` - Ajouter paiement
- `GET /api/billing/invoices/{id}/pdf/` - Télécharger PDF

### Audit
- `GET /api/audit/logs/` - Liste logs d'audit

