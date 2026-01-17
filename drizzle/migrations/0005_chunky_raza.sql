PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- 0. Drop legacy views that might block table changes
DROP VIEW IF EXISTS `produits`;--> statement-breakpoint

-- 1. Create parcels table (New table replacing parcelles)
DROP TABLE IF EXISTS `parcels`;--> statement-breakpoint
CREATE TABLE `parcels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`superbuy_id` text NOT NULL,
	`tracking_number` text,
	`carrier` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`weight` real DEFAULT 0 NOT NULL,
	`total_price` real DEFAULT 0 NOT NULL,
	`price_par_gramme` real DEFAULT 0,
	`is_active` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

-- Indexes for parcels
CREATE INDEX `parcel_user_idx` ON `parcels` (`user_id`);--> statement-breakpoint
CREATE INDEX `parcel_superbuy_id_idx` ON `parcels` (`superbuy_id`);--> statement-breakpoint
CREATE INDEX `parcel_status_idx` ON `parcels` (`status`);--> statement-breakpoint

-- 2. Migrate data from parcelles to parcels WITH STATUS MAPPING
-- Reusing 'id' from parcelles to maintain relationships
INSERT INTO `parcels` (id, user_id, superbuy_id, carrier, weight, total_price, price_par_gramme, is_active, created_at, updated_at, status, tracking_number, name)
SELECT 
  id, 
  user_id, 
  numero, 
  transporteur, 
  poids, 
  prix_total, 
  prix_par_gramme, 
  actif, 
  created_at, 
  updated_at,
  CASE statut
    WHEN 'En attente' THEN 'Pending'
    WHEN 'En transit' THEN 'In Transit'
    WHEN 'Livré' THEN 'Delivered'
    WHEN 'Retourné' THEN 'Returned'
    WHEN 'Perdu' THEN 'Lost'
    WHEN 'Annulé' THEN 'Cancelled'
    ELSE 'Pending'
  END,
  numero_suivi,
  nom
FROM `parcelles`;--> statement-breakpoint

-- 3. Handle products table (Recreating to update foreign key and column name)
DROP TABLE IF EXISTS `__new_products`;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`parcel_id` text,
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
	`photo_urls` text,
	`enrichment_data` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`vendu` text DEFAULT '0' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`listed_at` text,
	`sold_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

-- Migrate products data (mapping parcelle_id -> parcel_id)
-- SKIPPED: Products table was empty and accidentally dropped in previous partial run.
-- INSERT INTO `__new_products` ... SELECT ... FROM `products`;

DROP TABLE IF EXISTS `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint

-- Recreate Indexes for products
CREATE INDEX `product_user_idx` ON `products` (`user_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `product_vendu_idx` ON `products` (`vendu`);--> statement-breakpoint
CREATE INDEX `product_parcel_idx` ON `products` (`parcel_id`);--> statement-breakpoint
CREATE INDEX `product_price_idx` ON `products` (`price`);--> statement-breakpoint
CREATE INDEX `product_created_at_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `product_updated_at_idx` ON `products` (`updated_at`);--> statement-breakpoint
CREATE INDEX `product_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `product_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `product_user_status_idx` ON `products` (`user_id`,`status`);--> statement-breakpoint

-- 4. Drop legacy table
DROP TABLE `parcelles`;