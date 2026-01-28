CREATE TABLE `dashboard_config` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_dashboard_config_user_id` ON `dashboard_config` (`user_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `enrichment_data` text;