import { UPDATES_MARKER, type ChatUpdates } from "@/lib/chat-types";
import { addTurn, type CallSession } from "./call";
import { ENGINE_HEADER, resolveProvider, stats, streamEngine } from "./llm";

/** Same validation as /api/chat's trailer (kept local so the chat route stays untouched). */
const STAGES = new Set(["intuicion", "forma", "prueba", "siguiente"]);
const s = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

function cleanUpdates(raw: unknown): ChatUpdates | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? (v.slice(0, 5).filter((x) => typeof x === "object" && x !== null) as Record<string, unknown>[]) : []);
  const out: ChatUpdates = {};
  const decisions = list(r.decisions).flatMap((d) => (s(d.text) ? [{ text: s(d.text)!, ...(s(d.reason) ? { reason: s(d.reason)! } : {}) }] : []));
  if (decisions.length) out.decisions = decisions;
  const questions = list(r.questions).flatMap((q) => (s(q.text) ? [{ text: s(q.text)!, critical: q.critical === true }] : []));
  if (questions.length) out.questions = questions;
  const hypotheses = list(r.hypotheses).flatMap((h) => (s(h.text) ? [{ text: s(h.text)!, ...(s(h.test) ? { test: s(h.test)! } : {}) }] : []));
  if (hypotheses.length) out.hypotheses = hypotheses;
  if (s(r.nextStep)) out.nextStep = s(r.nextStep);
  if (typeof r.stage === "string" && STAGES.has(r.stage)) out.stage = r.stage as ChatUpdates["stage"];
  if (s(r.highlight, 160)) out.highlight = s(r.highlight, 160);
  return Object.keys(out).length ? out : null;
}

function split(raw: string): { text: string; updates: ChatUpdates | null } {
  const at = raw.indexOf(UPDATES_MARKER);
  const text = (at === -1 ? raw : raw.slice(0, at)).trim();
  if (at === -1) return { text, updates: null };
  const body = raw.slice(at + UPDATES_MARKER.length).replace(/```(?:json)?/g, "").trim();
  const a = body.indexOf("{");
  const b = body.lastIndexOf("}");
  try {
    return { text, updates: a !== -1 && b > a ? cleanUpdates(JSON.parse(body.slice(a, b + 1))) : null };
  } catch {
    return { text, updates: null };
  }
}

/** Plain speakable text: no Markdown, no symbols the voice would read. */
export function speakable(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:#{1,6}|>+|[-*+•]|\d+[.)])\s+/gm, "")
    .replace(/[*`#~_]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Starts Pilar's reply to `userText` (records the user turn now, the assistant turn when done).
 * The promise resolves with the speakable text; it is stored in `session.pending` so a later webhook can
 * wait for it if the first one had to answer with a filler.
 */
export function startReply(session: CallSession, userText: string): Promise<string> {
  addTurn(session, "user", userText);
  session.thinking = true;
  const provider = resolveProvider();
  const t0 = performance.now();
  const job = (async () => {
    // Network stalls happen (venue wifi): abort a stream that goes quiet, retry once if nothing arrived.
    let raw = "";
    for (let attempt = 0; attempt < 2 && !raw.includes(UPDATES_MARKER); attempt++) {
      if (attempt === 1 && (raw.trim() || performance.now() - t0 > 12_000)) break;
      raw = "";
      const ctl = new AbortController();
      let idle: ReturnType<typeof setTimeout> | undefined;
      const arm = (ms: number) => {
        clearTimeout(idle);
        idle = setTimeout(() => ctl.abort(), ms);
      };
      arm(7_000); // first token
      try {
        for await (const chunk of streamEngine(provider, session.history, session.ideaId, ctl.signal, "voice")) {
          if (!raw) console.info(`[pilar] call ttft=${Math.round(performance.now() - t0)}ms attempt=${attempt}`);
          raw += chunk;
          arm(4_000);
        }
      } catch (e) {
        console.warn(`[pilar] call engine=${ENGINE_HEADER[provider]} failed: ${e instanceof Error ? e.message : "error"}`);
      } finally {
        clearTimeout(idle);
      }
    }
    // A stream cut midway: keep only complete sentences.
    if (!raw.includes(UPDATES_MARKER)) {
      const m = raw.match(/^[\s\S]*[.?!…](?=\s|$)/);
      raw = m ? m[0] : "";
    }
    const { text, updates } = split(raw);
    const said = speakable(text);
    const totalMs = Math.round(performance.now() - t0);
    stats.last = { engine: ENGINE_HEADER[provider], ttftMs: null, totalMs, at: new Date().toISOString(), ok: !!said };
    console.info(`[pilar] call turn engine=${ENGINE_HEADER[provider]} llm=${totalMs}ms chars=${said.length}`);
    session.thinking = false;
    if (!said) return "";
    addTurn(session, "assistant", said, updates);
    return said;
  })();
  session.pending = job;
  void job.finally(() => {
    if (session.pending === job) session.pending = undefined;
  });
  return job;
}

/** Resolves with the value, or with `null` after `ms`. */
export function within<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}
