-- ============================================================================
-- LOGISTIX DATABASE SCHEMA - Consolidated Migration
-- ============================================================================
-- This single migration file contains the complete database schema.
-- Generated: 2025-12-06
-- ============================================================================

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`encryption_secret` text,
	`email` text,
	`bio` text,
	`avatar` text,
	`language` text,
	`theme` text,
	`ai_config` text,
	`last_login_at` text,
	`preferences` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_updated_at_idx` ON `users` (`updated_at`);--> statement-breakpoint

-- ============================================================================
-- SESSION MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text,
	`device_type` text,
	`ip_address` text,
	`user_agent` text,
	`last_activity_at` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_sessions_user_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_sessions_expires_at_idx` ON `user_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_sessions_last_activity_idx` ON `user_sessions` (`last_activity_at`);--> statement-breakpoint

-- ============================================================================
-- APPLICATION SECRETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `app_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_app_secrets_name` ON `app_secrets` (`name`);--> statement-breakpoint

-- ============================================================================
-- INTEGRATION CREDENTIALS (Superbuy, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `integration_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`credentials` text,
	`cookies` text,
	`last_used_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `integration_credentials_user_provider_idx` ON `integration_credentials` (`user_id`,`provider`);--> statement-breakpoint

-- ============================================================================
-- ORDERS (Superbuy Orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`order_number` text,
	`superbuy_id` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`platform` text,
	`tracking_number` text,
	`warehouse` text,
	`total_price` real,
	`currency` text DEFAULT 'CNY',
	`items` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_superbuy_id_idx` ON `orders` (`superbuy_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint

-- ============================================================================
-- PARCELLES (Legacy Parcels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `parcelles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`numero` text NOT NULL,
	`numero_suivi` text,
	`transporteur` text NOT NULL,
	`nom` text DEFAULT '' NOT NULL,
	`statut` text DEFAULT 'En attente' NOT NULL,
	`actif` integer DEFAULT 1 NOT NULL,
	`prix_achat` real,
	`poids` real,
	`prix_total` real,
	`prix_par_gramme` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcelle_user_idx` ON `parcelles` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcelle_numero_idx` ON `parcelles` (`numero`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcelle_numero_suivi_idx` ON `parcelles` (`numero_suivi`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcelle_transporteur_idx` ON `parcelles` (`transporteur`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcelle_created_at_idx` ON `parcelles` (`created_at`);--> statement-breakpoint

-- ============================================================================
-- PARCELS (Superbuy Parcels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `parcels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`superbuy_id` text NOT NULL,
	`tracking_number` text,
	`weight` real,
	`status` text DEFAULT 'Pending' NOT NULL,
	`carrier` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcel_user_idx` ON `parcels` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcel_superbuy_id_idx` ON `parcels` (`superbuy_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcel_tracking_number_idx` ON `parcels` (`tracking_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcel_status_idx` ON `parcels` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parcel_created_at_idx` ON `parcels` (`created_at`);--> statement-breakpoint

-- ============================================================================
-- PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`parcelle_id` text,
	`name` text NOT NULL,
	`description` text,
	`brand` text,
	`category` text,
	`subcategory` text,
	`size` text,
	`color` text,
	`poids` real DEFAULT 0 NOT NULL,
	`price` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`cout_livraison` real,
	`selling_price` real,
	`plateforme` text,
	`external_id` text,
	`url` text,
	`photo_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`vendu` text DEFAULT '0' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`listed_at` text,
	`sold_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parcelle_id`) REFERENCES `parcelles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_user_idx` ON `products` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_vendu_idx` ON `products` (`vendu`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_parcelle_idx` ON `products` (`parcelle_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_price_idx` ON `products` (`price`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_created_at_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_updated_at_idx` ON `products` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_category_idx` ON `products` (`category`);--> statement-breakpoint

-- ============================================================================
-- SUPERBUY SYNC (Mapping between Superbuy and LogistiX entities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `superbuy_sync` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`superbuy_id` text NOT NULL,
	`logistix_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`last_synced_at` text NOT NULL,
	`superbuy_data` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `superbuy_sync_user_superbuy_entity_idx` ON `superbuy_sync` (`user_id`,`superbuy_id`,`entity_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `superbuy_sync_user_idx` ON `superbuy_sync` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `superbuy_sync_entity_type_idx` ON `superbuy_sync` (`entity_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `superbuy_sync_logistix_idx` ON `superbuy_sync` (`logistix_id`);--> statement-breakpoint

-- ============================================================================
-- USER ACTIONS (Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `user_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action_type` text NOT NULL,
	`action_data` text NOT NULL,
	`timestamp` text NOT NULL,
	`context` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_actions_user_timestamp` ON `user_actions` (`user_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_actions_action_type` ON `user_actions` (`action_type`);--> statement-breakpoint

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`objectives` text NOT NULL,
	`risk_tolerance` text NOT NULL,
	`preferred_insight_types` text NOT NULL,
	`custom_filters` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_user_preferences_user_id` ON `user_preferences` (`user_id`);--> statement-breakpoint

-- ============================================================================
-- USER QUERY HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS `user_query_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`query` text NOT NULL,
	`parsed_brand_id` text,
	`parsed_catalog_id` text,
	`parsed_color_id` text,
	`parsed_size_id` text,
	`parsed_material_id` text,
	`parsed_status_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_query_history_user_created` ON `user_query_history` (`user_id`,`created_at`);
