# Étape de construction
# Utiliser l'image Playwright officielle (navigateurs et deps préinstallés)
# Version alignée avec package.json (playwright ^1.55.0)
FROM mcr.microsoft.com/playwright:v1.55.0-jammy AS builder

# Installation des dépendances build nécessaires (pour better-sqlite3)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
	python3 make g++ gcc \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de dépendances et le dossier des scripts pour que le postinstall puisse s'exécuter correctement
COPY package*.json ./
COPY scripts ./scripts

# Installer les dépendances (le postinstall pourra alors trouver scripts/setup-db.js)
RUN npm ci

# Copier le reste des fichiers
COPY . .

# Créer le dossier data et définir les permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Exécuter les migrations
RUN npm run db:migrate

# Construire l'application
RUN npm run build

# Étape de production
# Utiliser la même image Playwright pour garantir la présence des navigateurs en prod
FROM mcr.microsoft.com/playwright:v1.55.0-jammy AS runner

# Installation des dépendances build nécessaires (pour better-sqlite3)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
	python3 make g++ gcc \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Créer le dossier data et définir les permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Copier les fichiers nécessaires depuis l'étape de construction
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data

# Recompiler better-sqlite3 pour l'environnement de production (si nécessaire)
RUN npm rebuild better-sqlite3 || true

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
