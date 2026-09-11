import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { accountLoanDetails, accounts } from '@/db/schema';

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
});
