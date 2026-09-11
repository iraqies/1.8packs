import { Logo } from "@/components/layout/Logo";
import { openCommandPalette } from "@/components/ui/CommandPalette";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV = [{ to: "/explore", label: "Explore" }];

const IS_APPLE = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.userAgent);
const SHORTCUT_LABEL = IS_APPLE ? "⌘K" : "Ctrl K";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-page">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("rounded-md px-2.5 py-1.5 text-sm", isActive ? "text-ink" : "text-mute hover:text-ink")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={openCommandPalette}
          className="ml-auto hidden h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-stroke bg-raised px-3 text-left text-sm text-faint hover:border-stroke-strong hover:text-mute md:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search packs</span>
          <kbd className="shrink-0 rounded border border-stroke bg-page-soft px-1.5 py-0.5 text-[11px]">
            {SHORTCUT_LABEL}
          </kbd>
        </button>

        <button
          type="button"
          onClick={openCommandPalette}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-mute hover:bg-raised hover:text-ink md:hidden"
          aria-label="Search packs"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
