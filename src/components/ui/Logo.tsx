/* eslint-disable @next/next/no-img-element */
import { cx } from "./cx";

/**
 * Approved logo, framed exactly like the reference `.site-logo` (26x46 window, 88x88 image centered).
 * size: "rail" | "wordmark" (default framing) | "mark" (12x20, inside chat avatar `.guide-mark`).
 * Dark mode inversion is handled by CSS (.dark .site-logo img).
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <span className={cx("site-logo", className)} aria-hidden="true">
      <img src="/assets/logo-pilar.png" alt="" />
    </span>
  );
}

/** Chat avatar for the guide/agent: <span class="guide-mark"><SiteLogo/></span>. */
export function GuideMark() {
  return (
    <span className="guide-mark" aria-hidden="true">
      <SiteLogo />
    </span>
  );
}
