import { db } from '@/db/client';

import { createAccountsStore } from './accountsStore';
import { createBackupStore } from './backupStore';
import { createBudgetStore } from './budgetStore';
import { createCategoriesStore } from './categoriesStore';
import { createMonthBudgetStore } from './monthBudgetStore';
import { createReportsStore } from './reportsStore';
import { createSettingsStore } from './settingsStore';
import { createTransactionsStore } from './transactionsStore';

export * from './accountsStore';
export * from './backupStore';
export * from './budgetStore';
export * from './categoriesStore';
export * from './monthBudgetStore';
export * from './reportsStore';
export * from './settingsStore';
export * from './transactionsStore';

// Singleton stores backed by the real on-device database.
export const useBudgetStore = createBudgetStore(db);
export const useAccountsStore = createAccountsStore(db);
export const useBackupStore = createBackupStore(db);
export const useCategoriesStore = createCategoriesStore(db);
export const useMonthBudgetStore = createMonthBudgetStore(db);
export const useReportsStore = createReportsStore(db);
export const useSettingsStore = createSettingsStore(db);
export const useTransactionsStore = createTransactionsStore(db);
