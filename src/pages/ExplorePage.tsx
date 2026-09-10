import { AdSlot } from "@/components/ads/AdSlot";
import { Reveal } from "@/components/motion/Reveal";
import { PackGrid } from "@/components/packs/PackGrid";
import { SearchInput } from "@/components/packs/SearchInput";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useDownloadStats } from "@/data/DownloadStats";
import { parseSort, searchPacks, sortPacks, SORTS, type SortKey } from "@/lib/search";
import { cn, labelFeature } from "@/lib/utils";
import { FEATURES, RESOLUTIONS, type Feature, type Resolution } from "@/types";
import { SearchX, X } from "lucide-react";
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
        "h-8 rounded-full border px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-200 ease-[var(--ease-out-soft)] active:scale-95",
        active
          ? "border-accent bg-accent-soft text-accent-2 shadow-[0_0_0_3px_rgb(78_141_240_/_0.08)]"
          : "border-stroke bg-raised text-mute hover:-translate-y-px hover:border-stroke-strong hover:text-ink",
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
    title: `Explore PvP packs | ${site.name}`,
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
      <Reveal shift={10}>
        <div className="max-w-2xl">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-mute">Catalog</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Explore packs</h1>
          <p className="mt-3 text-mute">Search by name or creator, then narrow by resolution and features.</p>
        </div>
      </Reveal>

      <Reveal delay={70} shift={10}>
        <div className="mt-8">
          <SearchInput value={query} onChange={(value) => writeParams(value, resolution, feature)} autoFocus={focus} />
        </div>
      </Reveal>

      <Reveal delay={120} shift={10}>
        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <p className="pt-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">Resolution</p>
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

          <p className="pt-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">Features</p>
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

          <p className="pt-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">Sort</p>
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
      </Reveal>

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
            className="animate-fade flex items-center gap-1.5 text-sm text-mute transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
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
          <div className="animate-pop rounded-[12px] border border-stroke bg-raised px-5 py-14 text-center">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] border border-stroke bg-page-soft text-faint">
              <SearchX className="h-5 w-5" />
            </span>
            <p className="text-ink">No packs match this search.</p>
            <p className="mt-1 text-sm text-mute">Try a different name, creator, or filter.</p>
            <button
              type="button"
              onClick={() => writeParams("", "", "")}
              className="mt-5 text-sm text-accent-2 transition-colors hover:text-ink"
            >
              Reset everything
            </button>
            <AdSlot name="exploreEmpty" className="mt-10" />
          </div>
        )}
      </div>
    </div>
  );
}
