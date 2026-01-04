Tu es un architecte logiciel senior et un lead developer fullstack.
Tu dois générer un monorepo COMPLET, COHÉRENT et PRODUCTION-READY pour une application web appelée “GSA Manager”.

La priorité ABSOLUE est :
1) que l’application fonctionne parfaitement EN LOCAL sur mon PC via Docker
2) qu’elle soit structurée pour être déployée ENSUITE sur un VPS (Docker Compose) sans refonte

========================================
CONTEXTE COMPLET DU PROJET (À BIEN LIRE)
========================================

L’entreprise GSA est une société basée en France qui importe des boissons africaines,
plus particulièrement camerounaises, et les revend en France.

Le cœur du business repose sur :
- la gestion rigoureuse des arrivages (conteneurs)
- la traçabilité du stock
- la vente avec facturation, paiements partiels et relances
- la personnalisation des prix par client
- la responsabilité des actions (audit / traçabilité)

L’application n’est PAS un simple site de vente :
c’est un outil interne de gestion professionnelle (type mini-ERP).

Les principes fondamentaux à respecter :
- toute donnée critique doit être traçable
- aucune modification sensible ne doit être silencieuse
- le stock ne doit JAMAIS être manipulé sans historique
- une facture validée ne doit jamais être modifiée directement
- chaque utilisateur agit selon un rôle précis

========================================
VISION GLOBALE DU SYSTÈME
========================================

Le système est découpé en grands blocs métiers :

1) Catalogue produits + prix de base
2) Clients avec prix spécifiques par produit
3) Importation via conteneurs (prévu vs réel)
4) Déchargement avec suivi temporel précis
5) Stock basé uniquement sur des mouvements
6) Ventes / Factures / Paiements / Relances
7) Audit et traçabilité complète
8) Gestion des utilisateurs et permissions

========================================
STACK TECHNIQUE IMPOSÉE
========================================

Backend :
- Python 3.12
- Django
- Django REST Framework
- JWT (access + refresh)

Base de données :
- PostgreSQL

Asynchrone / jobs :
- Redis
- Celery
- Celery Beat (relances automatiques)

Frontend :
- React
- Vite
- UI professionnelle (MUI ou Ant Design)
- Sidebar + tables filtrables

PDF :
- Génération serveur via template HTML → PDF
- Stockage local dans un dossier media/ monté en volume Docker

========================================
STRUCTURE DU REPO (OBLIGATOIRE)
========================================

/
  backend/
    Dockerfile
    requirements.txt
    manage.py
    gsa_backend/
    apps/
      catalog/
      clients/
      containers/
      stock/
      billing/
      audit/
      users/
  frontend/
    Dockerfile.dev
    Dockerfile.prod
    src/
  docker/
    dev/
      docker-compose.yml
      .env.example
    prod/
      docker-compose.yml
      Caddyfile
      .env.example
  scripts/
    dev_up.sh
    dev_down.sh
    dev_reset_db.sh
    seed_demo_data.sh
  README.md

========================================
PRIORITÉ #1 — DEV LOCAL FLUIDE
========================================

Tout doit fonctionner sur mon PC avec :

  cd docker/dev
  docker compose up -d --build

Accès :
- Frontend : http://localhost:5173
- Backend API : http://localhost:8000/api
- Django admin : http://localhost:8000/admin
- Swagger / OpenAPI : /api/docs ou /swagger

Hot reload :
- Frontend : Vite
- Backend : auto-reload Django

========================================
RÈGLES MÉTIER DÉTAILLÉES
========================================

----------------------------------------
A) PRODUITS & PRIX
----------------------------------------
- Product : nom, marque, unité_vente (BOUTEILLE / PACK / CARTON), actif
- BasePrice : product, prix_base
- Client : fiche client complète
- ClientPrice : client + product → prix spécial

⚠️ Lors d’une vente :
- le prix appliqué doit être SNAPSHOT
- le champ prix_unit_applique ne doit JAMAIS changer après validation

----------------------------------------
B) CONTENEURS (IMPORTATION)
----------------------------------------
- Container :
  ref, date_arrivee_estimee, date_arrivee_reelle,
  statut {PREVU, EN_COURS, DECHARGE, VALIDE}

- ManifestLine (prévu) :
  container + product + qty_prevue

