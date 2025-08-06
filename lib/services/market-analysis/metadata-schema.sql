-- Schéma de base de données pour les métadonnées Vinted
-- Tables pour stocker les catalogues, marques, couleurs, tailles, matières et états

-- 1. Table des catalogues (catégories) avec hiérarchie
CREATE TABLE IF NOT EXISTS vinted_catalogs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    parent_id TEXT,
    unisex_catalog_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES vinted_catalogs(id) ON DELETE CASCADE,
    FOREIGN KEY (unisex_catalog_id) REFERENCES vinted_catalogs(id) ON DELETE SET NULL
);

-- 2. Table des marques
CREATE TABLE IF NOT EXISTS vinted_brands (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    slug TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des couleurs avec code hexadécimal
CREATE TABLE IF NOT EXISTS vinted_colors (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    hex_code TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des matières
CREATE TABLE IF NOT EXISTS vinted_materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des états des articles
CREATE TABLE IF NOT EXISTS vinted_statuses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des tailles avec association aux catalogues
CREATE TABLE IF NOT EXISTS vinted_sizes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    catalog_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalog_id) REFERENCES vinted_catalogs(id) ON DELETE CASCADE
);

-- 7. Table des synonymes pour le parsing sémantique
CREATE TABLE IF NOT EXISTS vinted_synonyms (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'color', 'material', 'catalog', 'size', 'status')),
    entity_id TEXT NOT NULL,
    synonym TEXT NOT NULL,
    language TEXT DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table manquante metadata_cache
CREATE TABLE IF NOT EXISTS metadata_cache (
    id TEXT PRIMARY KEY,
    metadata_type TEXT NOT NULL,
    content TEXT NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6c. Historique des requêtes utilisateur pour la résolution d’ambiguïté
CREATE TABLE IF NOT EXISTS user_query_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    parsed_brand_id TEXT,
    parsed_catalog_id TEXT,
    parsed_color_id TEXT,
    parsed_size_id TEXT,
    parsed_material_id TEXT,
    parsed_status_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Paramètres de synchronisation par utilisateur
CREATE TABLE IF NOT EXISTS user_sync_settings (
    user_id TEXT PRIMARY KEY,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'daily',
    sync_time TIME DEFAULT '02:00:00',
    last_sync TIMESTAMP,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Journal des synchronisations
CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sync_type TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT CHECK(status IN ('success', 'error')),
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vinted_catalogs_code ON vinted_catalogs(code);
CREATE INDEX IF NOT EXISTS idx_vinted_catalogs_hierarchy ON vinted_catalogs(parent_id, code);
CREATE INDEX IF NOT EXISTS idx_vinted_brands_title ON vinted_brands(title);
CREATE INDEX IF NOT EXISTS idx_vinted_colors_hex ON vinted_colors(hex_code);
CREATE INDEX IF NOT EXISTS idx_vinted_sizes_catalog_id ON vinted_sizes(catalog_id);
CREATE INDEX IF NOT EXISTS idx_vinted_sizes_catalog_title ON vinted_sizes(catalog_id, title);
CREATE INDEX IF NOT EXISTS idx_vinted_synonyms_entity_type ON vinted_synonyms(entity_type);
CREATE INDEX IF NOT EXISTS idx_vinted_synonyms_synonym ON vinted_synonyms(synonym);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_type ON metadata_cache(metadata_type);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_expires ON metadata_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_query_history_user_id ON user_query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_query_history_query ON user_query_history(query);
CREATE INDEX IF NOT EXISTS idx_user_sync_settings_user_id ON user_sync_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);