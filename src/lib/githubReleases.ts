import { githubRelease } from "@/config";
import { packs } from "@/data/packs";

const CACHE_MS = 5 * 60 * 1000;

type Cache = { at: number; counts: Record<string, number> };

interface ReleasePayload {
  assets?: Array<{ name: string; download_count: number }>;
}

function cacheKey(repo: string, tag: string) {
  return `18packs.dl.${repo}.${tag}`;
}

function readCache(repo: string, tag: string): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(repo, tag));
    if (!raw) return null;
    const cached = JSON.parse(raw) as Cache;
    if (Date.now() - cached.at > CACHE_MS || !cached.counts) return null;
    return cached.counts;
  } catch {
    return null;
  }
}

function writeCache(repo: string, tag: string, counts: Record<string, number>) {
  try {
    sessionStorage.setItem(cacheKey(repo, tag), JSON.stringify({ at: Date.now(), counts } satisfies Cache));
  } catch {
    // Private mode / quota — live fetch still works this visit.
  }
}

/**
 * GitHub's official per-asset download_count for the release that hosts the
 * pack zips. That is a completed download of the file, not a button click.
 */
export async function fetchReleaseDownloadCounts(): Promise<Record<string, number>> {
  const release = githubRelease;
  if (!release) return {};

  const cached = readCache(release.repo, release.tag);
  if (cached) return cached;

  const url = `https://api.github.com/repos/${release.repo}/releases/tags/${encodeURIComponent(release.tag)}`;
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) return {};

  const payload = (await response.json()) as ReleasePayload;
  const byName = new Map((payload.assets ?? []).map((asset) => [asset.name, asset.download_count]));
  const counts: Record<string, number> = {};
  for (const pack of packs) {
    const total = byName.get(pack.downloadName);
    if (typeof total === "number") counts[pack.slug] = total;
  }
  writeCache(release.repo, release.tag, counts);
  return counts;
}
