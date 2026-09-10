/**
 * Where the pack zips are served from. The Konata zip is over the 25 MiB
 * per-asset limit on Cloudflare Pages, so in production it is a GitHub
 * release asset and only the site is deployed. Unset locally, where
 * public/downloads/ is served by Vite.
 */
// Optional chaining because this module is also imported by the build-time SEO
// plugin, which runs in plain Node where import.meta.env does not exist.
export const cdnBase = (import.meta.env?.VITE_CDN_BASE ?? "").replace(/\/+$/, "");

/** owner/repo and tag parsed from a GitHub Releases download base. */
export function githubReleaseFromCdn(base: string) {
  const match = base.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/([^/?#]+)/i);
  if (!match) return null;
  return { repo: match[1], tag: decodeURIComponent(match[2]) };
}

export const githubRelease = githubReleaseFromCdn(cdnBase);

export const site = {
  name: "1.8packs",
  tagline: "Find your next PvP pack.",
  description: "Find 1.8.9 Java Edition PvP resource packs, inspect previews, and download.",
  downloadPrepMs: 5000,
} as const;

export interface AdSlotConfig {
  width: number;
  height: number;
  /**
   * The network's tag for this slot. Adsterra and Monetag banner tags call
   * document.write, which cannot run inside a React tree, so each slot is
   * rendered in its own iframe and this goes in the iframe document.
   */
  tag: string;
}

export type AdSlotName = "packPage" | "exploreEnd" | "exploreEmpty" | "download";

export const ads: {
  enabled: boolean;
  slots: Record<AdSlotName, AdSlotConfig>;
} = {
  enabled: false,
  slots: {
    packPage: { width: 728, height: 90, tag: "" },
    exploreEnd: { width: 728, height: 90, tag: "" },
    exploreEmpty: { width: 300, height: 250, tag: "" },
    download: { width: 300, height: 250, tag: "" },
  },
};
