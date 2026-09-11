import { applyLoanPayment } from '../loanPayment';

describe('applyLoanPayment', () => {
  it('amortizes a normal payment, converting to/from the stored negative-debt convention', () => {
    // -R$100,000.00 owed, 12% annual, R$1,500.00/month payment (same fixture as loanAmortization's test)
    const result = applyLoanPayment({
      currentBalance: -100_000_00,
      interestRateAnnual: 12,
      monthlyPayment: 1_500_00,
    });

    expect(result).toEqual({
      interest: 1_000_00,
      amortization: 500_00,
      newBalance: -99_500_00,
    });
  });

  it('handles the first payment directly off the initial (negative) balance', () => {
    const result = applyLoanPayment({
      currentBalance: -50_000_00,
      interestRateAnnual: 6,
      monthlyPayment: 1_000_00,
    });

    expect(result.newBalance).toBe(-49_250_00);
  });

  it('a payment that does not cover interest makes the debt grow (more negative)', () => {
    const result = applyLoanPayment({
      currentBalance: -200_000_00,
      interestRateAnnual: 24,
      monthlyPayment: 3_000_00,
    });

    expect(result.amortization).toBe(-1_000_00);
    expect(result.newBalance).toBe(-201_000_00);
  });

  it('floors the balance at 0 (not positive) when the final payment overshoots what is owed', () => {
    const result = applyLoanPayment({
      currentBalance: -100_00,
      interestRateAnnual: 5,
      monthlyPayment: 500_00,
    });

    expect(result.newBalance).toBe(0);
    expect(Object.is(result.newBalance, -0)).toBe(false); // not negative zero either
  });

  it('treats a 0 balance (already paid off) as no further amortization needed (edge case)', () => {
    const result = applyLoanPayment({
      currentBalance: 0,
      interestRateAnnual: 5,
      monthlyPayment: 500_00,
    });
    expect(result.interest).toBe(0);
    expect(result.newBalance).toBe(0);
  });
});
