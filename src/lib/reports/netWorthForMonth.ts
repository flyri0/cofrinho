import type { AccountCategoryKind } from '@/db/schema';

import { calculateNetWorth } from '@/lib/calculations';

// see technical-specification.md §8.4 and transactionsStore.ts's recomputeAccountBalance.
// Cash/credit/tracking balances are always derivable from history (initial +
// Σtransactions up to a given date), so a past month's balance is reconstructed
// the same way the current balance is. Loan balances are NOT derivable this way —
// amortization is applied step-by-step on payment, not as a pure function of the
// ledger (see transactionsStore.ts's applyLoanAmortizationForPayment) — so there is
// no way to know a loan's true outstanding balance as of a past month from today's
// data. Known limitation: loan accounts use their CURRENT balance for every month
// in the trend, i.e. their contribution to net worth is shown flat, not historical.
export interface NetWorthTrendAccountSnapshot {
  categoryKind: AccountCategoryKind;
  initialBalance: number;
  currentBalance: number;
  /** Cents; signed sum of this account's transactions up to and including the target month-end. */
  cumulativeTransactionTotal: number;
}

export function calculateNetWorthForMonth(accounts: NetWorthTrendAccountSnapshot[]): number {
  return calculateNetWorth(
    accounts.map((account) => ({
      balance:
        account.categoryKind === 'loan'
          ? account.currentBalance
          : account.initialBalance + account.cumulativeTransactionTotal,
    })),
  );
}
