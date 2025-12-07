# Guide de Contribution - Logistix

Ce guide fournit aux développeurs toutes les informations nécessaires pour contribuer efficacement au projet Logistix. Il couvre l'architecture, les conventions de code, les tests et les processus de déploiement.

## 1. Architecture du Projet

Logistix est construit sur une architecture en couches inspirée de la Clean Architecture pour garantir une séparation claire des préoccupations.

### Couches de l'Application

1.  **Couche Présentation (`app/`, `components/`)**
    *   **Rôle** : Gère l'interface utilisateur et les interactions.
    *   **Technologies** : Next.js (App Router), React (Server & Client Components), Tailwind CSS.

2.  **Couche Application (`lib/application/`)**
    *   **Rôle** : Orchestre les cas d'utilisation (use cases) et la logique applicative.
    *   **Contenu** : Services applicatifs, DTOs (Data Transfer Objects), et handlers.

3.  **Couche Domaine (`lib/domain/`)**
    *   **Rôle** : Contient la logique métier, les entités et les règles fondamentales.
    *   **Contenu** : Entités (ex: `Product`), Value Objects, et interfaces de repositories.

4.  **Couche Infrastructure (`lib/infrastructure/`)**
    *   **Rôle** : Fournit les implémentations techniques des interfaces définies dans le domaine.
    *   **Contenu** : Repositories concrets (ex: `DrizzleProductRepository`), adaptateurs pour les API externes, et services de bas niveau.

### Flux de Données

Le flux typique d'une requête est le suivant :
`Présentation (API Route) -> Application (Use Case) -> Domaine (Entité) -> Infrastructure (Repository) -> Base de Données`

## 2. Conventions de Code

Pour maintenir un code lisible et cohérent, veuillez suivre ces conventions.

### Nommage

*   **Fichiers et dossiers** : `kebab-case` (ex: `product-card.tsx`).
*   **Classes et Types** : `PascalCase` (ex: `ProductService`, `ProductProps`).
*   **Variables et Fonctions** : `camelCase` (ex: `productList`, `calculatePrice`).
*   **Constantes** : `UPPER_SNAKE_CASE` (ex: `MAX_RETRIES`).

### Structure des Imports

Organisez les imports dans l'ordre suivant :
1.  Imports de bibliothèques externes (ex: `react`, `zod`).
2.  Imports internes via alias (ex: `@/components/ui/button`).
3.  Imports relatifs (ex: `./product-card`).

### Documentation

*   Utilisez **JSDoc** pour documenter toutes les fonctions publiques, les types et les classes.
*   Incluez des descriptions, les paramètres (`@param`), les valeurs de retour (`@returns`), et des exemples (`@example`).

## 3. Stratégie de Test

Nous utilisons une combinaison de tests pour garantir la qualité et la robustesse de l'application.

### Types de Tests

*   **Tests Unitaires (Vitest)** : Pour la logique métier, les composants React, les hooks et les fonctions utilitaires. Ils sont rapides et isolés.
*   **Tests d'Intégration (Vitest)** : Pour vérifier l'interaction entre plusieurs composants, comme les appels API depuis les services ou les middlewares.
*   **Tests End-to-End (Playwright)** : Pour simuler des parcours utilisateurs complets dans un vrai navigateur. Ils valident les workflows critiques.

### Exécution des Tests

| Commande           | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm test`         | Lance les tests unitaires et d'intégration.  |
| `npm run test:e2e` | Lance les tests end-to-end avec Playwright.  |
| `npm run test:cov` | Calcule la couverture de code des tests.     |

L'objectif est de maintenir une couverture de test globale supérieure à 80%.

## 4. Processus de Déploiement

Le déploiement est automatisé via des pipelines CI/CD (GitHub Actions).

### Environnements

*   **Développement** : Environnement local avec rechargement à chaud (`npm run dev`).
*   **Staging** : Déployé automatiquement à chaque push sur la branche `develop`. Permet de valider les fonctionnalités avant la production.
*   **Production** : Déployé manuellement ou via la création d'un tag `v*` sur la branche `main`.

### Pipeline CI/CD

Le pipeline exécute les étapes suivantes :
1.  Installation des dépendances.
2.  Exécution du linting et de la vérification des types.
3.  Exécution de tous les tests (unitaires, intégration, E2E).
4.  Build de l'application.
5.  Déploiement sur l'environnement cible.

## 5. Maintenance et Surveillance

### Tâches de Maintenance

*   **Logs** : Les logs sont à surveiller régulièrement pour détecter les erreurs. Un script de rotation (`npm run script:log-rotation`) est disponible.
*   **Base de Données** : Des scripts permettent d'analyser les requêtes lentes et d'optimiser les index si nécessaire.
*   **Dépendances** : Mettez à jour les dépendances mensuellement (`npm outdated` & `npm update`) après avoir vérifié les breaking changes.

### Surveillance

*   **Health Checks** : Un endpoint `/api/health` est disponible pour vérifier l'état de l'application et de ses services connectés (base de données, etc.).
*   **Métriques** : Des métriques de performance (temps de réponse, taux d'erreur) sont collectées et peuvent être exposées à un système de monitoring (ex: Prometheus, Sentry).