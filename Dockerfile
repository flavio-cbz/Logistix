# Étape de construction
FROM node:20-alpine AS builder

# Définir les variables d'environnement pour npm
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer et définir le répertoire de travail
WORKDIR /app

# Installer les dépendances nécessaires pour les builds natifs
RUN apk add --no-cache libc6-compat python3 make g++

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances avec une stratégie de cache optimisée
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copier le reste des fichiers de l'application
COPY . .

# Construire l'application
RUN npm run build

# Étape de production
FROM node:20-alpine AS runner

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Créer et définir le répertoire de travail
WORKDIR /app

# Ajouter un utilisateur non-root pour des raisons de sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Installer les dépendances nécessaires pour la production
RUN apk add --no-cache curl

# Copier les fichiers nécessaires depuis l'étape de construction
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Créer un répertoire pour les données persistantes
RUN mkdir -p /app/public/data && chown -R nextjs:nodejs /app/public/data

# Copier le script de démarrage
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/

# Définir le healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Passer à l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3000

# Définir le point d'entrée
ENTRYPOINT ["docker-entrypoint.sh"]

# Définir la commande par défaut
CMD ["node", "server.js"]

