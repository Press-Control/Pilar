"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { SiteLogo } from "@/components/ui";
import { ideas } from "@/lib/fixtures";
import { ANIMALS, pickRandomAnimal, usePreferences } from "./preferences";
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
 * AppShell: rail (left nav), ambient scene (video), header (wordmark + actions), route content, footer
 * (ambient controls), settings drawer and toast. Route pages render INSIDE <main>, after <header>.
 * Use absolute-positioned regions like the reference: `.workspace` (home), `.conversation` (chat),
 * `.decision-lab` (lab) or `.page-region` (dashboard / anything else).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { prefs, current, setPrefs, setCurrent, toggleDark, notify, toast, openDrawer } = usePreferences();
  const video = useRef<HTMLVideoElement>(null);
  const animal = ANIMALS.find((a) => a.id === current) ?? ANIMALS[0]!;

  useEffect(() => {
    const body = document.body;
    body.classList.remove("in-chat", "in-lab", "in-page");
    const mode = modeFor(pathname);
    if (mode) body.classList.add(mode);
  }, [pathname]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (prefs.paused) v.pause();
    else v.play().catch(() => {});
  }, [prefs.paused, current]);

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
          <video
            ref={video}
            key={animal.id}
            autoPlay={!prefs.paused}
            muted
            loop
            playsInline
            poster={`/assets/${animal.id}.jpg`}
            src={`/assets/${animal.id}.mp4`}
            aria-label={`Video en blanco y negro: ${animal.name} en ASCII`}
            onError={() => notify("No se pudo reproducir el video. Se muestra su imagen de respaldo.")}
          />
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

        <footer>
          <div className="environment">
            <span className="environment-icon" aria-hidden="true">≈</span>
            <div>
              <span className="eyebrow">TU AMBIENTE</span>
              <button onClick={openDrawer}>
                {animal.name} <span>↗</span>
              </button>
            </div>
            <span className="small-tag">VIDEO · B/N</span>
          </div>
          <div className="footer-center">Un poco de naturaleza. Un espacio para ti.</div>
          <div className="ambient-controls">
            <button
              onClick={() => setPrefs({ paused: !prefs.paused })}
              aria-label={prefs.paused ? "Reproducir fondo" : "Pausar fondo"}
              title={prefs.paused ? "Reproducir fondo" : "Pausar fondo"}
            >
              {prefs.paused ? "▷" : "Ⅱ"}
            </button>
            <button
              onClick={() => {
                const next = pickRandomAnimal(current);
                setCurrent(next);
                if (prefs.mode === "fixed") setPrefs({ animal: next });
                notify(`Ahora: ${ANIMALS.find((a) => a.id === next)!.name}`);
              }}
              title="Cambiar ambiente"
              aria-label="Cambiar ambiente"
            >
              ⤨
            </button>
            <button
              className="random-status"
              onClick={() => {
                const mode = prefs.mode === "random" ? "fixed" : "random";
                setPrefs({ mode, animal: current });
                notify(mode === "random" ? "Un ambiente diferente en cada visita" : "Este ambiente queda fijado");
              }}
            >
              {prefs.mode === "random" ? (
                <>Aleatorio <span className="live-dot" /></>
              ) : (
                <>Individual <span>◇</span></>
              )}
            </button>
          </div>
        </footer>
      </main>

      <SettingsDrawer />
      <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </>
  );
}
