import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18),0_8px_20px_rgb(78_141_240_/_0.22)] hover:bg-accent-2 hover:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22),0_12px_28px_rgb(78_141_240_/_0.34)] disabled:bg-stroke disabled:text-faint disabled:shadow-none",
  secondary:
    "border border-stroke-strong bg-raised text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] hover:border-accent/40 hover:bg-panel disabled:text-faint",
  ghost: "text-mute hover:text-ink hover:bg-raised",
};

const sizeClass: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
};

const baseClass =
  "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[8px] font-medium transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:active:scale-100";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(baseClass, variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function ButtonLink({ to, children, variant = "primary", size = "md", className }: ButtonLinkProps) {
  return (
    <Link to={to} className={cn(baseClass, variantClass[variant], sizeClass[size], className)}>
      {children}
    </Link>
  );
}
