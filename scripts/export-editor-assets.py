#!/usr/bin/env python3
"""Extract one pack's cover-editor assets from its resource-pack zip.

Writes public/editor/<pack>/ with the sky, pack icon, HUD chrome, and item
textures that src/lib/thumbDraw.ts loads.

Overlay packs commonly ship only the textures they actually reskin, so anything
missing falls back to vanilla 1.8.9. That is also what a player sees in game,
which keeps the generated cover honest. Vanilla textures live inside the
official client jar (1.8 has no loose asset objects for them), so the jar is
downloaded once and the handful of PNGs we need are cached under
scripts/assets/vanilla/.

Usage:
    python3 scripts/export-editor-assets.py --pack haimiya \
        --zip public/downloads/haimiya-mio-1.8.9.zip
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EDITOR_ROOT = ROOT / "public/editor"
VANILLA_CACHE = ROOT / "scripts/assets/vanilla"
VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest.json"
MC_VERSION = "1.8.9"

TEX = "assets/minecraft/textures"

# Mirrors ITEM_FILES in src/lib/thumbItems.ts.
ITEM_SOURCES: dict[str, str] = {
    "sword": f"{TEX}/items/diamond_sword.png",
    "bow": f"{TEX}/items/bow_standby.png",
    "gapple": f"{TEX}/items/apple_golden.png",
    "pearl": f"{TEX}/items/ender_pearl.png",
    "rod": f"{TEX}/items/fishing_rod_uncast.png",
    "pickaxe": f"{TEX}/items/diamond_pickaxe.png",
    "axe": f"{TEX}/items/diamond_axe.png",
    "pot": f"{TEX}/items/potion_bottle_drinkable.png",
    "snowball": f"{TEX}/items/snowball.png",
    "flint": f"{TEX}/items/flint_and_steel.png",
}

CHROME_SOURCES = {
    "widgets.png": f"{TEX}/gui/widgets.png",
    "icons.png": f"{TEX}/gui/icons.png",
}

# Preferred first: an MCPatcher custom sky is what the pack actually shows.
SKY_CANDIDATES = [
    "assets/minecraft/mcpatcher/sky/world0/starfield03.png",
    "assets/minecraft/mcpatcher/sky/world0/sky1.png",
    "assets/minecraft/optifine/sky/world0/starfield03.png",
    f"{TEX}/environment/end_sky.png",
]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "1.8packs-editor-assets/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def vanilla_texture(rel: str) -> bytes:
    """Return a vanilla 1.8.9 texture, downloading the client jar once if needed."""
    cached = VANILLA_CACHE / Path(rel).name
    if cached.is_file():
        return cached.read_bytes()

    print(f"  fetching vanilla {MC_VERSION} textures (one time)…")
    manifest = json.loads(fetch(VERSION_MANIFEST))
    entry = next((v for v in manifest["versions"] if v["id"] == MC_VERSION), None)
    if entry is None:
        raise RuntimeError(f"{MC_VERSION} missing from the version manifest")
    version = json.loads(fetch(entry["url"]))
    jar = zipfile.ZipFile(io.BytesIO(fetch(version["downloads"]["client"]["url"])))

    VANILLA_CACHE.mkdir(parents=True, exist_ok=True)
    wanted = list(CHROME_SOURCES.values()) + list(ITEM_SOURCES.values())
    names = set(jar.namelist())
    for path in wanted:
        if path in names:
            (VANILLA_CACHE / Path(path).name).write_bytes(jar.read(path))

    if not cached.is_file():
        raise RuntimeError(f"vanilla {MC_VERSION} has no {rel}")
    return cached.read_bytes()


def read_or_vanilla(zf: zipfile.ZipFile, rel: str, names: set[str]) -> tuple[bytes, str]:
    if rel in names:
        return zf.read(rel), "pack"
    return vanilla_texture(rel), "vanilla"


def pick_sky(zf: zipfile.ZipFile, names: set[str], override: str | None) -> str:
    if override:
        if override not in names:
            raise SystemExit(f"--sky {override} is not in the zip")
        return override
    for candidate in SKY_CANDIDATES:
        if candidate in names:
            return candidate
    raise SystemExit("no sky texture found; pass --sky with a path inside the zip")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pack", required=True, help="pack slug, e.g. haimiya")
    parser.add_argument("--zip", required=True, type=Path, help="path to the pack zip")
    parser.add_argument("--sky", help="explicit sky texture path inside the zip")
    args = parser.parse_args()

    zip_path = args.zip if args.zip.is_absolute() else ROOT / args.zip
    if not zip_path.is_file():
        raise SystemExit(f"no zip at {zip_path}")

    out_dir = EDITOR_ROOT / args.pack
    items_dir = out_dir / "items"
    items_dir.mkdir(parents=True, exist_ok=True)

    print(f"pack: {args.pack}")
    print(f"zip:  {zip_path.relative_to(ROOT)}")

    with zipfile.ZipFile(zip_path) as zf:
        names = set(zf.namelist())

        if "pack.png" not in names:
            raise SystemExit("zip has no pack.png to use as the cover icon")
        (out_dir / "pack.png").write_bytes(zf.read("pack.png"))
        print("  pack.png            <- pack")

        sky_rel = pick_sky(zf, names, args.sky)
        sky = Image.open(io.BytesIO(zf.read(sky_rel))).convert("RGB")
        sky.save(out_dir / "sky-full.jpg", quality=85, optimize=True)
        print(f"  sky-full.jpg        <- {sky_rel}  {sky.size[0]}x{sky.size[1]}")

        for dest, rel in CHROME_SOURCES.items():
            data, origin = read_or_vanilla(zf, rel, names)
            (out_dir / dest).write_bytes(data)
            print(f"  {dest:<20}<- {origin}")

        from_pack = 0
        for item_id, rel in ITEM_SOURCES.items():
            data, origin = read_or_vanilla(zf, rel, names)
            (items_dir / f"{item_id}.png").write_bytes(data)
            if origin == "pack":
                from_pack += 1
        print(f"  items/              <- {from_pack} from pack, {len(ITEM_SOURCES) - from_pack} vanilla")

    print(f"\nwrote {out_dir.relative_to(ROOT)}")
    print(f"open /editor?pack={args.pack} to lay out the cover")


if __name__ == "__main__":
    sys.exit(main())
