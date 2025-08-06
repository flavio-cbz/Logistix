// Schéma Drizzle ORM pour les principales tables métier et historiques

import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Table des tâches d'analyse de marché (enhanced)
export const marketAnalyses = sqliteTable("market_analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productName: text("product_name").notNull(),
  catalogId: integer("catalog_id"),
  categoryName: text("category_name"), // Nom de la catégorie pour référence
  brandId: integer("brand_id"), // ID de la marque Vinted
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
  input: text("input", { mode: 'json' }), // Données d'entrée de la requête
  result: text("result", { mode: 'json' }), // Résultats calculés (VintedAnalysisResult)
  rawData: text("raw_data", { mode: 'json' }), // Données brutes des articles vendus (optionnel)
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
  expiresAt: text("expires_at"), // Pour la gestion du cache
}, (table) => ({
  // Composite index for user queries with pagination
  userCreatedIdx: index("idx_market_analyses_user_created").on(table.userId, table.createdAt),
  // Index for status filtering (polling queries)
  statusIdx: index("idx_market_analyses_status").on(table.status),
  // Composite index for user + status queries
  userStatusIdx: index("idx_market_analyses_user_status").on(table.userId, table.status),
  // Index for product-based queries
  productNameIdx: index("idx_market_analyses_product_name").on(table.productName),
  // Index for cache expiration cleanup
  expiresAtIdx: index("idx_market_analyses_expires_at").on(table.expiresAt),
}));

// Table des historiques de prix
export const historicalPrices = sqliteTable("historical_prices", {
  id: text("id").primaryKey(),
  productName: text("product_name").notNull(),
  date: text("date").notNull(),
  price: real("price").notNull(),
  salesVolume: integer("sales_volume").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
}, (table) => ({
  // Index for product-based queries
  productDateIdx: index("idx_historical_prices_product_date").on(table.productName, table.date),
  // Index for date range queries
  dateIdx: index("idx_historical_prices_date").on(table.date),
}));

// Table des ventes similaires (cache)
export const similarSales = sqliteTable("similar_sales", {
  id: text("id").primaryKey(),
  queryHash: text("query_hash").notNull(),
  rawData: text("raw_data").notNull(),
  parsedData: text("parsed_data").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
}, (table) => ({
  // Index for cache lookups
  queryHashIdx: index("idx_similar_sales_query_hash").on(table.queryHash),
  // Index for cleanup operations
  expiresAtIdx: index("idx_similar_sales_expires_at").on(table.expiresAt),
}));

// Table de l’historique des requêtes utilisateur
export const userQueryHistory = sqliteTable("user_query_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  parsedBrandId: text("parsed_brand_id"),
  parsedCatalogId: text("parsed_catalog_id"),
  parsedColorId: text("parsed_color_id"),
  parsedSizeId: text("parsed_size_id"),
  parsedMaterialId: text("parsed_material_id"),
  parsedStatusId: text("parsed_status_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
}, (table) => ({
  // Index for user query history
  userCreatedIdx: index("idx_user_query_history_user_created").on(table.userId, table.createdAt),
}));

// Table pour la gestion des sessions Vinted (nouvelle version)
export const vintedSessions = sqliteTable("vinted_sessions", {
    id: text("id").primaryKey(), // UUID
    userId: text("user_id").notNull(), // Référence à l'utilisateur de l'application

    // Cookie/token Vinted chiffré
    sessionCookie: text("session_cookie"),

    // Données de session
    sessionExpiresAt: text("session_expires_at"), // TIMESTAMPTZ stocké en texte ISO 8601

    // Métadonnées de gestion
    status: text("status", { enum: ["active", "expired", "error", "requires_configuration"] }).notNull().default("requires_configuration"),
    lastValidatedAt: text("last_validated_at"), // TIMESTAMPTZ stocké en texte ISO 8601
    lastRefreshedAt: text("last_refreshed_at"), // TIMESTAMPTZ stocké en texte ISO 8601
    refreshErrorMessage: text("refresh_error_message"),

    // Timestamps
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
}, (table) => ({
    // Contrainte d'unicité pour garantir une seule session Vinted par utilisateur
    userIdx: uniqueIndex("idx_vinted_sessions_user_id").on(table.userId),
    // Index pour filtrer rapidement par statut (ex: pour les tâches cron)
    statusIdx: index("idx_vinted_sessions_status").on(table.status),
}));