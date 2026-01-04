# GSA Manager

Application web de gestion interne (mini-ERP) pour l'entreprise GSA, spécialisée dans l'importation de boissons africaines (camerounaises) en France.

## 📋 Vue d'ensemble

GSA Manager est un outil professionnel de gestion qui couvre :
- **Catalogue produits** avec prix de base et prix clients personnalisés
- **Gestion des conteneurs** (prévu vs réel) avec suivi de déchargement
- **Stock** basé uniquement sur des mouvements (traçabilité complète)
- **Ventes / Factures** avec génération PDF, paiements partiels et relances
- **Audit et traçabilité** de toutes les actions critiques
- **Gestion des utilisateurs** avec permissions RBAC strictes

## 🏗️ Architecture

### Stack technique

**Backend :**
- Python 3.12
- Django + Django REST Framework
- JWT (access + refresh tokens)
- PostgreSQL
- Redis + Celery + Celery Beat

**Frontend :**
- React
- Vite
- UI professionnelle (MUI ou Ant Design)

**Infrastructure :**
- Docker & Docker Compose
- Caddy (reverse proxy en production)

### Structure du monorepo

```
/
  backend/          # Application Django
  frontend/        # Application React/Vite
  docker/          # Configurations Docker (dev/prod)
  scripts/         # Scripts d'automatisation
```

## 🚀 Démarrage rapide (Développement local)

### Prérequis

- Docker & Docker Compose installés
- Git

### Installation

1. Cloner le repository
2. Se placer dans le dossier de développement :
   ```bash
   cd docker/dev
   ```
3. Démarrer l'environnement :
   ```bash
   docker compose up -d --build
   ```

### Accès

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:8000/api
- **Django Admin** : http://localhost:8000/admin
- **Swagger/OpenAPI** : http://localhost:8000/api/docs

### Scripts utiles

- `scripts/dev_up.sh` : Démarre l'environnement complet
- `scripts/dev_down.sh` : Arrête l'environnement
- `scripts/dev_reset_db.sh` : Réinitialise la base de données
- `scripts/seed_demo_data.sh` : Charge des données de démonstration

## 📦 Modules métier

### 1. Catalog
Gestion des produits et prix de base.

### 2. Clients
Gestion des clients avec prix spécifiques par produit.

### 3. Containers
Importation via conteneurs (prévu vs réel) avec suivi de déchargement.

### 4. Stock
Stock basé uniquement sur des mouvements (RECEPTION, VENTE, AJUSTEMENT, CASSE).

### 5. Billing
Ventes, factures, paiements partiels, génération PDF, relances automatiques.

### 6. Audit
Traçabilité complète de toutes les actions critiques.

### 7. Users
Gestion des utilisateurs avec rôles et permissions RBAC.

## 🔐 Rôles et permissions

- **SUPER_ADMIN** : Accès total, gestion des rôles
- **ADMIN_GSA** : Administration complète (sauf gestion rôles)
- **LOGISTIQUE** : Gestion conteneurs, stock, déchargement
- **COMMERCIAL** : Gestion clients, factures, paiements
- **LECTURE** : Consultation uniquement

## 📝 Principes fondamentaux

1. **Traçabilité** : Toute donnée critique est traçable
2. **Audit** : Aucune modification sensible n'est silencieuse
3. **Stock par mouvements** : Le stock ne doit JAMAIS être manipulé sans historique
4. **Immutabilité** : Une facture validée ne peut jamais être modifiée directement
5. **Permissions** : Chaque utilisateur agit selon un rôle précis

## 🧪 Tests

Les tests couvrent au minimum :
- Validation conteneur → mouvements RECEPTION
- Validation facture → mouvements VENTE + verrouillage
- Snapshot prix immuable

## 🌐 Déploiement VPS

Le projet est structuré pour être déployé sur un VPS (ex: Hetzner) via Docker Compose sans refonte.

Voir `docker/prod/` pour les configurations de production.

## 📄 Licence

Propriétaire - Entreprise GSA

---

**Note** : Ce projet est en cours de développement. Consultez `SPEC_GSA_MANAGER.md` pour la spécification complète.

