CREATE TABLE `categories_owned` (
  `id` integer PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `key` text NOT NULL,
  `color` text NOT NULL DEFAULT '#8A8578',
  `css_color` text NOT NULL DEFAULT 'var(--cat-diger)',
  `icon` text NOT NULL DEFAULT 'tag'
);
--> statement-breakpoint
-- Ownership was never recorded. Preserve each user's catalog and expense keys.
INSERT INTO `categories_owned` (`user_id`, `name`, `key`, `color`, `css_color`, `icon`)
SELECT u.id, c.name, c.key, c.color, c.css_color, c.icon
FROM `user` u CROSS JOIN `categories` c;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
ALTER TABLE `categories_owned` RENAME TO `categories`;
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_key_unique` ON `categories` (`user_id`, `key`);
