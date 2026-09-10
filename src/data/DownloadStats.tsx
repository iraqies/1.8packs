import { githubRelease } from "@/config";
import { fetchReleaseDownloadCounts } from "@/lib/githubReleases";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface DownloadStats {
  /** True once VITE_CDN_BASE points at a GitHub release. */
  enabled: boolean;
  ready: boolean;
  counts: Record<string, number>;
  downloadsFor: (slug: string) => number;
}

const DownloadStatsContext = createContext<DownloadStats>({
  enabled: false,
  ready: true,
  counts: {},
  downloadsFor: () => 0,
});

export function DownloadStatsProvider({ children }: { children: ReactNode }) {
  const enabled = Boolean(githubRelease);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchReleaseDownloadCounts()
      .then((next) => {
        if (alive) setCounts(next);
      })
      .catch(() => {
        if (alive) setCounts({});
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  const value = useMemo<DownloadStats>(
    () => ({
      enabled,
      ready,
      counts,
      downloadsFor: (slug: string) => counts[slug] ?? 0,
    }),
    [enabled, ready, counts],
  );

  return <DownloadStatsContext.Provider value={value}>{children}</DownloadStatsContext.Provider>;
}

export function useDownloadStats() {
  return useContext(DownloadStatsContext);
}
