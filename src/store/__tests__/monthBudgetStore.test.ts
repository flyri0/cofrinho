import type { AppDatabase } from '@/db/types';
import {
  accounts,
  categories,
  categoryGroups,
  categoryMonthBudgets,
  transactions,
} from '@/db/schema';

import { createMonthBudgetStore } from '../monthBudgetStore';
import { createTestDatabase } from '../testDb';

async function seedCategory(db: AppDatabase, id: number, groupId: number, name: string) {
  await db.insert(categories).values({ id, groupId, name });
}

describe('monthBudgetStore', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.insert(accounts).values({
      id: 1,
      name: 'Checking',
      type: 'checking',
      categoryKind: 'cash',
      isBudgetAccount: true,
      initialBalance: 0,
      currentBalance: 0,
    });
    await db.insert(categoryGroups).values({ id: 1, name: 'Needs' });
  });

  it('computes assigned/activity/available for the normal case', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await db
      .insert(categoryMonthBudgets)
      .values({ categoryId: 1, month: '2026-05', assignedAmount: 500_00 });
    await db.insert(transactions).values({
      accountId: 1,
      categoryId: 1,
      amount: -150_00,
      date: '2026-05-10',
    });

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    expect(store.getState().numbersByCategory[1]).toEqual({
      assigned: 500_00,
      activity: -150_00,
      available: 350_00,
      target: null,
    });
  });

  it('treats a category with no prior month-budget rows as having 0 previous available', async () => {
    await seedCategory(db, 1, 1, 'Groceries');

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    expect(store.getState().numbersByCategory[1]).toEqual({
      assigned: 0,
      activity: 0,
      available: 0,
      target: null,
    });
  });

  it('goes negative (overspent) when activity exceeds assigned', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await db
      .insert(categoryMonthBudgets)
      .values({ categoryId: 1, month: '2026-05', assignedAmount: 100_00 });
    await db
      .insert(transactions)
      .values({ accountId: 1, categoryId: 1, amount: -180_00, date: '2026-05-05' });

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    expect(store.getState().numbersByCategory[1].available).toBe(-80_00);
  });

  it('rolls a prior surplus into the selected month (previousAvailable carried forward)', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-04', assignedAmount: 300_00 },
      { categoryId: 1, month: '2026-05', assignedAmount: 100_00 },
    ]);
    await db
      .insert(transactions)
      .values({ accountId: 1, categoryId: 1, amount: -50_00, date: '2026-04-15' });

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    // April: 300 assigned - 50 spent = 250 leftover, rolled into May's 100 assigned.
    expect(store.getState().numbersByCategory[1]).toEqual({
      assigned: 100_00,
      activity: 0,
      available: 350_00,
      target: null,
    });
  });

  it('setTargetAmount sets (upserts) the target for the selected month, independent of assigned', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');

    await store.getState().setTargetAmount(1, 400_00);
    expect(store.getState().numbersByCategory[1].target).toBe(400_00);
    expect(store.getState().numbersByCategory[1].assigned).toBe(0);

    await store.getState().assignAmount(1, 150_00);
    expect(store.getState().numbersByCategory[1].target).toBe(400_00); // untouched by assignAmount
    expect(store.getState().numbersByCategory[1].assigned).toBe(150_00);
  });

  it('assignAmount sets (upserts) the assigned amount for the selected month', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');

    await store.getState().assignAmount(1, 200_00);
    expect(store.getState().numbersByCategory[1].assigned).toBe(200_00);

    // Re-assigning (an update, not a duplicate insert) should overwrite, not add.
    await store.getState().assignAmount(1, 350_00);
    expect(store.getState().numbersByCategory[1].assigned).toBe(350_00);

    const rows = await db.select().from(categoryMonthBudgets);
    expect(rows).toHaveLength(1);
  });

  it('coverOverspending moves just enough from a surplus category to zero out a deficit', async () => {
    await seedCategory(db, 1, 1, 'Groceries'); // will be overspent
    await seedCategory(db, 2, 1, 'Entertainment'); // has surplus
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-05', assignedAmount: 100_00 },
      { categoryId: 2, month: '2026-05', assignedAmount: 200_00 },
    ]);
    await db
      .insert(transactions)
      .values({ accountId: 1, categoryId: 1, amount: -150_00, date: '2026-05-05' });

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();
    expect(store.getState().numbersByCategory[1].available).toBe(-50_00);

    await store.getState().coverOverspending(1, 2);

    expect(store.getState().numbersByCategory[1].available).toBe(0);
    expect(store.getState().numbersByCategory[2].available).toBe(150_00); // 200 - 50 moved

    // Total assigned across both categories is unchanged -> Ready to Assign is unaffected.
    const totalAssignedBefore = 100_00 + 200_00;
    const totalAssignedAfter =
      store.getState().numbersByCategory[1].assigned +
      store.getState().numbersByCategory[2].assigned;
    expect(totalAssignedAfter).toBe(totalAssignedBefore);
  });

  it('coverOverspending only moves what the source can spare (partial cover)', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await seedCategory(db, 2, 1, 'Entertainment');
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-05', assignedAmount: 100_00 },
      { categoryId: 2, month: '2026-05', assignedAmount: 20_00 },
    ]);
    await db
      .insert(transactions)
      .values({ accountId: 1, categoryId: 1, amount: -150_00, date: '2026-05-05' });

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    await store.getState().coverOverspending(1, 2);

    expect(store.getState().numbersByCategory[1].available).toBe(-30_00); // still short by 30
    expect(store.getState().numbersByCategory[2].available).toBe(0); // fully drained
  });

  it('fetchCategoryHistory rolls availability forward across months, most recent first', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-03', assignedAmount: 200_00 },
      { categoryId: 1, month: '2026-05', assignedAmount: 50_00 },
    ]);
    await db.insert(transactions).values([
      { accountId: 1, categoryId: 1, amount: -100_00, date: '2026-03-10' },
      { accountId: 1, categoryId: 1, amount: -30_00, date: '2026-05-02' },
    ]);

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    const history = await store.getState().fetchCategoryHistory(1, 3);

    expect(history).toEqual([
      { month: '2026-05', assigned: 50_00, activity: -30_00, available: 120_00 },
      { month: '2026-04', assigned: 0, activity: 0, available: 100_00 }, // no activity, rolled over
      { month: '2026-03', assigned: 200_00, activity: -100_00, available: 100_00 },
    ]);
  });

  it('fetchCategoryHistory limits to the requested number of most recent months (edge case)', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-01', assignedAmount: 10_00 },
      { categoryId: 1, month: '2026-02', assignedAmount: 10_00 },
      { categoryId: 1, month: '2026-03', assignedAmount: 10_00 },
    ]);

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-03');
    const history = await store.getState().fetchCategoryHistory(1, 2);

    expect(history.map((h) => h.month)).toEqual(['2026-03', '2026-02']);
  });

  it('coverOverspending is a no-op when the target is not actually overspent (edge case)', async () => {
    await seedCategory(db, 1, 1, 'Groceries');
    await seedCategory(db, 2, 1, 'Entertainment');
    await db.insert(categoryMonthBudgets).values([
      { categoryId: 1, month: '2026-05', assignedAmount: 100_00 },
      { categoryId: 2, month: '2026-05', assignedAmount: 200_00 },
    ]);

    const store = createMonthBudgetStore(db);
    store.getState().setMonth('2026-05');
    await store.getState().fetchMonthBudget();

    await store.getState().coverOverspending(1, 2);

    expect(store.getState().numbersByCategory[1].assigned).toBe(100_00);
    expect(store.getState().numbersByCategory[2].assigned).toBe(200_00);
  });
});
