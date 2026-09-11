import { AdSlot } from "@/components/ads/AdSlot";
import { PackGrid } from "@/components/packs/PackGrid";
import { SearchInput } from "@/components/packs/SearchInput";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useDownloadStats } from "@/data/DownloadStats";
import { parseSort, searchPacks, sortPacks, SORTS, type SortKey } from "@/lib/search";
import { cn, labelFeature } from "@/lib/utils";
import { FEATURES, RESOLUTIONS, type Feature, type Resolution } from "@/types";
import { useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

const liveResolutions = RESOLUTIONS.filter((value) => packs.some((pack) => pack.resolution === value));
const liveFeatures = FEATURES.filter((value) => packs.some((pack) => pack.features.includes(value)));

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-md border px-3 text-[13px] font-medium",
        active ? "border-stroke-strong bg-panel text-ink" : "border-stroke bg-raised text-mute hover:border-stroke-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const resolution = (params.get("res") ?? "") as Resolution | "";
  const feature = (params.get("feature") ?? "") as Feature | "";
  const sort = parseSort(params.get("sort"));
  const { counts } = useDownloadStats();
  const results = useMemo(
    () =>
      sortPacks(
        searchPacks(packs, query, { resolution: resolution || undefined, feature: feature || undefined }),
        sort,
        counts,
      ),
    [query, resolution, feature, sort, counts],
  );
  const focus = params.get("focus") === "1";
  const filtered = Boolean(query || resolution || feature);

  useDocumentMeta({
    title: `Explore packs | ${site.name}`,
    description: "Search 1.8.9 PvP resource packs by name, creator, resolution, or feature.",
    path: `/explore${params.toString() ? `?${params.toString()}` : ""}`,
  });

  useEffect(() => {
    if (!focus) return;
    const next = new URLSearchParams(params);
    next.delete("focus");
    setParams(next, { replace: true });
  }, [focus, params, setParams]);

  function writeParams(nextQuery: string, nextRes: string, nextFeature: string, nextSort: SortKey = sort) {
    const next = new URLSearchParams();
    if (nextQuery.trim()) next.set("q", nextQuery.trim());
    if (nextRes) next.set("res", nextRes);
    if (nextFeature) next.set("feature", nextFeature);
    if (nextSort !== "popular") next.set("sort", nextSort);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Explore packs</h1>
        <p className="mt-3 text-mute">Search by name or creator. Filter by resolution and features if you want.</p>
      </div>

      <div className="mt-8">
        <SearchInput value={query} onChange={(value) => writeParams(value, resolution, feature)} autoFocus={focus} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <p className="pt-1.5 text-sm text-faint">Resolution</p>
        <div className="flex flex-wrap gap-2">
          {liveResolutions.map((value) => (
            <FilterChip
              key={value}
              active={resolution === value}
              onClick={() => writeParams(query, resolution === value ? "" : value, feature)}
            >
              {value}
            </FilterChip>
          ))}
        </div>

        <p className="pt-1.5 text-sm text-faint">Features</p>
        <div className="flex flex-wrap gap-2">
          {liveFeatures.map((value) => (
            <FilterChip
              key={value}
              active={feature === value}
              onClick={() => writeParams(query, resolution, feature === value ? "" : value)}
            >
              {labelFeature(value)}
            </FilterChip>
          ))}
        </div>

        <p className="pt-1.5 text-sm text-faint">Sort</p>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((value) => (
            <FilterChip
              key={value}
              active={sort === value}
              onClick={() => writeParams(query, resolution, feature, value)}
            >
              {value === "popular" ? "Popular" : value === "newest" ? "Newest" : "Name"}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-stroke pt-5">
        <p className="text-sm text-faint">
          <span className="tabular-nums text-mute">{results.length}</span>{" "}
          {results.length === 1 ? "pack" : "packs"}
          {filtered ? " matching" : ""}
        </p>
        {filtered ? (
          <button
            type="button"
            onClick={() => writeParams("", "", "")}
            className="text-sm text-mute hover:text-ink"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-6">
        {results.length ? (
          <>
            <PackGrid packs={results} />
            <AdSlot name="exploreEnd" className="mt-14" />
          </>
        ) : (
          <div className="rounded-lg border border-stroke bg-raised px-5 py-14 text-center">
            <p className="text-ink">Nothing matches that search.</p>
            <p className="mt-1 text-sm text-mute">Try another name, or clear the filters.</p>
            <button
              type="button"
              onClick={() => writeParams("", "", "")}
              className="mt-5 text-sm text-accent-2 hover:text-ink"
            >
              Clear filters
            </button>
            <AdSlot name="exploreEmpty" className="mt-10" />
          </div>
        )}
      </div>
    </div>
  );
}
