import { callConfigStatus } from "@/lib/server/call";

// GET /api/call/health — which call variables are set (booleans only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(callConfigStatus(), { headers: { "Cache-Control": "no-store" } });
}
