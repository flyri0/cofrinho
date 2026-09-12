import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { accountLoanDetails, accounts, categories, categoryGroups } from '@/db/schema';

import { createAccountsStore } from '../accountsStore';
import { createTestDatabase } from '../testDb';

describe('accountsStore', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('creates a normal cash account and reflects it in the fetched list', async () => {
    const store = createAccountsStore(db);

    const result = await store.getState().createAccount({
      name: 'Checking',
      type: 'checking',
      balanceCents: 50_000,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });

    expect(result.ok).toBe(true);
    expect(store.getState().accounts).toHaveLength(1);
    expect(store.getState().accounts[0]).toMatchObject({
      name: 'Checking',
      type: 'checking',
      categoryKind: 'cash',
      isBudgetAccount: true,
      initialBalance: 50_000,
      currentBalance: 50_000,
      archived: false,
    });
  });

  it('reports an empty list for a freshly created database (no prior accounts)', async () => {
    const store = createAccountsStore(db);
    await store.getState().fetchAccounts();
    expect(store.getState().accounts).toEqual([]);
  });

  it('rejects account creation with validation errors instead of writing to the db', async () => {
    const store = createAccountsStore(db);

    const result = await store.getState().createAccount({
      name: '  ',
      type: 'checking',
      balanceCents: 0,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });

    expect(result).toEqual({ ok: false, errors: { name: 'required' } });
    expect(store.getState().accounts).toHaveLength(0);
  });

  it('creates a loan account with its loan details row', async () => {
    const store = createAccountsStore(db);

    const result = await store.getState().createAccount({
      name: 'Car Loan',
      type: 'auto_loan',
      balanceCents: -1_500_000,
      interestRateAnnualInput: '9.5',
      monthlyPaymentCents: 80_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected creation to succeed');

    const withLoanDetails = await store.getState().getAccountWithLoanDetails(result.id);
    expect(withLoanDetails?.categoryKind).toBe('loan');
    expect(withLoanDetails?.loanDetails).toMatchObject({
      interestRateAnnual: 9.5,
      monthlyPayment: 80_000,
    });
  });

  it('edits an account without touching its balance (balance is read-only after creation)', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount({
      name: 'Checking',
      type: 'checking',
      balanceCents: 10_000,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    if (!created.ok) throw new Error('expected creation to succeed');

    const updateResult = await store.getState().updateAccount(created.id, {
      name: 'Main Checking',
      type: 'checking',
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });

    expect(updateResult.ok).toBe(true);
    const updated = store.getState().accounts.find((a) => a.id === created.id);
    expect(updated?.name).toBe('Main Checking');
    expect(updated?.currentBalance).toBe(10_000); // unchanged
    expect(updated?.initialBalance).toBe(10_000); // unchanged
  });

  it('removes loan details when editing an account away from a loan type (edge case)', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount({
      name: 'Personal Loan',
      type: 'personal_loan',
      balanceCents: -200_000,
      interestRateAnnualInput: '5',
      monthlyPaymentCents: 20_000,
    });
    if (!created.ok) throw new Error('expected creation to succeed');

    await store.getState().updateAccount(created.id, {
      name: 'Personal Loan',
      type: 'liability', // moves out of the loan group into tracking -> loanDetails should be dropped
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });

    const [remaining] = await db
      .select()
      .from(accountLoanDetails)
      .where(eq(accountLoanDetails.accountId, created.id));
    expect(remaining).toBeUndefined();
  });

  it('archives an account and excludes it from the fetched list', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount({
      name: 'Old Wallet',
      type: 'cash',
      balanceCents: 0,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    if (!created.ok) throw new Error('expected creation to succeed');

    await store.getState().archiveAccount(created.id);

    expect(store.getState().accounts).toHaveLength(0);
    const [row] = await db.select().from(accounts).where(eq(accounts.id, created.id));
    expect(row.archived).toBe(true);
  });

  it('creates the "Credit Card Payments" system group and a linked "Payment — [Card]" category for a new credit card', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount(
      {
        name: 'Nubank',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Nubank' },
    );
    if (!created.ok) throw new Error('expected creation to succeed');

    const [group] = await db
      .select()
      .from(categoryGroups)
      .where(
        and(eq(categoryGroups.isSystem, true), eq(categoryGroups.name, 'Credit Card Payments')),
      );
    expect(group).toBeDefined();
    expect(group.archived).toBe(false);

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.linkedAccountId, created.id));
    expect(category).toMatchObject({
      name: 'Payment — Nubank',
      isSystem: true,
      groupId: group.id,
      archived: false,
    });
  });

  it('reuses the same system group for a second credit card instead of duplicating it', async () => {
    const store = createAccountsStore(db);
    await store.getState().createAccount(
      {
        name: 'Nubank',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Nubank' },
    );
    await store.getState().createAccount(
      {
        name: 'Inter',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Inter' },
    );

    const groups = await db
      .select()
      .from(categoryGroups)
      .where(
        and(eq(categoryGroups.isSystem, true), eq(categoryGroups.name, 'Credit Card Payments')),
      );
    expect(groups).toHaveLength(1);

    const paymentCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.groupId, groups[0].id));
    expect(paymentCategories.map((c) => c.name).sort()).toEqual([
      'Payment — Inter',
      'Payment — Nubank',
    ]);
  });

  it('does not create a system category for a line_of_credit account (scoped to credit_card only)', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount({
      name: 'Overdraft',
      type: 'line_of_credit',
      balanceCents: 0,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    if (!created.ok) throw new Error('expected creation to succeed');

    const linked = await db
      .select()
      .from(categories)
      .where(eq(categories.linkedAccountId, created.id));
    expect(linked).toHaveLength(0);
  });

  it('archives the payment category (and the now-empty system group) when its credit card is archived', async () => {
    const store = createAccountsStore(db);
    const created = await store.getState().createAccount(
      {
        name: 'Nubank',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Nubank' },
    );
    if (!created.ok) throw new Error('expected creation to succeed');

    await store.getState().archiveAccount(created.id);

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.linkedAccountId, created.id));
    expect(category.archived).toBe(true);

    const [group] = await db
      .select()
      .from(categoryGroups)
      .where(eq(categoryGroups.id, category.groupId));
    expect(group.archived).toBe(true); // it was the only card, so the shared group is now empty too
  });

  it('keeps the system group active when another credit card still has an active payment category', async () => {
    const store = createAccountsStore(db);
    const cardA = await store.getState().createAccount(
      {
        name: 'Nubank',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Nubank' },
    );
    const cardB = await store.getState().createAccount(
      {
        name: 'Inter',
        type: 'credit_card',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      },
      { groupName: 'Credit Card Payments', categoryName: 'Payment — Inter' },
    );
    if (!cardA.ok || !cardB.ok) throw new Error('expected both cards to be created');

    await store.getState().archiveAccount(cardA.id);

    const [groupRow] = await db
      .select()
      .from(categoryGroups)
      .where(
        and(eq(categoryGroups.isSystem, true), eq(categoryGroups.name, 'Credit Card Payments')),
      );
    expect(groupRow.archived).toBe(false); // card B's payment category is still active
  });

  describe('§6.2 edit-mode Accounts tab', () => {
    it('includes archived accounts only when explicitly requested', async () => {
      const store = createAccountsStore(db);
      const created = await store.getState().createAccount({
        name: 'Old Wallet',
        type: 'cash',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      if (!created.ok) throw new Error('expected creation to succeed');
      await store.getState().archiveAccount(created.id);

      await store.getState().fetchAccounts();
      expect(store.getState().accounts).toHaveLength(0);

      await store.getState().fetchAccounts(true);
      expect(store.getState().accounts).toHaveLength(1);
      expect(store.getState().accounts[0].archived).toBe(true);
    });

    it('bulk-archives every given account id', async () => {
      const store = createAccountsStore(db);
      const a = await store.getState().createAccount({
        name: 'A',
        type: 'cash',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      const b = await store.getState().createAccount({
        name: 'B',
        type: 'cash',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      if (!a.ok || !b.ok) throw new Error('expected both accounts to be created');

      await store.getState().archiveAccounts([a.id, b.id]);

      expect(store.getState().accounts).toHaveLength(0);
      const rows = await db.select().from(accounts);
      expect(rows.every((r) => r.archived)).toBe(true);
    });

    it('reorders two accounts of the same kind', async () => {
      const store = createAccountsStore(db);
      const a = await store.getState().createAccount({
        name: 'A',
        type: 'cash',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      const b = await store.getState().createAccount({
        name: 'B',
        type: 'cash',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      if (!a.ok || !b.ok) throw new Error('expected both accounts to be created');
      expect(store.getState().accounts.map((acc) => acc.name)).toEqual(['A', 'B']);

      await store.getState().reorderAccount(b.id, 'up');

      expect(store.getState().accounts.map((acc) => acc.name)).toEqual(['B', 'A']);
    });

    it('does not reorder across different kind groups (edge case)', async () => {
      const store = createAccountsStore(db);
      const cash = await store.getState().createAccount({
        name: 'Checking',
        type: 'checking',
        balanceCents: 0,
        interestRateAnnualInput: '',
        monthlyPaymentCents: 0,
      });
      if (!cash.ok) throw new Error('expected creation to succeed');

      // Only one cash account exists, so moving it in either direction is a
      // no-op even though other-kind accounts might otherwise look adjacent
      // by raw (global) sort order.
      await store.getState().reorderAccount(cash.id, 'down');
      const [row] = await db.select().from(accounts).where(eq(accounts.id, cash.id));
      expect(row.sortOrder).toBe(0);
    });
  });
});
