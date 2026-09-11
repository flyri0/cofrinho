// see technical-specification.md §2.4/§7.3/§7.4 — the "Payment — [Card]" system
// category's assigned amount, for one month, is entirely system-managed: it's
// always recomputed from scratch as (card spending categorized this month) minus
// (payments made toward the card this month), never edited incrementally. This
// keeps it self-correcting — no drift risk from create/edit/delete of transactions.
export function calculateCreditCardPaymentAssigned({
  totalSpending,
  totalPayments,
}: {
  totalSpending: number;
  totalPayments: number;
}): number {
  return totalSpending - totalPayments;
}
