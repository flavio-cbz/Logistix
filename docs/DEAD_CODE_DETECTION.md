# Documentation : Détection de Code Mort et Fichiers Inutilisés

## 1. Objectif

Ce document établit les meilleures pratiques pour identifier et supprimer le code mort, les fichiers inutilisés, les dépendances obsolètes et les exports non utilisés au sein du projet Logistix.

L'objectif est de maintenir une base de code propre, performante et facile à maintenir. Une hygiène de code rigoureuse est d'autant plus critique dans un contexte où des agents IA peuvent générer du code qui, bien que fonctionnel, peut ne pas être parfaitement intégré ou peut laisser des artefacts après itération.

Cette documentation sert de guide de référence pour tous les développeurs contribuant au projet.


---

## 2. Comparaison des Outils et Choix Technologique

Plusieurs outils existent pour détecter le code mort dans un projet TypeScript. Voici une comparaison des options les plus courantes et la justification du choix de **Knip** comme outil standard pour Logistix.

### Options Disponibles

| Outil | Avantages | Inconvénients |
| :--- | :--- | :--- |
| **Options `tsconfig.json`** | - Intégré à TypeScript (`noUnusedLocals`, `noUnusedParameters`).<br>- Aucune dépendance externe requise. | - Portée très limitée : ne détecte pas les fichiers, les exports ou les dépendances inutilisés.<br>- Ne comprend pas les points d'entrée d'un projet (ex: pages Next.js). |
| **`ts-prune`** | - Simple à configurer et rapide.<br>- Spécialisé dans la détection d'exports non utilisés. | - Moins puissant que Knip.<br>- Ne détecte pas les dépendances `npm` inutilisées.<br>- Moins de plugins et d'intégrations pour les frameworks modernes. |
| **Extensions VSCode** | - Analyse en temps réel directement dans l'éditeur.<br>- Utile pour un feedback immédiat. | - Incohérent entre les différents environnements des développeurs.<br>- Ne peut pas être intégré dans un processus de CI pour garantir la propreté du code. |
| **`Knip`** | - **Analyse complète** : détecte fichiers, dépendances, exports, et plus.<br>- **Conscient des frameworks** : possède des plugins pour Next.js, Storybook, etc.<br>- **Hautement configurable** pour gérer les faux positifs.<br>- Intégrable en CI. | - Peut nécessiter une configuration initiale plus fine pour s'adapter aux spécificités d'un projet. |

### Notre Choix : Knip

Le projet Logistix a déjà standardisé l'utilisation de **Knip** via les scripts `analyze:unused` et `cleanup:project`. Ce choix est confirmé et maintenu pour les raisons suivantes :

1.  **Puissance et Complétude** : Knip offre l'analyse la plus exhaustive, couvrant tous les aspects du code mort, des dépendances `npm` aux exports de modules.
2.  **Adaptabilité à Next.js** : Grâce à ses plugins, Knip comprend la structure d'un projet Next.js (comme le `app` router), ce qui réduit considérablement les faux positifs par rapport à des outils plus génériques.
3.  **Automatisation et CI** : Knip peut être scripté et intégré dans des pipelines de CI/CD, ce qui permet de garantir que la base de code reste propre sur le long terme.
4.  **Déjà en Place** : Capitaliser sur l'outil existant et les scripts déjà développés est plus efficace que d'introduire un nouvel outil.

La suite de cette documentation se concentrera donc sur l'amélioration de notre utilisation de Knip.


---

## 3. Configuration de Knip pour Logistix

Pour centraliser et affiner notre utilisation de Knip, il est recommandé de créer un fichier `knip.json` à la racine du projet. Cela remplace les arguments en ligne de commande et permet une configuration plus riche et plus maintenable.

### Fichier `knip.json` Recommandé

