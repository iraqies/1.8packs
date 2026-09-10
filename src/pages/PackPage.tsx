import { AdSlot } from "@/components/ads/AdSlot";
import { DownloadButton } from "@/components/download/DownloadButton";
import { Reveal } from "@/components/motion/Reveal";
import { PackGallery } from "@/components/packs/PackGallery";
import { PackGrid } from "@/components/packs/PackGrid";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/config";
import { getPack, packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useDownloadStats } from "@/data/DownloadStats";
import { similarPacks } from "@/lib/search";
import { formatDate, formatDownloads, labelFeature } from "@/lib/utils";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

export function PackPage() {
  const { slug } = useParams();
  const pack = slug ? getPack(slug) : undefined;
  const stats = useDownloadStats();
  const related = useMemo(() => (pack ? similarPacks(packs, pack) : []), [pack]);
  const gallery = useMemo(
    () =>
      pack ? [{ src: pack.cover, label: "Cover" }, ...pack.gallery.filter((item) => item.src !== pack.cover)] : [],
    [pack],
  );

  useDocumentMeta({
    title: pack ? `${pack.name} | 1.8.9 PvP Resource Pack` : `Page not found | ${site.name}`,
    description: pack ? pack.description : "This page is not in 1.8packs.",
    path: `/packs/${slug ?? "missing"}`,
    image: pack?.cover,
  });

  if (!pack || !gallery.length) {
    return <NotFoundPage />;
  }

  const details = [
    { label: "Version", value: pack.version },
    { label: "Resolution", value: pack.resolution },
    ...(stats.enabled
      ? [{ label: "Downloads", value: formatDownloads(stats.downloadsFor(pack.slug)) }]
      : []),
    { label: "Updated", value: formatDate(pack.updatedAt) },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center text-sm text-mute" aria-label="Breadcrumb">
        <Link to="/explore" className="transition-colors hover:text-ink">
          Explore
        </Link>
        <ChevronRight className="mx-1 h-3.5 w-3.5 text-faint" />
        <span className="text-ink">{pack.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <Reveal shift={10}>
          <PackGallery images={gallery} packName={pack.name} />
        </Reveal>

        <Reveal delay={80} shift={10} className="lg:sticky lg:top-24">
          <aside className="rounded-[14px] border border-stroke bg-raised p-6 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">1.8.9</Badge>
              <Badge>{pack.resolution}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{pack.name}</h1>
            <p className="mt-1 text-mute">by {pack.creator}</p>
            <p className="mt-4 text-sm leading-6 text-mute">{pack.description}</p>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {pack.features.map((feature) => (
                <Badge key={feature}>{labelFeature(feature)}</Badge>
              ))}
            </div>

            <div className="mt-6">
              <DownloadButton key={pack.slug} pack={pack} />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-stroke pt-5">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-faint">{detail.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{detail.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-[13px] leading-6 text-faint">
              Drop the zip into <code className="text-mute">.minecraft/resourcepacks</code>, then enable it in
              Options → Resource Packs.
            </p>
          </aside>
        </Reveal>
      </div>

      <AdSlot name="packPage" className="mt-14" />

      {related.length ? (
        <section className="mt-14">
          <Reveal>
            <h2 className="mb-5 text-xl font-semibold tracking-tight">More packs like this</h2>
          </Reveal>
          <PackGrid packs={related} />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: pack.name,
            description: pack.description,
            image: pack.cover,
            applicationCategory: "GameApplication",
            operatingSystem: "Minecraft Java Edition 1.8.9",
            softwareVersion: pack.version,
            isAccessibleForFree: true,
          }),
        }}
      />
    </article>
  );
}
