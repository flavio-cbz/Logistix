# LogistiX - Gestion de Parcelles et Produits

LogistiX est une application web complète dédiée à la gestion de parcelles et de produits agricoles. Elle permet de suivre les ventes, d'analyser les bénéfices et de gérer efficacement vos ressources. Ce dépôt contient le code source de l'application ainsi que tous les outils nécessaires à son déploiement et à son évolution.

## Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies Utilisées](#technologies-utilisées)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation et Démarrage](#installation-et-démarrage)
  - [En Développement](#en-développement)
  - [En Production](#en-production)
  - [Déploiement avec Docker](#déploiement-avec-docker)
- [Configuration](#configuration)
- [Structure du Projet](#structure-du-projet)
- [Utilisation](#utilisation)
- [Tests](#tests)
- [Scripts de Maintenance](#scripts-de-maintenance)
- [Performance](#performance)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Auteurs et Remerciements](#auteurs-et-remerciements)
- [Contact](#contact)

## Fonctionnalités

### Gestion des Parcelles

- **Création et modification** : Ajoutez et modifiez facilement vos parcelles
- **Suivi détaillé** : Informations sur la localisation, la superficie, les cultures
- **Historique complet** : Historique des cultures et des rendements par parcelle

### Gestion des Produits

- **Catalogue produits** : Gestion complète des produits agricoles
- **Suivi des ventes** : Enregistrement et analyse des ventes par produit
- **Gestion des stocks** : Contrôle en temps réel des niveaux de stock

### Analyse et Statistiques

- **Tableau de bord personnalisable** : Widgets configurables selon vos besoins
- **Analyse de marché** : Suivi des tendances et comparaison concurrentielle
- **Statistiques détaillées** : ROI, temps de vente, performance par plateforme
- **Prévisions** : Analyse prédictive des ventes futures

### Visualisations Avancées

- **Graphiques interactifs** : Recharts pour des visualisations riches
- **Heatmaps** : Cartes de performance géographique
- **Diagrammes Sankey** : Flux de ventes et de revenus
- **Radar charts** : Analyse multicritère des performances

### Import/Export de Données

- **Formats multiples** : Support CSV, JSON, Excel
- **Synchronisation** : Import/export automatisé des données
- **Templates** : Modèles prédéfinis pour faciliter l'import

### Sécurité et Authentification

- **Système d'authentification** : Connexion sécurisée avec gestion de session
- **Profils utilisateurs** : Gestion des profils et préférences
- **Protection des données** : Chiffrement et sauvegardes automatiques

## Technologies Utilisées

### Frontend

- **Next.js 14** : Framework React moderne avec App Router
- **TypeScript** : Typage statique fort pour un code robuste
- **Tailwind CSS** : Framework CSS utilitaire avec animations
- **Framer Motion** : Animations fluides et interactions
- **Recharts** : Bibliothèque de graphiques interactifs

### Backend

- **Next.js API Routes** : API REST intégrée
- **Better-SQLite3** : Base de données légère et performante
- **bcrypt** : Hashage sécurisé des mots de passe
- **Zod** : Validation des schémas de données

### Outils de Développement

- **Vitest** : Tests unitaires et d'intégration
- **ESLint** : Linting et qualité du code
- **Bundle Analyzer** : Analyse de la taille des bundles
- **Lighthouse** : Audit de performance

### UI/UX

- **Radix UI** : Composants accessibles et personnalisables
- **Lucide React** : Icônes modernes et cohérentes
- **Dark Mode** : Support complet du mode sombre
- **Responsive Design** : Adaptation mobile-first

## Architecture

L'application suit une architecture modulaire avec séparation claire des responsabilités :

```
LogistiX/
├── app/                    # App Router Next.js 14
│   ├── (dashboard)/       # Pages protégées du tableau de bord
│   ├── api/v1/            # API REST
│   ├── features/          # Fonctionnalités principales
│   └── login/             # Authentification
├── components/            # Composants React réutilisables
├── lib/                   # Utilitaires et services
├── types/                 # Définitions TypeScript
└── scripts/               # Scripts de maintenance
```

## Prérequis

- **Node.js** : Version 18.0.0 ou supérieure
- **npm** ou **pnpm** : Pour la gestion des dépendances
- **Git** : Pour le contrôle de version
- **Docker** (optionnel) : Pour le déploiement conteneurisé

## Installation et Démarrage

### En Développement

1. **Cloner le dépôt** :

    ```bash
    git clone https://github.com/flavio-cbz/Logistix.git
    cd Logistix
    ```

2. **Installer les dépendances** :

    ```bash
    npm install
    # ou avec pnpm
    pnpm install
    ```

3. **Initialiser la base de données** :

    ```bash
    npm run db:migrate
    ```

4. **Démarrer l'application** :

    ```bash
    npm run dev
    # ou avec pnpm
    pnpm dev
    ```

5. **Accéder à l'application** :
   Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### En Production

1. **Installer les dépendances** :

    ```bash
    npm install --production
    ```

2. **Construire l'application** :

    ```bash
    npm run build
    ```

3. **Démarrer l'application** :

    ```bash
    npm start
    ```

### Déploiement avec Docker

Une image Docker officielle est disponible sur [Docker Hub](https://hub.docker.com/r/nethunter59/logistix).

#### Docker Compose

```yaml
version: '3.8'
services:
  logistix:
    image: nethunter59/logistix:latest
    container_name: logistix
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

#### Commandes Docker

```bash
# Construire l'image
npm run docker:build

# Démarrer les conteneurs
npm run docker:up

# Arrêter les conteneurs
npm run docker:down
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Environnement
NODE_ENV=development
PORT=3000

# Base de données
DATABASE_URL=./data/logistix.db

# Sécurité
SESSION_SECRET=votre-secret-session
BCRYPT_ROUNDS=12

# API
API_URL=http://localhost:3000/api/v1

# Uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Configuration de la base de données

L'application utilise SQLite par défaut. Le fichier de base de données est créé automatiquement lors du premier démarrage.

## Structure du Projet

```
LogistiX/
├── app/
│   ├── (dashboard)/          # Routes protégées
│   │   ├── dashboard/        # Tableau de bord principal
│   │   ├── parcelles/        # Gestion des parcelles
│   │   ├── produits/         # Gestion des produits
│   │   ├── statistiques/     # Statistiques détaillées
│   │   ├── analyse-marche/   # Analyse de marché
│   │   └── profile/          # Profil utilisateur
│   ├── api/v1/              # API REST
│   │   ├── auth/            # Authentification
│   │   ├── parcelles/       # CRUD parcelles
│   │   ├── produits/        # CRUD produits
│   │   ├── statistiques/    # Données statistiques
│   │   └── market-analysis/ # Analyse de marché
│   └── login/               # Page de connexion
├── components/
│   ├── features/            # Composants spécifiques aux features
│   ├── ui/                  # Composants UI génériques
│   └── auth/                # Composants d'authentification
├── lib/
│   ├── services/            # Services métier
│   ├── utils/               # Utilitaires
│   └── constants/           # Constantes
├── types/                   # Types TypeScript
├── scripts/                 # Scripts de maintenance
└── data/                    # Données et uploads
```

## Utilisation

### Première connexion

1. Accédez à [http://localhost:3000](http://localhost:3000)
2. Connectez-vous avec les identifiants par défaut :
   - **Email** : <admin@logistix.local>
   - **Mot de passe** : admin123
3. Modifiez immédiatement votre mot de passe dans les paramètres

### Navigation principale

- **Tableau de bord** : Vue d'ensemble des performances
- **Parcelles** : Gestion des parcelles et cultures
- **Produits** : Catalogue et ventes de produits
- **Statistiques** : Analyses détaillées et rapports
- **Analyse de marché** : Suivi des tendances et prix

### Import de données

1. Allez dans **Paramètres > Import/Export**
2. Choisissez le type de données à importer
3. Téléchargez votre fichier (CSV, JSON, Excel)
4. Mappez les colonnes avec les champs de l'application
5. Validez l'import

## Tests

### Tests unitaires

```bash
npm run test
```

### Tests de performance

```bash
# Audit Lighthouse
npm run perf:audit

# Analyse du bundle
npm run perf:bundle
```

### Tests de linting

```bash
npm run lint
npm run type-check
```

## Scripts de Maintenance

| Script | Description |
|--------|-------------|
| `npm run db:migrate` | Exécuter les migrations de base de données |
| `npm run db:backup` | Créer une sauvegarde de la base de données |
| `npm run db:restore` | Restaurer une sauvegarde |
| `npm run clean` | Nettoyer le cache et les builds |
| `npm run optimize:images` | Optimiser les images du projet |

## Performance

L'application intègre plusieurs optimisations de performance :

- **Code splitting** automatique avec Next.js
- **Lazy loading** des composants
- **Cache API** avec invalidation intelligente
- **Optimisation des images** avec next/image
- **Bundle analyzer** pour surveiller la taille des bundles

### Métriques de performance

- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3.5s
- **Bundle size** : < 300KB (JS), < 50KB (CSS)

## Contribuer

Les contributions sont les bienvenues ! Pour contribuer :

1. **Forkez** le dépôt
2. **Créez** une branche pour votre fonctionnalité :

    ```bash
    git checkout -b feature/nouvelle-fonctionnalité
    ```

3. **Commitez** vos modifications :

    ```bash
    git commit -m "feat: ajout d'une nouvelle fonctionnalité"
    ```

4. **Poussez** votre branche :

    ```bash
    git push origin feature/nouvelle-fonctionnalité
    ```

5. **Ouvrez** une Pull Request

### Conventions de commit

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage du code
- `refactor`: Refactoring
- `test`: Ajout de tests
- `chore`: Maintenance

## Licence

Ce projet est sous licence [MIT](LICENSE). Veuillez consulter le fichier LICENSE pour plus de détails.

## Auteurs et Remerciements

- **Flavio CBZ** – Créateur et mainteneur principal  
  [GitHub](https://github.com/flavio-cbz)

### Remerciements

- La communauté open source pour les bibliothèques utilisées
- Les contributeurs et testeurs bêta
- Les agriculteurs pour leurs retours et suggestions

## Contact

- **Email** : <flavio@logistix.fr>
- **GitHub Issues** : [Créer une issue](https://github.com/flavio-cbz/Logistix/issues)
- **Discussions** : [GitHub Discussions](https://github.com/flavio-cbz/Logistix/discussions)

---

**Développé avec ❤️ pour l'agriculture moderne**
