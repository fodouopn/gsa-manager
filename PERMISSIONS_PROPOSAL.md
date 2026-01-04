# Proposition : Système de Permissions Granulaire

## Concept
Permettre de définir des permissions spécifiques par utilisateur, en plus du rôle de base.

## Avantages
✅ **Flexibilité** : Personnaliser les droits de chaque utilisateur
✅ **Simplicité** : Facile à comprendre et à utiliser
✅ **Évolutif** : Ajouter de nouvelles permissions facilement

## Structure proposée

### Modèle UserPermission
Un modèle qui stocke les permissions spécifiques pour chaque utilisateur :
- `can_create_invoices` : Créer des factures
- `can_validate_invoices` : Valider des factures
- `can_delete_invoices` : Supprimer des factures
- `can_manage_stock` : Gérer le stock
- `can_manage_containers` : Gérer les conteneurs
- `can_manage_clients` : Gérer les clients
- `can_manage_products` : Gérer les produits
- `can_view_reports` : Voir les rapports
- etc.

### Logique
1. **Rôle de base** : Définit les permissions par défaut
2. **Permissions personnalisées** : Override les permissions du rôle
3. **Priorité** : Si une permission personnalisée existe, elle prend le dessus

## Exemple d'utilisation
- Un utilisateur avec rôle "COMMERCIAL" peut avoir :
  - ✅ `can_create_invoices` = True (par défaut du rôle)
  - ❌ `can_validate_invoices` = False (restreint)
  - ✅ `can_manage_clients` = True (par défaut)

## Implémentation
Je peux créer :
1. Modèle `UserPermission` avec les flags
2. Interface dans la page Users pour gérer ces permissions
3. Logique de vérification dans les permissions

Voulez-vous que je l'implémente ?

