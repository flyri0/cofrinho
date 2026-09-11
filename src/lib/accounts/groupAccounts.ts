import type { AccountCategoryKind } from '@/db/schema';

import { ACCOUNT_CATEGORY_KIND_ORDER } from './accountTypeGroups';

export interface AccountGroup<T> {
  kind: AccountCategoryKind;
  accounts: T[];
  subtotal: number;
}

// see technical-specification.md §5.5 — "grouped by type... each group with a subtotal"
// Groups only appear when they have at least one account, in the canonical
// Cash / Credit / Loans / Tracking order.
export function groupAccountsByKind<
  T extends { categoryKind: AccountCategoryKind; currentBalance: number },
>(accountList: T[]): AccountGroup<T>[] {
  return ACCOUNT_CATEGORY_KIND_ORDER.map((kind) => {
    const accountsInGroup = accountList.filter((account) => account.categoryKind === kind);
    return {
      kind,
      accounts: accountsInGroup,
      subtotal: accountsInGroup.reduce((sum, account) => sum + account.currentBalance, 0),
    };
  }).filter((group) => group.accounts.length > 0);
}
