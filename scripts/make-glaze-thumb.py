#!/usr/bin/env python3
"""Build the Glaze pack thumbnail from textures inside glaze-16x.zip."""

from __future__ import annotations

import base64
import json
import shutil
import sys
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_player import render_player

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "public/downloads/glaze-16x.zip"
STEVE_PATH = ROOT / "scripts/assets/steve.png"
OUT_WEBP = ROOT / "public/previews/glaze/thumb.webp"
OUT_PNG = Path("/tmp/glaze-iso/thumb.png")
FONT_BOLD = ROOT / "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff"
FONT_FALLBACK = Path("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf")

W, H = 1600, 1000
FACE = 84

LIGHT_TOP = 1.0
LIGHT_LEFT = 0.62
LIGHT_RIGHT = 0.88

HUD_SCALE = 9
NAME_COLOR = (177, 255, 255)
OUTLINE = (6, 10, 18, 255)
RIM = (177, 255, 255, 255)

PLAYER_PNG = Path("/tmp/glaze-iso/player.png")
IRAQIES_SKIN = ROOT / "scripts/assets/iraqies.png"
IRAQIES_CAPE = ROOT / "scripts/assets/iraqies-cape.png"
ARMOR_OUTER = ROOT / "scripts/assets/glaze-armor-outer.png"
ARMOR_INNER = ROOT / "scripts/assets/glaze-armor-inner.png"
IRAQIES_UUID = "39fa9ba145354c2c8adf8dfb1fba4d41"
POSE_PATH = ROOT / "scripts/assets/player-pose.json"
EDITOR_DIR = ROOT / "public/editor/glaze"


def load_pose() -> dict:
    if POSE_PATH.is_file():
        return json.loads(POSE_PATH.read_text())
    return {
        "yaw": -1.55,
        "pitch": 0.05,
        "headYaw": 0.22,
        "headPitch": 0.08,
        "zoom": 0.74,
        "fov": 34,
        "rightArmX": -0.38,
        "rightArmZ": 0.05,
        "leftArmX": 0.2,
        "leftArmZ": -0.04,
        "rightLegX": 0.12,
        "leftLegX": -0.1,
        "height": 600,
        "outline": 2,
        "anchor": [5.6, 0, 0.85],
        "anchorOffset": [-12, 18],
        "sky": {"box": [1200, 1050, 2796, 2048], "brightness": 0.92, "color": 1.05},
    }


def export_editor_assets(sky: Image.Image, pose: dict) -> None:
    EDITOR_DIR.mkdir(parents=True, exist_ok=True)
    if IRAQIES_SKIN.is_file():
        shutil.copy(IRAQIES_SKIN, EDITOR_DIR / "iraqies.png")
    if IRAQIES_CAPE.is_file():
        shutil.copy(IRAQIES_CAPE, EDITOR_DIR / "iraqies-cape.png")
    if ARMOR_OUTER.is_file():
        shutil.copy(ARMOR_OUTER, EDITOR_DIR / "armor-outer.png")
    if ARMOR_INNER.is_file():
        shutil.copy(ARMOR_INNER, EDITOR_DIR / "armor-inner.png")
    box = tuple(pose.get("sky", {}).get("box", [1200, 1050, 2796, 2048]))
    sky.convert("RGB").save(EDITOR_DIR / "sky-full.jpg", quality=85, optimize=True)
    sky.crop(box).resize((1600, 1000), Image.Resampling.LANCZOS).save(EDITOR_DIR / "sky.jpg", quality=88)
    if ZIP_PATH.is_file():
        with zipfile.ZipFile(ZIP_PATH) as zf:
            copies = {
                "pack.png": "pack.png",
                "assets/minecraft/textures/gui/widgets.png": "widgets.png",
                "assets/minecraft/textures/gui/icons.png": "icons.png",
            }
            item_copies = {
                "assets/minecraft/textures/items/diamond_sword.png": "sword.png",
                "assets/minecraft/textures/items/bow_standby.png": "bow.png",
                "assets/minecraft/textures/items/apple_golden.png": "gapple.png",
                "assets/minecraft/textures/items/ender_pearl.png": "pearl.png",
                "assets/minecraft/textures/items/fishing_rod_uncast.png": "rod.png",
                "assets/minecraft/textures/items/diamond_pickaxe.png": "pickaxe.png",
                "assets/minecraft/textures/items/diamond_axe.png": "axe.png",
                "assets/minecraft/textures/items/potion_bottle_drinkable.png": "pot.png",
                "assets/minecraft/textures/items/snowball.png": "snowball.png",
                "assets/minecraft/textures/items/flint_and_steel.png": "flint.png",
            }
            items_dir = EDITOR_DIR / "items"
            items_dir.mkdir(parents=True, exist_ok=True)
            for src, dest in copies.items():
                (EDITOR_DIR / dest).write_bytes(zf.read(src))
            for src, dest in item_copies.items():
                data = zf.read(src)
                (EDITOR_DIR / dest).write_bytes(data)
                (items_dir / dest).write_bytes(data)
    (EDITOR_DIR / "pose.json").write_text(json.dumps(pose, indent=2) + "\n")


