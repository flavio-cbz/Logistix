# LogistiX

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/flavio-cbz/Logistix)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

LogistiX est une application web complète dédiée à la gestion de parcelles et de produits agricoles. Elle permet de suivre les ventes, d'analyser les bénéfices et de gérer efficacement vos ressources agricoles avec des fonctionnalités avancées d'analyse de marché.

## 🚀 Fonctionnalités

### Gestion des Parcelles
- ✅ Création et modification de parcelles
- ✅ Suivi des informations détaillées (localisation, taille, type)
- ✅ Gestion des coordonnées GPS
- ✅ Historique des modifications

### Gestion des Produits
- ✅ Catalogue complet des produits
- ✅ Suivi des stocks et des prix
- ✅ Gestion des ventes
- ✅ Import/Export CSV
- ✅ Statistiques détaillées

### Analyse de Marché
- ✅ Intégration Vinted pour l'analyse concurrentielle
- ✅ Suivi des tendances de prix
- ✅ Analyse des ventes similaires
- ✅ Recommandations de prix
- ✅ Visualisations interactives

### Tableau de Bord
- ✅ Widgets personnalisables
- ✅ Métriques en temps réel
- ✅ Graphiques et visualisations
- ✅ Analyse ROI
- ✅ Rapports détaillés

### Sécurité et Performance
- ✅ Authentification JWT sécurisée
- ✅ Logging complet avec Winston
- ✅ Monitoring des performances
- ✅ Gestion d'erreurs centralisée
- ✅ Tests automatisés complets

## 🛠️ Stack Technique

### Frontend
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Radix UI** - Composants accessibles
- **Framer Motion** - Animations
- **Recharts** - Visualisations de données
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation des schémas

### Backend
- **Next.js API Routes** - API RESTful
- **Better-SQLite3** - Base de données embarquée
- **Drizzle ORM** - ORM type-safe
- **bcrypt** - Hachage des mots de passe
- **JWT** - Authentification
- **Winston** - Logging avancé

### Outils de Développement
- **Vitest** - Tests unitaires
- **Playwright** - Tests end-to-end
- **ESLint** - Linting du code
- **Bundle Analyzer** - Analyse des bundles
- **TypeScript** - Vérification de types

## 📋 Prérequis

- **Node.js** 18.0.0 ou supérieur
- **npm** ou **yarn**
- **Git**

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/flavio-cbz/Logistix.git
cd Logistix
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Base de données
DATABASE_URL=./data/logistix.db

# Authentification
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info

# Sentry (optionnel)
SENTRY_DSN=your-sentry-dsn-here

# Vinted API (optionnel)
VINTED_API_URL=https://www.vinted.fr

# Redis (optionnel)
REDIS_URL=redis://localhost:6379
```

### 4. Initialiser la base de données

```bash
npm run db:migrate
```

### 5. Démarrer l'application

```bash
# Mode développement
npm run dev

# Mode développement silencieux
npm run dev:quiet

# Mode production
npm run build
npm start
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📚 Scripts Disponibles

### Développement
```bash
npm run dev          # Démarrer en mode développement
npm run dev:quiet    # Mode développement silencieux
npm run build        # Build de production
npm run start        # Démarrer en mode production
npm run lint         # Linter le code
npm run type-check   # Vérification TypeScript
```

### Tests
```bash
npm run test         # Tests unitaires
npm run test:watch   # Tests en mode watch
npm run test:coverage # Tests avec couverture
npm run test:ui      # Interface de test
npx playwright test  # Tests end-to-end
```

### Base de Données
```bash
npm run db:migrate   # Exécuter les migrations
npm run db:backup    # Sauvegarder la base
npm run db:restore   # Restaurer la base
```

### Analyse et Optimisation
```bash
npm run analyze:deps    # Analyser les dépendances
npm run analyze:bundle  # Analyser le bundle
npm run cleanup:files   # Nettoyer les fichiers
npm run perf:audit     # Audit de performance
npm run optimize:images # Optimiser les images
```

### Docker
```bash
npm run docker:build  # Construire l'image Docker
npm run docker:up     # Démarrer les conteneurs
npm run docker:down   # Arrêter les conteneurs
npm run deploy        # Déploiement complet
```

## 🏗️ Architecture

```
LogistiX/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Routes protégées
│   ├── api/v1/            # API endpoints
│   └── auth/              # Pages d'authentification
├── components/            # Composants React
│   ├── ui/               # Composants de base
│   └── features/         # Composants métier
├── lib/                  # Logique métier
│   ├── services/         # Services
│   ├── utils/           # Utilitaires
│   └── middlewares/     # Middlewares
├── types/               # Définitions TypeScript
├── hooks/               # Hooks React personnalisés
├── tests/               # Tests
│   ├── unit/           # Tests unitaires
│   ├── integration/    # Tests d'intégration
│   └── e2e/           # Tests end-to-end
├── docs/               # Documentation
└── scripts/            # Scripts utilitaires
```

## 🧪 Tests

Le projet inclut une suite de tests complète :

### Tests Unitaires (Vitest)
- Tests des composants React
- Tests des services et utilitaires
- Tests des hooks personnalisés
- Couverture de code > 70%

### Tests d'Intégration
- Tests des API endpoints
- Tests des services de base de données
- Tests des middlewares

### Tests End-to-End (Playwright)
- Tests des workflows utilisateur
- Tests cross-browser
- Tests d'accessibilité
- Tests de performance

```bash
# Exécuter tous les tests
npm run test

# Tests avec couverture
npm run test:coverage

# Tests end-to-end
npx playwright test

# Tests en mode interactif
npm run test:ui
```

## 📊 Monitoring et Logging

### Logging
- **Winston** pour le logging structuré
- Rotation automatique des logs
- Niveaux de log configurables
- Logging des performances et erreurs

### Monitoring
- Métriques de performance
- Suivi des erreurs avec Sentry
- Audit des actions utilisateur
- Monitoring de la base de données

### Analyse des Performances
```bash
# Audit Lighthouse
npm run perf:audit

# Analyse du bundle
npm run analyze:bundle

# Monitoring des performances
npm run perf:bundle
```

## 🔒 Sécurité

- **Authentification JWT** sécurisée
- **Hachage bcrypt** des mots de passe
- **Validation Zod** des données
- **Headers de sécurité** configurés
- **Logging d'audit** complet
- **Gestion d'erreurs** centralisée

## 🌐 Déploiement

### Docker
```bash
# Construction de l'image
docker build -t logistix .

# Démarrage avec Docker Compose
docker-compose up -d
```

### Variables d'Environnement de Production
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=./data/logistix.db
JWT_SECRET=your-production-jwt-secret
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=warn
```

## 📖 Documentation

- [Guide de Développement](docs/DEVELOPMENT.md)
- [Guide de Déploiement](docs/DEPLOYMENT.md)
- [Documentation API](docs/API.md)
- [Guide de Test](docs/TESTING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dépannage](docs/TROUBLESHOOTING.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

Voir [CONTRIBUTING.md](docs/CONTRIBUTING.md) pour plus de détails.

## 📝 Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- **Issues GitHub** : [Créer une issue](https://github.com/flavio-cbz/Logistix/issues)
- **Documentation** : [docs/](docs/)
- **Email** : support@logistix.com

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) pour le framework
- [Tailwind CSS](https://tailwindcss.com/) pour le styling
- [Radix UI](https://www.radix-ui.com/) pour les composants
- [Vercel](https://vercel.com/) pour l'hébergement
- Tous les contributeurs du projet

---

**LogistiX** - Gestion agricole moderne et intelligente 🌱