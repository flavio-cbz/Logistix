import {
  sqliteTable,
  text,
  real,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================================
// UNIFIED DATABASE SCHEMA
// ============================================================================
// This file consolidates all database schemas into a single source of truth
// Replaces: lib/db/schema.ts, lib/db/users.ts, lib/db/parcels.ts,
//          lib/services/database/drizzle-schema.ts

// ============================================================================
// CORE ENTITIES
// ============================================================================

// Users table - consolidated from lib/db/users.ts and drizzle-schema.ts
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"), // user | admin
    encryptionSecret: text("encryption_secret"),
    email: text("email"),
    bio: text("bio"),
    avatar: text("avatar"),
    language: text("language"),
    theme: text("theme"),
    aiConfig: text("ai_config", { mode: "json" }).$type<Record<string, unknown>>(),
    lastLoginAt: text("last_login_at"),
    preferences: text("preferences", { mode: "json" }).$type<{
      currency?: "EUR" | "USD" | "CNY";
      weightUnit?: "g" | "kg";
      dateFormat?: "DD/MM/YYYY" | "MM/DD/YYYY";
      autoExchangeRate?: boolean;
      animations?: boolean;
      targets?: {
        revenue?: number;
        productsSold?: number;
        margin?: number;
        conversionRate?: number;
      };
    }>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    usernameIdx: index("user_username_idx").on(table.username),
    createdAtIdx: index("user_created_at_idx").on(table.createdAt),
    updatedAtIdx: index("user_updated_at_idx").on(table.updatedAt),
  }),
);

// User Sessions table - for managing active sessions
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceName: text("device_name"),
    deviceType: text("device_type"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    lastActivityAt: text("last_activity_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => ({
    userIdx: index("user_sessions_user_idx").on(table.userId),
    expiresAtIdx: index("user_sessions_expires_at_idx").on(table.expiresAt),
    lastActivityIdx: index("user_sessions_last_activity_idx").on(table.lastActivityAt),
  }),
);

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
// Aliases for backward compatibility
export const sessions = userSessions;
export type Session = UserSession;
export type NewSession = NewUserSession;

// Parcelles table - consolidated from lib/db/parcels.ts and drizzle-schema.ts
export const parcelles = sqliteTable(
  "parcelles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    numero: text("numero").notNull(),
    numero_suivi: text("numero_suivi"), // Carrier tracking number (e.g., CJ140286057DE)
    transporteur: text("transporteur").notNull(),
    nom: text("nom").notNull().default(""),
    statut: text("statut").notNull().default("En attente"),
    actif: integer("actif").notNull().default(1),
    prixAchat: real("prix_achat"),
    poids: real("poids"),
    prixTotal: real("prix_total"),
    prixParGramme: real("prix_par_gramme"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userIdx: index("parcelle_user_idx").on(table.userId),
    numeroIdx: index("parcelle_numero_idx").on(table.numero),
    numeroSuiviIdx: index("parcelle_numero_suivi_idx").on(table.numero_suivi),
    transporteurIdx: index("parcelle_transporteur_idx").on(table.transporteur),
    createdAtIdx: index("parcelle_created_at_idx").on(table.createdAt),
  }),
);

// Products table - enhanced from lib/db/schema.ts
export const products = sqliteTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    parcelleId: text("parcelle_id").references(() => parcelles.id),

    // Basic information
    name: text("name").notNull(),
    description: text("description"), // Product description
    brand: text("brand"),
    category: text("category"),
    subcategory: text("subcategory"),

    // Physical properties
    size: text("size"),
    color: text("color"),
    poids: real("poids").notNull().default(0), // Weight in grams

    // Financial information
    price: real("price").notNull(), // Purchase price
    currency: text("currency").notNull().default("EUR"),
    coutLivraison: real("cout_livraison"), // Calculated automatically
    sellingPrice: real("selling_price"), // Actual selling price

    // Platform and external information
    plateforme: text("plateforme", {
      enum: ["leboncoin", "autre"],
    }),
    externalId: text("external_id"), // Generic external ID
    url: text("url"),
    photoUrl: text("photo_url"),

    // Status and lifecycle
    status: text("status", {
      enum: ["draft", "available", "reserved", "sold", "removed", "archived"],
    })
      .notNull()
      .default("draft"),
    vendu: text("vendu", { enum: ["0", "1"] })
      .notNull()
      .default("0"), // Legacy compatibility

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
    listedAt: text("listed_at"),
    soldAt: text("sold_at"),
  },
  (table) => ({
    userIdx: index("product_user_idx").on(table.userId),
    statusIdx: index("product_status_idx").on(table.status),
    venduIdx: index("product_vendu_idx").on(table.vendu),
    parcelleIdx: index("product_parcelle_idx").on(table.parcelleId),
    priceIdx: index("product_price_idx").on(table.price),
    createdAtIdx: index("product_created_at_idx").on(table.createdAt),
    updatedAtIdx: index("product_updated_at_idx").on(table.updatedAt),
    brandIdx: index("product_brand_idx").on(table.brand),
    categoryIdx: index("product_category_idx").on(table.category),
  }),
);

