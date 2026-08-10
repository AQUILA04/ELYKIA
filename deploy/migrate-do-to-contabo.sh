#!/usr/bin/env bash
# =============================================================================
# migrate-do-to-contabo.sh — Lift ELYKIA from DigitalOcean → Contabo (OCI consumer)
# =============================================================================
# Run ON the DigitalOcean VPS (where /opt/elykia is live).
#
# Transfers:
#   - deploy scripts + Contabo slim compose (no product Traefik/MinIO/monitoring/pgAdmin)
#   - Postgres dumps (prod / test)
#   - MinIO object buckets → shared MinIO on optimize-common-infra
#   - Docker images currently used by the stacks
#   - Adapted .env (MinIO → OCI, OTel → OCI)
#
# Prerequisites on Contabo:
#   - shared-traefik running (traefik-public)
#   - optimize-common-infra running (optimizesolux-common + MinIO)
#   - CF_DNS_API_TOKEN set on Traefik if using Cloudflare Proxied DNS
#
# After success: point Cloudflare A records to Contabo IP (Proxied / orange, SSL Full).
#
# Usage:
#   sudo ./migrate-do-to-contabo.sh \
#     --user root \
#     --ip 169.58.127.90 \
#     --password 'CONTABO_PASSWORD' \
#     [--envs prod,test] \
#     [--skip-minio] \
#     [--skip-images] \
#     [--dry-run]
# =============================================================================
set -euo pipefail

REMOTE_USER=""
REMOTE_IP=""
REMOTE_PASSWORD=""
ENVS="prod"
SKIP_MINIO=0
SKIP_IMAGES=0
DRY_RUN=0
ELYKIA_ROOT="${ELYKIA_ROOT:-/opt/elykia}"
OCI_ENV_PATH="${OCI_ENV_PATH:-/opt/optimizesolux/common-infra/.env}"
REMOTE_ELYKIA="${REMOTE_ELYKIA:-/opt/elykia}"
WORK_DIR=""
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)

usage() {
  sed -n '2,35p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) REMOTE_USER="$2"; shift 2 ;;
    --ip) REMOTE_IP="$2"; shift 2 ;;
    --password) REMOTE_PASSWORD="$2"; shift 2 ;;
    --envs) ENVS="$2"; shift 2 ;;
    --skip-minio) SKIP_MINIO=1; shift ;;
    --skip-images) SKIP_IMAGES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$REMOTE_USER" || -z "$REMOTE_IP" || -z "$REMOTE_PASSWORD" ]]; then
  echo "ERROR: --user, --ip and --password are required."
  usage
fi

if [[ ! -d "$ELYKIA_ROOT/deploy" ]]; then
  echo "ERROR: $ELYKIA_ROOT/deploy not found. Run this script on the DigitalOcean ELYKIA host."
  exit 1
fi

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

ensure_sshpass() {
  if ! command -v sshpass >/dev/null 2>&1; then
    log "Installing sshpass…"
    apt-get update -y
    apt-get install -y sshpass
  fi
}

export SSHPASS="$REMOTE_PASSWORD"

remote() {
  sshpass -e ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${REMOTE_IP}" "$@"
}

remote_bash() {
  # $1 = remote bash script body
  sshpass -e ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${REMOTE_IP}" "bash -s" <<EOF
set -euo pipefail
$1
EOF
}

rsync_to() {
  local src="$1" dest="$2"
  sshpass -e rsync -az --delete \
    -e "ssh ${SSH_OPTS[*]}" \
    "$src" "${REMOTE_USER}@${REMOTE_IP}:$dest"
}

scp_to() {
  sshpass -e scp "${SSH_OPTS[@]}" "$@"
}

read_env_var() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  # shellcheck disable=SC1090
  grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//'
}

compose_file_for() {
  local env="$1"
  if [[ "$env" == "prod" ]]; then
    echo "docker-compose.prod.yml"
  else
    echo "docker-compose.test.yml"
  fi
}

contabo_compose_for() {
  local env="$1"
  echo "docker-compose.contabo-${env}.yml"
}

project_for() {
  echo "elykia-$1"
}

db_container_for() {
  local env="$1"
  # Prefer compose service resolution; fall back to common names
  local proj compose
  proj="$(project_for "$env")"
  compose="$(compose_file_for "$env")"
  local cid
  cid="$(docker compose -f "$ELYKIA_ROOT/deploy/$compose" --project-name "$proj" ps -q db 2>/dev/null || true)"
  if [[ -n "$cid" ]]; then
    echo "$cid"
    return
  fi
  docker ps --format '{{.Names}}' | grep -E "elykia-${env}.*db" | head -1
}

