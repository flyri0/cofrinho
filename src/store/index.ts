import { db } from '@/db/client';

import { createAccountsStore } from './accountsStore';
import { createBudgetStore } from './budgetStore';
import { createCategoriesStore } from './categoriesStore';
import { createMonthBudgetStore } from './monthBudgetStore';
import { createTransactionsStore } from './transactionsStore';

export * from './accountsStore';
export * from './budgetStore';
export * from './categoriesStore';
export * from './monthBudgetStore';
export * from './transactionsStore';

// Singleton stores backed by the real on-device database.
export const useBudgetStore = createBudgetStore(db);
export const useAccountsStore = createAccountsStore(db);
export const useCategoriesStore = createCategoriesStore(db);
export const useMonthBudgetStore = createMonthBudgetStore(db);
export const useTransactionsStore = createTransactionsStore(db);
