"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { ANIMALS, usePreferences } from "./preferences";

/** SettingsDrawer / AnimalSelector (02-components.md). Escape, scrim click or ✕ closes; focus returns. */
export function SettingsDrawer() {
  const { prefs, current, setPrefs, setCurrent, drawerOpen, closeDrawer } = usePreferences();
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
        <div className="mode-switch">
          <button className={prefs.mode === "fixed" ? "selected" : ""} aria-pressed={prefs.mode === "fixed"} onClick={() => setPrefs({ mode: "fixed", animal: current })}>
            ◇ Individual
          </button>
          <button className={prefs.mode === "random" ? "selected" : ""} aria-pressed={prefs.mode === "random"} onClick={() => setPrefs({ mode: "random" })}>
            ⤨ Aleatorio
          </button>
        </div>
        <p className="panel-description">
          {prefs.mode === "random"
            ? "Una nueva compañía cada vez que entras o refrescas. Sin repetir el último ambiente."
            : "Elige una sola especie para tu fondo. Tu selección se conserva cuando vuelves."}
        </p>
        <div className="section-label eyebrow">TUS TRES ANIMALES</div>
        <div className="animals">
          {ANIMALS.map((a, i) => (
            <button
              key={a.id}
              className={`animal-card${current === a.id ? " selected" : ""}`}
              aria-pressed={current === a.id}
              onClick={() => {
                setCurrent(a.id);
                setPrefs({ mode: "fixed", animal: a.id });
              }}
            >
              <img src={`/assets/${a.id}-thumb.jpg`} alt={`${a.name} en ASCII monocromático`} />
              <div className="animal-caption">
                {a.name}
                <small>{current === a.id ? "✓" : `0${i + 1}`}</small>
              </div>
              <p>{a.mood}</p>
            </button>
          ))}
        </div>
        <div className="section-label eyebrow">LOS PEQUEÑOS DETALLES</div>
        <div className="setting">
          <label htmlFor="pref-dark">
            Modo oscuro
            <input id="pref-dark" type="checkbox" checked={prefs.dark} onChange={(e) => setPrefs({ dark: e.target.checked })} />
          </label>
          <small>La misma paleta, con el contraste invertido.</small>
        </div>
        <div className="setting">
          <label htmlFor="pref-intensity">
            Presencia del ambiente
            <input id="pref-intensity" type="range" min={20} max={100} value={prefs.intensity} onChange={(e) => setPrefs({ intensity: Number(e.target.value) })} />
          </label>
          <small>Qué tanto se ve el animal detrás de tus ideas.</small>
        </div>
        <div className="setting">
          <label htmlFor="pref-paused">
            Pausar movimiento
            <input id="pref-paused" type="checkbox" checked={prefs.paused} onChange={(e) => setPrefs({ paused: e.target.checked })} />
          </label>
          <small>Respeta la preferencia de movimiento reducido del sistema en la primera visita.</small>
        </div>
        <button className="full-button" onClick={closeDrawer}>Listo</button>
      </aside>
    </>
  );
}
