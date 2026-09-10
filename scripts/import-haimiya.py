#!/usr/bin/env python3
"""Import Haimiya Mio into public/downloads and public/previews."""

from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC_ZIP = Path("/home/iraqies/Downloads/! §7§lHaimiya Mio §f1.8.9 §7-R0L1.zip")
OUT_ZIP = ROOT / "public/downloads/haimiya-mio-1.8.9.zip"
OUT_DIR = ROOT / "public/previews/haimiya"
FONT_BOLD = ROOT / "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff"
FONT_FALLBACK = Path("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf")

W, H = 1600, 1000
NAME = (177, 255, 255, 255)
OUTLINE = (6, 10, 18, 255)
RIM = (177, 255, 255, 255)
SKIP = {"desktop.ini", "thumbs.db"}


def tex(zf: zipfile.ZipFile, rel: str) -> Image.Image:
    return Image.open(BytesIO(zf.read(rel))).convert("RGBA")


def punch_dark(im: Image.Image, thresh: int = 18) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if max(r, g, b) <= thresh:
                px[x, y] = (r, g, b, 0)
    return im


def dilate_alpha(alpha: Image.Image, radius: int) -> Image.Image:
    out = alpha
    for _ in range(max(1, radius)):
        out = out.filter(ImageFilter.MaxFilter(3))
    return out


def outline_layer(im: Image.Image, outer_w: int = 4, inner_w: int = 2) -> Image.Image:
    a = im.split()[-1]
    outer_a = dilate_alpha(a, outer_w)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ring = Image.new("RGBA", im.size, OUTLINE)
    ring.putalpha(ImageChops.subtract(outer_a, a))
    out.alpha_composite(ring)
    if inner_w > 0:
        inner_a = dilate_alpha(a, inner_w)
        rim = Image.new("RGBA", im.size, RIM)
        rim.putalpha(ImageChops.subtract(inner_a, a))
        out.alpha_composite(rim)
    out.alpha_composite(im)
    return out


