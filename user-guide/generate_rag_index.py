#!/usr/bin/env python3
"""Generate backend/src/main/resources/ai/user-guide-index.json from user-guide/docs.

Run from repo root:
  python user-guide/generate_rag_index.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = Path(__file__).resolve().parent / "docs"
OUT = ROOT / "backend" / "src" / "main" / "resources" / "ai" / "user-guide-index.json"

SKIP_DIR_NAMES = {"print_versions"}
# Legacy / duplicate entry points superseded by profile guides
SKIP_FILES = {
    "commercial.md",  # superseded by commercial/
    "reporting.md",  # superseded by commercial/reporting + manager/reporting_config
    "tontine.md",  # superseded by commercial/tontine + manager/finance
    "logistics.md",  # superseded by storekeeper guides
}

ROLE_BY_PREFIX = {
    "recovery-manager": ["recovery_manager", "manager"],
    "commercial": ["commercial", "manager"],
    "manager": ["manager"],
    "storekeeper": ["storekeeper", "manager"],
}

MAX_CHUNK_CHARS = 2200
MIN_SECTION_CHARS = 120


def strip_markdown(text: str) -> str:
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)
    text = re.sub(r"(?m)^\s*>\s?", "", text)
    text = re.sub(r"(?m)^\s*[-*+]\s+", "", text)
    text = re.sub(r"(?m)^\s*\d+\.\s+", "", text)
    text = re.sub(r"[|*]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def roles_for(rel: Path) -> list[str]:
    parts = rel.as_posix().split("/")
    if parts[0] in ROLE_BY_PREFIX:
        return list(ROLE_BY_PREFIX[parts[0]])
    if rel.name == "administration.md":
        return ["admin", "manager"]
    if rel.name == "daily-cycle.md":
        return ["commercial", "manager", "storekeeper"]
    if rel.name == "index.md" and len(parts) == 1:
        return ["commercial", "manager", "storekeeper", "recovery_manager", "admin"]
    return ["manager"]


def html_path(rel: Path) -> str:
    if rel.name == "index.md":
        if len(rel.parts) == 1:
            return "/user-guide/index.html"
        parent = "/".join(rel.parts[:-1])
        return f"/user-guide/{parent}/index.html"
    stem = rel.with_suffix(".html").as_posix()
    return f"/user-guide/{stem}"


def chunk_id(rel: Path, section: str | None) -> str:
    base = rel.with_suffix("").as_posix().replace("/", "_").replace("-", "_")
    if rel.name == "index.md":
        base = "_".join(rel.parts[:-1]) if len(rel.parts) > 1 else "home"
        if not base:
            base = "home"
    if not section:
        return base
    slug = re.sub(r"[^a-z0-9]+", "_", section.lower())
    slug = re.sub(r"_+", "_", slug).strip("_")[:48]
    return f"{base}__{slug}" if slug else base


def split_sections(md: str) -> list[tuple[str | None, str]]:
    lines = md.splitlines()
    title = None
    body_start = 0
    for i, line in enumerate(lines):
        m = re.match(r"^#\s+(.+)$", line.strip())
        if m:
            title = m.group(1).strip()
            body_start = i + 1
            break

    body = "\n".join(lines[body_start:])
    parts = re.split(r"(?m)^(##\s+.+)$", body)
    if len(parts) == 1:
        return [(None, md)]

    sections: list[tuple[str | None, str]] = []
    # preamble before first ##
    preamble = parts[0].strip()
    if preamble:
        sections.append((None, f"# {title}\n\n{preamble}" if title else preamble))

    for i in range(1, len(parts), 2):
        heading = re.sub(r"^##\s+", "", parts[i]).strip()
        content = parts[i + 1] if i + 1 < len(parts) else ""
        block = f"# {title}\n\n## {heading}\n{content}" if title else f"## {heading}\n{content}"
        sections.append((heading, block))
    return sections if sections else [(None, md)]


def compress(text: str, limit: int = MAX_CHUNK_CHARS) -> str:
    text = strip_markdown(text)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    # break on sentence/word boundary
    for sep in (". ", " ; ", "\n", " "):
        idx = cut.rfind(sep)
        if idx > limit * 0.6:
            return cut[: idx + (1 if sep == ". " else 0)].strip() + "…"
    return cut.rstrip() + "…"


def iter_doc_files() -> list[Path]:
    files: list[Path] = []
    for path in sorted(DOCS.rglob("*.md")):
        rel = path.relative_to(DOCS)
        if any(part in SKIP_DIR_NAMES for part in rel.parts):
            continue
        if path.name in SKIP_FILES and len(rel.parts) == 1:
            continue
        files.append(path)
    return files


def build_index() -> list[dict]:
    chunks: list[dict] = []
    seen_ids: set[str] = set()

    for path in iter_doc_files():
        rel = path.relative_to(DOCS)
        raw = path.read_text(encoding="utf-8")
        page_title_match = re.search(r"(?m)^#\s+(.+)$", raw)
        page_title = page_title_match.group(1).strip() if page_title_match else rel.stem
        roles = roles_for(rel)
        path_url = html_path(rel)

        sections = split_sections(raw)
        plain_full = strip_markdown(raw)
        # Split by ## when the full page is long so later sections (e.g. carnet checks) are kept
        if len(sections) <= 1 or len(plain_full) <= MAX_CHUNK_CHARS:
            cid = chunk_id(rel, None)
            chunks.append(
                {
                    "id": cid,
                    "title": page_title,
                    "path": path_url,
                    "roles": roles,
                    "content": compress(raw),
                }
            )
            seen_ids.add(cid)
            continue

        for heading, block in sections:
            content = compress(block)
            if len(content) < MIN_SECTION_CHARS and heading is not None:
                continue
            title = f"{page_title} — {heading}" if heading else page_title
            cid = chunk_id(rel, heading)
            if cid in seen_ids:
                cid = f"{cid}_{len(seen_ids)}"
            seen_ids.add(cid)
            chunks.append(
                {
                    "id": cid,
                    "title": title,
                    "path": path_url,
                    "roles": roles,
                    "content": content,
                }
            )

    return chunks


def main() -> None:
    chunks = build_index()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(chunks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(chunks)} chunks -> {OUT.relative_to(ROOT)}")
    # summary by top-level
    from collections import Counter

    c = Counter()
    for ch in chunks:
        top = ch["path"].split("/")[2] if ch["path"].count("/") >= 2 else "root"
        c[top] += 1
    for k, v in sorted(c.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
