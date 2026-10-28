"use client";

import { useEffect, useRef } from "react";
import { usePreferences } from "./preferences";

/** SettingsDrawer (02-components.md). Escape, scrim click or ✕ closes; focus returns. */
export function SettingsDrawer() {
  const { prefs, setPrefs, drawerOpen, closeDrawer } = usePreferences();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    opener.current = document.activeElement;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <>
      <div className="scrim" onClick={closeDrawer} />
      <aside className="panel" aria-label="Personalización" role="dialog" aria-modal="true">
        <div className="panel-header">
          <div>
            <div className="eyebrow">HAZLO TUYO</div>
            <h2>Tu espacio, tu ritmo.</h2>
          </div>
          <button ref={closeBtn} className="close" onClick={closeDrawer} aria-label="Cerrar panel">✕</button>
        </div>
        <div className="section-label eyebrow">LOS PEQUEÑOS DETALLES</div>
        <div className="setting">
          <label htmlFor="pref-dark">
            Modo oscuro
            <input id="pref-dark" type="checkbox" checked={prefs.dark} onChange={(e) => setPrefs({ dark: e.target.checked })} />
          </label>
          <small>La misma paleta, con el contraste invertido.</small>
        </div>
        <button className="full-button" onClick={closeDrawer}>Listo</button>
      </aside>
    </>
  );
}
