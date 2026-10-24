ALTER TABLE `expense` ADD `amount_usd` integer;--> statement-breakpoint
ALTER TABLE `expense` ADD `amount_eur` integer;--> statement-breakpoint
ALTER TABLE `expense` ADD `amount_gbp` integer;--> statement-breakpoint
ALTER TABLE `expense` ADD `fx_date` text;--> statement-breakpoint
ALTER TABLE `expense` ADD `fx_rates` text;--> statement-breakpoint
CREATE INDEX `expense_fx_date_idx` ON `expense` (`fx_date`);