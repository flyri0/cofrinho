import type { AccountCategoryKind, AccountType } from '@/db/schema';

// see technical-specification.md §2.2 and §5.6 — the 4-group structure used by
// both the account type picker and the accounts list's grouping/subtotals.
export const ACCOUNT_TYPE_GROUPS = [
  { kind: 'cash', types: ['checking', 'savings', 'cash'] },
  { kind: 'credit', types: ['credit_card', 'line_of_credit'] },
  {
    kind: 'loan',
    types: ['mortgage', 'auto_loan', 'student_loan', 'personal_loan', 'medical_debt', 'other_debt'],
  },
  { kind: 'tracking', types: ['asset', 'liability'] },
] as const satisfies readonly { kind: AccountCategoryKind; types: readonly AccountType[] }[];

// The canonical display order for account groups everywhere in the UI.
export const ACCOUNT_CATEGORY_KIND_ORDER: readonly AccountCategoryKind[] = ACCOUNT_TYPE_GROUPS.map(
  (group) => group.kind,
);

export function deriveAccountCategoryKind(type: AccountType): AccountCategoryKind {
  const group = ACCOUNT_TYPE_GROUPS.find((g) => (g.types as readonly AccountType[]).includes(type));
  if (!group) {
    throw new Error(`Unknown account type: ${type}`);
  }
  return group.kind;
}

// see technical-specification.md §4.2 — "true for cash/credit, false for loan/tracking"
export function isBudgetAccountKind(kind: AccountCategoryKind): boolean {
  return kind === 'cash' || kind === 'credit';
}

export function isLoanAccountType(type: AccountType): boolean {
  return deriveAccountCategoryKind(type) === 'loan';
}
