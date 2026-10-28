# El Pilar · POC (plan B)

Prueba de concepto para el hackathon: una interfaz que acompaña a una persona desde una intuición abstracta hasta una idea clara y un siguiente paso. Usa datos de ejemplo (fixtures) y un chat que responde **en vivo** por streaming.

> No es el producto final. Nada aquí afirma que una idea "queda validada": la herramienta solo muestra qué falta para saberlo.

## Requisitos

- Node 24, pnpm 12
- `.env.local` (gitignored) con `ANTHROPIC_API_KEY` y/o `LLM_PROVIDER`
- `~/.puente/config.json` con las claves de ElevenLabs (voz «Escuchar») y Firecrawl («Agregar fuente»): `{ "elevenlabs": { "apiKey": "…", "language": "es" }, "firecrawl": { "apiKey": "…" } }`

Las claves solo se leen del lado del servidor. Nunca se copian al repositorio ni se envían al navegador (`/api/health` solo dice `true/false`).

## Cómo correrlo

```sh
pnpm install
pnpm dev                       # http://localhost:3100
pnpm build && pnpm start       # modo producción, también en :3100
```

En segundo plano para la demo:

```sh
nohup pnpm dev > .dev.log 2>&1 &
curl -s localhost:3100/api/health    # qué motor está activo y latencia del último turno
```

## Motor del chat (`LLM_PROVIDER` en `.env.local`)

| Valor | Qué usa | Latencia medida (primer texto / respuesta completa) |
|---|---|---|
| `anthropic` | API de Anthropic con `ANTHROPIC_API_KEY` (Opus 5.5, effort `low`, prompt caching) | ~1.3–3 s / 4–8 s |
| `claude-cli` | El Claude Code instalado en esta máquina (`claude -p`, usa tu login de Claude Code, no la API key) | ~2–7 s / 6–13 s |
| `mock` | Guion local sin red (sigue la historia de la demo) | ~0.5 s / 1.5 s |
| *(vacío)* | Auto: API key → Claude Code → mock | |

Ejemplos de `.env.local`:

```sh
# Recomendado para la demo en vivo
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# "Corre sobre tu propio Claude Code"
LLM_PROVIDER=claude-cli

# Sin internet
LLM_PROVIDER=mock
```

Reinicia `pnpm dev` después de cambiar `.env.local`. Opcionales: `LLM_MODEL` (default `claude-opus-5-5`), `LLM_EFFORT` (default `low`), `CLAUDE_BIN`.

**Red de seguridad:** si el motor no entrega el primer texto en 15 s (API) / 25 s (Claude Code) o falla antes de responder, el servidor cae automáticamente al siguiente (API → Claude Code → mock). La insignia del chat muestra «Interlocutor en vivo» solo cuando respondió un motor real; con el guion local muestra «Guía local».

En desarrollo se puede forzar un motor por petición: `curl -H 'X-Pilar-Provider: mock|claude-cli|anthropic' …` (desactiva el fallback).

## Rutas

| Ruta | Vista |
|---|---|
| `/` | Inicio: «¿Qué tienes en mente?», compositor y sugerencias. Enviar lleva a `/chat?q=…` |
| `/dashboard` | Tus ideas: tarjetas, «Empezó como → Hoy es», recorrido, conteos, mapa de la idea con inspector, siguiente paso, qué le falta, decisiones, riesgos, fuentes. `?idea=<id>` |
| `/chat` | Cuaderno: conversación en streaming + mapa, decisiones, lo que falta, supuestos, siguiente paso, «Para llevarte», fuentes. `?q=` o `?idea=<id>` |
| `/lab` | Decision Lab: una decisión y 2–5 alternativas, grafo, inspector, comparación. `?idea=<id>` |
| `POST /api/chat` | `{messages, ideaId?}` → texto en streaming + `\n<<<UPDATES>>>{json}` (contrato en `src/lib/chat-types.ts`) |
| `POST /api/tts` | `{text}` → `audio/mpeg` (ElevenLabs) |
| `POST /api/scrape` | `{url}` → `{title, url, markdown, truncated}` (Firecrawl) |
| `GET /api/health` | Motor activo, disponibilidad de claves (booleanos) y latencia del último turno |

