import { computeReorderSwap } from '../reorder';

describe('computeReorderSwap', () => {
  const items = [
    { id: 1, sortOrder: 0 },
    { id: 2, sortOrder: 1 },
    { id: 3, sortOrder: 2 },
  ];

  it('swaps with the previous item when moving up', () => {
    expect(computeReorderSwap(items, 2, 'up')).toEqual([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
  });

  it('swaps with the next item when moving down', () => {
    expect(computeReorderSwap(items, 2, 'down')).toEqual([
      { id: 2, sortOrder: 2 },
      { id: 3, sortOrder: 1 },
    ]);
  });

  it('returns null when moving the first item up (edge case: top boundary)', () => {
    expect(computeReorderSwap(items, 1, 'up')).toBeNull();
  });

  it('returns null when moving the last item down (edge case: bottom boundary)', () => {
    expect(computeReorderSwap(items, 3, 'down')).toBeNull();
  });

  it('returns null for an unknown id (edge case)', () => {
    expect(computeReorderSwap(items, 999, 'up')).toBeNull();
  });

  it('returns null for a single-item list', () => {
    expect(computeReorderSwap([{ id: 1, sortOrder: 0 }], 1, 'up')).toBeNull();
    expect(computeReorderSwap([{ id: 1, sortOrder: 0 }], 1, 'down')).toBeNull();
  });
});
