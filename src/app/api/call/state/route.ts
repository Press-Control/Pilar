import { getSession, publicState } from "@/lib/server/call";

// GET /api/call/state?session=…&since=N — turns after seq N, call status and "thinking" flag (page polls it).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const session = getSession(q.get("session"));
  if (!session) return Response.json({ error: "Esta llamada ya no está disponible." }, { status: 404 });
  return Response.json(publicState(session, Number(q.get("since")) || 0), { headers: { "Cache-Control": "no-store" } });
}
