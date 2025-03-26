import { pgTable, serial, text, varchar, timestamp, boolean, numeric } from "drizzle-orm/pg-core"

// Table Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  language: varchar("language", { length: 10 }).default("fr"),
  theme: varchar("theme", { length: 10 }).default("system"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Table Parcelles
export const parcelles = pgTable("parcelles", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 255 }).notNull(),
  transporteur: varchar("transporteur", { length: 255 }).notNull(),
  poids: numeric("poids").notNull(),
  prixTotalUSD: numeric("prix_total_usd").notNull(),
  prixTotalEUR: numeric("prix_total_eur").notNull(),
  prixParGramme: numeric("prix_par_gramme").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Table Produits
export const produits = pgTable("produits", {
  id: serial("id").primaryKey(),
  commandeId: varchar("commande_id", { length: 255 }).notNull(),
  nom: varchar("nom", { length: 255 }).notNull(),
  details: text("details"),
  prixArticle: numeric("prix_article").notNull(),
  prixArticleTTC: numeric("prix_article_ttc").notNull(),
  poids: numeric("poids").notNull(),
  prixLivraison: numeric("prix_livraison").notNull(),
  vendu: boolean("vendu").default(false),
  dateVente: timestamp("date_vente"),
  tempsEnLigne: varchar("temps_en_ligne", { length: 255 }),
  prixVente: numeric("prix_vente"),
  plateforme: varchar("plateforme", { length: 255 }),
  parcelleId: serial("parcelle_id").references(() => parcelles.id),
  benefices: numeric("benefices"),
  pourcentageBenefice: numeric("pourcentage_benefice"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Table Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  defaultCurrency: varchar("default_currency", { length: 10 }).default("EUR"),
  exchangeRateAPI: text("exchange_rate_api"),
  enableNotifications: boolean("enable_notifications").default(true),
  autoUpdatePrices: boolean("auto_update_prices").default(false),
  defaultTVA: numeric("default_tva").default("20"),
  defaultShippingCost: numeric("default_shipping_cost").default("9.99"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Table Dashboard Config
export const dashboardConfig = pgTable("dashboard_config", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  config: text("config").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