- ReceivedLine (réel) :
  container + product + qty_recue + casse + commentaire

----------------------------------------
C) DÉCHARGEMENT
----------------------------------------
- UnloadingSession :
  container, nb_personnes, somme_allouee

- UnloadingEvent :
  session,
  type {START, PAUSE, RESUME, END, EDIT},
  timestamp, user, meta

Fonctionnement :
- boutons API start / pause / resume / end
- toute correction crée un event EDIT
- chaque action est auditée

Validation du conteneur :
- impose la saisie du réel
- crée automatiquement des mouvements de stock RECEPTION
- verrouille les quantités reçues

----------------------------------------
D) STOCK (PAR MOUVEMENTS)
----------------------------------------
- StockMovement :
  product, qty_signée,
  type {RECEPTION, VENTE, AJUSTEMENT, CASSE},
  reference, created_by, created_at

Règles :
- le stock courant = somme des mouvements
- aucun champ “quantité” modifié directement
- ajustement stock :
  - permission requise
  - champ reason obligatoire
  - audit log obligatoire

----------------------------------------
E) VENTES / FACTURES
----------------------------------------
- Invoice :
  statut {BROUILLON, VALIDEE, ANNULEE, AVOIR}
  type {LIVRAISON, RETRAIT}
  total, payé, reste
  prochaine_date_relance (par défaut +7 jours si reste > 0)

- InvoiceLine :
  product, qty, prix_unit_applique (snapshot), total_ligne

- Payment :
  invoice, montant, mode {CASH, VIREMENT, CB}, date

Validation facture :
- génère numéro GSA-YYYY-000001
- génère PDF
- crée mouvements stock VENTE (qty négative)
- verrouille les lignes

Erreur après validation :
- création d’un AVOIR
- aucune modification directe autorisée

----------------------------------------
F) RELANCES (CELERY)
----------------------------------------
- Celery Beat vérifie les factures impayées
- déclenche relance si date atteinte
- relance reportable
- historique conservé

----------------------------------------
G) UTILISATEURS & RÔLES
----------------------------------------
Rôles :
- SUPER_ADMIN
- ADMIN_GSA
- LOGISTIQUE
- COMMERCIAL
- LECTURE

- Seed automatique d’un SUPER_ADMIN via variables d’environnement
- Permissions strictes sur les endpoints

----------------------------------------
H) AUDIT LOG (TRAÇABILITÉ)
----------------------------------------
- AuditLog :
  entity_type, entity_id,
  action,
  before_json, after_json,
  user, created_at, reason

Audit obligatoire sur :
- validation conteneur
- validation / annulation facture
- ajustement stock
- modification prix client
- modification horaires déchargement
- suppression (soft-delete recommandé)

Endpoint :
- GET /api/audit/logs (filtres)

========================================
CAS D’USAGE (FONCTIONNEMENT CORRECT DU SYSTÈME)
========================================
Le système doit être considéré “correct” si les scénarios suivants fonctionnent de bout en bout
avec données cohérentes, stock correct, audit complet et permissions respectées.

1) INITIALISATION (ADMIN)
- Le projet démarre en local via docker compose.
- Un SUPER_ADMIN est créé automatiquement via env.
- Le SUPER_ADMIN peut créer des utilisateurs et leur attribuer un rôle.

2) CRÉATION PRODUITS + PRIX DE BASE
- ADMIN_GSA crée plusieurs produits + prix de base.
- Le catalogue est visible dans l’UI et via API.
- Toute modification produit/prix base est auditée si sensible.

3) CRÉATION CLIENT + PRIX CLIENT
- COMMERCIAL/ADMIN_GSA crée un client.
- Ajoute des prix spéciaux (ClientPrice) pour certains produits.
- La fiche client affiche:
  - infos client
  - prix spécifiques
  - historique factures
  - solde/impayés
- Toute modification de prix client crée un audit log.

4) FLUX CONTENEUR COMPLET (PRÉVU -> RÉEL -> STOCK)
- LOGISTIQUE/ADMIN_GSA crée un conteneur (statut PREVU) + Manifest (prévu).
- Démarre une session déchargement et clique START (event enregistré).
- Clique PAUSE/RESUME si besoin (events enregistrés).
- Clique END (event enregistré).
- Renseigne Received (réel) en copiant le prévu puis en ajustant (casse, écarts).
- Valide le conteneur:
  - statut devient VALIDE
  - création automatique de mouvements de stock RECEPTION
  - stock courant augmente correctement
  - audit log de validation présent
