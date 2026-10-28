import { callConfigStatus, twilioConfig } from "@/lib/server/call";

// GET /api/call/config — what the "Llamarme" button needs: ready?, missing var names, default number.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { ready, missing } = callConfigStatus();
  return Response.json({ ready, missing, defaultTo: twilioConfig().defaultTo ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
