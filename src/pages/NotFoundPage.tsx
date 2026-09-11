import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  useDocumentMeta({
    title: `Page not found | ${site.name}`,
    description: "This page is not in 1.8packs.",
    path: "/404",
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 leading-7 text-mute">That URL is not on this site. Home or Explore will get you back.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to="/">Home</ButtonLink>
        <ButtonLink to="/explore" variant="secondary">
          Explore packs
        </ButtonLink>
      </div>

      {packs.length ? (
        <div className="mt-10 border-t border-stroke pt-6">
          <p className="text-sm text-faint">Packs</p>
          <nav className="mt-3 grid gap-2 text-sm" aria-label="Packs">
            {packs.map((pack) => (
              <Link key={pack.slug} to={`/packs/${pack.slug}`} className="w-fit text-mute hover:text-ink">
                {pack.name}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
