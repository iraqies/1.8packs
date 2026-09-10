import type { Feature, Pack, Resolution } from "@/types";

export const SORTS = ["popular", "newest", "name"] as const;
export type SortKey = (typeof SORTS)[number];

export function parseSort(value: string | null): SortKey {
  return SORTS.includes(value as SortKey) ? (value as SortKey) : "popular";
}

export function sortPacks(list: Pack[], sort: SortKey = "popular", counts: Record<string, number> = {}) {
  const copy = list.slice();
  if (sort === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    return copy;
  }
  if (sort === "newest") {
    copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt));
    return copy;
  }
  copy.sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) || a.name.localeCompare(b.name));
  return copy;
}

/**
 * Subsequence match that rewards contiguous runs and word-boundary hits, so
 * "hmio" still finds "Haimiya Mio" while ranking exact prefixes higher.
 * Returns null when the query characters are not all present in order.
 */
export function fuzzyScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().replace(/\s+/g, "");
  if (!needle) return 0;

  let cursor = 0;
  let score = 0;
  let streak = 0;

  for (const char of needle) {
    const at = haystack.indexOf(char, cursor);
    if (at === -1) return null;

    if (at === cursor && cursor > 0) {
      streak += 1;
      score += 8 + streak * 3;
    } else {
      streak = 0;
      score += 1;
    }

    const previous = haystack[at - 1];
    if (at === 0 || (previous !== undefined && /[\s\-_/.]/.test(previous))) score += 6;
    score -= Math.min(6, at - cursor);
    cursor = at + 1;
  }

  return score;
}

const FIELD_WEIGHTS: Array<{ weight: number; read: (pack: Pack) => string }> = [
  { weight: 3, read: (pack) => pack.name },
  { weight: 2, read: (pack) => pack.creator },
  { weight: 1, read: (pack) => pack.resolution },
  { weight: 1, read: (pack) => pack.features.join(" ") },
  { weight: 1, read: (pack) => pack.gallery.map((item) => item.label).join(" ") },
];

export function rankPacks(packs: Pack[], query: string, limit = 6, counts: Record<string, number> = {}) {
  const q = query.trim();
  if (!q) return sortPacks(packs, "popular", counts).slice(0, limit);

  return packs
    .map((pack) => {
      let best = -Infinity;
      for (const field of FIELD_WEIGHTS) {
        const score = fuzzyScore(field.read(pack), q);
        if (score !== null) best = Math.max(best, score * field.weight);
      }
      return { pack, score: best };
    })
    .filter((entry) => entry.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.pack);
}

export function matchesQuery(pack: Pack, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [pack.name, pack.creator, pack.slug, ...pack.features, ...pack.gallery.map((item) => item.label)]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function searchPacks(
  packs: Pack[],
  query: string,
  filters: { resolution?: Resolution; feature?: Feature } = {},
) {
  return packs.filter((pack) => {
    if (!matchesQuery(pack, query)) return false;
    if (filters.resolution && pack.resolution !== filters.resolution) return false;
    if (filters.feature && !pack.features.includes(filters.feature)) return false;
    return true;
  });
}

export function similarPacks(packs: Pack[], current: Pack, limit = 3) {
  return packs
    .filter((pack) => pack.slug !== current.slug)
    .map((pack) => {
      const featureScore = pack.features.filter((item) => current.features.includes(item)).length;
      return { pack, score: featureScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.pack);
}
