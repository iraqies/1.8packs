import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useId, useRef } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  id?: string;
}

export function SearchInput({
  value,
  onChange,
  autoFocus,
  placeholder = "Search packs",
  id,
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="group relative">
      <label htmlFor={inputId} className="sr-only">
        Search packs
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition-colors group-focus-within:text-accent-2" />
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-[9px] border border-stroke bg-raised pl-9 text-sm text-ink placeholder:text-faint",
          "shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)] outline-none",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-out-soft)]",
          "focus:border-accent/60 focus:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03),0_0_0_3px_rgb(78_141_240_/_0.12)]",
          value ? "pr-10" : "pr-3",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="animate-pop absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-faint transition-colors hover:bg-panel hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
