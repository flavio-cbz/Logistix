# Fiche Règle 01 : Commandes et Scripts

Ce document centralise les commandes et scripts essentiels pour le développement, les tests et la maintenance du projet Logistix.

## 1. Commandes `npm` Principales

Les commandes suivantes sont définies dans `package.json` et constituent le workflow de base.

| Commande                | Description                                                                                                 | Usage                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `npm run dev`           | Lance le serveur de développement Next.js en mode "watch". Idéal pour le développement local.               | `npm run dev`                               |
| `npm run build`         | Construit l'application pour la production. Optimise le code, compile les assets.                           | `npm run build`                             |
| `npm start`             | Démarre un serveur de production Next.js après un `build`.                                                  | `npm start`                                 |
| `npm run lint`          | Exécute ESLint pour analyser le code et trouver les erreurs de style ou de syntaxe.                           | `npm run lint`                              |
| `npm test`              | Lance la suite de tests (probablement avec Jest ou Vitest).                                                 | `npm test`                                  |
| `npm run drizzle:studio`| Lance Drizzle Studio, une interface graphique pour visualiser et gérer la base de données.                  | `npm run drizzle:studio`                    |

## 2. Scripts de Maintenance et d'Automatisation

Le répertoire `scripts/` contient des scripts pour des tâches spécifiques.

*   `scripts/migrate.js` : Applique les migrations de base de données Drizzle. Ce script doit être exécuté pour mettre à jour le schéma de la base de données avec les dernières modifications.
*   `scripts/vinted-manager.ts` : Gère les interactions avec l'API Vinted (par exemple, rafraîchissement de token, scraping).
*   `scripts/remove-debug-logs.js` : Script utilitaire pour nettoyer les logs de débogage avant un commit ou un déploiement en production.
*   `scripts/audit-slow-queries.ts` : Analyse les logs de la base de données pour identifier les requêtes lentes qui pourraient nécessiter une optimisation.

## 3. Workflow de Développement Typique

1.  **Démarrer l'environnement** :
    ```bash
    docker-compose up -d # Si les services (ex: DB) sont dans Docker
    npm run dev
    ```
2.  **Avant de commiter** :
    ```bash
    npm run lint
    npm test
    npm run build # Pour s'assurer que le build de production ne casse pas
    ```
3.  **Appliquer des migrations** :
    ```bash
    # Créer une nouvelle migration après avoir modifié le schéma dans le code
    npx drizzle-kit generate

    # Appliquer la migration
    node scripts/migrate.js
    ```
