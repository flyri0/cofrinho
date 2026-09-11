import { canArchiveGroup } from '../archiveGroup';

describe('canArchiveGroup', () => {
  it('allows archiving when every category is already archived', () => {
    expect(canArchiveGroup([{ archived: true }, { archived: true }])).toBe(true);
  });

  it('blocks archiving when at least one category is still active', () => {
    expect(canArchiveGroup([{ archived: true }, { archived: false }])).toBe(false);
  });

  it('allows archiving an empty group (no categories at all)', () => {
    expect(canArchiveGroup([])).toBe(true);
  });
});
