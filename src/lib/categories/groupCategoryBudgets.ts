export interface CategoryNumbers {
  assigned: number;
  activity: number;
  available: number;
  /** category_month_budgets.target_amount for the selected month; null if unset. */
  target: number | null;
}

export interface CategoryGroupBudget<TGroup, TCategory> {
  group: TGroup;
  categories: TCategory[];
  assignedTotal: number;
  availableTotal: number;
}

// see technical-specification.md §5.3 — "collapsible category groups, each
// showing the group's total assigned/available". Groups with no (active)
// categories are omitted — there's nothing to assign money to on this screen.
export function groupCategoryBudgets<
  TGroup extends { id: number; sortOrder: number },
  TCategory extends { id: number; groupId: number; sortOrder: number },
>(
  groups: TGroup[],
  categories: TCategory[],
  numbersByCategory: Record<number, CategoryNumbers>,
): CategoryGroupBudget<TGroup, TCategory>[] {
  return groups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => {
      const categoriesInGroup = categories
        .filter((category) => category.groupId === group.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const assignedTotal = categoriesInGroup.reduce(
        (sum, category) => sum + (numbersByCategory[category.id]?.assigned ?? 0),
        0,
      );
      const availableTotal = categoriesInGroup.reduce(
        (sum, category) => sum + (numbersByCategory[category.id]?.available ?? 0),
        0,
      );

      return { group, categories: categoriesInGroup, assignedTotal, availableTotal };
    })
    .filter((group) => group.categories.length > 0);
}
