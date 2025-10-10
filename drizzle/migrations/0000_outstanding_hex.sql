CREATE TABLE `app_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_app_secrets_name` ON `app_secrets` (`name`);--> statement-breakpoint
CREATE TABLE `historical_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`date` text NOT NULL,
	`price` real NOT NULL,
	`sales_volume` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_historical_prices_product_date` ON `historical_prices` (`product_name`,`date`);--> statement-breakpoint
CREATE INDEX `idx_historical_prices_date` ON `historical_prices` (`date`);--> statement-breakpoint
CREATE TABLE `market_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_name` text NOT NULL,
	`catalog_id` integer,
	`category_name` text,
	`brand_id` integer,
	`status` text NOT NULL,
	`input` text,
	`result` text,
	`raw_data` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_market_analyses_user_created` ON `market_analyses` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_status` ON `market_analyses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_user_status` ON `market_analyses` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_product_name` ON `market_analyses` (`product_name`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_expires_at` ON `market_analyses` (`expires_at`);--> statement-breakpoint
CREATE TABLE `market_trends` (
	`id` text PRIMARY KEY NOT NULL,
	`tracked_product_id` text NOT NULL,
	`analysis_id` text,
	`snapshot_date` text NOT NULL,
	`avg_price` real,
	`sales_volume` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tracked_product_id`) REFERENCES `tracked_products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analysis_id`) REFERENCES `market_analyses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_market_trends_tracked_product` ON `market_trends` (`tracked_product_id`);--> statement-breakpoint
CREATE INDEX `idx_market_trends_snapshot_date` ON `market_trends` (`snapshot_date`);--> statement-breakpoint
CREATE TABLE `parcelles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`numero` text NOT NULL,
	`transporteur` text NOT NULL,
	`prix_achat` real,
	`poids` real,
	`prix_total` real,
	`prix_par_gramme` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `parcelle_user_idx` ON `parcelles` (`user_id`);--> statement-breakpoint
CREATE INDEX `parcelle_numero_idx` ON `parcelles` (`numero`);--> statement-breakpoint
CREATE INDEX `parcelle_transporteur_idx` ON `parcelles` (`transporteur`);--> statement-breakpoint
CREATE INDEX `parcelle_created_at_idx` ON `parcelles` (`created_at`);--> statement-breakpoint
CREATE TABLE `products` (
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
	`material` text,
	`condition` text DEFAULT 'bon' NOT NULL,
	`poids` real DEFAULT 0 NOT NULL,
	`price` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`cout_livraison` real,
	`selling_price` real,
	`prix_vente` real,
	`plateforme` text,
	`vinted_item_id` text,
	`external_id` text,
	`url` text,
	`photo_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`vendu` text DEFAULT '0' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`date_mise_en_ligne` text,
	`listed_at` text,
	`date_vente` text,
	`sold_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parcelle_id`) REFERENCES `parcelles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_user_idx` ON `products` (`user_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `product_vendu_idx` ON `products` (`vendu`);--> statement-breakpoint
CREATE INDEX `product_parcelle_idx` ON `products` (`parcelle_id`);--> statement-breakpoint
CREATE INDEX `product_price_idx` ON `products` (`price`);--> statement-breakpoint
CREATE INDEX `product_created_at_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `product_updated_at_idx` ON `products` (`updated_at`);--> statement-breakpoint
CREATE INDEX `product_vinted_item_id_idx` ON `products` (`vinted_item_id`);--> statement-breakpoint
CREATE INDEX `product_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `product_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `product_condition_idx` ON `products` (`condition`);--> statement-breakpoint
CREATE TABLE `similar_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`query_hash` text NOT NULL,
	`raw_data` text,
	`parsed_data` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_similar_sales_query_hash` ON `similar_sales` (`query_hash`);--> statement-breakpoint
CREATE INDEX `idx_similar_sales_expires_at` ON `similar_sales` (`expires_at`);--> statement-breakpoint
CREATE TABLE `tracked_products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_name` text NOT NULL,
	`external_product_id` text,
	`last_checked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tracked_products_user_id` ON `tracked_products` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_actions` (
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
CREATE INDEX `idx_user_actions_user_timestamp` ON `user_actions` (`user_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_user_actions_action_type` ON `user_actions` (`action_type`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`objectives` text NOT NULL,
	`risk_tolerance` text NOT NULL,
	`preferred_insight_types` text NOT NULL,
	`notification_settings` text NOT NULL,
	`custom_filters` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_preferences_user_id` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_query_history` (
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
CREATE INDEX `idx_user_query_history_user_created` ON `user_query_history` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`encryption_secret` text,
	`email` text,
	`bio` text,
	`avatar` text,
	`language` text,
	`theme` text,
	`ai_config` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `user_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `user_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_updated_at_idx` ON `users` (`updated_at`);--> statement-breakpoint
CREATE TABLE `vinted_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_cookie` text,
	`encrypted_dek` text,
	`encryption_metadata` text,
	`session_expires_at` text,
	`token_expires_at` text,
	`status` text DEFAULT 'requires_configuration' NOT NULL,
	`last_validated_at` text,
	`last_refreshed_at` text,
	`last_refresh_attempt_at` text,
	`refresh_attempt_count` integer,
	`refresh_error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vinted_sessions_user_id` ON `vinted_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_vinted_sessions_status` ON `vinted_sessions` (`status`);