#!/usr/bin/env python3
"""Compose pack covers using the shared Glaze / Haimiya editor layout.

Backdrop is the OptiFine sky shot (not the raw mcpatcher PNG), placed on the
same 3072×2048 atlas the editor crops. HUD, title, and items use
src/data/thumb-layout.json — the config exported from the cover editor.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "public/previews"
STATE = ROOT / "scripts/assets/imported-packs.json"
LAYOUT_PATH = ROOT / "src/data/thumb-layout.json"
FONT_WOFF = ROOT / "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff"
FONT_FALLBACK = Path("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf")

W, H = 1600, 1000
REF_SKY = (3072, 2048)
BASE_HUD_SCALE = 9
TITLE_MARGIN = 40
NAME_COLOR = (177, 255, 255, 255)
OUTLINE = (6, 10, 18, 255)
RIM = (177, 255, 255, 255)

ITEM_RELS = {
    "sword": "assets/minecraft/textures/items/diamond_sword.png",
    "bow": "assets/minecraft/textures/items/bow_standby.png",
    "gapple": "assets/minecraft/textures/items/apple_golden.png",
    "pearl": "assets/minecraft/textures/items/ender_pearl.png",
    "rod": "assets/minecraft/textures/items/fishing_rod_uncast.png",
    "pickaxe": "assets/minecraft/textures/items/diamond_pickaxe.png",
    "axe": "assets/minecraft/textures/items/diamond_axe.png",
    "pot": "assets/minecraft/textures/items/potion_bottle_drinkable.png",
    "snowball": "assets/minecraft/textures/items/snowball.png",
    "flint": "assets/minecraft/textures/items/flint_and_steel.png",
}
WIDGETS_REL = "assets/minecraft/textures/gui/widgets.png"
ICONS_REL = "assets/minecraft/textures/gui/icons.png"

_spec = importlib.util.spec_from_file_location("export_editor_assets", ROOT / "scripts/export-editor-assets.py")
_export = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(_export)


def load_layout() -> dict:
    return json.loads(LAYOUT_PATH.read_text())


def zip_names(zf: zipfile.ZipFile) -> list[str]:
    return [n for n in zf.namelist() if not Path(n).name.startswith("._") and not n.startswith("__MACOSX/")]


def zip_read(zf: zipfile.ZipFile, rel: str) -> bytes | None:
    rel = rel.lower().replace("\\", "/")
    matches = []
    for name in zip_names(zf):
        low = name.lower().replace("\\", "/")
        if low.endswith("unknown_pack.png"):
            continue
        if low == rel or low.endswith("/" + rel):
            matches.append(name)
    if not matches:
        return None
    matches.sort(key=lambda n: (n.count("/"), len(n)))
    return zf.read(matches[0])


def zip_or_vanilla(zf: zipfile.ZipFile, rel: str) -> bytes:
    return zip_read(zf, rel) or _export.vanilla_texture(rel)


def open_rgba(data: bytes) -> Image.Image:
    return Image.open(BytesIO(data)).convert("RGBA")


def punch_dark(im: Image.Image, thresh: int = 10) -> Image.Image:
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
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ring = Image.new("RGBA", im.size, OUTLINE)
    ring.putalpha(ImageChops.subtract(dilate_alpha(a, outer_w), a))
    out.alpha_composite(ring)
    if inner_w:
        rim = Image.new("RGBA", im.size, RIM)
        rim.putalpha(ImageChops.subtract(dilate_alpha(a, inner_w), a))
        out.alpha_composite(rim)
    out.alpha_composite(im)
    return out


def atlas_crop(im: Image.Image, box: tuple[int, int, int, int], atlas: int = 256) -> Image.Image:
    scale = im.width / atlas
    x0, y0, x1, y1 = (int(v * scale) for v in box)
    return im.crop((x0, y0, max(x0 + 1, x1), max(y0 + 1, y1)))


def mean_alpha(im: Image.Image) -> float:
    return im.convert("RGBA").split()[-1].resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))


def chrome_crop(zf: zipfile.ZipFile, rel: str, box: tuple[int, int, int, int]) -> Image.Image:
    pack_im = open_rgba(zip_or_vanilla(zf, rel))
    crop = atlas_crop(pack_im, box)
    if mean_alpha(crop) >= 40:
        return crop
    return atlas_crop(open_rgba(_export.vanilla_texture(rel)), box)


def title_font(size: int) -> ImageFont.FreeTypeFont:
    path = FONT_WOFF if FONT_WOFF.exists() else FONT_FALLBACK
    return ImageFont.truetype(str(path), size)


def prepare_sky_atlas(sky_path: Path) -> Image.Image:
    """Fit the OptiFine sky (HUD cropped off) onto the Glaze 3072×2048 atlas."""
    sky = Image.open(sky_path).convert("RGB")
    cut = max(1, int(sky.height * 0.48))
    plate = sky.crop((0, 0, sky.width, cut))
    scale = max(REF_SKY[0] / plate.width, REF_SKY[1] / plate.height)
    sized = plate.resize(
        (max(1, int(plate.width * scale)), max(1, int(plate.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = (sized.width - REF_SKY[0]) // 2
    top = (sized.height - REF_SKY[1]) // 2
    return sized.crop((left, top, left + REF_SKY[0], top + REF_SKY[1]))


def draw_sky(atlas: Image.Image, sky: dict) -> Image.Image:
    x, y, w, h = int(sky["x"]), int(sky["y"]), int(sky["w"]), int(sky["h"])
    x = max(0, min(x, max(0, atlas.width - 1)))
    y = max(0, min(y, max(0, atlas.height - 1)))
    w = max(1, min(w, atlas.width - x))
    h = max(1, min(h, atlas.height - y))
    crop = atlas.crop((x, y, x + w, y + h)).resize((W, H), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Brightness(crop).enhance(float(sky.get("brightness", 0.92)))
    crop = ImageEnhance.Color(crop).enhance(float(sky.get("saturate", 1.05)))
    return crop.convert("RGBA")


def build_icon(pack_png: Image.Image, scale: float) -> Image.Image:
    icon_size = max(1, round(360 * scale))
    resample = Image.Resampling.NEAREST if max(pack_png.size) <= 64 else Image.Resampling.LANCZOS
    raw = pack_png.convert("RGBA").resize((icon_size, icon_size), resample)
    icon = outline_layer(raw, max(2, round(5 * scale)), max(1, round(2 * scale)))
    pad = max(1, round(18 * scale))
    canvas = Image.new("RGBA", (icon.width + pad, icon.height + pad), (0, 0, 0, 0))
    shadow = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    shadow.putalpha(icon.split()[-1].point(lambda v: min(255, v * 140 // 255)))
    ox, oy = round(8 * scale), round(12 * scale)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(1, 14 * scale))), (ox, oy))
    canvas.alpha_composite(icon, (0, 0))
    return canvas


def split_title(text: str, measure) -> list[str]:
    """Break a name into the two lines with the smallest widest line."""
    words = text.split()
    if len(words) < 2:
        return [text]
    best: list[str] = [text]
    best_width: float | None = None
    for i in range(1, len(words)):
        pair = [" ".join(words[:i]), " ".join(words[i:])]
        width = max(measure(line) for line in pair)
        if best_width is None or width < best_width:
            best, best_width = pair, width
    return best


def build_title(text: str, scale: float, origin_x: float) -> Image.Image:
    max_width = W - origin_x - TITLE_MARGIN
    font_size = max(24, round(128 * scale))
    font = title_font(font_size)
    dummy = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    padding = max(8, round(36 * scale))
    room = max(1, max_width - padding)

    def measure(line: str) -> float:
        box = dummy.textbbox((0, 0), line, font=font)
        return box[2] - box[0]

    lines = [text]
    text_width = measure(text)
    if text_width > room:
        # Two lines at full size beat one shrunken line, so only fall back to
        # shrinking when the wrap still does not fit.
        lines = split_title(text, measure)
        widest = max(measure(line) for line in lines)
        if widest > room:
            font_size = max(24, int(font_size * (room / widest)))
            font = title_font(font_size)
        text_width = max(measure(line) for line in lines)

    line_h = font_size + padding if len(lines) == 1 else round(font_size * 1.06)
    canvas = Image.new(
        "RGBA",
        (max(1, int(text_width) + padding), line_h * len(lines) + (0 if len(lines) == 1 else padding)),
        (0, 0, 0, 0),
    )
    draw = ImageDraw.Draw(canvas)
    tx = round(10 * scale)
    outer = max(8, round(16 * scale))
    inner = max(3, round(6 * scale))
    for index, line in enumerate(lines):
        ty = canvas.height // 2 if len(lines) == 1 else round(padding / 2 + line_h * (index + 0.5))
        for r in range(outer, 0, -1):
            col = OUTLINE if r > inner else RIM
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if dx * dx + dy * dy > r * r:
                        continue
                    if r > inner and dx * dx + dy * dy < (r - 1) * (r - 1):
                        continue
                    draw.text((tx + dx, ty + dy), line, font=font, fill=col, anchor="lm")
        draw.text((tx, ty), line, font=font, fill=NAME_COLOR, anchor="lm")
    return canvas


def pop_item(im: Image.Image, size: int, angle: float) -> Image.Image:
    # Dark outline only: a cyan rim reads as a stray white line on small sprites.
    item = punch_dark(im.resize((size, size), Image.Resampling.NEAREST))
    item = outline_layer(item, 2, 0)
    if angle:
        item = item.rotate(angle, resample=Image.Resampling.NEAREST, expand=True)
    return item


def build_chrome(zf: zipfile.ZipFile) -> dict[str, Image.Image]:
    s = BASE_HUD_SCALE
    return {
        "hotbar": outline_layer(chrome_crop(zf, WIDGETS_REL, (0, 0, 62, 22)).resize((62 * s, 22 * s), Image.Resampling.NEAREST), 3, 1),
        "select": outline_layer(chrome_crop(zf, WIDGETS_REL, (0, 22, 24, 46)).resize((24 * s, 24 * s), Image.Resampling.NEAREST), 2, 1),
        "heart": outline_layer(
            punch_dark(chrome_crop(zf, ICONS_REL, (52, 0, 61, 9)).resize((12 * s, 12 * s), Image.Resampling.NEAREST)), 3, 1
        ),
        "hunger": outline_layer(
            punch_dark(chrome_crop(zf, ICONS_REL, (52, 27, 61, 36)).resize((12 * s, 12 * s), Image.Resampling.NEAREST)), 3, 1
        ),
    }


def blit(canvas: Image.Image, sprite: Image.Image, x: float, y: float, scale: float, base: float) -> None:
    k = scale / base if base else 1
    w = max(1, round(sprite.width * k))
    h = max(1, round(sprite.height * k))
    im = sprite if abs(k - 1) < 0.01 else sprite.resize((w, h), Image.Resampling.LANCZOS)
    canvas.alpha_composite(im, (round(x), round(y)))


def pack_icon_image(zf: zipfile.ZipFile) -> Image.Image | None:
    data = zip_read(zf, "pack.png") or zip_read(zf, "assets/minecraft/textures/items/diamond_sword.png")
    if not data:
        return None
    try:
        icon = open_rgba(data)
    except Exception:
        return None
    if min(icon.size) < 8:
        return None
    return icon


def paint_cover(name: str, zf: zipfile.ZipFile, atlas: Image.Image, layout: dict) -> Image.Image:
    canvas = draw_sky(atlas, layout["sky"])
    chrome = build_chrome(zf)
    icon_src = pack_icon_image(zf)
    if icon_src is not None and layout["icon"].get("visible", True):
        blit(canvas, build_icon(icon_src, float(layout["icon"]["scale"])), layout["icon"]["x"], layout["icon"]["y"], layout["icon"]["scale"], layout["icon"]["scale"])
    if layout["title"].get("visible", True):
        title = build_title(name, float(layout["title"]["scale"]), float(layout["title"]["x"]))
        blit(canvas, title, layout["title"]["x"], layout["title"]["y"], layout["title"]["scale"], layout["title"]["scale"])

    if layout["hearts"].get("visible", True):
        s = float(layout["hearts"]["scale"])
        step = 10 * s
        for i in range(3):
            blit(canvas, chrome["heart"], layout["hearts"]["x"] + i * step, layout["hearts"]["y"], s, BASE_HUD_SCALE)
    if layout["hunger"].get("visible", True):
        s = float(layout["hunger"]["scale"])
        step = 10 * s
        for i in range(3):
            blit(canvas, chrome["hunger"], layout["hunger"]["x"] + i * step, layout["hunger"]["y"], s, BASE_HUD_SCALE)
    if layout["hotbar"].get("visible", True):
        hb = layout["hotbar"]
        s = float(hb["scale"])
        blit(canvas, chrome["hotbar"], hb["x"], hb["y"], s, BASE_HUD_SCALE)
        blit(canvas, chrome["select"], hb["x"] - s, hb["y"] - s, s, BASE_HUD_SCALE)

    items = {key: open_rgba(zip_or_vanilla(zf, rel)) for key, rel in ITEM_RELS.items()}
    for slot in layout.get("slots") or []:
        if slot.get("visible") is False or slot.get("item") in (None, "none"):
            continue
        src = items.get(slot["item"])
        if src is None:
            continue
        scale = float(slot["scale"])
        size = max(1, round(16 * scale * 1.05))
        sprite = pop_item(src, size, float(slot.get("angle") or 0))
        blit(canvas, sprite, slot["x"], slot["y"], scale, scale)
    return canvas


def compose(slug: str, name: str, zip_path: Path, layout: dict) -> bool:
    sky_path = PREVIEWS / slug / "sky.webp"
    if not sky_path.is_file():
        print(f"  skip {slug}: no OptiFine sky yet")
        return False
    if not zip_path.is_file():
        print(f"  skip {slug}: missing zip")
        return False

    atlas = prepare_sky_atlas(sky_path)
    with zipfile.ZipFile(zip_path) as zf:
        canvas = paint_cover(name, zf, atlas, layout)

    out = PREVIEWS / slug / "thumb.webp"
    canvas.convert("RGB").save(out, "WEBP", quality=90, method=6)
    print(f"  wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
    return True


def main() -> None:
    wanted = set(sys.argv[1:])
    layout = load_layout()
    packs = json.loads(STATE.read_text())
    done = 0
    for pack in packs:
        if wanted and pack["slug"] not in wanted:
            continue
        print(f"thumb {pack['slug']}")
        if compose(pack["slug"], pack["name"], Path(pack["zip"]), layout):
            done += 1
    print(f"composed {done} covers")


if __name__ == "__main__":
    main()
