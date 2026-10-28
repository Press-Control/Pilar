import type { ChatMessage } from "@/lib/chat-types";
import { PHRASES, callConfigStatus, createSession, phraseAudio, twilioConfig, twilioCreateCall } from "@/lib/server/call";

// POST /api/call/start {to?, messages?, ideaId?, dryRun?} -> {session} ; Twilio calls `to` and fetches /api/call/twiml.
// dryRun (dev only) creates the session without calling Twilio, to simulate webhooks locally.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (error: string, status: number, extra: object = {}) => Response.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  let body: { to?: unknown; messages?: unknown; ideaId?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return err("La solicitud no es válida.", 400);
  }
  const dryRun = body.dryRun === true && process.env.NODE_ENV !== "production";
  const cfg = callConfigStatus();
  if (!cfg.ready && !dryRun) return err(`Falta configurar: ${cfg.missing.join(", ")}.`, 503, { missing: cfg.missing });

  const to = (typeof body.to === "string" ? body.to : twilioConfig().defaultTo ?? "").replace(/[\s()-]/g, "");
  if (!dryRun && !/^\+\d{8,15}$/.test(to)) return err("Escribe el número con lada internacional, por ejemplo +52 55 1234 5678.", 400);

  const history: ChatMessage[] = Array.isArray(body.messages)
    ? (body.messages as ChatMessage[])
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
        .slice(-30)
    : [];
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : undefined;
  const session = createSession(history, ideaId);

  // Warm the fixed phrases (greeting, filler, goodbye) while the phone rings.
  const greet = history.length || ideaId ? PHRASES.greetResume : PHRASES.greetNew;
  void Promise.all([phraseAudio(greet, 8000), phraseAudio(PHRASES.filler, 8000), phraseAudio(PHRASES.reprompt, 8000), phraseAudio(PHRASES.goodbye, 8000)]);

  if (dryRun) {
    session.status = "en-llamada";
    return Response.json({ session: session.id, dryRun: true });
  }
  const r = await twilioCreateCall(to, session.id);
  if (r.error) {
    session.status = "fallida";
    session.error = r.error;
    return err(r.error, 502);
  }
  session.callSid = r.sid;
  return Response.json({ session: session.id });
}
