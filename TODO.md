# TODO — LogistiX

## Urgent / Bloquants

- [ ] Corriger les erreurs TypeScript (274) et le strict mode (`exactOptionalPropertyTypes`) — voir [VALIDATION_REPORT.md](VALIDATION_REPORT.md) et [tsconfig.json](tsconfig.json)
- [ ] Authentification: corriger le middleware/token validation — voir [middleware.ts](middleware.ts)
- [ ] Base de données: vérifier `DATABASE_PATH` et permissions du dossier `data` (Docker copie + chmod) — voir [Dockerfile](Dockerfile) et [deploy.sh](deploy.sh)
- [ ] Secrets: remplacer les valeurs par défaut (.env / deploy) — voir [deploy.sh](deploy.sh) et [.env](.env)
- [ ] Stabiliser les tests unitaires et analyser le rapport — voir [test-results/unit-test-report.html](test-results/unit-test-report.html)
- [ ] Aligner le nom du cookie d’auth (`session_id` vs `COOKIE_NAME=logistix_session`) — mettre à jour [middleware.ts](middleware.ts) + [deploy.sh](deploy.sh) + [types/global.d.ts](types/global.d.ts)
- [ ] Supprimer le fallback `JWT_SECRET` en dur et rendre obligatoire la variable d’env — voir [lib/constants/config.ts](lib/constants/config.ts) et [deploy.sh](deploy.sh)
- [ ] Centraliser l’accès DB via `DATABASE_PATH` (ne plus hardcoder `process.cwd()/data/logistix.db`) — voir [lib/services/database/drizzle-client.ts](lib/services/database/drizzle-client.ts), [scripts/migrate.js](scripts/migrate.js), [scripts/setup-db.js](scripts/setup-db.js)
- [ ] Corriger/empêcher les boucles de redirection dans le middleware (compteur `x-redirect-count` peu fiable) — revoir la logique dans [middleware.ts](middleware.ts) et ajouter des tests

## Intégration Vinted

- [ ] Mettre à jour le cookie Vinted (valide) — voir [cookies.txt](cookies.txt) et [VINTED_INTEGRATION_SUMMARY.md](VINTED_INTEGRATION_SUMMARY.md)
- [ ] Récupérer/valider les catalogues via le script — exécuter [scripts/fetch-vinted-catalogs.js](scripts/fetch-vinted-catalogs.js)
- [ ] Intégrer les catégories niveau 3 et mots-clés générés dans les services (cf. sortie du script et doc) — voir [docs/FEATURES_OVERVIEW.md](docs/FEATURES_OVERVIEW.md)
- [ ] Documenter la procédure d’analyse marché (pages, API, services) — voir [docs/FEATURES_OVERVIEW.md](docs/FEATURES_OVERVIEW.md)
- [ ] Remplacer le `VINTED_TOKEN` en dur par une variable d’env (`VINTED_ACCESS_TOKEN`) — voir [scripts/fetch-vinted-catalogs.js](scripts/fetch-vinted-catalogs.js)
- [ ] Consommer le JSON généré `lib/data/vinted-catalogs-real.json` dans le service — refactor de [lib/services/vinted-catalogs.ts](lib/services/vinted-catalogs.ts)
- [ ] Retirer/archiver les cookies/tokens de test présents dans les scripts — voir [scripts/tests/test-vinted-services-direct.ts](scripts/tests/test-vinted-services-direct.ts), [scripts/test-vinted-auth-simple.ts](scripts/test-vinted-auth-simple.ts)
- [ ] Décider du sort de `vinted_scrap.py` (legacy Python) — migrer/supprimer ou isoler sous `scripts/legacy/` et documenter

## Qualité / Nettoyage

