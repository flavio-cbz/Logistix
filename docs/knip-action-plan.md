<![CDATA[
# Plan d'Action pour la Correction des Problèmes de Code Mort Identifiés par Knip

## 1. Introduction

Ce document détaille le plan d'action pour corriger les problèmes de code mort identifiés par le rapport Knip (`knip-report.json`). L'objectif est de nettoyer le projet Logistix de manière systématique et sécurisée, en s'assurant de ne casser aucune fonctionnalité.

Le plan est divisé en plusieurs phases, allant des corrections les plus simples et les moins risquées aux plus complexes.

## 2. Phase 1 : Dépendances Inutilisées

Cette phase est la plus simple et la moins risquée. Elle consiste à supprimer les dépendances qui ne sont jamais importées dans le code.

**Actions :**

1.  **Identifier les dépendances inutilisées** à partir de la section `dependencies` et `devDependencies` du rapport Knip.
2.  **Supprimer les dépendances** en utilisant la commande `npm uninstall <package-name>`. Il est recommandé de les supprimer par petits groupes.
3.  **Valider après chaque suppression** :
    -   Lancer `npm install` pour s'assurer que l'arbre de dépendances est cohérent.
    -   Lancer `npm run build` pour vérifier que l'application compile toujours.
    -   Lancer `npm test` pour exécuter la suite de tests.

## 3. Phase 2 : Fichiers Complètement Inutilisés

Cette phase consiste à supprimer les fichiers qui ne sont jamais importés ou référencés.

**Actions :**

1.  **Identifier les fichiers inutilisés** à partir de la section `files` du rapport Knip.
2.  **Analyser les fichiers avant suppression** :
    -   Vérifier rapidement le contenu du fichier pour s'assurer qu'il ne s'agit pas d'un fichier de configuration ou d'un script utilisé de manière implicite (ex: via un `eval` ou un script shell).
    -   Pour les composants React, s'assurer qu'ils ne sont pas utilisés dynamiquement.
3.  **Supprimer les fichiers** par lots logiques (par exemple, par feature ou par dossier).
4.  **Valider après chaque suppression** :
    -   Lancer `npm run build` et `npm test`.

## 4. Phase 3 : Exports et Types Inutilisés

Cette phase est plus délicate car elle implique de modifier le code existant.

**Actions :**

1.  **Identifier les exports et types inutilisés** à partir des sections `exports` et `types` du rapport Knip.
2.  **Pour chaque export/type inutilisé** :
    -   **Naviguer vers le fichier concerné.**
    -   **Analyser l'utilisation potentielle** : Est-ce que cet export est utilisé par un autre projet ? Est-ce qu'il est destiné à être public ?
    -   **Supprimer l'export** : Retirer le mot-clé `export` de la déclaration. Si la fonction/variable/type n'est plus utilisée nulle part dans le fichier, la supprimer complètement.
3.  **Valider fréquemment** :
    -   Utiliser les fonctionnalités de l'IDE (ex: "Find all references") pour confirmer qu'un export n'est vraiment pas utilisé.
    -   Lancer `npm run build` et `npm test` très régulièrement.

## 5. Phase 4 : Problèmes non résolus et Doublons

Cette phase vise à corriger les problèmes de configuration et de structure du code.

**Actions :**

1.  **Analyser les imports non résolus (`unresolved`)** :
    -   Pour chaque import, vérifier si le chemin est incorrect.
    -   Corriger les alias de chemin dans `tsconfig.json` si nécessaire.
    -   Vérifier si une dépendance est manquante.
2.  **Analyser les exports en double (`duplicates`)** :
    -   Choisir un nom canonique pour l'export.
    -   Refactoriser le code pour n'utiliser que ce nom.
    -   Supprimer l'export en double.

## 6. Recommandations Générales

-   **Travailler sur une branche dédiée** : Isoler les changements liés au nettoyage du code.
-   **Faire des commits fréquents et atomiques** : Un commit par type de nettoyage (ex: "chore: remove unused dependencies", "refactor: delete unused files").
-   **Communiquer avec l'équipe** : S'assurer que les fichiers ou exports supprimés ne sont pas en attente d'utilisation dans une autre branche.
-   **Relancer une analyse Knip** après chaque phase pour voir la progression.

Ce plan d'action structuré permettra de nettoyer le projet Logistix de manière efficace et sécurisée.
]]>