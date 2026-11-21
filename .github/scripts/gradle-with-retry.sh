#!/usr/bin/env bash
# Lance ./gradlew (dossier courant) avec 3 tentatives et attente croissante.
# Maven Central répond parfois 429 « Too Many Requests » : Gradle mémorise alors
# « dépendance introuvable » et une simple relance échoue de la même façon.
# À partir de la 2e tentative, --refresh-dependencies force une nouvelle résolution.
#
# Usage : gradle-with-retry.sh <tâches et options Gradle>
set -uo pipefail

max_attempts="${GRADLE_MAX_ATTEMPTS:-3}"
attempt=1
extra=()

while true; do
  if ./gradlew "$@" "${extra[@]}"; then
    exit 0
  fi
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Gradle a échoué après ${max_attempts} tentatives : $*" >&2
    exit 1
  fi
  sleep_seconds=$((30 * attempt))
  echo "Gradle a échoué (tentative ${attempt}/${max_attempts}). Nouvelle tentative dans ${sleep_seconds}s avec --refresh-dependencies…"
  attempt=$((attempt + 1))
  extra=(--refresh-dependencies)
  sleep "$sleep_seconds"
done
