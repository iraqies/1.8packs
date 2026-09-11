import { PackPreview } from "@/components/packs/PackPreview";
import { Badge } from "@/components/ui/Badge";
import { useDownloadStats } from "@/data/DownloadStats";
import { formatDownloads, labelFeature } from "@/lib/utils";
import type { Pack } from "@/types";
import { Link } from "react-router-dom";

export function PackCard({ pack }: { pack: Pack }) {
  const { enabled, downloadsFor } = useDownloadStats();

  return (
    <Link
      to={`/packs/${pack.slug}`}
      className="block overflow-hidden rounded-lg border border-stroke bg-raised hover:border-stroke-strong"
    >
      <PackPreview src={pack.cover} alt={`${pack.name} preview`} className="aspect-[16/10]" />

      <div className="grid gap-2.5 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-ink">{pack.name}</h3>
            <p className="mt-0.5 truncate text-[13px] text-mute">
              by {pack.creator}
              {enabled ? (
                <span className="text-faint"> · {formatDownloads(downloadsFor(pack.slug))} downloads</span>
              ) : null}
            </p>
          </div>
          <Badge>{pack.resolution}</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>1.8.9</Badge>
          {pack.features.slice(0, 2).map((feature) => (
            <Badge key={feature}>{labelFeature(feature)}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
