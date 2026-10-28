# El Pilar (Next.js 16) para Railway. Node 24 + pnpm 12.4.2 (corepack), build determinista con el lockfile.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# corepack actualizado evita fallos de verificación de firmas con versiones nuevas de pnpm
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@12.4.2 --activate
WORKDIR /app

# 1) Dependencias (capa cacheable: solo cambia con el lockfile)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 3) Runtime, usuario no root
FROM base AS runner
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next ./.next
USER node
EXPOSE 3000
# Railway inyecta $PORT; next escucha en 0.0.0.0:$PORT
CMD ["sh", "-c", "exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
