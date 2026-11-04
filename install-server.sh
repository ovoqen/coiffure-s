#!/bin/bash
# Préparation d'un serveur Ubuntu (Infomaniak ou autre) : Docker, pare-feu, protection contre les tentatives de connexion, mises à jour automatiques.
# Usage (une seule fois, en tant qu'administrateur du serveur) :  sudo bash deploy/install-server.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get -y upgrade
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades openssl
curl -fsSL https://get.docker.com | sh                   # Docker + Compose (script officiel docker.com)
# Pare-feu : seuls SSH (22), HTTP (80) et HTTPS (443) sont ouverts. La base de données n'est JAMAIS exposée.
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban                          # bannit les adresses qui essaient de deviner l'accès SSH
dpkg-reconfigure -f noninteractive unattended-upgrades   # correctifs de sécurité automatiques
USER_NAME="${SUDO_USER:-ubuntu}"; usermod -aG docker "$USER_NAME" || true
echo "Serveur prêt. Déconnectez-vous puis reconnectez-vous (pour activer le groupe docker)."
