CREATE TABLE `historical_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`date` text NOT NULL,
	`price` real NOT NULL,
	`sales_volume` integer NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
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
	`updated_at` text,
	`expires_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_market_analyses_user_created` ON `market_analyses` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_status` ON `market_analyses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_user_status` ON `market_analyses` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_product_name` ON `market_analyses` (`product_name`);--> statement-breakpoint
CREATE INDEX `idx_market_analyses_expires_at` ON `market_analyses` (`expires_at`);--> statement-breakpoint
CREATE TABLE `similar_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`query_hash` text NOT NULL,
	`raw_data` text NOT NULL,
	`parsed_data` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_similar_sales_query_hash` ON `similar_sales` (`query_hash`);--> statement-breakpoint
CREATE INDEX `idx_similar_sales_expires_at` ON `similar_sales` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action_type` text NOT NULL,
	`action_data` text NOT NULL,
	`timestamp` text NOT NULL,
	`context` text,
	`created_at` text NOT NULL
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
	`updated_at` text NOT NULL
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
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_user_query_history_user_created` ON `user_query_history` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`email` text,
	`bio` text,
	`avatar` text,
	`language` text,
	`theme` text,
	`ai_config` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `vinted_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_cookie` text,
	`session_expires_at` text,
	`status` text DEFAULT 'requires_configuration' NOT NULL,
	`last_validated_at` text,
	`last_refreshed_at` text,
	`refresh_error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vinted_sessions_user_id` ON `vinted_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_vinted_sessions_status` ON `vinted_sessions` (`status`);