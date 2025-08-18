# LogistiX - Gestion Agricole Intelligente

LogistiX est une application web complète dédiée à la gestion de parcelles et de produits agricoles. Elle permet de suivre les ventes, d'analyser les bénéfices et de gérer efficacement vos ressources. Ce projet est construit avec une stack technologique moderne et performante, conçue pour être à la fois robuste et évolutive.

## Objectif du Projet

L'objectif de LogistiX est de fournir aux agriculteurs et gestionnaires d'exploitations un outil puissant et intuitif pour :

* **Centraliser les données :** Suivi des parcelles, des cultures, des produits et des ventes.
* **Analyser les performances :** Tableaux de bord interactifs pour visualiser les revenus, les coûts et les bénéfices.
* **Optimiser les décisions :** Utilisation de l'IA (via OpenAI) pour des analyses de marché et des recommandations.
* **Automatiser les tâches :** Scripts pour la maintenance de la base de données, l'analyse des dépendances, etc.

## Technologies Utilisées

* **Framework Frontend :** [Next.js](https://nextjs.org/) (React)
* **Framework Backend :** API Routes de Next.js
* **Langage :** [TypeScript](https://www.typescriptlang.org/)
* **Base de Données :** [SQLite](https://www.sqlite.org/index.html) avec [Drizzle ORM](https://orm.drizzle.team/) pour des requêtes sécurisées.
* **Style & UI :**
  * [Tailwind CSS](https://tailwindcss.com/) pour le style utilitaire.
  * [Radix UI](https://www.radix-ui.com/) & [Shadcn/UI](https://ui.shadcn.com/) pour des composants d'interface accessibles et personnalisables.
* **Authentification :** Gestion de session personnalisée avec des cookies `httpOnly`.
* **Tests :** Suite de tests complète avec [Jest](https://jestjs.io/) (tests unitaires), [Playwright](https://playwright.dev/) (tests end-to-end) et [Vitest](https://vitest.dev/).
* **Qualité du Code :** [ESLint](https://eslint.org/) pour le linting.
* **IA & Automatisation :**
  * Intégration du client [OpenAI](https://openai.com/).
  * [Puppeteer](https://pptr.dev/) pour le scraping de données.

## Installation

Pour lancer le projet en local, suivez ces étapes :

1. **Clôner le dépôt :**

    ```bash
    git clone https://github.com/flavio-cbz/Logistix.git
    cd Logistix
    ```

2. **Installer les dépendances :**

    ```bash
    npm install
    ```

3. **Lancer le serveur de développement :**

    ```bash
    npm run dev
    ```

L'application sera alors disponible à l'adresse `http://localhost:3000`.

## Scripts Disponibles

* `npm run dev`: Lance l'application en mode développement.
* `npm run build`: Compile l'application pour la production.
* `npm run start`: Démarre un serveur de production.
* `npm run lint`: Analyse le code avec ESLint.
* `npm run db:migrate`: Exécute les migrations de la base de données.

## Structure du Projet

```text
/
├── app/                # Code de l'application (pages, API, layouts)
├── components/         # Composants React réutilisables
├── lib/                # Logique métier, services, utilitaires
│   ├── services/       # Services (auth, database, etc.)
│   └── utils/          # Fonctions utilitaires
├── scripts/            # Scripts de maintenance et d'automatisation
├── drizzle/            # Fichiers de migration Drizzle
└── public/             # Fichiers statiques