Un développeur devra créer le fichier `knip.json` à la racine du projet avec le contenu suivant :

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": [
    "scripts/db/initialize.ts",
    "scripts/ensure-port-free.ts",
    "next.config.mjs",
    "app/layout.tsx",
    "app/**/page.tsx",
    "app/**/route.ts",
    "instrumentation.ts"
  ],
  "project": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.mjs"
  ],
  "ignore": [
    "drizzle/**",
    "tests/**",
    "playwright.config.ts",
    "postcss.config.js",
    "tailwind.config.js",
    "eslint.config.js",
    "next-env.d.ts"
  ],
  "ignoreDependencies": [
    "ts-node",
    "tsx",
    "vitest",
    "@types/node"
  ],
  "next": {
    "entry": [
      "app/layout.tsx",
      "app/**/{page,layout,template,error,not-found}.tsx",
      "app/**/{route,middleware}.ts",
      "instrumentation.ts"
    ]
  }
}
```

### Explication de la Configuration

-   **`entry`**: Définit les points d'entrée de l'application. Knip commencera son analyse à partir de ces fichiers. Nous incluons les scripts de démarrage, la configuration de Next.js, et les fichiers principaux de l'application (`layout`, `page`, `route`).
-   **`project`**: Les globs de fichiers que Knip doit analyser.
-   **`ignore`**: Fichiers et dossiers à exclure complètement de l'analyse. C'est utile pour les configurations, les tests et les fichiers de migration qui ne sont pas directement "utilisés" par l'application.
-   **`ignoreDependencies`**: Dépendances qui sont utilisées dans des contextes que Knip ne peut pas toujours détecter (ex: `ts-node` pour exécuter des scripts).
-   **`next`**: Utilise le plugin Next.js de Knip pour comprendre automatiquement les conventions de l'App Router, réduisant ainsi les faux positifs.


---

## 4. Workflow d'Utilisation

Le processus de détection et de suppression de code mort se déroule en deux phases principales : **Analyse** et **Nettoyage**.

### Étape 1 : Analyse (Mode non destructif)

Cette étape permet d'obtenir un rapport complet sans modifier le projet.

1.  **Lancer l'analyse** :
    Exécutez la commande suivante à la racine du projet :
    ```bash
    npm run analyze:unused
    ```
    Cette commande utilise le script [`scripts/find-unused.ts`](scripts/find-unused.ts) qui exécute Knip en mode "rapport seul".

2.  **Consulter les résultats** :
    Un fichier `unused-files-report.txt` est généré à la racine du projet. Il contient la liste brute des fichiers, dépendances et exports identifiés comme inutilisés. Une synthèse s'affiche également dans la console.

### Étape 2 : Nettoyage (Mode semi-automatisé)

Cette étape génère un rapport plus détaillé et propose des actions de nettoyage.

1.  **Lancer le script de nettoyage en mode "dry run"** :
    C'est le mode par défaut, il ne supprime rien mais simule les actions.
    ```bash
    npm run cleanup:project
    ```
    Cette commande, basée sur [`scripts/cleanup-project.ts`](scripts/cleanup-project.ts), va :
    - Exécuter Knip.
    - Générer un rapport détaillé `CLEANUP-REPORT.md` avec des listes d'actions sûres et d'éléments à vérifier manuellement.
    - Afficher dans la console ce qui *serait* supprimé.

2.  **Analyser le `CLEANUP-REPORT.md`** :
    - **Unresolved Imports** : Ces erreurs doivent être corrigées en priorité.
    - **Safe to Remove** : Fichiers que le script a identifiés comme supprimables sans risque.
    - **Review Before Removal** : Fichiers potentiellement critiques (entités, hooks, etc.) qui nécessitent une validation manuelle.

3.  **Exécuter le nettoyage (Optionnel)** :
    Si, après analyse, vous êtes confiant dans les suggestions, vous pouvez exécuter le script en mode destructif.
    ```bash
    npm run cleanup:project:run
    ```
    Cette commande supprimera les fichiers jugés sûrs et mettra à jour les dépendances. **Utilisez cette commande avec prudence.**


---

## 5. Intégration Continue (CI)

Pour garantir que la base de code reste propre en permanence, il est essentiel d'automatiser la détection de code mort. Cela peut être réalisé en intégrant Knip dans notre workflow de CI avec GitHub Actions.

### Workflow GitHub Actions

Un développeur devra créer le fichier `.github/workflows/knip.yml` avec le contenu suivant. Ce workflow se déclenchera sur chaque `pull_request`.

```yaml
name: 'Knip: Find Unused Code'

on:
  pull_request:
    paths:
      - 'app/**'
      - 'components/**'
      - 'lib/**'
      - 'package.json'
      - 'knip.json'

jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run Knip
        run: npx knip --reporter-prelude ""
```

### Fonctionnement

1.  **Déclenchement** : L'action se lance uniquement lorsque des fichiers pertinents (code source, `package.json`, configuration de Knip) sont modifiés dans une pull request.
2.  **Installation** : Le workflow prépare l'environnement, installe les dépendances du projet.
3.  **Exécution de Knip** : Il lance `npx knip`. Si Knip trouve des fichiers, dépendances ou exports inutilisés, il quittera avec un code d'erreur, ce qui fera échouer le check de la pull request.
4.  **Blocage** : La pull request ne pourra pas être fusionnée tant que les problèmes de code mort ne sont pas résolus, garantissant ainsi que la branche principale reste propre.


---

## 6. Gestion des Faux Positifs

Aucun outil d'analyse statique n'est parfait. Il peut arriver que Knip identifie incorrectement du code comme étant inutilisé. C'est souvent le cas pour du code utilisé de manière dynamique (ex: plugins, configurations chargées à l'exécution).

Le fichier `knip.json` est l'endroit centralisé pour gérer ces exceptions.

### Stratégie de Gestion

1.  **Analyser l'alerte** : Avant d'ignorer une alerte, assurez-vous qu'il s'agit bien d'un faux positif. Vérifiez si le fichier ou l'export est utilisé d'une manière que Knip ne peut pas détecter.
2.  **Utiliser `ignore` pour les fichiers** : Si un fichier entier est faussement détecté (ex: un script de déploiement), ajoutez son chemin au tableau `ignore` dans `knip.json`.
    ```json
    "ignore": [
      "drizzle/**",
      "scripts/special-script.ts"
    ]
    ```
3.  **Utiliser `ignoreDependencies` pour les paquets** : Si une dépendance est marquée comme inutilisée alors qu'elle est nécessaire (souvent pour des paquets qui modifient le comportement global ou des outils en ligne de commande), ajoutez-la au tableau `ignoreDependencies`.
    ```json
    "ignoreDependencies": [
      "ts-node",
      "some-dynamic-plugin"
    ]
    ```
4.  **Justifier les exclusions** : Il est recommandé d'ajouter un commentaire dans `knip.json` (bien que le JSON standard ne le supporte pas, vous pouvez garder une note dans la documentation ou un fichier `README.md` proche) pour expliquer pourquoi une exclusion a été ajoutée.

En gérant rigoureusement les faux positifs, nous nous assurons que les rapports de Knip restent pertinents et fiables.


---

## 7. Conclusion

Ce document a établi un workflow complet et robuste pour la détection et la suppression du code mort dans le projet Logistix, en s'appuyant sur l'outil puissant qu'est Knip.

En adoptant ce processus, nous nous assurons que :
- La base de code reste légère et optimisée.
- La maintenance est simplifiée pour tous les développeurs.
- L'intégration de code (y compris celui généré par IA) est soumise à un standard de propreté élevé.

Il est de la responsabilité de chaque développeur de suivre ce guide et de participer activement à la maintenance de la qualité du code.
