# Logistix

Logistix est une application web conçue pour l'analyse de données de marché, avec un focus particulier sur les données provenant de plateformes comme Vinted et Superbuy. L'objectif est de fournir des outils d'analyse, de visualisation et de gestion de données pour aider à la prise de décision.

## 🚀 Démarrage Rapide

### Prérequis

* Node.js (v18+)
* npm (v9+)
* Docker (pour les services externes, si applicable)

### Installation

1. **Clonez le dépôt :**

    ```bash
    git clone <URL_DU_DEPOT>
    cd Logistix
    ```

2. **Installez les dépendances :**

    ```bash
    npm install
    ```

3. **Configurez l'environnement :**
    Copiez le fichier d'exemple et remplissez les variables nécessaires.

    ```bash
    cp .env.example .env
    ```

4. **Base de données :**
    Générez les schémas et appliquez les migrations.

    ```bash
    npm run db:generate
    npm run db:migrate
    ```

5. **Lancez le serveur de développement :**

    ```bash
    npm run dev
    ```

L'application devrait maintenant être accessible à l'adresse [http://localhost:3000](http://localhost:3000).

## 🛠️ Stack Technique

| Composant         | Technologie                                     |
| ----------------- | ----------------------------------------------- |
| **Framework**     | [Next.js](https://nextjs.org/) (App Router)     |
| **Langage**       | [TypeScript](https://www.typescriptlang.org/)   |
| **Base de Données** | [Drizzle ORM](https://orm.drizzle.team/) avec SQLite |
| **Styling**       | [Tailwind CSS](https://tailwindcss.com/)        |
| **Composants UI** | [Shadcn UI](https://ui.shadcn.com/)             |
| **Tests**         | [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/) |
| **Linting**       | [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) |

## 📜 Commandes NPM Principales

| Commande                 | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Lance le serveur de développement.                      |
| `npm run build`          | Construit l'application pour la production.             |
| `npm start`              | Démarre un serveur de production.                       |
| `npm run lint`           | Analyse et corrige les erreurs de style.                |
| `npm test`               | Lance les tests unitaires et d'intégration (Vitest).    |
| `npm run test:e2e`       | Lance les tests end-to-end (Playwright).                |
| `npm run db:generate`    | Génère les fichiers de migration Drizzle.               |
| `npm run db:migrate`     | Applique les migrations à la base de données.           |
| `npm run db:studio`      | Ouvre Drizzle Studio pour gérer la base de données.     |

## 📁 Structure du Projet

Le projet suit une architecture inspirée de la Clean Architecture, séparant les préoccupations en différentes couches :

* `app/` : Cœur de l'application Next.js (pages, layouts, API routes).
* `components/` : Composants React réutilisables.
* `lib/` : Logique métier, services, et code d'infrastructure.
  * `lib/application/` : Use cases et logique applicative.
  * `lib/domain/` : Entités, règles métier et interfaces de repositories.
  * `lib/infrastructure/` : Implémentations concrètes (ex: repositories Drizzle).
* `drizzle/` : Fichiers de migration et configuration de Drizzle.
* `scripts/` : Scripts d'automatisation et de maintenance.
* `tests/` : Tous les tests automatisés (unitaires, intégration, E2E).
* `docs/` : Documentation détaillée du projet.

Pour des informations plus détaillées sur l'architecture, les conventions de code et les processus de déploiement, veuillez consulter le guide de contribution dans [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).
