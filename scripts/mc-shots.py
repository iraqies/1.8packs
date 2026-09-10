#!/usr/bin/env python3
"""Render a resource pack's in-game preview screenshots, unattended.

Reproduces the manual Badlion routine: load the test world with the pack on at
FOV 70, teleport to a set of fixed camera positions, and capture a frame at each.

How it works
------------
Driving singleplayer would mean clicking through menus, so instead a throwaway
1.8.9 server hosts a *copy* of the world and the OptiFine client is launched
with --server, which skips the main menu entirely. Teleports then come from the
server console, so each camera position is the same `tp` string that was typed
by hand, passed through untouched rather than reinterpreted here.

The client is 1.8.9-OptiFine_HD_U_M5, the same profile the Sep 4 shots used
(Badlion just injects that OptiFine). Vanilla cannot draw these packs' CTM or
custom sky.

Nothing writes to the real .minecraft: the world is copied, and the client runs
against a generated game directory with its own options.txt.

Usage:
    python3 scripts/mc-shots.py --pack Glaze --slug glaze
    python3 scripts/mc-shots.py --pack Haimiya --slug haimiya --shots swords foods
    python3 scripts/mc-shots.py --pack Glaze --slug glaze --display :0   # use the GPU
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.request
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MC = Path.home() / ".minecraft"
CACHE = ROOT / "scripts/.cache"
SHOTS_CONFIG = ROOT / "scripts/assets/mc-shots.json"

VANILLA_VERSION = "1.8.9"
CLIENT_VERSION = "1.8.9-OptiFine_HD_U_M5"
VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest.json"

# Site zips are the same packs without section-sign filenames.
PACK_ALIASES = {
    "konata": ROOT / "public/downloads/Konata-Izumi-16x.zip",
}

# Java 8 is required: 1.8.9 ships LWJGL 2, which does not load on modern JVMs.
# These are runtimes already on disk from other launchers, so nothing is installed.
JAVA8_CANDIDATES = [
    Path.home() / ".cache/Badlion Client/Data/jre1.8.0_202/bin/java",
    Path.home() / ".local/share/PrismLauncher/java/jre-legacy/bin/java",
]

PREVIEW_WIDTH = 1600  # Matches the existing previews, a 0.625 scale of 2560x1440.


def log(msg: str) -> None:
    print(msg, flush=True)


# --------------------------------------------------------------------------- #
# environment
# --------------------------------------------------------------------------- #


def find_java8() -> Path:
    for path in JAVA8_CANDIDATES:
        if path.is_file() and os.access(path, os.X_OK):
            return path
    raise SystemExit(
        "no Java 8 runtime found. 1.8.9 needs Java 8 (LWJGL 2 will not start on newer JVMs).\n"
        "Install one with:  sudo pacman -S jre8-openjdk\n"
        f"or point JAVA8_CANDIDATES at an existing runtime. Looked in:\n  "
        + "\n  ".join(str(p) for p in JAVA8_CANDIDATES)
    )


def require_tool(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise SystemExit(f"missing required tool: {name}")
    return found


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def server_jar() -> Path:
    """Downloads the 1.8.9 dedicated server once and caches it."""
    dest = CACHE / f"minecraft_server.{VANILLA_VERSION}.jar"
    if dest.is_file():
        return dest

    CACHE.mkdir(parents=True, exist_ok=True)
    log(f"  downloading {dest.name} ...")
    manifest = json.loads(fetch(VERSION_MANIFEST))
    entry = next((v for v in manifest["versions"] if v["id"] == VANILLA_VERSION), None)
    if not entry:
        raise SystemExit(f"{VANILLA_VERSION} missing from the version manifest")
    meta = json.loads(fetch(entry["url"]))
    dest.write_bytes(fetch(meta["downloads"]["server"]["url"]))
    return dest


# --------------------------------------------------------------------------- #
# client classpath
# --------------------------------------------------------------------------- #


def rule_allows(rules: list[dict] | None) -> bool:
    """Evaluates a library's os rules for linux, mirroring the launcher."""
    if not rules:
        return True
    allowed = False
    for rule in rules:
        name = rule.get("os", {}).get("name")
        if name is not None and name != "linux":
            continue
        allowed = rule["action"] == "allow"
    return allowed


def maven_path(name: str, classifier: str | None = None) -> Path:
    group, artifact, version = name.split(":")
    tail = f"{artifact}-{version}" + (f"-{classifier}" if classifier else "") + ".jar"
    return MC / "libraries" / Path(*group.split(".")) / artifact / version / tail


def load_version_json(version_id: str) -> dict:
    """
    Loads a launcher profile, merging inheritsFrom the way the official launcher
    does. OptiFine's profile only lists its two extra jars and the tweak args;
    the rest of the classpath comes from vanilla 1.8.9.
    """
    path = MC / "versions" / version_id / f"{version_id}.json"
    if not path.is_file():
        raise SystemExit(
            f"missing {path}. Install OptiFine HD U M5 for 1.8.9 in the vanilla launcher."
        )
    data = json.loads(path.read_text())
    parent_id = data.get("inheritsFrom")
    if not parent_id:
        data["_jar"] = MC / "versions" / version_id / f"{version_id}.jar"
        return data

    parent = load_version_json(parent_id)
    merged = {**parent, **data}
    merged["libraries"] = list(data.get("libraries", [])) + list(parent.get("libraries", []))
    merged["_jar"] = parent.get("_jar") or (MC / "versions" / parent_id / f"{parent_id}.jar")
    return merged


