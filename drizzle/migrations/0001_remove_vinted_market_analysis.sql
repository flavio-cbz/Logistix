-- ============================================================================
-- MIGRATION: Suppression complète des fonctionnalités Vinted et Market Analysis
-- ============================================================================
-- Date: 2025-10-12
-- Description: Cette migration retire TOUTES les fonctionnalités Vinted et Market Analysis
--              du schéma, incluant tables, colonnes, indexes et contraintes associées.
-- Objectif: Nettoyage post-refactoring suite à la décision de retirer ces fonctionnalités
--           du produit LogistiX.
--
-- TABLES SUPPRIMÉES:
--   - vinted_sessions (authentification Vinted)
--   - market_analyses (analyses de marché)
--   - similar_sales (cache ventes similaires)
--   - tracked_products (produits suivis)
--
-- COLONNES SUPPRIMÉES:
--   - products.vinted_item_id (ID externe Vinted)
--   - products.plateforme (enum incluant 'Vinted')
--
-- INDEXES SUPPRIMÉS:
--   - product_vinted_item_id_idx
--   - Tous indexes des tables supprimées
--
-- NOTE: Cette migration est DESTRUCTIVE et IRRÉVERSIBLE.
-- Les données des tables supprimées seront perdues.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Suppression des indexes Vinted
-- ============================================================================
DROP INDEX IF EXISTS product_vinted_item_id_idx;
DROP INDEX IF EXISTS idx_vinted_sessions_user_id;
DROP INDEX IF EXISTS idx_vinted_sessions_status;

-- ============================================================================
-- PHASE 2: Suppression des indexes Market Analysis
-- ============================================================================
DROP INDEX IF EXISTS idx_market_analyses_user_created;
DROP INDEX IF EXISTS idx_market_analyses_status;
DROP INDEX IF EXISTS idx_market_analyses_user_status;
DROP INDEX IF EXISTS idx_market_analyses_product_name;
DROP INDEX IF EXISTS idx_market_analyses_expires_at;

DROP INDEX IF EXISTS idx_similar_sales_query_hash;
DROP INDEX IF EXISTS idx_similar_sales_expires_at;

DROP INDEX IF EXISTS idx_tracked_products_user_id;

-- ============================================================================
-- PHASE 3: Suppression des tables Vinted et Market Analysis
-- ============================================================================
-- Note: SQLite ne supporte pas ALTER TABLE DROP COLUMN directement
-- Les colonnes products.vinted_item_id et products.plateforme resteront
-- dans le schéma jusqu'à une migration de reconstruction complète si nécessaire

DROP TABLE IF EXISTS vinted_sessions;
DROP TABLE IF EXISTS market_analyses;
DROP TABLE IF EXISTS similar_sales;
DROP TABLE IF EXISTS tracked_products;

-- ============================================================================
-- PHASE 4: Cleanup de la colonne vinted_item_id dans products (optionnel)
-- ============================================================================
-- SQLite ne permet pas de supprimer une colonne directement.
-- Si une suppression est absolument nécessaire, il faudrait recréer la table:
--
-- 1. Créer nouvelle table sans la colonne
-- 2. Copier les données
-- 3. Supprimer ancienne table
-- 4. Renommer nouvelle table
--
-- Pour l'instant, on laisse la colonne vinted_item_id en place (valeurs NULL acceptées).
-- Elle peut être ignorée par le code applicatif.
--
-- Pour une migration complète future, décommenter et adapter le bloc ci-dessous:

/*
BEGIN TRANSACTION;

-- Créer table products sans colonnes Vinted
CREATE TABLE products_new (
  -- Primary key
  id TEXT PRIMARY KEY,
  
  -- Foreign keys
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE SET NULL,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  
  -- Physical properties
  size TEXT,
  color TEXT,
  poids REAL NOT NULL DEFAULT 0,
  
  -- Financial information
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  cout_livraison REAL,
  selling_price REAL,
  prix_vente REAL,
  
  -- Platform information (sans Vinted)
  plateforme TEXT CHECK(plateforme IN ('leboncoin', 'autre')),
  external_id TEXT,
  url TEXT,
  photo_url TEXT,
  
  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'available', 'reserved', 'sold', 'removed', 'archived')),
  vendu TEXT NOT NULL DEFAULT '0' CHECK(vendu IN ('0', '1')),
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  date_mise_en_ligne TEXT,
  listed_at TEXT,
  sold_at TEXT,
  date_vente TEXT
);

-- Copier données (sans vinted_item_id)
INSERT INTO products_new SELECT
  id, user_id, parcelle_id, name, description, brand, category, subcategory,
  size, color, poids, price, currency, cout_livraison, selling_price, prix_vente,
  CASE WHEN plateforme = 'Vinted' THEN 'autre' ELSE plateforme END as plateforme,
  external_id, url, photo_url, status, vendu,
  created_at, updated_at, date_mise_en_ligne, listed_at, sold_at, date_vente
FROM products;

-- Remplacer table
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

-- Recréer indexes
CREATE INDEX IF NOT EXISTS product_user_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS product_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS product_vendu_idx ON products(vendu);
CREATE INDEX IF NOT EXISTS product_parcelle_idx ON products(parcelle_id);
CREATE INDEX IF NOT EXISTS product_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS product_created_at_idx ON products(created_at);
CREATE INDEX IF NOT EXISTS product_updated_at_idx ON products(updated_at);
CREATE INDEX IF NOT EXISTS product_brand_idx ON products(brand);
CREATE INDEX IF NOT EXISTS product_category_idx ON products(category);

COMMIT;
*/

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- 1. Cette migration conserve les colonnes vinted_item_id et plateforme='Vinted'
--    dans products pour éviter une reconstruction complète de la table.
-- 2. Le code applicatif doit être mis à jour pour ignorer ces colonnes.
-- 3. Les données des tables supprimées (vinted_sessions, market_analyses, etc.)
--    seront PERDUES de manière irréversible.
-- 4. Pour une suppression complète des colonnes, décommenter le bloc PHASE 4.
-- 5. Backup recommandé avant d'exécuter cette migration.
--
-- Exécution:
--   sqlite3 data/logistix.db < drizzle/migrations/0001_remove_vinted_market_analysis.sql
-- ============================================================================
