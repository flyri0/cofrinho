// see technical-specification.md §8.2
export interface CategoryAvailableInput {
  /** Cents. The category's available balance at the end of the previous month; 0 for the category's first month. */
  previousAvailable: number;
  /** Cents. Amount assigned to the category this month. */
  assigned: number;
  /** Cents. Sum of this month's transactions in the category (already negative when it's spending). */
  activity: number;
}

export function calculateCategoryAvailable({
  previousAvailable,
  assigned,
  activity,
}: CategoryAvailableInput): number {
  return previousAvailable + assigned + activity;
}
