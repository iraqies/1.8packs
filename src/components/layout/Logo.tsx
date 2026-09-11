import { site } from "@/config";
import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 text-ink" aria-label={`${site.name} home`}>
      <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-stroke-strong">
        <span className="bg-accent" />
        <span className="bg-panel" />
        <span className="bg-panel" />
        <span className="bg-accent-2" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
    </Link>
  );
}
