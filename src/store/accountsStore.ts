import { and, eq } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import {
  accountLoanDetails,
  accounts,
  categories,
  categoryGroups,
  type AccountType,
} from '@/db/schema';
import {
  buildAccountLoanDetailsRecord,
  buildAccountRecordUpdate,
  buildNewAccountRecord,
  isAccountFormValid,
  isLoanAccountType,
  validateAccountForm,
  type AccountFormErrors,
} from '@/lib/accounts';
import { computeReorderSwap } from '@/lib/reorder';

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

// Names for the auto-created "Credit Card Payments" system group / "Payment — [Card]"
// category (§2.4) — callers pass these translated (i18next doesn't belong in the store).
export interface CreditCardSystemNames {
  groupName: string;
  categoryName: string;
}

const DEFAULT_CREDIT_CARD_SYSTEM_NAMES = (cardName: string): CreditCardSystemNames => ({
  groupName: 'Credit Card Payments',
  categoryName: `Payment — ${cardName}`,
});

export type AccountMutationResult =
  { ok: true; id: number } | { ok: false; errors: AccountFormErrors };

export interface AccountsState {
  accounts: AccountRow[];
  isLoading: boolean;
  error: string | null;
  /** `includeArchived` defaults to false (every existing screen's expected behavior). */
  fetchAccounts: (includeArchived?: boolean) => Promise<void>;
  getAccountWithLoanDetails: (id: number) => Promise<AccountWithLoanDetails | null>;
  createAccount: (
    input: NewAccountFormInput,
    creditCardSystemNames?: CreditCardSystemNames,
  ) => Promise<AccountMutationResult>;
  updateAccount: (id: number, input: AccountFormInput) => Promise<AccountMutationResult>;
  archiveAccount: (id: number) => Promise<void>;
  /** see technical-specification.md §6.2 — "bulk archive" in the edit-mode Accounts tab. */
  archiveAccounts: (ids: number[]) => Promise<void>;
  /** see technical-specification.md §6.2 — "drag-to-reorder"; see lib/reorder.ts for why this is up/down instead. */
  reorderAccount: (id: number, direction: 'up' | 'down') => Promise<void>;
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

// see technical-specification.md §2.4 — "System categories and the system group
// are created automatically when a credit card account is added." Scoped to
// `credit_card` specifically, not `line_of_credit` (the spec only ever discusses
// this mechanic for credit cards). A single shared "Credit Card Payments" group
// holds one "Payment — [Card]" category per card; pinned first via a negative
// sortOrder so it reliably sorts ahead of user-created groups on the Budget screen.
async function ensureCreditCardPaymentCategory(
  db: AppDatabase,
  cardAccountId: number,
  names: CreditCardSystemNames,
): Promise<void> {
  const [existingGroup] = await db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(and(eq(categoryGroups.isSystem, true), eq(categoryGroups.name, names.groupName)))
    .limit(1);

  const groupId = existingGroup
    ? existingGroup.id
    : (
        await db
          .insert(categoryGroups)
          .values({ name: names.groupName, sortOrder: -1, isSystem: true, archived: false })
          .returning({ id: categoryGroups.id })
      )[0].id;

  await db.insert(categories).values({
    groupId,
    name: names.categoryName,
    icon: '💳',
    isSystem: true,
    linkedAccountId: cardAccountId,
    sortOrder: 0,
    archived: false,
  });
}

// see technical-specification.md §2.4 — "...and removed (or archived) if the
// account is archived." Also archives the shared system group once it has no
// remaining active payment categories (i.e. this was the last credit card).
async function archiveCreditCardPaymentCategory(
  db: AppDatabase,
  cardAccountId: number,
): Promise<void> {
  const [category] = await db
    .select({ id: categories.id, groupId: categories.groupId })
    .from(categories)
    .where(and(eq(categories.linkedAccountId, cardAccountId), eq(categories.isSystem, true)))
    .limit(1);
  if (!category) return;

  await db.update(categories).set({ archived: true }).where(eq(categories.id, category.id));

  const remainingActive = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.groupId, category.groupId), eq(categories.archived, false)));

  if (remainingActive.length === 0) {
    await db
      .update(categoryGroups)
      .set({ archived: true })
      .where(eq(categoryGroups.id, category.groupId));
  }
}

// Factory (see budgetStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createAccountsStore(db: AppDatabase): UseBoundStore<StoreApi<AccountsState>> {
  return create<AccountsState>((set, get) => ({
    accounts: [],
    isLoading: false,
    error: null,

    fetchAccounts: async (includeArchived = false) => {
      set({ isLoading: true, error: null });
      try {
        const rows = includeArchived
          ? await db.select().from(accounts)
          : await db.select().from(accounts).where(eq(accounts.archived, false));
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

    createAccount: async (input, creditCardSystemNames) => {
      const errors = validateAccountForm(input);
      if (!isAccountFormValid(errors)) return { ok: false, errors };

      const nextSortOrder = get().accounts.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1;
      const record = buildNewAccountRecord(input, nextSortOrder);
      const [inserted] = await db.insert(accounts).values(record).returning({ id: accounts.id });

      await syncLoanDetails(db, inserted.id, input);

      if (input.type === 'credit_card') {
        await ensureCreditCardPaymentCategory(
          db,
          inserted.id,
          creditCardSystemNames ?? DEFAULT_CREDIT_CARD_SYSTEM_NAMES(input.name),
        );
      }

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
      const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);

      await db.update(accounts).set({ archived: true }).where(eq(accounts.id, id));

      if (account?.type === 'credit_card') {
        await archiveCreditCardPaymentCategory(db, id);
      }

      await get().fetchAccounts();
    },

    archiveAccounts: async (ids) => {
      for (const id of ids) {
        await get().archiveAccount(id);
      }
    },

    // Reorders within the account's own kind group (cash/credit/loan/tracking)
    // — those render as separate sections (§5.5), so "up/down" only makes
    // sense relative to same-kind neighbors, not the global sort order.
    reorderAccount: async (id, direction) => {
      const account = get().accounts.find((a) => a.id === id);
      if (!account) return;

      const sameKind = get()
        .accounts.filter((a) => a.categoryKind === account.categoryKind)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const swap = computeReorderSwap(sameKind, id, direction);
      if (!swap) return;

      const [first, second] = swap;
      await db
        .update(accounts)
        .set({ sortOrder: first.sortOrder })
        .where(eq(accounts.id, first.id));
      await db
        .update(accounts)
        .set({ sortOrder: second.sortOrder })
        .where(eq(accounts.id, second.id));
      await get().fetchAccounts();
    },
  }));
}
