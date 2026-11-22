#!/usr/bin/env python3
"""
CI architecture guard for Frontend Angular 21 (ADR-001):
1. Only core/, layout/, shared/, and features/ directories may exist directly under frontend/src/app/.
2. No legacy AppModule / AppRoutingModule files may be reintroduced.
3. No legacy 'src/app/' or 'src/environments/' imports may exist under frontend/src/ (use @core/*, @layout/*, @shared/*, @features/*, @env/*).
4. No sweetalert2 or @angular/animations imports may be reintroduced.
5. Every domain under frontend/src/app/features/ must expose a public index.ts barrel.
6. core/ must never import @layout/* or @features/* (except explicitly documented auth bridge).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"
FRONTEND_APP = FRONTEND_SRC / "app"
FEATURES_DIR = FRONTEND_APP / "features"

ALLOWED_APP_DIRS = frozenset({"core", "layout", "shared", "features"})
FORBIDDEN_ROOT_FILES = frozenset({"app.module.ts", "app-routing.module.ts"})

LEGACY_SRC_IMPORT_RE = re.compile(r"""(?:from|import)\s*\(?\s*['"]src/(?:app|environments)/""")
BANNED_PKG_RE = re.compile(r"""(?:from|import)\s*\(?\s*['"](?:sweetalert2|@angular/animations)(?:/[^'"]*)?['"]""")
CORE_FORBIDDEN_RE = re.compile(r"""(?:from|import)\s*\(?\s*['"](?:@layout/|@features/(?!auth/))""")


def main() -> int:
    errors: list[str] = []

    # 1. Strict 4-layer top-level structure under src/app/
    for entry in sorted(FRONTEND_APP.iterdir()):
        if entry.is_dir() and entry.name not in ALLOWED_APP_DIRS:
            errors.append(
                f"Dossier interdit à la racine de src/app/ : '{entry.name}'. "
                "Placer les domaines métier sous frontend/src/app/features/ (ADR-001)."
            )
        if entry.is_file() and entry.name in FORBIDDEN_ROOT_FILES:
            errors.append(
                f"Fichier legacy interdit : frontend/src/app/{entry.name}. "
                "Utiliser bootstrapApplication + app.config.ts + app.routes.ts (ADR-001)."
            )

    # 2. Every feature domain must expose a public index.ts barrel
    if not FEATURES_DIR.is_dir():
        errors.append("Dossier manquant : frontend/src/app/features/ (ADR-001).")
    else:
        for domain_dir in sorted(d for d in FEATURES_DIR.iterdir() if d.is_dir()):
            if not (domain_dir / "index.ts").is_file():
                errors.append(
                    f"Barrel manquant : frontend/src/app/features/{domain_dir.name}/index.ts (ADR-001)."
                )

    # 3. Scan TypeScript files for legacy imports, banned packages, and core/ boundaries
    for ts_file in sorted(FRONTEND_SRC.rglob("*.ts")):
        rel = ts_file.relative_to(REPO_ROOT).as_posix()
        content = ts_file.read_text(encoding="utf-8")

        if LEGACY_SRC_IMPORT_RE.search(content):
            errors.append(
                f"Import legacy 'src/...' détecté dans {rel}. "
                "Utiliser les alias @core/*, @layout/*, @shared/*, @features/*, @env/*."
            )

        if BANNED_PKG_RE.search(content):
            errors.append(
                f"Import interdit (sweetalert2 ou @angular/animations) dans {rel}. "
                "Utiliser AlertService (ngx-sonner + @angular/cdk/dialog) et animations CSS."
            )

        if rel.startswith("frontend/src/app/core/") and CORE_FORBIDDEN_RE.search(content):
            errors.append(
                f"Violation de frontière dans {rel} : core/ ne doit pas importer @layout/* ni @features/*."
            )

    if errors:
        print("::error::Violation(s) d'architecture frontend Angular 21 (ADR-001) :", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    feature_count = sum(1 for d in FEATURES_DIR.iterdir() if d.is_dir())
    print(f"Frontend architecture check passed (4 layers, {feature_count} feature domains, 0 legacy imports).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