// Orders table - New entity for Superbuy orders
export const orders = sqliteTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    orderNumber: text("order_number"), // Deprecated: use superbuyId
    superbuyId: text("superbuy_id").notNull(), // Superbuy Order No (e.g., DO24811014466)
    status: text("status").notNull().default("Pending"),
    platform: text("platform"), // e.g., Taobao, Weidian
    trackingNumber: text("tracking_number"), // Domestic tracking
    warehouse: text("warehouse"), // e.g., Guangdong Warehouse

    // Financials
    totalPrice: real("total_price"),
    currency: text("currency").default("CNY"),

    // Items
    items: text("items", { mode: "json" }).$type<any[]>(),

    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userIdx: index("order_user_idx").on(table.userId),
    superbuyIdIdx: index("order_superbuy_id_idx").on(table.superbuyId),
    statusIdx: index("order_status_idx").on(table.status),
    createdAtIdx: index("order_created_at_idx").on(table.createdAt),
  }),
);

// Parcels table - New entity for Superbuy parcels (replacing legacy parcelles eventually)
export const parcels = sqliteTable(
  "parcels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    superbuyId: text("superbuy_id").notNull(), // Superbuy Parcel No (e.g., PN...)
    trackingNumber: text("tracking_number"), // International tracking
    weight: real("weight"), // Weight in grams
    status: text("status").notNull().default("Pending"),
    carrier: text("carrier"), // e.g., E-EMS

    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userIdx: index("parcel_user_idx").on(table.userId),
    superbuyIdIdx: index("parcel_superbuy_id_idx").on(table.superbuyId),
    trackingNumberIdx: index("parcel_tracking_number_idx").on(table.trackingNumber),
    statusIdx: index("parcel_status_idx").on(table.status),
    createdAtIdx: index("parcel_created_at_idx").on(table.createdAt),
  }),
);

// ============================================================================
// MARKET ANALYSIS AND TRACKING - REMOVED AS PART OF FEATURE REMOVAL
// ============================================================================

// ============================================================================
// USER MANAGEMENT AND PREFERENCES
// ============================================================================

// User query history table - from drizzle-schema.ts
export const userQueryHistory = sqliteTable(
  "user_query_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    query: text("query").notNull(),
    parsedBrandId: text("parsed_brand_id"),
    parsedCatalogId: text("parsed_catalog_id"),
    parsedColorId: text("parsed_color_id"),
    parsedSizeId: text("parsed_size_id"),
    parsedMaterialId: text("parsed_material_id"),
    parsedStatusId: text("parsed_status_id"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    userCreatedIdx: index("idx_user_query_history_user_created").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// User preferences table - from drizzle-schema.ts
export const userPreferences = sqliteTable(
  "user_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    objectives: text("objectives", { mode: "json" }).notNull().$type<string[]>(),
    riskTolerance: text("risk_tolerance", {
      enum: ["conservative", "moderate", "aggressive"],
    })
      .notNull()
      .$type<"conservative" | "moderate" | "aggressive">(),
    preferredInsightTypes: text("preferred_insight_types", { mode: "json" })
      .notNull()
      .$type<string[]>(),
    customFilters: text("custom_filters", { mode: "json" })
      .notNull()
      .$type<Record<string, unknown>>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userIdx: uniqueIndex("idx_user_preferences_user_id").on(table.userId),
  }),
);

