#!/usr/bin/env python3
"""
Cursor postToolUse hook: remind the agent to migrate eager frontend domains
after editing files under frontend/src/app/{eager-domain}/.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_APP = REPO_ROOT / "frontend" / "src" / "app"

EAGER_DOMAINS = frozenset({
    "locality", "account", "client", "dashboard-chart",
    "accounting-day", "user", "cash-desk", "inventory", "gestion",
    "operation", "deposit", "report", "history", "out", "commercial", "parameters",
})


def domain_from_path(path: str) -> str | None:
    normalized = path.replace("\\", "/")
    match = re.search(r"frontend/src/app/([^/]+)/", normalized)
    return match.group(1) if match else None


def is_migrated(domain: str) -> bool:
    return (FRONTEND_APP / domain / f"{domain}.module.ts").is_file()


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

    domain = domain_from_path(file_path)
    if not domain or domain not in EAGER_DOMAINS or is_migrated(domain):
        print("{}")
        return 0

    context = (
        f"RAPPEL OBLIGATOIRE lazy-loading ELYKIA : le fichier `{file_path}` appartient au "
        f"domaine eager `{domain}`. La migration lazy-loading ({domain}.module.ts, "
        f"loadChildren, URLs /{domain}/...) doit faire partie du scope de cette tâche. "
        f"Lire .cursor/rules/frontend-lazy-loading-migration.mdc et "
        f".cursor/skills/frontend-lazy-loading-migration/SKILL.md avant de terminer."
    )
    print(json.dumps({"additional_context": context}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
