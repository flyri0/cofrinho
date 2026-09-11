import { and, eq, gt, isNull } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { accounts, categoryMonthBudgets, transactions } from '@/db/schema';
import { calculateReadyToAssign } from '@/src/lib/calculations';

export interface BudgetState {
  readyToAssign: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Income = a positive, non-transfer inflow into a budget account with no category
// (per §2.1/§8.1: money that has entered the budget but hasn't been assigned yet).
async function fetchTotalIncome(db: AppDatabase): Promise<number> {
  const rows = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(accounts.isBudgetAccount, true),
        eq(transactions.isTransfer, false),
        isNull(transactions.categoryId),
        gt(transactions.amount, 0),
      ),
    );

  return rows.reduce((total, row) => total + row.amount, 0);
}

async function fetchTotalAssigned(db: AppDatabase): Promise<number> {
  const rows = await db
    .select({ assignedAmount: categoryMonthBudgets.assignedAmount })
    .from(categoryMonthBudgets);

  return rows.reduce((total, row) => total + row.assignedAmount, 0);
}

// Factory instead of a single exported store so tests can inject a db backed by
// any 'sync' SQLite driver (e.g. better-sqlite3) without touching expo-sqlite.
export function createBudgetStore(db: AppDatabase): UseBoundStore<StoreApi<BudgetState>> {
  return create<BudgetState>((set) => ({
    readyToAssign: 0,
    isLoading: false,
    error: null,
    refresh: async () => {
      set({ isLoading: true, error: null });
      try {
        const [totalIncome, totalAssigned] = await Promise.all([
          fetchTotalIncome(db),
          fetchTotalAssigned(db),
        ]);
        set({
          readyToAssign: calculateReadyToAssign({ totalIncome, totalAssigned }),
          isLoading: false,
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error), isLoading: false });
      }
    },
  }));
}
