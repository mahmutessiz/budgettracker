ALTER TABLE `categories` ADD `icon` text NOT NULL DEFAULT 'tag';
--> statement-breakpoint
UPDATE `categories` SET `icon` = CASE `key` WHEN 'kira' THEN 'home' WHEN 'market' THEN 'cart' WHEN 'fatura' THEN 'receipt' WHEN 'ulasim' THEN 'car' WHEN 'eglence' THEN 'music' WHEN 'saglik' THEN 'heart' ELSE 'tag' END;
