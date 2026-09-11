// see technical-specification.md §8.3
export interface LoanAmortizationInput {
  /** Cents. The loan's outstanding balance before this payment. */
  currentOutstandingBalance: number;
  /** Percent, e.g. 8.5 for 8.5% annual interest. */
  interestRateAnnual: number;
  /** Cents. The lender's required monthly payment. */
  monthlyPayment: number;
}

export interface LoanAmortizationResult {
  /** Cents. This month's estimated interest portion of the payment. */
  interest: number;
  /** Cents. This month's estimated principal portion of the payment; can be negative (negative amortization) if the payment doesn't cover interest. */
  amortization: number;
  /** Cents. The outstanding balance after applying this month's amortization; floored at 0. */
  newOutstandingBalance: number;
}

export function calculateLoanAmortization({
  currentOutstandingBalance,
  interestRateAnnual,
  monthlyPayment,
}: LoanAmortizationInput): LoanAmortizationResult {
  // Balances are integer cents, so the raw interest fraction is rounded to the
  // nearest cent (standard round-half-up) to keep every amount an integer.
  const interest = Math.round(currentOutstandingBalance * (interestRateAnnual / 12 / 100));
  const amortization = monthlyPayment - interest;
  // A final payment can amortize more than what's left outstanding; a loan can't go into credit.
  const newOutstandingBalance = Math.max(0, currentOutstandingBalance - amortization);

  return { interest, amortization, newOutstandingBalance };
}