// User actions table - from drizzle-schema.ts
export const userActions = sqliteTable(
  "user_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    actionType: text("action_type", {
      enum: [
        "view_insight",
        "follow_recommendation",
        "ignore_recommendation",
        "export_analysis",
        "save_analysis",
        "share_analysis",
        "feedback",
      ],
    })
      .notNull()
      .$type<
        | "view_insight"
        | "follow_recommendation"
        | "ignore_recommendation"
        | "export_analysis"
        | "save_analysis"
        | "share_analysis"
        | "feedback"
      >(),
    actionData: text("action_data", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    timestamp: text("timestamp").notNull(),
    context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    userTimestampIdx: index("idx_user_actions_user_timestamp").on(
      table.userId,
      table.timestamp,
    ),
    actionTypeIdx: index("idx_user_actions_action_type").on(table.actionType),
  }),
);

// ============================================================================
// SECURITY AND SESSION MANAGEMENT
// ============================================================================

// Application secrets table - from drizzle-schema.ts
export const appSecrets = sqliteTable(
  "app_secrets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    value: text("value").notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
    revokedAt: text("revoked_at"),
  },
  (table) => ({
    nameIdx: index("idx_app_secrets_name").on(table.name),
  }),
);

// Dashboard configuration table
export const dashboardConfig = sqliteTable(
  "dashboard_config",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    config: text("config", { mode: "json" }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userIdx: uniqueIndex("idx_dashboard_config_user_id").on(table.userId),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core entity types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Parcelle = typeof parcelles.$inferSelect;
export type NewParcelle = typeof parcelles.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// Market analysis types - REMOVED AS PART OF FEATURE REMOVAL

// User management types
export type UserQueryHistory = typeof userQueryHistory.$inferSelect;
export type NewUserQueryHistory = typeof userQueryHistory.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type UserAction = typeof userActions.$inferSelect;
export type NewUserAction = typeof userActions.$inferInsert;

// Security types
export type AppSecret = typeof appSecrets.$inferSelect;
export type NewAppSecret = typeof appSecrets.$inferInsert;

export type DashboardConfig = typeof dashboardConfig.$inferSelect;
export type NewDashboardConfig = typeof dashboardConfig.$inferInsert;

// Enum types for better type safety
export type ProductStatus =
  | "draft"
  | "available"
  | "reserved"
  | "sold"
  | "removed"
  | "archived"
  | "online";
export type Platform = "leboncoin" | "autre";
// MarketAnalysisStatus enum removed as part of feature removal
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type UserActionType =
  | "view_insight"
  | "follow_recommendation"
  | "ignore_recommendation"
  | "export_analysis"
  | "save_analysis"
  | "share_analysis"
  | "feedback";

// ============================================================================
// SUPERBUY SYNCHRONIZATION
// ============================================================================

/**
 * Superbuy Sync table - tracks synchronization between Superbuy and LogistiX
 * Allows deduplication, audit trail, and rollback capabilities
 */
export const superbuySync = sqliteTable(
  "superbuy_sync",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    superbuyId: text("superbuy_id").notNull(), // packageOrderNo, itemBarcode, etc.
    logistixId: text("logistix_id").notNull(), // parcelle.id or product.id
    entityType: text("entity_type", { enum: ["parcel", "product"] }).notNull(),
    lastSyncedAt: text("last_synced_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    superbuyData: text("superbuy_data", { mode: "json" }).$type<Record<string, unknown>>(), // Raw Superbuy payload
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    userSuperbuyEntityIdx: uniqueIndex("superbuy_sync_user_superbuy_entity_idx")
      .on(table.userId, table.superbuyId, table.entityType),
    userIdx: index("superbuy_sync_user_idx").on(table.userId),
    entityTypeIdx: index("superbuy_sync_entity_type_idx").on(table.entityType),
    logistixIdx: index("superbuy_sync_logistix_idx").on(table.logistixId),
  }),
);

// Integration Credentials table - for storing external service tokens/cookies
export const integrationCredentials = sqliteTable(
  "integration_credentials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // e.g., 'superbuy'
    credentials: text("credentials", { mode: "json" }).$type<Record<string, any>>(),
    cookies: text("cookies", { mode: "json" }).$type<any[]>(),
    lastUsedAt: text("last_used_at"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("integration_credentials_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  }),
);

// Legacy compatibility exports (for backward compatibility during migration)
// export const parcels = parcelles; // REMOVED: parcels is now a separate table
// export type Parcel = Parcelle; // REMOVED: Parcel now refers to the new table type
// export type NewParcel = NewParcelle; // REMOVED

export type SuperbuyParcel = typeof parcels.$inferSelect;
export type NewSuperbuyParcel = typeof parcels.$inferInsert;