def sky_backdrop(sky: Image.Image, pose: dict) -> Image.Image:
    cfg = pose.get("sky") or {}
    box = tuple(cfg.get("box", [1200, 1050, 2796, 2048]))
    crop = sky.crop(box).resize((W, H), Image.Resampling.LANCZOS)
    crop = ImageEnhance.Brightness(crop).enhance(float(cfg.get("brightness", 0.92)))
    crop = ImageEnhance.Color(crop).enhance(float(cfg.get("color", 1.05)))
    return crop.convert("RGBA")


def fetch_iraqies_skin() -> tuple[Image.Image, Image.Image | None]:
    """Download Iraqies' slim skin (and cape) from Mojang, falling back to cache."""
    IRAQIES_SKIN.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "1.8packs-thumb/1.0"}

    def grab(url: str) -> bytes:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read()

    try:
        profile = json.loads(
            grab(f"https://sessionserver.mojang.com/session/minecraft/profile/{IRAQIES_UUID}")
        )
        textures = json.loads(base64.b64decode(profile["properties"][0]["value"]).decode())
        skin_url = textures["textures"]["SKIN"]["url"].replace("http://", "https://")
        IRAQIES_SKIN.write_bytes(grab(skin_url))
        cape = textures["textures"].get("CAPE")
        if cape:
            IRAQIES_CAPE.write_bytes(grab(cape["url"].replace("http://", "https://")))
    except Exception:
        if not IRAQIES_SKIN.is_file():
            raise RuntimeError("Could not download Iraqies' skin and no cache exists.") from None

    skin = Image.open(IRAQIES_SKIN).convert("RGBA")
    cape_im = Image.open(IRAQIES_CAPE).convert("RGBA") if IRAQIES_CAPE.is_file() else None
    return skin, cape_im


def load_zip() -> zipfile.ZipFile:
    return zipfile.ZipFile(ZIP_PATH)


def tex(zf: zipfile.ZipFile, rel: str) -> Image.Image:
    data = zf.read(f"assets/minecraft/textures/{rel}")
    return Image.open(BytesIO(data)).convert("RGBA")


def nn(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.NEAREST)


def punch_dark(im: Image.Image, thresh: int = 10) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    dark = arr[..., :3].max(axis=2) <= thresh
    arr[..., 3] = np.where(dark, 0, arr[..., 3])
    return Image.fromarray(arr, "RGBA")


def dilate_alpha(alpha: Image.Image, radius: int) -> Image.Image:
    out = alpha
    for _ in range(max(1, radius)):
        out = out.filter(ImageFilter.MaxFilter(3))
    return out


def outline_layer(
    im: Image.Image,
    outer: tuple[int, int, int, int] = OUTLINE,
    inner: tuple[int, int, int, int] | None = RIM,
    outer_w: int = 4,
    inner_w: int = 2,
) -> Image.Image:
    a = im.split()[-1]
    outer_a = dilate_alpha(a, outer_w)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ring = Image.new("RGBA", im.size, outer)
    ring.putalpha(ImageChops.subtract(outer_a, a))
    out.alpha_composite(ring)
    if inner is not None and inner_w > 0:
        inner_a = dilate_alpha(a, inner_w)
        rim = Image.new("RGBA", im.size, inner)
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


