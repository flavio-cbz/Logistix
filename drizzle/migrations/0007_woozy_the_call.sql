ALTER TABLE `parcelles` ADD `nom` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `parcelles` ADD `statut` text DEFAULT 'En attente' NOT NULL;--> statement-breakpoint
ALTER TABLE `parcelles` ADD `actif` integer DEFAULT 1 NOT NULL;