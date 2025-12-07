# Knip — Top 50 des fichiers marqués comme non référencés

Résumé exécutif

- Date: 2025-10-11T13:03:29Z
- Source: [`knip-report.json`](knip-report.json:1)

Statistiques rapides

- Total top 50 analysés: 50
- Répartition par dossier:
  - `lib/`: 20
  - `components/`: 16
  - `scripts/`: 13
  - `types/`: 1

Liste Top 50 (regroupée par dossier)

lib/ (20)

1. [`lib/index.ts`](lib/index.ts:1)
2. [`lib/analytics/advanced-analytics-engine.ts`](lib/analytics/advanced-analytics-engine.ts:1)
3. [`lib/analytics/price-recommendation-engine.ts`](lib/analytics/price-recommendation-engine.ts:1)
4. [`lib/cache/application-cache.ts`](lib/cache/application-cache.ts:1)
5. [`lib/cache/index.ts`](lib/cache/index.ts:1)
6. [`lib/cache/redis-cache.ts`](lib/cache/redis-cache.ts:1)
7. [`lib/config/ai-settings.ts`](lib/config/ai-settings.ts:1)
8. [`lib/config/index.ts`](lib/config/index.ts:1)
9. [`lib/core/index.ts`](lib/core/index.ts:1)
10. [`lib/data/known-brands.ts`](lib/data/known-brands.ts:1)
11. [`lib/database/performance-indexes.ts`](lib/database/performance-indexes.ts:1)
12. [`lib/database/query-optimizer.ts`](lib/database/query-optimizer.ts:1)
13. [`lib/design-system/tokens.ts`](lib/design-system/tokens.ts:1)
14. [`lib/errors/index.ts`](lib/errors/index.ts:1)
15. [`lib/features/index.ts`](lib/features/index.ts:1)
16. [`lib/hooks/use-auto-auth.ts`](lib/hooks/use-auto-auth.ts:1)
17. [`lib/hooks/use-focus-management.ts`](lib/hooks/use-focus-management.ts:1)
18. [`lib/hooks/use-keyboard-navigation.ts`](lib/hooks/use-keyboard-navigation.ts:1)
19. [`lib/hooks/use-market-analysis-data.ts`](lib/hooks/use-market-analysis-data.ts:1)
20. [`lib/hooks/use-mobile-navigation.ts`](lib/hooks/use-mobile-navigation.ts:1)

components/ (16)

1. [`components/logo-animated.tsx`](components/logo-animated.tsx:1)
2. [`components/user-nav.tsx`](components/user-nav.tsx:1)
3. [`components/layout/responsive-grid.tsx`](components/layout/responsive-grid.tsx:1)
4. [`components/search/global-search.tsx`](components/search/global-search.tsx:1)
5. [`components/ui/breadcrumb.tsx`](components/ui/breadcrumb.tsx:1)
6. [`components/ui/calendar.tsx`](components/ui/calendar.tsx:1)
7. [`components/ui/card-stats.tsx`](components/ui/card-stats.tsx:1)
8. [`components/ui/chart.tsx`](components/ui/chart.tsx:1)
9. [`components/ui/enhanced-card.tsx`](components/ui/enhanced-card.tsx:1)
10. [`components/ui/enhanced-toast.tsx`](components/ui/enhanced-toast.tsx:1)
11. [`components/ui/live-region.tsx`](components/ui/live-region.tsx:1)
12. [`components/ui/sheet.tsx`](components/ui/sheet.tsx:1)
13. [`components/ui/slider.tsx`](components/ui/slider.tsx:1)
14. [`components/ui/toggle-group.tsx`](components/ui/toggle-group.tsx:1)
15. [`components/ui/toggle.tsx`](components/ui/toggle.tsx:1)
16. [`components/ui/tooltip.tsx`](components/ui/tooltip.tsx:1)

scripts/ (13)

1. [`scripts/apply-data-migrations.js`](scripts/apply-data-migrations.js:1)
2. [`scripts/consolidate-utilities-migration.ts`](scripts/consolidate-utilities-migration.ts:1)
3. [`scripts/create-admin-user.ts`](scripts/create-admin-user.ts:1)
4. [`scripts/create-produits-view.js`](scripts/create-produits-view.js:1)
5. [`scripts/create-test-product.ts`](scripts/create-test-product.ts:1)
6. [`scripts/export-sqlite.js`](scripts/export-sqlite.js:1)
7. [`scripts/feature-flags-cli.ts`](scripts/feature-flags-cli.ts:1)
8. [`scripts/find-unused.ts`](scripts/find-unused.ts:1)
9. [`scripts/initialize-performance-optimization.ts`](scripts/initialize-performance-optimization.ts:1)
10. [`scripts/inspect-db.js`](scripts/inspect-db.js:1)
11. [`scripts/log-rotation-config.js`](scripts/log-rotation-config.js:1)
12. [`scripts/seed-admin.ts`](scripts/seed-admin.ts:1)
13. [`scripts/vinted-manager.ts`](scripts/vinted-manager.ts:1)

types/ (1)

1. [`types/database.ts`](types/database.ts:1)

Analyse et recommandations rapides

- Première priorité: examiner les composants UI et hooks listés (components + lib/hooks). Les composants non référencés peuvent être des variantes non utilisées, templates générés par IA, ou fichiers destinés à une ancienne mise en page.
- Scripts: vérifier si ce sont utilitaires CLI, scripts de migration ou ops. Les supprimer sans vérification peut casser des flows CI/ops.
- Modules lib/: forte probabilité de code utilitaire exporté mais non importé depuis l'index du projet — vérifier re-exports et usages dynamiques (reflection, imports conditionnels).

Processus recommandé pour traitement

1. Créer une PR de nettoyage par lot (ex: batch ui-components, batch scripts, batch lib-utils).
2. Dans chaque PR:
   - exécuter tests + build: `npm run test && npm run build`
   - exécuter `npx --yes knip --reporter json --config knip.json` pour mesurer le delta
   - ajouter à `knip.json` les exclusions pour faux positifs avant suppression
   - supprimer fichiers, exécuter `npm run lint` et `npx tsc --noEmit`

Commandes utiles

- Générer rapport JSON: `npx --yes knip --reporter json --config knip.json > knip-report.json`
- Générer rapport lisible: `npx --yes knip --reporter table --config knip.json`

Next steps

- Voulez‑vous que je génère automatiquement les PRs candidates pour le top 10 (création de branches et patchs) et marque les fichiers possiblement faux positifs ? (réponse oui/non)