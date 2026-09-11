import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { accountLoanDetails, accounts, categories, transactions, transfers } from '@/db/schema';
import { applyLoanPayment } from '@/src/lib/calculations';
import { calculateCreditCardPaymentAssigned } from '@/src/lib/creditCard';
import {
  buildRegularTransactionRecord,
  buildTransferLegs,
  isTransactionFormValid,
  isTransferLikeType,
  validateTransactionForm,
  type TransactionFormErrors,
  type TransactionType,
} from '@/src/lib/transactions';

import { upsertMonthBudget } from './monthBudgetStore';

export type TransactionRow = typeof transactions.$inferSelect;

export interface TransactionFilters {
  accountIds?: number[];
  categoryIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  status?: 'all' | 'cleared' | 'uncleared';
  searchText?: string;
}

export interface TransactionInput {
  type: TransactionType;
  accountId: number | null;
  toAccountId: number | null;
  categoryId: number | null;
  amountCents: number;
  payee: string;
  date: string;
  memo: string;
  flag: string | null;
  cleared: boolean;
}

export type TransactionMutationResult =
  { ok: true; id: number } | { ok: false; errors: TransactionFormErrors };

export interface TransactionsState {
  transactions: TransactionRow[];
  filters: TransactionFilters;
  isLoading: boolean;
  error: string | null;
  setFilters: (filters: TransactionFilters) => void;
  fetchTransactions: () => Promise<void>;
  fetchPayeeSuggestions: (query: string) => Promise<string[]>;
  /** Form-shaped values for editing an existing transaction (resolves its transfer pair, if any). */
  getTransactionFormValues: (id: number) => Promise<TransactionInput | null>;
  createTransaction: (input: TransactionInput) => Promise<TransactionMutationResult>;
  updateTransaction: (id: number, input: TransactionInput) => Promise<TransactionMutationResult>;
  deleteTransaction: (id: number) => Promise<void>;
  duplicateTransaction: (id: number) => Promise<TransactionMutationResult>;
  setCleared: (id: number, cleared: boolean) => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

// Cash/credit balances are always recomputed from scratch (initial + Σtransactions) —
// self-correcting, no drift. Loan balances are NEVER touched here: they're driven
// solely by applyLoanAmortizationForPayment below, per §2.5/§8.3.
async function recomputeAccountBalance(db: AppDatabase, accountId: number): Promise<void> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account || account.categoryKind === 'loan') return;

  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  await db
    .update(accounts)
    .set({ currentBalance: account.initialBalance + Number(total) })
    .where(eq(accounts.id, accountId));
}

// see technical-specification.md §2.5/§8.3 — runs once per logged outflow against
// a loan account; does NOT recompute from the transaction history (amortization is
// path-dependent, not a pure function of the ledger — see the commit message for
// the known limitation this implies for editing/deleting a loan payment).
async function applyLoanAmortizationForPayment(
  db: AppDatabase,
  loanAccountId: number,
): Promise<void> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, loanAccountId)).limit(1);
  if (!account || account.categoryKind !== 'loan') return;

  const [loanDetails] = await db
    .select()
    .from(accountLoanDetails)
    .where(eq(accountLoanDetails.accountId, loanAccountId))
    .limit(1);
  if (!loanDetails) return; // defensive; every loan account should have one

  const { newBalance } = applyLoanPayment({
    currentBalance: account.currentBalance,
    interestRateAnnual: loanDetails.interestRateAnnual,
    monthlyPayment: loanDetails.monthlyPayment,
  });

  await db
    .update(accounts)
    .set({ currentBalance: newBalance })
    .where(eq(accounts.id, loanAccountId));
}

async function findCreditCardPaymentCategoryId(
  db: AppDatabase,
  cardAccountId: number,
): Promise<number | null> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.linkedAccountId, cardAccountId), eq(categories.isSystem, true)))
    .limit(1);
  return category?.id ?? null;
}