def blit_quad(buf: np.ndarray, tex_im: Image.Image, pts, light: float, zbuf=None, z=None) -> None:
    tex_a = np.array(tex_im.convert("RGBA"), dtype=np.uint8)
    th, tw = tex_a.shape[:2]
    if tw < 1 or th < 1:
        return
    p0 = np.array(pts[0], dtype=np.float64)
    p1 = np.array(pts[1], dtype=np.float64)
    p3 = np.array(pts[3], dtype=np.float64)
    basis = np.column_stack((p1 - p0, p3 - p0))
    det = np.linalg.det(basis)
    if abs(det) < 1e-6:
        return
    inv = np.linalg.inv(basis)

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    minx = max(0, int(np.floor(min(xs))))
    maxx = min(buf.shape[1], int(np.ceil(max(xs))) + 1)
    miny = max(0, int(np.floor(min(ys))))
    maxy = min(buf.shape[0], int(np.ceil(max(ys))) + 1)
    if minx >= maxx or miny >= maxy:
        return

    yy, xx = np.mgrid[miny:maxy, minx:maxx]
    uv = np.stack([xx - p0[0], yy - p0[1]], axis=-1) @ inv.T
    u, v = uv[..., 0], uv[..., 1]
    mask = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    if not mask.any():
        return

    tx = np.clip((u * (tw - 1)).astype(np.int32), 0, tw - 1)
    ty = np.clip((v * (th - 1)).astype(np.int32), 0, th - 1)
    sampled = tex_a[ty, tx].astype(np.float32)
    sampled[..., :3] *= light
    np.clip(sampled, 0, 255, out=sampled)

    dest = buf[miny:maxy, minx:maxx].astype(np.float32)
    alpha = (sampled[..., 3:4] / 255.0) * mask[..., None]
    if zbuf is not None and z is not None:
        if isinstance(z, tuple):
            z0, z1, z3 = z
            zpix = z0 + u * (z1 - z0) + v * (z3 - z0)
        else:
            zpix = np.full(u.shape, float(z), dtype=np.float64)
        closer = (zpix >= zbuf[miny:maxy, minx:maxx]) & (alpha[..., 0] > 0.04)
        alpha = alpha * closer[..., None]
        zbuf[miny:maxy, minx:maxx] = np.where(closer, zpix, zbuf[miny:maxy, minx:maxx])
    out = dest * (1 - alpha) + sampled * alpha
    buf[miny:maxy, minx:maxx] = out.astype(np.uint8)


def iso(x: float, y: float, z: float, origin, unit: float = FACE) -> tuple[float, float]:
    ox, oy = origin
    sx = ox + (x - z) * unit
    sy = oy + (x + z) * (unit * 0.5) - y * unit
    return sx, sy


def cube_faces(x: float, y: float, z: float, origin):
    cx, cy = iso(x, y, z, origin)
    s = FACE
    top = ((cx, cy - s * 0.5), (cx + s, cy), (cx, cy + s * 0.5), (cx - s, cy))
    right = ((cx, cy + s * 0.5), (cx + s, cy), (cx + s, cy + s), (cx, cy + s * 0.5 + s))
    left = ((cx - s, cy), (cx, cy + s * 0.5), (cx, cy + s * 0.5 + s), (cx - s, cy + s))
    return top, right, left


def ao_top(occ: set, x: int, y: int, z: int) -> float:
    shade = 1.0
    for dx, dz in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        if (x + dx, y, z + dz) in occ:
            shade -= 0.05
        if (x + dx, y + 1, z + dz) in occ:
            shade -= 0.1
    return max(0.62, shade)


def ao_right(occ: set, x: int, y: int, z: int) -> float:
    shade = 1.0
    if (x + 1, y + 1, z) in occ:
        shade -= 0.16
    if (x, y + 1, z) in occ:
        shade -= 0.06
    if (x + 1, y, z + 1) in occ:
        shade -= 0.07
    if (x + 1, y, z - 1) in occ:
        shade -= 0.07
    return max(0.62, shade)


