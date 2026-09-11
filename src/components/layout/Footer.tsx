import { Logo } from "@/components/layout/Logo";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDownloadStats } from "@/data/DownloadStats";
import { sortPacks } from "@/lib/search";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="w-fit text-mute hover:text-ink">
      {children}
    </Link>
  );
}

export function Footer() {
  const { counts } = useDownloadStats();

  return (
    <footer className="mt-auto border-t border-stroke bg-page-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-mute">
            1.8.9 Java packs. The pictures are in-game screenshots.
          </p>
        </div>

        <div>
          <p className="text-sm text-faint">Packs</p>
          <nav className="mt-3 grid gap-2 text-sm" aria-label="Footer packs">
            {sortPacks(packs, "popular", counts).map((pack) => (
              <FooterLink key={pack.slug} to={`/packs/${pack.slug}`}>
                {pack.name}
              </FooterLink>
            ))}
            <FooterLink to="/explore">Explore</FooterLink>
          </nav>
        </div>

        <div>
          <p className="text-sm text-faint">Site</p>
          <nav className="mt-3 grid gap-2 text-sm" aria-label="Footer">
            <FooterLink to="/terms">Terms</FooterLink>
            <FooterLink to="/privacy">Privacy</FooterLink>
          </nav>
        </div>
      </div>

      <div className="border-t border-stroke">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[13px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>{site.name}</p>
          <p>No accounts. Download counts come from GitHub.</p>
        </div>
      </div>
    </footer>
  );
}
