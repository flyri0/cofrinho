import { calculateLoanAmortization } from '../loanAmortization';

describe('calculateLoanAmortization', () => {
  it('splits a normal payment into interest and principal', () => {
    // R$100,000.00 outstanding, 12% annual, R$1,500.00/month payment
    // interest = 100_000_00 * (12 / 12 / 100) = 1_000_00
    const result = calculateLoanAmortization({
      currentOutstandingBalance: 100_000_00,
      interestRateAnnual: 12,
      monthlyPayment: 1_500_00,
    });

    expect(result).toEqual({
      interest: 1_000_00,
      amortization: 500_00,
      newOutstandingBalance: 99_500_00,
    });
  });

  it('computes the first payment directly off the initial balance (no prior history needed)', () => {
    const result = calculateLoanAmortization({
      currentOutstandingBalance: 50_000_00, // the account's initial_balance
      interestRateAnnual: 6,
      monthlyPayment: 1_000_00,
    });

    expect(result.interest).toBe(250_00);
    expect(result.amortization).toBe(750_00);
    expect(result.newOutstandingBalance).toBe(49_250_00);
  });

  it('produces negative amortization when the payment does not cover interest', () => {
    // R$200,000.00 outstanding, 24% annual (R$4,000.00/mo interest), only R$3,000.00 paid
    const result = calculateLoanAmortization({
      currentOutstandingBalance: 200_000_00,
      interestRateAnnual: 24,
      monthlyPayment: 3_000_00,
    });

    expect(result.interest).toBe(4_000_00);
    expect(result.amortization).toBe(-1_000_00);
    expect(result.newOutstandingBalance).toBe(201_000_00);
  });

  it('floors the outstanding balance at 0 when the final payment overshoots what is owed', () => {
    const result = calculateLoanAmortization({
      currentOutstandingBalance: 100_00,
      interestRateAnnual: 5,
      monthlyPayment: 500_00,
    });

    expect(result.newOutstandingBalance).toBe(0);
  });

  it('rounds fractional cents of interest to the nearest cent', () => {
    // 10_000 * (7 / 12 / 100) = 58.33... cents -> rounds to 58
    const result = calculateLoanAmortization({
      currentOutstandingBalance: 10_000,
      interestRateAnnual: 7,
      monthlyPayment: 200,
    });

    expect(result.interest).toBe(58);
    expect(result.amortization).toBe(142);
    expect(result.newOutstandingBalance).toBe(9_858);
  });
});
