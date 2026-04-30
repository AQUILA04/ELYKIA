#!/usr/bin/env bash
set -euo pipefail

# bootstrap_server.sh
# Automatise l'installation des dépendances et la préparation du serveur pour le CD
# Usage:
#  sudo ./bootstrap_server.sh --deploy-path /opt/elykia --repo https://github.com/OWNER/ELYKIA.git --branch main --user ubuntu

DEPS=(git curl apt-transport-https ca-certificates gnupg lsb-release ufw)

print_help() {
  cat <<EOF
Usage: sudo $0 [--deploy-path PATH] [--repo GIT_URL] [--branch BRANCH] [--user SSH_USER]

Options:
  --deploy-path PATH   Path where repository/deploy folder will be placed (default: /opt/elykia)
  --repo GIT_URL       Optional: git repo to clone if deploy folder is not already present
  --branch BRANCH      Branch to checkout when cloning (default: main)
  --user SSH_USER      Local user to add to docker group and for crontab (default: ubuntu)
  -h, --help           Show this help
EOF
}

DEPLOY_PATH="/opt/elykia"
REPO_URL=""
BRANCH="main"
SSH_USER="ubuntu"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-path) DEPLOY_PATH="$2"; shift 2;;
    --repo) REPO_URL="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --user) SSH_USER="$2"; shift 2;;
    -h|--help) print_help; exit 0;;
    *) echo "Unknown arg: $1"; print_help; exit 1;;
  esac
done

if [[ $(id -u) -ne 0 ]]; then
  echo "This script must be run as root (sudo)" >&2
  exit 1
fi

echo "Deploy path: $DEPLOY_PATH"
echo "Repo: ${REPO_URL:-(none)} branch: $BRANCH"
echo "User: $SSH_USER"

echo "1/10 - Installing OS packages..."
apt-get update -y
apt-get install -y "${DEPS[@]}" || true

echo "2/10 - Installing Docker Engine and docker compose plugin..."
# Install Docker official repo
if ! command -v docker >/dev/null 2>&1; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
  echo "Docker already installed"
fi

echo "3/10 - Add user '$SSH_USER' to docker group (if exists)"
if id "$SSH_USER" >/dev/null 2>&1; then
  usermod -aG docker "$SSH_USER" || true
else
  echo "User $SSH_USER not found. Skipping usermod."
fi

echo "4/10 - Create deploy folder and fetch repository if needed"
if [[ -d "$DEPLOY_PATH" && -n "$(ls -A "$DEPLOY_PATH" 2>/dev/null)" ]]; then
  echo "Deploy path exists and is not empty: $DEPLOY_PATH"
  echo "Pulling latest if it's a git repo..."
  if [[ -d "$DEPLOY_PATH/.git" ]]; then
    git -C "$DEPLOY_PATH" fetch --all --prune || true
    git -C "$DEPLOY_PATH" checkout "$BRANCH" || true
    git -C "$DEPLOY_PATH" pull || true
  fi
else
  mkdir -p "$DEPLOY_PATH"
  if [[ -n "$REPO_URL" ]]; then
    echo "Cloning $REPO_URL -> $DEPLOY_PATH"
    git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_PATH"
  else
    echo "No repo provided and deploy folder empty. Creating minimal layout."
    mkdir -p "$DEPLOY_PATH/deploy"
  fi
fi

echo "5/10 - Ensure deploy scripts are executable"
if [[ -d "$DEPLOY_PATH/deploy" ]]; then
  chmod +x "$DEPLOY_PATH"/deploy/*.sh || true
fi

echo "6/10 - Install nginx and certbot"
apt-get install -y nginx certbot python3-certbot-nginx || true

# If the repo contains an nginx template, install it
if [[ -f "$DEPLOY_PATH/deploy/nginx/elykia.conf" ]]; then
  echo "Installing nginx config from repo"
  cp "$DEPLOY_PATH/deploy/nginx/elykia.conf" /etc/nginx/sites-available/elykia.conf
  ln -sf /etc/nginx/sites-available/elykia.conf /etc/nginx/sites-enabled/elykia.conf
  nginx -t && systemctl reload nginx || true
fi

echo "7/10 - Configure UFW (allow SSH, HTTP, HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 'Nginx Full' || true
  ufw --force enable || true
fi

echo "8/10 - Create systemd service to start docker compose on boot"
SERVICE_FILE="/etc/systemd/system/elykia.service"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=ELYKIA Docker Compose service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_PATH/deploy
ExecStart=/usr/bin/docker compose -f $DEPLOY_PATH/deploy/docker-compose.prod.yml pull || true
ExecStart=/usr/bin/docker compose -f $DEPLOY_PATH/deploy/docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f $DEPLOY_PATH/deploy/docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload || true
systemctl enable elykia.service || true

echo "9/10 - Setup cron job for DB backups (08:00 and 19:00 Mon-Sat)"
CRON_CMD="0 8,19 * * 1-6 cd $DEPLOY_PATH/deploy && $DEPLOY_PATH/deploy/db_backup.sh prod >> /var/log/elykia_db_backup.log 2>&1"
# add to specified user crontab if not present
crontab -u "$SSH_USER" -l 2>/dev/null | grep -F "$DEPLOY_PATH/deploy/db_backup.sh" >/dev/null 2>&1 || (
  (crontab -u "$SSH_USER" -l 2>/dev/null; echo "$CRON_CMD") | crontab -u "$SSH_USER" -
)

echo "10/10 - Final notes"
echo "Bootstrap completed."
echo "- Deploy folder: $DEPLOY_PATH"
echo "- Ensure you edit $DEPLOY_PATH/deploy/.env with production variables (DB password, SPRING_DATASOURCE_*, GHCR credentials if needed)."
echo "- To obtain TLS cert for your domain run: sudo certbot --nginx -d your.domain.tld"
echo "- To perform an initial deploy run (as deploy user): cd $DEPLOY_PATH/deploy && ./deploy.sh prod <frontend_image> <backend_image>"

exit 0

