import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/lib/chat-types";
import { buildSystemPrompt } from "./prompt";
import { mockStream } from "./mock";
import { anthropicKeyPresent, redact } from "./secrets";

/**
 * LLM provider selection for /api/chat.
 *   LLM_PROVIDER = claude-cli | anthropic | mock | auto (default)
 *   auto: ANTHROPIC_API_KEY set -> anthropic; else `claude` CLI found -> claude-cli; else mock.
 *   LLM_MODEL overrides the model (default claude-opus-5-5); LLM_EFFORT (default low, chat is latency bound).
 *   CLAUDE_BIN overrides the CLI path.
 * Every engine is an async generator of raw text chunks (the guide's text + the <<<UPDATES>>> trailer).
 */
export type Provider = "claude-cli" | "anthropic" | "mock";
/** Value of the X-Pilar-Engine header (contract in src/lib/chat-types.ts). */
export const ENGINE_HEADER: Record<Provider, string> = { "claude-cli": "claude-code", anthropic: "anthropic", mock: "fixture" };

export const MODEL = process.env.LLM_MODEL?.trim() || "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORT: Effort = (["low", "medium", "high", "xhigh", "max"] as const).find((e) => e === process.env.LLM_EFFORT?.trim()) ?? "low";

export function findClaudeBin(): string | undefined {
  const candidates = [
    process.env.CLAUDE_BIN,
    join(homedir(), ".local/bin/claude"),
    ...(process.env.PATH ?? "").split(delimiter).map((d) => d && join(d, "claude")),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      accessSync(c, constants.X_OK);
      return c;
    } catch {}
  }
  return undefined;
}

/** `override` (dev only, from the X-Pilar-Provider header) wins over LLM_PROVIDER. */
export function resolveProvider(override?: string | null): Provider {
  const want = (override || process.env.LLM_PROVIDER)?.trim().toLowerCase();
  if (want === "mock" || want === "fixture") return "mock";
  if (want === "anthropic") return anthropicKeyPresent() ? "anthropic" : findClaudeBin() ? "claude-cli" : "mock";
  if (want === "claude-cli" || want === "claude-code" || want === "claude") return findClaudeBin() ? "claude-cli" : "mock";
  if (anthropicKeyPresent()) return "anthropic";
  if (findClaudeBin()) return "claude-cli";
  return "mock";
}

/** Engine error with a Spanish, user-facing message (never contains secrets). */
export class EngineError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

/** Last-turn latency stats, shown by /api/health. In-memory only. */
export const stats: { last?: { engine: string; ttftMs: number | null; totalMs: number; at: string; ok: boolean } } = {};

function sanitize(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.split("<<<UPDATES>>>")[0]!.trim().slice(0, 8000) }))
    .filter((m) => m.content !== "")
    .slice(-30);
}

export function streamEngine(provider: Provider, rawMessages: ChatMessage[], ideaId: string | undefined, signal: AbortSignal): AsyncGenerator<string> {
  const messages = sanitize(rawMessages);
  while (messages.length && messages[0]!.role !== "user") messages.shift();
  if (!messages.length) throw new EngineError("Escribe un mensaje para empezar.", 400);
  if (provider === "mock") return mockStream(messages, ideaId, signal);
  if (provider === "anthropic") return anthropicStream(messages, ideaId, signal);
  return claudeCliStream(messages, ideaId, signal);
}

// ---------------------------------------------------------------------------------------------- anthropic

let client: Anthropic | undefined;

async function* anthropicStream(messages: ChatMessage[], ideaId: string | undefined, signal: AbortSignal): AsyncGenerator<string> {
  client ??= new Anthropic({ maxRetries: 1 });
  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      system: [{ type: "text", text: buildSystemPrompt(ideaId), cache_control: { type: "ephemeral" } }],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal },
  );
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") yield "\n\nPrefiero no seguir por ese camino. ¿Quieres que volvamos a la idea desde otro ángulo?";
  } catch (e) {
    if (signal.aborted) return;
    if (e instanceof Anthropic.AuthenticationError) throw new EngineError("La clave del motor no es válida. Revisa la configuración del servidor.");
    if (e instanceof Anthropic.RateLimitError) throw new EngineError("El motor está saturado. Intenta de nuevo en un momento.", 429);
    if (e instanceof Anthropic.APIError) throw new EngineError(`El motor respondió con un error (${e.status ?? "red"}).`);
    throw new EngineError(redact(`No pudimos contactar al motor: ${(e as Error).message}`));
  }
}

