import { Logo } from "@/components/layout/Logo";
import { openCommandPalette } from "@/components/ui/CommandPalette";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const NAV = [{ to: "/explore", label: "Explore" }];

const IS_APPLE = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.userAgent);
const SHORTCUT_LABEL = IS_APPLE ? "⌘K" : "Ctrl K";

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function check() {
      setScrolled(window.scrollY > threshold);
    }
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [threshold]);

  return scrolled;
}

export function Header() {
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-stroke bg-page/90 shadow-[0_10px_30px_-18px_rgb(0_0_0_/_0.9)]"
          : "border-transparent bg-page/60",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center gap-4 px-4 transition-[height] duration-300",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <Logo />
        <nav className="flex items-center gap-0.5" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative rounded-[7px] px-2.5 py-1.5 text-sm transition-colors",
                  isActive ? "text-ink" : "text-mute hover:bg-raised/70 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 -bottom-px h-px origin-center bg-accent transition-transform duration-300 ease-[var(--ease-out-soft)]",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={openCommandPalette}
          className="group ml-auto hidden h-10 min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-[8px] border border-stroke bg-raised/80 px-3 text-left text-sm text-faint shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] transition-colors hover:border-stroke-strong hover:text-mute md:flex"
        >
          <Search className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
          <span className="flex-1 truncate">Search packs or creators</span>
          <kbd className="shrink-0 rounded-[5px] border border-stroke bg-page-soft px-1.5 py-0.5 text-[11px]">
            {SHORTCUT_LABEL}
          </kbd>
        </button>

        <button
          type="button"
          onClick={openCommandPalette}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-[8px] text-mute transition-colors hover:bg-raised hover:text-ink md:hidden"
          aria-label="Search packs"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
