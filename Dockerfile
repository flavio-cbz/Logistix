# Étape de construction (builder)
FROM node:20-alpine AS builder

# Pour la phase de build, utiliser NODE_ENV=development pour installer toutes les dépendances
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Installer les outils nécessaires
RUN apk add --no-cache libc6-compat python3 make g++

# Copier package.json et package-lock.json
COPY package.json package-lock.json* ./

# Installer toutes les dépendances (y compris devDependencies)
RUN npm install --legacy-peer-deps

# Copier le reste de l'application
COPY . .

# Construire l'application Next.js
RUN npm run build

# Étape de production (runner)
FROM node:20-alpine AS runner

# Passer en mode production pour l'exécution
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

WORKDIR /app

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Installer curl pour le healthcheck
RUN apk add --no-cache curl

# Copier les fichiers construits depuis l'étape builder
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Créer un répertoire pour les données persistantes et ajuster les permissions
RUN mkdir -p /app/public/data && chown -R nextjs:nodejs /app/public/data

# Copier le script de démarrage
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/

# Définir un healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Passer à l'utilisateur non-root
USER nextjs

# Exposer le port d'écoute
EXPOSE 3000

# Définir le point d'entrée et la commande par défaut
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
