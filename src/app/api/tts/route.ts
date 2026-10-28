import { elevenLabsSettings } from "@/lib/server/secrets";

// POST /api/tts {text} -> audio/mpeg (ElevenLabs, streamed). Defaults from el-puente's integration
// (model eleven_flash_v2_5, mp3_44100_128, voice "Emily2.0"). The key never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 2500;

/** Voice must not read Markdown or the updates trailer aloud. */
function speakable(text: string): string {
  return text
    .split("<<<UPDATES>>>")[0]!
    .split("\n")
    .map((l) =>
      l
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*>+\s?/, "")
        .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, "")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*`#~_]+/g, ""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

const err = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  let text = "";
  let fast = false;
  try {
    const body = (await req.json()) as { text?: unknown; fast?: unknown };
    text = typeof body?.text === "string" ? speakable(body.text) : "";
    fast = body?.fast === true; // voice mode: short sentences, smaller mp3 for lower latency
  } catch {
    return err("La solicitud no es válida.", 400);
  }
  if (!text) return err("No hay texto para leer en voz alta.", 400);

  const { apiKey, voiceId, language } = elevenLabsSettings();
  if (!apiKey) return err("La voz no está configurada en este equipo.", 503);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${fast ? "mp3_22050_32" : "mp3_44100_128"}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: language }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]),
    });
  } catch {
    return err("No pudimos contactar al servicio de voz.", 502);
  }
  if (!res.ok || !res.body) {
    console.warn(`[pilar] tts failed: HTTP ${res.status}`);
    const msg =
      res.status === 401 ? "El servicio de voz rechazó la clave." : res.status === 429 ? "El servicio de voz está saturado. Intenta en un momento." : "El servicio de voz no respondió bien.";
    return err(msg, 502);
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
