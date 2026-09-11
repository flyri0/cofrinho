// see technical-specification.md §5.3 — "progress bar proportional to spending"
// Returns a ratio of assigned-that-has-been-spent; can exceed 1 when overspent
// (the UI clamps the bar width but may use the raw value to flag overspend).
export function calculateCategorySpentRatio({
  assigned,
  activity,
}: {
  assigned: number;
  activity: number;
}): number {
  const spent = Math.max(0, -activity); // activity is negative when it's spending

  if (assigned <= 0) {
    return spent > 0 ? 1 : 0;
  }

  return spent / assigned;
}
