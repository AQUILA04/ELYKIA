#!/usr/bin/env bash
# Per-boot startup for the ELYKIA dev environment: bring up PostgreSQL.
# The backend and frontend run as tmux-backed terminals (see environment.json).
set -euo pipefail

DB_NAME="oec"
DB_USER="oec"
DB_PASSWORD="APP2024"

PG_CLUSTER_VERSION="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
echo "==> Starting PostgreSQL cluster ${PG_CLUSTER_VERSION}/main"
sudo pg_ctlcluster "${PG_CLUSTER_VERSION}" main start || true
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

# Cheap, idempotent safety net in case a fresh volume lacks the table.
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c \
  "CREATE TABLE IF NOT EXISTS shedlock(name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMP NOT NULL, locked_at TIMESTAMP NOT NULL, locked_by VARCHAR(255) NOT NULL);" || true

echo "==> PostgreSQL is ready"