minio_container_for() {
  local env="$1"
  local proj compose cid
  proj="$(project_for "$env")"
  compose="$(compose_file_for "$env")"
  cid="$(docker compose -f "$ELYKIA_ROOT/deploy/$compose" --project-name "$proj" ps -q minio 2>/dev/null || true)"
  if [[ -n "$cid" ]]; then
    echo "$cid"
    return
  fi
  docker ps --format '{{.Names}}' | grep -E "elykia-${env}.*minio" | head -1
}

image_for_service() {
  local env="$1" service="$2"
  local proj compose
  proj="$(project_for "$env")"
  compose="$(compose_file_for "$env")"
  docker compose -f "$ELYKIA_ROOT/deploy/$compose" --project-name "$proj" --env-file "$ELYKIA_ROOT/$env/.env" \
    images -q "$service" 2>/dev/null | head -1
}

running_image_ref() {
  local env="$1" service="$2"
  local cid
  local proj compose
  proj="$(project_for "$env")"
  compose="$(compose_file_for "$env")"
  cid="$(docker compose -f "$ELYKIA_ROOT/deploy/$compose" --project-name "$proj" ps -q "$service" 2>/dev/null || true)"
  [[ -n "$cid" ]] || return 0
  docker inspect -f '{{.Config.Image}}' "$cid"
}

# --- bootstrap local tools ---
need_cmd docker
need_cmd rsync
ensure_sshpass
WORK_DIR="$(mktemp -d /tmp/elykia-migrate-XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

log "=== ELYKIA migration DigitalOcean → Contabo ==="
log "Target: ${REMOTE_USER}@${REMOTE_IP}"
log "Envs: $ENVS"
[[ "$DRY_RUN" -eq 1 ]] && log "DRY-RUN mode — no remote mutations after connectivity check"

log "[1/8] Checking Contabo SSH + prerequisite networks…"
remote "echo ok && docker network inspect traefik-public >/dev/null && docker network inspect optimizesolux-common >/dev/null" \
  || die "Contabo unreachable or missing traefik-public / optimizesolux-common networks"

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "Dry-run: prerequisites OK. Exiting."
  exit 0
fi

log "[2/8] Reading OCI MinIO credentials from Contabo…"
OCI_MINIO_USER="$(remote "grep -E '^MINIO_ROOT_USER=' '$OCI_ENV_PATH' | cut -d= -f2- | tr -d \"'\\\"\"")"
OCI_MINIO_PASS="$(remote "grep -E '^MINIO_ROOT_PASSWORD=' '$OCI_ENV_PATH' | cut -d= -f2- | tr -d \"'\\\"\"")"
[[ -n "$OCI_MINIO_USER" && -n "$OCI_MINIO_PASS" ]] || die "Could not read MINIO_ROOT_* from Contabo $OCI_ENV_PATH"

log "[3/8] Preparing Contabo directories + syncing deploy scripts…"
remote_bash "mkdir -p '$REMOTE_ELYKIA'/{deploy,prod/logs,prod/photos/pending,test/logs,test/photos/pending,prod/releases,test/releases}"

# Sync deploy folder (keep Contabo compose + migration docs)
rsync_to "$ELYKIA_ROOT/deploy/" "$REMOTE_ELYKIA/deploy/"
remote "chmod +x $REMOTE_ELYKIA/deploy/*.sh 2>/dev/null || true"

IFS=',' read -ra ENV_LIST <<< "$ENVS"

