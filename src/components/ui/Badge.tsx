import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-stroke bg-page-soft px-1.5 py-0.5 text-[11px] font-medium leading-none text-mute",
        className,
      )}
    >
      {children}
    </span>
  );
}