def ao_left(occ: set, x: int, y: int, z: int) -> float:
    shade = 1.0
    if (x, y + 1, z + 1) in occ:
        shade -= 0.16
    if (x, y + 1, z) in occ:
        shade -= 0.06
    if (x + 1, y, z + 1) in occ:
        shade -= 0.07
    if (x - 1, y, z + 1) in occ:
        shade -= 0.07
    return max(0.62, shade)


def draw_cube(buf, tex_im, x, y, z, origin, occ: set, opaque: bool) -> None:
    top, right, left = cube_faces(x, y, z, origin)
    if (not opaque) or (x, y, z + 1) not in occ:
        blit_quad(buf, tex_im, left, LIGHT_LEFT * ao_left(occ, x, y, z))
    if (not opaque) or (x + 1, y, z) not in occ:
        blit_quad(buf, tex_im, right, LIGHT_RIGHT * ao_right(occ, x, y, z))
    if (not opaque) or (x, y + 1, z) not in occ:
        blit_quad(buf, tex_im, top, LIGHT_TOP * ao_top(occ, x, y, z))


def draw_contact_shadow(buf, cubes, origin) -> None:
    blob = Image.new("RGBA", (8, 8), (0, 0, 0, 170))
    for x, y, z, _tex, _opaque in cubes:
        if y != 0:
            continue
        top, _, _ = cube_faces(x + 0.25, -0.45, z - 0.12, origin)
        blit_quad(buf, blob, top, 1.0)


def build_set(blocks: dict[str, Image.Image]) -> list[tuple[int, int, int, Image.Image, bool]]:
    ice = blocks["ice"]
    packed = blocks["ice_packed"]
    obsidian = blocks["obsidian"]
    coal = blocks["coal_block"]
    ore = blocks["diamond_ore"]
    diamond = blocks["diamond_block"]
    glass = blocks["glass_light_blue"]
    dark = blocks["prismarine_dark"]
    black = blocks["wool_colored_black"]
    cyan_wool = blocks["wool_colored_cyan"]

    cubes: list[tuple[int, int, int, Image.Image, bool]] = []

    def add(x, y, z, t, opaque=True):
        cubes.append((x, y, z, t, opaque))

    for x in range(8):
        for z in range(6):
            if z >= 4 or x <= 1:
                add(x, 0, z, obsidian if (x + z) % 2 else coal)
            elif (x + z) % 5 == 0:
                add(x, 0, z, packed)
            elif (x + z) % 3 == 0:
                add(x, 0, z, cyan_wool)
            else:
                add(x, 0, z, ice)

    for x in range(8):
        h = 4 if x < 3 else 3
        for y in range(1, h):
            n = (x * 11 + y * 5) % 13
            if n in (1, 7, 12):
                t, op = ore, True
            elif n in (3, 9):
                t, op = dark, True
            elif n == 4:
                t, op = black, True
            elif n in (6, 10):
                t, op = glass, False
            else:
                t, op = obsidian, True
            add(x, y, 5, t, op)

    for z in range(6):
        for y in range(1, 3):
            add(0, y, z, coal if (y + z) % 2 else obsidian)

    for x, y, z, t, op in (
        (5, 1, 1, diamond, True),
        (6, 1, 1, ore, True),
        (6, 2, 1, glass, False),
        (7, 1, 0, diamond, True),
        (7, 2, 0, diamond, True),
        (7, 3, 0, glass, False),
        (4, 1, 2, ore, True),
        (3, 1, 3, glass, False),
        (2, 1, 4, ore, True),
    ):
        add(x, y, z, t, op)

    return cubes


def title_font(size: int) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if FONT_BOLD.exists() else FONT_FALLBACK
    return ImageFont.truetype(str(path), size)


