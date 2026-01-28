CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0,
	`result` text,
	`error` text,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_user_idx` ON `jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `job_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `job_created_at_idx` ON `jobs` (`created_at`);--> statement-breakpoint
ALTER TABLE `products` ADD `photo_urls` text;