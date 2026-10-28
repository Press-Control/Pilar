import { PHRASES, addTurn, gather, getSession, phraseAudio, readTwilioForm, speak, synthesize, twiml, type CallSession } from "@/lib/server/call";
import { startReply, within } from "@/lib/server/call-engine";

// POST /api/call/turn?session=…[&silence=1|&wait=1] — Twilio <Gather> action (form field SpeechResult).
// Twilio gives a webhook ~15 s: we wait for the LLM up to LLM_WAIT_MS, otherwise say a filler and
// <Redirect> to ?wait=1, which waits for the same pending reply once more.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LLM_WAIT_MS = 9_000;

/** TTS gets whatever is left of a ~13 s budget (Twilio gives up at 15 s), between 1.5 and 5 s. */
async function answer(session: CallSession, text: string, t0: number): Promise<Response> {
  if (!text) return twiml(speak(PHRASES.error, await phraseAudio(PHRASES.error, 2500)) + gather(session.id));
  const left = 13_000 - (Date.now() - t0);
  const audio = await synthesize(text, Math.max(1500, Math.min(5000, left)));
  return twiml(speak(text, audio) + gather(session.id));
}

async function goodbye(session: CallSession): Promise<Response> {
  const audio = await phraseAudio(PHRASES.goodbye, 2500);
  session.status = "terminada";
  return twiml(speak(PHRASES.goodbye, audio) + "<Hangup/>");
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const { params, ok } = await readTwilioForm(req);
  const q = new URL(req.url).searchParams;
  const session = getSession(q.get("session"));
  if (!ok || !session) return twiml(`<Say language="es-MX">Esta llamada ya no está disponible.</Say><Hangup/>`);
  if (session.status === "terminada") return twiml("<Hangup/>");

  // Second chance for a reply that was still being generated.
  if (q.get("wait") === "1") {
    const text = session.pending ? await within(session.pending, LLM_WAIT_MS) : null;
    if (text === null) return twiml(speak(PHRASES.stillThinking, await phraseAudio(PHRASES.stillThinking, 2500)) + gather(session.id));
    return answer(session, text, t0);
  }

  const said = (params.get("SpeechResult") ?? "").trim();
  if (!said || q.get("silence") === "1") {
    session.silences += 1;
    if (session.silences >= 2) return goodbye(session);
    return twiml(speak(PHRASES.reprompt, await phraseAudio(PHRASES.reprompt, 2500)) + gather(session.id));
  }
  session.silences = 0;
  if (/^(adi[oó]s|hasta luego|bye|cuelga|ya me voy)[.!¡ ]*$/i.test(said)) {
    addTurn(session, "user", said);
    return goodbye(session);
  }

  const text = await within(startReply(session, said), LLM_WAIT_MS);
  if (text === null) {
    const audio = await phraseAudio(PHRASES.filler, 1500);
    return twiml(speak(PHRASES.filler, audio) + `<Redirect method="POST">/api/call/turn?session=${encodeURIComponent(session.id)}&amp;wait=1</Redirect>`);
  }
  return answer(session, text, t0);
}
