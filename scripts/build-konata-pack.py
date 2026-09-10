#!/usr/bin/env python3
"""Build a 1.8.9 Konata Izumi PvP pack.

Three sources are combined:

  * Oogway 16x supplies the world: blocks, CTM, font, HUD, and the sky plates
    the custom sky is painted onto.
  * Sea Shore 16x supplies the held gear. Oogway's swords and tools are washed
    out and low-contrast, and Sea Shore's cornflower blades with pink tool
    accents happen to be Konata's own palette — her hair and her uniform.
  * The 1.21.5 "Konata Pack V1.1" by Yuku_AWP supplies her paintings and bed.
    Its GUI files cannot be reused: 1.21 moved the slot rows out into sprites,
    so those PNGs only carry the top panel and would render half-empty in 1.8.
  * scripts/assets/konata/ holds screencaps and renders used for the GUIs,
    menu panorama, custom sky, and pack icon.

Container GUIs are drawn on vanilla 1.8.9 geometry: art fills the panel, then
the vanilla panel is composited back at partial alpha so the slot grid stays
readable. The vanilla alpha channel doubles as the mask, so nothing bleeds into
the unused parts of the sheet.
"""

from __future__ import annotations

import json
import shutil
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SKY = "assets/minecraft/mcpatcher/sky/world0"
ART = ROOT / "scripts/assets/konata"
BASE_ZIP = ROOT / "public/downloads/Oogway-16x.zip"
ITEMS_ZIP = ROOT / "public/downloads/Sea-Shore-16x.zip"
KONATA_ZIP = Path.home() / "Downloads/konata-pack-v1-1.zip"
VANILLA_JAR = Path.home() / ".minecraft/versions/1.8.9/1.8.9.jar"
OUT_ZIP = ROOT / "public/downloads/Konata-Izumi-16x.zip"

TEX = "assets/minecraft/textures"
HAIR = (0x59, 0x8A, 0xD2)
HAIR_LIGHT = (0x70, 0xC8, 0xF8)

# Panel art per container screen: art source, panel size, vanilla panel opacity.
# The alpha bbox is not usable as the panel rect — several sheets park extra
# sprites outside the window (inventory.png keeps the potion-effect plates
# below it), and filling those with art stretches the face across dead space.
GUI_ART = {
    "inventory.png": ("peace", (176, 166), 0.52),
    # The chest panel is the tallest window, so it needs portrait art; a
    # widescreen wallpaper crops down to background and loses her entirely.
    "generic_54.png": ("wedding", (176, 222), 0.52),
    "crafting_table.png": ("classroom", (176, 166), 0.52),
    "furnace.png": ("good-job", (176, 166), 0.52),
    "dispenser.png": ("ep7", (176, 166), 0.52),
    "hopper.png": ("blue-sketch", (176, 133), 0.52),
    "anvil.png": ("album", (176, 166), 0.52),
    "brewing_stand.png": ("album", (176, 166), 0.52),
    "enchanting_table.png": ("blue-sketch", (176, 166), 0.52),
    "villager.png": ("good-job", (176, 166), 0.52),
    "horse.png": ("ep7", (176, 166), 0.52),
    "beacon.png": ("classroom", (230, 219), 0.52),
    "tab_inventory.png": ("peace", (195, 136), 0.55),
    "tab_items.png": ("peace", (195, 136), 0.55),
    "tab_item_search.png": ("peace", (195, 136), 0.55),
}
GUI_SCALE = 4

