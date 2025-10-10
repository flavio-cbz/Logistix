
# Étape de construction
FROM node:20-alpine AS builder

# Installation des dépendances nécessaires pour better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

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
FROM node:20-alpine AS runner

# Installation des dépendances nécessaires pour better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

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

# Recompiler better-sqlite3 pour l'environnement de production
RUN npm rebuild better-sqlite3

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
