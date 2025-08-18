# Rapport d'analyse — deploy-ai-features.sh & next.config.mjs

Fichier : [`scripts/production/deploy-ai-features.sh`](scripts/production/deploy-ai-features.sh:1)
- Pertinence : script shell minimal pour préparer l'infrastructure AI (validation env, schéma Postgres, build, redémarrage, vérifs).
- Sécurité / cohérence :
  - Dépend de psql et de DATABASE_URL ; risque d'exposition des identifiants en clair.
  - Pas de vérification de la présence des binaires (psql, npm, pm2/systemctl).
  - Exécution SQL ad‑hoc : attention au type de SGBD.
- Fragilités :
  - psql "$DATABASE_URL" -c "..." peut échouer selon format.
  - npm run build sans préparation d'env peut échouer.
  - restart fallback peut masquer erreurs.
  - verify_deployment utilise curl sans timeout/retry.
- Recommandations prioritaires :
  1. Vérifier la présence des binaires avant usage (command -v ...).
  2. Éviter credentials en clair (PGPASSFILE, variables sécurisées).
  3. Remplacer SQL ad‑hoc par migrations gérées (ex: [`drizzle/migrations`](drizzle/migrations:1)).
  4. Ajouter retries/timeouts et checks multiples dans verify_deployment.
  5. Ajouter trap ERR pour cleanup/log et vérifier retcodes de chaque commande.

Fichier : [`next.config.mjs`](next.config.mjs:1)
- Pertinence : configuration Next.js centrale (lint/ts, optimisation bundle, images, webpack).
- Sécurité / cohérence :
  - eslint.ignoreDuringBuilds = true et typescript.ignoreBuildErrors = true → masquage d'erreurs ; faire échouer le build est préférable.
  - ignoreWarnings large (/node_modules/) peut masquer problèmes réels.
  - remotePatterns vide : restreindre domaines pour images distantes.
- Fragilités :
  - optimizePackageImports non standard — vérifier compatibilité avec la version de Next installée.
  - config.externals manipulation à tester en CI selon version.
- Recommandations prioritaires :
  1. Désactiver ignoreDuringBuilds / ignoreBuildErrors en CI (faire échouer le build sur erreurs).
  2. Remplacer ignoreWarnings global par filtres ciblés et documentés.
  3. Restreindre remotePatterns aux domaines nécessaires.
  4. Rendre optimizations env‑aware (NODE_ENV) pour activer splitChunks seulement en production.
  5. Vérifier les experimental flags et documenter leur utilité.

Actions proposées
- Créer une migration pour les tables AI et retirer l'exécution SQL directe : voir [`drizzle/migrations`](drizzle/migrations:1).
- Ajouter checks et traps dans le script deploy : vérifier psql/npm/pm2 et utiliser PGPASSFILE.
- Mettre à jour la CI pour faire échouer le build sur erreurs ESLint/TS (modifier [`next.config.mjs`](next.config.mjs:1) en conséquence).

Note : je peux appliquer ces changements (patchs) et mettre à jour [`file_inventory.json`](file_inventory.json:1) pour marquer ces fichiers "analysé" si vous l'autorisez.