log "[4/8] Building Contabo .env files from DO + OCI MinIO…"
for env in "${ENV_LIST[@]}"; do
  env="$(echo "$env" | xargs)"
  src="$ELYKIA_ROOT/$env/.env"
  [[ -f "$src" ]] || die "Missing $src"
  dest_local="$WORK_DIR/${env}.env"
  cp "$src" "$dest_local"

  # Drop product-local MinIO root naming; use OCI shared credentials
  if grep -q '^MINIO_ROOT_USER=' "$dest_local"; then
    sed -i "s|^MINIO_ROOT_USER=.*|MINIO_ACCESS_KEY=${OCI_MINIO_USER}|" "$dest_local"
  else
    echo "MINIO_ACCESS_KEY=${OCI_MINIO_USER}" >> "$dest_local"
  fi
  if grep -q '^MINIO_ROOT_PASSWORD=' "$dest_local"; then
    sed -i "s|^MINIO_ROOT_PASSWORD=.*|MINIO_SECRET_KEY=${OCI_MINIO_PASS}|" "$dest_local"
  else
    echo "MINIO_SECRET_KEY=${OCI_MINIO_PASS}" >> "$dest_local"
  fi
  # Ensure access keys exist even if DO used MINIO_ACCESS_KEY already
  if ! grep -q '^MINIO_ACCESS_KEY=' "$dest_local"; then
    echo "MINIO_ACCESS_KEY=${OCI_MINIO_USER}" >> "$dest_local"
  fi
  if ! grep -q '^MINIO_SECRET_KEY=' "$dest_local"; then
    echo "MINIO_SECRET_KEY=${OCI_MINIO_PASS}" >> "$dest_local"
  fi

  grep -q '^MINIO_ENDPOINT=' "$dest_local" && sed -i 's|^MINIO_ENDPOINT=.*|MINIO_ENDPOINT=http://minio:9000|' "$dest_local" \
    || echo 'MINIO_ENDPOINT=http://minio:9000' >> "$dest_local"
  grep -q '^MINIO_PUBLIC_URL=' "$dest_local" && sed -i 's|^MINIO_PUBLIC_URL=.*|MINIO_PUBLIC_URL=https://s3.optimizesolux.com|' "$dest_local" \
    || echo 'MINIO_PUBLIC_URL=https://s3.optimizesolux.com' >> "$dest_local"

  if [[ "$env" == "prod" ]]; then
    grep -q '^APP_HOSTNAME=' "$dest_local" || echo 'APP_HOSTNAME=elykia.amenouveve-yaveh.com' >> "$dest_local"
  else
    grep -q '^APP_HOSTNAME=' "$dest_local" || echo 'APP_HOSTNAME=elykia-test.amenouveve-yaveh.com' >> "$dest_local"
    # Separate test buckets on shared MinIO to avoid clobbering prod
    sed -i 's|^MINIO_BUCKET=.*|MINIO_BUCKET=elykia-clients-test|' "$dest_local" || true
    grep -q '^MINIO_BUCKET=' "$dest_local" || echo 'MINIO_BUCKET=elykia-clients-test' >> "$dest_local"
    sed -i 's|^MINIO_REPORTS_BUCKET=.*|MINIO_REPORTS_BUCKET=elykia-reports-test|' "$dest_local" || true
    grep -q '^MINIO_REPORTS_BUCKET=' "$dest_local" || echo 'MINIO_REPORTS_BUCKET=elykia-reports-test' >> "$dest_local"
  fi

  grep -q '^OTEL_EXPORTER_OTLP_ENDPOINT=' "$dest_local" \
    || echo 'OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318' >> "$dest_local"
  grep -q '^OTEL_SERVICE_NAME=' "$dest_local" \
    || echo "OTEL_SERVICE_NAME=elykia-api${env:+-$env}" >> "$dest_local"
  if [[ "$env" == "prod" ]]; then
    sed -i 's|^OTEL_SERVICE_NAME=.*|OTEL_SERVICE_NAME=elykia-api|' "$dest_local" || true
  fi

  # Ensure image refs from DO env or running containers
  fe="$(read_env_var "$dest_local" FRONTEND_IMAGE)"
  be="$(read_env_var "$dest_local" BACKEND_IMAGE)"
  if [[ -z "$fe" ]]; then
    fe="$(running_image_ref "$env" frontend || true)"
    [[ -n "$fe" ]] && echo "FRONTEND_IMAGE=$fe" >> "$dest_local"
  fi
  if [[ -z "$be" ]]; then
    be="$(running_image_ref "$env" backend || true)"
    [[ -n "$be" ]] && echo "BACKEND_IMAGE=$be" >> "$dest_local"
  fi

  scp_to "$dest_local" "${REMOTE_USER}@${REMOTE_IP}:${REMOTE_ELYKIA}/${env}/.env"
  remote "chmod 600 ${REMOTE_ELYKIA}/${env}/.env"
  log "  → ${env}/.env synced"
done

log "[5/8] Dumping Postgres on DO and restoring on Contabo…"
for env in "${ENV_LIST[@]}"; do
  env="$(echo "$env" | xargs)"
  env_file="$ELYKIA_ROOT/$env/.env"
  db_user="$(read_env_var "$env_file" POSTGRES_USER)"
  db_name="$(read_env_var "$env_file" POSTGRES_DB)"
  db_cid="$(db_container_for "$env")"
  [[ -n "$db_cid" ]] || die "No Postgres container found for $env"
  dump="$WORK_DIR/${env}.sql.gz"
  log "  Dumping $env from container $db_cid…"
  docker exec -e PGPASSWORD="$(read_env_var "$env_file" POSTGRES_PASSWORD)" "$db_cid" \
    pg_dump -U "$db_user" -d "$db_name" --no-owner --no-acl | gzip -c > "$dump"

  scp_to "$dump" "${REMOTE_USER}@${REMOTE_IP}:/tmp/elykia-${env}.sql.gz"

  ccompose="$(contabo_compose_for "$env")"
  proj="$(project_for "$env")"

  # Start only DB first for restore
  remote_bash "cd '$REMOTE_ELYKIA/deploy'
docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' up -d db
for i in \$(seq 1 60); do
  docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' exec -T db \
    pg_isready -U '$db_user' -d '$db_name' && break
  sleep 2
done
docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' exec -T db \
  psql -U '$db_user' -d '$db_name' -v ON_ERROR_STOP=1 -c \"DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \\\"$db_user\\\"; GRANT ALL ON SCHEMA public TO public;\"
gunzip -c /tmp/elykia-${env}.sql.gz | docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' exec -T db \
  psql -U '$db_user' -d '$db_name' -v ON_ERROR_STOP=1
rm -f /tmp/elykia-${env}.sql.gz"
  log "  → Postgres $env restored"
done

if [[ "$SKIP_MINIO" -eq 0 ]]; then
  log "[6/8] Mirroring MinIO buckets DO → Contabo OCI MinIO…"
  for env in "${ENV_LIST[@]}"; do
    env="$(echo "$env" | xargs)"
    env_file="$ELYKIA_ROOT/$env/.env"
    src_user="$(read_env_var "$env_file" MINIO_ROOT_USER)"
    src_pass="$(read_env_var "$env_file" MINIO_ROOT_PASSWORD)"
    [[ -n "$src_user" ]] || src_user="$(read_env_var "$env_file" MINIO_ACCESS_KEY)"
    [[ -n "$src_pass" ]] || src_pass="$(read_env_var "$env_file" MINIO_SECRET_KEY)"
    minio_cid="$(minio_container_for "$env")"
    [[ -n "$minio_cid" ]] || { log "  WARN: no MinIO container for $env — skip"; continue; }

    if [[ "$env" == "prod" ]]; then
      buckets=(
        "$(read_env_var "$env_file" MINIO_BUCKET || echo elykia-clients)"
        "$(read_env_var "$env_file" MINIO_REPORTS_BUCKET || echo elykia-reports)"
        "$(read_env_var "$env_file" MINIO_MOBILE_RELEASES_BUCKET || echo elykia-mobile-releases)"
        "$(read_env_var "$env_file" MINIO_CUSTOMER_SPACE_RELEASES_BUCKET || echo elykia-customer-space-releases)"
        "$(read_env_var "$env_file" MINIO_RECRUITMENT_BUCKET || echo elykia-recruitment)"
      )
      dest_buckets=("${buckets[@]}")
    else
      buckets=(
        "$(read_env_var "$env_file" MINIO_BUCKET || echo elykia-clients)"
        "$(read_env_var "$env_file" MINIO_REPORTS_BUCKET || echo elykia-reports)"
        "$(read_env_var "$env_file" MINIO_MOBILE_RELEASES_BUCKET || echo elykia-mobile-releases)"
        "$(read_env_var "$env_file" MINIO_CUSTOMER_SPACE_RELEASES_BUCKET || echo elykia-customer-space-releases)"
        "$(read_env_var "$env_file" MINIO_RECRUITMENT_BUCKET || echo elykia-recruitment)"
      )
      dest_buckets=(
        "elykia-clients-test"
        "elykia-reports-test"
        "elykia-mobile-releases-test"
        "elykia-customer-space-releases-test"
        "elykia-recruitment-test"
      )
    fi

    net="$(docker inspect --format '{{range $k, $_ := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$minio_cid" | head -1)"
    minio_host="$(docker inspect -f '{{.Name}}' "$minio_cid" | sed 's#^/##')"
    [[ -n "$net" ]] || { log "  WARN: cannot resolve Docker network for MinIO $env"; continue; }

    for i in "${!buckets[@]}"; do
      src_b="${buckets[$i]}"
      dst_b="${dest_buckets[$i]}"
      [[ -n "$src_b" ]] || continue
      log "  Mirror $env: $src_b → OCI:$dst_b"
      export_dir="$WORK_DIR/minio-${env}-${src_b}"
      rm -rf "$export_dir"
      mkdir -p "$export_dir/data"
      if ! docker run --rm --network "$net" -v "$export_dir/data:/out" --entrypoint /bin/sh \
        minio/mc:RELEASE.2024-11-17T19-35-38Z -c \
        "mc alias set src http://${minio_host}:9000 '${src_user}' '${src_pass}' && mc mirror --overwrite 'src/${src_b}' /out"; then
        log "  WARN: mirror export failed for $src_b"
        continue
      fi
      archive="$WORK_DIR/minio-${env}-${src_b}.tgz"
      tar -C "$export_dir/data" -czf "$archive" .
      scp_to "$archive" "${REMOTE_USER}@${REMOTE_IP}:/tmp/elykia-minio-${env}-${src_b}.tgz"
      remote_bash "docker run --rm --network optimizesolux-common -v /tmp/elykia-minio-${env}-${src_b}.tgz:/in.tgz:ro --entrypoint /bin/sh minio/mc:RELEASE.2024-11-17T19-35-38Z -c \"
  mc alias set dst http://minio:9000 '${OCI_MINIO_USER}' '${OCI_MINIO_PASS}' &&
  mc mb -p dst/${dst_b} || true &&
  mkdir -p /tmp/in && tar -C /tmp/in -xzf /in.tgz &&
  mc mirror --overwrite /tmp/in dst/${dst_b}
