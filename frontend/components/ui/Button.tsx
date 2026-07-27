import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-green text-white hover:bg-brand-dark",
  secondary: "border border-line-strong bg-paper-raised text-ink hover:bg-paper-sunk",
  ghost: "text-ink-muted hover:bg-paper-sunk hover:text-ink",
};

const SIZE: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-body",
  lg: "px-6 py-3 text-lead",
};

function classesFor(variant: ButtonVariant, size: ButtonSize, extra?: string): string {
  return [BASE, VARIANT[variant], SIZE[size], extra].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  readonly href: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Navigation styled as a button. Stays an anchor so it keeps link semantics. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={classesFor(variant, size, className)}>
      {children}
    </Link>
  );
}
