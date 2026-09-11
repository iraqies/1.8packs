import { PackGrid } from "@/components/packs/PackGrid";
import { PackPreview } from "@/components/packs/PackPreview";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useDownloadStats } from "@/data/DownloadStats";
import { sortPacks } from "@/lib/search";
import type { Pack, PackImage } from "@/types";
import { Link } from "react-router-dom";

export function HomePage() {
  const { counts } = useDownloadStats();
  const listed = sortPacks(packs, "popular", counts);
  const lead = listed[0];
  const extras = lead?.gallery.filter((item) => item.src !== lead.cover).slice(0, 3) ?? [];

  useDocumentMeta({
    title: `${site.name} | Minecraft 1.8.9 PvP resource packs`,
    description: site.description,
    path: "/",
    image: lead?.cover,
  });

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            1.8.9 PvP resource packs
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-mute">
            In-game screenshots of swords, food, menus, and sky. Download the zip if you like what you see.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to="/explore">Browse packs</ButtonLink>
            {lead ? (
              <ButtonLink to={`/packs/${lead.slug}`} variant="secondary">
                {lead.name}
              </ButtonLink>
            ) : null}
          </div>
        </div>

        {lead ? (
          <div className="grid gap-3">
            <FeaturedShot pack={lead} />
            {extras.length ? (
              <div className="grid grid-cols-3 gap-3">
                {extras.map((item) => (
                  <ExtraShot key={item.src} pack={lead} image={item} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section id="packs" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Packs</h2>
            <p className="mt-1 text-sm text-mute">Most downloaded first.</p>
          </div>
          <Link to="/explore" className="shrink-0 text-sm text-mute hover:text-ink">
            Explore
          </Link>
        </div>
        <PackGrid packs={listed} />
      </section>
    </div>
  );
}

function FeaturedShot({ pack }: { pack: Pack }) {
  return (
    <Link
      to={`/packs/${pack.slug}`}
      className="group overflow-hidden rounded-lg border border-stroke bg-raised hover:border-stroke-strong"
    >
      <div className="relative">
        <PackPreview src={pack.cover} alt={`${pack.name} thumbnail`} className="aspect-video" priority />
        <div className="absolute left-3 top-3">
          <Badge>{pack.resolution}</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{pack.name}</p>
          <p className="truncate text-[13px] text-mute">by {pack.creator}</p>
        </div>
        <span className="shrink-0 text-sm text-mute group-hover:text-ink">Open</span>
      </div>
    </Link>
  );
}

function ExtraShot({ pack, image }: { pack: Pack; image: PackImage }) {
  return (
    <Link
      to={`/packs/${pack.slug}`}
      className="group overflow-hidden rounded-lg border border-stroke bg-raised hover:border-stroke-strong"
    >
      <PackPreview src={image.src} alt={`${pack.name} ${image.label.toLowerCase()} preview`} className="aspect-[16/11]" />
      <span className="block px-2.5 py-1.5 text-xs text-mute group-hover:text-ink">{image.label}</span>
    </Link>
  );
}
