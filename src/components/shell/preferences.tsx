"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type AnimalId = "tiburon" | "medusa" | "koi";
export const ANIMALS: { id: AnimalId; name: string; mood: string }[] = [
  { id: "tiburon", name: "Tiburón", mood: "Enfoque y dirección" },
  { id: "medusa", name: "Medusa", mood: "Pausa e introspección" },
  { id: "koi", name: "Mariposas", mood: "Equilibrio y continuidad" }, // id histórico "koi" = Mariposas
];

export type Preferences = {
  mode: "random" | "fixed";
  animal: AnimalId;
  dark: boolean;
  intensity: number; // 0..100, default 85
  paused: boolean;
};

const KEY = "pilar-preferences";
const DEFAULTS: Preferences = { mode: "random", animal: "tiburon", dark: false, intensity: 85, paused: false };

type Ctx = {
  prefs: Preferences;
  /** Animal currently shown (may differ from prefs.animal in random mode). */
  current: AnimalId;
  setPrefs: (patch: Partial<Preferences>) => void;
  setCurrent: (id: AnimalId) => void;
  toggleDark: () => void;
  notify: (text: string) => void;
  toast: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

function read(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = { ...DEFAULTS, paused: reduced, ...parsed };
    if (!ANIMALS.some((a) => a.id === p.animal)) p.animal = "tiburon";
    return p;
  } catch {
    return DEFAULTS;
  }
}

export function pickRandomAnimal(previous?: string | null): AnimalId {
  const pool = ANIMALS.filter((a) => a.id !== previous);
  return pool[Math.floor(Math.random() * pool.length)]!.id;
}

/** Theme + ambient preferences + toast + settings drawer state. Wraps the whole app (see layout.tsx). */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Preferences>(DEFAULTS);
  const [current, setCurrentState] = useState<AnimalId>("tiburon");
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = read();
    setState(p);
    let last: string | null = null;
    try { last = sessionStorage.getItem("pilar-last-animal"); } catch {}
    setCurrentState(p.mode === "random" ? pickRandomAnimal(last) : p.animal);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.body.classList.toggle("dark", prefs.dark);
    document.documentElement.style.setProperty("--video-opacity", String(prefs.intensity / 100));
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs, ready]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem("pilar-last-animal", current); } catch {}
  }, [current, ready]);

  const notify = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      current,
      setPrefs: (patch) => setState((p) => ({ ...p, ...patch })),
      setCurrent: setCurrentState,
      toggleDark: () => setState((p) => ({ ...p, dark: !p.dark })),
      notify,
      toast,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [prefs, current, notify, toast, drawerOpen],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}

/** Convenience: `const notify = useToast(); notify("Guardado")`. */
export function useToast() {
  return usePreferences().notify;
}

/** Inline script (runs before paint) to avoid a light flash when dark mode is saved. */
export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');if(p.dark)document.body.classList.add('dark');if(typeof p.intensity==='number')document.documentElement.style.setProperty('--video-opacity',p.intensity/100)}catch(e){}`;
