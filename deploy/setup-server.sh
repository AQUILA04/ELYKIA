#!/usr/bin/env bash
# =============================================================================
# setup-server.sh — One-time server setup for Elykia (Traefik + test + prod)
# =============================================================================
# Run this script ONCE on a fresh VPS before the first deployment.
# It creates the required directories, the shared Docker network, and starts
# the Traefik reverse proxy.
#
# Usage:
#   chmod +x setup-server.sh
#   sudo ./setup-server.sh
#
# After running this script:
#   1. Configure your .env files in /opt/elykia/test/ and /opt/elykia/prod/
#   2. Deploy the stacks via the CD pipeline or manually with deploy.sh
# =============================================================================
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Elykia Server Setup ==="
echo ""

# --- 1. Create directory structure ---
echo "[1/5] Creating directory structure..."
mkdir -p /opt/elykia/traefik
mkdir -p /opt/elykia/test/logs
mkdir -p /opt/elykia/prod/logs

# acme.json must exist and be chmod 600 for Traefik to accept it
touch /opt/elykia/traefik/acme.json
chmod 600 /opt/elykia/traefik/acme.json

echo "      Directories created."

# --- 2. Create shared Docker network ---
echo "[2/5] Creating shared Docker network 'traefik-public'..."
if docker network inspect traefik-public > /dev/null 2>&1; then
  echo "      Network 'traefik-public' already exists, skipping."
else
  docker network create traefik-public
  echo "      Network 'traefik-public' created."
fi

# --- 3. Generate Traefik dashboard credentials ---
echo "[3/5] Generating Traefik dashboard credentials..."
TRAEFIK_ENV_FILE="/opt/elykia/traefik/.env"

if [[ -f "$TRAEFIK_ENV_FILE" ]] && grep -q "TRAEFIK_DASHBOARD_AUTH" "$TRAEFIK_ENV_FILE" 2>/dev/null; then
  echo "      Traefik .env already exists, skipping credential generation."
else
  # Install htpasswd if not present
  if ! command -v htpasswd &> /dev/null; then
    apt-get install -y apache2-utils -q
  fi

  echo ""
  echo "      Enter a username for the Traefik dashboard (default: admin):"
  read -r TRAEFIK_USER
  TRAEFIK_USER="${TRAEFIK_USER:-admin}"

  echo "      Enter a password for the Traefik dashboard:"
  read -rs TRAEFIK_PASSWORD
  echo ""

  # Generate bcrypt hash and escape $ for docker-compose
  HASHED=$(htpasswd -nbB "$TRAEFIK_USER" "$TRAEFIK_PASSWORD" | sed -e 's/\$/\$\$/g')

  mkdir -p "$(dirname "$TRAEFIK_ENV_FILE")"
  echo "TRAEFIK_DASHBOARD_AUTH=${HASHED}" > "$TRAEFIK_ENV_FILE"
  chmod 600 "$TRAEFIK_ENV_FILE"
  echo "      Credentials saved to $TRAEFIK_ENV_FILE"
fi

# --- 4. Create .env templates for test and prod stacks ---
echo "[4/5] Creating .env templates if they don't exist..."

TEST_ENV="/opt/elykia/test/.env"
if [[ ! -f "$TEST_ENV" ]]; then
  cat > "$TEST_ENV" << 'EOF'
# =============================================================================
# Elykia TEST stack — /opt/elykia/test/.env
# =============================================================================
POSTGRES_USER=elykia_test
POSTGRES_PASSWORD=change_me_test_password
POSTGRES_DB=elykia_test_db

SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
LOG_PATH=/opt/elykia/test/logs

API_URL=https://elykia-test.amenouveve-yaveh.com/api
GA_MEASUREMENT_ID=

# Populated automatically by deploy.sh — do not edit manually
FRONTEND_IMAGE=
BACKEND_IMAGE=
EOF
  chmod 600 "$TEST_ENV"
  echo "      Created $TEST_ENV — EDIT passwords before deploying!"
else
  echo "      $TEST_ENV already exists, skipping."
fi

PROD_ENV="/opt/elykia/prod/.env"
if [[ ! -f "$PROD_ENV" ]]; then
  cat > "$PROD_ENV" << 'EOF'
# =============================================================================
# Elykia PROD stack — /opt/elykia/prod/.env
# =============================================================================
POSTGRES_USER=elykia_prod
POSTGRES_PASSWORD=change_me_strong_prod_password
POSTGRES_DB=elykia_prod_db

SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
LOG_PATH=/opt/elykia/prod/logs

API_URL=https://elykia.amenouveve-yaveh.com/api
GA_MEASUREMENT_ID=

# Populated automatically by deploy.sh — do not edit manually
FRONTEND_IMAGE=
BACKEND_IMAGE=
EOF
  chmod 600 "$PROD_ENV"
  echo "      Created $PROD_ENV — EDIT passwords before deploying!"
else
  echo "      $PROD_ENV already exists, skipping."
fi

# --- 5. Start Traefik ---
echo "[5/5] Starting Traefik..."
cd "$DEPLOY_DIR"

if docker compose -f docker-compose.traefik.yml --env-file /opt/elykia/traefik/.env ps --quiet traefik 2>/dev/null | grep -q .; then
  echo "      Traefik is already running."
else
  docker compose -f docker-compose.traefik.yml --env-file /opt/elykia/traefik/.env up -d
  echo "      Traefik started."
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/elykia/test/.env  — set POSTGRES_PASSWORD and other secrets"
echo "  2. Edit /opt/elykia/prod/.env  — set POSTGRES_PASSWORD and other secrets"
echo "  3. Ensure DNS records point to this server:"
echo "       A  elykia-test  →  $(curl -s ifconfig.me 2>/dev/null || echo '<server-ip>')"
echo "       A  elykia       →  $(curl -s ifconfig.me 2>/dev/null || echo '<server-ip>')"
echo "  4. Deploy stacks via the CD pipeline or manually:"
echo "       cd $DEPLOY_DIR"
echo "       ./deploy.sh test  <frontend-image> <backend-image>"
echo "       ./deploy.sh prod  <frontend-image> <backend-image>"
echo ""
