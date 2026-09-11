// see technical-specification.md §5.8 — the 4 transaction types a user picks from.
export const TRANSACTION_TYPES = ['outflow', 'inflow', 'transfer', 'credit_card_payment'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransferLikeType(type: TransactionType): boolean {
  return type === 'transfer' || type === 'credit_card_payment';
}

// Outflow -> negative, everything else the user enters as a positive transfer/inflow amount.
export function signedAmountForType(type: TransactionType, amountCents: number): number {
  return type === 'outflow' ? -amountCents : amountCents;
}
