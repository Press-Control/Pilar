"use client";

import "./voice.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "./model";

/**
 * Voice mode (/chat?modo=voz). Replaces the message list + composer; everything else (backend, side panel,
 * persistence) is the text chat's. Loop: mic → VAD (RMS + ~1 s silence) → POST /api/stt → onSend(text)
 * (normal chat turn, mode "voice") → each finished sentence of the streamed reply → POST /api/tts → play in order.
 * The mic is not listened to while Pilar thinks or speaks (no echo loop); "Interrumpir" stops her.
 */

type Phase = "off" | "starting" | "listening" | "hearing" | "transcribing" | "thinking" | "speaking" | "paused" | "denied";

const TICK_MS = 50;
const SPEECH_START_MS = 150; // sustained voice before we consider the person is talking
const SILENCE_END_MS = 1000; // silence that ends the turn
const MAX_TURN_MS = 30_000;
const IDLE_RESET_MS = 20_000; // nothing heard: restart the recorder so the blob stays small
const MIN_CHUNK = 20; // chars before a sentence boundary is worth its own TTS call

const LABEL: Record<Phase, string> = {
  off: "Lista para escucharte",
  starting: "Preparando el micrófono",
  listening: "Escuchando",
  hearing: "Te escucho…",
  transcribing: "Pensando",
  thinking: "Pensando",
  speaking: "Hablando",
  paused: "Micrófono en pausa",
  denied: "Sin micrófono",
};

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

/** Index up to which `text` can be spoken now: first sentence boundary at/after MIN_CHUNK chars (or all if final). */
function nextCut(text: string, from: number, final: boolean): number {
  if (final) return text.length;
  const re = /[.!?…:;]["»”')]*\s+/g;
  re.lastIndex = from;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (end - from >= MIN_CHUNK) return end;
  }
  return from;
}

const plain = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");

type Turn = { base: number; cursor: number; done: boolean; sawBusy: boolean; sentAt: number; spokeAt: number | null };
type Item = { text: string; url: Promise<string | null> };

