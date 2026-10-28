import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ChipTone = "line" | "solid" | "ink" | "dashed";

/** Small label. tone: line (default) | solid (soft gray) | ink (inverted) | dashed. mono = uppercase monospace. */
export function Chip({ tone = "line", mono, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone; mono?: boolean }) {
  return <span className={cx("ui-chip", tone !== "line" && `ui-chip--${tone}`, mono && "ui-chip--mono", className)} {...rest} />;
}

/** Toggleable chip (aria-pressed). Use for Sí / No / Duda marks, filters. */
export function ChipButton({ pressed, className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return <button type={type} aria-pressed={pressed} className={cx("ui-chip", className)} {...rest} />;
}

/** Status badge with optional live dot, e.g. «● Guía local». */
export function Badge({ dot, pulse, children, className }: { dot?: boolean; pulse?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx("ui-badge", className)}>
      {dot ? <Dot pulse={pulse} /> : null}
      {children}
    </span>
  );
}

export function Dot({ pulse }: { pulse?: boolean }) {
  return <span className={cx("ui-dot", pulse && "ui-dot--pulse")} aria-hidden="true" />;
}

/** Small uppercase tracked label: «DE LA INTUICIÓN A LA DECISIÓN». */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ui-eyebrow", className)} {...rest} />;
}
