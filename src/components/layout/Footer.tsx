import { Logo } from "@/components/layout/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/config";
import { packs } from "@/data/packs";
import { useDownloadStats } from "@/data/DownloadStats";
import { sortPacks } from "@/lib/search";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="w-fit text-mute transition-[color,transform] duration-200 ease-[var(--ease-out-soft)] hover:translate-x-0.5 hover:text-ink"
    >
      {children}
    </Link>
  );
}

export function Footer() {
  const { counts } = useDownloadStats();

  return (
    <footer className="mt-auto border-t border-stroke bg-page-soft/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal shift={10}>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-mute">
            A small catalog of 1.8.9 Java Edition PvP resource packs. Preview first, then download.
          </p>
        </Reveal>

        <Reveal delay={70} shift={10}>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">Packs</p>
          <nav className="mt-3 grid gap-2 text-sm" aria-label="Footer packs">
            {sortPacks(packs, "popular", counts).map((pack) => (
              <FooterLink key={pack.slug} to={`/packs/${pack.slug}`}>
                {pack.name}
              </FooterLink>
            ))}
            <FooterLink to="/explore">Explore all</FooterLink>
          </nav>
        </Reveal>

        <Reveal delay={140} shift={10}>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">Site</p>
          <nav className="mt-3 grid gap-2 text-sm" aria-label="Footer">
            <FooterLink to="/terms">Terms</FooterLink>
            <FooterLink to="/privacy">Privacy</FooterLink>
          </nav>
        </Reveal>
      </div>

      <div className="border-t border-stroke/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[13px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>{site.name} · 1.8.9 only</p>
          <p>No accounts. Download totals come from GitHub Releases.</p>
        </div>
      </div>
    </footer>
  );
}
