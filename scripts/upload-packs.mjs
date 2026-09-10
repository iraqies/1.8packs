#!/usr/bin/env node
/**
 * Publishes the pack zips as GitHub release assets.
 *
 * The zips are kept out of git and out of the site build: Konata is already
 * over the 25 MiB per-asset cap on Cloudflare Pages. GitHub releases are the
 * free way to serve them — 2 GiB per file, and GitHub documents no limit on
 * total release size or bandwidth. Files in git itself are capped at 100 MiB,
 * which is why these go on a release rather than in a commit.
 *
 * Usage:
 *   GH_REPO=owner/repo npm run packs:upload
 *   GH_REPO=owner/repo npm run packs:upload -- --dry-run
 *
 * Needs `gh auth login` with repo scope. The target repo must be public for
 * anonymous downloads to work.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const DOWNLOADS = fileURLToPath(new URL("../public/downloads", import.meta.url));
const CATALOG = fileURLToPath(new URL("./assets/imported-packs.json", import.meta.url));
const TAG = process.env.GH_TAG ?? "packs";
const dryRun = process.argv.includes("--dry-run");
const allowed = new Set(JSON.parse(readFileSync(CATALOG, "utf8")).map((pack) => pack.downloadName));

function gh(args, { capture = true } = {}) {
  return spawnSync("gh", args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
}

let repo = process.env.GH_REPO;
if (!repo) {
  // Fall back to whatever repo this checkout points at.
  const guess = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  repo = guess.status === 0 ? guess.stdout.trim() : "";
}
if (!repo) {
  console.error("set GH_REPO, e.g. GH_REPO=iraqies/1.8packs npm run packs:upload");
  process.exit(1);
}

const zips = (() => {
  try {
    return readdirSync(DOWNLOADS).filter((name) => name.endsWith(".zip") && allowed.has(name)).sort();
  } catch {
    console.error(`no such directory: ${DOWNLOADS}`);
    process.exit(1);
  }
})();

if (!zips.length) {
  console.error(`no zips in ${DOWNLOADS}`);
  process.exit(1);
}

const total = zips.reduce((sum, name) => sum + statSync(join(DOWNLOADS, name)).size, 0);
const oversized = zips.filter((name) => statSync(join(DOWNLOADS, name)).size > 2 * 1024 ** 3);

console.log(`${zips.length} zips, ${(total / 1024 ** 2).toFixed(0)} MB -> ${repo} release "${TAG}"\n`);
for (const name of zips) {
  console.log(`  ${(statSync(join(DOWNLOADS, name)).size / 1024 ** 2).toFixed(1).padStart(6)} MB  ${name}`);
}

if (oversized.length) {
  console.error(`\nover GitHub's 2 GiB per-asset limit: ${oversized.join(", ")}`);
  process.exit(1);
}

const base = `https://github.com/${repo}/releases/download/${TAG}`;

if (dryRun) {
  console.log(`\ndry run — nothing uploaded.\nVITE_CDN_BASE would be:\n  ${base}`);
  process.exit(0);
}

const auth = gh(["auth", "status"]);
if (auth.status !== 0) {
  console.error("not logged in — run `gh auth login` first");
  process.exit(1);
}

const exists = gh(["release", "view", TAG, "--repo", repo]).status === 0;
if (!exists) {
  console.log(`\ncreating release ${TAG} ...`);
  const created = gh([
    "release", "create", TAG,
    "--repo", repo,
    "--title", "Resource packs",
    "--notes", "Pack zips served by the site. Uploaded by scripts/upload-packs.mjs.",
  ]);
  if (created.status !== 0) {
    console.error(created.stderr || created.stdout);
    process.exit(1);
  }
}

console.log(`\nuploading ${zips.length} assets (this takes a while) ...`);
const upload = gh(
  ["release", "upload", TAG, ...zips.map((name) => join(DOWNLOADS, name)), "--repo", repo, "--clobber"],
  { capture: false },
);

if (upload.status !== 0) {
  console.error("\nupload failed");
  process.exit(1);
}

console.log(`\ndone. Set this in the Cloudflare Pages project:\n  VITE_CDN_BASE=${base}`);
