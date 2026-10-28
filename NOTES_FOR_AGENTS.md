# Notes for agents (puente-poc)

Standalone Next.js app. NOT part of `../../el-puente` (never modify that repo). Run: `pnpm dev` (port 3100), check with `pnpm build` before you finish.

## File ownership

| Owner | Paths | Rule |
|---|---|---|
| Scaffold (shared) | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/**`, `src/components/ui/**`, `src/components/shell/**`, `src/lib/types.ts`, `src/lib/fixtures.ts`, `src/lib/chat-types.ts` | Others may only APPEND (new classes at the end of globals.css, new exports/types/fixtures). Do not rename or change existing ones. |
| Dashboard agent | `src/app/dashboard/**`, `src/components/dashboard/**` | Current page is a placeholder; replace freely. |
| Chat agent | `src/app/chat/**`, `src/components/chat/**` | Placeholder; replace freely. Optional `/lab` too (`src/app/lab/**`, `src/components/lab/**`) if time allows. |
| Backend agent | `src/app/api/**`, `src/lib/server/**` | `src/app/api/chat/route.ts` is a fixture STUB that already honors the contract; replace it. |

CSS for a feature should live next to it (e.g. `src/components/chat/chat.css` imported from the component) or be appended to globals.css under a commented section with your agent name.

## Styling

- Global CSS load order: `src/styles/pilar-reference.css` (verbatim reference style.css), `src/styles/decision-lab.css` (verbatim), then `src/app/globals.css` (tokens + `.ui-*` primitives + `.page-*`).
- Reuse the reference class names: chat = `.conversation`, `.journey`, `.journey-steps`, `.conversation-main`, `.conversation-heading`, `.session-badge`, `.thinking-space`, `.stage-heading`, `.thinking-grid`, `.chat-column`, `.block-heading`, `.messages`, `.message.message-user`, `.message.message-guide` > `.guide-mark` + `.guide-copy` (`.message-label`, `p`), `.guide-thinking`, `.chat-composer-dock`, `.local-note`, `.insight-column`, `.insight-card.map-card|decision-card|highlight-card`, `.idea-map` (SVG `.map-line(.connected)`, `.map-node`), `.concept-summary`, `.insight-content`, `.conversation-caption`. Lab = `.decision-lab`, `.dl-*`. Copy markup from `../design/el-pilar-style-guide/reference/index.html` and `reference/app.js` / `decision-lab.js`.
- Body classes are set by AppShell from the route: `/chat` → `in-chat`, `/lab` → `in-lab`, other non-home → `in-page`. Dark mode = `body.dark`.
- Content region: route pages render inside `<main>` after `<header>`. Use an absolutely positioned region: `.conversation` (chat, inset 103px 35px 84px), `.decision-lab` (lab) or `.page-region` (dashboard).
- Tokens (CSS vars): `--ink --muted --line --paper --surface --chat-surface --chat-soft --soft --soft-strong --bubble --bubble-line --faint --focus --scrim`, fonts `--font-ui --font-editorial --font-mono`, spacing `--space-1..7` (4,8,12,16,24,32,48), radii `--radius-control(8) --radius-node(12) --radius-panel(16) --radius-composer(20) --radius-drawer(22)`, motion `--ease-out --motion-composer --motion-first-bubble --motion-scene --motion-graph --motion-message`. Use variables (dark mode redefines them), not raw hex.
- Monochrome only: white/black/grays. No multicolor, no colored Sí/No/Duda (use glyph + text + line style).

## UI primitives (`import { … } from "@/components/ui"`)

Button, ButtonLink(href), Card, CardHeader(glyph,title,meta), CardBody(flush), Chip(tone,mono), ChipButton(pressed), Badge(dot,pulse), Dot, Eyebrow, Field(label,hint,error), Input, Textarea, Select, EmptyState(symbol,title,hint), Progress(value 0..1), JourneyStepper(current), ThinkingIndicator(label), Stat(value,label), SiteLogo, GuideMark, PromptComposer(variant home|dock, value, onChange, onSubmit, busy, placeholder, hint), cx.

Shell hooks: `usePreferences()` / `useToast()` from `@/components/shell/preferences` (`notify("texto")`).

## Data

- `src/lib/types.ts` — Idea model (decisions, hypotheses w/ test + refutedIf, questions, discarded, risks, sources, highlights, proposals, nextStep, messages, exploration).
- `src/lib/fixtures.ts` — `ideas` (ids `cocina-barrio`, `hilo-builders`), `getIdea`, `JOURNEY_STAGES`, `getStage`, `STATUS_LABEL`, `readiness(idea)` (blockers as questions), `HOME_PROMPTS`, `DEMO_SCRIPT`, `formatDate`, `BRAND`.

## Chat contract

See `src/lib/chat-types.ts` (types + `streamChat`, `splitUpdates`, `visibleText`). POST `/api/chat` `{messages, ideaId?}` → `text/plain` stream; optional trailing `\n<<<UPDATES>>>{json}` with `{decisions?, questions?, hypotheses?, nextStep?, stage?, highlight?}`. Header `X-Pilar-Engine: anthropic|claude-code|fixture`.

## Secrets

- `~/.puente/config.json` → `{ elevenlabs: { apiKey, language }, firecrawl: { apiKey } }`.
- `puente-poc/.env.local` exists with `ANTHROPIC_API_KEY` and `LLM_PROVIDER` (gitignored).
- Read only server-side (`src/lib/server/**`, route handlers). Never print, log, commit, or send key values to the client.

## Copy rules (CONTEXTO_EL_PUENTE.md §10)

Spanish UI, calm and reflective. Brand: «El Pilar». Never say "validada", "es buena", "éxito asegurado"; no market numbers; no Claude/Anthropic in product name/logo, no "powered by". The reference badge «Guía local» should only change to something like «Interlocutor en vivo» when a real engine answers. Progress expresses recorrido, never probability.

## Backend (backend agent)

- `POST /api/chat` follows the contract above. Engine: `LLM_PROVIDER` = `anthropic` | `claude-cli` | `mock` | auto (key → anthropic, else `claude` CLI → claude-cli, else mock). `LLM_MODEL` (default `claude-opus-5-5`) and `LLM_EFFORT` (default `low`). In dev you can force an engine per request with the header `X-Pilar-Provider: mock|claude-cli|anthropic`. The trailer is re-serialized server-side (validated JSON, no blank lines before the marker).
- `POST /api/tts {text}` → `audio/mpeg` (ElevenLabs flash v2.5; strips Markdown and the trailer; max 2500 chars).
- `POST /api/scrape {url}` → `{title, url, markdown (≤4000 chars), truncated}` (Firecrawl v2).
- `GET /api/health` → `{llm:{provider, engine, model, anthropicKey, claudeCli, lastTurn:{ttftMs,totalMs}}, tts, scrape}` (booleans only).
- Errors on every route: JSON `{error}` in Spanish. Code: `src/lib/server/{llm,prompt,mock,secrets}.ts`.
