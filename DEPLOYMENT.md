# Guide Complet de Déploiement - GSA Manager Production

Ce guide complet vous accompagne étape par étape pour déployer GSA Manager sur un VPS Hetzner, de l'achat du domaine au déploiement final.

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration VPS Hetzner](#configuration-vps-hetzner)
3. [Obtenir un nom de domaine](#obtenir-un-nom-de-domaine)
4. [Configurer le DNS](#configurer-le-dns)
5. [Transférer le projet sur le VPS](#transférer-le-projet-sur-le-vps)
6. [Certificats SSL automatiques avec Caddy](#certificats-ssl-automatiques-avec-caddy)
7. [Configuration variables d'environnement](#configuration-variables-denvironnement)
8. [Déploiement](#déploiement)
9. [Vérification](#vérification)
10. [Maintenance](#maintenance)
11. [Dépannage](#dépannage)
12. [Rollback](#rollback)

---

## Prérequis

- VPS Hetzner CX33 (ou équivalent : 4 vCPU, 8GB RAM, 80GB NVMe)
- Accès root au VPS
- Accès SSH au VPS
- Connaissances de base en Linux et Docker

---

## Configuration VPS Hetzner

### 1. Créer l'instance VPS

1. Connectez-vous à votre compte Hetzner Cloud : https://console.hetzner.cloud
2. Créez un nouveau projet (ou utilisez un existant)
3. Cliquez sur "Add Server"
4. Sélectionnez :
   - **Location** : Europe (Frankfurt, Nuremberg, ou Helsinki)
   - **Image** : Ubuntu 22.04 ou Debian 12
   - **Type** : CX33 (4 vCPU, 8GB RAM, 80GB NVMe)
   - **SSH Keys** : Ajoutez votre clé SSH publique
   - **Firewall** : Laissez par défaut (sera configuré par le script)
5. Cliquez sur "Create & Buy Now"
6. **Notez l'IPv4** de votre serveur (ex: `123.45.67.89`)

### 2. Trouver les informations de connexion SSH

Hetzner Cloud utilise deux méthodes d'authentification SSH :

#### Option A : Clé SSH (Recommandée - si configurée)

Si vous avez ajouté une clé SSH lors de la création du VPS :

1. **Utilisez votre clé SSH privée** :
   ```bash
   ssh -i ~/.ssh/votre_cle_privee root@<IP_VPS>
   # ou simplement
   ssh root@<IP_VPS>
   # (si votre clé est dans ~/.ssh/id_rsa ou ~/.ssh/id_ed25519)
   ```

2. **Sur Windows** :
   - Si vous utilisez PuTTY : utilisez votre fichier `.ppk`
   - Si vous utilisez PowerShell/OpenSSH : utilisez votre clé privée

#### Option B : Mot de passe root (si aucune clé SSH)

Si vous n'avez pas configuré de clé SSH, Hetzner génère un mot de passe root :

1. **Dans le panneau Hetzner Cloud** :
   - Allez sur https://console.hetzner.cloud
   - Cliquez sur votre projet
   - Cliquez sur votre serveur
   - Allez dans l'onglet **"Access"** ou **"Accès"**
   - Vous verrez une section **"Root Password"** ou **"Mot de passe root"**
   - Cliquez sur **"Show Password"** ou **"Afficher le mot de passe"**
   - Le mot de passe s'affichera (vous devrez peut-être le copier)

2. **Ou dans l'email de confirmation** :
   - Hetzner envoie parfois le mot de passe root par email lors de la création du serveur
   - Vérifiez votre boîte email

3. **Si vous ne trouvez pas le mot de passe** :
   - Vous pouvez le réinitialiser dans le panneau Hetzner Cloud
   - Allez dans votre serveur > "Access" > "Reset Root Password"
   - Un nouveau mot de passe sera généré

#### Option C : Console Web (si SSH ne fonctionne pas)

Si vous ne pouvez pas vous connecter via SSH :

1. Dans le panneau Hetzner Cloud
2. Cliquez sur votre serveur
3. Cliquez sur **"Console"** ou **"Konsole"**
4. Une console web s'ouvrira directement dans le navigateur
5. Connectez-vous avec `root` et le mot de passe

### 3. Configuration initiale du VPS

Une fois connecté au VPS :

```bash
# Si vous êtes connecté via SSH
ssh root@<IP_VPS>
# ou avec clé SSH
ssh -i ~/.ssh/votre_cle root@<IP_VPS>
```

Exécutez le script de configuration :

```bash
# Si vous avez déjà cloné le projet
cd /opt/gsa-manager
sudo bash scripts/prod/setup_vps.sh

# Sinon, installez d'abord Docker manuellement :
# (voir section "Transférer le projet" ci-dessous)
```

Ce script va :
- Mettre à jour le système
- Installer Docker et Docker Compose
- Configurer le firewall (ports 22, 80, 443)
- Créer un utilisateur non-root `gsa`
- Configurer SSH (désactiver root login)
- Configurer les mises à jour automatiques

### 3. Créer l'utilisateur de déploiement

Le script crée automatiquement l'utilisateur `gsa`. Connectez-vous avec cet utilisateur :

```bash
su - gsa
```

---

## Obtenir un nom de domaine

### 1. Choisir un registrar

**Registrars recommandés :**

| Registrar | Prix .com | Support | Recommandé pour |
|-----------|-----------|---------|-----------------|
| **OVH** | ~12€/an | Français | Entreprises françaises |
| **Gandi** | ~12€/an | Français | Développeurs |
| **Namecheap** | ~10€/an | Anglais | Débutants |
| **Cloudflare** | ~8€/an | Anglais | Sécurité |
| **Google Domains** | ~12€/an | Anglais | Simplicité |

**Recommandation** : OVH ou Gandi si vous êtes en France.

### 2. Acheter le domaine

1. Allez sur le site du registrar choisi
2. Créez un compte
3. Recherchez votre domaine (ex: `gsa-manager.com`)
4. Ajoutez-le au panier et complétez l'achat
5. **Prix typique** : 8-15€/an selon l'extension

### 3. Choisir votre nom de domaine

**Exemples pour GSA Manager :**
- `gsa-manager.com` ✅
- `gsa-manager.fr` ✅
- `gsa.fr` ✅ (si disponible)
- `app-gsa.com` ✅

**Conseil** : Choisissez un nom court, facile à retenir et professionnel.

---

## Configurer le DNS

Une fois votre domaine acheté, configurez-le pour pointer vers l'IP de votre VPS.

### 1. Trouver l'IP de votre VPS

Dans le panneau Hetzner Cloud, notez l'**IPv4** de votre serveur (ex: `123.45.67.89`).

### 2. Configurer les enregistrements DNS

Connectez-vous au panneau de gestion DNS de votre registrar et ajoutez :

#### Enregistrement A (principal)

- **Type** : A
- **Nom/Host** : `@` (ou laissez vide, selon le registrar)
- **Valeur/IP** : L'IP de votre VPS (ex: `123.45.67.89`)
- **TTL** : 3600 (ou valeur par défaut)

#### Enregistrement A pour www (optionnel mais recommandé)

- **Type** : A
- **Nom/Host** : `www`
- **Valeur/IP** : L'IP de votre VPS (même IP)
- **TTL** : 3600

### 3. Exemples selon le registrar

#### OVH
1. Connectez-vous à https://www.ovh.com/manager
2. Allez dans "Web Cloud" > "Domaines"
3. Cliquez sur votre domaine
4. Onglet "Zone DNS"
5. Cliquez sur "Ajouter une entrée"
6. Type: **A**, Sous-domaine: `@`, Cible: `123.45.67.89`
7. Répétez pour `www`

#### Namecheap
1. Connectez-vous à https://www.namecheap.com
2. Allez dans "Domain List"
3. Cliquez sur "Manage" à côté de votre domaine
4. Onglet "Advanced DNS"
5. Cliquez sur "Add New Record"
6. Type: **A Record**, Host: `@`, Value: `123.45.67.89`
7. Répétez pour `www`

#### Gandi
1. Connectez-vous à https://www.gandi.net
2. Allez dans "Domaines"
3. Cliquez sur votre domaine
4. Onglet "Enregistrements DNS"
5. Cliquez sur "Ajouter un enregistrement"
6. Type: **A**, Nom: `@`, Valeur: `123.45.67.89`
7. Répétez pour `www`

### 4. Vérifier la propagation DNS

**Important** : Attendez que la propagation DNS soit complète (15-30 minutes) avant de continuer.

Vérifiez avec ces commandes :

```bash
dig votre-domaine.com
# ou
nslookup votre-domaine.com
# ou
host votre-domaine.com
```

Vous devriez voir l'IP de votre VPS dans la réponse.

**Vérification en ligne :**
- https://dnschecker.org - Vérifie la propagation mondiale
- https://www.whatsmydns.net - Vérification rapide

---

## Transférer le projet sur le VPS

Vous devez transférer votre projet de votre PC vers le VPS. Plusieurs méthodes possibles :

### Méthode 1 : Git (Recommandée)

**Si vous avez un repository Git (GitHub, GitLab, etc.) :**

#### Sur votre PC

```bash
cd C:\Users\fodou\OneDrive\Documents\Entreprise_GSA

# Initialiser Git (si pas déjà fait)
git init
git add .
git commit -m "Production ready"

# Créer un repository sur GitHub/GitLab et pousser
git remote add origin https://github.com/votre-username/gsa-manager.git
git push -u origin main
```

#### Sur le VPS

```bash
cd /opt
git clone https://github.com/votre-username/gsa-manager.git
cd gsa-manager
```

**Si le repository est privé**, utilisez un Personal Access Token ou configurez SSH.

### Méthode 2 : WinSCP (Simple pour Windows)

1. **Télécharger WinSCP** : https://winscp.net
2. **Installer et lancer WinSCP**
3. **Créer une connexion** :
   - Host name : IP de votre VPS
   - Username : `root`
   - Password : Votre mot de passe
   - Protocol : SFTP
4. **Se connecter**
5. **Côté gauche** : Votre PC (`C:\Users\fodou\OneDrive\Documents\Entreprise_GSA`)
6. **Côté droit** : VPS (`/opt`)
7. **Créer le dossier** `/opt/gsa-manager` sur le VPS
8. **Glisser-déposer** tous les fichiers du PC vers `/opt/gsa-manager`

**Important** : Ne transférez PAS ces dossiers :
- `node_modules/`
- `__pycache__/`
- `.env`
- `media/`
- `staticfiles/`

### Méthode 3 : PowerShell + SCP

```powershell
# Dans PowerShell, depuis votre dossier projet
cd C:\Users\fodou\OneDrive\Documents\Entreprise_GSA

# Créer une archive
Compress-Archive -Path * -DestinationPath gsa-manager.zip -Force

# Transférer (remplacez <IP_VPS> par votre IP)
scp gsa-manager.zip root@<IP_VPS>:/opt/

# Se connecter au VPS
ssh root@<IP_VPS>

# Sur le VPS, décompresser
cd /opt
unzip gsa-manager.zip -d gsa-manager
rm gsa-manager.zip
cd gsa-manager
```

### Vérification après transfert

```bash
# Sur le VPS
cd /opt/gsa-manager
ls -la

# Vous devriez voir :
# - backend/
# - frontend/
# - docker/
# - scripts/
# - DEPLOYMENT.md
# etc.
```

---

## Certificats SSL automatiques avec Caddy

### Comment ça fonctionne ?

**Caddy obtient automatiquement les certificats SSL** via Let's Encrypt, gratuitement et sans configuration manuelle !

#### Processus automatique :

1. **Au démarrage de Caddy** :
   - Caddy lit le `Caddyfile` et voit votre domaine
   - Il vérifie que le DNS pointe vers le VPS
   - Il contacte Let's Encrypt pour obtenir un certificat

2. **Validation Let's Encrypt** :
   - Let's Encrypt vérifie que vous contrôlez le domaine (via DNS)
   - Si la validation réussit, le certificat est émis automatiquement
   - Le certificat est stocké dans le volume Docker `caddy_data`

3. **Renouvellement automatique** :
   - Caddy renouvelle automatiquement les certificats avant expiration (tous les 60 jours)
   - Aucune intervention manuelle nécessaire

**Temps d'obtention** : Généralement 30 secondes à 2 minutes lors du premier démarrage.

### Configuration requise

Pour que Caddy obtienne automatiquement le certificat SSL :

1. ✅ **Avoir un nom de domaine valide**
2. ✅ **Configurer le DNS pour pointer vers le VPS** (fait précédemment)
3. ✅ **Modifier le Caddyfile** avec votre vrai domaine
4. ✅ **Les ports 80 et 443 doivent être ouverts** (fait par `setup_vps.sh`)

### Modifier le Caddyfile

```bash
cd /opt/gsa-manager/docker/prod
nano Caddyfile
```

**Remplacez** `votre-domaine.com` par votre vrai domaine :

```caddyfile
# Avant
votre-domaine.com {

# Après (exemple)
gsa-manager.com {
```

**Important** : Utilisez exactement le même nom de domaine que celui configuré dans le DNS et le `.env`.

### Vérifier le certificat SSL

Après le démarrage de Caddy :

1. **Dans le navigateur** : Allez sur `https://votre-domaine.com` - vous devriez voir un cadenas vert 🔒
2. **En ligne de commande** :
   ```bash
   curl -vI https://votre-domaine.com
   ```
   Vous devriez voir : `SSL certificate verify ok`

### Où sont stockés les certificats ?

Les certificats sont stockés dans le volume Docker `caddy_data` - **vous n'avez pas besoin d'y toucher**, Caddy gère tout automatiquement.

---

## Configuration variables d'environnement

### 1. Créer le fichier .env

```bash
cd /opt/gsa-manager/docker/prod
cp .env.example .env
nano .env
```

### 2. Générer les secrets

Générez un `SECRET_KEY` Django :

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Générez un `JWT_SECRET_KEY` :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 3. Remplir le fichier .env

Remplissez toutes les variables :

```env
# Django
SECRET_KEY=<votre-secret-key-généré>
JWT_SECRET_KEY=<votre-jwt-secret-key-généré>
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com
CORS_ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# Database
POSTGRES_DB=gsa_db
POSTGRES_USER=gsa_user
POSTGRES_PASSWORD=<mot-de-passe-fort>
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0

# Super Admin
SUPER_ADMIN_EMAIL=admin@votre-domaine.com
SUPER_ADMIN_PASSWORD=<mot-de-passe-fort>

# Domain
DOMAIN=votre-domaine.com
VITE_API_URL=https://votre-domaine.com/api
```

**Important** : Utilisez des mots de passe forts et uniques !

### 4. Configurer le Caddyfile

```bash
nano Caddyfile
```

Remplacez toutes les occurrences de `votre-domaine.com` par votre vrai domaine.

---

## Déploiement

### 1. Rendre les scripts exécutables

```bash
cd /opt/gsa-manager
chmod +x scripts/prod/*.sh
chmod +x backend/entrypoint.prod.sh
```

### 2. Exécuter le script de déploiement

```bash
cd docker/prod
bash ../../scripts/prod/deploy.sh
```

Ce script va :
- Vérifier les prérequis
- Construire les images Docker
- Démarrer tous les services
- Exécuter les migrations
- Collecter les fichiers statiques
- Vérifier la santé des services

### 3. Vérifier les logs

Si tout s'est bien passé, vous devriez voir :

```
✓ Backend est en ligne
✓ Frontend est en ligne
```

Pour consulter les logs en temps réel :

```bash
bash ../../scripts/prod/logs.sh
```

Pour les logs d'un service spécifique :

```bash
bash ../../scripts/prod/logs.sh backend
bash ../../scripts/prod/logs.sh caddy
```

**Surveillez les logs Caddy** pour voir l'obtention du certificat SSL :

```bash
docker compose logs -f caddy
```

Vous devriez voir : `"certificate obtained","identifier":"votre-domaine.com"`

---

## Vérification

### 1. Vérifier les services

```bash
cd /opt/gsa-manager/docker/prod
docker compose ps
```

Tous les services doivent être "Up" (healthy).

### 2. Tester l'application

1. Ouvrez votre navigateur et allez sur `https://votre-domaine.com`
2. Vous devriez voir la page de connexion
3. Le cadenas vert 🔒 doit être présent
4. Connectez-vous avec les identifiants du super admin

### 3. Vérifier les endpoints API

```bash
curl https://votre-domaine.com/api/health/
```

Devrait retourner : `{"status":"ok"}`

### 4. Vérifier SSL

- Le cadenas vert doit apparaître dans le navigateur
- L'URL doit commencer par `https://`
- Cliquez sur le cadenas pour voir les détails du certificat (émis par Let's Encrypt)

### 5. Vérifier la génération PDF

1. Connectez-vous à l'application
2. Créez une facture de test
3. Validez-la
4. Téléchargez le PDF
5. Vérifiez que le PDF est généré correctement

---

## Maintenance

### Backups automatiques

Configurez un cron job pour les backups quotidiens :

```bash
crontab -e
```

Ajoutez cette ligne (backup à 2h du matin) :

```
0 2 * * * /opt/gsa-manager/scripts/prod/backup.sh >> /var/log/gsa-backup.log 2>&1
```

### Mise à jour de l'application

**Avec Git :**
```bash
cd /opt/gsa-manager
git pull
cd docker/prod
bash ../../scripts/prod/update.sh
```

**Sans Git :**
Transférez les nouveaux fichiers (voir section "Transférer le projet"), puis :

```bash
cd /opt/gsa-manager/docker/prod
bash ../../scripts/prod/update.sh
```

### Vérification de santé

```bash
bash /opt/gsa-manager/scripts/prod/health_check.sh
```

### Consultation des logs

```bash
# Tous les services
bash /opt/gsa-manager/scripts/prod/logs.sh

# Service spécifique
bash /opt/gsa-manager/scripts/prod/logs.sh backend
```

### Arrêter les services

```bash
cd /opt/gsa-manager/docker/prod
docker compose down
```

### Redémarrer les services

```bash
cd /opt/gsa-manager/docker/prod
docker compose restart
```

---

## Dépannage

### Problème : Services ne démarrent pas

1. Vérifiez les logs :
   ```bash
   docker compose logs
   ```

2. Vérifiez le fichier `.env` :
   ```bash
   cat .env
   ```

3. Vérifiez l'espace disque :
   ```bash
   df -h
   ```

### Problème : Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est en cours d'exécution :
   ```bash
   docker compose ps postgres
   ```

2. Vérifiez les logs PostgreSQL :
   ```bash
   docker compose logs postgres
   ```

3. Vérifiez les credentials dans `.env`

### Problème : Certificat SSL non généré

1. **Vérifier le DNS** :
   ```bash
   dig votre-domaine.com
   # Doit retourner l'IP de votre VPS
   ```

2. **Vérifier les ports** :
   ```bash
   sudo ufw status
   # Les ports 80 et 443 doivent être ouverts
   ```

3. **Consulter les logs Caddy** :
   ```bash
   docker compose logs caddy
   ```
   Cherchez les erreurs liées à "ACME" ou "certificate"

4. **Erreurs courantes** :
   - **DNS pas propagé** : Attendez plus longtemps (15-30 min)
   - **Port 80 bloqué** : Vérifiez le firewall
   - **Domaine incorrect** : Vérifiez le Caddyfile
   - **Rate limit Let's Encrypt** : Attendez 1 heure (limite de 5 certificats par semaine)

### Problème : Frontend ne charge pas

1. Vérifiez que le frontend est en cours d'exécution :
   ```bash
   docker compose ps frontend
   ```

2. Vérifiez les logs :
   ```bash
   docker compose logs frontend
   ```

3. Vérifiez que `VITE_API_URL` est correct dans `.env`

### Problème : PDFs ne se génèrent pas

1. Vérifiez que WeasyPrint est installé :
   ```bash
   docker compose exec backend python -c "import weasyprint; print('OK')"
   ```

2. Vérifiez les permissions du dossier media :
   ```bash
   docker compose exec backend ls -la /app/media
   ```

---

## Rollback

En cas de problème après une mise à jour, vous pouvez restaurer depuis un backup :

### 1. Lister les backups disponibles

```bash
ls -lh /var/backups/gsa/
```

### 2. Restaurer depuis un backup

```bash
bash /opt/gsa-manager/scripts/prod/restore.sh /var/backups/gsa/gsa_backup_YYYYMMDD_HHMMSS_complete.tar.gz
```

**Attention** : Cette opération va écraser les données actuelles !

### 3. Vérifier après restauration

```bash
bash /opt/gsa-manager/scripts/prod/health_check.sh
```

---

## Sécurité

- Ne commitez jamais le fichier `.env`
- Changez les mots de passe par défaut
- Activez les mises à jour automatiques
- Surveillez les logs régulièrement
- Faites des backups réguliers
- Gardez Docker et le système à jour

---

## Checklist de déploiement

Avant de mettre en production, vérifiez :

- [ ] VPS Hetzner créé et accessible
- [ ] Domaine acheté et DNS configuré
- [ ] Propagation DNS vérifiée (`dig votre-domaine.com`)
- [ ] Projet transféré sur le VPS
- [ ] Fichier `.env` créé et rempli
- [ ] `Caddyfile` modifié avec votre domaine
- [ ] Scripts rendus exécutables
- [ ] Services démarrés et fonctionnels
- [ ] Certificat SSL obtenu (cadenas vert dans le navigateur)
- [ ] Application accessible via HTTPS
- [ ] Backups automatiques configurés

---

## Support

En cas de problème non résolu :

1. Consultez les logs : `bash scripts/prod/logs.sh`
2. Vérifiez la santé : `bash scripts/prod/health_check.sh`
3. Consultez la documentation Django et Docker
4. Contactez le support technique