# 1.8.9 painting atlas: name -> (col, row, cellsWide, cellsHigh) at 16px cells.
PAINTINGS = {
    "kebab": (0, 0, 1, 1), "aztec": (1, 0, 1, 1), "alban": (2, 0, 1, 1),
    "aztec2": (3, 0, 1, 1), "bomb": (4, 0, 1, 1), "plant": (5, 0, 1, 1),
    "wasteland": (6, 0, 1, 1),
    "pool": (0, 2, 2, 1), "courbet": (2, 2, 2, 1), "sea": (4, 2, 2, 1),
    "sunset": (6, 2, 2, 1), "creebet": (8, 2, 2, 1),
    "wanderer": (0, 4, 1, 2), "graham": (1, 4, 1, 2),
    "fighters": (0, 6, 4, 2),
    "match": (0, 8, 2, 2), "bust": (2, 8, 2, 2), "stage": (4, 8, 2, 2),
    "void": (6, 8, 2, 2), "skull_and_roses": (8, 8, 2, 2), "wither": (10, 8, 2, 2),
    "pointer": (0, 12, 4, 4), "pigscene": (4, 12, 4, 4), "burning_skull": (8, 12, 4, 4),
    "skeleton": (12, 4, 4, 3), "donkey_kong": (12, 7, 4, 3),
}

# Menu panorama, clockwise from north, then up and down.
PANORAMA = ["wallpaper", "peace", "album", "wedding", "classroom", "good-job"]

# Horizon-facing cells of the 3x2 skybox sheet, matching how Haimiya (the one
# proven character sky in the catalog) places its art.
SKY_FACES = {
    (2, 0): "peace",
    (0, 1): "render",
    (1, 1): "wedding",
    (2, 1): "album",
}

# Oogway's eight sky layers point at four textures it does not ship. Replace
# the lot with Haimiya's arrangement: replace by day, screen by night.
SKY_PROPERTIES = {
    "sky1.properties": (
        "startFadeIn=5:30\nendFadeIn=6:00\nstartFadeOut=17:50\nendFadeOut=18:40\n"
        "blend=replace\nrotate=true\naxis=0.0 -0.2 0.0\nsource=./cloud1.png\n"
    ),
    "sky2.properties": (
        "startFadeIn=18:30\nendFadeIn=18:45\nendFadeOut=5:25\n"
        "blend=screen\nrotate=true\naxis=0.0 -0.2 0.0\nsource=./starfield03.png\n"
    ),
}


def log(msg: str) -> None:
    print(msg, flush=True)


def load_art(name: str) -> Image.Image:
    return Image.open(ART / f"{name}.png").convert("RGBA")


def zip_entries(zf: zipfile.ZipFile) -> list[str]:
    return [
        n for n in zf.namelist()
        if not n.endswith("/") and not n.startswith("__MACOSX/") and not Path(n).name.startswith("._")
    ]


def find(zf: zipfile.ZipFile, suffix: str) -> bytes | None:
    for n in zip_entries(zf):
        if n.lower().endswith(suffix.lower()):
            return zf.read(n)
    return None


def cover_fit(art: Image.Image, w: int, h: int, focus_y: float = 0.32) -> Image.Image:
    """Scale to cover w*h and crop, biasing the crop toward her face."""
    scale = max(w / art.width, h / art.height)
    sized = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.Resampling.LANCZOS)
    left = (sized.width - w) // 2
    top = int(max(0, min(sized.height - h, sized.height * focus_y - h * focus_y)))
    return sized.crop((left, top, left + w, top + h)).convert("RGBA")


def build_gui(vanilla: Image.Image, art: Image.Image, panel: tuple[int, int], panel_alpha: float) -> Image.Image:
    """Konata art inside the panel, vanilla chrome on top so slots stay legible."""
    big = vanilla.resize((vanilla.width * GUI_SCALE, vanilla.height * GUI_SCALE), Image.Resampling.NEAREST)
    mask = big.split()[-1]
    pw, ph = panel[0] * GUI_SCALE, panel[1] * GUI_SCALE

    plate = Image.new("RGBA", big.size, (0, 0, 0, 0))
    plate.paste(cover_fit(art, pw, ph), (0, 0))
    plate = ImageEnhance.Brightness(plate).enhance(0.96)

    # Only the window is faded; sprites outside it keep their vanilla look.
    chrome = big.copy()
    faded = mask.copy()
    faded.paste(mask.crop((0, 0, pw, ph)).point(lambda v: int(v * panel_alpha)), (0, 0))
    chrome.putalpha(faded)

    out = Image.alpha_composite(plate, chrome)
    out.putalpha(mask)
    return out


