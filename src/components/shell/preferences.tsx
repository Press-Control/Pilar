"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Preferences = {
  dark: boolean;
};

const KEY = "pilar-preferences";
const DEFAULTS: Preferences = { dark: false };

type Ctx = {
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
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
    return { dark: parsed.dark === true };
  } catch {
    return DEFAULTS;
  }
}

/** Theme preferences + toast + settings drawer state. Wraps the whole app (see layout.tsx). */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Preferences>(DEFAULTS);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.body.classList.toggle("dark", prefs.dark);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs, ready]);

  const notify = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      setPrefs: (patch) => setState((p) => ({ ...p, ...patch })),
      toggleDark: () => setState((p) => ({ ...p, dark: !p.dark })),
      notify,
      toast,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [prefs, notify, toast, drawerOpen],
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
export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');if(p.dark)document.body.classList.add('dark')}catch(e){}`;
