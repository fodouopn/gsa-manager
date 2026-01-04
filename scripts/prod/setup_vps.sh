#!/bin/bash
set -e

# Script de configuration initiale du VPS pour GSA Manager
# Usage: ./scripts/prod/setup_vps.sh
# À exécuter en tant que root ou avec sudo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=========================================="
echo "GSA Manager - Configuration VPS"
echo "==========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Erreur: Ce script doit être exécuté en tant que root ou avec sudo${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}Mise à jour du système...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}Installation des packages requis...${NC}"
apt-get install -y \
    curl \
    git \
    wget \
    vim \
    ufw \
    unattended-upgrades \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installation de Docker...${NC}"
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker installé${NC}"
else
    echo -e "${GREEN}✓ Docker déjà installé${NC}"
fi

# Install Docker Compose (standalone if not using plugin)
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installation de Docker Compose...${NC}"
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installé${NC}"
else
    echo -e "${GREEN}✓ Docker Compose déjà installé${NC}"
fi

# Configure firewall
echo -e "${YELLOW}Configuration du firewall (UFW)...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
echo -e "${GREEN}✓ Firewall configuré${NC}"

# Create non-root user (if not exists)
if ! id "gsa" &>/dev/null; then
    echo -e "${YELLOW}Création de l'utilisateur gsa...${NC}"
    useradd -m -s /bin/bash gsa
    usermod -aG docker gsa
    usermod -aG sudo gsa
    echo -e "${GREEN}✓ Utilisateur gsa créé${NC}"
    echo -e "${YELLOW}Configurez le mot de passe pour l'utilisateur gsa:${NC}"
    passwd gsa
else
    echo -e "${GREEN}✓ Utilisateur gsa existe déjà${NC}"
fi

# Configure SSH (disable root login)
echo -e "${YELLOW}Configuration SSH...${NC}"
if ! grep -q "^PermitRootLogin no" /etc/ssh/sshd_config 2>/dev/null; then
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    systemctl restart sshd
    echo -e "${GREEN}✓ SSH configuré (root login désactivé)${NC}"
else
    echo -e "${GREEN}✓ SSH déjà configuré${NC}"
fi

# Configure automatic security updates
echo -e "${YELLOW}Configuration des mises à jour automatiques...${NC}"
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}:\${distro_codename}-updates";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades

echo -e "${GREEN}✓ Mises à jour automatiques configurées${NC}"

# Create backup directory
BACKUP_DIR="/var/backups/gsa"
mkdir -p "$BACKUP_DIR"
chown gsa:gsa "$BACKUP_DIR"
echo -e "${GREEN}✓ Répertoire de backup créé: ${BACKUP_DIR}${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Configuration VPS terminée avec succès!"
echo "==========================================${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Connectez-vous en tant qu'utilisateur 'gsa'"
echo "2. Clonez le repository GSA Manager"
echo "3. Configurez le fichier .env dans docker/prod/"
echo "4. Exécutez scripts/prod/deploy.sh"
echo ""

