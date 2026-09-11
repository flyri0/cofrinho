// see technical-specification.md §5.5 — "Archive (blocked if balance ≠ 0 without explicit confirmation)"
export function accountArchiveRequiresConfirmation(currentBalance: number): boolean {
  return currentBalance !== 0;
}
