// see technical-specification.md §6.2 — "drag-to-reorder groups and
// categories" / accounts. Implemented as up/down controls rather than a
// physical drag gesture: neither react-native-gesture-handler nor a
// draggable-list library is a project dependency, and adding one just for
// this would be a bigger dependency footprint than the feature warrants
// (CLAUDE.md's "Simplicity First"). Up/down buttons achieve the same
// end result — reordering persisted via `sort_order` — without it.
export interface SortableItem {
  id: number;
  sortOrder: number;
}

export interface ReorderSwap {
  id: number;
  sortOrder: number;
}

// `items` must already be sorted by sortOrder ascending. Returns the two
// items whose sortOrder should be swapped and persisted, or null if the
// move is a no-op (already at that end of the list).
export function computeReorderSwap(
  items: SortableItem[],
  itemId: number,
  direction: 'up' | 'down',
): [ReorderSwap, ReorderSwap] | null {
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return null;

  const current = items[index];
  const target = items[targetIndex];
  return [
    { id: current.id, sortOrder: target.sortOrder },
    { id: target.id, sortOrder: current.sortOrder },
  ];
}
