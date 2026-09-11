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
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search packs
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
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
          "h-11 w-full rounded-md border border-stroke bg-raised pl-9 text-sm text-ink placeholder:text-faint outline-none",
          "focus:border-stroke-strong",
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
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-faint hover:bg-panel hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
