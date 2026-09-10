#!/usr/bin/env python3
"""Copy packs we made from ~/.minecraft/resourcepacks onto the site.

Generates a clean download zip, a cover thumb, and a menus preview for each
pack, then rewrites src/data/packs.ts. Third-party packs are not imported.
"""

from __future__ import annotations

import json
import re
import shutil
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MC_PACKS = Path.home() / ".minecraft" / "resourcepacks"
DOWNLOADS = ROOT / "public/downloads"
PREVIEWS = ROOT / "public/previews"
PACKS_TS = ROOT / "src/data/packs.ts"
STATE = ROOT / "scripts/assets/imported-packs.json"

W, H = 1600, 900
VANILLA_INV = (176, 166)
VANILLA_CHEST = (176, 222)
VANILLA_ATLAS = 256

# Only packs we made. Third-party PvP packs stay off the site.
IMPORTS = [
    {
        "slug": "konata",
        "name": "Konata Izumi",
        "creator": "1.8packs",
        "resolution": "16x",
        "source": "Konata-Izumi-16x.zip",
        "download": "Konata-Izumi-16x.zip",
        "extra_features": ["anime", "blue"],
        "description": "Made by iraqies @18packs.pages.dev",
    },
]

EXISTING = []

SHOT_LABELS = [
    ("swords", "Swords"),
    ("foods", "Foods"),
    ("tools", "Tools"),
    ("blocks", "Blocks"),
    ("nether", "Nether"),
    ("sky", "Sky"),
    ("gui", "Menus"),
]


def zip_open(zf: zipfile.ZipFile, *suffixes: str) -> bytes | None:
    suffixes = tuple(s.lower() for s in suffixes)
    names = [n for n in zf.namelist() if not Path(n).name.startswith("._") and not n.startswith("__MACOSX/")]
    for name in names:
        low = name.lower().replace("\\", "/")
        if low.endswith(suffixes):
            return zf.read(name)
    return None


def open_image(data: bytes) -> Image.Image:
    return Image.open(BytesIO(data)).convert("RGBA")


def find_sky(zf: zipfile.ZipFile) -> Image.Image | None:
    names = [n for n in zf.namelist() if not Path(n).name.startswith("._")]
    ranked: list[tuple[int, str]] = []
    for name in names:
        low = name.lower().replace("\\", "/")
        if not low.endswith(".png"):
            continue
        if "mcpatcher/sky" in low or "optifine/sky" in low:
            score = 2
            if "starfield" in low or "sky" in Path(low).name:
                score += 3
            if "world0" in low:
                score += 1
            ranked.append((score, name))
    if not ranked:
        return None
    ranked.sort(reverse=True)
    try:
        return open_image(zf.read(ranked[0][1]))
    except Exception:
        return None


def dilate_alpha(alpha: Image.Image, radius: int) -> Image.Image:
    out = alpha
    for _ in range(max(1, radius)):
        out = out.filter(ImageFilter.MaxFilter(3))
    return out


def outline_layer(im: Image.Image, outer_w: int = 3, inner_w: int = 1) -> Image.Image:
    a = im.split()[-1]
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ring = Image.new("RGBA", im.size, (6, 10, 18, 255))
    ring.putalpha(ImageChops.subtract(dilate_alpha(a, outer_w), a))
    out.alpha_composite(ring)
    if inner_w:
        rim = Image.new("RGBA", im.size, (120, 200, 255, 255))
        rim.putalpha(ImageChops.subtract(dilate_alpha(a, inner_w), a))
        out.alpha_composite(rim)
    out.alpha_composite(im)
    return out


