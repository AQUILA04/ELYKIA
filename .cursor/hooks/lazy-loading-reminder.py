#!/usr/bin/env python3
"""
Cursor postToolUse hook: remind the agent to keep frontend feature domains
lazy-loaded using Angular 21 standalone routes ({domain}.routes.ts) or existing
NgModule ({domain}.module.ts) instead of declaring screens in AppModule.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_APP = REPO_ROOT / "frontend" / "src" / "app"

CORE_EXEMPT_FOLDERS = frozenset({
    "core",
    "shared",
    "layout",
    "guards",
    "services",
    "auth",
    "license",
    "mobile-money-config",
    "billetage",
    "dashboard-chart",
})


def domain_from_path(path: str) -> tuple[Path, str] | None:
    normalized = path.replace("\\", "/")
    feature_match = re.search(r"frontend/src/app/features/([^/]+)/", normalized)
    if feature_match:
        domain = feature_match.group(1)
        return (FRONTEND_APP / "features" / domain, domain)
    match = re.search(r"frontend/src/app/([^/]+)/", normalized)
    if match:
        domain = match.group(1)
        return (FRONTEND_APP / domain, domain)
    return None


def is_lazy_configured(domain_dir: Path, domain: str) -> bool:
    return (
        (domain_dir / f"{domain}.routes.ts").is_file()
        or (domain_dir / f"{domain}.module.ts").is_file()
    )


def extract_file_path(payload: dict) -> str | None:
    tool_input = payload.get("tool_input") or {}
    for key in ("path", "file_path", "target_file", "filePath"):
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    # StrReplace / Write sometimes nest differently
    if isinstance(tool_input.get("files"), list):
        for item in tool_input["files"]:
            if isinstance(item, dict) and item.get("path"):
                return str(item["path"])
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        return 0

    file_path = extract_file_path(payload)
    if not file_path:
        print("{}")
        return 0

    resolved = domain_from_path(file_path)
    if not resolved:
        print("{}")
        return 0
    domain_dir, domain = resolved
    if domain in CORE_EXEMPT_FOLDERS or is_lazy_configured(domain_dir, domain):
        print("{}")
        return 0

    context = (
        f"RAPPEL OBLIGATOIRE Angular 21 ELYKIA : le fichier `{file_path}` appartient au "
        f"domaine `{domain}` qui n'a ni `{domain}.routes.ts` (standalone recommandé) ni "
        f"`{domain}.module.ts`. Ne jamais déclarer un écran métier dans `AppModule` : "
        f"utiliser des composants standalone + routes lazy (`{domain}.routes.ts`, "
        f"`loadChildren`/`loadComponent`, URLs `/{domain}/...`). "
        f"Lire .cursor/rules/frontend-lazy-loading-migration.mdc et "
        f".cursor/skills/frontend-lazy-loading-migration/SKILL.md."
    )
    print(json.dumps({"additional_context": context}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