def draw_brand(canvas: Image.Image, pack_png: Image.Image) -> None:
    icon = pack_png.convert("RGBA").resize((360, 360), Image.Resampling.LANCZOS)
    icon = outline_layer(icon, outer_w=5, inner_w=2)
    icon = drop_shadow(icon, 10, 14, 10, 170)
    font = title_font(128)
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = dummy.textbbox((0, 0), "Glaze", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    gap = 20
    group_w = icon.width + gap + tw
    x0 = (W - group_w) // 2
    y0 = 8
    canvas.alpha_composite(icon, (x0, y0))

    tx = x0 + icon.width + gap
    ty = y0 + (icon.height - th) // 2 - bbox[1]
    draw = ImageDraw.Draw(canvas)
    for r in range(6, 0, -1):
        col = OUTLINE if r > 2 else RIM
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if dx * dx + dy * dy > r * r:
                    continue
                if r > 2 and dx * dx + dy * dy < (r - 1) * (r - 1):
                    continue
                draw.text((tx + dx, ty + dy), "Glaze", font=font, fill=col)
    draw.text((tx, ty), "Glaze", font=font, fill=NAME_COLOR + (255,))


def pop_item(
    im: Image.Image,
    size: int,
    angle: float,
    glow: tuple[int, int, int] | None = None,
    *,
    heavy: bool = False,
) -> Image.Image:
    item = punch_dark(nn(im, size))
    item = outline_layer(item, outer_w=5 if heavy else 2, inner_w=2 if heavy else 1)
    if angle:
        item = item.rotate(angle, resample=Image.Resampling.NEAREST, expand=True)
    if glow:
        aura = Image.new("RGBA", item.size, (0, 0, 0, 0))
        a = item.split()[-1]
        g = Image.new("RGBA", item.size, glow + (0,))
        g.putalpha(a)
        g = g.filter(ImageFilter.GaussianBlur(14 if heavy else 4))
        aura.alpha_composite(ImageEnhance.Brightness(g).enhance(1.4 if heavy else 1.1))
        aura.alpha_composite(item)
        item = aura
    if heavy:
        return drop_shadow(item, 10, 14, 8, 150)
    return drop_shadow(item, 3, 4, 3, 80)


def draw_hud(canvas: Image.Image, widgets: Image.Image, icons: Image.Image, items: dict[str, Image.Image]) -> None:
    s = HUD_SCALE
    hotbar = widgets.crop((0, 0, 62, 22)).resize((62 * s, 22 * s), Image.Resampling.NEAREST)
    select = widgets.crop((0, 22, 24, 46)).resize((24 * s, 24 * s), Image.Resampling.NEAREST)
    hotbar = outline_layer(hotbar, outer_w=3, inner_w=1)
    select = outline_layer(select, outer_w=2, inner_w=1)
    heart = outline_layer(punch_dark(nn(icons.crop((52, 0, 61, 9)), 12 * s)), outer_w=3, inner_w=1)
    hunger = outline_layer(punch_dark(nn(icons.crop((52, 27, 61, 36)), 12 * s)), outer_w=3, inner_w=1)

    slot = 16 * s
    icon = int(slot * 1.05)
    sword = pop_item(items["sword"], icon, -8)
    bow = pop_item(items["bow"], icon, 6)
    gapple = pop_item(items["gapple"], icon, 4)

    hb_w, hb_h = hotbar.size
    heart_step = 10 * s
    hearts_w = 2 * heart_step + heart.width
    gap = 14

    hb_x = 22 + hearts_w + gap
    hb_y = H - 36 - hb_h
    slot_cy = hb_y + 3 * s + slot // 2
    hearts_x = 22
    hearts_y = slot_cy - heart.height // 2
    hunger_x = hb_x + hb_w + gap
    hunger_y = slot_cy - hunger.height // 2

    canvas.alpha_composite(hotbar, (hb_x, hb_y))
    canvas.alpha_composite(select, (hb_x - s, hb_y - s))

    slots = (
        (sword, 0, 0),
        (bow, 0, 0),
        (gapple, 0, 0),
    )
    for i, (item, dx, dy) in enumerate(slots):
        cx = hb_x + (3 + i * 20) * s + slot // 2
        cy = hb_y + 3 * s + slot // 2
        canvas.alpha_composite(item, (cx - item.width // 2 + dx, cy - item.height // 2 + dy))

    for i in range(3):
        canvas.alpha_composite(heart, (hearts_x + i * heart_step, hearts_y))
    for i in range(3):
        canvas.alpha_composite(hunger, (hunger_x + i * heart_step, hunger_y))


def fill_rect(px, x0, y0, x1, y1, color) -> None:
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[x, y] = color


def make_classic_steve() -> Image.Image:
    im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    px = im.load()
    skin = (189, 152, 121, 255)
    skin_d = (152, 114, 86, 255)
    hair = (39, 27, 12, 255)
    shirt = (0, 148, 207, 255)
    shirt_d = (0, 112, 163, 255)
    pants = (39, 39, 166, 255)
    pants_d = (28, 28, 132, 255)
    white = (236, 236, 236, 255)
    eye = (36, 28, 92, 255)
    brow = (48, 32, 16, 255)
    mouth = (118, 74, 58, 255)

    fill_rect(px, 8, 0, 16, 8, hair)
    fill_rect(px, 16, 0, 24, 8, skin_d)
    fill_rect(px, 0, 8, 32, 16, skin)
    fill_rect(px, 8, 8, 16, 10, hair)
    px[8, 8] = hair
    px[15, 8] = hair
    fill_rect(px, 24, 8, 32, 10, hair)
    for x in (9, 14):
        px[x, 10] = brow
        px[x + 1, 10] = brow
    px[10, 11] = white
    px[11, 11] = eye
    px[13, 11] = white
    px[14, 11] = eye
    px[10, 12] = white
    px[13, 12] = white
    px[12, 13] = skin_d
    for x in range(10, 14):
        px[x, 14] = mouth

    fill_rect(px, 20, 16, 28, 20, shirt)
    fill_rect(px, 28, 16, 36, 20, shirt_d)
    fill_rect(px, 16, 20, 20, 32, shirt_d)
    fill_rect(px, 20, 20, 28, 32, shirt)
    fill_rect(px, 28, 20, 32, 32, shirt_d)
    fill_rect(px, 32, 20, 40, 32, shirt_d)
    fill_rect(px, 44, 16, 48, 20, skin)
    fill_rect(px, 48, 16, 52, 20, skin_d)
    fill_rect(px, 40, 20, 44, 32, skin_d)
    fill_rect(px, 44, 20, 48, 32, skin)
    fill_rect(px, 48, 20, 52, 32, skin_d)
    fill_rect(px, 52, 20, 56, 32, skin_d)
    fill_rect(px, 4, 16, 8, 20, pants)
    fill_rect(px, 8, 16, 12, 20, pants_d)
    fill_rect(px, 0, 20, 4, 32, pants_d)
    fill_rect(px, 4, 20, 8, 32, pants)
    fill_rect(px, 8, 20, 12, 32, pants_d)
    fill_rect(px, 12, 20, 16, 32, pants_d)
    fill_rect(px, 36, 48, 40, 52, skin)
    fill_rect(px, 40, 48, 44, 52, skin_d)
    fill_rect(px, 32, 52, 36, 64, skin_d)
    fill_rect(px, 36, 52, 40, 64, skin)
    fill_rect(px, 40, 52, 44, 64, skin_d)
    fill_rect(px, 44, 52, 48, 64, skin_d)
    fill_rect(px, 20, 48, 24, 52, pants)
    fill_rect(px, 24, 48, 28, 52, pants_d)
    fill_rect(px, 16, 52, 20, 64, pants_d)
    fill_rect(px, 20, 52, 24, 64, pants)
    fill_rect(px, 24, 52, 28, 64, pants_d)
    fill_rect(px, 28, 52, 32, 64, pants_d)
    return im


def _paste(dst, src, box, dest):
    crop = src.crop(box)
    dst.paste(crop, dest, crop)


def _mirror_limb(im):
    """Mirror a 16x16 Minecraft limb layout (top, bottom, right, front, left, back)."""
    out = Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    def face(src_box, dest):
        crop = im.crop(src_box).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        out.paste(crop, dest, crop)

    face((4, 0, 8, 4), (4, 0))
    face((8, 0, 12, 4), (8, 0))
    face((4, 4, 8, 16), (4, 4))
    face((12, 4, 16, 16), (12, 4))
    face((0, 4, 4, 16), (8, 4))
    face((8, 4, 12, 16), (0, 4))
    return out


def prepare_armor_maps(layer1: Image.Image, layer2: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Turn vanilla 64x32 armor into 64x64 maps that match skinview3d UVs."""
    l1 = layer1.convert("RGBA")
    l2 = layer2.convert("RGBA")

    outer = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    _paste(outer, l1, (0, 0, 32, 16), (32, 0))
    _paste(outer, l1, (16, 16, 40, 32), (16, 32))
    _paste(outer, l1, (40, 16, 56, 32), (40, 32))
    left_arm = _mirror_limb(l1.crop((40, 16, 56, 32)))
    outer.paste(left_arm, (48, 48), left_arm)
    _paste(outer, l1, (0, 16, 16, 32), (0, 32))
    left_boot = _mirror_limb(l1.crop((0, 16, 16, 32)))
    outer.paste(left_boot, (0, 48), left_boot)

    inner = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    inner.paste(l2.crop((0, 0, 64, min(32, l2.height))), (0, 0))
    left_leg = _mirror_limb(l2.crop((0, 16, 16, 32)))
    inner.paste(left_leg, (16, 48), left_leg)
    return outer, inner


def paste_player(canvas, player, pose) -> None:
    alpha = player.split()[-1].point(lambda v: 255 if v >= 40 else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        return
    player = player.crop(bbox)
    target_h = int(pose.get("height", 820))
    scale = target_h / player.height
    player = player.resize((max(1, int(player.width * scale)), target_h), Image.Resampling.LANCZOS)
    outline = int(pose.get("outline", 2))
    player = outline_layer(player, outer_w=outline, inner_w=1)
    ox, oy = pose.get("anchorOffset", [8, 0])
    x = W - player.width + int(ox) - 8
    y = H - player.height + int(oy) - 18
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        (x + player.width * 0.22, H - 130, x + player.width * 0.78, H - 24),
        fill=(0, 0, 0, 150),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    canvas.alpha_composite(player, (x, y))


def main() -> None:
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    pose = load_pose()
    skin, cape = fetch_iraqies_skin()

    with load_zip() as zf:
        items = {
            "sword": tex(zf, "items/diamond_sword.png"),
            "bow": tex(zf, "items/bow_standby.png"),
            "gapple": tex(zf, "items/apple_golden.png"),
        }
        icons = tex(zf, "gui/icons.png")
        widgets = tex(zf, "gui/widgets.png")
        layer1 = tex(zf, "models/armor/diamond_layer_1.png")
        layer2 = tex(zf, "models/armor/diamond_layer_2.png")
        sky = Image.open(BytesIO(zf.read("assets/minecraft/mcpatcher/sky/world0/starfield03.png"))).convert("RGB")
        pack_png = Image.open(BytesIO(zf.read("pack.png")))

    canvas = sky_backdrop(sky, pose)

    IRAQIES_SKIN.parent.mkdir(parents=True, exist_ok=True)
    skin.save(IRAQIES_SKIN)
    armor_outer, armor_inner = prepare_armor_maps(layer1, layer2)
    armor_outer.save(ARMOR_OUTER)
    armor_inner.save(ARMOR_INNER)
    cape_path = IRAQIES_CAPE if cape is not None else None
    render_player(
        IRAQIES_SKIN,
        PLAYER_PNG,
        cape_path=cape_path,
        model="slim",
        armor_outer=ARMOR_OUTER,
        armor_inner=ARMOR_INNER,
        pose=pose,
    )
    paste_player(canvas, Image.open(PLAYER_PNG).convert("RGBA"), pose)
    export_editor_assets(sky, pose)

    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse((-80, -100, W + 40, H + 80), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(90))
    darkened = ImageEnhance.Brightness(canvas).enhance(0.8)
    canvas = Image.composite(canvas, darkened, vig)

    draw_brand(canvas, pack_png)
    draw_hud(canvas, widgets, icons, items)

    rgb = canvas.convert("RGB")
    rgb.save(OUT_PNG, "PNG")
    rgb.save(OUT_WEBP, "WEBP", quality=90, method=6)
    print(f"wrote {OUT_WEBP} and {OUT_PNG}")


if __name__ == "__main__":
    main()
