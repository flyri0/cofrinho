import { eq } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { accountLoanDetails, accounts, type AccountType } from '@/db/schema';
import {
  buildAccountLoanDetailsRecord,
  buildAccountRecordUpdate,
  buildNewAccountRecord,
  isAccountFormValid,
  isLoanAccountType,
  validateAccountForm,
  type AccountFormErrors,
} from '@/src/lib/accounts';

export type AccountRow = typeof accounts.$inferSelect;
export type AccountLoanDetailsRow = typeof accountLoanDetails.$inferSelect;

export interface AccountWithLoanDetails extends AccountRow {
  loanDetails: AccountLoanDetailsRow | null;
}

export interface AccountFormInput {
  name: string;
  type: AccountType;
  interestRateAnnualInput: string;
  monthlyPaymentCents: number;
}

export interface NewAccountFormInput extends AccountFormInput {
  balanceCents: number;
}

export type AccountMutationResult =
  { ok: true; id: number } | { ok: false; errors: AccountFormErrors };

export interface AccountsState {
  accounts: AccountRow[];
  isLoading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  getAccountWithLoanDetails: (id: number) => Promise<AccountWithLoanDetails | null>;
  createAccount: (input: NewAccountFormInput) => Promise<AccountMutationResult>;
  updateAccount: (id: number, input: AccountFormInput) => Promise<AccountMutationResult>;
  archiveAccount: (id: number) => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function syncLoanDetails(
  db: AppDatabase,
  accountId: number,
  input: AccountFormInput,
): Promise<void> {
  const [existing] = await db
    .select({ accountId: accountLoanDetails.accountId })
    .from(accountLoanDetails)
    .where(eq(accountLoanDetails.accountId, accountId))
    .limit(1);

  if (!isLoanAccountType(input.type)) {
    if (existing) {
      await db.delete(accountLoanDetails).where(eq(accountLoanDetails.accountId, accountId));
    }
    return;
  }

  const loanDetails = buildAccountLoanDetailsRecord(input);
  if (!loanDetails) return; // validated upstream; defensive no-op if it ever slips through

  if (existing) {
    await db
      .update(accountLoanDetails)
      .set(loanDetails)
      .where(eq(accountLoanDetails.accountId, accountId));
  } else {
    await db.insert(accountLoanDetails).values({ accountId, ...loanDetails });
  }
}

// Factory (see budgetStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createAccountsStore(db: AppDatabase): UseBoundStore<StoreApi<AccountsState>> {
  return create<AccountsState>((set, get) => ({
    accounts: [],
    isLoading: false,
    error: null,

    fetchAccounts: async () => {
      set({ isLoading: true, error: null });
      try {
        const rows = await db.select().from(accounts).where(eq(accounts.archived, false));
        rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
        set({ accounts: rows, isLoading: false });
      } catch (error) {
        set({ error: toErrorMessage(error), isLoading: false });
      }
    },

    getAccountWithLoanDetails: async (id) => {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
      if (!account) return null;

      const [loanDetails] = await db
        .select()
        .from(accountLoanDetails)
        .where(eq(accountLoanDetails.accountId, id))
        .limit(1);

      return { ...account, loanDetails: loanDetails ?? null };
    },

    createAccount: async (input) => {
      const errors = validateAccountForm(input);
      if (!isAccountFormValid(errors)) return { ok: false, errors };

      const nextSortOrder = get().accounts.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1;
      const record = buildNewAccountRecord(input, nextSortOrder);
      const [inserted] = await db.insert(accounts).values(record).returning({ id: accounts.id });

      await syncLoanDetails(db, inserted.id, input);
      await get().fetchAccounts();

      return { ok: true, id: inserted.id };
    },

    updateAccount: async (id, input) => {
      const errors = validateAccountForm(input);
      if (!isAccountFormValid(errors)) return { ok: false, errors };

      const update = buildAccountRecordUpdate(input);
      await db.update(accounts).set(update).where(eq(accounts.id, id));
      await syncLoanDetails(db, id, input);
      await get().fetchAccounts();

      return { ok: true, id };
    },

    archiveAccount: async (id) => {
      await db.update(accounts).set({ archived: true }).where(eq(accounts.id, id));
      await get().fetchAccounts();
    },
  }));
}
