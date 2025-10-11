-- ============================================================================
-- MIGRATION COMPLÈTE : Création de toutes les tables avec colonnes legacy
-- ============================================================================
-- Date: 2025-10-10
-- Description: Cette migration crée ou met à jour toutes les tables du schéma
--              en incluant les colonnes legacy nécessaires pour la compatibilité

-- ============================================================================
-- NETTOYAGE : Suppression des tables obsolètes
-- ============================================================================
DROP TABLE IF EXISTS historical_prices;
DROP TABLE IF EXISTS market_trends;
DROP TABLE IF EXISTS user_query_history;

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  encryption_secret TEXT,
  email TEXT,
  bio TEXT,
  avatar TEXT,
  language TEXT,
  theme TEXT,
  ai_config TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS user_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS user_created_at_idx ON users(created_at);
CREATE INDEX IF NOT EXISTS user_updated_at_idx ON users(updated_at);

-- ============================================================================
-- TABLE: parcelles
-- ============================================================================
CREATE TABLE IF NOT EXISTS parcelles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  transporteur TEXT NOT NULL,
  nom TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'En attente',
  actif INTEGER NOT NULL DEFAULT 1,
  prix_achat REAL,
  poids REAL,
  prix_total REAL,
  prix_par_gramme REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS parcelle_user_idx ON parcelles(user_id);
CREATE INDEX IF NOT EXISTS parcelle_numero_idx ON parcelles(numero);
CREATE INDEX IF NOT EXISTS parcelle_transporteur_idx ON parcelles(transporteur);
CREATE INDEX IF NOT EXISTS parcelle_created_at_idx ON parcelles(created_at);

-- ============================================================================
-- TABLE: products (avec colonnes legacy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  -- Primary key
  id TEXT PRIMARY KEY,
  
  -- Foreign keys
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE SET NULL,
  parcelleId TEXT REFERENCES parcelles(id) ON DELETE SET NULL, -- Legacy alias
  
  -- Basic information
  name TEXT NOT NULL,
  nom TEXT, -- Legacy
  description TEXT,
  details TEXT, -- Legacy
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  
  -- Physical properties
  size TEXT,
  color TEXT,
  poids REAL NOT NULL DEFAULT 0,
  
  -- Financial information (nouvelles colonnes)
  price REAL NOT NULL, -- Prix d'achat principal
  currency TEXT NOT NULL DEFAULT 'EUR',
  cout_livraison REAL,
  selling_price REAL, -- Prix de vente réel
  
  -- Financial information (colonnes legacy)
  prix_vente REAL, -- Legacy: prix de vente
  prixVente REAL, -- Legacy alias
  prix_article REAL, -- Legacy: prix d'achat article
  prixArticle REAL, -- Legacy alias
  prix_article_ttc REAL, -- Legacy: prix TTC
  prixArticleTTC REAL, -- Legacy alias
  prix_livraison REAL, -- Legacy: coût livraison
  prixLivraison REAL, -- Legacy alias
  benefices REAL, -- Legacy: bénéfices calculés
  
  -- Platform and external information
  plateforme TEXT CHECK(plateforme IN ('Vinted', 'leboncoin', 'autre')),
  vinted_item_id TEXT,
  external_id TEXT,
  url TEXT,
  photo_url TEXT,
  
  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'available', 'reserved', 'sold', 'removed', 'archived')),
  vendu TEXT NOT NULL DEFAULT '0' CHECK(vendu IN ('0', '1')),
  
  -- Timestamps (nouvelles colonnes)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  date_mise_en_ligne TEXT,
  listed_at TEXT,
  sold_at TEXT,
  
  -- Timestamps (colonnes legacy)
  date_vente TEXT, -- Legacy: date de vente
  dateVente TEXT, -- Legacy alias
  temps_en_ligne TEXT -- Legacy: temps en ligne calculé
);

