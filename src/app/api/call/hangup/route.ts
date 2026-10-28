import { getSession, twilioHangup } from "@/lib/server/call";

// POST /api/call/hangup {session} — ends the call from the page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { session?: unknown };
  const session = getSession(typeof body.session === "string" ? body.session : null);
  if (!session) return Response.json({ error: "Esta llamada ya no está disponible." }, { status: 404 });
  if (session.callSid) await twilioHangup(session.callSid);
  session.status = "terminada";
  return Response.json({ ok: true });
}
