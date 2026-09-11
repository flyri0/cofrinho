// see technical-specification.md §5.1 step 3 — "offers a suggested (editable) set
// instead of a blank screen"; §2.3 gives "Fixed Bills," "Needs," "Wants" as example
// group names. `key` is a stable identifier for the suggestion (i18n key + React key),
// not a database id — the actual group/category rows are created fresh on selection.
export interface SuggestedCategory {
  key: string;
  icon: string;
}

export interface SuggestedGroup {
  key: string;
  categories: SuggestedCategory[];
}

export const SUGGESTED_CATEGORY_GROUPS: readonly SuggestedGroup[] = [
  {
    key: 'fixedBills',
    categories: [
      { key: 'rent', icon: '🏠' },
      { key: 'electricity', icon: '⚡' },
      { key: 'water', icon: '🚰' },
      { key: 'internet', icon: '🌐' },
      { key: 'phone', icon: '📱' },
    ],
  },
  {
    key: 'needs',
    categories: [
      { key: 'groceries', icon: '🛒' },
      { key: 'transportation', icon: '🚌' },
      { key: 'health', icon: '💊' },
    ],
  },
  {
    key: 'lifestyle',
    categories: [
      { key: 'diningOut', icon: '🍔' },
      { key: 'entertainment', icon: '🎬' },
      { key: 'subscriptions', icon: '📺' },
      { key: 'shopping', icon: '🛍️' },
    ],
  },
  {
    key: 'goals',
    categories: [
      { key: 'emergencyFund', icon: '🛟' },
      { key: 'vacation', icon: '✈️' },
    ],
  },
];

export function allSuggestedCategoryKeys(
  groups: readonly SuggestedGroup[] = SUGGESTED_CATEGORY_GROUPS,
): string[] {
  return groups.flatMap((group) => group.categories.map((category) => category.key));
}

export interface BuiltSuggestedCategoryGroup {
  name: string;
  categories: { name: string; icon: string }[];
}

// Selection is per-category (checkbox per suggested category, §5.1); a group is
// only created if at least one of its categories ended up selected.
export function buildSelectedSuggestions(
  groups: readonly SuggestedGroup[],
  selectedCategoryKeys: ReadonlySet<string>,
  translateGroupName: (key: string) => string,
  translateCategoryName: (key: string) => string,
): BuiltSuggestedCategoryGroup[] {
  return groups
    .map((group) => ({
      name: translateGroupName(group.key),
      categories: group.categories
        .filter((category) => selectedCategoryKeys.has(category.key))
        .map((category) => ({ name: translateCategoryName(category.key), icon: category.icon })),
    }))
    .filter((group) => group.categories.length > 0);
}
