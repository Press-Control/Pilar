import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** Translucent bordered surface (radius 16, blur), like .thinking-space / .insight-card in the reference. */
export function Card({ className, interactive, selected, as: Tag = "section", ...rest }: HTMLAttributes<HTMLElement> & { interactive?: boolean; selected?: boolean; as?: "section" | "article" | "div" | "aside" }) {
  return <Tag className={cx("ui-card", interactive && "ui-card--interactive", selected && "ui-card--selected", className)} {...rest} />;
}

/** 44px header row: left glyph + title, right meta (mono, muted). */
export function CardHeader({ glyph, title, meta, className, children }: { glyph?: ReactNode; title: ReactNode; meta?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cx("ui-card__header", className)}>
      <span>
        {glyph ? <>{glyph}&nbsp;&nbsp;</> : null}
        {title}
      </span>
      {children}
      {meta !== undefined ? <span>{meta}</span> : null}
    </div>
  );
}

export function CardBody({ flush, className, ...rest }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return <div className={cx("ui-card__body", flush && "ui-card__body--flush", className)} {...rest} />;
}
