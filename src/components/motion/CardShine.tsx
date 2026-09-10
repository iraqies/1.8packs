import { cn } from "@/lib/utils";

export function CardSpotlight({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -inset-px z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        className,
      )}
      style={{
        background:
          "radial-gradient(240px circle at var(--mx) var(--my), rgb(255 255 255 / 0.1), transparent 62%)",
      }}
    />
  );
}

export function CardSheen({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:animate-sheen group-hover:opacity-100",
        className,
      )}
    />
  );
}
