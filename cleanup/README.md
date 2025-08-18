# Cleanup automation

Ce répertoire contient le script d'automatisation de nettoyage préparatoire.

Fichier principal :

- [`cleanup/cleanup_project.sh`](cleanup/cleanup_project.sh:1) — script bash idempotent, sécurisé et étendu pour détecter et supprimer automatiquement les fichiers "orphelins".

Résumé des actions réalisées par le script :

1. Crée/bascule sur la branche git "cleanup-files".
2. Supprime les fichiers listés dans la catégorie 1 (si présents).
3. Ajoute des TODO commentés en tête des fichiers de la catégorie 2 (ne supprime pas).
4. Ajoute `data/logistix.db` et `test-results/` à `.gitignore` et retire toute trace suivie par git.
5. N'effectue aucune suppression pour les scripts fantômes (catégorie 4) — avertit seulement.
6. Parcours récursif pour détecter les fichiers "orphelins" (extensions : ts, tsx, js, jsx, py, css, scss, sh, md, etc.) et les supprime s'ils ne sont référencés par aucun autre fichier source (analyse simple par grep). Les exclusions suivantes sont respectées : `node_modules`, `.git`, `.next`, `dist`, `public`, `test-results`, `data`, `backup-*`.

Sécurité et règles de suppression :

- Le script vérifie l'existence avant suppression.
- Il évite d'ajouter plusieurs TODO identiques.
- Il retire uniquement les fichiers suivis de l'index git (git rm --cached) quand nécessaire.
- Ne supprime jamais les fichiers protégés suivants (exemples) : `index.ts`, `index.js`, `README.md`, `package.json`, `tsconfig.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `next.config.js`.
- Les types de fichiers exclus de la détection de référence sont : `*.md`, `*.json`, `*.lock` (les références trouvées uniquement dans ces fichiers ne comptent pas).
- Idempotence : exécutions répétées ne provoqueront pas d'effets additionnels indésirables.

Usage :

```bash
# bash
bash cleanup/cleanup_project.sh
```

Comportement de la détection d'orphelins (très synthétique) :

- Parcours récursif du dépôt (hors dossiers exclus).
- Pour chaque fichier candidat, recherche par grep de:
  - le nom complet du fichier,
  - le basename sans extension,
  - occurrences partielles dans les fichiers sources.
- Si aucune référence pertinente trouvée (hors README, .md, .json, .lock), le fichier est considéré orphelin et supprimé.
- Un résumé listant les orphelins supprimés est affiché à la fin du script.

Après exécution :

- Vérifiez les changements, commitez si satisfaisant :

```bash
# bash
git add .gitignore && git add -A && git commit -m "cleanup: remove stale files and add TODOs"
```

Notes importantes :

- Ne pas exécuter sur une branche de production sans revue.
- Ajustez les listes internes (catégories, extensions, exclusions, fichiers protégés) en tête de [`cleanup/cleanup_project.sh`](cleanup/cleanup_project.sh:1) si nécessaire.
- La détection d'orphelins est basée sur une analyse textuelle simple (grep). Elle peut donner des faux positifs/negatifs dans des cas avancés (génération dynamique, usages par nom sans extension, références construites à l'exécution). Passez en revue la liste finale avant de committer les suppressions.