import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";
import type { CSSProperties, ElementType, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Milliseconds to hold before the element eases in, for staggering siblings. */
  delay?: number;
  /** Vertical travel distance in pixels. */
  shift?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Reveal({ children, delay = 0, shift, as: Tag = "div", className, style }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={cn("reveal", inView && "reveal-shown", className)}
      style={
        {
          ...style,
          "--reveal-delay": `${delay}ms`,
          ...(shift === undefined ? null : { "--reveal-shift": `${shift}px` }),
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
