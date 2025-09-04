# Nettoyage Automatisé Sécurisé des Fichiers Dormants

Ce document décrit le script `clean-dormant-files.ts` qui permet d'identifier et de supprimer de manière sécurisée les fichiers non utilisés dans le projet Logistix.

## Objectif

Le script vise à maintenir la propreté du codebase en supprimant les fichiers qui ne sont plus référencés par les points d'entrée de l'application, tout en assurant la stabilité du projet grâce à un mécanisme de sauvegarde et de test intégré.

## Utilisation

Le script peut être exécuté via une commande npm :

```bash
npm run cleanup:dormant [options]
```

### Options

*   `--dry-run`: Exécute le script en mode simulation. Il identifie et liste les fichiers qui seraient supprimés, mais ne modifie aucun fichier sur le disque. C'est le mode recommandé pour vérifier les candidats à la suppression avant une exécution réelle.

## Configuration

Le comportement du script est contrôlé par le fichier de configuration `.dormant-files-config.json` à la racine du projet. Voici les options configurables :

*   `entryPoints` (tableau de chaînes) : Liste des fichiers ou répertoires considérés comme les points d'entrée de l'application. Le script tracera les dépendances à partir de ces points.
    *   Exemple : `["app", "scripts", "next.config.mjs", "instrumentation.ts"]`
*   `include` (tableau de chaînes) : Motifs glob (glob patterns) des fichiers à inclure dans l'analyse de dépendances.
    *   Exemple : `["app/**/*.{ts,tsx,js,jsx}", "components/**/*.{ts,tsx,js,jsx}"]`
*   `exclude` (tableau de chaînes) : Motifs glob des fichiers ou répertoires à exclure de l'analyse et de la suppression (par exemple, `node_modules`, fichiers de build, etc.).
    *   Exemple : `["**/*.d.ts", "**/node_modules/**"]`
*   `testCommand` (chaîne) : La commande à exécuter pour valider l'intégrité de l'application après chaque suppression de fichier (ou groupe). Par défaut, `npm test -- --watch=false`.
*   `backupDir` (chaîne) : Le répertoire où les fichiers supprimés seront sauvegardés temporairement.
*   `logFile` (chaîne) : Le chemin du fichier de log pour les opérations du script.
*   `reportFile` (chaîne) : Le chemin du fichier Markdown où le rapport final sera généré.

### Exemple de `.dormant-files-config.json`

```json
{
  "entryPoints": [
    "app",
    "scripts",
    "next.config.mjs",
    "instrumentation.ts"
  ],
  "include": [
    "app/**/*.{ts,tsx,js,jsx}",
    "components/**/*.{ts,tsx,js,jsx}",
    "lib/**/*.{ts,tsx,js,jsx}",
    "hooks/**/*.{ts,tsx,js,jsx}",
    "types/**/*.ts"
  ],
  "exclude": [
    "**/*.d.ts",
    "**/*.config.{js,ts,mjs}",
    "**/node_modules/**",
    "**/.next/**",
    "**/coverage/**",
    "**/public/**",
    "**/drizzle/**"
  ],
  "testCommand": "npm test -- --watch=false",
  "backupDir": ".dormant-files-backup",
  "logFile": "logs/dormant-files-cleaner.log",
  "reportFile": "dormant-files-report.md"
}
```

## Fonctionnement Sécurisé

Le script implémente un processus de suppression sécurisé :

1.  **Analyse des dépendances** : Utilise `dependency-cruiser` pour construire un graphe de dépendances et identifier les fichiers non connectés aux points d'entrée.
2.  **Sauvegarde** : Chaque fichier candidat est d'abord copié dans un répertoire de sauvegarde temporaire.
3.  **Suppression et Test** : Le fichier original est supprimé, puis la `testCommand` est exécutée.
4.  **Validation et Restauration** :
    *   Si les tests réussissent, la suppression est considérée comme valide.
    *   Si les tests échouent, le fichier est **automatiquement restauré** depuis la sauvegarde.
5.  **Nettoyage Final** : Les fichiers de sauvegarde sont supprimés uniquement si toutes les opérations se sont déroulées sans erreur et que l'application reste fonctionnelle.
6.  **Rapport détaillé** : Un rapport Markdown est généré, listant les fichiers supprimés avec succès, ceux restaurés, et les éventuelles erreurs.

## Précautions

*   **Mode Dry Run** : Toujours exécuter en `--dry-run` avant une suppression réelle pour valider la liste des fichiers.
*   **Tests Robustes** : Assurez-vous que votre suite de tests (`npm test`) est exhaustive et fiable, car le script s'y fier pour valider les suppressions.
*   **Exclusions** : Vérifiez que tous les fichiers essentiels (configurations, assets, fichiers générés, etc.) sont correctement listés dans la section `exclude` du fichier de configuration pour éviter toute suppression involontaire.