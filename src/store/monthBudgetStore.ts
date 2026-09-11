import { and, eq, isNotNull, lt, type SQL, sql } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { categories, categoryMonthBudgets, transactions } from '@/db/schema';
import { calculateCoverTransferAmount, type CategoryNumbers } from '@/src/lib/categories';
import { calculateCategoryAvailable } from '@/src/lib/calculations';
import { getCurrentMonth, shiftMonth } from '@/src/lib/month';

export interface CategoryHistoryEntry {
  month: string;
  assigned: number;
  activity: number;
  available: number;
}

export interface MonthBudgetState {
  selectedMonth: string;
  numbersByCategory: Record<number, CategoryNumbers>;
  isLoading: boolean;
  error: string | null;
  setMonth: (month: string) => void;
  fetchMonthBudget: () => Promise<void>;
  assignAmount: (categoryId: number, cents: number) => Promise<void>;
  setTargetAmount: (categoryId: number, cents: number | null) => Promise<void>;
  coverOverspending: (targetCategoryId: number, sourceCategoryId: number) => Promise<void>;
  /** Recent months' assigned/activity/available for one category, most recent first (§5.4). */
  fetchCategoryHistory: (
    categoryId: number,
    monthsToShow?: number,
  ) => Promise<CategoryHistoryEntry[]>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ThisMonthBudgetRow {
  assigned: number;
  target: number | null;
}

async function fetchThisMonthBudgetRows(
  db: AppDatabase,
  month: string,
): Promise<Map<number, ThisMonthBudgetRow>> {
  const rows = await db
    .select({
      categoryId: categoryMonthBudgets.categoryId,
      assignedAmount: categoryMonthBudgets.assignedAmount,
      targetAmount: categoryMonthBudgets.targetAmount,
    })
    .from(categoryMonthBudgets)
    .where(eq(categoryMonthBudgets.month, month));
  return new Map(
    rows.map((row) => [row.categoryId, { assigned: row.assignedAmount, target: row.targetAmount }]),
  );
}

// `dateCondition` picks which transactions count — either "in this month" or "before this month".
async function fetchActivityByCategory(
  db: AppDatabase,
  dateCondition: SQL,
): Promise<Map<number, number>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.categoryId), dateCondition))
    .groupBy(transactions.categoryId);
  return new Map(rows.map((row) => [row.categoryId as number, Number(row.total)]));
}

async function fetchAssignedBeforeMonth(
  db: AppDatabase,
  month: string,
): Promise<Map<number, number>> {
  const rows = await db
    .select({
      categoryId: categoryMonthBudgets.categoryId,
      total: sql<number>`sum(${categoryMonthBudgets.assignedAmount})`,
    })
    .from(categoryMonthBudgets)
    .where(lt(categoryMonthBudgets.month, month))
    .groupBy(categoryMonthBudgets.categoryId);
  return new Map(rows.map((row) => [row.categoryId, Number(row.total)]));
}

