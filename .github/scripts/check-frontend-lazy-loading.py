#!/usr/bin/env python3
"""
CI guard: fail when files under an eager frontend domain are changed
without a corresponding lazy-loading entry point ({domain}.module.ts or
Angular 21 standalone {domain}.routes.ts).

Usage:
  python .github/scripts/check-frontend-lazy-loading.py
  GITHUB_BASE_REF=main python .github/scripts/check-frontend-lazy-loading.py
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_APP = REPO_ROOT / "frontend" / "src" / "app"

# Historical eager domains — all migrated as of Frontend 3.0.0 (Angular 21).
# Kept here as a regression guard so none can regress back to eager loading.
TRACKED_DOMAINS = frozenset({
    "locality",
    "client",
    "dashboard-chart",
    "accounting-day",
    "cash-desk",
    "inventory",
    "gestion",
    "operation",
    "deposit",
    "report",
    "history",
    "out",
    "parameters",
})

SKILL_PATH = ".cursor/skills/frontend-lazy-loading-migration/SKILL.md"


def is_migrated(domain: str) -> bool:
    """Return True when the domain has a lazy-loaded module or Angular 21 standalone routes file."""
    domain_dir = FRONTEND_APP / domain
    return (
        (domain_dir / f"{domain}.module.ts").is_file()
        or (domain_dir / f"{domain}.routes.ts").is_file()
    )


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout if result.returncode == 0 else ""


def get_changed_files() -> list[str]:
    base = os.environ.get("GITHUB_BASE_REF", "").strip()
    if base:
        ref = f"origin/{base}"
        subprocess.run(
            ["git", "fetch", "origin", base, "--depth=50"],
            cwd=REPO_ROOT,
            capture_output=True,
            check=False,
        )
        if git_output("rev-parse", "--verify", ref).strip():
            diff = git_output("diff", "--name-only", f"{ref}...HEAD").strip()
            if diff:
                return [line for line in diff.splitlines() if line.strip()]

    # Local / fallback: working tree vs HEAD
    changed: set[str] = set()
    for args in (["diff", "--name-only", "HEAD"], ["diff", "--name-only", "--cached"]):
        output = git_output(*args).strip()
        if output:
            changed.update(line for line in output.splitlines() if line.strip())

    untracked = git_output("ls-files", "--others", "--exclude-standard").strip()
    if untracked:
        changed.update(line for line in untracked.splitlines() if line.strip())

    return sorted(changed)


def domain_from_path(path: str) -> str | None:
    normalized = path.replace("\\", "/")
    match = re.match(r"frontend/src/app/([^/]+)/", normalized)
    return match.group(1) if match else None


def is_cross_reference_exempt(domain: str, changed_files: list[str]) -> bool:
    """
    Autorise une touche minimale sur un autre domaine eager (ex. lien sidebar/dashboard)
    lorsqu'un nouveau module ou fichier routes lazy est ajouté dans le même changeset.
    """
    domain_files = [path for path in changed_files if domain_from_path(path) == domain]
    if not domain_files or not all(path.endswith(".html") for path in domain_files):
        return False

    new_lazy_entries = [
        path for path in changed_files
        if re.match(
            r"frontend/src/app/[^/]+/[^/]+\.(module|routes)\.ts$",
            path.replace("\\", "/"),
        )
    ]
    return len(new_lazy_entries) > 0


def main() -> int:
    changed = get_changed_files()
    if not changed:
        print("Lazy-loading check passed (no changed files).")
        return 0

    touched_tracked = {
        domain
        for path in changed
        if (domain := domain_from_path(path)) in TRACKED_DOMAINS
    }

    violations = sorted(
        d for d in touched_tracked
        if not is_migrated(d) and not is_cross_reference_exempt(d, changed)
    )
    if not violations:
        print("Lazy-loading check passed.")
        return 0

    print(
        "::error::Modification détectée dans des domaines frontend sans point d'entrée lazy-loading.",
        file=sys.stderr,
    )
    for domain in violations:
        print(
            f"  - {domain}: créer frontend/src/app/{domain}/{domain}.routes.ts "
            f"(standalone Angular 21, recommandé) ou {domain}.module.ts "
            f"et charger en lazy via loadChildren/loadComponent (voir {SKILL_PATH})",
            file=sys.stderr,
        )
    return 1


if __name__ == "__main__":
    sys.exit(main())
