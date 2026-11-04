# ---------------------------------------------------------------
#  Coiffure S – image de production
#  Base SQLite, photos, fichiers privés et sauvegardes dans le volume /data (persistant)
# ---------------------------------------------------------------
FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates tar && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/coiffure-s.db \
    UPLOAD_DIR=/data/uploads \
    PRIVATE_DIR=/data/private \
    BACKUP_DIR=/data/backups
COPY --from=build /app ./
RUN mkdir -p /data/uploads /data/private /data/backups && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations + données de base (idempotent : n'écrase rien), puis démarrage
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start"]
