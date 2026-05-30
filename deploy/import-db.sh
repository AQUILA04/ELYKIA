#!/usr/bin/env bash
set -euo pipefail


# Usage:
# import-db.sh <env> <dump-path-on-server>
# Examples:
# 1) Copy a dump to the server: scp dump.sql.gz user@server:/tmp/dump.sql.gz
# 2) SSH and run: ./import-db.sh prod /tmp/dump.sql.gz

ENV="$1"
DUMP_PATH="$2"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"
COMPOSE_PROJECT="elykia-$ENV"

# Each stack has its own .env under /opt/elykia/<env>/ (see deploy.sh)
STACK_DIR="/opt/elykia/$ENV"
ENV_FILE="$STACK_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
else
  echo "Error: $ENV_FILE not found. Run setup-server.sh first." >&2
  exit 1
fi

if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_DB:-}" ]]; then
  echo "Error: POSTGRES_USER and POSTGRES_DB must be set in $ENV_FILE" >&2
  exit 1
fi

compose() {
  docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "$COMPOSE_PROJECT" \
    --env-file "$ENV_FILE" \
    "$@"
}

# show which DB/user will be used for restore (goes to stderr)
echo "Using POSTGRES_USER=$POSTGRES_USER POSTGRES_DB=$POSTGRES_DB" >&2

echo "Importing dump $DUMP_PATH into DB container for env $ENV"

# Interactive confirmation function
confirm_import() {
  # allow bypass with NONINTERACTIVE=1
  if [ "${NONINTERACTIVE:-}" = "1" ]; then
    echo "NONINTERACTIVE=1 set, skipping confirmation" >&2
    return 0
  fi

  # require a TTY for interactive confirmation
  if [ ! -t 0 ]; then
    echo "No TTY available for interactive confirmation. To run non-interactively set NONINTERACTIVE=1 or provide explicit container as 3rd argument." >&2
    return 1
  fi

  echo "About to import dump:" >&2
  echo "  ENV: $ENV" >&2
  echo "  Dump path (host): $DUMP_PATH" >&2
  echo "  Target container: $DB_CONTAINER" >&2
  echo "  Target DB: $POSTGRES_DB (user: $POSTGRES_USER)" >&2
  echo
  read -r -p "Proceed with import into container '$DB_CONTAINER' and database '$POSTGRES_DB'? [y/N] " ans
  case "$ans" in
    [yY]|[yY][eE][sS])
      return 0
      ;;
    *)
      echo "Import cancelled by user." >&2
      return 1
      ;;
  esac
}


# find db container id
# Optional third argument: explicit container name or id to target directly
TARGET_CONTAINER=${3:-}
if [ -n "$TARGET_CONTAINER" ]; then
  echo "Using explicit target container: $TARGET_CONTAINER" >&2
  DB_CONTAINER="$TARGET_CONTAINER"
else
  # Try docker compose first (preferred)
  DB_CONTAINER=$(compose ps -q db 2>/dev/null || true)
  if [ -z "$DB_CONTAINER" ]; then
    echo "docker compose did not report a container for service 'db'. Falling back to heuristic selection..." >&2
    # Heuristic: try to find a suitable running container automatically
    pick=""

    # 1) prefer containers labeled by compose with service=db and project name matching ENV
    while read -r id image name; do
      svc=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$id" 2>/dev/null || true)
      proj=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null || true)
      if [ "$svc" = "db" ] && [ -n "$proj" ] && echo "$proj" | grep -qi "$ENV"; then
        pick="$id"
        break
      fi
    done < <(docker ps --format '{{.ID}} {{.Image}} {{.Names}}')

    # 2) prefer container whose name matches the ENV (case-insensitive)
    if [ -z "$pick" ]; then
      while read -r id image name; do
        if echo "$name" | grep -qi "$ENV"; then
          pick="$id"
          break
        fi
      done < <(docker ps --format '{{.ID}} {{.Image}} {{.Names}}')
    fi

    # 3) prefer any container with compose service=db
    if [ -z "$pick" ]; then
      while read -r id image name; do
        svc=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$id" 2>/dev/null || true)
        if [ "$svc" = "db" ]; then
          pick="$id"
          break
        fi
      done < <(docker ps --format '{{.ID}} {{.Image}} {{.Names}}')
    fi

    # 4) prefer postgres image containers
    if [ -z "$pick" ]; then
      while read -r id image name; do
        if echo "$image" | grep -qi "postgres"; then
          pick="$id"
          break
        fi
      done < <(docker ps --format '{{.ID}} {{.Image}} {{.Names}}')
    fi

    # 5) fallback: take the most recently started container
    if [ -z "$pick" ]; then
      pick=$(docker ps -q | head -n1 || true)
    fi

    if [ -n "$pick" ]; then
      echo "Heuristic selected container: $pick" >&2
      DB_CONTAINER="$pick"
    else
      DB_CONTAINER=""
    fi
  fi
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "Cannot find DB container for compose file $COMPOSE_FILE (and no explicit container provided)" >&2
  exit 1
