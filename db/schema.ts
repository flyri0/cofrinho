import { sql } from 'drizzle-orm';
import { check, integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

// Timestamps are stored as unix epoch milliseconds; dates/months are stored as
// ISO strings ('YYYY-MM-DD' / 'YYYY-MM') per technical-specification.md §4.6.
const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// see technical-specification.md §4.2
export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'line_of_credit',
  'mortgage',
  'auto_loan',
  'student_loan',
  'personal_loan',
  'medical_debt',
  'other_debt',
  'asset',
  'liability',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// see technical-specification.md §2.2 and §4.2
export const ACCOUNT_CATEGORY_KINDS = ['cash', 'credit', 'loan', 'tracking'] as const;
export type AccountCategoryKind = (typeof ACCOUNT_CATEGORY_KINDS)[number];

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').$type<AccountType>().notNull(),
  categoryKind: text('category_kind').$type<AccountCategoryKind>().notNull(),
  isBudgetAccount: integer('is_budget_account', { mode: 'boolean' }).notNull(),
  initialBalance: integer('initial_balance').notNull(),
  currentBalance: integer('current_balance').notNull(),
  currency: text('currency').notNull().default('BRL'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// see technical-specification.md §4.3 — one row per loan/financing account
export const accountLoanDetails = sqliteTable('account_loan_details', {
  accountId: integer('account_id')
    .primaryKey()
    .references(() => accounts.id),
  interestRateAnnual: real('interest_rate_annual').notNull(),
  monthlyPayment: integer('monthly_payment').notNull(),
  termMonths: integer('term_months'),
});

// see technical-specification.md §4.4
export const categoryGroups = sqliteTable('category_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

// see technical-specification.md §4.5
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id')
    .notNull()
    .references(() => categoryGroups.id),
  name: text('name').notNull(),
  icon: text('icon'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  // populated only for credit card "Payment — [Card]" system categories, see §2.4
  linkedAccountId: integer('linked_account_id').references(() => accounts.id),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

// see technical-specification.md §4.6 — one record per category, per month
export const categoryMonthBudgets = sqliteTable(
  'category_month_budgets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    month: text('month').notNull(), // format YYYY-MM
    assignedAmount: integer('assigned_amount').notNull().default(0),
    targetAmount: integer('target_amount'),
  },
  (table) => [unique().on(table.categoryId, table.month)],
);

// see technical-specification.md §4.7
// References `transfers` below — safe because Drizzle resolves the FK
// callback lazily, after the whole module (including `transfers`) has evaluated.
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryId: integer('category_id').references(() => categories.id), // null on transfers
  amount: integer('amount').notNull(), // cents; negative = outflow, positive = inflow
  payee: text('payee'),
  date: text('date').notNull(), // format YYYY-MM-DD
  memo: text('memo'),
  cleared: integer('cleared', { mode: 'boolean' }).notNull().default(false),
  flag: text('flag'),
  isTransfer: integer('is_transfer', { mode: 'boolean' }).notNull().default(false),
  transferId: integer('transfer_id').references(() => transfers.id),
  createdAt: createdAt(),
});

// see technical-specification.md §4.8 — a transfer generates two linked transactions rows
export const transfers = sqliteTable('transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromAccountId: integer('from_account_id')
    .notNull()
    .references(() => accounts.id),
  toAccountId: integer('to_account_id')
    .notNull()
    .references(() => accounts.id),
  amount: integer('amount').notNull(), // cents, positive value
  date: text('date').notNull(), // format YYYY-MM-DD
  memo: text('memo'),
});

// see technical-specification.md §4.10
export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DRIVE_FOLDER_MODES = ['app_data_folder', 'visible_folder'] as const;
export type DriveFolderMode = (typeof DRIVE_FOLDER_MODES)[number];

// Singleton table — a single row, fixed id = 1 (enforced by the check constraint below)
export const appSettings = sqliteTable(
  'app_settings',
  {
    id: integer('id').primaryKey().default(1),
    onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' })
      .notNull()
      .default(false),
    themeMode: text('theme_mode').$type<ThemeMode>().notNull(),
    colorThemeId: text('color_theme_id').notNull(),
    currencySymbol: text('currency_symbol').notNull().default('R$'),
    firstDayOfMonth: integer('first_day_of_month').notNull().default(1),
    locale: text('locale').notNull().default('pt-BR'),
    autoBackupEnabled: integer('auto_backup_enabled', { mode: 'boolean' }).notNull(),
    lastBackupAt: integer('last_backup_at', { mode: 'timestamp_ms' }),
    driveFolderMode: text('drive_folder_mode').$type<DriveFolderMode>().notNull(),
  },
  (table) => [check('app_settings_singleton', sql`${table.id} = 1`)],
);

// see technical-specification.md §4.11
export const BACKUP_STATUSES = ['success', 'failed'] as const;
export type BackupStatus = (typeof BACKUP_STATUSES)[number];

export const BACKUP_TRIGGERS = ['manual', 'auto_foreground', 'auto_background'] as const;
export type BackupTrigger = (typeof BACKUP_TRIGGERS)[number];

export const backupLog = sqliteTable('backup_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  status: text('status').$type<BackupStatus>().notNull(),
  trigger: text('trigger').$type<BackupTrigger>().notNull(),
  errorMessage: text('error_message'),
});
