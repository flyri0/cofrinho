import { calculateCategoryAvailable } from '../categoryAvailable';

describe('calculateCategoryAvailable', () => {
  it('rolls over the previous balance plus this month assigned plus activity for the normal case', () => {
    // R$50 left over, R$100 assigned, R$30 spent this month
    expect(
      calculateCategoryAvailable({ previousAvailable: 5_000, assigned: 10_000, activity: -3_000 }),
    ).toBe(12_000);
  });

  it("treats the category's first month as having 0 previous available", () => {
    expect(
      calculateCategoryAvailable({ previousAvailable: 0, assigned: 10_000, activity: -4_000 }),
    ).toBe(6_000);
  });

  it('goes negative (overspent) when activity exceeds available plus assigned', () => {
    expect(
      calculateCategoryAvailable({ previousAvailable: 0, assigned: 5_000, activity: -8_000 }),
    ).toBe(-3_000);
  });

  it('rolls a prior deficit into the next month, reducing what is available', () => {
    // last month ended at -20, nothing assigned or spent yet this month
    expect(
      calculateCategoryAvailable({ previousAvailable: -2_000, assigned: 0, activity: 0 }),
    ).toBe(-2_000);
  });
});
