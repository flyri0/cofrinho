// see technical-specification.md §8.1
export interface ReadyToAssignInput {
  /** Cents. Cumulative sum of inflows classified as Income in budget accounts, across all months. */
  totalIncome: number;
  /** Cents. Cumulative sum of amounts assigned to categories, across all months. */
  totalAssigned: number;
}

export function calculateReadyToAssign({ totalIncome, totalAssigned }: ReadyToAssignInput): number {
  return totalIncome - totalAssigned;
}
