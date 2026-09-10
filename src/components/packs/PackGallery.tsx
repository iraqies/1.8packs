import { CardSheen, CardSpotlight } from "@/components/motion/CardShine";
import { cardTiltClass, useCardTilt } from "@/hooks/useCardTilt";
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

  const stage = useCardTilt<HTMLDivElement>();

  if (!active) return null;

  return (
    <div>
      <div
        ref={stage.ref}
        onPointerEnter={stage.onPointerEnter}
        onPointerMove={stage.onPointerMove}
        onPointerLeave={stage.onPointerLeave}
        style={stage.style}
        className={cn(
          "group relative overflow-hidden rounded-[14px] border border-stroke shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05),0_18px_40px_rgb(0_0_0_/_0.22)] transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:border-stroke-strong hover:shadow-[0_22px_44px_-16px_rgb(0_0_0_/_0.5)]",
          cardTiltClass,
        )}
      >
        <CardSpotlight />
        <div className="relative aspect-[16/10] bg-page-soft">
          <div
            aria-hidden="true"
            className={cn(
              "skeleton absolute inset-0 transition-opacity duration-500",
              loaded[active.src] ? "opacity-0" : "opacity-100",
            )}
          />
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
                "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out-soft)]",
                position === index ? "scale-100 opacity-100" : "pointer-events-none scale-[1.02] opacity-0",
              )}
            />
          ))}

          <CardSheen />
          <div className="hairline pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-page/80 to-transparent" />

          <p className="pointer-events-none absolute bottom-3 left-4 text-sm font-medium text-ink [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
            {active.label}
          </p>
          <p className="pointer-events-none absolute bottom-3 right-4 text-[12px] tabular-nums text-mute [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
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
            className="absolute right-3 top-3 flex h-9 w-9 -translate-y-1 items-center justify-center rounded-[8px] border border-stroke-strong bg-page/70 text-mute opacity-0 backdrop-blur transition-[opacity,transform,color] duration-300 ease-[var(--ease-out-soft)] hover:text-ink focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2 overflow-visible sm:grid-cols-4 lg:grid-cols-5 [perspective:1100px]">
        {images.map((image, position) => (
          <li key={image.src}>
            <GalleryThumb
              image={image}
              active={position === index}
              onSelect={() => setIndex(position)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-3 hidden text-[12px] text-faint sm:block">
        Use the arrow keys to move through previews, or open one full size.
      </p>

      {zoomed
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex flex-col bg-page/95 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-label={`${packName} ${active.label} preview`}
            >
              <div className="animate-fade flex items-center justify-between gap-4 px-4 py-3">
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
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-stroke bg-raised text-mute transition-colors hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
                <img
                  key={active.src}
                  src={active.src}
                  alt={`${packName} ${active.label.toLowerCase()} preview`}
                  className="animate-pop max-h-full max-w-full rounded-[10px] border border-stroke object-contain shadow-[0_30px_80px_rgb(0_0_0_/_0.6)]"
                />
                {count > 1 ? (
                  <>
                    <GalleryArrow side="left" onClick={() => step(-1)} always />
                    <GalleryArrow side="right" onClick={() => step(1)} always />
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
  const tilt = useCardTilt<HTMLButtonElement>();

  return (
    <button
      ref={tilt.ref}
      type="button"
      onClick={onSelect}
      onPointerEnter={tilt.onPointerEnter}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      aria-pressed={active}
      aria-label={`Show ${image.label} preview`}
      className={cn(
        "group relative w-full overflow-hidden rounded-[8px] border bg-raised text-left transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)]",
        cardTiltClass,
        active
          ? "border-accent shadow-[0_0_0_1px_rgb(78_141_240_/_0.35)]"
          : "border-stroke hover:border-stroke-strong hover:shadow-[0_16px_28px_-14px_rgb(0_0_0_/_0.45)]",
      )}
    >
      <CardSpotlight />
      <div className="relative aspect-[16/10] overflow-hidden bg-page-soft">
        <img
          src={image.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "h-full w-full object-cover transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]",
            active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
            "group-hover:scale-[1.045]",
          )}
        />
        <CardSheen />
      </div>
      <span
        className={cn(
          "relative z-10 block px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
          active ? "text-accent-2" : "text-mute group-hover:text-ink",
        )}
      >
        {image.label}
      </span>
    </button>
  );
}

function GalleryArrow({
  side,
  onClick,
  always = false,
}: {
  side: "left" | "right";
  onClick: () => void;
  always?: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous preview" : "Next preview"}
      className={cn(
        "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stroke-strong bg-page/70 text-mute backdrop-blur transition-[opacity,transform,color] duration-300 ease-[var(--ease-out-soft)] hover:text-ink",
        side === "left" ? "left-3" : "right-3",
        always
          ? "opacity-100"
          : cn(
              "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
              side === "left"
                ? "-translate-x-2 focus-visible:translate-x-0 group-hover:translate-x-0"
                : "translate-x-2 focus-visible:translate-x-0 group-hover:translate-x-0",
            ),
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
