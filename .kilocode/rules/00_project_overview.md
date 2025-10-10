# Fiche Règle 00 : Vue d'ensemble du Projet Logistix

## 1. Mission du Projet

Logistix est une application web conçue pour l'analyse de données de marché, avec un focus particulier sur les données provenant de la plateforme Vinted. L'objectif est de fournir des outils d'analyse, de visualisation et de gestion de données pour aider à la prise de décision.

## 2. Architecture Générale

Le projet est une application web monolithique basée sur Next.js, avec une séparation claire entre le frontend, le backend (API routes) et la couche de données.

* **Frontend** : Construit avec React et TypeScript. L'interface utilisateur est stylisée avec Tailwind CSS et utilise des composants Shadcn UI.
* **Backend** : Les routes d'API sont gérées par Next.js dans le répertoire `app/api/`.
* **Base de données** : Utilise Drizzle ORM pour interagir avec une base de données relationnelle (probablement SQLite en développement).
* **Déploiement** : L'application est conteneurisée à l'aide de Docker, comme défini dans les fichiers `Dockerfile` et `docker-compose.yml`.

## 3. Stack Technique Principale

| Composant       | Technologie                               | Notes                                           |
| --------------- | ----------------------------------------- | ----------------------------------------------- |
| **Framework**   | [Next.js](https://nextjs.org/) (App Router) | Framework React pour la production.             |
| **Langage**     | [TypeScript](https://www.typescriptlang.org/) | Sur-ensemble de JavaScript typé.                |
| **Base de Données** | [Drizzle ORM](https://orm.drizzle.team/)  | ORM TypeScript-first.                           |
| **Styling**     | [Tailwind CSS](https://tailwindcss.com/)  | Framework CSS utility-first.                    |
| **Composants UI** | [Shadcn UI](https://ui.shadcn.com/)       | Collection de composants réutilisables.         |
| **Linting**     | [ESLint](https://eslint.org/)             | Analyse statique du code pour trouver les problèmes. |
| **Conteneurisation** | [Docker](https://www.docker.com/)         | Plateforme de conteneurisation d'applications.  |

## 4. Structure des Dossiers Clés

* `app/` : Cœur de l'application Next.js (pages, layouts, API routes).
* `components/` : Composants React réutilisables.
* `lib/` : Fonctions utilitaires, configuration, services et logique métier.
* `drizzle/` : Fichiers de migration et configuration de Drizzle.
* `scripts/` : Scripts d'automatisation et de maintenance.
* `docs/` : Documentation détaillée du projet.
