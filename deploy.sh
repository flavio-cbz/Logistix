#!/bin/bash

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier l'existence du fichier package-lock.json
if [ ! -f package-lock.json ]; then
    echo "Aucun package-lock.json trouvé, exécution de 'npm install' pour le générer..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Erreur lors de l'exécution de 'npm install'."
        exit 1
    fi
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "Création du fichier .env..."
    cat > .env << EOL
# Configuration de l'application
NODE_ENV=production

# Configuration de Supabase (optionnel)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjk2MjgxMCwiZXhwIjoxOTMyNTM4ODEwfQ.example

# Configuration de l'authentification
JWT_SECRET=votre_secret_jwt_tres_securise_a_changer_en_production
COOKIE_NAME=logistix_session
COOKIE_MAX_AGE=604800

# Configuration de la base de données
DATABASE_PATH=/app/data/logistix.db
EOL
    echo "Fichier .env créé. Veuillez modifier les valeurs selon vos besoins."
    echo "IMPORTANT: Changez la valeur de JWT_SECRET pour une chaîne aléatoire sécurisée en production."
fi

# Créer le dossier data s'il n'existe pas
if [ ! -d "data" ]; then
    echo "Création du dossier data..."
    mkdir -p data
    chmod 755 data
fi

echo "Déploiement de LogistixPRO..."

# Construire et démarrer les conteneurs
docker-compose up -d --build

echo "LogistixPRO est maintenant accessible à l'adresse http://localhost:3000"
echo "Les données sont stockées dans le dossier ./data"
