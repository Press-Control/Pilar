import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Server-only secret lookup. Env vars win over ~/.puente/config.json.
 * Values are NEVER logged, returned to the client or written to disk. Only booleans leave this module
 * through `secretStatus()`.
 */
type PuenteConfig = {
  elevenlabs?: { apiKey?: string; language?: string; voiceId?: string };
  firecrawl?: { apiKey?: string };
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

function readConfig(): PuenteConfig {
  try {
    const home = process.env.PUENTE_HOME || join(homedir(), ".puente");
    const raw = JSON.parse(readFileSync(join(home, "config.json"), "utf8")) as unknown;
    return typeof raw === "object" && raw !== null ? (raw as PuenteConfig) : {};
  } catch {
    return {}; // missing or unreadable: not configured (never surface the content)
  }
}

export function elevenLabsSettings(): { apiKey?: string; voiceId: string; language: string } {
  const file = readConfig().elevenlabs ?? {};
  return {
    apiKey: str(process.env.ELEVENLABS_API_KEY) ?? str(file.apiKey),
    // "Emily2.0", the voice chosen in the el-puente spike S-C.
    voiceId: str(process.env.ELEVENLABS_VOICE_ID) ?? str(file.voiceId) ?? "SLiC4fN7sbVbYUgtVxNM",
    language: str(file.language) ?? "es",
  };
}

export function firecrawlKey(): string | undefined {
  return str(process.env.FIRECRAWL_API_KEY) ?? str(readConfig().firecrawl?.apiKey);
}

export function anthropicKeyPresent(): boolean {
  return !!str(process.env.ANTHROPIC_API_KEY);
}

export function secretStatus() {
  return { anthropic: anthropicKeyPresent(), tts: !!elevenLabsSettings().apiKey, scrape: !!firecrawlKey() };
}

/** Removes every occurrence of known secrets from a provider error text (defense in depth). */
export function redact(text: string): string {
  let out = text;
  for (const s of [process.env.ANTHROPIC_API_KEY, elevenLabsSettings().apiKey, firecrawlKey()]) {
    if (s) out = out.split(s).join("[redacted]");
  }
  return out;
}
