#!/usr/bin/env bash
# Shared helpers for Elykia deploy scripts (env loading, DB container resolution).
set -euo pipefail

elykia_stack_dir() {
  local env="${1:?env required}"
  echo "/opt/elykia/$env"
}

elykia_stack_env_file() {
  echo "$(elykia_stack_dir "$1")/.env"
}

# Load stack .env without inheriting stale POSTGRES_* from a parent shell.
elykia_load_stack_env() {
  local env="${1:?env required}"
  local env_file
  env_file="$(elykia_stack_env_file "$env")"

  unset POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD SPRING_DATASOURCE_USERNAME 2>/dev/null || true

  if [[ ! -f "$env_file" ]]; then
    echo "Error: $env_file not found. Expected stack env at /opt/elykia/<env>/.env (not deploy/.env)." >&2
    echo "Run setup-server.sh or copy the template, then edit secrets." >&2
    return 1
  fi

  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$env_file"
  set +a

  if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_DB:-}" ]]; then
    echo "Error: POSTGRES_USER and POSTGRES_DB must be set in $env_file" >&2
    return 1
  fi
}

elykia_compose() {
  local root_dir="${1:?root dir required}"
  local env="${2:?env required}"
  local env_file
  env_file="$(elykia_stack_env_file "$env")"

  docker compose \
    -f "$root_dir/docker-compose.$env.yml" \
    --project-name "elykia-$env" \
    --env-file "$env_file" \
    "$@"
}

# Read POSTGRES_* as configured on the running container (source of truth after first init).
elykia_sync_pg_creds_from_container() {
  local container="${1:?container required}"

  local container_user container_db
  container_user="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" \
    | sed -n 's/^POSTGRES_USER=//p' | head -n1 || true)"
  container_db="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" \
    | sed -n 's/^POSTGRES_DB=//p' | head -n1 || true)"

  if [[ -n "$container_user" ]]; then
    if [[ -n "${POSTGRES_USER:-}" && "$POSTGRES_USER" != "$container_user" ]]; then
      echo "Warning: .env POSTGRES_USER=$POSTGRES_USER differs from container ($container_user). Using container value." >&2
    fi
    POSTGRES_USER="$container_user"
  fi

  if [[ -n "$container_db" ]]; then
    if [[ -n "${POSTGRES_DB:-}" && "$POSTGRES_DB" != "$container_db" ]]; then
      echo "Warning: .env POSTGRES_DB=$POSTGRES_DB differs from container ($container_db). Using container value." >&2
    fi
    POSTGRES_DB="$container_db"
  fi
}

# Pick a PostgreSQL role that can connect inside the container.
elykia_resolve_pg_dump_user() {
  local container="${1:?container required}"
  local preferred="${2:?preferred user required}"

  if docker exec "$container" psql -U "$preferred" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
    echo "$preferred"
    return 0
  fi

  for candidate in postgres "$preferred"; do
    if docker exec "$container" psql -U "$candidate" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      echo "Warning: role '$preferred' unavailable in container; using '$candidate' for pg_dump." >&2
      echo "$candidate"
      return 0
    fi
  done

  echo "Error: no PostgreSQL role could connect inside container $container (tried $preferred, postgres)." >&2
  echo "Roles in container:" >&2
  docker exec "$container" psql -U postgres -d postgres -tAc "SELECT rolname FROM pg_roles ORDER BY 1;" 2>/dev/null \
    || docker exec "$container" psql -U "$preferred" -d postgres -tAc "SELECT rolname FROM pg_roles ORDER BY 1;" 2>/dev/null \
    || true
  return 1
}

elykia_resolve_db_container() {
  local root_dir="${1:?root dir required}"
  local env="${2:?env required}"
  local target_container="${3:-}"

  if [[ -n "$target_container" ]]; then
    echo "$target_container"
    return 0
  fi

  local db_container
  db_container="$(elykia_compose "$root_dir" "$env" ps -q db 2>/dev/null || true)"
  if [[ -n "$db_container" ]]; then
    echo "$db_container"
    return 0
  fi

  echo "Ensuring DB container is running for env $env" >&2
  elykia_compose "$root_dir" "$env" up -d db
  sleep 3
  db_container="$(elykia_compose "$root_dir" "$env" ps -q db 2>/dev/null || true)"
  if [[ -n "$db_container" ]]; then
    echo "$db_container"
    return 0
  fi

  return 1
}
