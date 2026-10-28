/**
 * CHAT CONTRACT — POST /api/chat
 * ==============================
 * Shared between the chat UI (src/components/chat/**) and the backend (src/app/api/chat/route.ts).
 * Owned by the scaffold; append-only for other agents.
 *
 * Request
 * -------
 *   POST /api/chat
 *   Content-Type: application/json
 *   Body: ChatRequest  ->  { messages: [{ role: "user" | "assistant", content: string }], ideaId?: string }
 *     - `messages` is the full visible conversation, oldest first; the last item is the new user message.
 *     - `ideaId` (optional) is a fixture id from src/lib/fixtures.ts (e.g. "cocina-barrio"). The server may
 *       use the idea model (decisions, hypotheses, questions...) as context. Unknown id = no context.
 *
 * Response (success)
 * ------------------
 *   200, Content-Type: text/plain; charset=utf-8, body is a STREAM of plain UTF-8 text chunks
 *   (ReadableStream). No SSE framing, no JSON per chunk: just append chunks to the assistant bubble.
 *
 *   Optional structured side-channel: AFTER all visible text, the server MAY append exactly one line:
 *
 *       "\n<<<UPDATES>>>" + JSON.stringify(ChatUpdates)
 *
 *   Everything after the marker is JSON (until end of stream) and must NOT be shown as text.
 *   Use `splitUpdates()` below on the accumulated text; while streaming, hide anything from the first
 *   "<<<" that could be the beginning of the marker (`visibleText()` does that).
 *
 * Response headers (informational)
 * --------------------------------
 *   X-Pilar-Engine: "anthropic" | "claude-code" | "fixture"  — which engine answered (UI may show it
 *   instead of the reference badge "Guía local"; never show provider logos, see brand rules §10).
 *
 * Errors
 * ------
 *   4xx/5xx with JSON body ChatError { error: string } (Spanish, human readable). The UI keeps the
 *   draft and offers "Reintentar" without duplicating the user message (02-components.md).
 *   If the stream breaks midway, the UI keeps the partial text and marks the message as failed.
 */

export type ChatRole = "user" | "assistant";

export type ChatMessage = { role: ChatRole; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  ideaId?: string;
  /** "voice" (from /chat?modo=voz): the server asks for a shorter, spoken-style reply. Omitted = text. */
  mode?: "text" | "voice";
};

/** Structured side-channel appended after the text. All fields optional. */
export type ChatUpdates = {
  /** New or changed decisions proposed by the conversation (pending user approval in the UI). */
  decisions?: { text: string; reason?: string }[];
  /** New open questions ("lo que falta"), phrased as questions. */
  questions?: { text: string; critical?: boolean }[];
  /** Hypotheses detected, ideally with a concrete test. */
  hypotheses?: { text: string; test?: string }[];
  /** Suggested next concrete step. */
  nextStep?: string;
  /** Suggested journey stage after this turn. */
  stage?: "intuicion" | "forma" | "prueba" | "siguiente";
  /** One short phrase for the "Para llevarte" card. */
  highlight?: string;
};

export type ChatError = { error: string };

export const UPDATES_MARKER = "<<<UPDATES>>>";

/** Split a fully received response into visible text and parsed updates (null if absent/invalid). */
export function splitUpdates(raw: string): { text: string; updates: ChatUpdates | null } {
  const at = raw.indexOf(UPDATES_MARKER);
  if (at === -1) return { text: raw, updates: null };
  const text = raw.slice(0, at).replace(/\n$/, "");
  try {
    return { text, updates: JSON.parse(raw.slice(at + UPDATES_MARKER.length).trim()) as ChatUpdates };
  } catch {
    return { text, updates: null };
  }
}

/** Text safe to render while streaming: cuts at the marker or at a trailing partial "<<<...". */
export function visibleText(partial: string): string {
  const at = partial.indexOf(UPDATES_MARKER);
  if (at !== -1) return partial.slice(0, at).replace(/\n$/, "");
  for (let k = Math.min(partial.length, UPDATES_MARKER.length - 1); k > 0; k--) {
    if (partial.endsWith(UPDATES_MARKER.slice(0, k))) return partial.slice(0, -k).replace(/\n$/, "");
  }
  return partial;
}

/**
 * Minimal client helper. Streams text via `onText(visibleSoFar)` and resolves with the final split.
 * Usage:
 *   const { text, updates } = await streamChat({ messages, ideaId }, (t) => setDraft(t), abort.signal);
 */
export async function streamChat(
  body: ChatRequest,
  onText: (visibleSoFar: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; updates: ChatUpdates | null; engine: string | null }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = "No pudimos obtener una respuesta. Intenta de nuevo.";
    try {
      const err = (await res.json()) as ChatError;
      if (err?.error) message = err.error;
    } catch {}
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    onText(visibleText(raw));
  }
  raw += decoder.decode();
  const final = splitUpdates(raw);
  onText(final.text);
  return { ...final, engine: res.headers.get("X-Pilar-Engine") };
}