def build_classpath(version_json: dict, natives_dir: Path) -> list[Path]:
    """Returns the client classpath and unpacks native libraries as a side effect."""
    natives_dir.mkdir(parents=True, exist_ok=True)
    classpath: list[Path] = []
    missing: list[str] = []

    for lib in version_json["libraries"]:
        if not rule_allows(lib.get("rules")):
            continue

        natives = lib.get("natives")
        if natives:
            classifier = natives.get("linux", "").replace("${arch}", "64")
            if not classifier:
                continue
            jar = maven_path(lib["name"], classifier)
            if not jar.is_file():
                missing.append(str(jar.relative_to(MC)))
                continue
            exclude = tuple(lib.get("extract", {}).get("exclude", []))
            with zipfile.ZipFile(jar) as zf:
                for member in zf.namelist():
                    if member.endswith("/") or member.startswith(exclude):
                        continue
                    target = natives_dir / Path(member).name
                    target.write_bytes(zf.read(member))
            continue

        jar = maven_path(lib["name"])
        if not jar.is_file():
            url = lib.get("downloads", {}).get("artifact", {}).get("url")
            if url:
                jar.parent.mkdir(parents=True, exist_ok=True)
                log(f"  downloading {jar.name} ...")
                jar.write_bytes(fetch(url))
        if jar.is_file():
            classpath.append(jar)
        else:
            missing.append(str(jar.relative_to(MC)))

    if missing:
        raise SystemExit(
            "the 1.8.9 / OptiFine install is missing libraries. Launch the "
            f"{CLIENT_VERSION} profile once from your launcher to download them, "
            "then retry. Missing:\n  " + "\n  ".join(missing)
        )

    client_jar = Path(version_json["_jar"])
    if not client_jar.is_file():
        raise SystemExit(f"missing client jar: {client_jar}")
    classpath.append(client_jar)
    return classpath


# --------------------------------------------------------------------------- #
# world + game directory
# --------------------------------------------------------------------------- #


def offline_uuid(username: str) -> str:
    """
    Java's UUID.nameUUIDFromBytes("OfflinePlayer:<name>"), which is what an
    offline-mode server assigns. The saved playerdata is keyed by the real Mojang
    UUID, so it has to be copied to this name or the player joins empty-handed.
    """
    digest = bytearray(hashlib.md5(f"OfflinePlayer:{username}".encode()).digest())
    digest[6] = (digest[6] & 0x0F) | 0x30  # version 3
    digest[8] = (digest[8] & 0x3F) | 0x80  # RFC 4122 variant
    return str(uuid.UUID(bytes=bytes(digest)))


def patch_nbt_int(raw: bytes, key: str, value: int) -> tuple[bytes, bool]:
    """
    Overwrites a TAG_Int in already-decompressed NBT.

    A targeted patch rather than a parse-and-rewrite: only one field changes, and
    reserialising a whole player file to flip one int risks corrupting the rest.
    """
    marker = b"\x03" + len(key).to_bytes(2, "big") + key.encode()
    at = raw.find(marker)
    if at == -1:
        return raw, False
    start = at + len(marker)
    return raw[:start] + value.to_bytes(4, "big", signed=True) + raw[start + 4 :], True


def patch_nbt_byte(raw: bytes, key: str, value: int) -> tuple[bytes, bool]:
    marker = b"\x01" + len(key).to_bytes(2, "big") + key.encode()
    at = raw.find(marker)
    if at == -1:
        return raw, False
    start = at + len(marker)
    return raw[:start] + bytes([value]) + raw[start + 1 :], True


def _nbt_read_str(buf: bytes, i: int) -> tuple[str, int]:
    length = int.from_bytes(buf[i : i + 2], "big")
    return buf[i + 2 : i + 2 + length].decode("utf-8", "replace"), i + 2 + length


def _nbt_parse(buf: bytes, i: int, tag: int):
    import struct

    if tag == 0:
        return None, i
    if tag == 1:
        return buf[i], i + 1
    if tag == 2:
        return int.from_bytes(buf[i : i + 2], "big", signed=True), i + 2
    if tag == 3:
        return int.from_bytes(buf[i : i + 4], "big", signed=True), i + 4
    if tag == 4:
        return int.from_bytes(buf[i : i + 8], "big", signed=True), i + 8
    if tag == 5:
        return struct.unpack(">f", buf[i : i + 4])[0], i + 4
    if tag == 6:
        return struct.unpack(">d", buf[i : i + 8])[0], i + 8
    if tag == 7:
        length = int.from_bytes(buf[i : i + 4], "big", signed=True)
        return buf[i + 4 : i + 4 + length], i + 4 + length
    if tag == 8:
        return _nbt_read_str(buf, i)
    if tag == 9:
        child, count = buf[i], int.from_bytes(buf[i + 1 : i + 5], "big", signed=True)
        i += 5
        items = []
        for _ in range(count):
            value, i = _nbt_parse(buf, i, child)
            items.append((child, value))
        return (child, items), i
    if tag == 10:
        data: dict = {}
        while True:
            child = buf[i]
            i += 1
            if child == 0:
                break
            key, i = _nbt_read_str(buf, i)
            value, i = _nbt_parse(buf, i, child)
            data[key] = (child, value)
        return data, i
    if tag == 11:
        count = int.from_bytes(buf[i : i + 4], "big", signed=True)
        return [int.from_bytes(buf[i + 4 + 4 * j : i + 8 + 4 * j], "big", signed=True) for j in range(count)], i + 4 + 4 * count
    if tag == 12:
        count = int.from_bytes(buf[i : i + 4], "big", signed=True)
        return count, i + 4 + 8 * count
    raise ValueError(f"unsupported nbt tag {tag}")


