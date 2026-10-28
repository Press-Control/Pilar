import { PHRASES, addTurn, gather, getSession, phraseAudio, readTwilioForm, speak, twiml } from "@/lib/server/call";

// POST /api/call/twiml?session=… — Twilio fetches this when the person answers: greeting + first <Gather>.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ok } = await readTwilioForm(req);
  const session = getSession(new URL(req.url).searchParams.get("session"));
  if (!ok || !session) return twiml(`<Say language="es-MX">Esta llamada ya no está disponible.</Say><Hangup/>`);
  session.status = "en-llamada";
  const first = session.turns[0];
  const greet = first?.role === "assistant" ? first.content : session.history.length || session.ideaId ? PHRASES.greetResume : PHRASES.greetNew;
  const audio = await phraseAudio(greet, 4000);
  if (!first) addTurn(session, "assistant", greet);
  return twiml(speak(greet, audio) + gather(session.id));
}
