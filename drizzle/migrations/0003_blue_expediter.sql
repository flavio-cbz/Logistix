CREATE INDEX `order_user_status_idx` ON `orders` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `product_user_status_idx` ON `products` (`user_id`,`status`);