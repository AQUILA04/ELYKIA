#!/usr/bin/env bash
# Cloud Agent one-time setup for the ELYKIA dev environment.
# Idempotent: installs system deps, prepares PostgreSQL, builds the backend
# (shared libs + app jar) and installs frontend dependencies.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB_NAME="oec"
DB_USER="oec"
DB_PASSWORD="APP2024"

echo "==> Installing system packages (maven, postgresql)"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq maven postgresql postgresql-contrib

PG_CLUSTER_VERSION="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
echo "==> Starting PostgreSQL cluster ${PG_CLUSTER_VERSION}/main"
sudo pg_ctlcluster "${PG_CLUSTER_VERSION}" main start || true
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

echo "==> Ensuring database role, database and grants"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER}; ALTER SCHEMA public OWNER TO ${DB_USER};"

echo "==> Ensuring ShedLock table exists (Flyway is disabled in the prod profile)"
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c \
  "CREATE TABLE IF NOT EXISTS shedlock(name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMP NOT NULL, locked_at TIMESTAMP NOT NULL, locked_by VARCHAR(255) NOT NULL);"

echo "==> Building shared backend libraries"
mvn -q -f backend-lib/common-entities/pom.xml clean install -DskipTests
mvn -q -f backend-lib/common-securities/pom.xml clean install -DskipTests
mvn -q -f backend-lib/elykia-client/pom.xml clean install -DskipTests

echo "==> Building backend application jar"
mvn -q -f backend/pom.xml clean package -DskipTests

echo "==> Installing frontend dependencies"
# --ignore-scripts hardens installs against malicious dependency lifecycle
# scripts (supply-chain risk). The Angular build does not rely on any package
# postinstall step: esbuild resolves its binary from the @esbuild/linux-x64
# optional dependency, and the other native deps ship prebuilt fallbacks.
cd frontend
npm install --legacy-peer-deps --ignore-scripts

echo "==> Install complete"