def _nbt_write(tag: int, name: str, value) -> bytes:
    import struct

    header = bytes([tag]) + len(name).to_bytes(2, "big") + name.encode()
    if tag == 1:
        return header + bytes([int(value) & 0xFF])
    if tag == 2:
        return header + int(value).to_bytes(2, "big", signed=True)
    if tag == 3:
        return header + int(value).to_bytes(4, "big", signed=True)
    if tag == 4:
        return header + int(value).to_bytes(8, "big", signed=True)
    if tag == 5:
        return header + struct.pack(">f", float(value))
    if tag == 6:
        return header + struct.pack(">d", float(value))
    if tag == 7:
        return header + len(value).to_bytes(4, "big", signed=True) + value
    if tag == 8:
        encoded = str(value).encode()
        return header + len(encoded).to_bytes(2, "big") + encoded
    if tag == 9:
        child, items = value
        body = bytes([child]) + len(items).to_bytes(4, "big", signed=True)
        for item in items:
            # list payload has no per-element name
            body += _nbt_write(child, "", item[1] if isinstance(item, tuple) else item)[3:]
        return header + body
    if tag == 10:
        body = b""
        for key, (child, child_value) in value.items():
            body += _nbt_write(child, key, child_value)
        return header + body + b"\x00"
    if tag == 11:
        body = len(value).to_bytes(4, "big", signed=True)
        for item in value:
            body += int(item).to_bytes(4, "big", signed=True)
        return header + body
    raise ValueError(f"unsupported nbt tag {tag}")


def player_from_level(world: Path) -> bytes | None:
    """Singleplayer stores the current player in level.dat, not playerdata/."""
    import gzip

    level = world / "level.dat"
    if not level.is_file():
        return None
    raw = gzip.decompress(level.read_bytes())
    if raw[0] != 10:
        return None
    _, i = _nbt_read_str(raw, 1)
    root, _ = _nbt_parse(raw, i, 10)
    data = root.get("Data", (10, {}))[1]
    player = data.get("Player")
    if not player:
        return None
    return gzip.compress(_nbt_write(10, "", player[1]))


def parse_tp(tp: str) -> tuple[float, float, float, float, float]:
    parts = [float(token) for token in tp.split()]
    if len(parts) < 3:
        raise SystemExit(f"invalid tp string: {tp!r}")
    yaw = parts[3] if len(parts) > 3 else 0.0
    pitch = parts[4] if len(parts) > 4 else 0.0
    return parts[0], parts[1], parts[2], yaw, pitch


