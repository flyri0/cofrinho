import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { accounts, transactions } from '@/db/schema';
import { getCurrentMonth } from '@/lib/month';
import {
  calculateIncomeVsSpending,
  calculateNetWorthForMonth,
  calculateSpendingBreakdown,
  monthsInRange,
  normalizePeriodRange,
  resolvePeriodPreset,
  type MonthlyIncomeVsSpending,
  type ReportPeriodPreset,
  type SpendingBreakdownEntry,
} from '@/lib/reports';

export interface NetWorthTrendEntry {
  month: string;
  netWorth: number;
}

export interface ReportsState {
  preset: ReportPeriodPreset;
  startMonth: string;
  endMonth: string;
  spendingBreakdown: SpendingBreakdownEntry[];
  incomeVsSpending: MonthlyIncomeVsSpending[];
  netWorthTrend: NetWorthTrendEntry[];
  isLoading: boolean;
  error: string | null;
  setPreset: (preset: ReportPeriodPreset) => void;
  setCustomRange: (startMonth: string, endMonth: string) => void;
  refresh: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 'YYYY-MM-DD' text dates compare lexicographically, and no month has a 32nd day,
// so '-31' is a safe, always-inclusive upper bound for an entire month.
function monthEndDate(month: string): string {
  return `${month}-31`;
}

async function fetchSpendingBreakdown(
  db: AppDatabase,
  dateFrom: string,
  dateTo: string,
): Promise<SpendingBreakdownEntry[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      isTransfer: transactions.isTransfer,
    })
    .from(transactions)
    .where(and(gte(transactions.date, dateFrom), lte(transactions.date, dateTo)));

  return calculateSpendingBreakdown(rows);
}

async function fetchIncomeVsSpending(
  db: AppDatabase,
  dateFrom: string,
  dateTo: string,
  months: string[],
): Promise<MonthlyIncomeVsSpending[]> {
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      isTransfer: transactions.isTransfer,
      isBudgetAccount: accounts.isBudgetAccount,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(gte(transactions.date, dateFrom), lte(transactions.date, dateTo)));

  return calculateIncomeVsSpending(rows, months);
}

// Reconstructs each account's balance as of every displayed month-end from its
// full transaction history (not just the transactions within the period) — a
// month's net worth depends on everything that happened up to that point, not
// only on activity inside the selected range. See netWorthForMonth.ts for the
// loan-account limitation this inherits.
async function fetchNetWorthTrend(
  db: AppDatabase,
  months: string[],
): Promise<NetWorthTrendEntry[]> {
  const [accountRows, transactionRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.archived, false)),
    db
      .select({
        accountId: transactions.accountId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions),
  ]);

  return months.map((month) => {
    const monthEnd = monthEndDate(month);
    const cumulativeByAccount = new Map<number, number>();
    for (const row of transactionRows) {
      if (row.date > monthEnd) continue;
      cumulativeByAccount.set(
        row.accountId,
        (cumulativeByAccount.get(row.accountId) ?? 0) + row.amount,
      );
    }

    const netWorth = calculateNetWorthForMonth(
      accountRows.map((account) => ({
        categoryKind: account.categoryKind,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        cumulativeTransactionTotal: cumulativeByAccount.get(account.id) ?? 0,
      })),
    );

    return { month, netWorth };
  });
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createReportsStore(db: AppDatabase): UseBoundStore<StoreApi<ReportsState>> {
  const initialRange = resolvePeriodPreset('thisMonth', getCurrentMonth());

  return create<ReportsState>((set, get) => ({
    preset: 'thisMonth',
    startMonth: initialRange.startMonth,
    endMonth: initialRange.endMonth,
    spendingBreakdown: [],
    incomeVsSpending: [],
    netWorthTrend: [],
    isLoading: false,
    error: null,

    setPreset: (preset) => {
      if (preset === 'custom') {
        set({ preset });
        return;
      }
      const range = resolvePeriodPreset(preset, getCurrentMonth());
      set({ preset, startMonth: range.startMonth, endMonth: range.endMonth });
    },

    setCustomRange: (startMonth, endMonth) => {
      const range = normalizePeriodRange(startMonth, endMonth);
      set({ preset: 'custom', startMonth: range.startMonth, endMonth: range.endMonth });
    },

    refresh: async () => {
      set({ isLoading: true, error: null });
      try {
        const { startMonth, endMonth } = get();
        const dateFrom = `${startMonth}-01`;
        const dateTo = monthEndDate(endMonth);
        const months = monthsInRange(startMonth, endMonth);

        const [spendingBreakdown, incomeVsSpending, netWorthTrend] = await Promise.all([
          fetchSpendingBreakdown(db, dateFrom, dateTo),
          fetchIncomeVsSpending(db, dateFrom, dateTo, months),
          fetchNetWorthTrend(db, months),
        ]);

        set({ spendingBreakdown, incomeVsSpending, netWorthTrend, isLoading: false });
      } catch (error) {
        set({ error: toErrorMessage(error), isLoading: false });
      }
    },
  }));
}
