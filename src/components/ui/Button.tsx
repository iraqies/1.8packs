import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-2 disabled:bg-stroke disabled:text-faint",
  secondary: "border border-stroke-strong bg-raised text-ink hover:bg-panel disabled:text-faint",
  ghost: "text-mute hover:bg-raised hover:text-ink",
};

const sizeClass: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
};

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium disabled:pointer-events-none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} disabled={disabled} className={cn(baseClass, variantClass[variant], sizeClass[size], className)} {...props}>
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
