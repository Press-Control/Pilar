import { elevenLabsSettings } from "@/lib/server/secrets";

// POST /api/stt  body: raw audio (webm/opus, mp4, mp3, wav…) with its Content-Type
//   -> { text, ms }  (ElevenLabs Speech to Text, model scribe). The key never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // ~ several minutes of opus; a voice turn is a few seconds
const MODEL = process.env.ELEVENLABS_STT_MODEL?.trim() || "scribe_v1";

const err = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

function extFor(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "mp4";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "bin";
}

export async function POST(req: Request) {
  const type = (req.headers.get("content-type") || "audio/webm").split(";")[0]!.trim();
  let buf: ArrayBuffer;
  try {
    buf = await req.arrayBuffer();
  } catch {
    return err("No recibimos el audio.", 400);
  }
  if (buf.byteLength < 1000) return err("El audio llegó vacío. Intenta hablar de nuevo.", 400);
  if (buf.byteLength > MAX_BYTES) return err("El audio es demasiado largo. Intenta con una frase más corta.", 413);

  const { apiKey, language } = elevenLabsSettings();
  if (!apiKey) return err("La voz no está configurada en este equipo.", 503);

  const form = new FormData();
  form.append("model_id", MODEL);
  form.append("language_code", language || "es");
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");
  form.append("file", new Blob([buf], { type }), `turno.${extFor(type)}`);

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]),
    });
  } catch {
    return err("No pudimos contactar al servicio de voz.", 502);
  }
  if (!res.ok) {
    console.warn(`[pilar] stt failed: HTTP ${res.status}`);
    const msg =
      res.status === 401 ? "El servicio de voz rechazó la clave." : res.status === 429 ? "El servicio de voz está saturado. Intenta en un momento." : "No pudimos entender el audio. Intenta de nuevo.";
    return err(msg, 502);
  }
  const data = (await res.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof data.text === "string" ? data.text.replace(/\s+/g, " ").trim() : "";
  const ms = Math.round(performance.now() - t0);
  console.info(`[pilar] stt model=${MODEL} bytes=${buf.byteLength} ms=${ms} chars=${text.length}`);
  return Response.json({ text, ms }, { headers: { "Cache-Control": "no-store" } });
}
