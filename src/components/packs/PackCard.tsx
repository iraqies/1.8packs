import { CardSheen, CardSpotlight } from "@/components/motion/CardShine";
import { PackPreview } from "@/components/packs/PackPreview";
import { Badge } from "@/components/ui/Badge";
import { cardTiltClass, useCardTilt } from "@/hooks/useCardTilt";
import { useDownloadStats } from "@/data/DownloadStats";
import { cn, formatDownloads, labelFeature } from "@/lib/utils";
import type { Pack } from "@/types";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function PackCard({ pack }: { pack: Pack }) {
  const tilt = useCardTilt<HTMLAnchorElement>();
  const { enabled, downloadsFor } = useDownloadStats();

  return (
    <Link
      ref={tilt.ref}
      to={`/packs/${pack.slug}`}
      onPointerEnter={tilt.onPointerEnter}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      className={cn(
        "group relative block overflow-hidden rounded-[12px] border border-stroke bg-raised shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:border-stroke-strong hover:shadow-[0_22px_44px_-16px_rgb(0_0_0_/_0.5)]",
        cardTiltClass,
      )}
    >
      <CardSpotlight />

      <div className="relative overflow-hidden">
        <PackPreview src={pack.cover} alt={`${pack.name} preview`} className="aspect-[16/10]" zoom />
        <CardSheen />
        <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex h-7 w-7 translate-y-1 items-center justify-center rounded-[7px] border border-stroke-strong bg-page/70 text-accent-2 opacity-0 backdrop-blur transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)] group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="relative z-10 grid gap-2.5 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold tracking-tight text-ink">{pack.name}</h3>
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
