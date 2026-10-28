# puente-poc

Prueba de concepto web de **El Pilar**: un chat con una interlocutora de IA (Pilar) que va construyendo, en vivo, un modelo estructurado de la idea del usuario (decisiones, hipótesis, preguntas, siguiente paso).

El contexto de producto está en [`../CONTEXTO_EL_PUENTE.md`](../CONTEXTO_EL_PUENTE.md). Este README es solo técnico. Guion de presentación: [`DEMO.md`](DEMO.md).

## Stack

- Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 7
- `@anthropic-ai/sdk` para el LLM
- ElevenLabs (texto a voz) y Firecrawl (lectura de URLs) vía `fetch`
- CSS propio con los tokens del style guide (`../design/el-pilar-style-guide/`); sin Tailwind
- Sin base de datos: datos de ejemplo en `src/lib/fixtures.ts` y estado del chat en `localStorage`

## Requisitos

- Node 24
- pnpm 12

## Inicio rápido

```sh
pnpm install
cp .env.example .env.local   # o créalo a mano, ver "Configuración"
pnpm dev                     # http://localhost:3100
```

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo en el puerto 3100 |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build en el puerto 3100 |
| `pnpm typecheck` | `tsc --noEmit` |

Solo puede correr un `next dev` a la vez en este directorio.

## Configuración

Variables en `.env.local` (está en `.gitignore`):

| Variable | Default | Descripción |
|---|---|---|
| `LLM_PROVIDER` | auto | `anthropic`, `claude-cli`, `mock`, o vacío para auto |
| `ANTHROPIC_API_KEY` | — | Requerida para `anthropic` |
| `LLM_MODEL` | `claude-opus-5-5` | Modelo de la API |
| `LLM_EFFORT` | `low` | Esfuerzo de razonamiento |
| `CLAUDE_BIN` | `claude` en el `PATH` | Binario para `claude-cli` |
| `ELEVENLABS_API_KEY` | `~/.puente/config.json` | Voz |
| `ELEVENLABS_VOICE_ID` | voz por defecto | Voz de ElevenLabs |
| `FIRECRAWL_API_KEY` | `~/.puente/config.json` | Lectura de fuentes |
| `PUENTE_HOME` | `~/.puente` | Carpeta del `config.json` |

Las keys de ElevenLabs y Firecrawl se pueden tomar del archivo compartido con el proyecto `el-puente`:

```json
// ~/.puente/config.json
{ "elevenlabs": { "apiKey": "…", "language": "es" }, "firecrawl": { "apiKey": "…" } }
```

Las keys solo se leen en el servidor (`src/lib/server/secrets.ts`) y nunca llegan al navegador. Reinicia `pnpm dev` después de cambiar `.env.local`.

## Motores de LLM

`src/lib/server/llm.ts` abstrae tres motores con la misma salida en streaming:

| Motor | Cómo funciona | Primer texto / total (medido) |
|---|---|---|
| `anthropic` | Messages API con streaming y prompt caching | ~1.3–3 s / 4–8 s |
| `claude-cli` | Lanza `claude -p --output-format stream-json` por turno, sin herramientas; usa el login local de Claude Code | ~2–7 s / 6–13 s |
| `mock` | Respuestas guionadas locales, sin red | ~0.5 s / 1.5 s |

**Fallback:** si un motor falla o no entrega texto en 15 s (`anthropic`) o 25 s (`claude-cli`), la petición pasa al siguiente: `anthropic` → `claude-cli` → `mock`. El header de respuesta `X-Pilar-Engine` indica qué motor respondió.

En desarrollo se puede forzar un motor por petición con el header `X-Pilar-Provider: anthropic|claude-cli|mock` (desactiva el fallback).

El system prompt de Pilar está en `src/lib/server/prompt.ts`. Si llega `ideaId`, se le agrega el contexto de esa idea.

## API

### `POST /api/chat`

```json
{ "messages": [{ "role": "user", "content": "…" }], "ideaId": "cocina-barrio" }
```

Responde `text/plain` en streaming. Al final del texto visible puede venir una línea con datos estructurados:

```
…¿Qué observación te haría abandonar esa idea?
<<<UPDATES>>>{"questions":[{"text":"¿…?","critical":true}],"stage":"forma","highlight":"…"}
```

Campos de `UPDATES` (todos opcionales): `decisions`, `questions`, `hypotheses`, `nextStep`, `stage` (`intuicion | forma | prueba | siguiente`), `highlight`. Tipos y helpers de parseo (`streamChat`, `splitUpdates`, `visibleText`) en `src/lib/chat-types.ts`. Los errores se devuelven como JSON `{ "error": "…" }` con el mensaje en español.

```sh
curl -N -X POST localhost:3100/api/chat -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hola Pilar"}]}'
```

### `POST /api/tts`

`{ "text": "…" }` → `audio/mpeg` (ElevenLabs).

### `POST /api/scrape`

`{ "url": "https://…" }` → `{ "title", "url", "markdown", "truncated" }` (Firecrawl, markdown truncado a ~4k caracteres).

### `GET /api/health`

