import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function PackPreview({
  src,
  alt,
  className,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  caption?: string;
  priority?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-page-soft", className)}>
      {!loaded ? <div aria-hidden="true" className="absolute inset-0 bg-panel" /> : null}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn("h-full w-full object-cover", loaded ? "opacity-100" : "opacity-0")}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
      {caption ? (
        <p className="pointer-events-none absolute bottom-3 left-3 text-sm font-medium text-ink [text-shadow:0_1px_8px_rgb(0_0_0_/_0.85)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
