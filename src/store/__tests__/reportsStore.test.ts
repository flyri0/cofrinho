import type { AppDatabase } from '@/db/types';

import { createAccountsStore } from '../accountsStore';
import { createCategoriesStore } from '../categoriesStore';
import { createReportsStore } from '../reportsStore';
import { createTransactionsStore } from '../transactionsStore';
import { createTestDatabase } from '../testDb';

describe('reportsStore', () => {
  let db: AppDatabase;
  let accountsStore: ReturnType<typeof createAccountsStore>;
  let categoriesStore: ReturnType<typeof createCategoriesStore>;
  let transactionsStore: ReturnType<typeof createTransactionsStore>;
  let reportsStore: ReturnType<typeof createReportsStore>;

  beforeEach(() => {
    db = createTestDatabase();
    accountsStore = createAccountsStore(db);
    categoriesStore = createCategoriesStore(db);
    transactionsStore = createTransactionsStore(db);
    reportsStore = createReportsStore(db);
  });

  async function createCashAccount(name: string, balanceCents = 0) {
    const result = await accountsStore.getState().createAccount({
      name,
      type: 'checking',
      balanceCents,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    if (!result.ok) throw new Error('expected account creation to succeed');
    return result.id;
  }

  async function createTrackingAccount(name: string, balanceCents: number) {
    const result = await accountsStore.getState().createAccount({
      name,
      type: 'asset',
      balanceCents,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    if (!result.ok) throw new Error('expected account creation to succeed');
    return result.id;
  }

  async function createLoanAccount(name: string, balanceCents: number) {
    const result = await accountsStore.getState().createAccount({
      name,
      type: 'auto_loan',
      balanceCents,
      interestRateAnnualInput: '12',
      monthlyPaymentCents: 1_500_00,
    });
    if (!result.ok) throw new Error('expected account creation to succeed');
    return result.id;
  }

  async function createCategory(groupName: string, categoryName: string) {
    const group = await categoriesStore.getState().createGroup(groupName);
    if (!group.ok) throw new Error('expected group creation to succeed');
    const category = await categoriesStore
      .getState()
      .createCategory({ name: categoryName, groupId: group.id, icon: null });
    if (!category.ok) throw new Error('expected category creation to succeed');
    return category.id;
  }

  describe('period presets', () => {
    it('defaults to thisMonth', () => {
      const { preset, startMonth, endMonth } = reportsStore.getState();
      expect(preset).toBe('thisMonth');
      expect(startMonth).toBe(endMonth);
    });

    it('setPreset(last3) widens the range to 3 months ending at the current month', () => {
      reportsStore.getState().setPreset('last3');
      const { startMonth, endMonth } = reportsStore.getState();
      expect(startMonth < endMonth).toBe(true);
    });

    it('setCustomRange normalizes a reversed range', () => {
      reportsStore.getState().setCustomRange('2026-06', '2026-01');
      expect(reportsStore.getState()).toMatchObject({
        preset: 'custom',
        startMonth: '2026-01',
        endMonth: '2026-06',
      });
    });
  });

  describe('spending breakdown', () => {
    it('groups spending by category within the period, descending by amount', async () => {
      const checkingId = await createCashAccount('Checking', 500_00);
      const groceriesId = await createCategory('Needs', 'Groceries');
      const gasId = await createCategory('Needs', 'Gas');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 30_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: gasId,
        amountCents: 80_00,
        payee: 'Gas station',
        date: '2026-05-12',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().spendingBreakdown).toEqual([
        { categoryId: gasId, amount: -80_00 },
        { categoryId: groceriesId, amount: -30_00 },
      ]);
    });

    it('excludes a credit card purchase from the payment category and attributes it to the real spending category', async () => {
      const cardResult = await accountsStore.getState().createAccount(
        {
          name: 'Nubank',
          type: 'credit_card',
          balanceCents: 0,
          interestRateAnnualInput: '',
          monthlyPaymentCents: 0,
        },
        { groupName: 'Credit Card Payments', categoryName: 'Payment — Nubank' },
      );
      if (!cardResult.ok) throw new Error('expected credit card creation to succeed');
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardResult.id,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().spendingBreakdown).toEqual([
        { categoryId: groceriesId, amount: -50_00 },
      ]);
    });

    it('excludes transactions outside the selected period', async () => {
      const checkingId = await createCashAccount('Checking', 500_00);
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 30_00,
        payee: 'Market',
        date: '2026-04-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().spendingBreakdown).toEqual([]);
    });
  });

  describe('income vs spending', () => {
    it('separates uncategorized income from categorized spending, per month', async () => {
      const checkingId = await createCashAccount('Checking', 0);
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'inflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: null,
        amountCents: 1_000_00,
        payee: 'Salary',
        date: '2026-05-01',
        memo: '',
        flag: null,
        cleared: false,
      });
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 200_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().incomeVsSpending).toEqual([
        { month: '2026-05', income: 1_000_00, spending: 200_00 },
      ]);
    });

    it('includes a gap month (no transactions) as zero when the range spans multiple months', async () => {
      const checkingId = await createCashAccount('Checking', 0);
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 100_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-07');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().incomeVsSpending).toEqual([
        { month: '2026-05', income: 0, spending: 100_00 },
        { month: '2026-06', income: 0, spending: 0 },
        { month: '2026-07', income: 0, spending: 0 },
      ]);
    });

    it('excludes a regular transfer between two accounts from both totals', async () => {
      const checkingId = await createCashAccount('Checking', 500_00);
      const savingsId = await createCashAccount('Savings', 0);

      await transactionsStore.getState().createTransaction({
        type: 'transfer',
        accountId: checkingId,
        toAccountId: savingsId,
        categoryId: null,
        amountCents: 200_00,
        payee: '',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().incomeVsSpending).toEqual([
        { month: '2026-05', income: 0, spending: 0 },
      ]);
    });
  });

  describe('net worth trend', () => {
    it('reconstructs a cash account trend from transaction history', async () => {
      const checkingId = await createCashAccount('Checking', 1_000_00);
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 100_00,
        payee: 'Market',
        date: '2026-06-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-05', '2026-06');
      await reportsStore.getState().refresh();

      // May-end: initial balance only, the outflow hasn't happened yet.
      // June-end: initial balance minus the outflow.
      expect(reportsStore.getState().netWorthTrend).toEqual([
        { month: '2026-05', netWorth: 1_000_00 },
        { month: '2026-06', netWorth: 900_00 },
      ]);
    });

    it('includes tracking accounts', async () => {
      await createTrackingAccount('Brokerage', 5_000_00);

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().netWorthTrend).toEqual([
        { month: '2026-05', netWorth: 5_000_00 },
      ]);
    });

    it('holds a loan account balance flat across every displayed month (known limitation)', async () => {
      const loanId = await createLoanAccount('Car Loan', -100_000_00);
      const loanCategoryId = await createCategory('Fixed Bills', 'Car Loan');

      // Amortizes the loan balance partway through the range.
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: loanCategoryId,
        amountCents: 1_500_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });

      reportsStore.getState().setCustomRange('2026-04', '2026-05');
      await reportsStore.getState().refresh();

      // Both months show the loan's CURRENT (post-amortization) balance — there is
      // no historical trail for a loan account, so April incorrectly shows May's
      // balance too. This is the documented limitation, not a bug.
      const trend = reportsStore.getState().netWorthTrend;
      expect(trend[0].netWorth).toBe(trend[1].netWorth);
      expect(trend[1].netWorth).toBe(-99_500_00);
    });

    it('excludes an archived account', async () => {
      const checkingId = await createCashAccount('Checking', 1_000_00);
      await accountsStore.getState().archiveAccount(checkingId);

      reportsStore.getState().setCustomRange('2026-05', '2026-05');
      await reportsStore.getState().refresh();

      expect(reportsStore.getState().netWorthTrend).toEqual([{ month: '2026-05', netWorth: 0 }]);
    });
  });
});
