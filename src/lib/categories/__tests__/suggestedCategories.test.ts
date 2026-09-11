import {
  allSuggestedCategoryKeys,
  buildSelectedSuggestions,
  SUGGESTED_CATEGORY_GROUPS,
} from '../suggestedCategories';

const identity = (key: string) => key;

describe('buildSelectedSuggestions', () => {
  const groups = [
    {
      key: 'fixedBills',
      categories: [
        { key: 'rent', icon: '🏠' },
        { key: 'electricity', icon: '⚡' },
      ],
    },
    { key: 'needs', categories: [{ key: 'groceries', icon: '🛒' }] },
  ];

  it('includes every category selected, across all groups, for the "all checked by default" case', () => {
    const selected = new Set(['rent', 'electricity', 'groceries']);
    const result = buildSelectedSuggestions(groups, selected, identity, identity);

    expect(result).toEqual([
      {
        name: 'fixedBills',
        categories: [
          { name: 'rent', icon: '🏠' },
          { name: 'electricity', icon: '⚡' },
        ],
      },
      { name: 'needs', categories: [{ name: 'groceries', icon: '🛒' }] },
    ]);
  });

  it('returns nothing when the user unchecks everything (edge case)', () => {
    expect(buildSelectedSuggestions(groups, new Set(), identity, identity)).toEqual([]);
  });

  it('omits a group entirely when all of its categories were unchecked', () => {
    const selected = new Set(['groceries']);
    const result = buildSelectedSuggestions(groups, selected, identity, identity);
    expect(result).toEqual([{ name: 'needs', categories: [{ name: 'groceries', icon: '🛒' }] }]);
  });

  it('keeps a partially-unchecked group with only the selected categories', () => {
    const selected = new Set(['rent', 'groceries']);
    const result = buildSelectedSuggestions(groups, selected, identity, identity);
    expect(result[0].categories).toEqual([{ name: 'rent', icon: '🏠' }]);
  });
});

describe('allSuggestedCategoryKeys / SUGGESTED_CATEGORY_GROUPS', () => {
  it('has at least one group and every group has at least one category', () => {
    expect(SUGGESTED_CATEGORY_GROUPS.length).toBeGreaterThan(0);
    for (const group of SUGGESTED_CATEGORY_GROUPS) {
      expect(group.categories.length).toBeGreaterThan(0);
    }
  });

  it('flattens every category key from the default catalog with no duplicates', () => {
    const keys = allSuggestedCategoryKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(
      SUGGESTED_CATEGORY_GROUPS.reduce((sum, g) => sum + g.categories.length, 0),
    );
  });
});
