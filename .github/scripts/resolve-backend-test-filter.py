#!/usr/bin/env python3
"""
Resolve selective Surefire test filter for backend PRs using the real Spring Modulith
module dependency graph declared in package-info.java files.

Behavior:
  - Always falls back to mode=full when:
      * A foundational/cross-cutting file changed (pom.xml, resources/, Dockerfile,
        OptimizeElykiaCoreApplication.java, integration tests, CI workflow/script).
      * Any modified file under backend/ cannot be mapped to a known module.
      * Impacted downstream module count >= 12 (e.g. entities, securities, shared, client).
  - Otherwise emits mode=selective with a Surefire -Dtest filter containing:
      * com.optimize.elykia.ModularityTests (always verified on every backend PR)
      * Every impacted module (modified + transitive downstream dependents in the DAG).

Outputs key=value lines (suitable for $GITHUB_OUTPUT or inspection).
"""

import collections
import os
import re
import subprocess
import sys

MODULE_ROOTS = [
    ("backend/src/main/java/com/optimize/common", "com.optimize.common"),
    ("backend/src/main/java/com/optimize/elykia", "com.optimize.elykia"),
]
TEST_ROOTS = [
    ("backend/src/test/java/com/optimize/common", "com.optimize.common"),
    ("backend/src/test/java/com/optimize/elykia", "com.optimize.elykia"),
]
FULL_THRESHOLD_MODULES = 12


def load_module_graph():
    mod_to_pkg = {}
    deps = {}
    for base_dir, base_pkg in MODULE_ROOTS:
        if not os.path.isdir(base_dir):
            continue
        for entry in sorted(os.listdir(base_dir)):
            pi = os.path.join(base_dir, entry, "package-info.java")
            if os.path.isfile(pi):
                txt = open(pi, encoding="utf-8").read()
                mod_to_pkg[entry] = f"{base_pkg}.{entry}"
                m = re.search(r"allowedDependencies\s*=\s*\{([^}]*)\}", txt, re.S)
                raw = re.findall(r'"([^"]+)"', m.group(1)) if m else []
                deps[entry] = {r.split("::")[0].strip() for r in raw}
    rev = collections.defaultdict(set)
    for mod, dset in deps.items():
        for d in dset:
            rev[d].add(mod)
    return mod_to_pkg, rev


def downstream_closure(start_mods, rev):
    visited = set(start_mods)
    stack = list(start_mods)
    while stack:
        cur = stack.pop()
        for nxt in rev.get(cur, ()):
            if nxt not in visited:
                visited.add(nxt)
                stack.append(nxt)
    return sorted(visited)


def extract_module(path, known_mods):
    for base_dir, _ in MODULE_ROOTS + TEST_ROOTS:
        prefix = base_dir + "/"
        if path.startswith(prefix):
            rest = path[len(prefix):]
            parts = rest.split("/")
            if len(parts) >= 2 and parts[0] in known_mods:
                return parts[0]
    return None


def get_changed_files(base_sha, head_sha):
    cmd = ["git", "diff", "--name-only", f"{base_sha}...{head_sha}"]
    out = subprocess.check_output(cmd, text=True)
    return [line.strip() for line in out.splitlines() if line.strip()]


def evaluate(changed_files):
    mod_to_pkg, rev = load_module_graph()
    backend_files = [
        f for f in changed_files
        if f.startswith("backend/")
        or f in (".github/workflows/ci.yml", ".github/scripts/resolve-backend-test-filter.py")
    ]
    dockerfile_changed = any(
        f in ("backend/Dockerfile", "backend/docker-entrypoint.sh")
        for f in backend_files
    )

    if not backend_files:
        return "full", "", dockerfile_changed, "no backend files in diff (safe fallback)"

    touched_mods = set()
    for path in backend_files:
        # Ignore docs-only changes inside backend/docs/
        if path.startswith("backend/docs/"):
            continue
        mod = extract_module(path, mod_to_pkg)
        if mod is None:
            return "full", "", dockerfile_changed, f"cross-cutting file changed: {path}"
        touched_mods.add(mod)

    if not touched_mods:
        return "selective", "com.optimize.elykia.ModularityTests", dockerfile_changed, "docs-only backend change"

    impacted = downstream_closure(touched_mods, rev)
    if len(impacted) >= FULL_THRESHOLD_MODULES:
        return (
            "full",
            "",
            dockerfile_changed,
            f"foundational module(s) {sorted(touched_mods)} impact {len(impacted)}/{len(mod_to_pkg)} modules",
        )

    patterns = ["com.optimize.elykia.ModularityTests"]
    for mod in impacted:
        patterns.append(f"{mod_to_pkg[mod]}.**.*Test*")
    reason = f"modified={sorted(touched_mods)} -> impacted={impacted} ({len(impacted)}/{len(mod_to_pkg)} modules)"
    return "selective", ",".join(patterns), dockerfile_changed, reason


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--files":
        changed_files = sys.argv[2:]
    else:
        base_sha = os.environ.get("BASE_SHA", "").strip()
        head_sha = os.environ.get("HEAD_SHA", "HEAD").strip()
        if not base_sha:
            print("BASE_SHA not provided; falling back to full suite", file=sys.stderr)
            print("mode=full")
            print("test_filter=")
            print("dockerfile_changed=false")
            return
        changed_files = get_changed_files(base_sha, head_sha)

    mode, test_filter, dockerfile_changed, reason = evaluate(changed_files)
    print(f"Backend PR test resolution: mode={mode} ({reason})", file=sys.stderr)
    print(f"mode={mode}")
    print(f"test_filter={test_filter}")
    print(f"dockerfile_changed={'true' if dockerfile_changed else 'false'}")


if __name__ == "__main__":
    main()
