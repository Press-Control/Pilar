import { getSession, readTwilioForm } from "@/lib/server/call";

// POST /api/call/status?session=… — Twilio status callback (initiated, ringing, answered, completed…).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { params, ok } = await readTwilioForm(req);
  const session = getSession(new URL(req.url).searchParams.get("session"));
  if (!ok || !session) return new Response(null, { status: 204 });
  const st = params.get("CallStatus") ?? "";
  session.twilioStatus = st;
  if (st === "in-progress") session.status = "en-llamada";
  else if (st === "completed") session.status = "terminada";
  else if (st === "busy" || st === "no-answer" || st === "failed" || st === "canceled") {
    session.status = "fallida";
    session.error = st === "busy" ? "La línea estaba ocupada." : st === "no-answer" ? "No contestaron la llamada." : "La llamada no se pudo completar.";
  }
  session.updatedAt = Date.now();
  return new Response(null, { status: 204 });
}
