#!/bin/bash
set -euo pipefail
cd /tmp/com003-restore
rm -rf BOOT-INF META-INF
python3 -m zipfile -e app.jar .
chmod -R a+rX /tmp/com003-restore
set -a
. /opt/elykia/prod/.env
set +a
IMAGE=$(docker inspect -f '{{.Config.Image}}' elykia-backend)
docker run --rm --network container:elykia-prod-db \
  --entrypoint java \
  -e PGHOST=127.0.0.1 \
  -e PGPORT=5432 \
  -e PGUSER="$POSTGRES_USER" \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  -e PGDATABASE="${POSTGRES_DB:-elykia_prod_db}" \
  -e ELYKIA_RESTORE_CONFIRM=RESTORE-COM003-RUN-5 \
  -e ELYKIA_RESTORE_APPLY="${ELYKIA_RESTORE_APPLY:-}" \
  -v /tmp/com003-restore:/restore:ro \
  -w /restore \
  "$IMAGE" \
  -cp "BOOT-INF/classes:BOOT-INF/lib/*" \
  com.optimize.elykia.core.service.tontine.TontineCommercialCollectionRestoreJob