-- Indexes pour products
CREATE INDEX IF NOT EXISTS product_user_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS product_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS product_vendu_idx ON products(vendu);
CREATE INDEX IF NOT EXISTS product_parcelle_idx ON products(parcelle_id);
CREATE INDEX IF NOT EXISTS product_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS product_created_at_idx ON products(created_at);
CREATE INDEX IF NOT EXISTS product_updated_at_idx ON products(updated_at);
CREATE INDEX IF NOT EXISTS product_vinted_item_id_idx ON products(vinted_item_id);
CREATE INDEX IF NOT EXISTS product_brand_idx ON products(brand);
CREATE INDEX IF NOT EXISTS product_category_idx ON products(category);

-- ============================================================================
-- TABLE: market_analyses
-- ============================================================================
CREATE TABLE IF NOT EXISTS market_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  catalog_id INTEGER,
  category_name TEXT,
  brand_id INTEGER,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
  input TEXT, -- JSON
  result TEXT, -- JSON
  raw_data TEXT, -- JSON
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_market_analyses_user_created ON market_analyses(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_market_analyses_status ON market_analyses(status);
CREATE INDEX IF NOT EXISTS idx_market_analyses_user_status ON market_analyses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_market_analyses_product_name ON market_analyses(product_name);
CREATE INDEX IF NOT EXISTS idx_market_analyses_expires_at ON market_analyses(expires_at);

-- ============================================================================
-- NOTE: historical_prices table removed - historical data can be stored in
-- market_analyses or external time-series database if needed
-- ============================================================================

-- ============================================================================
-- TABLE: similar_sales
-- ============================================================================
CREATE TABLE IF NOT EXISTS similar_sales (
  id TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL,
  raw_data TEXT, -- JSON
  parsed_data TEXT, -- JSON
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_similar_sales_query_hash ON similar_sales(query_hash);
CREATE INDEX IF NOT EXISTS idx_similar_sales_expires_at ON similar_sales(expires_at);

-- ============================================================================
-- TABLE: tracked_products
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracked_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  external_product_id TEXT,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tracked_products_user_id ON tracked_products(user_id);

-- ============================================================================
-- NOTE: market_trends table removed - trend analysis can be done via
-- market_analyses table or computed on-demand
-- ============================================================================

-- ============================================================================
-- NOTE: user_query_history table removed - search queries are now stored in
-- user_actions table with action_type = 'search_query'
-- ============================================================================

-- ============================================================================
-- TABLE: user_preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objectives TEXT NOT NULL, -- JSON array
  risk_tolerance TEXT NOT NULL CHECK(risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  preferred_insight_types TEXT NOT NULL, -- JSON array
  notification_settings TEXT NOT NULL, -- JSON object
  custom_filters TEXT NOT NULL, -- JSON object
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- TABLE: user_actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK(action_type IN ('view_insight', 'follow_recommendation', 'ignore_recommendation', 'export_analysis', 'save_analysis', 'share_analysis', 'feedback', 'search_query')),
  action_data TEXT NOT NULL, -- JSON
  timestamp TEXT NOT NULL,
  context TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_timestamp ON user_actions(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);

-- ============================================================================
-- TABLE: vinted_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS vinted_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_cookie TEXT,
  encrypted_dek TEXT,
  encryption_metadata TEXT, -- JSON
  session_expires_at TEXT,
  token_expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'requires_configuration' CHECK(status IN ('active', 'expired', 'error', 'requires_configuration')),
  last_validated_at TEXT,
  last_refreshed_at TEXT,
  last_refresh_attempt_at TEXT,
  refresh_attempt_count INTEGER,
  refresh_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vinted_sessions_user_id ON vinted_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vinted_sessions_status ON vinted_sessions(status);

-- ============================================================================
-- TABLE: app_secrets
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_secrets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_secrets_name ON app_secrets(name);

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- Cette migration crée toutes les tables avec toutes les colonnes nécessaires.
-- Si vous utilisez une DB existante, l'initialization-manager ajoutera
-- automatiquement les colonnes legacy manquantes au démarrage.
--
-- Pour une nouvelle DB, simplement exécuter ce fichier avec:
--   sqlite3 data/logistix.db < drizzle/migrations/0009_complete_schema.sql
