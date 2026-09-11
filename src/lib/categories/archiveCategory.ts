// see technical-specification.md §5.4 — "Archive (with confirmation, blocked if
// `assigned_amount` is nonzero in the current month)". Unlike account archiving,
// this is a hard block (zero out the assignment first), not an override-able confirm.
export function categoryArchiveIsBlocked(assignedThisMonth: number): boolean {
  return assignedThisMonth !== 0;
}