def konata_item(base: Image.Image, face: Image.Image, strength: float = 0.62) -> Image.Image:
    """Put her face inside an item sprite, keeping the sprite's silhouette."""
    # Enough room for a readable face without blowing a 512px sprite up to 2048.
    scale = max(1, -(-128 // base.width))
    big = base.resize((base.width * scale, base.height * scale), Image.Resampling.NEAREST)
    mask = big.split()[-1]
    tile = cover_fit(face, big.width, big.height, focus_y=0.18)
    tile.putalpha(tile.split()[-1].point(lambda v: int(v * strength)))
    out = Image.alpha_composite(big, tile)
    out.putalpha(mask)
    return out


def build_paintings(kon: zipfile.ZipFile) -> Image.Image:
    atlas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    placed = 0
    for name, (col, row, cw, ch) in PAINTINGS.items():
        data = find(kon, f"textures/painting/{name}.png")
        if not data:
            continue
        im = Image.open(BytesIO(data)).convert("RGBA")
        want = (cw * 16, ch * 16)
        if im.size != want:
            im = im.resize(want, Image.Resampling.LANCZOS)
        atlas.paste(im, (col * 16, row * 16))
        placed += 1
    log(f"  paintings: {placed}/{len(PAINTINGS)} placed")
    return atlas


def build_panorama() -> dict[str, Image.Image]:
    faces = {}
    for i, name in enumerate(PANORAMA):
        art = load_art(name)
        face = cover_fit(art, 1024, 1024, focus_y=0.30)
        if i == 5:  # looking straight down reads better dimmed
            face = ImageEnhance.Brightness(face).enhance(0.7)
        faces[f"panorama_{i}.png"] = face.convert("RGB")
    return faces


def feathered(art: Image.Image, cell: int) -> Image.Image:
    """Fit art into a skybox cell, fading its edges so it sits in the clouds."""
    scale = min(cell * 0.92 / art.width, cell * 0.92 / art.height)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.Resampling.LANCZOS)

    alpha = art.split()[-1]
    if alpha.getextrema()[0] > 250:
        # An opaque screencap needs a soft edge of its own or it reads as a
        # photo taped to the sky.
        pad = max(8, min(art.size) // 12)
        alpha = Image.new("L", art.size, 0)
        ImageDraw.Draw(alpha).rectangle((pad, pad, art.width - pad, art.height - pad), fill=255)
        alpha = alpha.filter(ImageFilter.GaussianBlur(pad * 0.7))
    art.putalpha(alpha)

    tile = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    tile.alpha_composite(art, ((cell - art.width) // 2, (cell - art.height) // 2))
    return tile


def overlay_sky(base: Image.Image, arts: dict[tuple[int, int], str], opacity: float) -> Image.Image:
    """Stamp her onto the horizon-facing cells of an OptiFine 3x2 skybox sheet.

    Cells (0,0) and (1,0) are the poles: art there ends up stretched over the
    zenith and nadir, so they stay plain sky.
    """
    out = base.convert("RGBA")
    cell = base.width // 3
    for (cx, cy), art_name in arts.items():
        tile = feathered(load_art(art_name), cell)
        tile.putalpha(tile.split()[-1].point(lambda v: int(v * opacity)))
        region = out.crop((cx * cell, cy * cell, cx * cell + cell, cy * cell + cell))
        out.paste(Image.alpha_composite(region, tile), (cx * cell, cy * cell))
    return out


def build_icon() -> Image.Image:
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 255))
    draw = ImageDraw.Draw(canvas)
    for y in range(512):
        t = y / 511
        draw.line(
            (0, y, 512, y),
            fill=(
                round(HAIR[0] * (1 - t) + 18 * t),
                round(HAIR[1] * (1 - t) + 26 * t),
                round(HAIR[2] * (1 - t) + 48 * t),
                255,
            ),
        )
    glow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((60, 40, 452, 432), fill=HAIR_LIGHT + (90,))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(60)))

    art = load_art("render")
    bbox = art.split()[-1].getbbox()
    if bbox:
        art = art.crop(bbox)
    scale = 470 / art.height
    art = art.resize((max(1, round(art.width * scale)), 470), Image.Resampling.LANCZOS)
    canvas.alpha_composite(art, ((512 - art.width) // 2, 512 - art.height - 6))
    # 1.8's pack list lays out the row from the icon texture size. A 512
    # pack.png leaves a huge gap before the name; 128x128 is the usual size.
    return canvas.resize((128, 128), Image.Resampling.LANCZOS)


def build_menu_tile() -> Image.Image:
    """options_background.png tiles behind every menu, so keep her subtle."""
    tile = cover_fit(load_art("classroom"), 64, 64, focus_y=0.25)
    tile = ImageEnhance.Brightness(tile).enhance(0.34)
    tint = Image.new("RGBA", (64, 64), HAIR + (70,))
    return Image.alpha_composite(tile, tint)


def png(im: Image.Image, optimize: bool = True) -> bytes:
    buf = BytesIO()
    im.save(buf, "PNG", optimize=optimize)
    return buf.getvalue()


def main() -> None:
    for path in (BASE_ZIP, KONATA_ZIP, VANILLA_JAR):
        if not path.is_file():
            raise SystemExit(f"missing input: {path}")

    out: dict[str, bytes] = {}

    log("base: Oogway 16x")
    skip_prefixes = (
        f"{TEX}/gui/container/",
        f"{TEX}/painting/",
        f"{TEX}/gui/title/background/",
    )
    with zipfile.ZipFile(BASE_ZIP) as base:
        sky_faces: dict[str, Image.Image] = {}
        for name in zip_entries(base):
            if name in ("pack.png", "pack.mcmeta") or name.startswith(skip_prefixes):
                continue
            data = base.read(name)
            if name.startswith(f"{SKY}/"):
                if name.endswith(".png"):
                    sky_faces[name] = Image.open(BytesIO(data)).convert("RGB")
                continue  # properties are rewritten below
            out[name] = data
        log(f"  carried over {len(out)} files")

    log("gear: Sea Shore 16x over the base")
    gear_prefixes = (f"{TEX}/items/", f"{TEX}/models/armor/")
    with zipfile.ZipFile(ITEMS_ZIP) as gear:
        incoming = [n for n in zip_entries(gear) if n.startswith(gear_prefixes)]
        for name in incoming:
            out[name] = gear.read(name)

        # A texture and its .mcmeta have to come from the same pack. Oogway
        # animates diamond.png as a 16x176 strip; Sea Shore's is a static
        # 48x48. Keeping Oogway's mcmeta over it tells the game to play frames
        # that do not exist, and the item silently fails to render.
        dropped = []
        for name in incoming:
            if name.endswith(".mcmeta"):
                continue
            meta = f"{name}.mcmeta"
            if meta in out and meta not in incoming:
                del out[meta]
                dropped.append(Path(name).name)
        log(f"  swapped {len(incoming)} item and armor textures")
        if dropped:
            log(f"  dropped {len(dropped)} stale mcmeta: {', '.join(sorted(dropped))}")

    log("gui: vanilla 1.8.9 geometry + Konata panels")
    with zipfile.ZipFile(VANILLA_JAR) as jar:
        gui_names = [
            n for n in jar.namelist()
            if n.startswith(f"{TEX}/gui/container/") and n.endswith(".png")
        ]
        for name in gui_names:
            leaf = Path(name).name
            vanilla = Image.open(BytesIO(jar.read(name))).convert("RGBA")
            if leaf not in GUI_ART:
                out[name] = png(vanilla)
                continue
            art_name, panel, alpha = GUI_ART[leaf]
            out[name] = png(build_gui(vanilla, load_art(art_name), panel, alpha))
            log(f"  {leaf:22} <- {art_name}")
        book = Image.open(BytesIO(jar.read(f"{TEX}/gui/book.png"))).convert("RGBA")
        out[f"{TEX}/gui/book.png"] = png(build_gui(book, load_art("wedding"), (192, 192), 0.6))

    log("items: her face on the gapples and pearls")
    face = load_art("classroom")
    with zipfile.ZipFile(VANILLA_JAR) as jar:
        for leaf in ("apple_golden.png", "ender_pearl.png"):
            rel = f"{TEX}/items/{leaf}"
            # Oogway leaves some items to vanilla, so fall back to the jar.
            data = out.get(rel) or jar.read(rel)
            sprite = Image.open(BytesIO(data)).convert("RGBA")
            faced = konata_item(sprite, face)
            out[rel] = png(faced)
            log(f"  {leaf:18} {sprite.width}px -> {faced.width}px")

    log("paintings: from Konata Pack V1.1")
    with zipfile.ZipFile(KONATA_ZIP) as kon:
        out[f"{TEX}/painting/paintings_kristoffer_zetterstrand.png"] = png(build_paintings(kon))
        for bed in ("white", "red"):
            data = find(kon, f"textures/entity/bed/{bed}.png")
            if data:
                out[f"{TEX}/entity/bed/{bed}.png"] = data

    log("menu: panorama + background tile")
    for leaf, face in build_panorama().items():
        out[f"{TEX}/gui/title/background/{leaf}"] = png(face, optimize=False)
    out[f"{TEX}/gui/options_background.png"] = png(build_menu_tile())

    log("sky: Konata on the OptiFine skybox")
    day = overlay_sky(sky_faces[f"{SKY}/cloud1.png"], SKY_FACES, 0.95).convert("RGB")

    # The night layer is screened over the dark sky, so it has to be dark
    # itself; at full brightness it washes the whole sky out to white. Dimming
    # the day composite rather than the near-black starfield keeps the clouds
    # readable, and Oogway's stars screen back in over the top.
    night = ImageEnhance.Color(ImageEnhance.Brightness(day).enhance(0.34)).enhance(0.75)
    night = ImageChops.screen(night, sky_faces[f"{SKY}/starfield03.png"])

    out[f"{SKY}/cloud1.png"] = png(day, optimize=False)
    out[f"{SKY}/starfield03.png"] = png(night, optimize=False)
    for leaf, body in SKY_PROPERTIES.items():
        out[f"{SKY}/{leaf}"] = body.encode()
    log(f"  cloud1 (day, replace) + starfield03 (night, screen), {len(SKY_FACES)} faces each")

    log("validate: animation metadata against frame counts")
    stale = []
    for name in sorted(n for n in out if n.endswith(".mcmeta") and n != "pack.mcmeta"):
        texture = name[: -len(".mcmeta")]
        if texture not in out:
            stale.append((name, "no texture"))
            continue
        try:
            anim = json.loads(out[name].decode("utf8", "replace")).get("animation")
        except Exception:
            stale.append((name, "unparsable"))
            continue
        if not isinstance(anim, dict) or not anim.get("frames"):
            continue
        sprite = Image.open(BytesIO(out[texture]))
        available = sprite.height // sprite.width if sprite.width else 0
        wanted = max(
            frame if isinstance(frame, int) else frame.get("index", 0) for frame in anim["frames"]
        )
        # A frame index past the end of the strip makes 1.8 drop the whole
        # texture rather than clamp, so the item renders as nothing.
        if wanted >= available:
            stale.append((name, f"frame {wanted} of {available}"))
    for name, why in stale:
        del out[name]
        log(f"  dropped {Path(name).name} ({why})")
    if not stale:
        log("  all animation metadata consistent")

    log("icon + mcmeta")
    out["pack.png"] = png(build_icon())
    out["pack.mcmeta"] = json.dumps(
        {
            "pack": {
                "pack_format": 1,
                "description": "\u00a78Made by \u00a7b\u00a7liraqies \u00a77@\u00a73\u00a7o18packs.pages.dev",
            }
        },
        indent=2,
    ).encode()

    OUT_ZIP.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name in sorted(out):
            zf.writestr(name, out[name])
    log(f"\nwrote {OUT_ZIP.relative_to(ROOT)}  {len(out)} files  {OUT_ZIP.stat().st_size // 1024 // 1024} MB")


if __name__ == "__main__":
    main()