def prepare_playerdata(
    world: Path,
    username: str,
    dimension: int,
    pose: tuple[float, float, float, float, float] | None = None,
) -> None:
    """
    Writes the singleplayer player into the offline-mode UUID and puts them in
    the right dimension *before* join. 1.8.9 `/tp` cannot change dimension.
    The nether exhibit in this world is built in the overworld, so that shot
    stays in dimension 0.
    """
    import gzip

    playerdata = world / "playerdata"
    playerdata.mkdir(exist_ok=True)
    target = playerdata / f"{offline_uuid(username)}.dat"

    extracted = player_from_level(world)
    if extracted:
        target.write_bytes(extracted)
        log(f"  playerdata from level.dat -> {target.name}")
    elif not target.is_file():
        saves = sorted(playerdata.glob("*.dat"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not saves:
            log("  ! no playerdata in the world; joining with an empty inventory")
            return
        shutil.copy2(saves[0], target)
        log(f"  playerdata {saves[0].name} -> {target.name}")

    raw = gzip.decompress(target.read_bytes())
    if raw[0] != 10:
        raise SystemExit(f"playerdata {target.name} is not an NBT compound")
    _, i = _nbt_read_str(raw, 1)
    player, _ = _nbt_parse(raw, i, 10)

    player["Dimension"] = (3, dimension)
    player["SelectedItemSlot"] = (3, 0)
    player["playerGameType"] = (3, 1)
    abilities = player.get("abilities", (10, {}))[1]
    abilities["flying"] = (1, 1)
    abilities["mayfly"] = (1, 1)
    abilities["instabuild"] = (1, 1)
    abilities["invulnerable"] = (1, 1)
    player["abilities"] = (10, abilities)
    if pose:
        x, y, z, yaw, pitch = pose
        player["Pos"] = (9, (6, [(6, x), (6, y), (6, z)]))
        player["Rotation"] = (9, (5, [(5, yaw), (5, pitch)]))
        log(f"  spawn dim={dimension} pos={x} {y} {z} yaw={yaw} pitch={pitch}")

    target.write_bytes(gzip.compress(_nbt_write(10, "", player)))


def prepare_world(
    source: Path,
    dest: Path,
    username: str,
    dimension: int,
    pose: tuple[float, float, float, float, float] | None = None,
) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(source, dest, ignore=shutil.ignore_patterns("session.lock"))
    prepare_playerdata(dest, username, dimension, pose)


def write_options(gamedir: Path, pack: str, width: int, height: int, render_distance: int) -> None:
    """
    Writes the client settings the captures depend on. FOV is the important one:
    1.8 stores the slider normalised, where fov:0.0 is 70 (Normal) and each 0.025
    is one degree, so the 0.25 in the real options.txt is actually FOV 80.
    """
    listed = json.dumps([pack], ensure_ascii=False)
    options = {
        "version": "1343",
        "fov": "0.0",
        "renderDistance": str(render_distance),
        "guiScale": "4",
        "particles": "0",
        "renderClouds": "false",
        "fancyGraphics": "true",
        "ao": "0",
        "mipmapLevels": "4",
        "entityShadows": "true",
        "bobView": "false",
        "anaglyph3d": "false",
        # Vanilla slider max is 1.0; the renderer reads this raw, so 1000 is
        # the usual 1.8 fullbright (every face at light 15, no cave dark).
        "gamma": "1000.0",
        "enableVsync": "false",
        "maxFps": "120",
        "difficulty": "0",
        "fboEnable": "true",
        "useVbo": "false",
        "overrideWidth": str(width),
        "overrideHeight": str(height),
        "fullscreen": "false",
        # Focus is unreliable without a window manager, and a paused game renders
        # the pause menu over the shot.
        "pauseOnLostFocus": "false",
        "chatVisibility": "0",
        "chatOpacity": "0.0",
        "showInventoryAchievementHint": "false",
        "snooperEnabled": "false",
        "heldItemTooltips": "false",
        "advancedItemTooltips": "false",
        "lang": "en_US",
        "resourcePacks": listed,
        # Marks the pack as user-confirmed so a pack_format mismatch cannot
        # silently drop it back to default textures.
        "incompatibleResourcePacks": listed,
    }
    body = "".join(f"{key}:{value}\n" for key, value in options.items())
    (gamedir / "options.txt").write_text(body, encoding="utf-8")


def write_optionsof(gamedir: Path) -> None:
    """
    OptiFine settings that match the Sep 4 session: CTM + custom sky on, vanilla
    Sky / Sun & Moon off (the pack sky replaces them), no dynamic FOV so flying
    at y=200 does not widen the lens past the configured 70. Fog and AO are off
    so fullbright gamma is not fighting cave dark or distance haze.
    """
    options = {
        "ofFogType": "3",
        "ofFogStart": "0.8",
        "ofMipmapType": "0",
        "ofSmoothWorld": "true",
        "ofAoLevel": "0.0",
        "ofClouds": "3",
        "ofAnimatedWater": "0",
        "ofAnimatedLava": "0",
        "ofLagometer": "false",
        "ofShowFps": "false",
        "ofBetterGrass": "3",
        "ofConnectedTextures": "2",
        "ofSky": "false",
        "ofStars": "true",
        "ofSunMoon": "false",
        "ofVignette": "0",
        "ofChunkUpdates": "1",
        "ofAaLevel": "0",
        "ofAfLevel": "1",
        "ofCustomFonts": "true",
        "ofCustomColors": "true",
        "ofCustomItems": "true",
        "ofCustomSky": "true",
        "ofNaturalTextures": "false",
        "ofEmissiveTextures": "true",
        "ofDynamicFov": "false",
        "ofAlternateBlocks": "true",
        "ofCustomEntityModels": "true",
        "ofCustomGuis": "true",
        "ofFastMath": "false",
        "ofFastRender": "false",
        "ofTranslucentBlocks": "0",
    }
    body = "".join(f"{key}:{value}\n" for key, value in options.items())
    (gamedir / "optionsof.txt").write_text(body, encoding="utf-8")


FULLBRIGHT_VSH = """#version 120
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    gl_Position = ftransform();
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glcolor = gl_Color;
}
"""

FULLBRIGHT_FSH = """#version 120
uniform sampler2D texture;
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    vec4 tex = texture2D(texture, texcoord);
    float lum = max(max(glcolor.r, glcolor.g), glcolor.b);
    vec3 tint = lum > 0.001 ? glcolor.rgb / lum : vec3(1.0);
    gl_FragColor = vec4(tex.rgb * tint, tex.a * glcolor.a);
}
"""

FULLBRIGHT_BASIC_FSH = """#version 120
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    gl_FragColor = glcolor;
}
"""

# Drop the vanilla sky hemisphere entirely. Painting it (even black) puts a
# hard horizon through the pack's custom sky, which is the line in the shots.
# ofSky:false is not enough once a shader pack is loaded — this program still runs.
SKY_DISCARD_FSH = """#version 120
void main() {
    discard;
}
"""

# Custom skies / sun / moon go through skytextured. Pass the texture through
# so the pack sky is visible without the vanilla dome behind it.
SKY_TEXTURED_FSH = """#version 120
uniform sampler2D texture;
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    gl_FragColor = texture2D(texture, texcoord) * glcolor;
}
"""


def write_fullbright_shaders(gamedir: Path) -> None:
    """
    OptiFine shader that drops vanilla face lighting (top 100 / sides 80 /
    bottom 50) and the lightmap. Night Vision only lifts the lightmap; ceilings
    stay dark without this.
    """
    programs = (
        "gbuffers_basic",
        "gbuffers_textured",
        "gbuffers_textured_lit",
        "gbuffers_terrain",
        "gbuffers_water",
        "gbuffers_entities",
        "gbuffers_hand",
        "gbuffers_weather",
        "gbuffers_skybasic",
        "gbuffers_skytextured",
        "gbuffers_clouds",
        "gbuffers_beaconbeam",
        "gbuffers_armor_glint",
        "gbuffers_block",
    )
    dest = gamedir / "shaderpacks" / "fullbright.zip"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for program in programs:
            zf.writestr(f"shaders/{program}.vsh", FULLBRIGHT_VSH)
            if program == "gbuffers_basic":
                frag = FULLBRIGHT_BASIC_FSH
            elif program == "gbuffers_skybasic":
                frag = SKY_DISCARD_FSH
            elif program == "gbuffers_skytextured":
                frag = SKY_TEXTURED_FSH
            else:
                frag = FULLBRIGHT_FSH
            zf.writestr(f"shaders/{program}.fsh", frag)
    (gamedir / "optionsshaders.txt").write_text(
        "\n".join(
            [
                "antialiasingLevel=0",
                "normalMapEnabled=false",
                "specularMapEnabled=false",
                "renderResMul=1.0",
                "shadowResMul=1.0",
                "handDepthMul=0.125",
                "cloudShadow=false",
                "oldHandLight=false",
                "oldLighting=false",
                "shaderPack=fullbright.zip",
                "tweakBlockDamage=false",
                "shadowClipFrustrum=true",
                "TexMinFilB=0",
                "TexMinFilN=0",
                "TexMinFilS=0",
                "TexMagFilB=0",
                "TexMagFilN=0",
                "TexMagFilS=0",
                "",
            ]
        )
    )


def resolve_pack(spec: str) -> Path:
    """Accepts a slug, a path, or a substring of a pack name in the resourcepacks folder."""
    alias = PACK_ALIASES.get(spec.lower())
    if alias and alias.is_file():
        return alias

    direct = Path(spec).expanduser()
    if direct.is_file():
        return direct

    folder = MC / "resourcepacks"
    matches = [p for p in sorted(folder.glob("*.zip")) if spec.lower() in p.name.lower()]
    if not matches:
        raise SystemExit(f"no pack in {folder} matching {spec!r}")
    if len(matches) > 1:
        listing = "\n  ".join(p.name for p in matches)
        raise SystemExit(f"{spec!r} matches several packs, be more specific:\n  {listing}")
    return matches[0]


# --------------------------------------------------------------------------- #
# processes
# --------------------------------------------------------------------------- #


class Proc:
    """A child process whose output is tailed into a log file and scanned for markers."""

    def __init__(self, name: str, argv: list[str], cwd: Path, log_path: Path, env: dict | None = None):
        self.name = name
        self.log_path = log_path
        self.lines: list[str] = []
        self._lock = threading.Lock()
        self._file = log_path.open("w", encoding="utf-8", errors="replace")
        self.proc = subprocess.Popen(
            argv,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
            bufsize=1,
            errors="replace",
        )
        self._thread = threading.Thread(target=self._drain, daemon=True)
        self._thread.start()

    def _drain(self) -> None:
        assert self.proc.stdout
        for line in self.proc.stdout:
            with self._lock:
                self.lines.append(line)
            self._file.write(line)
            self._file.flush()

    def wait_for(self, marker: str, timeout: float) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.proc.poll() is not None:
                return self.seen(marker)
            if self.seen(marker):
                return True
            time.sleep(0.25)
        return False

    def seen(self, marker: str) -> bool:
        with self._lock:
            return any(marker in line for line in self.lines)

    def send(self, command: str) -> None:
        assert self.proc.stdin
        try:
            self.proc.stdin.write(command + "\n")
            self.proc.stdin.flush()
        except BrokenPipeError:
            pass

    def tail(self, count: int = 25) -> str:
        with self._lock:
            return "".join(self.lines[-count:])

    def stop(self, graceful: str | None = None, timeout: float = 20) -> None:
        if self.proc.poll() is None:
            if graceful:
                self.send(graceful)
                try:
                    self.proc.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    pass
            if self.proc.poll() is None:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
        self._file.close()


class Display:
    """A virtual X display, or a passthrough when rendering on a real one."""

    def __init__(self, spec: str | None, width: int, height: int, log_path: Path):
        self.owned = spec is None
        self.proc: subprocess.Popen | None = None

        if not self.owned:
            self.name = spec
            return

        self.name = self._free_display()
        self._log = log_path.open("w")
        self.proc = subprocess.Popen(
            [
                require_tool("Xvfb"),
                self.name,
                "-screen",
                "0",
                f"{width}x{height}x24",
                "+extension",
                "GLX",
                "+iglx",
                "+extension",
                "RANDR",
                "+render",
                "-noreset",
            ],
            stdout=self._log,
            stderr=subprocess.STDOUT,
        )
        for _ in range(60):
            time.sleep(0.25)
            if self._responds():
                return
        raise SystemExit(f"Xvfb did not come up on {self.name}; see {log_path}")

    @staticmethod
    def _free_display() -> str:
        for n in range(99, 130):
            if not Path(f"/tmp/.X11-unix/X{n}").exists():
                return f":{n}"
        raise SystemExit("no free X display number")

    def _responds(self) -> bool:
        probe = subprocess.run(
            [require_tool("xdotool"), "getdisplaygeometry"],
            env={**os.environ, "DISPLAY": self.name},
            capture_output=True,
        )
        return probe.returncode == 0

    def env(self) -> dict:
        env = {**os.environ, "DISPLAY": self.name}
        if self.owned:
            # NVIDIA's GLX driver does not speak to Xvfb. Mesa llvmpipe still
            # rasterizes OptiFine's textured quads correctly, just slower.
            env["LIBGL_ALWAYS_SOFTWARE"] = "1"
            env["GALLIUM_DRIVER"] = "llvmpipe"
            env["__GLX_VENDOR_LIBRARY_NAME"] = "mesa"
        return env

    def minecraft_window(self) -> str | None:
        probe = subprocess.run(
            [require_tool("xdotool"), "search", "--name", "Minecraft"],
            env=self.env(),
            capture_output=True,
            text=True,
        )
        if probe.returncode != 0 or not probe.stdout.strip():
            return None
        return probe.stdout.strip().split()[-1]

    def focus_game(self, width: int, height: int) -> None:
        wid = self.minecraft_window()
        if not wid:
            return
        subprocess.run(
            [require_tool("xdotool"), "windowmove", wid, "0", "0", "windowsize", wid, str(width), str(height), "windowactivate", wid],
            env=self.env(),
            capture_output=True,
        )

    def grab(self) -> Image.Image:
        target = self.minecraft_window() or "root"
        shot = subprocess.run(
            [require_tool("import"), "-window", target, "png:-"],
            env=self.env(),
            capture_output=True,
        )
        if shot.returncode != 0:
            raise RuntimeError(f"screen grab failed: {shot.stderr.decode(errors='replace')[:200]}")
        return Image.open(io.BytesIO(shot.stdout)).convert("RGB")

    def stop(self) -> None:
        if self.proc and self.proc.poll() is None:
            self.proc.send_signal(signal.SIGTERM)
            try:
                self.proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        if self.owned:
            self._log.close()


# --------------------------------------------------------------------------- #
# capture
# --------------------------------------------------------------------------- #


def frame_difference(a: Image.Image, b: Image.Image) -> float:
    """Mean absolute difference on a small copy, as a 0..1 fraction."""
    small_a = a.resize((320, 180), Image.Resampling.BILINEAR)
    small_b = b.resize((320, 180), Image.Resampling.BILINEAR)
    diff = ImageChops.difference(small_a, small_b)
    histogram = diff.histogram()
    total = sum(i % 256 * count for i, count in enumerate(histogram))
    return total / (320 * 180 * 3 * 255)


@dataclass
class Settle:
    min_wait: float = 3.0
    max_wait: float = 60.0
    interval: float = 0.8
    # Loose enough to tolerate animated textures such as lava and fire, tight
    # enough that chunks and entities popping in still read as movement.
    tolerance: float = 0.006
    needed: int = 3


def wait_until_settled(display: Display, settle: Settle, pin=None, verbose: bool = False) -> Image.Image:
    """
    Waits for the view to stop changing, so a frame is never captured while
    chunks are still streaming in. `pin` is re-sent each poll to hold an airborne
    camera in place.
    """
    start = time.time()
    previous = display.grab()
    stable = 0
    diffs: list[float] = []

    while True:
        time.sleep(settle.interval)
        if pin:
            pin()
        current = display.grab()
        diff = frame_difference(previous, current)
        diffs.append(diff)
        previous = current
        elapsed = time.time() - start

        stable = stable + 1 if diff <= settle.tolerance else 0
        if stable >= settle.needed and elapsed >= settle.min_wait:
            if verbose:
                trail = " ".join(f"{d:.4f}" for d in diffs[-8:])
                log(f"      settled in {elapsed:.1f}s (diffs {trail})")
            return current
        if elapsed >= settle.max_wait:
            trail = " ".join(f"{d:.4f}" for d in diffs[-8:])
            log(f"      ! still moving after {elapsed:.1f}s, capturing anyway (diffs {trail})")
            return current


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #


def build_client_argv(
    java: Path, version_json: dict, run: Path, gamedir: Path, port: int, username: str, width: int, height: int
) -> list[str]:
    natives = run / "natives"
    classpath = build_classpath(version_json, natives)
    placeholders = {
        "auth_player_name": username,
        "version_name": CLIENT_VERSION,
        "game_directory": str(gamedir),
        "assets_root": str(MC / "assets"),
        "assets_index_name": version_json.get("assets", "1.8"),
        "auth_uuid": offline_uuid(username).replace("-", ""),
        "auth_access_token": "0",
        "user_type": "legacy",
        "user_properties": "{}",
        "version_type": version_json.get("type", "release"),
    }

    game_args: list[str] = []
    for token in version_json["minecraftArguments"].split():
        if token.startswith("${") and token.endswith("}"):
            game_args.append(placeholders.get(token[2:-1], token))
        else:
            game_args.append(token)

    return [
        str(java),
        "-Xmx4G",
        "-Xms1G",
        f"-Djava.library.path={natives}",
        "-Dorg.lwjgl.util.Debug=false",
        "-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true",
        "-cp",
        ":".join(str(p) for p in classpath),
        version_json["mainClass"],
        *game_args,
        "--width",
        str(width),
        "--height",
        str(height),
        "--server",
        "127.0.0.1",
        "--port",
        str(port),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pack", required=True, help="resourcepack zip path, or a substring of its name")
    parser.add_argument("--slug", help="pack slug for output paths (default: derived from --out)")
    parser.add_argument("--out", type=Path, help="webp output dir (default: public/previews/<slug>)")
    parser.add_argument("--shots", nargs="*", help="subset of shot names (default: all)")
    parser.add_argument("--list", action="store_true", help="list the configured shots and exit")
    parser.add_argument("--width", type=int, default=2560)
    parser.add_argument("--height", type=int, default=1440)
    parser.add_argument("--render-distance", type=int, default=12)
    parser.add_argument("--time", type=int, help="fix the world time in ticks (default: keep the world's)")
    parser.add_argument("--port", type=int, default=25599)
    parser.add_argument("--display", help="render on an existing display (e.g. :0) instead of Xvfb")
    parser.add_argument("--no-webp", action="store_true", help="keep only the full-resolution PNGs")
    parser.add_argument("--keep", action="store_true", help="keep the run directory for debugging")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    config = json.loads(SHOTS_CONFIG.read_text())
    all_shots = config["shots"]
    username = config["username"]

    if args.list:
        for shot in all_shots:
            log(f"{shot['name']:8} dim={shot['dimension']:<3} tp {shot['tp']}")
        return

    wanted = all_shots
    if args.shots:
        by_name = {s["name"]: s for s in all_shots}
        unknown = [n for n in args.shots if n not in by_name]
        if unknown:
            raise SystemExit(f"unknown shots: {', '.join(unknown)} (see --list)")
        wanted = [by_name[n] for n in args.shots]

    pack = resolve_pack(args.pack)
    slug = args.slug or (args.out.name if args.out else None)
    if not slug:
        raise SystemExit("pass --slug (or --out) so the output location is unambiguous")
    out_dir = args.out or (ROOT / "public/previews" / slug)

    world_source = MC / "saves" / config["world"]
    if not world_source.is_dir():
        raise SystemExit(f"world not found: {world_source}")

    java = find_java8()
    version_json = load_version_json(CLIENT_VERSION)
    jar = server_jar()

    log(f"pack:    {pack.name}")
    log(f"client:  {CLIENT_VERSION}")
    log(f"java:    {java}")
    log(f"world:   {world_source.name}")
    log(f"shots:   {', '.join(s['name'] for s in wanted)}")
    log(f"output:  {out_dir}")

    run = Path("/tmp") / f"mc-shots-{slug}"
    if run.exists():
        shutil.rmtree(run)
    (run / "logs").mkdir(parents=True)

    gamedir = run / "gamedir"
    (gamedir / "resourcepacks").mkdir(parents=True)
    shutil.copy2(pack, gamedir / "resourcepacks" / pack.name)
    write_options(gamedir, pack.name, args.width, args.height, args.render_distance)
    write_optionsof(gamedir)
    write_fullbright_shaders(gamedir)

    raw_dir = run / "raw"
    raw_dir.mkdir()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Shots are grouped by dimension because 1.8.9 has no console command that
    # moves a player across dimensions; it is set in the player's save instead.
    # The current shot list is all overworld (the nether room is built there).
    groups: dict[int, list[dict]] = {}
    for shot in wanted:
        groups.setdefault(shot["dimension"], []).append(shot)

    captured: dict[str, Path] = {}
    failed = True
    try:
        for dimension, shots in sorted(groups.items(), key=lambda kv: kv[0] != 0):
            label = {0: "overworld", -1: "nether", 1: "end"}.get(dimension, str(dimension))
            log(f"\n=== {label}: {', '.join(s['name'] for s in shots)} ===")
            captured |= run_session(
                args, config, run, gamedir, java, jar, version_json, world_source, dimension, shots, raw_dir
            )
        failed = False
    finally:
        if not args.keep and not failed:
            shutil.rmtree(run / "world", ignore_errors=True)

    log("")
    if args.no_webp:
        for name, path in captured.items():
            final = out_dir / f"{name}.png"
            shutil.copy2(path, final)
            log(f"wrote {final.relative_to(ROOT) if ROOT in final.parents else final}")
    else:
        for name, path in captured.items():
            image = Image.open(path).convert("RGB")
            height = round(image.height * PREVIEW_WIDTH / image.width)
            resized = image.resize((PREVIEW_WIDTH, height), Image.Resampling.LANCZOS)
            final = out_dir / f"{name}.webp"
            resized.save(final, "WEBP", quality=90, method=6)
            log(f"wrote {final} ({resized.width}x{resized.height}, {final.stat().st_size // 1024} KB)")

    if args.keep or failed:
        log(f"\nrun directory kept at {run}")
    else:
        shutil.rmtree(run, ignore_errors=True)


def run_session(
    args,
    config: dict,
    run: Path,
    gamedir: Path,
    java: Path,
    jar: Path,
    version_json: dict,
    world_source: Path,
    dimension: int,
    shots: list[dict],
    raw_dir: Path,
) -> dict[str, Path]:
    username = config["username"]
    world = run / "world"

    log("  copying world ...")
    pose = parse_tp(shots[0]["tp"])
    prepare_world(world_source, world, username, dimension, pose)

    (run / "eula.txt").write_text("eula=true\n")
    (run / "server.properties").write_text(
        "\n".join(
            [
                "level-name=world",
                f"server-port={args.port}",
                "server-ip=127.0.0.1",
                "online-mode=false",
                "gamemode=1",
                "force-gamemode=true",
                "difficulty=0",
                "spawn-protection=0",
                "allow-flight=true",
                "allow-nether=true",
                "max-players=2",
                f"view-distance={args.render_distance}",
                "spawn-monsters=false",
                "spawn-animals=false",
                "spawn-npcs=false",
                "announce-player-achievements=false",
                "enable-command-block=false",
                "snooper-enabled=false",
                "motd=pack shots",
                "",
            ]
        )
    )
    (run / "ops.json").write_text(
        json.dumps([{"uuid": offline_uuid(username), "name": username, "level": 4, "bypassesPlayerLimit": True}])
    )

    display = None
    server = None
    client = None
    captured: dict[str, Path] = {}

    try:
        log(f"  starting server on port {args.port} ...")
        server = Proc(
            "server",
            [str(java), "-Xmx1G", "-jar", str(jar), "nogui"],
            cwd=run,
            log_path=run / "logs/server.log",
        )
        if not server.wait_for('Done (', timeout=180):
            raise SystemExit(f"server did not finish starting:\n{server.tail()}")

        # A moving sun, weather, or command spam in chat would all change the
        # frame between runs, so the world is pinned to fixed conditions.
        for command in [
            "gamerule sendCommandFeedback false",
            "gamerule doDaylightCycle false",
            "gamerule doMobSpawning false",
            "gamerule doFireTick false",
            "gamerule randomTickSpeed 0",
            "weather clear 1000000",
            f"gamemode 1 {username}",
        ]:
            server.send(command)
        if args.time is not None:
            server.send(f"time set {args.time}")

        display = Display(args.display, args.width, args.height, run / "logs/xvfb.log")
        renderer = "existing display" if args.display else "Xvfb"
        log(f"  display {display.name} ({renderer}, {args.width}x{args.height})")

        log("  starting client ...")
        client = Proc(
            "client",
            build_client_argv(java, version_json, run, gamedir, args.port, username, args.width, args.height),
            cwd=gamedir,
            log_path=run / "logs/client.log",
            env=display.env(),
        )

        if not server.wait_for("logged in with entity id", timeout=240):
            raise SystemExit(
                "the client never joined. Server tail:\n"
                f"{server.tail(15)}\nClient tail:\n{client.tail(40)}"
            )
        if client.proc.poll() is not None:
            raise SystemExit(f"client exited before joining:\n{client.tail(40)}")
        log("  client joined, waiting for the world to render ...")
        server.send(f"gamemode 1 {username}")
        # Night Vision (id 16). Vanilla gamma max is only "Bright"; this is
        # what actually lifts cave lightmaps to fullbright. Long duration
        # skips the expiry flash, hideParticles skips the swirl.
        server.send(f"effect {username} 16 1000000 0 true")
        server.send(f"replaceitem entity {username} slot.hotbar.0 diamond_sword")
        server.send(f"replaceitem entity {username} slot.hotbar.1 stonebrick")
        for _ in range(60):
            if display.minecraft_window():
                break
            if client.proc.poll() is not None:
                raise SystemExit(f"client exited after joining:\n{client.tail(40)}")
            time.sleep(0.5)
        display.focus_game(args.width, args.height)

        settle = Settle()
        wait_until_settled(display, Settle(min_wait=4.0, max_wait=120.0), verbose=args.verbose)

        for shot in shots:
            name, tp = shot["name"], shot["tp"]
            log(f"  [{name}] tp {tp}")
            pin = lambda t=tp: server.send(f"tp {username} {t}")
            pin()
            frame = wait_until_settled(display, settle, pin=pin, verbose=args.verbose)

            path = raw_dir / f"{name}.png"
            frame.save(path)
            captured[name] = path
            log(f"      captured {frame.width}x{frame.height}")

    finally:
        if client:
            client.stop()
        if server:
            server.stop(graceful="stop")
        if display:
            display.stop()

    return captured


if __name__ == "__main__":
    sys.exit(main())