def drop_shadow(im: Image.Image, ox: int = 8, oy: int = 10, blur: int = 8, alpha: int = 140) -> Image.Image:
    pad = blur * 2 + max(ox, oy) + 4
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    blob = Image.new("RGBA", im.size, (0, 0, 0, 0))
    a = im.split()[-1].point(lambda v, al=alpha: min(255, v * al // 255))
    blob.putalpha(a)
    blob = blob.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(blob, (pad + ox, pad + oy))
    canvas.alpha_composite(im, (pad, pad))
    return canvas


def sky_bg(sky: Image.Image | None) -> Image.Image:
    if sky is None:
        canvas = Image.new("RGB", (W, H), (10, 16, 28))
        draw = ImageDraw.Draw(canvas)
        for y in range(H):
            t = y / H
            draw.line((0, y, W, y), fill=(int(8 + 18 * t), int(14 + 30 * t), int(28 + 40 * t)))
        return canvas
    sw, sh = sky.size
    crop = sky.crop((int(sw * 0.12), 0, sw, max(1, int(sh * 0.58)))).resize((W, H), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Brightness(crop).enhance(0.78)
    crop = ImageEnhance.Color(crop).enhance(1.06)
    return crop.convert("RGB")


def detect_features(zf: zipfile.ZipFile, spec: dict) -> list[str]:
    names = [n.lower().replace("\\", "/") for n in zf.namelist()]
    features: list[str] = []
    if any("mcpatcher/sky" in n or "optifine/sky" in n for n in names):
        features.append("custom-sky")
    if any(n.endswith(".mcmeta") and not n.endswith("pack.mcmeta") for n in names):
        features.append("animated-textures")
    if "fps" in spec["name"].lower() or "fps" in spec["source"].lower():
        features.append("fps-friendly")
    sword = zip_open(zf, "/diamond_sword.png")
    if sword:
        try:
            im = open_image(sword)
            bbox = im.split()[-1].getbbox()
            if bbox:
                ratio = (bbox[3] - bbox[1]) / max(im.size)
                if ratio <= 0.82:
                    features.append("short-swords")
        except Exception:
            pass
    for extra in spec.get("extra_features", []):
        if extra not in features:
            features.append(extra)
    return features


def make_gui(zf: zipfile.ZipFile, out: Path) -> bool:
    inv_data = zip_open(zf, "/gui/container/inventory.png")
    chest_data = zip_open(zf, "/gui/container/generic_54.png")
    if not inv_data or not chest_data:
        return False
    try:
        inv = open_image(inv_data)
        chest = open_image(chest_data)
    except Exception:
        return False

    scale = max(1, inv.width / VANILLA_ATLAS)
    inv_box = (0, 0, int(VANILLA_INV[0] * scale), int(VANILLA_INV[1] * scale))
    chest_box = (0, 0, int(VANILLA_CHEST[0] * scale), int(VANILLA_CHEST[1] * scale))
    if inv_box[2] <= inv.width and inv_box[3] <= inv.height:
        inv = inv.crop(inv_box)
    if chest_box[2] <= chest.width and chest_box[3] <= chest.height:
        chest = chest.crop(chest_box)

    # Fit both panels on a 1600x900 frame with a gap.
    max_h = 720
    factor = min(3, max_h / max(inv.height, chest.height))
    if max(inv.size) <= 256:
        inv = inv.resize((int(inv.width * factor), int(inv.height * factor)), Image.Resampling.NEAREST)
        chest = chest.resize((int(chest.width * factor), int(chest.height * factor)), Image.Resampling.NEAREST)
    else:
        inv = inv.resize((int(inv.width * min(1, factor)), int(inv.height * min(1, factor))), Image.Resampling.NEAREST)
        chest = chest.resize((int(chest.width * min(1, factor)), int(chest.height * min(1, factor))), Image.Resampling.NEAREST)

    inv = drop_shadow(outline_layer(inv))
    chest = drop_shadow(outline_layer(chest))
    canvas = sky_bg(find_sky(zf)).convert("RGBA")
    gap = 56
    total = inv.width + gap + chest.width
    if total > W - 40:
        shrink = (W - 40) / total
        inv = inv.resize((int(inv.width * shrink), int(inv.height * shrink)), Image.Resampling.LANCZOS)
        chest = chest.resize((int(chest.width * shrink), int(chest.height * shrink)), Image.Resampling.LANCZOS)
        total = inv.width + gap + chest.width
    x0 = (W - total) // 2
    max_panel = max(inv.height, chest.height)
    y = (H - max_panel) // 2
    canvas.alpha_composite(inv, (x0, y + (max_panel - inv.height) // 2))
    canvas.alpha_composite(chest, (x0 + inv.width + gap, y + (max_panel - chest.height) // 2))
    canvas.convert("RGB").save(out, "WEBP", quality=90, method=6)
    return True


def pack_root(zf: zipfile.ZipFile) -> str:
    """
    The prefix that pack.mcmeta sits under. Minecraft only reads a pack whose
    mcmeta and assets/ are at the zip root, so a pack zipped as a folder loads
    as nothing at all — the game silently falls back to vanilla textures.
    """
    names = [n for n in zf.namelist() if not n.startswith("__MACOSX/") and not Path(n).name.startswith("._")]
    if any(n == "pack.mcmeta" for n in names):
        return ""
    metas = sorted((n for n in names if n.endswith("/pack.mcmeta")), key=lambda n: n.count("/"))
    return metas[0][: -len("pack.mcmeta")] if metas else ""


def copy_pack(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zf:
        root = pack_root(zf)
        if not root:
            shutil.copy2(source, dest)
            return
        print(f"  re-rooting zip (stripping {root!r})")
        with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as out:
            for info in zf.infolist():
                if info.is_dir() or not info.filename.startswith(root):
                    continue
                if info.filename.startswith("__MACOSX/") or Path(info.filename).name.startswith("._"):
                    continue
                out.writestr(info.filename[len(root) :], zf.read(info))


def ts_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def ts_list(values: list[str]) -> str:
    return "[" + ", ".join(ts_str(v) for v in values) + "]"


def gallery_for(slug: str, forced: list[tuple[str, str]] | None = None) -> list[tuple[str, str]]:
    folder = PREVIEWS / slug
    items = []
    for name, label in forced or SHOT_LABELS:
        if (folder / f"{name}.webp").is_file():
            items.append((name, label))
    return items


def write_packs_ts(imported: list[dict]) -> None:
    blocks = []
    for pack in EXISTING:
        gallery = pack.get("forced_gallery") or gallery_for(pack["slug"])
        gallery_ts = ",\n      ".join(
            f'{{ src: {ts_str(f"/previews/{pack['slug']}/{name}.webp?v=close1")}, label: {ts_str(label)} }}'
            for name, label in gallery
        )
        blocks.append(
            f"""  {{
    slug: {ts_str(pack["slug"])},
    name: {ts_str(pack["name"])},
    creator: {ts_str(pack["creator"])},
    description:
      {ts_str(pack["description"])},
    version: "1.8.9",
    resolution: {ts_str(pack["resolution"])},
    features: {ts_list(pack["features"])},
    createdAt: {ts_str(pack["createdAt"])},
    updatedAt: {ts_str(pack["updatedAt"])},
    downloadPath: {ts_str(pack["downloadPath"])},
    downloadName: {ts_str(pack["downloadName"])},
    cover: {ts_str(pack["cover"])},
    gallery: [
      {gallery_ts}
    ],
  }}"""
        )

    for pack in imported:
        gallery = gallery_for(pack["slug"])
        gallery_ts = ",\n      ".join(
            f'{{ src: {ts_str(f"/previews/{pack['slug']}/{name}.webp?v=close1")}, label: {ts_str(label)} }}'
            for name, label in gallery
        )
        blocks.append(
            f"""  {{
    slug: {ts_str(pack["slug"])},
    name: {ts_str(pack["name"])},
    creator: {ts_str(pack["creator"])},
    description:
      {ts_str(pack["description"])},
    version: "1.8.9",
    resolution: {ts_str(pack["resolution"])},
    features: {ts_list(pack["features"])},
    createdAt: {ts_str(pack["createdAt"])},
    updatedAt: {ts_str(pack["updatedAt"])},
    downloadPath: {ts_str(pack["downloadPath"])},
    downloadName: {ts_str(pack["downloadName"])},
    cover: {ts_str(pack["cover"])},
    gallery: [
      {gallery_ts}
    ],
  }}"""
        )

    PACKS_TS.write_text(
        """import type { Pack } from "@/types";

export const packs: Pack[] = [
"""
        + ",\n".join(blocks)
        + """
];

export function getPack(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}

export const featuredPacks = packs;
"""
    )


def import_one(spec: dict) -> dict:
    source = MC_PACKS / spec["source"]
    if not source.is_file():
        raise SystemExit(f"missing {source}")
    dest = DOWNLOADS / spec["download"]
    preview = PREVIEWS / spec["slug"]
    preview.mkdir(parents=True, exist_ok=True)
    print(f"import {spec['slug']} <- {source.name}")
    copy_pack(source, dest)
    with zipfile.ZipFile(source) as zf:
        features = detect_features(zf, spec)
        # Covers come from make-pack-thumbs.py (OptiFine sky + HUD), not a raw sky PNG.
        has_gui = make_gui(zf, preview / "gui.webp")
    record = {
        "slug": spec["slug"],
        "name": spec["name"],
        "creator": spec["creator"],
        "description": spec["description"],
        "resolution": spec["resolution"],
        "features": features,
        "createdAt": "2026-09-05",
        "updatedAt": "2026-09-05",
        "downloadPath": f"/downloads/{spec['download']}",
        "downloadName": spec["download"],
        "cover": f"/previews/{spec['slug']}/thumb.webp?v=layout4",
        "hasGui": has_gui,
        "zip": str(dest),
    }
    print(f"  features={features} gui={has_gui} zip={dest.stat().st_size // 1024}KB")
    return record


def main() -> None:
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    imported = [import_one(spec) for spec in IMPORTS]
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(imported, indent=2))
    write_packs_ts(imported)
    print(f"wrote {PACKS_TS} ({len(EXISTING) + len(imported)} packs)")


if __name__ == "__main__":
    main()
