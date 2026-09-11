import { cn } from "@/lib/utils";
import type { PackImage } from "@/types";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PackGalleryProps {
  images: PackImage[];
  packName: string;
}

export function PackGallery({ images, packName }: PackGalleryProps) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const count = images.length;
  const active = images[index];

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    setIndex(0);
    setZoomed(false);
  }, [packName]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && zoomed) {
        event.preventDefault();
        setZoomed(false);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, zoomed]);

  useEffect(() => {
    if (!zoomed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [zoomed]);

  function markLoaded(src: string) {
    setLoaded((current) => (current[src] ? current : { ...current, [src]: true }));
  }

  if (!active) return null;

  return (
    <div>
      <div className="group relative overflow-hidden rounded-lg border border-stroke">
        <div className="relative aspect-[16/10] bg-page-soft">
          {!loaded[active.src] ? <div aria-hidden="true" className="absolute inset-0 bg-panel" /> : null}
          {images.map((image, position) => (
            <img
              key={image.src}
              src={image.src}
              alt={`${packName} ${image.label.toLowerCase()} preview`}
              onLoad={() => markLoaded(image.src)}
              onError={() => markLoaded(image.src)}
              loading={position === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={position === 0 ? "high" : "low"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                position === index ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
          ))}

          <p className="pointer-events-none absolute bottom-3 left-4 text-sm font-medium text-ink [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
            {active.label}
          </p>
          <p className="pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums text-mute [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
            {index + 1} / {count}
          </p>

          {count > 1 ? (
            <>
              <GalleryArrow side="left" onClick={() => step(-1)} />
              <GalleryArrow side="right" onClick={() => step(1)} />
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="View preview full size"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-stroke bg-page text-mute hover:text-ink"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((image, position) => (
          <li key={image.src}>
            <GalleryThumb image={image} active={position === index} onSelect={() => setIndex(position)} />
          </li>
        ))}
      </ul>

      <p className="mt-3 hidden text-xs text-faint sm:block">Arrow keys change the preview. Click the expand button for full size.</p>

      {zoomed
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex flex-col bg-page"
              role="dialog"
              aria-modal="true"
              aria-label={`${packName} ${active.label} preview`}
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm text-mute">
                  {packName} · <span className="text-ink">{active.label}</span>
                  <span className="ml-2 tabular-nums text-faint">
                    {index + 1} / {count}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setZoomed(false)}
                  aria-label="Close preview"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-stroke bg-raised text-mute hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
                <img
                  key={active.src}
                  src={active.src}
                  alt={`${packName} ${active.label.toLowerCase()} preview`}
                  className="max-h-full max-w-full rounded-lg border border-stroke object-contain"
                />
                {count > 1 ? (
                  <>
                    <GalleryArrow side="left" onClick={() => step(-1)} />
                    <GalleryArrow side="right" onClick={() => step(1)} />
                  </>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function GalleryThumb({
  image,
  active,
  onSelect,
}: {
  image: PackImage;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Show ${image.label} preview`}
      className={cn(
        "w-full overflow-hidden rounded-md border bg-raised text-left",
        active ? "border-stroke-strong" : "border-stroke hover:border-stroke-strong",
      )}
    >
      <div className="aspect-[16/10] overflow-hidden bg-page-soft">
        <img src={image.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
      <span className={cn("block px-2 py-1.5 text-xs", active ? "text-ink" : "text-mute")}>{image.label}</span>
    </button>
  );
}

function GalleryArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous preview" : "Next preview"}
      className={cn(
        "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-stroke bg-page text-mute hover:text-ink",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
