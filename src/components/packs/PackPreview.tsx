import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function PackPreview({
  src,
  alt,
  className,
  caption,
  priority = false,
  zoom = false,
}: {
  src: string;
  alt: string;
  className?: string;
  caption?: string;
  priority?: boolean;
  zoom?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    // Cached images can finish before React attaches the load handler.
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-page-soft", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "skeleton absolute inset-0 transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-[var(--ease-out-soft)]",
          loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.04] opacity-0 blur-md",
          zoom && "group-hover:scale-[1.045] group-hover:duration-500",
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
      <div className="hairline pointer-events-none absolute inset-0" />
      {caption ? (
        <p className="pointer-events-none absolute bottom-3 left-3 text-sm font-medium text-ink [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
