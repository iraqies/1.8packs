import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  useDocumentMeta({
    title: `Page not found | ${site.name}`,
    description: "This page is not in 1.8packs.",
    path: "/404",
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <Reveal shift={10}>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-mute">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 leading-7 text-mute">
          That URL is not part of the site. Try home or explore to find a pack.
        </p>
      </Reveal>

      <Reveal delay={90} shift={10}>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to="/">Home</ButtonLink>
          <ButtonLink to="/explore" variant="secondary">
            Explore packs
          </ButtonLink>
        </div>
      </Reveal>

      {packs.length ? (
        <Reveal delay={160} shift={10}>
          <div className="mt-10 border-t border-stroke pt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Jump to a pack</p>
            <nav className="mt-3 grid gap-2 text-sm" aria-label="Packs">
              {packs.map((pack) => (
                <Link
                  key={pack.slug}
                  to={`/packs/${pack.slug}`}
                  className="group flex w-fit items-center gap-1.5 text-mute transition-colors hover:text-ink"
                >
                  {pack.name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-1" />
                </Link>
              ))}
            </nav>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