- Après validation, les quantités reçues ne sont plus modifiables (sauf ajustement stock).

5) FLUX VENTE FACTURE (BROUILLON -> VALIDÉE -> PDF -> STOCK)
- COMMERCIAL crée une facture BROUILLON:
  - choisit un client existant ou en crée un
  - ajoute des lignes produits + quantités
  - les prix appliqués sont ceux du client (sinon prix base)
  - total calculé automatiquement
- La facture affiche payé/reste.
- Par défaut, si reste > 0, prochaine relance = +7 jours.
- Validation facture:
  - numérotation officielle générée
  - PDF généré et téléchargeable
  - mouvements de stock VENTE créés (stock diminue)
  - les lignes deviennent verrouillées (non modifiables)
  - audit log de validation présent

6) PAIEMENTS MULTIPLES + SOLDÉ
- Sur une facture VALIDEE, on peut ajouter plusieurs paiements.
- paid/reste se mettent à jour.
- Si reste = 0, la facture est soldée et la relance est désactivée.

7) RELANCE AUTOMATIQUE
- Une facture impayée avec date_relance atteinte déclenche une relance via Celery Beat.
- L’historique relance est conservé (table ou audit).
- Un utilisateur autorisé peut reporter la relance, ce report est tracé.

8) ERREUR APRÈS VALIDATION -> AVOIR
- Si une facture validée a une erreur:
  - on ne peut pas modifier les lignes
  - on doit créer un AVOIR lié à la facture
  - l’avoir corrige la situation comptable (et stock si retour)
  - audit log présent
- L’historique reste cohérent.

9) AJUSTEMENT DE STOCK (CASSE/INVENTAIRE)
- LOGISTIQUE/ADMIN_GSA effectue un ajustement:
  - type AJUSTEMENT ou CASSE
  - reason obligatoire
  - mouvement enregistré
  - audit log présent
- Les autres rôles ne peuvent pas ajuster.

10) AUDIT & TRAÇABILITÉ
- Toute action critique génère un audit log consultable:
  - filtrable par date, user, entité, action
- L’audit montre before/after et l’auteur.

11) PERMISSIONS (RBAC)
- LECTURE ne peut rien modifier.
- COMMERCIAL ne peut pas valider un conteneur ni ajuster stock.
- LOGISTIQUE ne peut pas modifier les prix clients ni supprimer une facture.
- SUPER_ADMIN peut tout faire et gérer les rôles.

12) COHÉRENCE GLOBALE
- Le stock courant correspond toujours à la somme des mouvements.
- Un conteneur validé a exactement les mouvements de réception correspondants.
- Une facture validée a exactement les mouvements de vente correspondants.
- Les PDFs restent accessibles pour chaque facture validée.

========================================
FRONTEND (MVP)
========================================

Pages obligatoires :
- Login
- Dashboard (conteneurs en cours, impayés, alertes stock)
- Produits
- Clients (fiche client complète)
- Conteneurs (timeline + validation)
- Stock (courant + historique)
- Factures (création, validation, paiements, PDF)
- Audit
- Utilisateurs / rôles (SUPER_ADMIN)

UI :
- professionnelle
- responsive
- sidebar
- tables filtrables
- modales propres

========================================
SCRIPTS DE DEV
========================================

scripts/dev_up.sh :
- docker compose up
- migrations
- seed admin
- seed demo data

scripts/dev_reset_db.sh :
- reset postgres
- rerun migrations
- reseed

scripts/seed_demo_data.sh :
- produits
- clients
- prix
- conteneur exemple
- facture exemple

========================================
TESTS MINIMUM
========================================

- validation conteneur → mouvements RECEPTION
- validation facture → mouvements VENTE + verrouillage
- snapshot prix immuable

========================================
PRÉPARATION VPS (SANS BLOQUER LE DEV)
========================================

- docker/prod prêt mais non utilisé en local
- Caddyfile fourni
- README explique le passage local → VPS (Hetzner)

========================================
LIVRABLE FINAL
========================================

Génère tout le code, configs, scripts et README.
Assure-toi que le projet fonctionne immédiatement en local via Docker.
