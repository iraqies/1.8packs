import { Badge } from "@/components/ui/Badge";
import { useDownloadStats } from "@/data/DownloadStats";
import { packs } from "@/data/packs";
import { rankPacks } from "@/lib/search";
import { cn, labelFeature } from "@/lib/utils";
import type { Pack } from "@/types";
import { Compass, CornerDownLeft, FileText, Home, Search, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

const PALETTE_EVENT = "palette:open";

/** Lets any component (e.g. the header search field) raise the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(PALETTE_EVENT));
}

type Item =
  | { kind: "pack"; id: string; to: string; pack: Pack }
  | { kind: "link"; id: string; to: string; label: string; hint: string; icon: typeof Home };

const LINKS: Array<{ to: string; label: string; hint: string; icon: typeof Home }> = [
  { to: "/", label: "Home", hint: "Featured pack and catalog", icon: Home },
  { to: "/explore", label: "Explore packs", hint: "Search and filter everything", icon: Compass },
  { to: "/terms", label: "Terms", hint: "Usage and credit policy", icon: FileText },
  { to: "/privacy", label: "Privacy", hint: "What the site stores", icon: Shield },
];

function matchLinks(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return LINKS;
  return LINKS.filter((link) => `${link.label} ${link.hint}`.toLowerCase().includes(q));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { counts } = useDownloadStats();

  const items = useMemo<Item[]>(() => {
    const packItems: Item[] = rankPacks(packs, query, 6, counts).map((pack) => ({
      kind: "pack",
      id: `pack:${pack.slug}`,
      to: `/packs/${pack.slug}`,
      pack,
    }));
    const linkItems: Item[] = matchLinks(query).map((link) => ({
      kind: "link",
      id: `link:${link.to}`,
      to: link.to,
      label: link.label,
      hint: link.hint,
      icon: link.icon,
    }));
    return [...packItems, ...linkItems];
  }, [query, counts]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isPaletteKey = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (isPaletteKey) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      event.preventDefault();
      setOpen(true);
    }

    function onRequest() {
      setOpen(true);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onRequest);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape must work even if focus has moved outside the panel.
  useEffect(() => {
    if (!open) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      window.cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function onFieldKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!items.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setCursor((value) => (value + step + items.length) % items.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[cursor];
      if (item) navigate(item.to);
      else if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search packs"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="absolute inset-0 animate-fade cursor-default bg-page/80 backdrop-blur-sm"
      />
      <div
        onKeyDown={onFieldKey}
        className="animate-pop relative w-full max-w-xl overflow-hidden rounded-[14px] border border-stroke-strong bg-raised shadow-[0_30px_80px_rgb(0_0_0_/_0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-stroke px-4">
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search packs, creators, or pages"
            aria-label="Search packs, creators, or pages"
            autoComplete="off"
            className="h-14 w-full bg-transparent text-[15px] text-ink placeholder:text-faint outline-none"
          />
          <kbd className="hidden shrink-0 rounded-[5px] border border-stroke bg-page-soft px-1.5 py-0.5 text-[11px] text-faint sm:block">
            Esc
          </kbd>
        </div>

        {items.length ? (
          <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseMove={() => setCursor(index)}
                  onClick={() => {
                    navigate(item.to);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors",
                    cursor === index ? "bg-panel" : "hover:bg-panel/60",
                  )}
                >
                  {item.kind === "pack" ? (
                    <>
                      <img
                        src={item.pack.cover}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-16 shrink-0 rounded-[6px] border border-stroke object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.pack.name}</span>
                        <span className="block truncate text-[12px] text-mute">
                          by {item.pack.creator} · {item.pack.features.slice(0, 2).map(labelFeature).join(", ")}
                        </span>
                      </span>
                      <Badge>{item.pack.resolution}</Badge>
                    </>
                  ) : (
                    <>
                      <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-[6px] border border-stroke bg-page-soft text-accent-2">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                        <span className="block truncate text-[12px] text-mute">{item.hint}</span>
                      </span>
                    </>
                  )}
                  {cursor === index ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-faint" /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink">No matches for “{query}”.</p>
            <p className="mt-1 text-[13px] text-mute">Press Enter to search the full catalog.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-stroke bg-page-soft/60 px-4 py-2.5 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[4px] border border-stroke bg-raised px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded-[4px] border border-stroke bg-raised px-1.5 py-0.5">↓</kbd>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[4px] border border-stroke bg-raised px-1.5 py-0.5">Enter</kbd>
            to open
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
