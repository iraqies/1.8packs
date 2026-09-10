import { Reveal } from "@/components/motion/Reveal";
import { PackCard } from "@/components/packs/PackCard";
import type { Pack } from "@/types";

const STAGGER_MS = 70;
const MAX_DELAY_MS = 350;

export function PackGrid({ packs }: { packs: Pack[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 overflow-visible sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack, index) => (
        <Reveal
          as="li"
          key={pack.slug}
          delay={Math.min(index * STAGGER_MS, MAX_DELAY_MS)}
          shift={18}
          className="[perspective:1100px]"
        >
          <PackCard pack={pack} />
        </Reveal>
      ))}
    </ul>
  );
}
