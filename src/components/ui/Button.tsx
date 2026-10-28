import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "default" | "primary" | "outline" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

type Common = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: boolean; className?: string; children?: ReactNode };

function classes({ variant = "default", size = "md", block, icon, className }: Common) {
  return cx(
    "ui-button",
    variant !== "default" && `ui-button--${variant}`,
    size !== "md" && `ui-button--${size}`,
    block && "ui-button--block",
    icon && "ui-icon-button",
    className,
  );
}

/** Button. variant: default (white, 1px line) | primary (ink) | outline (translucent) | quiet (no border). */
export function Button({ variant, size, block, icon, className, type = "button", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes({ variant, size, block, icon, className })} {...rest} />;
}

/** Same look as Button, rendered as a Next <Link>. */
export function ButtonLink({ href, variant, size, block, icon, className, children, ...rest }: Common & { href: string; "aria-label"?: string; title?: string }) {
  return (
    <Link href={href} className={classes({ variant, size, block, icon, className })} {...rest}>
      {children}
    </Link>
  );
}
