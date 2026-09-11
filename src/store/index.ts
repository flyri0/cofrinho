import { db } from '@/db/client';

import { createAccountsStore } from './accountsStore';
import { createBudgetStore } from './budgetStore';

export * from './accountsStore';
export * from './budgetStore';

// Singleton stores backed by the real on-device database.
export const useBudgetStore = createBudgetStore(db);
export const useAccountsStore = createAccountsStore(db);
