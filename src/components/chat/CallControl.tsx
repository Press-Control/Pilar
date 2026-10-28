"use client";

import "./call.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import type { ChatMessage, ChatUpdates } from "@/lib/chat-types";

/**
 * "Llamarme": Pilar calls the person's phone (Twilio). The page polls /api/call/state and mirrors each
 * turn into the chat (onTurn), so the side panel updates with the same <<<UPDATES>>> merge as the web chat.
 * Kept separate from the voice-mode components on purpose.
 */

export type CallTurn = { seq: number; role: "user" | "assistant"; content: string; updates?: ChatUpdates | null };
type Phase = "idle" | "llamando" | "en-llamada" | "terminada" | "fallida";
type Config = { ready: boolean; missing: string[]; defaultTo: string };

export type CallApi = {
  phase: Phase;
  thinking: boolean;
  lastLine: { role: "user" | "assistant"; content: string } | null;
  error: string | null;
  active: boolean;
  config: Config | null;
  start: (to: string) => Promise<void>;
  hangup: () => Promise<void>;
  reset: () => void;
};

export function useCall({
  getContext,
  onTurn,
}: {
  getContext: () => { messages: ChatMessage[]; ideaId?: string };
  onTurn: (t: CallTurn, engine: string | null) => void;
}): CallApi {
  const [phase, setPhase] = useState<Phase>("idle");
  const [thinking, setThinking] = useState(false);
  const [lastLine, setLastLine] = useState<CallApi["lastLine"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const session = useRef<string | null>(null);
  const seen = useRef(0);
  const onTurnRef = useRef(onTurn);
  onTurnRef.current = onTurn;

  useEffect(() => {
    fetch("/api/call/config")
      .then((r) => r.json())
      .then((c: Config) => setConfig(c))
      .catch(() => setConfig({ ready: false, missing: ["servidor"], defaultTo: "" }));
  }, []);

  const active = phase === "llamando" || phase === "en-llamada";

  // Simulation hook for local testing: /chat?callSession=<id> attaches to an existing session.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("callSession");
    if (id) {
      session.current = id;
      seen.current = 0;
      setPhase("llamando");
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      const id = session.current;
      if (!id || stop) return;
      try {
        const r = await fetch(`/api/call/state?session=${encodeURIComponent(id)}&since=${seen.current}`, { cache: "no-store" });
        if (r.status === 404) {
          setPhase("terminada");
          return;
        }
        const s = (await r.json()) as { status: Phase; thinking: boolean; error: string | null; engine: string | null; turns: CallTurn[] };
        if (stop || session.current !== id) return;
        for (const t of s.turns) {
          if (t.seq <= seen.current) continue;
          seen.current = t.seq;
          onTurnRef.current(t, s.engine);
          setLastLine({ role: t.role, content: t.content });
        }
        setThinking(s.thinking);
        setPhase(s.status);
        if (s.error) setError(s.error);
      } catch {}
    };
    void tick();
    const t = window.setInterval(tick, 1000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [active]);

  const start = useCallback(
    async (to: string) => {
      setError(null);
      setLastLine(null);
      setThinking(false);
      setPhase("llamando");
      try {
        const ctx = getContext();
        const r = await fetch("/api/call/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, messages: ctx.messages, ideaId: ctx.ideaId }),
        });
        const data = (await r.json().catch(() => ({}))) as { session?: string; error?: string };
        if (!r.ok || !data.session) throw new Error(data.error || "No pudimos iniciar la llamada.");
        session.current = data.session;
        seen.current = 0;
      } catch (e) {
        setPhase("fallida");
        setError(e instanceof Error ? e.message : "No pudimos iniciar la llamada.");
      }
    },
    [getContext],
  );

  const hangup = useCallback(async () => {
    const id = session.current;
    if (!id) return;
    try {
      await fetch("/api/call/hangup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: id }) });
    } catch {}
  }, []);

  const reset = useCallback(() => {
    session.current = null;
    setPhase("idle");
    setError(null);
    setLastLine(null);
  }, []);

  return { phase, thinking, lastLine, error, active, config, start, hangup, reset };
}

/** Header button + small popover with the phone number. */
export function CallButton({ call }: { call: CallApi }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  useEffect(() => {
    if (call.config?.defaultTo && !to) setTo(call.config.defaultTo);
  }, [call.config, to]);

  if (call.active)
    return (
      <span className="stage-type call-pill" aria-live="polite">
        <span className="live-dot" /> {call.phase === "llamando" ? "Llamando…" : "En llamada"}
      </span>
    );

  const missing = call.config && !call.config.ready ? call.config.missing : null;
  return (
    <div className="call-anchor">
      <button type="button" className="stage-type stage-link call-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        ☏ Llamarme
      </button>
      {open ? (
        <div className="call-pop" role="dialog" aria-label="Hablar con Pilar por teléfono">
          <strong>Habla con Pilar por teléfono</strong>
          <p>Te marcamos y conversan en voz. Lo que hablen aparece aquí mismo y queda en tu conversación.</p>
          {missing ? (
            <p className="call-missing">
              Para activar la llamada falta configurar en el servidor: <code>{missing.join(", ")}</code>. Revisa la sección «Llamada telefónica» del README.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
                void call.start(to);
              }}
            >
              <Input type="tel" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+52 55 1234 5678" aria-label="Tu número con lada internacional" autoFocus />
              <Button type="submit" variant="primary" size="sm" disabled={!to.trim() || !call.config}>
                Llamarme
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Live strip above the composer: status, live caption of the last line, hang up / close. */
export function CallBar({ call }: { call: CallApi }) {
  if (call.phase === "idle") return null;
  const label =
    call.phase === "llamando" ? "Llamando a tu teléfono…" : call.phase === "en-llamada" ? (call.thinking ? "Pilar está pensando…" : "En llamada") : call.phase === "fallida" ? "La llamada no se completó" : "Llamada terminada";
  return (
    <div className={`call-bar call-bar--${call.phase}`} role="status" aria-live="polite">
      <div className="call-bar__head">
        <span className="call-bar__glyph" aria-hidden="true">☏</span>
        <strong>{label}</strong>
        {call.active ? (
          <button type="button" onClick={() => void call.hangup()}>
            Colgar
          </button>
        ) : (
          <button type="button" onClick={call.reset}>
            Cerrar
          </button>
        )}
      </div>
      {call.error && !call.active ? <p className="call-bar__caption">{call.error}</p> : null}
      {call.lastLine && call.active ? (
        <p className="call-bar__caption">
          <span>{call.lastLine.role === "user" ? "TÚ" : "PILAR"}</span> {call.lastLine.content}
        </p>
      ) : null}
      {call.phase === "terminada" ? <p className="call-bar__caption">Todo lo que hablaron quedó en esta conversación.</p> : null}
    </div>
  );
}
