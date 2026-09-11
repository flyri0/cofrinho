// see technical-specification.md §5.9 — "Income vs. Spending: bar chart by month".
// Income mirrors budgetStore's fetchTotalIncome definition (§2.1/§8.1): a
// positive, non-transfer, uncategorized inflow into a budget account. Spending
// is every negative, categorized transaction (any account) — the literal
// "money that left" side, independent of which category absorbed it.
export interface IncomeVsSpendingTransaction {
  month: string;
  categoryId: number | null;
  amount: number;
  isTransfer: boolean;
  isBudgetAccount: boolean;
}

export interface MonthlyIncomeVsSpending {
  month: string;
  income: number;
  /** Cents; always >= 0 (a magnitude, not a signed activity number). */
  spending: number;
}

export function calculateIncomeVsSpending(
  transactionsInPeriod: IncomeVsSpendingTransaction[],
  months: string[],
): MonthlyIncomeVsSpending[] {
  const byMonth = new Map<string, { income: number; spending: number }>();
  for (const month of months) byMonth.set(month, { income: 0, spending: 0 });

  for (const transaction of transactionsInPeriod) {
    if (transaction.isTransfer) continue;
    const bucket = byMonth.get(transaction.month);
    if (!bucket) continue; // outside the requested range

    if (transaction.categoryId === null) {
      if (transaction.amount > 0 && transaction.isBudgetAccount)
        bucket.income += transaction.amount;
    } else if (transaction.amount < 0) {
      bucket.spending += -transaction.amount;
    }
  }

  return months.map((month) => ({ month, ...byMonth.get(month)! }));
}
