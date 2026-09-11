import { calculateCategorySpentRatio } from '../categoryProgress';

describe('calculateCategorySpentRatio', () => {
  it('computes a normal partial-spend ratio', () => {
    expect(calculateCategorySpentRatio({ assigned: 10_000, activity: -4_000 })).toBe(0.4);
  });

  it('is 0 for a category with no activity yet (first month)', () => {
    expect(calculateCategorySpentRatio({ assigned: 10_000, activity: 0 })).toBe(0);
  });

  it('exceeds 1 when overspent', () => {
    expect(calculateCategorySpentRatio({ assigned: 5_000, activity: -8_000 })).toBe(1.6);
  });

  it('is 1 when spending occurred with nothing assigned (edge case)', () => {
    expect(calculateCategorySpentRatio({ assigned: 0, activity: -1_000 })).toBe(1);
  });

  it('is 0 when nothing is assigned and nothing was spent', () => {
    expect(calculateCategorySpentRatio({ assigned: 0, activity: 0 })).toBe(0);
  });
});