// ---------------------------------------------------------------------------------------------- claude-cli

/** Renders the visible conversation into one prompt for `claude -p` (stateless: each turn spawns fresh). */
function renderTranscript(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1]!;
  const history = messages.slice(0, -1);
  if (!history.length) return last.content;
  const lines = history.map((m) => `${m.role === "user" ? "PERSONA" : "INTERLOCUTOR"}: ${m.content}`);
  return `Conversación hasta ahora:\n\n${lines.join("\n\n")}\n\nNuevo mensaje de la persona (responde solo a este, como el interlocutor, siguiendo tus instrucciones y con el canal estructurado al final):\n\n${last.content}`;
}

async function* claudeCliStream(messages: ChatMessage[], ideaId: string | undefined, signal: AbortSignal): AsyncGenerator<string> {
  const bin = findClaudeBin();
  if (!bin) throw new EngineError("No encontramos Claude Code en esta máquina.");
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model", MODEL,
    "--effort", EFFORT,
    "--system-prompt", buildSystemPrompt(ideaId),
    "--tools", "",
    "--strict-mcp-config",
    "--setting-sources", "",
    "--no-session-persistence",
    "--permission-prompts", "none",
  ];
  // Use the person's own Claude Code login (subscription): never pass an API key to the CLI.
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const child = spawn(/*turbopackIgnore: true*/ bin, args, { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "pipe"] });

  const queue: string[] = [];
  let done = false;
  let failure: EngineError | undefined;
  let wake: (() => void) | undefined;
  const notify = () => {
    wake?.();
    wake = undefined;
  };
  let stderrTail = "";
  let sawDelta = false;
  let resultText: string | undefined;
  let pending = "";
  const decoder = new StringDecoder("utf8");

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let ev: any; // stream-json events are untyped input
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev?.type === "stream_event" && !ev.parent_tool_use_id) {
      const e = ev.event;
      if (e?.type === "content_block_delta" && e.delta?.type === "text_delta" && typeof e.delta.text === "string") {
        sawDelta = true;
        queue.push(e.delta.text);
        notify();
      }
    } else if (ev?.type === "result") {
      if (ev.is_error || (ev.subtype && ev.subtype !== "success")) {
        const detail = typeof ev.result === "string" ? ev.result : "";
        failure = /log ?in|auth|credential|401/i.test(detail)
          ? new EngineError("Claude Code no tiene una sesión iniciada en esta máquina.")
          : new EngineError("Claude Code no pudo completar la respuesta.");
      } else if (typeof ev.result === "string") resultText = ev.result;
    }
  };

  child.stdout.on("data", (d: Buffer) => {
    pending += decoder.write(d);
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const l of lines) handleLine(l);
  });
  child.stderr.on("data", (d: Buffer) => {
    stderrTail = (stderrTail + d.toString("utf8")).slice(-1500);
  });
  child.stdin.on("error", () => {});
  child.on("error", (e: NodeJS.ErrnoException) => {
    failure ??= new EngineError(e.code === "ENOENT" ? "No encontramos Claude Code en esta máquina." : "No pudimos iniciar Claude Code.");
    done = true;
    notify();
  });
  child.on("close", (code) => {
    handleLine(pending + decoder.end());
    // Fallback: no partial deltas but a final result (older CLI): emit it whole.
    if (!sawDelta && resultText) queue.push(resultText);
    if (code !== 0 && !failure && !sawDelta && !resultText && !signal.aborted) {
      failure = /log ?in|auth/i.test(stderrTail)
        ? new EngineError("Claude Code no tiene una sesión iniciada en esta máquina.")
        : new EngineError("Claude Code terminó sin responder.");
      if (stderrTail.trim()) console.warn("[pilar] claude-cli stderr:", redact(stderrTail.trim().slice(-400)));
    }
    done = true;
    notify();
  });

  const kill = () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 2000).unref();
    }
  };
  signal.addEventListener("abort", kill, { once: true });
  child.stdin.end(renderTranscript(messages));

  try {
    for (;;) {
      if (queue.length) {
        yield queue.shift()!;
        continue;
      }
      if (done) break;
      await new Promise<void>((r) => (wake = r));
    }
    if (failure && !sawDelta) throw failure;
  } finally {
    signal.removeEventListener("abort", kill);
    kill();
  }
}
