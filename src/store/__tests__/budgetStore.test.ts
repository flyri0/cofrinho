import type { AppDatabase } from '@/db/types';
import {
  accounts,
  categories,
  categoryGroups,
  categoryMonthBudgets,
  transactions,
} from '@/db/schema';
import { calculateReadyToAssign } from '@/lib/calculations';

import { createBudgetStore } from '../budgetStore';
import { createTestDatabase } from '../testDb';

describe('budgetStore', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('fetches accounts and transactions via Drizzle and computes Ready to Assign', async () => {
    await db.insert(accounts).values([
      {
        id: 1,
        name: 'Checking',
        type: 'checking',
        categoryKind: 'cash',
        isBudgetAccount: true,
        initialBalance: 0,
        currentBalance: 0,
      },
      {
        id: 2,
        name: 'Brokerage',
        type: 'asset',
        categoryKind: 'tracking',
        isBudgetAccount: false,
        initialBalance: 1_000_00,
        currentBalance: 1_000_00,
      },
    ]);

    await db.insert(categoryGroups).values({ id: 1, name: 'Needs' });
    await db.insert(categories).values({ id: 1, groupId: 1, name: 'Groceries' });

    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-01', assignedAmount: 300_00 },
      { categoryId: 1, month: '2026-02', assignedAmount: 100_00 },
    ]);

    await db.insert(transactions).values([
      // Income: unassigned inflow into the budget (checking) account.
      { accountId: 1, amount: 500_00, payee: 'Employer', date: '2026-01-05' },
      { accountId: 1, amount: 200_00, payee: 'Employer', date: '2026-02-05' },
      // Spending against a category must not count as income.
      { accountId: 1, categoryId: 1, amount: -50_00, payee: 'Market', date: '2026-01-10' },
      // A transfer must not count as income, even though it's a positive, uncategorized inflow.
      { accountId: 1, amount: 100_00, date: '2026-01-15', isTransfer: true },
      // An inflow into a tracking (non-budget) account must not count as income.
      { accountId: 2, amount: 900_00, date: '2026-01-20' },
    ]);

    const useBudgetStore = createBudgetStore(db);
    await useBudgetStore.getState().refresh();

    const totalIncome = 500_00 + 200_00; // the two checking-account inflows
    const totalAssigned = 300_00 + 100_00;
    expect(useBudgetStore.getState().readyToAssign).toBe(
      calculateReadyToAssign({ totalIncome, totalAssigned }),
    );
    expect(useBudgetStore.getState().readyToAssign).toBe(300_00);
    expect(useBudgetStore.getState().isLoading).toBe(false);
    expect(useBudgetStore.getState().error).toBeNull();
  });

  it('reports 0 for a freshly created, empty database', async () => {
    const useBudgetStore = createBudgetStore(db);
    await useBudgetStore.getState().refresh();

    expect(useBudgetStore.getState().readyToAssign).toBe(0);
  });
});
