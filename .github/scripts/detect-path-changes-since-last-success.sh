#!/usr/bin/env bash
# Detect whether given paths changed since the last successful CI job for a component.
#
# Why: dorny/paths-filter on push only sees the last push (github.event.before..HEAD).
# A CI-failed commit that touched the path, followed by a fix outside the path, would
# otherwise skip the rebuild. Window is last-successful-job-head..HEAD instead.
#
# Required env:
#   GH_TOKEN       — GitHub token with actions:read
#   REPO           — owner/name
#   WORKFLOW_FILE  — e.g. ci.yml
#   JOB_NAME       — exact job name that must have conclusion=success (e.g. build-frontend).
#                    If empty, any successful workflow run on the branch is accepted.
#   HEAD_SHA       — commit being evaluated
#   HEAD_BRANCH    — branch of that commit (exact match against run.head_branch)
#
# Args: pathspecs (dorny-style globs like 'frontend/**' or plain paths). '**' is stripped
#       for git diff pathspecs (frontend/** → frontend).
#
# Stdout: "true" or "false"
# Stderr: BASE/HEAD and changed file list
set -euo pipefail

if [ -z "${GH_TOKEN:-}" ] || [ -z "${REPO:-}" ] || [ -z "${WORKFLOW_FILE:-}" ] \
  || [ -z "${HEAD_SHA:-}" ] || [ -z "${HEAD_BRANCH:-}" ]; then
  echo "Missing required env: GH_TOKEN REPO WORKFLOW_FILE HEAD_SHA HEAD_BRANCH" >&2
  exit 2
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path> [path...]" >&2
  exit 2
fi

PATHSPECS=()
for p in "$@"; do
  # dorny 'frontend/**' → git pathspec 'frontend'
  p="${p%/\*\*}"
  p="${p%\*\*}"
  PATHSPECS+=("$p")
done

branch_matches() {
  local run_branch="$1"
  [ "$run_branch" = "$HEAD_BRANCH" ]
}

find_last_job_sha() {
  local page=1
  local run_id run_sha run_branch job_id
  while [ "$page" -le 5 ]; do
    while IFS=$'\t' read -r run_id run_sha run_branch; do
      [ -z "${run_id:-}" ] && continue
      branch_matches "$run_branch" || continue
      if [ "$run_sha" = "$HEAD_SHA" ]; then
        continue
      fi
      if [ -n "${JOB_NAME:-}" ]; then
        job_id=$(gh api "/repos/${REPO}/actions/runs/${run_id}/jobs" --paginate \
          --jq ".jobs[] | select(.name == \"${JOB_NAME}\" and .conclusion == \"success\") | .id" \
          | head -1 || true)
        if [ -z "${job_id:-}" ]; then
          continue
        fi
        echo "Last successful job: run_id=$run_id sha=$run_sha job=$JOB_NAME" >&2
      else
        echo "Last successful workflow run: run_id=$run_id sha=$run_sha (no job filter)" >&2
      fi
      echo "$run_sha"
      return 0
    done < <(gh api "/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?status=completed&per_page=30&page=${page}" \
      --jq '.workflow_runs[] | select(.conclusion == "success") | [.id, .head_sha, .head_branch] | @tsv')
    page=$((page + 1))
  done
  return 1
}

BASE_SHA=$(find_last_job_sha || true)
if [ -z "${BASE_SHA:-}" ]; then
  if git rev-parse --verify "${HEAD_SHA}^1" >/dev/null 2>&1; then
    BASE_SHA="${HEAD_SHA}^1"
  else
    BASE_SHA="$HEAD_SHA"
  fi
  echo "No prior successful run found; falling back to BASE=$BASE_SHA" >&2
fi

echo "Detect mode=since-last-success BASE=$BASE_SHA HEAD=$HEAD_SHA branch=$HEAD_BRANCH job=${JOB_NAME:-<workflow>} paths=${PATHSPECS[*]}" >&2

CHANGED=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" -- "${PATHSPECS[@]}" || true)
if [ -n "$CHANGED" ]; then
  echo "Paths changed since last success:" >&2
  echo "$CHANGED" >&2
  echo "true"
else
  echo "No path changes between $BASE_SHA and $HEAD_SHA" >&2
  echo "false"
fi
