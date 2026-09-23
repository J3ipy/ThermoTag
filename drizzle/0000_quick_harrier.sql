CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`stage` text NOT NULL,
	`place` text NOT NULL,
	`actor` text NOT NULL,
	`status` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`location_source` text NOT NULL,
	`recorded_at` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checkins_shipment_time` ON `checkins` (`shipment_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`tag_id` text NOT NULL,
	`product` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`threshold` real NOT NULL,
	`created_at` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipments_tag_id_unique` ON `shipments` (`tag_id`);