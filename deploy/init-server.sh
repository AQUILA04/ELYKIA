#!/usr/bin/env bash
# =============================================================================
# init-server.sh — Fully Automated Server Initialization
# =============================================================================
# This script completely automates the initial server configuration, including:
# 1. System update and Docker installation
# 2. 'deploy' user creation and SSH key setup
# 3. Code retrieval
# 4. Environment setup (Traefik, Test, Prod) with automatic password injection
#
# Usage:
#   chmod +x init-server.sh
#   sudo ./init-server.sh \
#       --ssh-key "ssh-rsa AAAAB3NzaC... your@email.com" \
#       --db-test "super_secret_test" \
#       --db-prod "super_secret_prod" \
#       --traefik-user "admin" \
#       --traefik-password "admin_secret" \
#       --pgadmin-password "pgadmin_secret" \
#       --sftp-password "sftp_secret"
# =============================================================================
set -euo pipefail

# Parse arguments
SSH_KEY=""
DB_TEST=""
DB_PROD=""
TRAEFIK_USER=""
TRAEFIK_PASSWORD=""
PGADMIN_PASSWORD=""
SFTP_PASSWORD=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --ssh-key) SSH_KEY="$2"; shift ;;
        --db-test) DB_TEST="$2"; shift ;;
        --db-prod) DB_PROD="$2"; shift ;;
        --traefik-user) TRAEFIK_USER="$2"; shift ;;
        --traefik-password) TRAEFIK_PASSWORD="$2"; shift ;;
        --pgadmin-password) PGADMIN_PASSWORD="$2"; shift ;;
        --sftp-password) SFTP_PASSWORD="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Validate required arguments
if [[ -z "$SSH_KEY" || -z "$DB_TEST" || -z "$DB_PROD" || -z "$TRAEFIK_USER" || -z "$TRAEFIK_PASSWORD" || -z "$PGADMIN_PASSWORD" || -z "$SFTP_PASSWORD" ]]; then
    echo "Error: Missing arguments."
    echo "Usage: $0 --ssh-key \"...\" --db-test \"...\" --db-prod \"...\" --traefik-user \"...\" --traefik-password \"...\" --pgadmin-password \"...\" --sftp-password \"...\""
    exit 1
fi

echo "=== 1. Updating System & Installing Docker ==="
apt-get update -y
# Install Docker if not present
if ! command -v docker &> /dev/null; then
    apt-get install -y ca-certificates curl gnupg apache2-utils git
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker is already installed."
    # Ensure git and apache2-utils are installed anyway
    apt-get install -y git apache2-utils
fi

echo "=== 2. Creating 'deploy' user and SSH access ==="
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists."
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    echo "$SSH_KEY" > /home/deploy/.ssh/authorized_keys
    chmod 600 /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    echo "User 'deploy' created."
fi

echo "=== 3. Setting up /opt/elykia workspace ==="
mkdir -p /opt/elykia
chown deploy:deploy /opt/elykia

# Download the deployment files via git clone
if [[ ! -d "/opt/elykia/deploy" ]]; then
    echo "Cloning ELYKIA repository to extract deploy scripts..."
    git clone https://github.com/AQUILA04/ELYKIA.git /opt/elykia_src
    cp -r /opt/elykia_src/deploy /opt/elykia/deploy
    rm -rf /opt/elykia_src
    chown -R deploy:deploy /opt/elykia/deploy
else
    echo "/opt/elykia/deploy already exists, skipping clone."
fi

echo "=== 4. Executing setup-server.sh with injected variables ==="
cd /opt/elykia/deploy
chmod +x setup-server.sh

# Export variables so setup-server.sh can read them and run non-interactively
export TRAEFIK_USER="$TRAEFIK_USER"
export TRAEFIK_PASSWORD="$TRAEFIK_PASSWORD"
export DB_PASSWORD_TEST="$DB_TEST"
export DB_PASSWORD_PROD="$DB_PROD"
export PGADMIN_PASSWORD="$PGADMIN_PASSWORD"

# Execute setup
./setup-server.sh

echo "=== 5. Setting Logs Permissions ==="
chmod o+w /opt/elykia/test/logs || true
chmod o+w /opt/elykia/prod/logs || true

echo "=== 6. Setting up restricted SFTP ==="
cd /opt/elykia/deploy
chmod +x setup-sftp.sh
export SFTP_PASSWORD="$SFTP_PASSWORD"
./setup-sftp.sh

echo ""
echo "=== INITIALIZATION COMPLETED SUCCESSFULLY ==="
echo "The server is ready for deployment."
echo "You can now push code via GitHub Actions or run deploy.sh manually:"
echo ""
echo "cd /opt/elykia/deploy"
echo "./deploy.sh test ghcr.io/aquila04/elykia-frontend:latest ghcr.io/aquila04/elykia-backend:latest"
echo "./deploy.sh prod ghcr.io/aquila04/elykia-frontend:latest ghcr.io/aquila04/elykia-backend:latest"
echo "docker compose -f docker-compose.tools.yml --project-name elykia-tools --env-file /opt/elykia/tools/.env up -d"