def drop_shadow(im: Image.Image, ox: int = 8, oy: int = 10, blur: int = 8, alpha: int = 160) -> Image.Image:
    pad = blur * 2 + max(ox, oy) + 4
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    blob = Image.new("RGBA", im.size, (0, 0, 0, 0))
    a = im.split()[-1].point(lambda v, al=alpha: min(255, v * al // 255))
    blob.putalpha(a)
    blob = blob.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(blob, (pad + ox, pad + oy))
    canvas.alpha_composite(im, (pad, pad))
    return canvas


def title_font(size: int) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if FONT_BOLD.exists() else FONT_FALLBACK
    return ImageFont.truetype(str(path), size)


def draw_title(canvas: Image.Image, text: str, x: int, y: int, size: int) -> None:
    font = title_font(size)
    draw = ImageDraw.Draw(canvas)
    for r in range(8, 0, -1):
        col = OUTLINE if r > 3 else RIM
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if dx * dx + dy * dy > r * r:
                    continue
                if r > 3 and dx * dx + dy * dy < (r - 1) * (r - 1):
                    continue
                draw.text((x + dx, y + dy), text, font=font, fill=col)
    draw.text((x, y), text, font=font, fill=NAME)


def pop_item(im: Image.Image, size: int, angle: float = 0) -> Image.Image:
    item = punch_dark(im.resize((size, size), Image.Resampling.LANCZOS))
    item = outline_layer(item, outer_w=3, inner_w=1)
    if angle:
        item = item.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    return drop_shadow(item, 6, 8, 8, 140)


def save_webp(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "WEBP", quality=90, method=6)


def copy_zip() -> None:
    OUT_ZIP.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(SRC_ZIP) as src, zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            name = Path(info.filename).name.lower()
            if name in SKIP:
                continue
            dst.writestr(info.filename, src.read(info.filename))
    print(f"wrote {OUT_ZIP} ({OUT_ZIP.stat().st_size} bytes)")


def sky_cover(sky: Image.Image) -> Image.Image:
    crop = sky.crop((1434, 0, 3072, 1024)).resize((W, H), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Brightness(crop).enhance(0.96)
    crop = ImageEnhance.Color(crop).enhance(1.08)
    return crop.convert("RGBA")


def make_cover(zf: zipfile.ZipFile) -> Image.Image:
    sky = Image.open(BytesIO(zf.read("assets/minecraft/mcpatcher/sky/world0/starfield03.png")))
    canvas = sky_cover(sky)
    icon = tex(zf, "pack.png").resize((360, 360), Image.Resampling.LANCZOS)
    icon = outline_layer(icon, outer_w=5, inner_w=2)
    icon = drop_shadow(icon, 10, 14, 10, 170)
    canvas.alpha_composite(icon, (70, 8))
    draw_title(canvas, "Haimiya", 790, 118, 118)

    sword = pop_item(tex(zf, "assets/minecraft/textures/items/diamond_sword.png"), 280, -12)
    gapple = pop_item(tex(zf, "assets/minecraft/textures/items/apple_golden.png"), 210, 6)
    pearl = pop_item(tex(zf, "assets/minecraft/textures/items/ender_pearl.png"), 190, 4)
    canvas.alpha_composite(sword, (720, 520))
    canvas.alpha_composite(gapple, (1020, 610))
    canvas.alpha_composite(pearl, (1280, 630))
    return canvas


def board(sky: Image.Image, items: list[tuple[Image.Image, int, float]]) -> Image.Image:
    canvas = sky_cover(sky)
    n = len(items)
    gap = 40
    sizes = [size for _, size, _ in items]
    total = sum(sizes) + gap * (n - 1)
    x = (W - total) // 2
    y = 220
    for im, size, angle in items:
        sprite = pop_item(im, size, angle)
        canvas.alpha_composite(sprite, (x - 20, y + (max(sizes) - size) // 2))
        x += size + gap
    return canvas


def make_gui(zf: zipfile.ZipFile, sky: Image.Image) -> Image.Image:
    canvas = sky_cover(sky)
    inv = tex(zf, "assets/minecraft/textures/gui/container/inventory.png")
    chest = tex(zf, "assets/minecraft/textures/gui/container/generic_54.png")
    inv = inv.resize((520, 520), Image.Resampling.LANCZOS)
    chest = chest.resize((520, 520), Image.Resampling.LANCZOS)
    inv = drop_shadow(outline_layer(inv, 3, 1), 8, 10, 8, 140)
    chest = drop_shadow(outline_layer(chest, 3, 1), 8, 10, 8, 140)
    canvas.alpha_composite(inv, (70, 180))
    canvas.alpha_composite(chest, (900, 180))
    return canvas


def make_sky_preview(sky: Image.Image) -> Image.Image:
    return sky_cover(sky)


def main() -> None:
    copy_zip()
    with zipfile.ZipFile(SRC_ZIP) as zf:
        sky = Image.open(BytesIO(zf.read("assets/minecraft/mcpatcher/sky/world0/starfield03.png")))
        sword = tex(zf, "assets/minecraft/textures/items/diamond_sword.png")
        apple = tex(zf, "assets/minecraft/textures/items/apple.png")
        gapple = tex(zf, "assets/minecraft/textures/items/apple_golden.png")
        pearl = tex(zf, "assets/minecraft/textures/items/ender_pearl.png")
        save_webp(make_cover(zf), OUT_DIR / "thumb.webp")
        save_webp(board(sky, [(sword, 420, -10)]), OUT_DIR / "swords.webp")
        save_webp(board(sky, [(apple, 240, -6), (gapple, 280, 4), (pearl, 260, 8)]), OUT_DIR / "foods.webp")
        save_webp(make_gui(zf, sky), OUT_DIR / "gui.webp")
        save_webp(make_sky_preview(sky), OUT_DIR / "sky.webp")
    print(f"wrote previews in {OUT_DIR}")


if __name__ == "__main__":
    main()
