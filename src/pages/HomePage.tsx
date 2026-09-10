import { CardSheen, CardSpotlight } from "@/components/motion/CardShine";
import { Reveal } from "@/components/motion/Reveal";
import { PackGrid } from "@/components/packs/PackGrid";
import { PackPreview } from "@/components/packs/PackPreview";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useDownloadStats } from "@/data/DownloadStats";
import { sortPacks } from "@/lib/search";
import { cardTiltClass, useCardTilt } from "@/hooks/useCardTilt";
import { cn } from "@/lib/utils";
import type { Pack, PackImage } from "@/types";
import { ArrowRight, Download, Eye, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: Gamepad2,
    title: "1.8.9 only",
    copy: "Java Edition PvP packs. No mixed versions, no Bedrock.",
  },
  {
    icon: Eye,
    title: "Preview first",
    copy: "Swords, foods, menus, and skies before you download.",
  },
  {
    icon: Download,
    title: "Direct files",
    copy: "Grab the zip and drop it into your resourcepacks folder.",
  },
];

export function HomePage() {
  const { counts } = useDownloadStats();
  const catalog = sortPacks(packs, "popular", counts);
  const lead = catalog[0];
  const extras = lead?.gallery.filter((item) => item.src !== lead.cover).slice(0, 3) ?? [];

  useDocumentMeta({
    title: `${site.name} | Minecraft 1.8.9 PvP resource packs`,
    description: site.description,
    path: "/",
    image: lead?.cover,
  });

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:pt-20">
        <div>
          <Reveal shift={10}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-stroke bg-raised/70 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.16em] text-mute">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-halo absolute inset-0 rounded-full bg-accent" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              1.8.9 PvP packs
            </p>
          </Reveal>

          <Reveal delay={70} shift={12}>
            <h1 className="max-w-xl text-[2.7rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
              Find your next PvP pack.
            </h1>
          </Reveal>

          <Reveal delay={130} shift={12}>
            <p className="mt-5 max-w-md text-[17px] leading-7 text-mute">
              A clean catalog of 1.8.9 Java Edition resource packs. Inspect the previews, then download.
            </p>
          </Reveal>

          <Reveal delay={190} shift={12}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/explore" className="group/cta">
                Browse packs
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/cta:translate-x-1" />
              </ButtonLink>
              {lead ? (
                <ButtonLink to={`/packs/${lead.slug}`} variant="secondary">
                  View {lead.name}
                </ButtonLink>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={250} shift={12}>
            <dl className="mt-10 grid max-w-sm grid-cols-3 gap-4 border-t border-stroke pt-6">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-faint">Packs</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{packs.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-faint">Version</dt>
                <dd className="mt-1 text-lg font-semibold">1.8.9</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-faint">Price</dt>
                <dd className="mt-1 text-lg font-semibold">Free</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        {lead ? (
          <Reveal delay={120} shift={16} className="grid gap-3 [perspective:1100px]">
            <FeaturedShot pack={lead} />

            {extras.length ? (
              <div className="grid grid-cols-3 gap-3 [perspective:1100px]">
                {extras.map((item, index) => (
                  <Reveal key={item.src} delay={220 + index * 70} shift={12}>
                    <ExtraShot pack={lead} image={item} />
                  </Reveal>
                ))}
              </div>
            ) : null}
          </Reveal>
        ) : null}
      </section>

      <section className="border-y border-stroke bg-page-soft/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {highlights.map((item, index) => (
            <Reveal key={item.title} delay={index * 80} shift={12}>
              <div className="group flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-stroke bg-raised text-accent-2 transition-[border-color,transform,background-color] duration-300 ease-[var(--ease-out-soft)] group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:bg-panel">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-mute">{item.copy}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="packs" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <Reveal>
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">All packs</h2>
              <p className="mt-1 text-sm text-mute">Sorted by most downloaded.</p>
            </div>
            <Link
              to="/explore"
              className="group/link flex shrink-0 items-center gap-1.5 text-sm text-mute transition-colors hover:text-ink"
            >
              Explore
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/link:translate-x-1" />
            </Link>
          </div>
        </Reveal>
        <PackGrid packs={catalog} />
      </section>
    </div>
  );
}

function FeaturedShot({ pack }: { pack: Pack }) {
  const tilt = useCardTilt<HTMLAnchorElement>();

  return (
    <Link
      ref={tilt.ref}
      to={`/packs/${pack.slug}`}
      onPointerEnter={tilt.onPointerEnter}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      className={cn(
        "group relative overflow-hidden rounded-[14px] border border-stroke bg-raised shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05),0_22px_50px_rgb(0_0_0_/_0.32)] transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:border-stroke-strong hover:shadow-[0_30px_70px_-16px_rgb(0_0_0_/_0.55)]",
        cardTiltClass,
      )}
    >
      <CardSpotlight />
      <div className="relative overflow-hidden">
        <PackPreview
          src={pack.cover}
          alt={`${pack.name} thumbnail`}
          className="aspect-[16/9] sm:aspect-[16/10]"
          priority
          zoom
        />
        <CardSheen />
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
          <Badge tone="accent">Featured</Badge>
          <Badge>{pack.resolution}</Badge>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between gap-3 bg-raised px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{pack.name}</p>
          <p className="truncate text-[13px] text-mute">by {pack.creator}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-accent-2">
          Open pack
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function ExtraShot({ pack, image }: { pack: Pack; image: PackImage }) {
  const tilt = useCardTilt<HTMLAnchorElement>();

  return (
    <Link
      ref={tilt.ref}
      to={`/packs/${pack.slug}`}
      onPointerEnter={tilt.onPointerEnter}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      className={cn(
        "group relative block overflow-hidden rounded-[10px] border border-stroke bg-raised transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:border-stroke-strong hover:shadow-[0_16px_28px_-14px_rgb(0_0_0_/_0.45)]",
        cardTiltClass,
      )}
    >
      <CardSpotlight />
      <div className="relative overflow-hidden">
        <PackPreview
          src={image.src}
          alt={`${pack.name} ${image.label.toLowerCase()} preview`}
          className="aspect-[16/11]"
          zoom
        />
        <CardSheen />
      </div>
      <span className="relative z-10 block px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-mute transition-colors group-hover:text-ink">
        {image.label}
      </span>
    </Link>
  );
}
