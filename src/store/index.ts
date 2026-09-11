import { db } from '@/db/client';

import { createAccountsStore } from './accountsStore';
import { createBudgetStore } from './budgetStore';
import { createCategoriesStore } from './categoriesStore';
import { createMonthBudgetStore } from './monthBudgetStore';

export * from './accountsStore';
export * from './budgetStore';
export * from './categoriesStore';
export * from './monthBudgetStore';

// Singleton stores backed by the real on-device database.
export const useBudgetStore = createBudgetStore(db);
export const useAccountsStore = createAccountsStore(db);
export const useCategoriesStore = createCategoriesStore(db);
export const useMonthBudgetStore = createMonthBudgetStore(db);