- [ ] Exécuter et fiabiliser le script de nettoyage — voir [scripts/cleanup-project.ts](scripts/cleanup-project.ts)
- [ ] Traiter les variables/imports non utilisés signalés — voir [VALIDATION_REPORT.md](VALIDATION_REPORT.md)
- [ ] Revoir/supprimer les logs de debug résiduels — voir [remove-debug-logs-report.json](remove-debug-logs-report.json)
- [ ] Renforcer le logger applicatif — retravailler [lib/utils/simple-logger.js](lib/utils/simple-logger.js)
- [ ] Avancer les points listés — voir [FICHIERS_A_RETRAVAILLER.md](FICHIERS_A_RETRAVAILLER.md)
- [ ] Ajouter des scripts npm pour lancer `cleanup-project` et `file-cleanup-manager` + publier un rapport — voir [scripts/cleanup-project.ts](scripts/cleanup-project.ts), [scripts/file-cleanup-manager.ts](scripts/file-cleanup-manager.ts)
- [ ] Unifier la config Next (éviter doublon `next.config.js` vs `next.config.mjs`) — choisir `.mjs` et ajuster références (ex: scripts de vérification)
- [ ] Éviter l’init DB ad-hoc dans plusieurs scripts (migrations doublonnées) — consolider autour d’un seul flux de migration

## UI / Design System

- [ ] Vérifier la config Tailwind/shadcn et tokens — voir [tailwind.config.ts](tailwind.config.ts) et [components.json](components.json)
- [ ] Passes d’accessibilité et états de chargement — référentiel dans [docs/FEATURES_OVERVIEW.md](docs/FEATURES_OVERVIEW.md)
- [ ] Aligner l’architecture des composants — voir [.kiro/steering/structure.md](.kiro/steering/structure.md)
- [ ] Vérifier la cohérence des variables CSS dans `globals.css` avec les tokens Tailwind utilisés dans les tests — voir [styles/globals.css](styles/globals.css), tests `tests/unit/ui-framework/*`

## DevOps / Déploiement

- [ ] Construire et tester l’image Docker (rebuild better-sqlite3, volume data) — voir [Dockerfile](Dockerfile) et [docker-compose.yml](docker-compose.yml)
- [ ] Générer/valider un fichier .env de prod depuis le script — voir [deploy.sh](deploy.sh)
- [ ] Vérifier NEXT_PUBLIC_* et clés Supabase (si utilisé) — voir [deploy.sh](deploy.sh)
- [ ] Définir un volume persistant `/app/data` dans `docker-compose.yml` + HEALTHCHECK — voir [docker-compose.yml](docker-compose.yml) et [Dockerfile](Dockerfile)
- [ ] Exporter `DATABASE_PATH` dans l’image (`ENV DATABASE_PATH=/app/data/logistix.db`) et utiliser côté app — voir [Dockerfile](Dockerfile) + refactor client DB
- [ ] Ajouter `.dockerignore`/exclure backups et artefacts (backup-*, coverage, logs bruts) si manquants

## Documentation

