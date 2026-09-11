// see technical-specification.md §5.3 — "Cover with leftover from another category
// (moves available funds from a category with a surplus to cover the deficit)".
// `deficit` is how overspent the target category is (a positive number); `sourceAvailable`
// is the source category's current available. Moves as much as possible, never more
// than either side allows.
export function calculateCoverTransferAmount({
  deficit,
  sourceAvailable,
}: {
  deficit: number;
  sourceAvailable: number;
}): number {
  return Math.max(0, Math.min(deficit, sourceAvailable));
}
