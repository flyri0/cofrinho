import { isTransferLikeType, signedAmountForType } from '../transactionType';

describe('isTransferLikeType', () => {
  it('is true for transfer and credit_card_payment, false for outflow/inflow', () => {
    expect(isTransferLikeType('transfer')).toBe(true);
    expect(isTransferLikeType('credit_card_payment')).toBe(true);
    expect(isTransferLikeType('outflow')).toBe(false);
    expect(isTransferLikeType('inflow')).toBe(false);
  });
});

describe('signedAmountForType', () => {
  it('negates the amount for outflow', () => {
    expect(signedAmountForType('outflow', 5_000)).toBe(-5_000);
  });

  it('keeps inflow, transfer, and credit_card_payment amounts positive', () => {
    expect(signedAmountForType('inflow', 5_000)).toBe(5_000);
    expect(signedAmountForType('transfer', 5_000)).toBe(5_000);
    expect(signedAmountForType('credit_card_payment', 5_000)).toBe(5_000);
  });
});
