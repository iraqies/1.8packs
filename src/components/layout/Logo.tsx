import { site } from "@/config";
import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5 text-ink" aria-label={`${site.name} home`}>
      <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-[6px] border border-stroke-strong shadow-[inset_0_1px_0_rgb(255_255_255_/_0.1)] transition-transform duration-400 ease-[var(--ease-out-soft)] group-hover:rotate-180">
        <span className="bg-accent" />
        <span className="bg-panel" />
        <span className="bg-panel" />
        <span className="bg-accent-2" />
      </span>
      {compact ? null : (
        <span className="text-[15px] font-semibold tracking-tight transition-colors duration-300 group-hover:text-accent-2">
          {site.name}
        </span>
      )}
    </Link>
  );
}