export function VoicePanel({
  messages,
  busy,
  onSend,
  onStop,
  onExit,
}: {
  messages: UIMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onExit: () => void;
}) {
  const [phase, setPhaseState] = useState<Phase>("off");
  const [note, setNote] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<string | null>(null);

  const phaseRef = useRef<Phase>("off");
  const orbRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const vad = useRef({ speech: 0, silence: 0, heard: false, startedAt: 0, floor: 0.004 });
  const turnRef = useRef<Turn | null>(null);
  const queueRef = useRef<Item[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const genRef = useRef(0); // bumps on interrupt: stale async work checks it and bails
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  /* ------------------------------------------------------------ recording */
  const stopRecorder = useCallback((keep: boolean): Promise<Blob | null> => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      const chunks: BlobPart[] = (rec as MediaRecorder & { _chunks?: BlobPart[] })._chunks ?? [];
      rec.onstop = () => resolve(keep && chunks.length ? new Blob(chunks, { type: rec.mimeType || "audio/webm" }) : null);
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }, []);

  const startListening = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    void stopRecorder(false);
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      setNote("Este navegador no puede grabar audio. Puedes seguir por texto.");
      setPhase("denied");
      return;
    }
    const chunks: BlobPart[] = [];
    (rec as MediaRecorder & { _chunks?: BlobPart[] })._chunks = chunks;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.start(250);
    recRef.current = rec;
    vad.current = { ...vad.current, speech: 0, silence: 0, heard: false, startedAt: performance.now() };
    setPhase("listening");
  }, [setPhase, stopRecorder]);

  const endTurn = useCallback(async () => {
    const gen = genRef.current;
    const endedAt = performance.now();
    setPhase("transcribing");
    const blob = await stopRecorder(true);
    if (gen !== genRef.current) return;
    if (!blob || blob.size < 1500) {
      setNote("No alcancé a escucharte. Intenta de nuevo.");
      startListening();
      return;
    }
    let text = "";
    let sttMs = 0;
    try {
      const res = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "No pudimos entender el audio.");
      text = (data.text ?? "").trim();
      sttMs = Math.round(performance.now() - endedAt);
    } catch (e) {
      if (gen !== genRef.current) return;
      setNote(e instanceof Error ? e.message : "No pudimos entender el audio.");
      startListening();
      return;
    }
    if (gen !== genRef.current) return;
    if (text.replace(/[^\p{L}\p{N}]/gu, "").length < 2) {
      setNote("No alcancé a escucharte. Intenta de nuevo.");
      startListening();
      return;
    }
    setNote(null);
    setHeard(text);
    setMetrics(`voz→texto ${(sttMs / 1000).toFixed(1)} s`);
    console.info(`[pilar-voz] stt ${sttMs}ms: ${text.length} chars`);
    turnRef.current = { base: messagesRef.current.length, cursor: 0, done: false, sawBusy: false, sentAt: performance.now(), spokeAt: null };
    setPhase("thinking");
    onSend(text);
  }, [onSend, setPhase, startListening, stopRecorder]);

  /* ------------------------------------------------------------ VAD loop */
  const tick = useCallback(() => {
    const an = analyserRef.current;
    if (!an) return;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!;
    const rms = Math.sqrt(sum / buf.length);
    const p = phaseRef.current;
    const listening = p === "listening" || p === "hearing";
    orbRef.current?.style.setProperty("--level", listening ? Math.min(1, rms * 12).toFixed(3) : "0");
    if (!listening) return;
    const v = vad.current;
    const thr = Math.max(0.012, v.floor * 3);
    if (rms > thr) {
      v.speech += TICK_MS;
      v.silence = 0;
      if (!v.heard && v.speech >= SPEECH_START_MS) {
        v.heard = true;
        setPhase("hearing");
      }
    } else {
      if (!v.heard) {
        v.speech = Math.max(0, v.speech - TICK_MS);
        v.floor = v.floor * 0.95 + rms * 0.05;
      } else v.silence += TICK_MS;
    }
    const age = performance.now() - v.startedAt;
    if (v.heard && (v.silence >= SILENCE_END_MS || age > MAX_TURN_MS)) void endTurn();
    else if (!v.heard && age > IDLE_RESET_MS) startListening();
  }, [endTurn, setPhase, startListening]);

  const start = useCallback(async () => {
    setNote(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNote("Este navegador no permite usar el micrófono aquí (se necesita https o localhost). Puedes seguir por texto.");
      setPhase("denied");
      return;
    }
    setPhase("starting");
    // Create/resume the AudioContext inside the click (before any await) so it is not born suspended.
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume().catch(() => {});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      if (ctx.state !== "running") await ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      analyserRef.current = an;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => tickRef.current(), TICK_MS);
      startListening();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setNote(
        name === "NotAllowedError" || name === "SecurityError"
          ? "No tenemos permiso para usar tu micrófono. Puedes activarlo desde el candado de la barra de direcciones, o seguir por texto."
          : name === "NotFoundError"
            ? "No encontramos un micrófono en este equipo. Puedes seguir por texto."
            : "No pudimos abrir el micrófono. Puedes seguir por texto.",
      );
      setPhase("denied");
    }
  }, [setPhase, startListening]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  /* ------------------------------------------------------------ speaking queue */
  const clearAudio = useCallback(() => {
    genRef.current++;
    for (const it of queueRef.current) void it.url.then((u) => u && URL.revokeObjectURL(u));
    queueRef.current = [];
    const a = audioRef.current;
    audioRef.current = null;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
    }
    playingRef.current = false;
  }, []);

  const afterReply = useCallback(() => {
    turnRef.current = null;
    if (phaseRef.current === "paused" || phaseRef.current === "denied" || phaseRef.current === "off") return;
    // A short pause so the tail of Pilar's voice is not recorded as the next turn.
    const gen = genRef.current;
    window.setTimeout(() => {
      if (gen === genRef.current && phaseRef.current !== "paused") startListening();
    }, 300);
  }, [startListening]);

  const playNext = useCallback(async () => {
    const gen = genRef.current;
    const item = queueRef.current.shift();
    if (!item) {
      playingRef.current = false;
      if (turnRef.current?.done) afterReply();
      return;
    }
    playingRef.current = true;
    const url = await item.url;
    if (gen !== genRef.current) return;
    if (!url) return void playNext();
    const audio = new Audio(url);
    audioRef.current = audio;
    const next = () => {
      URL.revokeObjectURL(url);
      if (gen === genRef.current) void playNext();
    };
    audio.onended = next;
    audio.onerror = next;
    try {
      await audio.play();
      if (phaseRef.current !== "paused") setPhase("speaking");
      const t = turnRef.current;
      if (t && t.spokeAt === null) {
        t.spokeAt = performance.now();
        const ms = Math.round(t.spokeAt - t.sentAt);
        console.info(`[pilar-voz] first audio ${ms}ms after transcript`);
        setMetrics((m) => `${m ? `${m} · ` : ""}primera voz ${(ms / 1000).toFixed(1)} s`);
      }
    } catch {
      setNote("El navegador bloqueó el audio. Toca la esfera para continuar.");
      next();
    }
  }, [afterReply, setPhase]);

  const speak = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const url = fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, fast: true }) })
        .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
        .catch(() => null);
      queueRef.current.push({ text: clean, url });
      if (!playingRef.current) void playNext();
    },
    [playNext],
  );

  /* ------------------------------------------------------------ follow the streamed reply */
  useEffect(() => {
    const t = turnRef.current;
    if (!t) return;
    if (busy) t.sawBusy = true;
    const reply = messages.slice(t.base).find((m) => m.role === "assistant");
    if (!reply) {
      if (t.sawBusy && !busy) {
        // Turn failed before any text (the user message carries `failed`).
        const failed = messages.slice(t.base).find((m) => m.role === "user")?.failed;
        setNote(failed ? `${failed} Puedes repetirlo.` : "No pudimos obtener una respuesta. Intenta de nuevo.");
        t.done = true;
        afterReply();
      }
      return;
    }
    if (t.done) return;
    const final = reply.status !== "streaming";
    const text = reply.status === "error" || reply.status === "stopped" ? reply.content.slice(0, t.cursor) : reply.content;
    for (;;) {
      const cut = nextCut(text, t.cursor, final);
      if (cut <= t.cursor) break;
      speak(text.slice(t.cursor, cut));
      t.cursor = cut;
    }
    if (final) {
      t.done = true;
      if (reply.status === "error") setNote("La respuesta se interrumpió.");
      if (!playingRef.current && queueRef.current.length === 0) afterReply();
    }
  }, [afterReply, busy, messages, speak]);

  /* ------------------------------------------------------------ controls */
  const interrupt = useCallback(() => {
    clearAudio();
    turnRef.current = null;
    if (busy) onStop();
    setNote(null);
    startListening();
  }, [busy, clearAudio, onStop, startListening]);

  const pause = useCallback(() => {
    void stopRecorder(false);
    setPhase("paused");
  }, [setPhase, stopRecorder]);

  const resume = useCallback(() => {
    setNote(null);
    if (!streamRef.current) void start();
    else if (!turnRef.current) startListening();
    else setPhase(playingRef.current ? "speaking" : "thinking");
  }, [setPhase, start, startListening]);

  // Teardown on unmount (back to text mode or leaving /chat).
  useEffect(
    () => () => {
      genRef.current++;
      if (timerRef.current) window.clearInterval(timerRef.current);
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {}
      }
      audioRef.current?.pause();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  function orbClick() {
    if (phase === "off" || phase === "denied") void start();
    else if (phase === "paused") resume();
    else if (phase === "speaking" || phase === "thinking") interrupt();
    else if (phase === "hearing" || phase === "listening") void endTurn();
  }

  /* ------------------------------------------------------------ render */
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastGuide = [...messages].reverse().find((m) => m.role === "assistant");
  const userText = phase === "transcribing" ? "…" : (heard ?? lastUser?.content ?? null);
  const visual = phase === "transcribing" ? "thinking" : phase === "hearing" ? "listening" : phase === "starting" ? "off" : phase;
  const hint =
    phase === "off"
      ? "Toca la esfera para empezar a hablar."
      : phase === "listening"
        ? "Habla con calma. Cuando hagas una pausa, te respondo."
        : phase === "hearing"
          ? "Haz una pausa cuando termines, o toca la esfera."
          : phase === "thinking" || phase === "transcribing"
            ? "Pilar está pensando su respuesta."
            : phase === "speaking"
              ? "Toca la esfera para interrumpir."
              : phase === "paused"
                ? "Toca la esfera para seguir."
                : "";

  return (
    <div className="voice-panel" data-phase={visual}>
      <div className="voice-stage">
        <div className="voice-orb" ref={orbRef}>
          <span className="voice-orb__halo" aria-hidden="true" />
          <span className="voice-orb__ring" aria-hidden="true" />
          <span className="voice-orb__ring voice-orb__ring--2" aria-hidden="true" />
          <button
            type="button"
            className="voice-orb__core"
            onClick={orbClick}
            disabled={phase === "starting"}
            aria-label={
              phase === "off" || phase === "denied"
                ? "Activar el micrófono"
                : phase === "speaking" || phase === "thinking"
                  ? "Interrumpir a Pilar"
                  : phase === "paused"
                    ? "Reanudar"
                    : "Terminar de hablar"
            }
          >
            <span aria-hidden="true">{phase === "speaking" ? "◉" : phase === "thinking" || phase === "transcribing" ? "◌" : phase === "paused" ? "‖" : "◎"}</span>
          </button>
        </div>
        <div className="voice-state" role="status" aria-live="polite">
          {LABEL[phase]}
        </div>
        <p className="voice-hint">{note ?? hint}</p>
      </div>

      <div className="voice-captions" aria-live="polite">
        <div className="voice-caption voice-caption--user">
          <span className="voice-caption__who">TÚ</span>
          <p>{userText ?? <span className="voice-caption__empty">Cuéntame tu idea, aunque sea a medias.</span>}</p>
        </div>
        <div className="voice-caption voice-caption--guide">
          <span className="voice-caption__who">PILAR</span>
          <p className={lastGuide?.status === "streaming" ? "is-streaming" : undefined}>
            {lastGuide?.content ? plain(lastGuide.content) : <span className="voice-caption__empty">Te respondo en voz alta.</span>}
          </p>
        </div>
      </div>

      <div className="voice-controls">
        {phase === "off" || phase === "denied" ? (
          <button type="button" className="ui-button ui-button--primary ui-button--sm" onClick={() => void start()}>
            ● Empezar a hablar
          </button>
        ) : phase === "paused" ? (
          <button type="button" className="ui-button ui-button--sm" onClick={resume}>
            ● Reanudar micrófono
          </button>
        ) : phase === "speaking" || phase === "thinking" ? (
          <button type="button" className="ui-button ui-button--sm" onClick={interrupt}>
            ■ Interrumpir
          </button>
        ) : (
          <>
            <button type="button" className="ui-button ui-button--primary ui-button--sm" onClick={() => void endTurn()} disabled={phase !== "listening" && phase !== "hearing"}>
              ↵ Ya terminé
            </button>
            <button type="button" className="ui-button ui-button--sm" onClick={pause} disabled={phase === "starting" || phase === "transcribing"}>
              ‖ Silenciar
            </button>
          </>
        )}
        <button type="button" className="ui-button ui-button--quiet ui-button--sm" onClick={onExit}>
          ⌨ Volver a texto
        </button>
      </div>
      {metrics ? <div className="voice-metrics">{metrics}</div> : null}
    </div>
  );
}
