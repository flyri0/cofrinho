CREATE TABLE `account_loan_details` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`interest_rate_annual` real NOT NULL,
	`monthly_payment` integer NOT NULL,
	`term_months` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category_kind` text NOT NULL,
	`is_budget_account` integer NOT NULL,
	`initial_balance` integer NOT NULL,
	`current_balance` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`theme_mode` text NOT NULL,
	`color_theme_id` text NOT NULL,
	`currency_symbol` text DEFAULT 'R$' NOT NULL,
	`first_day_of_month` integer DEFAULT 1 NOT NULL,
	`locale` text DEFAULT 'pt-BR' NOT NULL,
	`auto_backup_enabled` integer NOT NULL,
	`last_backup_at` integer,
	`drive_folder_mode` text NOT NULL,
	CONSTRAINT "app_settings_singleton" CHECK("app_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `backup_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`status` text NOT NULL,
	`trigger` text NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`is_system` integer DEFAULT false NOT NULL,
	`linked_account_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `category_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `category_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_month_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`month` text NOT NULL,
	`assigned_amount` integer DEFAULT 0 NOT NULL,
	`target_amount` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_month_budgets_category_id_month_unique` ON `category_month_budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`category_id` integer,
	`amount` integer NOT NULL,
	`payee` text,
	`date` text NOT NULL,
	`memo` text,
	`cleared` integer DEFAULT false NOT NULL,
	`flag` text,
	`is_transfer` integer DEFAULT false NOT NULL,
	`transfer_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_account_id` integer NOT NULL,
	`to_account_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`memo` text,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
