import { calculateSpendingBreakdown } from '../spendingBreakdown';

describe('calculateSpendingBreakdown', () => {
  it('sums spending per category and sorts descending by amount spent', () => {
    const result = calculateSpendingBreakdown([
      { categoryId: 1, amount: -50_00, isTransfer: false },
      { categoryId: 1, amount: -20_00, isTransfer: false },
      { categoryId: 2, amount: -100_00, isTransfer: false },
    ]);

    expect(result).toEqual([
      { categoryId: 2, amount: -100_00 },
      { categoryId: 1, amount: -70_00 },
    ]);
  });

  it('excludes transfers', () => {
    const result = calculateSpendingBreakdown([
      { categoryId: 1, amount: -50_00, isTransfer: true },
    ]);
    expect(result).toEqual([]);
  });

  it('excludes uncategorized transactions (Income)', () => {
    const result = calculateSpendingBreakdown([
      { categoryId: null, amount: 500_00, isTransfer: false },
    ]);
    expect(result).toEqual([]);
  });

  it('excludes a category that net-refunded to positive (edge case)', () => {
    const result = calculateSpendingBreakdown([
      { categoryId: 1, amount: -30_00, isTransfer: false },
      { categoryId: 1, amount: 50_00, isTransfer: false }, // a larger refund than the spend
    ]);
    expect(result).toEqual([]);
  });

  it('nets a partial refund against its category spending', () => {
    const result = calculateSpendingBreakdown([
      { categoryId: 1, amount: -100_00, isTransfer: false },
      { categoryId: 1, amount: 30_00, isTransfer: false },
    ]);
    expect(result).toEqual([{ categoryId: 1, amount: -70_00 }]);
  });

  it('returns an empty list for no transactions', () => {
    expect(calculateSpendingBreakdown([])).toEqual([]);
  });
});
