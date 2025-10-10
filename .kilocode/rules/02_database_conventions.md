# Fiche Règle 02 : Conventions Base de Données (Drizzle / SQLite / Production)

## Objectif

Centraliser les conventions pour la conception, migration et exploitation de la base de données afin d'éviter les pertes de données et garantir la cohérence des schémas.

## Hypothèses

- Environnement de développement local : base SQLite (`logistix.db` présent dans le dépôt).
- Production : une base relationnelle (Postgres / Supabase) est probable — adapter via variables d'environnement.

> Si ces hypothèses sont incorrectes, dites-le et j'adapterai la fiche.

## Bonnes pratiques générales

- Ne jamais exécuter de `DROP TABLE` ou `DELETE` sans `WHERE` dans des migrations sans revue explicite.
- Chaque changement de schéma -> nouvelle migration distincte, clairement nommée.
- Garder des backups réguliers (`.bak`) avant migrations majeures (dev et prod).
- Versionner les migrations dans `drizzle/migrations/`.

## Drizzle - Génération et application des migrations

- Générer une migration :

  ```bash
  npx drizzle-kit generate --out ./drizzle/migrations --config drizzle.config.json
  ```

  Nommer manuellement le fichier pour signification : `20250823_add_products_table.sql`.

- Appliquer une migration :

  - Utiliser le script du projet (ex: `node scripts/migrate.js`) ou la CLI Drizzle.
  - Avant application en production : exécuter `npx tsc --noEmit`, `npm run lint`, `npm test`.

## Exemple d'en-tête de migration

Ajouter en haut de chaque fichier SQL un commentaire structuré :

```sql
-- Title: 20250823_add_products_table
-- Description: Ajout de la table products pour stocker les annonces Vinted.
-- Impact: Nouvelle table, aucun break attendu. Pas de suppression de colonne.
-- Rollback: DROP TABLE products;
```

Remarque : Si le rollback est destructeur, fournir un script séparé d'export des données.

## Nomination & contenu des migrations

- Format de nommage : `YYYYMMDD_short-description.sql`.
- Ajouter un bloc `DO $$ ... $$` si des manipulations complexes sont nécessaires.
- Utiliser `IF NOT EXISTS` / `IF EXISTS` pour rendre les scripts plus sûrs et idempotents.

## Tests & rollback

- Tests de migration rapide :

  1. Lancer une DB sqlite éphémère (ex: `sqlite3 :memory:` ou copie temporaire du fichier `logistix.db`).
  2. Appliquer la migration.
  3. Vérifier la présence des tables/colonnes attendues via requêtes simples.

- Template rollback (exemple) :

  ```sql
  -- Rollback: 20250823_add_products_table
  BEGIN;
  DROP TABLE IF EXISTS products;
  COMMIT;
  ```

- Préparer un plan de rollback dans la PR si la migration est destructive (ex: export JSON/CSV des données critiques avant altération).

## Production (Postgres / Supabase) — RLS et sécurité

- Si déployé sur Supabase / Postgres :

  - Activer RLS :

    ```sql
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    ```

  - Créer des policies explicites et documenter les raisons :

    ```sql
    CREATE POLICY "products_owner" ON products
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
    ```

  - Indexer colonnes utilisées fréquemment dans WHERE / JOIN et justifier le choix.

## Typage & Génération TypeScript

- Générer les types TS à partir du schéma quand c'est possible et committer l'artefact dans `lib/types/` si utile.
- Commande recommandée (exemple Drizzle/kit) :

```bash
npx drizzle-kit generate-types --out ./types/db.ts
```

## Données sensibles & seeds

- Les seeds ne doivent pas contenir de secrets. Utiliser des placeholders ou variables d'environnement.
- Les fichiers de seed destinés à la CI peuvent inclure jeux de données réalistes mais anonymisés.

## Observabilité

- Journaliser les erreurs de migration et conserver les logs.
- Conserver un changelog minimal des migrations appliquées (ex: `.kilocode/rules/CHANGELOG.md`).

## Points d'attention / edge cases

- SQLite a des limitations (ALTER TABLE restreint). Préparer des migrations en plusieurs étapes (nouvelle table, backfill, swap).
- Les changements de type risqués doivent être faits en deux étapes : ajouter colonne, backfill, puis supprimer ancienne colonne.

---

Référence rapide : `drizzle/migrations/`, `drizzle.config.json`, `scripts/migrate.js`, `docs/reset-database.md` (voir dossier `docs/`).
