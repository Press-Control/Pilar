import { getAudio } from "@/lib/server/call";

// GET /api/call/audio?id=… — mp3 generated for a call turn (Twilio <Play>). Ids are random and short-lived.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const buf = getAudio(new URL(req.url).searchParams.get("id"));
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Content-Length": String(buf.length), "Cache-Control": "private, max-age=3600" } });
}