async function upsertMonthBudget(
  db: AppDatabase,
  categoryId: number,
  month: string,
  patch: { assignedAmount?: number; targetAmount?: number | null },
): Promise<void> {
  const [existing] = await db
    .select({ id: categoryMonthBudgets.id })
    .from(categoryMonthBudgets)
    .where(
      and(eq(categoryMonthBudgets.categoryId, categoryId), eq(categoryMonthBudgets.month, month)),
    )
    .limit(1);

  if (existing) {
    await db
      .update(categoryMonthBudgets)
      .set(patch)
      .where(eq(categoryMonthBudgets.id, existing.id));
  } else {
    await db.insert(categoryMonthBudgets).values({ categoryId, month, ...patch });
  }
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createMonthBudgetStore(db: AppDatabase): UseBoundStore<StoreApi<MonthBudgetState>> {
  return create<MonthBudgetState>((set, get) => ({
    selectedMonth: getCurrentMonth(),
    numbersByCategory: {},
    isLoading: false,
    error: null,

    setMonth: (month) => set({ selectedMonth: month }),

    fetchMonthBudget: async () => {
      const month = get().selectedMonth;
      set({ isLoading: true, error: null });
      try {
        const activeCategories = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.archived, false));
        const monthStart = `${month}-01`;

        const [thisMonthRows, activityThisMonth, assignedBeforeMonth, activityBeforeMonth] =
          await Promise.all([
            fetchThisMonthBudgetRows(db, month),
            fetchActivityByCategory(db, sql`substr(${transactions.date}, 1, 7) = ${month}`),
            fetchAssignedBeforeMonth(db, month),
            fetchActivityByCategory(db, lt(transactions.date, monthStart)),
          ]);

        const numbersByCategory: Record<number, CategoryNumbers> = {};
        for (const category of activeCategories) {
          const assigned = thisMonthRows.get(category.id)?.assigned ?? 0;
          const target = thisMonthRows.get(category.id)?.target ?? null;
          const activity = activityThisMonth.get(category.id) ?? 0;
          const previousAvailable =
            (assignedBeforeMonth.get(category.id) ?? 0) +
            (activityBeforeMonth.get(category.id) ?? 0);
          numbersByCategory[category.id] = {
            assigned,
            activity,
            target,
            available: calculateCategoryAvailable({ previousAvailable, assigned, activity }),
          };
        }

        set({ numbersByCategory, isLoading: false });
      } catch (error) {
        set({ error: toErrorMessage(error), isLoading: false });
      }
    },

    assignAmount: async (categoryId, cents) => {
      await upsertMonthBudget(db, categoryId, get().selectedMonth, { assignedAmount: cents });
      await get().fetchMonthBudget();
    },

    setTargetAmount: async (categoryId, cents) => {
      await upsertMonthBudget(db, categoryId, get().selectedMonth, { targetAmount: cents });
      await get().fetchMonthBudget();
    },

    coverOverspending: async (targetCategoryId, sourceCategoryId) => {
      const month = get().selectedMonth;
      const numbers = get().numbersByCategory;

      const deficit = Math.max(0, -(numbers[targetCategoryId]?.available ?? 0));
      const sourceAvailable = numbers[sourceCategoryId]?.available ?? 0;
      const transferAmount = calculateCoverTransferAmount({ deficit, sourceAvailable });
      if (transferAmount === 0) return;

      const targetAssigned = numbers[targetCategoryId]?.assigned ?? 0;
      const sourceAssigned = numbers[sourceCategoryId]?.assigned ?? 0;

      await upsertMonthBudget(db, targetCategoryId, month, {
        assignedAmount: targetAssigned + transferAmount,
      });
      await upsertMonthBudget(db, sourceCategoryId, month, {
        assignedAmount: sourceAssigned - transferAmount,
      });
      await get().fetchMonthBudget();
    },

    fetchCategoryHistory: async (categoryId, monthsToShow = 6) => {
      const assignedRows = await db
        .select({
          month: categoryMonthBudgets.month,
          assignedAmount: categoryMonthBudgets.assignedAmount,
        })
        .from(categoryMonthBudgets)
        .where(eq(categoryMonthBudgets.categoryId, categoryId));
      const activityRows = await db
        .select({
          month: sql<string>`substr(${transactions.date}, 1, 7)`,
          total: sql<number>`sum(${transactions.amount})`,
        })
        .from(transactions)
        .where(eq(transactions.categoryId, categoryId))
        .groupBy(sql`substr(${transactions.date}, 1, 7)`);

      const assignedByMonth = new Map(assignedRows.map((row) => [row.month, row.assignedAmount]));
      const activityByMonth = new Map(activityRows.map((row) => [row.month, Number(row.total)]));

      const endMonth = get().selectedMonth;
      const startMonth = shiftMonth(endMonth, -(monthsToShow - 1));

      // Baseline for the oldest displayed month: everything before it, cumulative
      // (lexicographic order matches chronological order for zero-padded 'YYYY-MM').
      let runningAvailable = 0;
      for (const [month, assigned] of assignedByMonth) {
        if (month < startMonth) runningAvailable += assigned;
      }
      for (const [month, activity] of activityByMonth) {
        if (month < startMonth) runningAvailable += activity;
      }

      // Walk the contiguous window forward so gap months (no activity, no
      // assignment) still show up with their correctly rolled-over available.
      const history: CategoryHistoryEntry[] = [];
      for (let month = startMonth; month <= endMonth; month = shiftMonth(month, 1)) {
        const assigned = assignedByMonth.get(month) ?? 0;
        const activity = activityByMonth.get(month) ?? 0;
        runningAvailable = calculateCategoryAvailable({
          previousAvailable: runningAvailable,
          assigned,
          activity,
        });
        history.push({ month, assigned, activity, available: runningAvailable });
      }

      return history.reverse();
    },
  }));
}
