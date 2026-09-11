import { calculateCreditCardPaymentAssigned } from '../creditCardPayment';

describe('calculateCreditCardPaymentAssigned', () => {
  it('reflects a normal month of spending with no payment yet', () => {
    expect(calculateCreditCardPaymentAssigned({ totalSpending: 150_00, totalPayments: 0 })).toBe(
      150_00,
    );
  });

  it('is 0 for a card with no spending and no payments (first month)', () => {
    expect(calculateCreditCardPaymentAssigned({ totalSpending: 0, totalPayments: 0 })).toBe(0);
  });

  it('goes negative when payments exceed spending this month (e.g. paying off a prior balance)', () => {
    expect(calculateCreditCardPaymentAssigned({ totalSpending: 20_00, totalPayments: 50_00 })).toBe(
      -30_00,
    );
  });

  it('nets to 0 when a full payment exactly matches spending', () => {
    expect(
      calculateCreditCardPaymentAssigned({ totalSpending: 100_00, totalPayments: 100_00 }),
    ).toBe(0);
  });
});
