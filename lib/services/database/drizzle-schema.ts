// Schéma Drizzle ORM pour les principales tables métier et historiques

import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// Définition des types pour les champs JSON et ENUM
type MarketAnalysisStatus = "pending" | "completed" | "failed";
type RiskTolerance = "conservative" | "moderate" | "aggressive";
type UserActionType =
  | "view_insight"
  | "follow_recommendation"
  | "ignore_recommendation"
  | "export_analysis"
  | "save_analysis"
  | "share_analysis"
  | "feedback"; // Ajout de "feedback"
type VintedSessionStatus =
  | "active"
  | "expired"
  | "error"
  | "requires_configuration";

// Table des utilisateurs
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  encryption_secret: text("encryption_secret"), // Secret unique pour dériver la KEK utilisateur
  email: text("email"),
  bio: text("bio"),
  avatar: text("avatar"),
  language: text("language"),
  theme: text("theme"),
  ai_config: text("ai_config", { mode: "json" }).$type<any>(),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
});
// Table des tâches d'analyse de marché (enhanced)
export const marketAnalyses = sqliteTable(
  "market_analyses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    productName: text("product_name").notNull(),
    catalogId: integer("catalog_id"),
    categoryName: text("category_name"), // Nom de la catégorie pour référence
    brandId: integer("brand_id"), // ID de la marque Vinted
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .$type<MarketAnalysisStatus>(),
    input: text("input", { mode: "json" }).$type<any>(),
    result: text("result", { mode: "json" }).$type<any>(),
    rawData: text("raw_data", { mode: "json" }).$type<any>(),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at"),
    expiresAt: text("expires_at"), // Pour la gestion du cache
  },
  (table) => ({
    // Composite index for user queries with pagination
    userCreatedIdx: index("idx_market_analyses_user_created").on(
      table.userId,
      table.createdAt,
    ),
    // Index for status filtering (polling queries)
    statusIdx: index("idx_market_analyses_status").on(table.status),
    // Composite index for user + status queries
    userStatusIdx: index("idx_market_analyses_user_status").on(
      table.userId,
      table.status,
    ),
    // Index for product-based queries
    productNameIdx: index("idx_market_analyses_product_name").on(
      table.productName,
    ),
    // Index for cache expiration cleanup
    expiresAtIdx: index("idx_market_analyses_expires_at").on(table.expiresAt),
  }),
);

// Table des historiques de prix
export const historicalPrices = sqliteTable(
  "historical_prices",
  {
    id: text("id").primaryKey(),
    productName: text("product_name").notNull(),
    date: text("date").notNull(),
    price: real("price").notNull(),
    salesVolume: integer("sales_volume").notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  },
  (table) => ({
    // Index for product-based queries
    productDateIdx: index("idx_historical_prices_product_date").on(
      table.productName,
      table.date,
    ),
    // Index for date range queries
    dateIdx: index("idx_historical_prices_date").on(table.date),
  }),
);

