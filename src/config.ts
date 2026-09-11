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
  tagline: "1.8.9 PvP resource packs",
  description: "Minecraft 1.8.9 PvP resource packs with in-game screenshots and a zip download.",
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

const BANNER_300 = `<script>
  atOptions = {
    'key' : '038f81c69d6b45e043831df5e0f999f6',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/038f81c69d6b45e043831df5e0f999f6/invoke.js"></script>`;

const BANNER_728 = `<script>
  atOptions = {
    'key' : '763e178d051412ea49242b9406afb438',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/763e178d051412ea49242b9406afb438/invoke.js"></script>`;

export const ads: {
  enabled: boolean;
  /** Site-wide Adsterra popunder. Loaded on the live host only, not localhost. */
  popunderSrc: string;
  slots: Record<AdSlotName, AdSlotConfig>;
} = {
  enabled: true,
  popunderSrc: "https://pl31284844.profitableratecpmnetwork.com/6b/11/8f/6b118f869f0b5f67f56e90fc1b850bf3.js",
  slots: {
    packPage: { width: 728, height: 90, tag: BANNER_728 },
    exploreEnd: { width: 728, height: 90, tag: BANNER_728 },
    exploreEmpty: { width: 300, height: 250, tag: BANNER_300 },
    download: { width: 300, height: 250, tag: BANNER_300 },
  },
};