Motor activo, modelo, disponibilidad de cada key (solo booleanos) y latencia del último turno.

```sh
curl -s localhost:3100/api/health
```

## Llamada telefónica («Llamarme»)

En `/chat`, el botón **☏ Llamarme** (junto a la etapa) hace que Twilio llame a tu teléfono. Pilar conversa contigo por voz con el mismo prompt y motor que el chat (estilo voz: ≤40 palabras, sin Markdown) y la página se actualiza en vivo: subtítulos de la llamada, mensajes en el chat y el panel lateral (mapa, decisiones, preguntas, hipótesis, siguiente paso) con el trailer `<<<UPDATES>>>`. Al colgar, todo queda en la conversación (localStorage).

Flujo: `POST /api/call/start` → Twilio REST *create call* → Twilio pide `POST /api/call/twiml` (saludo + `<Gather input="speech" language="es-MX">`) → cada frase llega a `POST /api/call/turn` (LLM ≤9 s; si tarda más, dice «Dame un segundo» y `<Redirect>` a `?wait=1`) → la respuesta se sintetiza con ElevenLabs `eleven_flash_v2_5` y se sirve como mp3 desde memoria en `GET /api/call/audio?id=…` (`<Play>`; si la voz falla, `<Say language="es-MX">`). Silencio: un recordatorio y luego despedida y `<Hangup/>`. `POST /api/call/status` (status callback) marca la llamada como terminada. La página consulta `GET /api/call/state?session=…&since=N` cada segundo. Sesiones y audios viven en memoria del proceso (se pierden al reiniciar). Los webhooks validan `X-Twilio-Signature`; además el id de sesión no es adivinable.

Para activarlo en la demo:

1. En `.env.local` agrega `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (tu número de Twilio, formato `+1…`) y opcionalmente `TWILIO_DEFAULT_TO` (tu celular `+52…`, prellena el campo). Con cuenta de prueba, el número destino debe estar verificado en Twilio.
2. Expón el servidor con un túnel (tú decides cuál; la app no lo abre por ti):
   ```sh
   pnpm exec next dev -p 3103            # o el puerto que uses
   # opción A
   brew install cloudflared && cloudflared tunnel --url http://localhost:3103
   # opción B
   ngrok http 3103                       # URL en http://localhost:4040/api/tunnels
   ```
3. Pon la URL https del túnel en `.env.local` como `PUBLIC_BASE_URL=https://xxxx.trycloudflare.com` (sin `/` final) y **reinicia** el servidor (las variables se leen al arrancar). Si cambia la URL del túnel, actualízala y reinicia.
4. Revisa `GET /api/call/health` (solo booleanos). Si falta algo, el botón explica qué variable falta en lugar de fallar.

Simulación local sin llamar (solo en desarrollo): `POST /api/call/start {"dryRun":true}` crea una sesión; abre `/chat?callSession=<id>` y envía webhooks firmados a `/api/call/twiml` y `/api/call/turn` (form `SpeechResult=…`). Con `TWILIO_SKIP_SIGNATURE=1` se omite la validación de firma.

## Rutas

| Ruta | Vista | Parámetros |
|---|---|---|
| `/` | Inicio con el compositor; enviar abre el chat | — |
| `/dashboard` | Ideas, recorrido, mapa de la idea, siguiente paso | `?idea=<id>` |
| `/chat` | Conversación con Pilar y panel del modelo de la idea | `?q=<texto>`, `?idea=<id>` |
| `/lab` | Decision Lab: comparar 2–5 alternativas | `?idea=<id>` |

IDs de ejemplo: `cocina-barrio`, `hilo-builders`.

## Estructura

```
src/
  app/
    page.tsx              Inicio
    dashboard/ chat/ lab/ Páginas
    api/                  chat, tts, scrape, health
    globals.css           Tokens y estilos base
  components/
    shell/                Layout, navegación, preferencias, tema
    ui/                   Primitivas (Button, Card, Chip, PromptComposer…)
    chat/ dashboard/ lab/ Componentes por vista
  lib/
    chat-types.ts         Contrato de /api/chat
    fixtures.ts           Datos de ejemplo
    types.ts              Tipos de dominio
    server/               llm, prompt, mock, secrets (solo servidor)
  styles/                 CSS de referencia del style guide
```

## Limitaciones conocidas

- Es un POC: las ideas del dashboard y del Decision Lab son fixtures, y las ideas nuevas del chat no aparecen en el dashboard.
- El análisis del Decision Lab es local; no llama al LLM.
- Persistencia solo en `localStorage`; sin cuentas ni base de datos.
- Con varias conversaciones simultáneas contra la API, algunas respuestas se congelaron a mitad del stream (~2 min). El fallback solo cubre el primer token; falta un timeout de inactividad a mitad de respuesta.
- En `pnpm dev`, React Strict Mode envía dos veces el primer mensaje de `?q=` (el primero se cancela). No pasa en producción.
- `claude-cli` lanza un proceso nuevo por turno (+1–2 s).

## Pruebas

No hay suite automatizada. El reporte de QA de conversación está en [`QA_CONVERSACION.md`](QA_CONVERSACION.md).
