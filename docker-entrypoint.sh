#!/bin/sh
set -e

# Fonction pour gérer les signaux
handle_signal() {
  echo "Received signal, shutting down gracefully..."
  exit 0
}

# Intercepter les signaux
trap handle_signal SIGINT SIGTERM

# Vérifier les variables d'environnement requises
if [ -z "$NODE_ENV" ]; then
  echo "WARNING: NODE_ENV is not set, defaulting to production"
  export NODE_ENV=production
fi

# Créer les répertoires nécessaires s'ils n'existent pas
mkdir -p /app/public/data

# Vérifier les permissions
if [ ! -w "/app/public/data" ]; then
  echo "ERROR: Cannot write to /app/public/data directory"
  exit 1
fi

# Afficher des informations de démarrage
echo "Starting LogistiX Pro application..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Exécuter la commande fournie
exec "$@"

