import { PackCard } from "@/components/packs/PackCard";
import type { Pack } from "@/types";

export function PackGrid({ packs }: { packs: Pack[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => (
        <li key={pack.slug}>
          <PackCard pack={pack} />
        </li>
      ))}
    </ul>
  );
}
