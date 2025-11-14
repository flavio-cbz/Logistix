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
  last_login_at TEXT,
  preferences TEXT DEFAULT '{}', -- JSON: {currency, weightUnit, dateFormat, autoExchangeRate}
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS user_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS user_created_at_idx ON users(created_at);
CREATE INDEX IF NOT EXISTS user_updated_at_idx ON users(updated_at);

-- ============================================================================
-- TABLE: sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- TABLE: user_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_last_activity_idx ON user_sessions(last_activity_at);

-- ============================================================================
-- TABLE: parcelles
-- ============================================================================
CREATE TABLE IF NOT EXISTS parcelles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  numero_suivi TEXT,
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
CREATE INDEX IF NOT EXISTS parcelle_numero_suivi_idx ON parcelles(numero_suivi);
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
  plateforme TEXT CHECK(plateforme IN ('leboncoin', 'autre')),
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
CREATE INDEX IF NOT EXISTS product_brand_idx ON products(brand);
CREATE INDEX IF NOT EXISTS product_category_idx ON products(category);

-- ============================================================================
-- NOTE: vinted_sessions, market_analyses, similar_sales, tracked_products
--       tables REMOVED - these features have been deprecated
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
-- TABLE: superbuy_sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS superbuy_sync (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  superbuy_id TEXT NOT NULL,
  logistix_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('parcel','product')),
  last_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  superbuy_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS superbuy_sync_user_superbuy_entity_idx
  ON superbuy_sync(user_id, superbuy_id, entity_type);
CREATE INDEX IF NOT EXISTS superbuy_sync_user_idx ON superbuy_sync(user_id);
CREATE INDEX IF NOT EXISTS superbuy_sync_entity_type_idx ON superbuy_sync(entity_type);
CREATE INDEX IF NOT EXISTS superbuy_sync_logistix_idx ON superbuy_sync(logistix_id);

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
-- NOTES IMPORTANTES
-- ============================================================================
-- Cette migration crée toutes les tables avec toutes les colonnes nécessaires.
-- ============================================================================
-- VUE D'ALIAS : produits -> products (compatibilité legacy)
-- ============================================================================
DROP VIEW IF EXISTS produits;
CREATE VIEW produits AS SELECT * FROM products;

-- ============================================================================
-- NOTES DE DÉPLOIEMENT
-- ============================================================================
-- L'utilisateur admin par défaut est créé par le script d'initialisation
-- (scripts/db/initialize.ts) qui utilise la variable d'env ADMIN_DEFAULT_PASSWORD.
--
-- Si vous utilisez une DB existante, l'initialization-manager ajoutera
-- automatiquement les colonnes legacy manquantes au démarrage.
--
-- Pour une nouvelle DB, simplement exécuter ce fichier avec:
--   sqlite3 data/logistix.db < drizzle/migrations/0000_complete_schema.sql
