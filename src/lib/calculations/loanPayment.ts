import { calculateLoanAmortization } from './loanAmortization';

export interface LoanPaymentInput {
  /** Cents. The account's stored current_balance — negative for outstanding debt, per §4.2/net worth convention. */
  currentBalance: number;
  interestRateAnnual: number;
  monthlyPayment: number;
}

export interface LoanPaymentResult {
  interest: number;
  amortization: number;
  /** Cents. The new current_balance to store — negative for remaining debt, 0 once paid off. */
  newBalance: number;
}

// Adapts calculateLoanAmortization (which works in positive outstanding-balance
// magnitudes, per §8.3's literal formula) to this app's stored sign convention,
// where a loan's current_balance is negative debt (see netWorth.ts).
export function applyLoanPayment({
  currentBalance,
  interestRateAnnual,
  monthlyPayment,
}: LoanPaymentInput): LoanPaymentResult {
  const { interest, amortization, newOutstandingBalance } = calculateLoanAmortization({
    currentOutstandingBalance: Math.abs(currentBalance),
    interestRateAnnual,
    monthlyPayment,
  });

  // `-0` is a valid JS value but a confusing one to store/compare; normalize it away.
  const newBalance = newOutstandingBalance === 0 ? 0 : -newOutstandingBalance;

  return { interest, amortization, newBalance };
}
