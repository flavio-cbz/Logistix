<![CDATA[
# Plan d'Intégration de Knip dans le Workflow de Développement

## 1. Objectif

L'objectif de ce plan est d'intégrer Knip de manière transparente et efficace dans le workflow de développement du projet Logistix. Cela permettra de prévenir l'accumulation de code mort et de maintenir une base de code propre et optimisée.

## 2. Scripts `npm` existants

Le projet dispose déjà des scripts suivants dans `package.json` :

- `"analyze:unused": "knip"`
- `"cleanup:project": "knip --reporter detailed"`
- `"knip:ci": "knip --reporter json"`

Nous allons nous appuyer sur ces scripts pour construire notre intégration.

## 3. Intégration dans la CI/CD

L'intégration la plus importante est dans le pipeline de CI/CD (par exemple, GitHub Actions). Cela garantit qu'aucune pull request ne peut être fusionnée si elle introduit du code mort.

**Action :**

Ajouter une étape au workflow de CI qui exécute le script `knip:ci`. Ce script est idéal pour la CI car il génère un rapport JSON qui pourrait être utilisé pour des analyses plus poussées.

**Exemple de configuration pour GitHub Actions :**

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'
      - name: Install dependencies
        run: npm install
      - name: Run Knip
        run: npm run knip:ci
      # ... autres étapes comme le build, les tests, etc.
```

## 4. Intégration Locale avec des Hooks de Pre-commit

Pour fournir un feedback rapide aux développeurs avant même qu'ils ne poussent leur code, nous pouvons utiliser des hooks de pre-commit. Cela empêche les commits qui introduisent du code mort.

**Outils :**

-   **Husky** : pour gérer les hooks Git.
-   **lint-staged** : pour exécuter des commandes sur les fichiers "stagés".

**Actions :**

1.  **Installer les dépendances** (si elles ne sont pas déjà présentes) :
    ```bash
    npm install --save-dev husky lint-staged
    ```
2.  **Configurer Husky** :
    ```bash
    npx husky init
    ```
    Cela créera un dossier `.husky`.
3.  **Créer un hook de pre-commit** :
    Créer un fichier `.husky/pre-commit` avec le contenu suivant :
    ```bash
    #!/bin/sh
    npx lint-staged
    ```
4.  **Configurer `lint-staged`** :
    Ajouter la configuration suivante à `package.json` :
    ```json
    "lint-staged": {
      "*.{ts,tsx}": [
        "eslint --fix",
        "npm run analyze:unused"
      ]
    }
    ```
    Cette configuration exécutera ESLint et Knip sur les fichiers TypeScript modifiés avant chaque commit.

## 5. Standardisation des Scripts

Pour clarifier l'intention, nous pouvons garder les scripts existants. Le script `analyze:unused` est parfait pour une utilisation locale et dans les hooks de pre-commit.

## 6. Plan de Déploiement

1.  **Étape 1 : Communication**
    -   Informer l'équipe de développement de l'introduction du hook de pre-commit.
    -   Documenter la nouvelle procédure dans le `README.md` ou `CONTRIBUTING.md`.
2.  **Étape 2 : Implémentation**
    -   Fusionner les modifications de `package.json` et `.husky`.
    -   Mettre à jour la configuration de la CI/CD.
3.  **Étape 3 : Suivi**
    -   S'assurer que les développeurs n'ont pas de problèmes avec le nouveau hook.
    -   Vérifier que le pipeline de CI échoue correctement lorsque du code mort est introduit.

Ce plan d'intégration permettra de faire de la détection de code mort une partie intégrante et automatisée du cycle de vie du développement, garantissant ainsi la qualité et la maintenabilité du projet Logistix.
]]>