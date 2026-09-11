import { accountArchiveRequiresConfirmation } from '../archiveAccount';

describe('accountArchiveRequiresConfirmation', () => {
  it('does not require confirmation when the balance is exactly 0', () => {
    expect(accountArchiveRequiresConfirmation(0)).toBe(false);
  });

  it('requires confirmation for a positive balance', () => {
    expect(accountArchiveRequiresConfirmation(15_000)).toBe(true);
  });

  it('requires confirmation for a negative balance (debt)', () => {
    expect(accountArchiveRequiresConfirmation(-15_000)).toBe(true);
  });
});
