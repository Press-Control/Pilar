import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { ChatMessage, ChatUpdates } from "@/lib/chat-types";
import { ENGINE_HEADER, resolveProvider } from "./llm";
import { elevenLabsSettings } from "./secrets";

/**
 * Phone call ("Llamarme") support: in-memory call sessions, an in-memory mp3 store for Twilio <Play>,
 * Twilio REST helpers (fetch + basic auth, no SDK) and X-Twilio-Signature validation.
 * Everything lives in this process (globalThis so every route bundle shares it). Secrets never leave
 * the server; only booleans go out through `callConfigStatus()`.
 */

export type CallStatus = "llamando" | "en-llamada" | "terminada" | "fallida";

/** One visible turn produced during the call (mirrored into the web chat). */
export type CallTurn = { seq: number; role: "user" | "assistant"; content: string; updates?: ChatUpdates | null; at: number };

export type CallSession = {
  id: string;
  ideaId?: string;
  /** Context sent to the LLM: prior web chat + call turns. */
  history: ChatMessage[];
  turns: CallTurn[];
  status: CallStatus;
  twilioStatus?: string;
  callSid?: string;
  /** True while Pilar is thinking a reply. */
  thinking: boolean;
  /** Reply in progress (survives a webhook timeout: the next webhook waits for it). */
  pending?: Promise<string>;
  silences: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type Store = { sessions: Map<string, CallSession>; audio: Map<string, { buf: Buffer; at: number }>; phrases: Map<string, string> };
const g = globalThis as unknown as { __pilarCall?: Store };
const store: Store = (g.__pilarCall ??= { sessions: new Map(), audio: new Map(), phrases: new Map() });

const TTL_MS = 2 * 60 * 60 * 1000;
function sweep() {
  const now = Date.now();
  for (const [k, s] of store.sessions) if (now - s.updatedAt > TTL_MS) store.sessions.delete(k);
  for (const [k, a] of store.audio) if (now - a.at > TTL_MS) store.audio.delete(k);
}

export function createSession(history: ChatMessage[], ideaId?: string): CallSession {
  sweep();
  const s: CallSession = {
    id: `${randomUUID()}${randomUUID().replace(/-/g, "")}`, // unguessable: 2 UUIDs
    ideaId,
    history,
    turns: [],
    status: "llamando",
    thinking: false,
    silences: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.sessions.set(s.id, s);
  return s;
}

export const getSession = (id: string | null | undefined) => (id ? store.sessions.get(id) : undefined);

export function addTurn(s: CallSession, role: CallTurn["role"], content: string, updates?: ChatUpdates | null) {
  s.turns.push({ seq: s.turns.length + 1, role, content, updates: updates ?? null, at: Date.now() });
  s.history.push({ role, content });
  s.updatedAt = Date.now();
}

/** Public view for GET /api/call/state (no Twilio ids). */
export function publicState(s: CallSession, since = 0) {
  return {
    status: s.status,
    thinking: s.thinking,
    error: s.error ?? null,
    turns: s.turns.filter((t) => t.seq > since),
    total: s.turns.length,
    engine: ENGINE_HEADER[resolveProvider()],
  };
}

/* ------------------------------------------------------------------------------------------ config */

const env = (k: string) => {
  const v = process.env[k]?.trim();
  return v ? v : undefined;
};

export function twilioConfig() {
  return {
    sid: env("TWILIO_ACCOUNT_SID"),
    token: env("TWILIO_AUTH_TOKEN"),
    from: env("TWILIO_FROM"),
    defaultTo: env("TWILIO_DEFAULT_TO"),
    base: env("PUBLIC_BASE_URL")?.replace(/\/+$/, ""),
  };
}

/** Booleans only (health) plus the Spanish list of what is missing. */
export function callConfigStatus() {
  const c = twilioConfig();
  const vars = {
    TWILIO_ACCOUNT_SID: !!c.sid,
    TWILIO_AUTH_TOKEN: !!c.token,
    TWILIO_FROM: !!c.from,
    TWILIO_DEFAULT_TO: !!c.defaultTo,
    PUBLIC_BASE_URL: !!c.base,
  };
  const missing = (Object.keys(vars) as (keyof typeof vars)[]).filter((k) => !vars[k] && k !== "TWILIO_DEFAULT_TO");
  return { vars, tts: !!elevenLabsSettings().apiKey, ready: missing.length === 0, missing };
}

/* ------------------------------------------------------------------------------------------ twilio */

function auth() {
  const c = twilioConfig();
  return `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString("base64")}`;
}

export async function twilioCreateCall(to: string, sessionId: string): Promise<{ sid?: string; error?: string }> {
  const c = twilioConfig();
  if (!c.sid || !c.token || !c.from || !c.base) return { error: "Faltan datos de configuración." };
  const q = `session=${encodeURIComponent(sessionId)}`;
  const form = new URLSearchParams({
    To: to,
    From: c.from,
    Url: `${c.base}/api/call/twiml?${q}`,
    Method: "POST",
    StatusCallback: `${c.base}/api/call/status?${q}`,
    StatusCallbackMethod: "POST",
    Timeout: "30",
  });
  for (const ev of ["initiated", "ringing", "answered", "completed"]) form.append("StatusCallbackEvent", ev);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.sid)}/Calls.json`, {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok) {
      console.warn(`[pilar] twilio create call failed: HTTP ${res.status} code=${data.code ?? "?"}`);
      return {
        error:
          res.status === 401
            ? "Twilio rechazó las credenciales."
            : data.code === 21219 || data.code === 21608
              ? "Ese número no está verificado en la cuenta de prueba de Twilio."
              : data.code === 21211
                ? "El número de teléfono no es válido."
                : "Twilio no pudo iniciar la llamada.",
      };
    }
    return { sid: data.sid };
  } catch {
    return { error: "No pudimos contactar a Twilio." };
  }
}

export async function twilioHangup(callSid: string): Promise<boolean> {
  const c = twilioConfig();
  if (!c.sid || !c.token) return false;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.sid)}/Calls/${encodeURIComponent(callSid)}.json`, {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ Status: "completed" }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Reads the form body of a Twilio webhook and validates X-Twilio-Signature
 * (HMAC-SHA1 of PUBLIC_BASE_URL + path + query + sorted key/value pairs, keyed with the auth token).
 * Validation is enforced when TWILIO_AUTH_TOKEN and PUBLIC_BASE_URL are set (set TWILIO_SKIP_SIGNATURE=1
 * to disable it for local simulation). Sessions ids are unguessable either way.
 */
export async function readTwilioForm(req: Request): Promise<{ params: URLSearchParams; ok: boolean }> {
  const text = await req.text().catch(() => "");
  const params = new URLSearchParams(text);
  const { token, base } = twilioConfig();
  if (!token || !base || env("TWILIO_SKIP_SIGNATURE") === "1") return { params, ok: true };
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const u = new URL(req.url);
  let data = `${base}${u.pathname}${u.search}`;
  for (const k of [...new Set(params.keys())].sort()) for (const v of params.getAll(k)) data += k + v;
  const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return { params, ok: a.length === b.length && timingSafeEqual(a, b) };
}

/* ------------------------------------------------------------------------------------------ audio */

/** ElevenLabs flash TTS -> mp3 kept in memory; returns its id or null (caller falls back to <Say>). */
export async function synthesize(text: string, timeoutMs = 5000): Promise<string | null> {
  const { apiKey, voiceId, language } = elevenLabsSettings();
  if (!apiKey || !text.trim()) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: text.slice(0, 1200), model_id: "eleven_flash_v2_5", language_code: language }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[pilar] call tts failed: HTTP ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    const id = randomUUID().replace(/-/g, "");
    store.audio.set(id, { buf, at: Date.now() });
    return id;
  } catch {
    console.warn("[pilar] call tts failed: timeout or network");
    return null;
  }
}

