CREATE TABLE IF NOT EXISTS `categories` (`id` integer PRIMARY KEY NOT NULL, `name` text NOT NULL);
--> statement-breakpoint
ALTER TABLE `categories` ADD `key` text;
--> statement-breakpoint
ALTER TABLE `categories` ADD `color` text NOT NULL DEFAULT '#8A8578';
--> statement-breakpoint
ALTER TABLE `categories` ADD `css_color` text NOT NULL DEFAULT 'var(--cat-diger)';
--> statement-breakpoint
UPDATE `categories` SET `key` = 'custom-' || `id`;
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('kira', 'Kira & Ev', '#2F4BFF', 'var(--cat-kira)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('market', 'Market', '#E8590C', 'var(--cat-market)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('fatura', 'Faturalar', '#8B3FD9', 'var(--cat-fatura)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('ulasim', 'Ulaşım', '#0A8754', 'var(--cat-ulasim)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('eglence', 'Eğlence', '#C98F00', 'var(--cat-eglence)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('saglik', 'Sağlık', '#D13B83', 'var(--cat-saglik)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`, `color`, `css_color`) VALUES ('diger', 'Diğer', '#8A8578', 'var(--cat-diger)');
--> statement-breakpoint
INSERT INTO `categories` (`key`, `name`) SELECT DISTINCT `category`, `category` FROM `expense` WHERE `category` NOT IN (SELECT `key` FROM `categories`);
--> statement-breakpoint
CREATE TABLE `categories_new` (`id` integer PRIMARY KEY NOT NULL, `name` text NOT NULL, `key` text NOT NULL, `color` text NOT NULL DEFAULT '#8A8578', `css_color` text NOT NULL DEFAULT 'var(--cat-diger)');
--> statement-breakpoint
INSERT INTO `categories_new` SELECT `id`, `name`, `key`, `color`, `css_color` FROM `categories`;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
ALTER TABLE `categories_new` RENAME TO `categories`;
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_key_unique` ON `categories` (`key`);
