import { calculateCoverTransferAmount } from '../coverOverspending';

describe('calculateCoverTransferAmount', () => {
  it('covers the full deficit when the source has enough surplus', () => {
    expect(calculateCoverTransferAmount({ deficit: 3_000, sourceAvailable: 10_000 })).toBe(3_000);
  });

  it('covers only what the source can spare (first/only surplus available)', () => {
    expect(calculateCoverTransferAmount({ deficit: 3_000, sourceAvailable: 1_000 })).toBe(1_000);
  });

  it('transfers nothing when the source has no surplus at all', () => {
    expect(calculateCoverTransferAmount({ deficit: 3_000, sourceAvailable: 0 })).toBe(0);
  });

  it('transfers nothing when the source is itself negative (edge case)', () => {
    expect(calculateCoverTransferAmount({ deficit: 3_000, sourceAvailable: -500 })).toBe(0);
  });
});
