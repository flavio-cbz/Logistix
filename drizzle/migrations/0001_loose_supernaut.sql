CREATE TABLE `app_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_app_secrets_name` ON `app_secrets` (`name`);--> statement-breakpoint
CREATE TABLE `market_trends` (
	`id` text PRIMARY KEY NOT NULL,
	`tracked_product_id` text NOT NULL,
	`analysis_id` text,
	`snapshot_date` text NOT NULL,
	`avg_price` real,
	`sales_volume` integer,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_market_trends_tracked_product` ON `market_trends` (`tracked_product_id`);--> statement-breakpoint
CREATE INDEX `idx_market_trends_snapshot_date` ON `market_trends` (`snapshot_date`);--> statement-breakpoint
CREATE TABLE `tracked_products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_name` text NOT NULL,
	`external_product_id` text,
	`last_checked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_tracked_products_user_id` ON `tracked_products` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `encryption_secret` text;--> statement-breakpoint
ALTER TABLE `vinted_sessions` ADD `encrypted_dek` text;--> statement-breakpoint
ALTER TABLE `vinted_sessions` ADD `encryption_metadata` text;--> statement-breakpoint
ALTER TABLE `vinted_sessions` ADD `token_expires_at` text;--> statement-breakpoint
ALTER TABLE `vinted_sessions` ADD `last_refresh_attempt_at` text;--> statement-breakpoint
ALTER TABLE `vinted_sessions` ADD `refresh_attempt_count` integer;