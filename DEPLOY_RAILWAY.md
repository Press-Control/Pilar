# Deploy en Railway (El Pilar)

Por qué: el wifi del evento es inestable. En Railway las llamadas servidor → Anthropic / ElevenLabs / Twilio salen de un datacenter, hay HTTPS (el micrófono funciona en cualquier dispositivo) y una URL pública para los webhooks de Twilio.

Qué hay en el repo: `Dockerfile` (Node 24 + pnpm 12.4.2, multi-stage, usuario no root), `.dockerignore`, `railway.json` (builder Dockerfile, healthcheck `/api/health`, 1 réplica, sin sleep, reinicio `ON_FAILURE`) y `scripts/railway-env.sh`.

**Una sola réplica, siempre despierta:** las sesiones de llamada y los audios viven en memoria. No subas `numReplicas` ni actives "App Sleeping". Un redeploy corta cualquier llamada en curso.

## Pasos (desde la raíz del repo, ~10–15 min)

Antes: que `.env.local` tenga `ANTHROPIC_API_KEY` y las de Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, opcional `TWILIO_DEFAULT_TO`). También puedes exportarlas en la terminal: el script usa primero el entorno, luego `.env.local`, luego `~/.puente/config.json` (ElevenLabs, Firecrawl).

| # | Comando | Tiempo |
|---|---|---|
| 1 | `railway login` (abre el navegador) | ~30 s |
| 2 | `railway init -n el-pilar` (proyecto nuevo) o `railway link` (uno existente) | ~20 s |
| 3 | `railway up` (sube el código y construye con el Dockerfile; crea el servicio si no existe; el primer build tarda más). Sin variables arranca en modo `mock`: es normal | 3–5 min |
| 4 | `railway domain` (genera `https://<algo>.up.railway.app`) | ~10 s |
| 5 | `scripts/railway-env.sh https://<algo>.up.railway.app` (imprime solo los nombres) | ~10 s |
| 6 | `railway redeploy` (reusa la imagen y toma las variables nuevas) | ~1 min |
| 7 | `curl -s https://<algo>.up.railway.app/api/health` y `.../api/call/health` | 5 s |

Qué esperar en el paso 7:
- `/api/health`: `"provider":"anthropic"`, `"anthropicKey":true`, `"tts":true` (si hay key de ElevenLabs).
- `/api/call/health`: `"ready":true` y `"missing":[]`.

Después abre `https://<algo>.up.railway.app/chat` desde el celular o la laptop y prueba texto, modo voz y «Llamarme».

**Twilio no requiere configurar nada en su consola:** la llamada se crea por REST y en esa petición va la URL del webhook (`PUBLIC_BASE_URL/api/call/twiml` y `/api/call/status`). Con cuenta de prueba, el número destino debe estar verificado en Twilio.

## Problemas comunes

- **El CLI pide elegir servicio o dice que no hay servicio enlazado:** `railway service` (elige el servicio creado por `railway up`) y repite el comando.
- **El healthcheck falla / el deploy no termina:** `railway logs`. El servidor escucha en `0.0.0.0:$PORT` (Railway pone `PORT`); no definas `PORT` a mano.
- **`/api/health` dice `"provider":"mock"`:** falta `ANTHROPIC_API_KEY` en Railway (ojo: `railway variable list` muestra los valores, no lo hagas con la pantalla proyectada). En el contenedor no hay `claude` CLI, así que la cadena es `anthropic → mock`.
- **`/api/call/health` con `missing`:** falta esa variable. Vuelve a correr el script con la variable exportada y luego `railway redeploy`.
- **La llamada entra y dice «Esta llamada ya no está disponible» y cuelga:** `PUBLIC_BASE_URL` no coincide exactamente con el dominio (la firma de Twilio se calcula con esa URL), o el servicio se reinició y perdió la sesión en memoria. Debe ser `https://…` sin `/` final. Si cambiaste el dominio, reejecuta el script y redeploy.
- **Voz robótica en la llamada:** falló ElevenLabs y se usó `<Say>`; revisa `ELEVENLABS_API_KEY` en `/api/health` (`tts`).
- **El micrófono no pide permiso:** asegúrate de usar la URL `https://`.
- **Cambió algo del código:** `railway up` de nuevo (1 réplica: la llamada en curso se corta).

## Volver a localhost + túnel (plan B)

1. `pnpm build && pnpm start` (puerto 3100 por defecto; `PORT=xxxx pnpm start` para otro).
2. `ngrok http 3100` (o `cloudflared tunnel --url http://localhost:3100`).
3. En `.env.local`: `PUBLIC_BASE_URL=https://<tu-túnel>` sin `/` final, y reinicia el servidor.
4. Abre la URL del túnel (https) en los dispositivos. No hay que tocar Twilio.

El servicio de Railway puede quedarse encendido; no interfiere. Para apagarlo: `railway down` (quita el último deploy) o bórralo desde el dashboard.
