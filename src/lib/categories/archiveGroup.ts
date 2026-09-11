// see technical-specification.md §5.3 — "archive group (only if every category
// inside is already archived)"
export function canArchiveGroup(categoriesInGroup: { archived: boolean }[]): boolean {
  return categoriesInGroup.every((category) => category.archived);
}
