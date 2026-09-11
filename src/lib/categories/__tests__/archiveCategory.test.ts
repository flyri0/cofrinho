import { categoryArchiveIsBlocked } from '../archiveCategory';

describe('categoryArchiveIsBlocked', () => {
  it('is not blocked when nothing is assigned this month', () => {
    expect(categoryArchiveIsBlocked(0)).toBe(false);
  });

  it('is blocked when a positive amount is assigned this month', () => {
    expect(categoryArchiveIsBlocked(5_000)).toBe(true);
  });

  it('is blocked even for a negative assigned amount (edge case)', () => {
    expect(categoryArchiveIsBlocked(-5_000)).toBe(true);
  });
});
