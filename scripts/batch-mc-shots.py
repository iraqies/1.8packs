#!/usr/bin/env python3
"""Render in-game gallery shots for imported packs, then refresh packs.ts.

    python3 scripts/batch-mc-shots.py
    python3 scripts/batch-mc-shots.py --force --shots swords foods tools konata
    python3 scripts/batch-mc-shots.py --include-hand --force --shots swords foods tools
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "scripts/assets/imported-packs.json"
SHOTS = ROOT / "scripts/mc-shots.py"
PREVIEWS = ROOT / "public/previews"

import importlib.util

_spec = importlib.util.spec_from_file_location("import_local_packs", ROOT / "scripts/import-local-packs.py")
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(_mod)
write_packs_ts = _mod.write_packs_ts


HAND_PACKS = ("konata",)


def already_done(slug: str, names: tuple[str, ...]) -> bool:
    folder = PREVIEWS / slug
    return all((folder / f"{name}.webp").is_file() for name in names)


def parse_argv(argv: list[str]) -> tuple[list[str], set[str], list[str]]:
    slugs: list[str] = []
    flags: set[str] = set()
    shot_names: list[str] = []
    taking_shots = False
    for token in argv:
        if token == "--shots":
            taking_shots = True
            flags.add(token)
            continue
        if token.startswith("-"):
            taking_shots = False
            flags.add(token)
            continue
        if taking_shots:
            shot_names.append(token)
        else:
            slugs.append(token)
    return slugs, flags, shot_names


def main() -> None:
    imported = json.loads(STATE.read_text())
    wanted, flags, shot_names = parse_argv(sys.argv[1:])
    force = "--force" in flags
    include_hand = "--include-hand" in flags

    slugs = [pack["slug"] for pack in imported]
    if include_hand:
        slugs = list(HAND_PACKS) + slugs
    if wanted:
        slugs = [s for s in slugs if s in wanted]
    needed = tuple(shot_names) if shot_names else ("swords", "foods", "tools", "blocks", "nether", "sky")
    failed: list[str] = []

    for i, slug in enumerate(slugs, 1):
        if not force and already_done(slug, needed):
            print(f"[{i}/{len(slugs)}] skip {slug} (shots exist)", flush=True)
            continue
        print(f"[{i}/{len(slugs)}] render {slug}", flush=True)
        cmd = ["python3", str(SHOTS), "--pack", slug, "--slug", slug, "--verbose"]
        if shot_names:
            cmd.append("--shots")
            cmd.extend(shot_names)
        code = subprocess.call(cmd, cwd=ROOT)
        write_packs_ts(imported)
        if code != 0:
            print(f"  FAILED {slug} exit={code}", flush=True)
            failed.append(slug)
        else:
            print(f"  ok {slug}", flush=True)

    write_packs_ts(imported)
    if failed:
        print("failed:", ", ".join(failed))
        sys.exit(1)
    print("all packs rendered")


if __name__ == "__main__":
    main()