Ideas de ejemplo: `cocina-barrio` (Cocina compartida del barrio, etapa 03) y `hilo-builders` (No perder el hilo de una idea, etapa 02).

## Guion de demo (3 minutos)

1. **Inicio (`/`) · 20 s.** «Esto es El Pilar: un espacio para pensar». Muestra el ambiente (abajo a la izquierda) y «Personalizar» → modo oscuro, y regresa a claro.
2. **Primera idea en vivo · 60 s.** Escribe en el compositor: *«Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué.»* y envía. En el cuaderno:
   - La respuesta llega en streaming; la insignia cambia a «Interlocutor en vivo».
   - El guía hace **una sola pregunta**. A la derecha aparecen «Lo que falta», supuestos y el mapa crece.
   - Responde: *«Creo que el problema es que no tienen dónde cocinar con permisos.»* Cuando aparezca una decisión propuesta, pulsa **Incorporar** → toast y «Decisión en curso».
   - Opcional: «Escuchar» en una respuesta (voz ElevenLabs) o «Agregar fuente» con una URL (Firecrawl).
3. **Dashboard (`/dashboard`) · 50 s.** «Así se ve una idea que ya avanzó»: tarjeta *Cocina compartida del barrio* → «Empezó como → Hoy es», conteos (nunca porcentajes), **mapa de la idea**: clic en una hipótesis → el inspector muestra la prueba y cuándo se refutaría. Baja a «Siguiente paso» y «Qué le falta» («No es una calificación»).
4. **Decision Lab · 30 s.** Desde el dashboard «Abrir Decision Lab» → «¿Qué deberíamos construir primero?» con 3 alternativas → **Analizar opciones** → clic en una alternativa → inspector → confirmar.
5. **Cierre · 20 s.** «Continuar en el cuaderno ↗» regresa a la conversación de esa idea con todo su contexto. Mensaje: de la intuición a una idea clara y un camino, sin decirte que tu idea "es buena".

Si la red falla durante la demo: pon `LLM_PROVIDER=mock`, reinicia `pnpm dev` y usa las frases del guion (están en `DEMO_SCRIPT`, `src/lib/fixtures.ts`).

## Qué está hardcodeado

- Las dos ideas del dashboard y del Decision Lab (`src/lib/fixtures.ts`). Las ideas nuevas creadas en el chat **no** aparecen en el dashboard.
- El análisis del Decision Lab es local (estructura las alternativas; no llama al LLM).
- Persistencia: solo `localStorage` del navegador (`pilar-chat:v1:<idea|nueva>`). Sin cuentas ni base de datos.
- Ambientes (video de fondo), avatar y fecha de las ideas.

## Limitaciones conocidas

- En `pnpm dev`, React Strict Mode dispara el primer envío de `?q=` dos veces; el primero se cancela (en el log aparece una línea `(incomplete)`). En producción no ocurre.
- `claude-cli` lanza un proceso `claude -p` nuevo por turno (+1–2 s) y depende del login de Claude Code de la máquina.
- La red del lugar ha tenido picos: una llamada a la API tardó 116 s en dar el primer token antes de añadir el fallback; TTS/Firecrawl fallaron una vez con timeout y funcionaron al reintentar. La UI muestra un toast en español y «Reintentar».
- La etapa del recorrido la sugiere el motor; con el motor real suele quedarse en «01 La intuición» los primeros turnos.
- Audio de «Escuchar» verificado del lado del servidor (MP3 válido); la reproducción depende de que el navegador permita audio tras el clic.

## Stack

Next.js 16.4.3 (App Router, Turbopack), React 19.3, TypeScript 7.0.2, `@anthropic-ai/sdk`. Sin Tailwind: CSS del diseño aprobado (`src/styles/*`) + tokens y primitivas en `src/app/globals.css`. Diseño fuente: `../design/el-pilar-style-guide/`. Marca visible: **El Pilar**.
