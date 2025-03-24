FROM node:20-slim AS base

# Installer les dépendances nécessaires uniquement en phase de construction
FROM base AS deps
WORKDIR /app

# Copier package.json et installer les dépendances
COPY package.json package-lock.json* ./
RUN npm ci

# Phase de construction (build)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Construire l'application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Phase de production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Ajouter un utilisateur non-root pour des raisons de sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copier le code construit et les fichiers statiques
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Exposer le port
EXPOSE 3000

# Définir la commande de démarrage
CMD ["node", "server.js"]

