import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { accounts, categoryMonthBudgets, transactions, transfers } from '@/db/schema';

import { createAccountsStore } from '../accountsStore';
import { createCategoriesStore } from '../categoriesStore';
import { createTransactionsStore } from '../transactionsStore';
import { createTestDatabase } from '../testDb';

async function getAccount(db: AppDatabase, id: number) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
  return account;
}

async function getAssigned(db: AppDatabase, categoryId: number, month: string) {
  const [row] = await db
    .select()
    .from(categoryMonthBudgets)
    .where(
      and(eq(categoryMonthBudgets.categoryId, categoryId), eq(categoryMonthBudgets.month, month)),
    );
  return row?.assignedAmount ?? 0;
}

describe('transactionsStore', () => {
  let db: AppDatabase;
  let accountsStore: ReturnType<typeof createAccountsStore>;
  let categoriesStore: ReturnType<typeof createCategoriesStore>;
  let transactionsStore: ReturnType<typeof createTransactionsStore>;

  beforeEach(() => {
    db = createTestDatabase();
    accountsStore = createAccountsStore(db);
    categoriesStore = createCategoriesStore(db);
    transactionsStore = createTransactionsStore(db);
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

  async function createCreditCardAccount(name: string) {
    const result = await accountsStore
      .getState()
      .createAccount(
        {
          name,
          type: 'credit_card',
          balanceCents: 0,
          interestRateAnnualInput: '',
          monthlyPaymentCents: 0,
        },
        { groupName: 'Credit Card Payments', categoryName: `Payment — ${name}` },
      );
    if (!result.ok) throw new Error('expected credit card creation to succeed');
    return result.id;
  }

  async function paymentCategoryIdFor(cardAccountId: number) {
    await categoriesStore.getState().fetchAll();
    const category = categoriesStore
      .getState()
      .categories.find((c) => c.linkedAccountId === cardAccountId);
    if (!category) throw new Error('expected a linked payment category to exist');
    return category.id;
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

  describe('§7.2 simple expense', () => {
    it('reduces the account balance and shows up as category activity', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const groceriesId = await createCategory('Needs', 'Groceries');

      const result = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect(result.ok).toBe(true);
      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000 - 50_00);

      const [row] = await db.select().from(transactions);
      expect(row).toMatchObject({
        accountId: checkingId,
        categoryId: groceriesId,
        amount: -50_00,
        isTransfer: false,
      });
    });
  });

  describe('§7.3 credit card spending (the core float mechanic)', () => {
    it('reduces the spending category, increases the card debt, and funds the Payment category from the same amount', async () => {
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      const result = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      expect(result.ok).toBe(true);

      expect((await getAccount(db, cardId)).currentBalance).toBe(-50_00);
      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(50_00);
    });

    it('accumulates across multiple purchases in the same month (edge case)', async () => {
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const gasId = await createCategory('Needs', 'Gas');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: gasId,
        amountCents: 30_00,
        payee: 'Gas station',
        date: '2026-05-12',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect((await getAccount(db, cardId)).currentBalance).toBe(-80_00);
      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(80_00);
    });

    it('does not touch the Payment category for a cash account purchase (sanity check)', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(0);
    });

    it('recomputes correctly (not incrementally) when a card transaction is edited', async () => {
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      const created = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!created.ok) throw new Error('expected creation to succeed');
      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(50_00);

      await transactionsStore.getState().updateTransaction(created.id, {
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 80_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(80_00);
      expect((await getAccount(db, cardId)).currentBalance).toBe(-80_00);
    });

    it('recomputes correctly when a card transaction is deleted (edge case)', async () => {
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      const created = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!created.ok) throw new Error('expected creation to succeed');

      await transactionsStore.getState().deleteTransaction(created.id);

      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(0);
      expect((await getAccount(db, cardId)).currentBalance).toBe(0);
    });
  });

  describe('§7.4 credit card payment', () => {
    it('creates a linked transfer and reduces the Payment category by the amount paid', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      const payment = await transactionsStore.getState().createTransaction({
        type: 'credit_card_payment',
        accountId: checkingId,
        toAccountId: cardId,
        categoryId: null,
        amountCents: 30_00,
        payee: '',
        date: '2026-05-15',
        memo: '',
        flag: null,
        cleared: false,
      });
      expect(payment.ok).toBe(true);

      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000 - 30_00);
      expect((await getAccount(db, cardId)).currentBalance).toBe(-50_00 + 30_00);
      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(50_00 - 30_00);

      const transferRows = await db.select().from(transfers);
      expect(transferRows).toHaveLength(1);
      const legs = await db
        .select()
        .from(transactions)
        .where(eq(transactions.transferId, transferRows[0].id));
      expect(legs).toHaveLength(2);
      expect(legs.every((leg) => leg.categoryId === null && leg.isTransfer)).toBe(true);
    });

    it('fully zeroes out the Payment category when the payment matches spending exactly (edge case)', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      await transactionsStore.getState().createTransaction({
        type: 'credit_card_payment',
        accountId: checkingId,
        toAccountId: cardId,
        categoryId: null,
        amountCents: 50_00,
        payee: '',
        date: '2026-05-20',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(0);
      expect((await getAccount(db, cardId)).currentBalance).toBe(0);
    });

    it('reverses correctly when the payment transaction is deleted', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const cardId = await createCreditCardAccount('Nubank');
      const groceriesId = await createCategory('Needs', 'Groceries');
      const paymentCategoryId = await paymentCategoryIdFor(cardId);

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: cardId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      const payment = await transactionsStore.getState().createTransaction({
        type: 'credit_card_payment',
        accountId: checkingId,
        toAccountId: cardId,
        categoryId: null,
        amountCents: 30_00,
        payee: '',
        date: '2026-05-15',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!payment.ok) throw new Error('expected payment creation to succeed');

      await transactionsStore.getState().deleteTransaction(payment.id);

      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000);
      expect((await getAccount(db, cardId)).currentBalance).toBe(-50_00);
      expect(await getAssigned(db, paymentCategoryId, '2026-05')).toBe(50_00);
    });
  });

  describe('§7.5 regular transfer', () => {
    it('moves money between two accounts without touching any category', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const savingsId = await createCashAccount('Savings', 0);

      const result = await transactionsStore.getState().createTransaction({
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
      expect(result.ok).toBe(true);

      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000 - 200_00);
      expect((await getAccount(db, savingsId)).currentBalance).toBe(200_00);

      const legs = await db.select().from(transactions);
      expect(legs).toHaveLength(2);
      expect(legs.every((leg) => leg.categoryId === null)).toBe(true);

      const rows = await db.select().from(categoryMonthBudgets);
      expect(rows).toHaveLength(0); // no category was ever touched
    });

    it('rejects a transfer to the same account (edge case)', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);

      const result = await transactionsStore.getState().createTransaction({
        type: 'transfer',
        accountId: checkingId,
        toAccountId: checkingId,
        categoryId: null,
        amountCents: 100_00,
        payee: '',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });

      expect(result).toEqual({ ok: false, errors: { toAccountId: 'same_account' } });
    });
  });

  describe('loan payment (§2.5/§8.3)', () => {
    async function createLoanAccount() {
      const result = await accountsStore.getState().createAccount({
        name: 'Car Loan',
        type: 'auto_loan',
        balanceCents: -100_000_00,
        interestRateAnnualInput: '12',
        monthlyPaymentCents: 1_500_00,
      });
      if (!result.ok) throw new Error('expected loan account creation to succeed');
      return result.id;
    }

    it('reduces the balance by the amortized principal (from the loan config), not the full payment', async () => {
      const loanId = await createLoanAccount();
      const carLoanCategoryId = await createCategory('Fixed Bills', 'Car Loan');

      // interest = round(100_000_00 * 12/12/100) = 1_000_00; amortization = 1_500_00 - 1_000_00 = 500_00
      const result = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: carLoanCategoryId,
        amountCents: 1_500_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });
      expect(result.ok).toBe(true);

      expect((await getAccount(db, loanId)).currentBalance).toBe(-99_500_00);
    });

    it("uses the loan's configured monthly payment for amortization, independent of the transaction amount actually logged", async () => {
      const loanId = await createLoanAccount();
      const carLoanCategoryId = await createCategory('Fixed Bills', 'Car Loan');

      // Log a payment for a DIFFERENT amount than the loan's stored 1_500_00 — the
      // amortization split still runs off the stored monthly_payment (§8.3's formula
      // references the loan's configured payment, not what was actually transacted).
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: carLoanCategoryId,
        amountCents: 900_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });

      // Same amortization result as the 1_500_00 case above, even though 900_00 was logged.
      expect((await getAccount(db, loanId)).currentBalance).toBe(-99_500_00);

      // But the category's own activity reflects the real transacted amount.
      const [row] = await db.select().from(transactions);
      expect(row.amount).toBe(-900_00);
    });

    it('does not create a system category for a loan payment, unlike credit cards (§2.5)', async () => {
      const loanId = await createLoanAccount();
      const carLoanCategoryId = await createCategory('Fixed Bills', 'Car Loan');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: carLoanCategoryId,
        amountCents: 1_500_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });

      // Unlike the credit card mechanic, nothing auto-assigns money to any category —
      // category_month_budgets only ever holds explicit assignments (never activity),
      // so it stays empty here; "Car Loan" is a plain user-managed category (not isSystem).
      expect(await db.select().from(categoryMonthBudgets)).toHaveLength(0);
      const category = categoriesStore
        .getState()
        .categories.find((c) => c.id === carLoanCategoryId);
      expect(category?.isSystem).toBe(false);
    });

    it('grows the debt (negative amortization) when the configured payment does not cover interest', async () => {
      const result = await accountsStore.getState().createAccount({
        name: 'High Interest Loan',
        type: 'personal_loan',
        balanceCents: -200_000_00,
        interestRateAnnualInput: '24',
        monthlyPaymentCents: 3_000_00,
      });
      if (!result.ok) throw new Error('expected loan account creation to succeed');
      const categoryId = await createCategory('Fixed Bills', 'Personal Loan');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: result.id,
        toAccountId: null,
        categoryId,
        amountCents: 3_000_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });

      // interest = 24%/12 * 200_000_00 = 4_000_00 > 3_000_00 payment -> balance grows
      expect((await getAccount(db, result.id)).currentBalance).toBe(-201_000_00);
    });

    it('applies amortization again on a second logged payment, off the already-updated balance', async () => {
      const loanId = await createLoanAccount();
      const carLoanCategoryId = await createCategory('Fixed Bills', 'Car Loan');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: carLoanCategoryId,
        amountCents: 1_500_00,
        payee: 'Bank',
        date: '2026-05-05',
        memo: '',
        flag: null,
        cleared: false,
      });
      // After month 1: balance -99_500_00. Month 2 interest = round(99_500_00 * .01) = 995_00.
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: loanId,
        toAccountId: null,
        categoryId: carLoanCategoryId,
        amountCents: 1_500_00,
        payee: 'Bank',
        date: '2026-06-05',
        memo: '',
        flag: null,
        cleared: false,
      });

      const amortizationMonth2 = 1_500_00 - 995_00;
      expect((await getAccount(db, loanId)).currentBalance).toBe(-99_500_00 + amortizationMonth2);
    });
  });

  describe('duplicateTransaction', () => {
    it('duplicates a regular outflow as a brand-new transaction with its own effects applied', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const groceriesId = await createCategory('Needs', 'Groceries');

      const original = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: true,
      });
      if (!original.ok) throw new Error('expected creation to succeed');

      const duplicate = await transactionsStore.getState().duplicateTransaction(original.id);
      expect(duplicate.ok).toBe(true);

      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000 - 50_00 - 50_00);
      const rows = await db.select().from(transactions);
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.id !== original.id)?.cleared).toBe(false); // duplicates start unreviewed
    });

    it('duplicates a transfer as a new linked pair', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const savingsId = await createCashAccount('Savings', 0);

      const original = await transactionsStore.getState().createTransaction({
        type: 'transfer',
        accountId: checkingId,
        toAccountId: savingsId,
        categoryId: null,
        amountCents: 100_00,
        payee: '',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!original.ok) throw new Error('expected creation to succeed');

      await transactionsStore.getState().duplicateTransaction(original.id);

      expect((await getAccount(db, checkingId)).currentBalance).toBe(100_000 - 100_00 - 100_00);
      expect((await getAccount(db, savingsId)).currentBalance).toBe(100_00 + 100_00);
      expect(await db.select().from(transfers)).toHaveLength(2);
    });
  });

  describe('getTransactionFormValues', () => {
    it('resolves an outflow back into form shape, preserving its cleared status', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const groceriesId = await createCategory('Needs', 'Groceries');

      const created = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: 'weekly',
        flag: 'red',
        cleared: true,
      });
      if (!created.ok) throw new Error('expected creation to succeed');

      const values = await transactionsStore.getState().getTransactionFormValues(created.id);
      expect(values).toEqual({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: 'weekly',
        flag: 'red',
        cleared: true,
      });
    });

    it('resolves a transfer leg back into its from/to account pair', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const savingsId = await createCashAccount('Savings', 0);

      const created = await transactionsStore.getState().createTransaction({
        type: 'transfer',
        accountId: checkingId,
        toAccountId: savingsId,
        categoryId: null,
        amountCents: 100_00,
        payee: '',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!created.ok) throw new Error('expected creation to succeed');

      const values = await transactionsStore.getState().getTransactionFormValues(created.id);
      expect(values).toMatchObject({
        type: 'transfer',
        accountId: checkingId,
        toAccountId: savingsId,
        amountCents: 100_00,
      });
    });

    it('returns null for a nonexistent id (edge case)', async () => {
      expect(await transactionsStore.getState().getTransactionFormValues(999)).toBeNull();
    });
  });

  describe('setCleared', () => {
    it('toggles the cleared flag', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const groceriesId = await createCategory('Needs', 'Groceries');

      const created = await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 50_00,
        payee: 'Market',
        date: '2026-05-10',
        memo: '',
        flag: null,
        cleared: false,
      });
      if (!created.ok) throw new Error('expected creation to succeed');

      await transactionsStore.getState().setCleared(created.id, true);
      const [row] = await db.select().from(transactions).where(eq(transactions.id, created.id));
      expect(row.cleared).toBe(true);
    });
  });

  describe('filters', () => {
    it('filters by account, status, and search text', async () => {
      const checkingId = await createCashAccount('Checking', 100_000);
      const savingsId = await createCashAccount('Savings', 100_000);
      const groceriesId = await createCategory('Needs', 'Groceries');

      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: checkingId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 10_00,
        payee: 'Market A',
        date: '2026-05-01',
        memo: '',
        flag: null,
        cleared: true,
      });
      await transactionsStore.getState().createTransaction({
        type: 'outflow',
        accountId: savingsId,
        toAccountId: null,
        categoryId: groceriesId,
        amountCents: 20_00,
        payee: 'Market B',
        date: '2026-05-02',
        memo: '',
        flag: null,
        cleared: false,
      });

      transactionsStore.getState().setFilters({ accountIds: [checkingId] });
      await transactionsStore.getState().fetchTransactions();
      expect(transactionsStore.getState().transactions).toHaveLength(1);
      expect(transactionsStore.getState().transactions[0].payee).toBe('Market A');

      transactionsStore.getState().setFilters({ status: 'uncleared' });
      await transactionsStore.getState().fetchTransactions();
      expect(transactionsStore.getState().transactions).toHaveLength(1);
      expect(transactionsStore.getState().transactions[0].payee).toBe('Market B');

      transactionsStore.getState().setFilters({ searchText: 'Market A' });
      await transactionsStore.getState().fetchTransactions();
      expect(transactionsStore.getState().transactions).toHaveLength(1);
    });
  });
});
