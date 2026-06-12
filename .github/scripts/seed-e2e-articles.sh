#!/usr/bin/env bash
# Seed articles de référence pour les tests E2E (environnement vierge).
# Idempotent : les INSERT utilisent ON CONFLICT DO NOTHING (migration Flyway V14).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_ROOT/backend/src/main/resources/db/migration/V14__insert_articles.sql"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-oec}"
PGPASSWORD="${PGPASSWORD:-APP2024}"
PGDATABASE="${PGDATABASE:-oec}"
MIN_ENABLED_WITH_STOCK="${MIN_ENABLED_WITH_STOCK:-1}"

if [ ! -f "$SQL_FILE" ]; then
  echo "Fichier SQL introuvable : $SQL_FILE" >&2
  exit 1
fi

export PGPASSWORD

echo "Application des INSERT articles depuis $SQL_FILE sur $PGHOST:$PGPORT/$PGDATABASE ..."
grep '^INSERT INTO public.articles' "$SQL_FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  -v ON_ERROR_STOP=1

SEQ_EXISTS=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT 1 FROM pg_class WHERE relname = 'articles_id_seq' AND relkind = 'S';" | tr -d '[:space:]')
if [ "$SEQ_EXISTS" = "1" ]; then
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -c "SELECT pg_catalog.setval('public.articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM articles), true);"
fi

ENABLED_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT COUNT(*) FROM articles WHERE visibility = 'ENABLED';" | tr -d '[:space:]')

echo "Articles ENABLED en base : $ENABLED_COUNT"

if [ "${ENABLED_COUNT:-0}" -lt "$MIN_ENABLED_WITH_STOCK" ]; then
  echo "Échec : au moins $MIN_ENABLED_WITH_STOCK article ENABLED attendu pour les E2E." >&2
  exit 1
fi

WITH_STOCK=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT COUNT(*) FROM articles WHERE visibility = 'ENABLED' AND stock_quantity >= 20;" | tr -d '[:space:]')

echo "Articles ENABLED avec stock >= 20 : $WITH_STOCK"

if [ "${WITH_STOCK:-0}" -lt 1 ]; then
  echo "Avertissement : aucun article avec stock >= 20 ; ensureArticleWithStock fera une entrée stock." >&2
fi

echo "Seed articles E2E terminé."
