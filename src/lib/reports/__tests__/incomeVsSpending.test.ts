import { calculateIncomeVsSpending } from '../incomeVsSpending';

describe('calculateIncomeVsSpending', () => {
  it('buckets income and spending per month', () => {
    const result = calculateIncomeVsSpending(
      [
        {
          month: '2026-05',
          categoryId: null,
          amount: 500_00,
          isTransfer: false,
          isBudgetAccount: true,
        },
        {
          month: '2026-05',
          categoryId: 1,
          amount: -100_00,
          isTransfer: false,
          isBudgetAccount: true,
        },
        {
          month: '2026-06',
          categoryId: 1,
          amount: -50_00,
          isTransfer: false,
          isBudgetAccount: true,
        },
      ],
      ['2026-05', '2026-06'],
    );

    expect(result).toEqual([
      { month: '2026-05', income: 500_00, spending: 100_00 },
      { month: '2026-06', income: 0, spending: 50_00 },
    ]);
  });

  it('includes months with no activity as zero (gap month)', () => {
    const result = calculateIncomeVsSpending([], ['2026-05', '2026-06', '2026-07']);
    expect(result).toEqual([
      { month: '2026-05', income: 0, spending: 0 },
      { month: '2026-06', income: 0, spending: 0 },
      { month: '2026-07', income: 0, spending: 0 },
    ]);
  });

  it('excludes transfers from both income and spending', () => {
    const result = calculateIncomeVsSpending(
      [
        {
          month: '2026-05',
          categoryId: null,
          amount: 500_00,
          isTransfer: true,
          isBudgetAccount: true,
        },
      ],
      ['2026-05'],
    );
    expect(result).toEqual([{ month: '2026-05', income: 0, spending: 0 }]);
  });

  it('excludes an uncategorized inflow into a tracking account from income', () => {
    const result = calculateIncomeVsSpending(
      [
        {
          month: '2026-05',
          categoryId: null,
          amount: 500_00,
          isTransfer: false,
          isBudgetAccount: false,
        },
      ],
      ['2026-05'],
    );
    expect(result).toEqual([{ month: '2026-05', income: 0, spending: 0 }]);
  });

  it('excludes a categorized inflow (refund) from spending, since it is not a debit', () => {
    const result = calculateIncomeVsSpending(
      [
        {
          month: '2026-05',
          categoryId: 1,
          amount: 30_00,
          isTransfer: false,
          isBudgetAccount: true,
        },
      ],
      ['2026-05'],
    );
    expect(result).toEqual([{ month: '2026-05', income: 0, spending: 0 }]);
  });

  it('drops a transaction whose month falls outside the requested range', () => {
    const result = calculateIncomeVsSpending(
      [
        {
          month: '2026-04',
          categoryId: 1,
          amount: -100_00,
          isTransfer: false,
          isBudgetAccount: true,
        },
      ],
      ['2026-05'],
    );
    expect(result).toEqual([{ month: '2026-05', income: 0, spending: 0 }]);
  });
});