// Table des ventes similaires (cache)
export const similarSales = sqliteTable(
  "similar_sales",
  {
    id: text("id").primaryKey(),
    queryHash: text("query_hash").notNull(),
    rawData: text("raw_data", { mode: "json" }).$type<any>(),
    parsedData: text("parsed_data", { mode: "json" }).$type<any>(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  },
  (table) => ({
    // Index for cache lookups
    queryHashIdx: index("idx_similar_sales_query_hash").on(table.queryHash),
    // Index for cleanup operations
    expiresAtIdx: index("idx_similar_sales_expires_at").on(table.expiresAt),
  }),
);

// Table de l’historique des requêtes utilisateur
export const userQueryHistory = sqliteTable(
  "user_query_history",
  {
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
  },
  (table) => ({
    // Index for user query history
    userCreatedIdx: index("idx_user_query_history_user_created").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// Table pour la gestion des sessions Vinted (nouvelle version)
export const vintedSessions = sqliteTable(
  "vinted_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    // Cookie/token Vinted chiffré
    sessionCookie: text("session_cookie"),
    // Encrypted DEK (Data Encryption Key) pour envelope encryption
    encryptedDek: text("encrypted_dek"),
    // Metadata lié au chiffrement (provider, algo, etc.)
    encryptionMetadata: text("encryption_metadata").$type<any>(),

    // Données de session
    sessionExpiresAt: text("session_expires_at"),
    tokenExpiresAt: text("token_expires_at"),

    // Métadonnées de gestion
    status: text("status", {
      enum: ["active", "expired", "error", "requires_configuration"],
    })
      .notNull()
      .default("requires_configuration")
      .$type<VintedSessionStatus>(),
    lastValidatedAt: text("last_validated_at"),
    lastRefreshedAt: text("last_refreshed_at"),
    lastRefreshAttemptAt: text("last_refresh_attempt_at"),
    refreshAttemptCount: integer("refresh_attempt_attempt_count"),
    refreshErrorMessage: text("refresh_error_message"),

    // Timestamps
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex("idx_vinted_sessions_user_id").on(table.userId),
    statusIdx: index("idx_vinted_sessions_status").on(table.status),
  }),
);

// Table des préférences utilisateur pour l'IA
export const userPreferences = sqliteTable(
  "user_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    objectives: text("objectives", { mode: "json" }).notNull().$type<any>(),
    riskTolerance: text("risk_tolerance", {
      enum: ["conservative", "moderate", "aggressive"],
    })
      .notNull()
      .$type<RiskTolerance>(),
    preferredInsightTypes: text("preferred_insight_types", { mode: "json" })
      .notNull()
      .$type<any>(),
    notificationSettings: text("notification_settings", { mode: "json" })
      .notNull()
      .$type<any>(),
    customFilters: text("custom_filters", { mode: "json" })
      .notNull()
      .$type<any>(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex("idx_user_preferences_user_id").on(table.userId),
  }),
);

// Table des actions utilisateur pour l'apprentissage IA
export const userActions = sqliteTable(
  "user_actions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    actionType: text("action_type", {
      enum: [
        "view_insight",
        "follow_recommendation",
        "ignore_recommendation",
        "export_analysis",
        "save_analysis",
        "share_analysis",
        "feedback",
      ], // Ajout de "feedback"
    })
      .notNull()
      .$type<UserActionType>(),
    actionData: text("action_data", { mode: "json" }).notNull().$type<any>(),
    timestamp: text("timestamp").notNull(),
    context: text("context", { mode: "json" }).$type<any>(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userTimestampIdx: index("idx_user_actions_user_timestamp").on(
      table.userId,
      table.timestamp,
    ),
    actionTypeIdx: index("idx_user_actions_action_type").on(table.actionType),
  }),
);

// Table des produits suivis (produits que les utilisateurs surveillent)
export const trackedProducts = sqliteTable(
  "tracked_products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    productName: text("product_name").notNull(),
    externalProductId: text("external_product_id"),
    lastCheckedAt: text("last_checked_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at"),
  },
  (table) => ({
    userIdx: index("idx_tracked_products_user_id").on(table.userId),
  }),
);

// Table des snapshots de tendances de marché
export const marketTrends = sqliteTable(
  "market_trends",
  {
    id: text("id").primaryKey(),
    trackedProductId: text("tracked_product_id").notNull(),
    analysisId: text("analysis_id"),
    snapshotDate: text("snapshot_date").notNull(),
    avgPrice: real("avg_price"),
    salesVolume: integer("sales_volume"),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  },
  (table) => ({
    trackedProductIdx: index("idx_market_trends_tracked_product").on(
      table.trackedProductId,
    ),
    snapshotDateIdx: index("idx_market_trends_snapshot_date").on(
      table.snapshotDate,
    ),
  }),
);

// Table de gestion des clés d'application (KEK)
export const appSecrets = sqliteTable(
  "app_secrets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    value: text("value").notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    updatedAt: text("updated_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => ({
    nameIdx: index("idx_app_secrets_name").on(table.name),
  }),
);

// Table des parcelles
export const parcelles = sqliteTable("parcelles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  numero: text("numero").notNull(),
  transporteur: text("transporteur").notNull(),
  prixAchat: real("prixAchat"),
  poids: real("poids"),
  prixTotal: real("prixTotal"),
  prixParGramme: real("prixParGramme"),
  nom: text("nom").notNull(),
  statut: text("statut").notNull(),
  actif: integer("actif", { mode: "boolean" }).notNull().default(true),
  created_at: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updated_at: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});
