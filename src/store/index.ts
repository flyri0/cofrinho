import { db } from '@/db/client';

import { createBudgetStore } from './budgetStore';

export * from './budgetStore';

// Singleton store backed by the real on-device database.
export const useBudgetStore = createBudgetStore(db);
