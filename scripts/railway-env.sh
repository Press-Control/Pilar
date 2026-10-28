#!/usr/bin/env bash
# Sube las variables de El Pilar al servicio de Railway enlazado (railway link / init).
# Uso:  scripts/railway-env.sh https://<tu-dominio>.up.railway.app
#
# Orden de búsqueda de cada valor: variable ya exportada en tu shell > ./.env.local > ~/.puente/config.json.
# Nunca imprime valores: solo los nombres de las variables que se configuran. Las que no existen se omiten.
# Se configuran con --skip-deploys; después haz `railway redeploy` para que el servicio arranque con ellas.
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" || ! "$BASE_URL" =~ ^https:// ]]; then
  echo "Uso: $0 https://<dominio-de-railway>   (el dominio sale de 'railway domain')" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"

command -v railway >/dev/null || { echo "Falta el CLI de Railway: brew install railway" >&2; exit 1; }
command -v node >/dev/null || { echo "Falta node" >&2; exit 1; }

ENV_FILE="${ENV_FILE:-./.env.local}"
CONFIG_JSON="${PUENTE_HOME:-$HOME/.puente}/config.json"

# Lee KEY de un archivo dotenv sin ejecutarlo (quita comillas y espacios).
from_env_file() {
  [[ -f "$ENV_FILE" ]] || return 0
  local line
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?$1[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#*=}"
  line="$(printf '%s' "$line" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/')"
  printf '%s' "$line"
}

# Lee una ruta (p.ej. elevenlabs.apiKey) de ~/.puente/config.json.
from_config() {
  [[ -f "$CONFIG_JSON" ]] || return 0
  node -e '
    try {
      const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const v = process.argv[2].split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), d);
      if (typeof v === "string" && v.trim()) process.stdout.write(v.trim());
    } catch {}
  ' "$CONFIG_JSON" "$1"
}

SET_KEYS=()
SKIPPED=()

# Cada valor va por stdin (`railway variable set KEY --stdin`): no aparece en argv/ps ni en la salida.
add() { # add KEY VALUE
  if [[ -z "$2" ]]; then
    SKIPPED+=("$1")
    return 0
  fi
  if ! printf '%s' "$2" | railway variable set "$1" --stdin --skip-deploys >/dev/null 2>&1; then
    echo "Falló al configurar $1. ¿Hiciste 'railway login' y 'railway link' (proyecto + servicio) en esta carpeta?" >&2
    exit 1
  fi
  SET_KEYS+=("$1")
}

lookup() { # lookup KEY [config.path]
  local v="${!1:-}"
  [[ -n "$v" ]] || v="$(from_env_file "$1")"
  [[ -n "$v" || -z "${2:-}" ]] || v="$(from_config "$2")"
  printf '%s' "$v"
}

add ANTHROPIC_API_KEY  "$(lookup ANTHROPIC_API_KEY)"
add LLM_PROVIDER       "anthropic"
add LLM_MODEL          "$(lookup LLM_MODEL)"
add ELEVENLABS_API_KEY "$(lookup ELEVENLABS_API_KEY elevenlabs.apiKey)"
add ELEVENLABS_VOICE_ID "$(lookup ELEVENLABS_VOICE_ID elevenlabs.voiceId)"
add FIRECRAWL_API_KEY  "$(lookup FIRECRAWL_API_KEY firecrawl.apiKey)"
add TWILIO_ACCOUNT_SID "$(lookup TWILIO_ACCOUNT_SID)"
add TWILIO_AUTH_TOKEN  "$(lookup TWILIO_AUTH_TOKEN)"
add TWILIO_FROM        "$(lookup TWILIO_FROM)"
add TWILIO_DEFAULT_TO  "$(lookup TWILIO_DEFAULT_TO)"
add NODE_ENV           "production"
add PUBLIC_BASE_URL    "$BASE_URL"

echo "Variables configuradas en Railway: ${SET_KEYS[*]}"
[[ ${#SKIPPED[@]} -eq 0 ]] || echo "Omitidas (sin valor local): ${SKIPPED[*]}"
echo "Siguiente paso: railway redeploy"
