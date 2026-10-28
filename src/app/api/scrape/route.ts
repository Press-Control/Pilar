import { firecrawlKey } from "@/lib/server/secrets";

// POST /api/scrape {url} -> {title, url, markdown (truncated), truncated}. Firecrawl v2 /scrape, same
// options as el-puente's integration (markdown, onlyMainContent). The key never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MARKDOWN = 4000;
const err = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = ((await req.json()) as { url?: unknown })?.url;
  } catch {
    return err("La solicitud no es válida.", 400);
  }
  let target: URL;
  try {
    target = new URL(typeof raw === "string" ? raw.trim() : "");
  } catch {
    return err("La dirección no es válida.", 400);
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return err("Solo se admiten direcciones http o https.", 400);

  const key = firecrawlKey();
  if (!key) return err("La lectura de fuentes no está configurada en este equipo.", 503);

  let res: Response;
  try {
    res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: target.href, formats: ["markdown"], onlyMainContent: true, timeout: 45_000 }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(55_000)]),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return err(timeout ? "La fuente tardó demasiado en responder." : "No pudimos contactar al lector de fuentes.", 504);
  }
  let body: { success?: boolean; data?: { markdown?: string; metadata?: Record<string, unknown> } } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {}
  if (!res.ok || body.success === false) {
    console.warn(`[pilar] scrape failed: HTTP ${res.status}`);
    const msg =
      res.status === 401 || res.status === 403
        ? "El lector de fuentes rechazó la clave."
        : res.status === 402
          ? "El lector de fuentes no tiene créditos disponibles."
          : res.status === 429
            ? "El lector de fuentes está saturado. Intenta en un minuto."
            : "No pudimos leer esa página.";
    return err(msg, 502);
  }
  const meta = body.data?.metadata ?? {};
  if (typeof meta.statusCode === "number" && meta.statusCode >= 400) return err(`La página respondió con error ${meta.statusCode}.`, 502);
  const markdown = typeof body.data?.markdown === "string" ? body.data.markdown.trim() : "";
  const title = (typeof meta.title === "string" && meta.title.trim()) || target.hostname;
  const finalUrl = (typeof meta.sourceURL === "string" && meta.sourceURL) || target.href;
  return Response.json(
    { title, url: finalUrl, markdown: markdown.slice(0, MAX_MARKDOWN), truncated: markdown.length > MAX_MARKDOWN },
    { headers: { "Cache-Control": "no-store" } },
  );
}
