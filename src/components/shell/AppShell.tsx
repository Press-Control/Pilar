"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { SiteLogo } from "@/components/ui";
import { ideas } from "@/lib/fixtures";
import { usePreferences } from "./preferences";
import { AsciiOcean } from "./ascii-ocean/AsciiOcean";
import { SettingsDrawer } from "./SettingsDrawer";

/** body mode class per route (reference CSS keys off these). */
function modeFor(pathname: string): string | null {
  if (pathname.startsWith("/chat")) return "in-chat";
  if (pathname.startsWith("/lab")) return "in-lab";
  if (pathname === "/") return null;
  return "in-page";
}

const NAV = [
  { href: "/", label: "Inicio", icon: <span aria-hidden="true">⌂</span> },
  { href: "/dashboard", label: "Tus ideas", icon: <span aria-hidden="true">▤</span> },
  {
    href: "/chat",
    label: "Cuaderno",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M4 5.5h16v10H10l-4 3.5v-3.5H4z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </svg>
    ),
  },
  {
    href: "/lab",
    label: "Decision Lab",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="6" cy="5" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="6" cy="19" r="2.5" />
        <path d="M6 7.5v9M18 8.5v1a5 5 0 0 1-5 5H6" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * AppShell: rail (left nav), subtle ASCII background (random scene per load), header (wordmark + actions),
 * route content, footer, settings drawer and toast. Route pages render INSIDE <main>, after <header>.
 * Use absolute-positioned regions like the reference: `.workspace` (home), `.conversation` (chat),
 * `.decision-lab` (lab) or `.page-region` (dashboard / anything else).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { prefs, toggleDark, toast, openDrawer } = usePreferences();

  useEffect(() => {
    const body = document.body;
    body.classList.remove("in-chat", "in-lab", "in-page");
    const mode = modeFor(pathname);
    if (mode) body.classList.add(mode);
  }, [pathname]);

  return (
    <>
      <aside className="rail">
        <Link className="brand" href="/" aria-label="El Pilar, inicio">
          <SiteLogo />
        </Link>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rail-button${isActive(pathname, item.href) ? " active" : ""}`}
            title={item.label}
            aria-label={item.label}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.icon}
          </Link>
        ))}
        <div className="rail-line" />
        <button className="rail-button" onClick={toggleDark} title={prefs.dark ? "Modo claro" : "Modo oscuro"} aria-label={prefs.dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
          <span aria-hidden="true" style={{ fontSize: 20 }}>◐</span>
        </button>
        <div className="rail-bottom">
          <button className="rail-button" onClick={openDrawer} title="Personalizar" aria-label="Personalizar">☷</button>
          <span className="avatar" aria-hidden="true">E</span>
        </div>
      </aside>

      <main>
        <div className="scene">
          <AsciiOcean />
          <div className="scene-veil" />
        </div>

        <header>
          <Link className="wordmark" href="/" aria-label="El Pilar, inicio">
            <SiteLogo />
            <div>
              El Pilar<span>UN ESPACIO PARA PENSAR</span>
            </div>
          </Link>
          <div className="header-actions">
            <Link className="quiet" href="/dashboard">
              <span>◷</span> Tus ideas <span className="counter">{ideas.length}</span>
            </Link>
            <button className="outline" onClick={openDrawer}>
              ⚙ <span>Personalizar</span>
            </button>
          </div>
        </header>

        {children}

        <footer aria-hidden="true" />
      </main>

      <SettingsDrawer />
      <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </>
  );
}
