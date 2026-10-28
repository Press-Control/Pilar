import { ENGINE_HEADER, MODEL, findClaudeBin, resolveProvider, stats } from "@/lib/server/llm";
import { secretStatus } from "@/lib/server/secrets";

// GET /api/health -> active LLM provider + which integrations are configured (booleans only, never keys).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = resolveProvider();
  const keys = secretStatus();
  return Response.json(
    {
      ok: true,
      llm: {
        provider,
        engine: ENGINE_HEADER[provider],
        requested: process.env.LLM_PROVIDER?.trim() || "auto",
        model: provider === "mock" ? null : MODEL,
        anthropicKey: keys.anthropic,
        claudeCli: !!findClaudeBin(),
        lastTurn: stats.last ?? null,
      },
      tts: keys.tts,
      scrape: keys.scrape,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
