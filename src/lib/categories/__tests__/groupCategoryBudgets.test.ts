import { groupCategoryBudgets } from '../groupCategoryBudgets';

describe('groupCategoryBudgets', () => {
  const groups = [
    { id: 2, sortOrder: 1 },
    { id: 1, sortOrder: 0 },
  ];
  const categories = [
    { id: 20, groupId: 1, sortOrder: 1 },
    { id: 10, groupId: 1, sortOrder: 0 },
    { id: 30, groupId: 2, sortOrder: 0 },
  ];

  it('sorts groups and their categories by sortOrder and totals assigned/available per group', () => {
    const numbers = {
      10: { assigned: 5_00, activity: -2_00, available: 3_00, target: null },
      20: { assigned: 10_00, activity: 0, available: 10_00, target: 10_00 },
      30: { assigned: -4_00, activity: 0, available: -4_00, target: null }, // e.g. after a "cover" transfer
    };

    const result = groupCategoryBudgets(groups, categories, numbers);

    expect(result.map((g) => g.group.id)).toEqual([1, 2]);
    expect(result[0].categories.map((c) => c.id)).toEqual([10, 20]);
    expect(result[0].assignedTotal).toBe(15_00);
    expect(result[0].availableTotal).toBe(13_00);
    expect(result[1].assignedTotal).toBe(-4_00);
  });

  it('returns an empty array when there are no groups yet (first run)', () => {
    expect(groupCategoryBudgets([], [], {})).toEqual([]);
  });

  it('defaults missing numbers to 0 instead of throwing (edge case)', () => {
    const result = groupCategoryBudgets(groups, categories, {});
    expect(result[0].assignedTotal).toBe(0);
    expect(result[0].availableTotal).toBe(0);
  });

  it('omits a group with no categories', () => {
    const result = groupCategoryBudgets([{ id: 99, sortOrder: 0 }], [], {});
    expect(result).toEqual([]);
  });
});
