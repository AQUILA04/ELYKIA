#!/usr/bin/env bash
# Per-boot startup for the ELYKIA dev environment: bring up PostgreSQL.
# The backend and frontend run as tmux-backed terminals (see environment.json).
set -euo pipefail

DB_NAME="oec"
DB_USER="oec"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_FILE="$REPO_ROOT/.cursor/local-secrets.env"
if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Fichier absent : $SECRETS_FILE. Lancer .cursor/install.sh d'abord." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$SECRETS_FILE"
set +a
DB_PASSWORD="${SPRING_DATASOURCE_PASSWORD:?SPRING_DATASOURCE_PASSWORD manquant}"

PG_CLUSTER_VERSION="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
echo "==> Starting PostgreSQL cluster ${PG_CLUSTER_VERSION}/main"
sudo pg_ctlcluster "${PG_CLUSTER_VERSION}" main start || true
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

# Cheap, idempotent safety net in case a fresh volume lacks the table.
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c \
  "CREATE TABLE IF NOT EXISTS shedlock(name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMP NOT NULL, locked_at TIMESTAMP NOT NULL, locked_by VARCHAR(255) NOT NULL);" || true

echo "==> PostgreSQL is ready"