- [ ] Mettre à jour l’overview des fonctionnalités — voir [docs/FEATURES_OVERVIEW.md](docs/FEATURES_OVERVIEW.md)
- [ ] Mettre à jour le changelog — voir [CHANGELOG.md](CHANGELOG.md)
- [ ] Rafraîchir le README (build, test, run) — voir [README.md](README.md)
- [ ] Consolider la doc d’intégration Vinted — voir [VINTED_INTEGRATION_SUMMARY.md](VINTED_INTEGRATION_SUMMARY.md)
- [ ] Documenter la restriction des routes `/debug` en prod et le flag d’activation en dev — voir [middleware.ts](middleware.ts)
- [ ] Ajouter une section sécurité (tokens/journaux) dans [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) et [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Sécurité & Conformité

- [ ] Purger les secrets accidentels du repo (tokens Vinted, `data/admin-password.txt`) et les déplacer vers des variables d’environnement/gestion de secrets — voir [data/admin-password.txt](data/admin-password.txt)
- [ ] Masquer les tokens/cookies dans les logs (logger central) et activer la rotation — voir [lib/utils/logging](lib/utils/logging) et [scripts/log-rotation-config.js](scripts/log-rotation-config.js)
- [ ] Protéger/retirer les endpoints `/api/v1/debug/*` en production (feature flag) — voir `app/api/v1/debug/*`

## Tests ciblés (à ajouter)

- [ ] Couvrir le matrix d’accès du middleware (public/protégé, redirections, `isApiRoute`) — voir [middleware.ts](middleware.ts)
- [ ] Tests d’intégration DB en mémoire + via `DATABASE_PATH` fichier — voir `tests/backend/setup.ts`
- [ ] Tests des scripts Vinted (catalogs, token expiré) — voir [scripts/fetch-vinted-catalogs.js](scripts/fetch-vinted-catalogs.js)

## Dette technique / Legacy à traiter

- [ ] Remplacer l’usage direct de `better-sqlite3` multi-endroits par un client unique (Drizzle) — voir [lib/services/database/drizzle-client.ts](lib/services/database/drizzle-client.ts)
- [ ] Nettoyer les scripts doublons `setup-db.js` vs `migrate.js` (source de vérité unique)
- [ ] Isoler/supprimer le code Python non essentiel — voir [vinted_scrap.py](vinted_scrap.py), [scripts/python/api/database.py](scripts/python/api/database.py)

## Améliorations techniques proposées

- [ ] Typage strict des variables d’environnement avec Zod (ex: `zod-env`) et fail-fast au boot
- [ ] Feature flags centralisés (ex: `DEBUG_ROUTES_ENABLED`, `DEBUG_LOGGING`, `ENABLE_CACHE`) — guard explicit dans le code
- [ ] Rate limiting et anti-bruteforce (login/API) — middleware commun (ex: mémoire/Redis via `REDIS_URL`)
- [ ] Validation d’API avec Zod + génération OpenAPI (ou doc Markdown) pour `/api/v1/*`
- [ ] Caching des réponses Vinted (TTL, clé par paramètres) — Redis si dispo, fallback mémoire
- [ ] Observabilité: Sentry + OpenTelemetry (corrélation `requestId`, temps DB/API)
- [ ] CI/CD GitHub Actions (typecheck, lint, tests, build Docker, secret scan) + badges
- [ ] i18n (fr/en) avec `next-intl` et extraction des libellés
- [ ] Sécurité headers/CSP renforcés et cookies `Secure`, `HttpOnly`, `SameSite=Strict`
- [ ] Jobs planifiés (node-cron) pour rafraîchir caches/analyses, bascule BullMQ si `REDIS_URL`

## Fonctionnalités produit à forte valeur

- [ ] Alertes de prix/tendances (email/toast/web push) sur seuils et catégories suivies
- [ ] Watchlists (produits/catalogues) par utilisateur avec notifications
- [ ] Reco de prix (intervalle + score de confiance) basée sur `similar_sold_items` + historique
- [ ] Import CSV/Excel de stock (mapping champs, validation, rapport d’erreurs)
- [ ] Exports d’analyse (CSV/PDF) avec templating et filtres
- [ ] Connecteurs multi-plateformes (eBay, Leboncoin) via une interface provider unifiée
- [ ] Dashboard modulaire: presets sauvegardés par utilisateur + partage
- [ ] Audit log + rôles (admin/manager/opérateur) pour actions sensibles
- [ ] Mode offline PWA (lecture analyses récentes, cache contrôlé)
- [ ] Palette de commande (command menu) pour actions fréquentes et raccourcis

## Audits & Suivi global

- [ ] Réaliser les audits manquants : performance, dépendances, base de données, DevOps, UX/UI/accessibilité, coûts (voir [`analysis_reports/ROADMAP_AUDIT_360.md`](analysis_reports/ROADMAP_AUDIT_360.md))
- [ ] Mettre à jour et suivre la feuille de route d’audit 360° (voir [`analysis_reports/audit_360_synthesis.md`](analysis_reports/audit_360_synthesis.md))
- [ ] Compléter les tableaux de suivi synthétiques pour chaque axe d’audit
- [ ] Appliquer les recommandations prioritaires sur la configuration Next.js (voir [`analysis_reports/report_deploy_nextconfig.md`](analysis_reports/report_deploy_nextconfig.md))
- [ ] Consolider la méthodologie d’audit et la documentation associée