/** Fixed phrases (greeting, filler, goodbye) are synthesized once per process and reused. */
export async function phraseAudio(text: string, timeoutMs = 4000): Promise<string | null> {
  const hit = store.phrases.get(text);
  if (hit && store.audio.has(hit)) return hit;
  const id = await synthesize(text, timeoutMs);
  if (id) store.phrases.set(text, id);
  return id;
}

export function getAudio(id: string | null): Buffer | undefined {
  return id ? store.audio.get(id)?.buf : undefined;
}

/* ------------------------------------------------------------------------------------------ twiml */

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Relative webhook paths are resolved by Twilio against the current document URL (our public base). */
export function callPath(path: string, sessionId: string, extra = "") {
  return `${path}?session=${encodeURIComponent(sessionId)}${extra}`;
}

export function speak(text: string, audioId: string | null): string {
  if (audioId) {
    const base = twilioConfig().base ?? "";
    return `<Play>${xml(`${base}/api/call/audio?id=${audioId}`)}</Play>`;
  }
  return `<Say language="es-MX">${xml(text)}</Say>`;
}

export function gather(sessionId: string): string {
  return (
    `<Gather input="speech" language="es-MX" speechTimeout="auto" actionOnEmptyResult="true" method="POST" action="${xml(callPath("/api/call/turn", sessionId))}"></Gather>` +
    `<Redirect method="POST">${xml(callPath("/api/call/turn", sessionId, "&silence=1"))}</Redirect>`
  );
}

export function twiml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const PHRASES = {
  greetNew: "Hola, soy Pilar. Qué gusto escucharte. Cuéntame, ¿qué idea te está dando vueltas?",
  greetResume: "Hola, soy Pilar. Retomemos tu idea donde la dejamos. ¿Qué has pensado desde la última vez?",
  filler: "Dame un segundo, lo estoy pensando.",
  stillThinking: "Perdona, me tardé demasiado. ¿Me lo repites en pocas palabras?",
  reprompt: "¿Sigues ahí? Cuando quieras, te escucho.",
  goodbye: "Te dejo por ahora. Todo lo que hablamos quedó en tu conversación. Hasta pronto.",
  error: "Perdona, se me cruzaron los cables. ¿Me lo repites?",
};
