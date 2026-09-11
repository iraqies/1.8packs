import { Badge } from "@/components/ui/Badge";
import { useDownloadStats } from "@/data/DownloadStats";
import { packs } from "@/data/packs";
import { rankPacks } from "@/lib/search";
import { cn, labelFeature } from "@/lib/utils";
import type { Pack } from "@/types";
import { Search } from "lucide-react";
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
  | { kind: "link"; id: string; to: string; label: string; hint: string };

const LINKS: Array<{ to: string; label: string; hint: string }> = [
  { to: "/", label: "Home", hint: "Start page" },
  { to: "/explore", label: "Explore", hint: "Search and filter" },
  { to: "/terms", label: "Terms", hint: "How the site works" },
  { to: "/privacy", label: "Privacy", hint: "What gets collected" },
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
        className="absolute inset-0 cursor-default bg-page/90"
      />
      <div
        onKeyDown={onFieldKey}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-stroke bg-raised"
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
          <kbd className="hidden shrink-0 rounded border border-stroke bg-page-soft px-1.5 py-0.5 text-[11px] text-faint sm:block">
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
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
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
                        className="h-10 w-16 shrink-0 rounded border border-stroke object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.pack.name}</span>
                        <span className="block truncate text-xs text-mute">
                          by {item.pack.creator} · {item.pack.features.slice(0, 2).map(labelFeature).join(", ")}
                        </span>
                      </span>
                      <Badge>{item.pack.resolution}</Badge>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                      <span className="block truncate text-xs text-mute">{item.hint}</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink">No matches for “{query}”.</p>
            <p className="mt-1 text-[13px] text-mute">Press Enter to search Explore.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-stroke px-4 py-2.5 text-[11px] text-faint">
          <span>↑ ↓ to move</span>
          <span>Enter to open</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
