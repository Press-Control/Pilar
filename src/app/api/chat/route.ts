import { UPDATES_MARKER, type ChatRequest, type ChatUpdates } from "@/lib/chat-types";
import { ENGINE_HEADER, EngineError, findClaudeBin, resolveProvider, stats, streamEngine, type Provider } from "@/lib/server/llm";

// POST /api/chat — contract in src/lib/chat-types.ts. Engine chosen in src/lib/server/llm.ts.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = new Set(["intuicion", "forma", "prueba", "siguiente"]);
const s = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Keeps only well-formed fields of the model's trailer, so the UI never receives junk. */
function cleanUpdates(raw: unknown): ChatUpdates | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 5).filter((x) => typeof x === "object" && x !== null) as Record<string, unknown>[] : []);
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

function parseTrailer(tail: string): ChatUpdates | null {
  const body = tail.replace(/```(?:json)?/g, "").trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return cleanUpdates(JSON.parse(body.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/** Length of the longest suffix of `text` that is a prefix of the marker (held back while streaming). */
function partialMarker(text: string): number {
  for (let k = Math.min(text.length, UPDATES_MARKER.length - 1); k > 0; k--) if (text.endsWith(UPDATES_MARKER.slice(0, k))) return k;
  return 0;
}

const errorJson = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return errorJson("La solicitud no es válida.", 400);
  }
  if (!Array.isArray(body?.messages) || body.messages.length === 0) return errorJson("Escribe un mensaje para empezar.", 400);
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : undefined;

  // Dev-only switch to compare engines live (curl -H "X-Pilar-Provider: claude-cli|anthropic|mock").
  const override = process.env.NODE_ENV !== "production" ? req.headers.get("x-pilar-provider") : null;
  const primary = resolveProvider(override);
  // Demo safety net: if an engine gives no first token in time (network stall) or fails before any text,
  // fall back to the next one (anthropic -> claude-cli -> mock). An explicit per-request override disables it.
  const chain: Provider[] = override
    ? [primary]
    : primary === "anthropic"
      ? ["anthropic", ...(findClaudeBin() ? (["claude-cli"] as Provider[]) : []), "mock"]
      : primary === "claude-cli"
        ? ["claude-cli", "mock"]
        : ["mock"];
  const FIRST_TOKEN_MS: Record<Provider, number> = { anthropic: 15_000, "claude-cli": 25_000, mock: 10_000 };

  const t0 = performance.now();
  let engine = ENGINE_HEADER[primary];
  let abort = new AbortController();
  let iterator!: AsyncGenerator<string>;
  // Pull the first chunk before answering, so engine failures (no login, bad key) become a JSON error the
  // UI can retry instead of an empty 200 stream.
  let first!: IteratorResult<string>;
  let lastError: unknown = null;
  for (const provider of chain) {
    if (req.signal.aborted) return errorJson("Solicitud cancelada.", 499);
    engine = ENGINE_HEADER[provider];
    abort = new AbortController();
    const ctl = abort;
    const onAbort = () => ctl.abort();
    req.signal.addEventListener("abort", onAbort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      iterator = streamEngine(provider, body.messages, ideaId, ctl.signal);
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new EngineError("El motor tardó demasiado en empezar a responder.", 504)), FIRST_TOKEN_MS[provider]);
      });
      first = await Promise.race([iterator.next(), timeout]);
      lastError = null;
      break;
    } catch (e) {
      lastError = e;
      ctl.abort();
      void iterator?.return?.(undefined).catch(() => {});
      req.signal.removeEventListener("abort", onAbort);
      console.warn(`[pilar] chat engine=${engine} failed before first token: ${e instanceof Error ? e.message : "error"}`);
      if (e instanceof EngineError && e.status === 400) break;
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError) {
    const e = lastError;
    const msg = e instanceof EngineError ? e.message : "No pudimos obtener una respuesta. Intenta de nuevo.";
    stats.last = { engine, ttftMs: null, totalMs: Math.round(performance.now() - t0), at: new Date().toISOString(), ok: false };
    return errorJson(msg, e instanceof EngineError ? e.status : 502);
  }
  const ttft = Math.round(performance.now() - t0);

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let held = ""; // text not yet sent (possible start of the marker)
      let tail: string | null = null; // everything after the marker
      let visibleChars = 0;
      const send = (t: string) => {
        if (!t) return;
        visibleChars += t.length;
        controller.enqueue(enc.encode(t));
      };
      const push = (chunk: string) => {
        if (tail !== null) {
          tail += chunk;
          return;
        }
        held += chunk;
        const at = held.indexOf(UPDATES_MARKER);
        if (at !== -1) {
          send(held.slice(0, at).replace(/\s+$/, ""));
          tail = held.slice(at + UPDATES_MARKER.length);
          held = "";
          return;
        }
        // Hold back a possible marker start and trailing whitespace (so no blank lines precede the trailer).
        const k = partialMarker(held);
        const safe = held.slice(0, held.length - k);
        const ws = safe.length - safe.replace(/\s+$/, "").length;
        send(safe.slice(0, safe.length - ws));
        held = held.slice(safe.length - ws);
      };
      let ok = true;
      try {
        if (!first.done) push(first.value);
        for (;;) {
          const r = await iterator.next();
          if (r.done) break;
          push(r.value);
        }
        if (held) send(held.replace(/\s+$/, ""));
        const updates = tail !== null ? parseTrailer(tail) : null;
        if (updates) controller.enqueue(enc.encode(`\n${UPDATES_MARKER}${JSON.stringify(updates)}`));
        controller.close();
      } catch (e) {
        ok = false;
        if (abort.signal.aborted) {
          try {
            controller.close();
          } catch {}
        } else {
          console.warn(`[pilar] chat engine=${engine} stream broke: ${e instanceof Error ? e.message : "error"}`);
          controller.error(e);
        }
      } finally {
        const totalMs = Math.round(performance.now() - t0);
        stats.last = { engine, ttftMs: ttft, totalMs, at: new Date().toISOString(), ok };
        console.info(`[pilar] chat engine=${engine} ttft=${ttft}ms total=${totalMs}ms chars=${visibleChars}${ok ? "" : " (incomplete)"}`);
      }
    },
    cancel() {
      abort.abort();
      void iterator.return?.(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Pilar-Engine": engine,
    },
  });
}
