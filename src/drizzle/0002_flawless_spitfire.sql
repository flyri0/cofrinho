ALTER TABLE `app_settings` ADD `currency_symbol_position` text DEFAULT 'before' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `decimal_separator` text DEFAULT ',' NOT NULL;