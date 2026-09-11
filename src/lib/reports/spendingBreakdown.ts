// see technical-specification.md §5.9 — "by category, for the selected period,
// listed in descending order by amount". Mirrors §2.3's Activity definition
// (net sum of a category's transactions, refunds included) just grouped over an
// arbitrary period instead of a single month.
export interface SpendingBreakdownTransaction {
  categoryId: number | null;
  amount: number;
  isTransfer: boolean;
}

export interface SpendingBreakdownEntry {
  categoryId: number;
  /** Cents; always negative (only categories with net spending are included). */
  amount: number;
}

export function calculateSpendingBreakdown(
  transactionsInPeriod: SpendingBreakdownTransaction[],
): SpendingBreakdownEntry[] {
  const totals = new Map<number, number>();

  for (const transaction of transactionsInPeriod) {
    if (transaction.isTransfer || transaction.categoryId === null) continue;
    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  return [...totals.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .filter((entry) => entry.amount < 0) // a category that net-refunded isn't "spending"
    .sort((a, b) => a.amount - b.amount); // most negative (biggest spend) first
}