// see technical-specification.md §2.4/§7.3/§7.4 — always a full recompute for the
// given card+month, never an incremental delta (see creditCardPayment.ts for why).
async function recomputeCreditCardPaymentAssignedForMonth(
  db: AppDatabase,
  cardAccountId: number,
  month: string,
): Promise<void> {
  const paymentCategoryId = await findCreditCardPaymentCategoryId(db, cardAccountId);
  if (paymentCategoryId === null) return; // not a properly-set-up credit card; nothing to do

  const [{ spendingTotal }] = await db
    .select({ spendingTotal: sql<number>`coalesce(sum(-${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, cardAccountId),
        isNotNull(transactions.categoryId),
        ne(transactions.categoryId, paymentCategoryId),
        eq(transactions.isTransfer, false),
        sql`substr(${transactions.date}, 1, 7) = ${month}`,
      ),
    );

  const [{ paymentsTotal }] = await db
    .select({ paymentsTotal: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, cardAccountId),
        eq(transactions.isTransfer, true),
        gt(transactions.amount, 0), // the inflow leg = money arriving at the card = a payment
        sql`substr(${transactions.date}, 1, 7) = ${month}`,
      ),
    );

  const assignedAmount = calculateCreditCardPaymentAssigned({
    totalSpending: Number(spendingTotal),
    totalPayments: Number(paymentsTotal),
  });

  await upsertMonthBudget(db, paymentCategoryId, month, { assignedAmount });
}

// Inserts the transaction row(s) for any of the 4 types and applies every
// downstream effect (balances, loan amortization, credit card recompute).
// Assumes `values` has already passed validateTransactionForm.
async function insertTransactionEffects(
  db: AppDatabase,
  values: TransactionInput,
): Promise<{ id: number }> {
  const accountId = values.accountId as number;

  if (isTransferLikeType(values.type)) {
    const toAccountId = values.toAccountId as number;
    const legs = buildTransferLegs({ accountId, toAccountId, amountCents: values.amountCents });
    const memo = values.memo.trim() || null;
    const payee = values.payee.trim() || null;

    const [transferRow] = await db
      .insert(transfers)
      .values({
        fromAccountId: accountId,
        toAccountId,
        amount: values.amountCents,
        date: values.date,
        memo,
      })
      .returning({ id: transfers.id });

    const [fromRow] = await db
      .insert(transactions)
      .values({
        accountId: legs.fromLeg.accountId,
        categoryId: null,
        amount: legs.fromLeg.amount,
        payee,
        date: values.date,
        memo,
        flag: values.flag,
        cleared: values.cleared,
        isTransfer: true,
        transferId: transferRow.id,
      })
      .returning({ id: transactions.id });

    await db.insert(transactions).values({
      accountId: legs.toLeg.accountId,
      categoryId: null,
      amount: legs.toLeg.amount,
      payee,
      date: values.date,
      memo,
      flag: values.flag,
      cleared: values.cleared,
      isTransfer: true,
      transferId: transferRow.id,
    });

    await recomputeAccountBalance(db, accountId);
    await recomputeAccountBalance(db, toAccountId);

    // A transfer landing on a credit card pays it down, regardless of whether the
    // user picked "Transfer" or "Credit Card Payment" — §5.8 frames the latter as
    // just a pre-filled convenience over the former, not a distinct DB operation.
    const [toAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, toAccountId))
      .limit(1);
    if (toAccount?.categoryKind === 'credit') {
      await recomputeCreditCardPaymentAssignedForMonth(db, toAccountId, monthOf(values.date));
    }

    return { id: fromRow.id };
  }

  const record = buildRegularTransactionRecord({
    type: values.type,
    accountId,
    categoryId: values.categoryId,
    amountCents: values.amountCents,
    payee: values.payee,
    date: values.date,
    memo: values.memo,
    flag: values.flag,
    cleared: values.cleared,
  });
  const [inserted] = await db
    .insert(transactions)
    .values(record)
    .returning({ id: transactions.id });

  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

  if (values.type === 'outflow' && account?.categoryKind === 'loan') {
    await applyLoanAmortizationForPayment(db, accountId);
  } else {
    await recomputeAccountBalance(db, accountId);
  }

  if (account?.categoryKind === 'credit' && values.categoryId !== null) {
    await recomputeCreditCardPaymentAssignedForMonth(db, accountId, monthOf(values.date));
  }

  return { id: inserted.id };
}

// Deletes a transaction (both legs, if it's a transfer) and reverses its effects
// by recomputing every account/category it touched — never an incremental undo.
async function removeTransactionEffects(db: AppDatabase, transactionId: number): Promise<void> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);
  if (!row) return;

  if (row.transferId !== null) {
    const legs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transferId, row.transferId));
    const accountIds = [...new Set(legs.map((leg) => leg.accountId))];
    const month = monthOf(row.date);

    await db.delete(transactions).where(eq(transactions.transferId, row.transferId));
    await db.delete(transfers).where(eq(transfers.id, row.transferId));

    for (const accountId of accountIds) {
      await recomputeAccountBalance(db, accountId);
      const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
      if (account?.categoryKind === 'credit') {
        await recomputeCreditCardPaymentAssignedForMonth(db, accountId, month);
      }
    }
    return;
  }

  const [account] = await db.select().from(accounts).where(eq(accounts.id, row.accountId)).limit(1);
  await db.delete(transactions).where(eq(transactions.id, transactionId));

  await recomputeAccountBalance(db, row.accountId); // no-op for loan accounts, by design

  if (account?.categoryKind === 'credit' && row.categoryId !== null) {
    await recomputeCreditCardPaymentAssignedForMonth(db, row.accountId, monthOf(row.date));
  }
}

// `cleared` is preserved when loading a transaction for editing, but forced to
// false when duplicating (a duplicate is new and unreviewed either way).
function toTransactionInput(
  row: TransactionRow,
  transferRow: typeof transfers.$inferSelect | undefined,
  cleared: boolean,
): TransactionInput {
  if (row.isTransfer && transferRow) {
    return {
      type: 'transfer',
      accountId: transferRow.fromAccountId,
      toAccountId: transferRow.toAccountId,
      categoryId: null,
      amountCents: transferRow.amount,
      payee: row.payee ?? '',
      date: row.date,
      memo: row.memo ?? '',
      flag: row.flag,
      cleared,
    };
  }

  return {
    type: row.amount < 0 ? 'outflow' : 'inflow',
    accountId: row.accountId,
    toAccountId: null,
    categoryId: row.categoryId,
    amountCents: Math.abs(row.amount),
    payee: row.payee ?? '',
    date: row.date,
    memo: row.memo ?? '',
    flag: row.flag,
    cleared,
  };
}

async function loadTransferRowFor(
  db: AppDatabase,
  row: TransactionRow,
): Promise<typeof transfers.$inferSelect | undefined> {
  if (!row.isTransfer || row.transferId === null) return undefined;
  const [transferRow] = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, row.transferId))
    .limit(1);
  return transferRow;
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createTransactionsStore(
  db: AppDatabase,
): UseBoundStore<StoreApi<TransactionsState>> {
  return create<TransactionsState>((set, get) => ({
    transactions: [],
    filters: {},
    isLoading: false,
    error: null,

    setFilters: (filters) => set({ filters }),

    fetchTransactions: async () => {
      set({ isLoading: true, error: null });
      try {
        const { filters } = get();
        const conditions: SQL[] = [];

        if (filters.accountIds?.length)
          conditions.push(inArray(transactions.accountId, filters.accountIds));
        if (filters.categoryIds?.length)
          conditions.push(inArray(transactions.categoryId, filters.categoryIds));
        if (filters.dateFrom) conditions.push(gte(transactions.date, filters.dateFrom));
        if (filters.dateTo) conditions.push(lte(transactions.date, filters.dateTo));
        if (filters.status === 'cleared') conditions.push(eq(transactions.cleared, true));
        if (filters.status === 'uncleared') conditions.push(eq(transactions.cleared, false));
        if (filters.searchText?.trim()) {
          const term = `%${filters.searchText.trim()}%`;
          const clause = or(like(transactions.payee, term), like(transactions.memo, term));
          if (clause) conditions.push(clause);
        }

        const rows =
          conditions.length > 0
            ? await db
                .select()
                .from(transactions)
                .where(and(...conditions))
            : await db.select().from(transactions);

        rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
        set({ transactions: rows, isLoading: false });
      } catch (error) {
        set({ error: toErrorMessage(error), isLoading: false });
      }
    },

    fetchPayeeSuggestions: async (query) => {
      const term = query.trim();
      if (!term) return [];

      const rows = await db
        .select({ payee: transactions.payee })
        .from(transactions)
        .where(and(isNotNull(transactions.payee), like(transactions.payee, `%${term}%`)));

      const unique = [
        ...new Set(rows.map((row) => row.payee).filter((p): p is string => p !== null)),
      ];
      return unique.slice(0, 10);
    },

    getTransactionFormValues: async (id) => {
      const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
      if (!row) return null;

      const transferRow = await loadTransferRowFor(db, row);
      return toTransactionInput(row, transferRow, row.cleared);
    },

    createTransaction: async (input) => {
      const errors = validateTransactionForm(input);
      if (!isTransactionFormValid(errors)) return { ok: false, errors };

      const { id } = await insertTransactionEffects(db, input);
      await get().fetchTransactions();
      return { ok: true, id };
    },

    updateTransaction: async (id, input) => {
      const errors = validateTransactionForm(input);
      if (!isTransactionFormValid(errors)) return { ok: false, errors };

      await removeTransactionEffects(db, id);
      const { id: newId } = await insertTransactionEffects(db, input);
      await get().fetchTransactions();
      return { ok: true, id: newId };
    },

    deleteTransaction: async (id) => {
      await removeTransactionEffects(db, id);
      await get().fetchTransactions();
    },

    duplicateTransaction: async (id) => {
      const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
      if (!row) return { ok: false, errors: {} };

      const transferRow = await loadTransferRowFor(db, row);
      const input = toTransactionInput(row, transferRow, false); // unreviewed, regardless of the original
      const { id: newId } = await insertTransactionEffects(db, input);
      await get().fetchTransactions();
      return { ok: true, id: newId };
    },

    setCleared: async (id, cleared) => {
      await db.update(transactions).set({ cleared }).where(eq(transactions.id, id));
      await get().fetchTransactions();
    },
  }));
}