fi

# verify the container actually exists and is running (accepts name or id)
if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Container '$DB_CONTAINER' not found. Aborting." >&2
  exit 1
fi

# show which container (id and name) will be used for the restore
echo "Using DB container: $DB_CONTAINER" >&2
if command -v docker >/dev/null 2>&1; then
  docker inspect --format 'Container name: {{.Name}}' "$DB_CONTAINER" 2>/dev/null | sed 's/^/ /' >&2 || true
fi

# Ask user to confirm before making backup & restore
if ! confirm_import; then
  exit 2
fi

# Before importing, create a backup of the current DB state
echo "Creating pre-import backup..."
"$ROOT_DIR/db_backup.sh" "$ENV"

# show which container (id and name) will be used for the restore
echo "Using DB container: $DB_CONTAINER" >&2
if command -v docker >/dev/null 2>&1; then
  docker inspect --format 'Container name: {{.Name}}' "$DB_CONTAINER" 2>/dev/null | sed 's/^/ /' >&2 || true
fi

# Helper: copy file into container and return container path
copy_into_container() {
  local src="$1"
  local dest="/tmp/$(basename "$1")"
  # write the informational message to stderr so that the function's stdout
  # contains only the destination path. This avoids contaminating the
  # captured output (e.g. DEST=$(copy_into_container ...)) with log text,
  # which previously caused pg_restore to receive an invalid filename that
  # included the log line.
  echo "Copying $src -> $DB_CONTAINER:$dest" >&2
  docker cp "$src" "$DB_CONTAINER":"$dest"
  echo "$dest"
}

case "$DUMP_PATH" in
  *.sql)
    echo "Detected plain SQL"
    docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$DUMP_PATH"
    ;;
  *.sql.gz)
    echo "Detected gzipped SQL"
    gunzip -c "$DUMP_PATH" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB"
    ;;
  *.dump|*.pgdump|*.custom)
    echo "Detected pg_dump custom format"
    DEST=$(copy_into_container "$DUMP_PATH")
    echo "Running pg_restore on container $DB_CONTAINER -> $POSTGRES_DB (verbose)" >&2
    docker exec -i "$DB_CONTAINER" pg_restore --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --verbose "$DEST"
    RC=$?
    if [ $RC -ne 0 ]; then
      echo "pg_restore failed with exit code $RC" >&2
      docker exec -i "$DB_CONTAINER" rm -f "$DEST" || true
      exit $RC
    fi
    docker exec -i "$DB_CONTAINER" rm -f "$DEST" || true
    ;;
  *.dump.gz|*.pgdump.gz|*.custom.gz)
    echo "Detected gzipped pg_dump custom format"
    DEST_GZ=$(copy_into_container "$DUMP_PATH")
    # gunzip inside container to /tmp/<name>
    DEST=${DEST_GZ%.gz}
    echo "Gunzip inside container to $DEST and running pg_restore (verbose)" >&2
    docker exec -i "$DB_CONTAINER" sh -c "gunzip -c '$DEST_GZ' > '$DEST'"
    docker exec -i "$DB_CONTAINER" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --verbose "$DEST"
    RC=$?
    if [ $RC -ne 0 ]; then
      echo "pg_restore failed with exit code $RC" >&2
      docker exec -i "$DB_CONTAINER" rm -f "$DEST" '$DEST_GZ' || true
      exit $RC
    fi
    docker exec -i "$DB_CONTAINER" rm -f "$DEST" "$DEST_GZ" || true
    ;;
  *)
    echo "Unknown dump format for file $DUMP_PATH. Supported: .sql, .sql.gz, .dump (custom), .dump.gz" >&2
    exit 2
    ;;
esac

echo "Import finished"

