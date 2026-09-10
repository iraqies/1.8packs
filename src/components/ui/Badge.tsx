import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        tone === "accent"
          ? "border-accent/30 bg-accent-soft text-accent-2"
          : "border-stroke bg-page-soft/80 text-mute",
        className,
      )}
    >
      {children}
    </span>
  );
}
