#!/usr/bin/env python3
"""Render a Minecraft skin to a transparent PNG with skinview3d (Three.js)."""

from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "node_modules/skinview3d/bundles/skinview3d.bundle.js"
CHROME_CANDIDATES = [
    os.environ.get("CHROME_PATH"),
    "/home/iraqies/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    shutil.which("chromium"),
    shutil.which("google-chrome"),
    shutil.which("google-chrome-stable"),
]
PW_PYTHON_CANDIDATES = [
    sys.executable,
    "/home/iraqies/python/comics/venv/bin/python",
]


def find_chrome() -> str | None:
    for path in CHROME_CANDIDATES:
        if path and Path(path).is_file():
            return path
    return None


def _data_url(png: bytes | None) -> str:
    if not png:
        return "null"
    return '"data:image/png;base64,' + base64.b64encode(png).decode("ascii") + '"'


def viewer_html(
    skin_png: bytes,
    width: int,
    height: int,
    cape_png: bytes | None = None,
    model: str = "default",
    armor_outer_png: bytes | None = None,
    armor_inner_png: bytes | None = None,
    pose: dict | None = None,
) -> str:
    bundle = BUNDLE.read_text()
    skin_b64 = base64.b64encode(skin_png).decode("ascii")
    cape_line = _data_url(cape_png)
    armor_outer_line = _data_url(armor_outer_png)
    armor_inner_line = _data_url(armor_inner_png)
    pose_js = json.dumps(
        {
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
            **(pose or {}),
        }
    )
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {{ margin: 0; background: #ff00ff; overflow: hidden; }}
  canvas {{ display: block; }}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
{bundle}
</script>
<script>
(async () => {{
  const skin = "data:image/png;base64,{skin_b64}";
  const cape = {cape_line};
  const armorOuterSrc = {armor_outer_line};
  const armorInnerSrc = {armor_inner_line};
  const pose = {pose_js};
  const viewer = new skinview3d.SkinViewer({{
    canvas: document.getElementById("c"),
    width: {width},
    height: {height},
    pixelRatio: 2,
    preserveDrawingBuffer: true,
    enableControls: false,
    zoom: pose.zoom,
    fov: pose.fov,
    skin,
    model: "{model}",
  }});
  viewer.autoRotate = false;
  viewer.fxaaPass.enabled = false;
  viewer.background = 0xff00ff;
  viewer.renderer.setClearColor(0xff00ff, 1);
  viewer.globalLight.intensity = 3.4;
  viewer.cameraLight.intensity = 1.35;
  await viewer.loadSkin(skin, {{ model: "{model}" }});
  if (cape) {{
    await viewer.loadCape(cape);
  }}

  const FrontSide = 0;
  const s = viewer.playerObject.skin;
  s.traverse((child) => {{
    if (!child.isMesh || !child.material) return;
    const mats = [].concat(child.material);
    for (const m of mats) {{
      m.side = FrontSide;
      m.depthWrite = true;
      m.needsUpdate = true;
    }}
  }});

  function loadArmorTex(src, template) {{
    if (!src || !template) return Promise.resolve(null);
    return new Promise((resolve, reject) => {{
      const img = new Image();
      img.onload = () => {{
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        const tex = new template.constructor(canvas);
        tex.magFilter = template.magFilter;
        tex.minFilter = template.minFilter;
        tex.colorSpace = template.colorSpace;
        tex.flipY = template.flipY;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        resolve(tex);
      }};
      img.onerror = reject;
      img.src = src;
    }});
  }}

  function wear(source, tex, sx, sy, sz) {{
    if (!source || !tex) return;
    const mesh = source.clone();
    mesh.material = source.material.clone();
    mesh.material.map = tex;
    mesh.material.side = FrontSide;
    mesh.material.transparent = true;
    mesh.material.alphaTest = 0.08;
    mesh.material.depthWrite = true;
    mesh.material.polygonOffset = true;
    mesh.material.polygonOffsetFactor = -1;
    mesh.material.polygonOffsetUnits = -1;
    mesh.material.needsUpdate = true;
    mesh.scale.x *= sx;
    mesh.scale.y *= sy;
    mesh.scale.z *= sz;
    source.parent.add(mesh);
  }}

  const template = s.head.innerLayer.material.map;
  const [outerTex, innerTex] = await Promise.all([
    loadArmorTex(armorOuterSrc, template),
    loadArmorTex(armorInnerSrc, template),
  ]);
  if (outerTex) {{
    wear(s.head.outerLayer, outerTex, 1.08, 1.08, 1.08);
    wear(s.body.outerLayer, outerTex, 1.12, 1.08, 1.22);
    wear(s.rightArm.outerLayer, outerTex, 1.16, 1.08, 1.16);
    wear(s.leftArm.outerLayer, outerTex, 1.16, 1.08, 1.16);
    wear(s.rightLeg.outerLayer, outerTex, 1.18, 1.08, 1.18);
    wear(s.leftLeg.outerLayer, outerTex, 1.18, 1.08, 1.18);
  }}
  if (innerTex) {{
    wear(s.body.innerLayer, innerTex, 1.08, 1.06, 1.16);
    wear(s.rightLeg.innerLayer, innerTex, 1.10, 1.06, 1.10);
    wear(s.leftLeg.innerLayer, innerTex, 1.10, 1.06, 1.10);
  }}

  s.head.rotation.y = pose.headYaw;
  s.head.rotation.x = pose.headPitch;
  s.rightArm.rotation.x = pose.rightArmX;
  s.rightArm.rotation.z = pose.rightArmZ;
  s.leftArm.rotation.x = pose.leftArmX;
  s.leftArm.rotation.z = pose.leftArmZ;
  s.rightLeg.rotation.x = pose.rightLegX;
  s.leftLeg.rotation.x = pose.leftLegX;
  viewer.playerObject.rotation.y = pose.yaw;
  viewer.playerObject.rotation.x = pose.pitch;
  if (pose.cam && pose.target) {{
    viewer.camera.position.set(pose.cam[0], pose.cam[1], pose.cam[2]);
    viewer.controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    viewer.controls.update();
  }}
  viewer.render();
  requestAnimationFrame(() => {{
    viewer.render();
    window.__PLAYER_READY = true;
  }});
}})().catch((err) => {{
  document.body.dataset.error = String(err);
  window.__PLAYER_ERROR = String(err);
}});
</script>
</body>
</html>
"""


def capture_with_playwright(html: str, dest: Path, width: int, height: int) -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return False
    chrome = find_chrome()
    with sync_playwright() as p:
        launch = {"args": [
            "--no-sandbox",
            "--disable-gpu-sandbox",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            "--hide-scrollbars",
        ]}
        if chrome:
            launch["executable_path"] = chrome
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=2)
        page.set_content(html, wait_until="load")
        page.wait_for_function("window.__PLAYER_READY === true", timeout=20000)
        page.screenshot(path=str(dest), omit_background=False)
        browser.close()
    if dest.is_file() and dest.stat().st_size > 1000:
        punch_chroma(dest)
        return True
    return False


def capture_with_chrome(html: str, dest: Path, width: int, height: int) -> bool:
    chrome = find_chrome()
    if not chrome:
        return False
    work = Path("/tmp/glaze-iso/player-view")
    work.mkdir(parents=True, exist_ok=True)
    page = work / "index.html"
    page.write_text(html)
    shot = work / "shot.png"
    cmd = [
        chrome,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        "--default-background-color=ffff00ff",
        "--virtual-time-budget=12000",
        f"--screenshot={shot}",
        page.as_uri(),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=40)
    if shot.is_file() and shot.stat().st_size > 1000:
        shutil.copy(shot, dest)
        punch_chroma(dest)
        return True
    return False


def punch_chroma(path: Path) -> None:
    """Drop the magenta backdrop used so WebGL holes are not captured as black."""
    import numpy as np
    from PIL import Image

    arr = np.array(Image.open(path).convert("RGBA"))
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    mag = (r > 200) & (b > 200) & (g < 90)
    arr[mag, 3] = 0
    Image.fromarray(arr).save(path)


def _read_png(path: Path | None) -> bytes | None:
    if path and path.is_file():
        return path.read_bytes()
    return None


def render_player(
    skin_path: Path,
    dest: Path,
    width: int = 800,
    height: int = 1100,
    cape_path: Path | None = None,
    model: str = "default",
    armor_outer: Path | None = None,
    armor_inner: Path | None = None,
    pose: dict | None = None,
) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    html = viewer_html(
        skin_path.read_bytes(),
        width,
        height,
        _read_png(cape_path),
        model,
        _read_png(armor_outer),
        _read_png(armor_inner),
        pose,
    )
    if capture_with_playwright(html, dest, width, height):
        return dest
    for py in PW_PYTHON_CANDIDATES:
        if not py or py == sys.executable or not Path(py).is_file():
            continue
        env = os.environ.copy()
        env["PLAYER_MODEL"] = model
        if cape_path and cape_path.is_file():
            env["PLAYER_CAPE"] = str(cape_path)
        if armor_outer and armor_outer.is_file():
            env["PLAYER_ARMOR_OUTER"] = str(armor_outer)
        if armor_inner and armor_inner.is_file():
            env["PLAYER_ARMOR_INNER"] = str(armor_inner)
        if pose:
            env["PLAYER_POSE"] = json.dumps(pose)
        proc = subprocess.run(
            [py, str(Path(__file__).resolve()), str(skin_path), str(dest), str(width), str(height)],
            capture_output=True,
            text=True,
            env=env,
        )
        if proc.returncode == 0 and dest.is_file():
            return dest
    if capture_with_chrome(html, dest, width, height):
        return dest
    raise RuntimeError(
        "Could not render the player. Install Playwright (`pip install playwright`) "
        "or set CHROME_PATH to a Chromium binary."
    )


def main() -> None:
    skin = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 800
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 1100
    model = os.environ.get("PLAYER_MODEL") or (sys.argv[5] if len(sys.argv) > 5 else "default")
    cape = Path(os.environ["PLAYER_CAPE"]) if os.environ.get("PLAYER_CAPE") else (
        Path(sys.argv[6]) if len(sys.argv) > 6 else None
    )
    armor_outer = Path(os.environ["PLAYER_ARMOR_OUTER"]) if os.environ.get("PLAYER_ARMOR_OUTER") else None
    armor_inner = Path(os.environ["PLAYER_ARMOR_INNER"]) if os.environ.get("PLAYER_ARMOR_INNER") else None
    pose = json.loads(os.environ["PLAYER_POSE"]) if os.environ.get("PLAYER_POSE") else None
    render_player(
        skin,
        dest,
        width,
        height,
        cape,
        model,
        armor_outer,
        armor_inner,
        pose,
    )
    print(dest)


if __name__ == "__main__":
    main()
