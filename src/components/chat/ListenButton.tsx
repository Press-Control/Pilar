"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/shell/preferences";

let playing: { audio: HTMLAudioElement; stop: () => void } | null = null;

/** "Escuchar": POST /api/tts {text} → audio/mpeg. One voice at a time; failures become a calm toast. */
export function ListenButton({ text }: { text: string }) {
  const notify = useToast();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function toggle() {
    if (state === "playing" || state === "loading") {
      playing?.stop();
      setState("idle");
      return;
    }
    playing?.stop();
    setState("loading");
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) {
        let msg = "La voz no está disponible ahora. Puedes seguir leyendo.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(urlRef.current);
      const stop = () => {
        audio.pause();
        setState("idle");
        if (playing?.audio === audio) playing = null;
      };
      audio.onended = stop;
      audio.onerror = stop;
      playing = { audio, stop };
      try {
        await audio.play();
      } catch {
        throw new Error("No pudimos reproducir el audio. Toca Escuchar de nuevo.");
      }
      setState("playing");
    } catch (e) {
      setState("idle");
      notify(e instanceof Error && e.message ? e.message : "La voz no está disponible ahora.");
    }
  }

  return (
    <button type="button" className="message-action" onClick={toggle} aria-pressed={state === "playing"} aria-busy={state === "loading" || undefined}>
      <span aria-hidden="true">{state === "playing" ? "■" : state === "loading" ? "…" : "▷"}</span>
      {state === "playing" ? "Detener" : state === "loading" ? "Preparando voz" : "Escuchar"}
    </button>
  );
}