\"
rm -f /tmp/elykia-minio-${env}-${src_b}.tgz"
    done
  done
else
  log "[6/8] Skipping MinIO (--skip-minio)"
fi

if [[ "$SKIP_IMAGES" -eq 0 ]]; then
  log "[7/8] Transferring frontend/backend images…"
  declare -A SEEN=()
  for env in "${ENV_LIST[@]}"; do
    env="$(echo "$env" | xargs)"
    for svc in frontend backend; do
      ref="$(running_image_ref "$env" "$svc" || true)"
      [[ -n "$ref" ]] || ref="$(read_env_var "$ELYKIA_ROOT/$env/.env" "$(echo "$svc" | tr '[:lower:]' '[:upper:]')_IMAGE")"
      [[ -n "$ref" ]] || continue
      key="$ref"
      [[ -n "${SEEN[$key]:-}" ]] && continue
      SEEN[$key]=1
      safe="$(echo "$ref" | tr '/:' '__')"
      tar="$WORK_DIR/img-${safe}.tar"
      log "  docker save $ref"
      docker save -o "$tar" "$ref"
      scp_to "$tar" "${REMOTE_USER}@${REMOTE_IP}:/tmp/elykia-img-${safe}.tar"
      remote "docker load -i /tmp/elykia-img-${safe}.tar && rm -f /tmp/elykia-img-${safe}.tar"
    done
  done
else
  log "[7/8] Skipping image transfer (--skip-images) — Contabo must pull from GHCR"
fi

log "[8/8] Starting Contabo stacks (slim compose)…"
for env in "${ENV_LIST[@]}"; do
  env="$(echo "$env" | xargs)"
  ccompose="$(contabo_compose_for "$env")"
  proj="$(project_for "$env")"
  remote_bash "cd '$REMOTE_ELYKIA/deploy'
docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' up -d
docker compose -f '$ccompose' --project-name '$proj' --env-file '$REMOTE_ELYKIA/$env/.env' ps"
done

cat <<EOF

=== Migration complete ===

Contabo stacks started with docker-compose.contabo-*.yml (FE + BE + DB only).
Shared services used: Traefik, MinIO OCI, Grafana/Promtail/cAdvisor, pgAdmin OCI.

Next steps (manual DNS only):
  1. Cloudflare → zone amenouveve-yaveh.com (and any other product hosts):
       A  elykia / elykia-test / …  →  ${REMOTE_IP}   Proxy ON (orange), SSL Full
  2. Confirm shared-traefik has CF_DNS_API_TOKEN (DNS-01) then wait for certs.
  3. pgAdmin (https://pgadmin.optimizesolux.com) — add server:
       Host: elykia-db   Port: 5432   DB/user/pass from /opt/elykia/prod/.env
  4. Grafana (https://grafana.optimizesolux.com):
       - containers/logs already via cAdvisor + Promtail
       - Prometheus scrape job elykia-backend (OCI) after force-update prometheus
       - Import dashboards from deploy/monitoring/grafana/dashboards/ if needed
  5. Update GitHub Actions secrets SERVER_HOST → ${REMOTE_IP}
  6. Keep DO running until smoke tests pass, then stop DO stacks.

Smoke:
  curl -I https://elykia.amenouveve-yaveh.com
  curl -I https://elykia.amenouveve-yaveh.com/api/actuator/health

EOF
