import { getThemeColors, THEME_CATALOG, THEME_IDS } from '../themeCatalog';

const HEX_PATTERN = /^#[0-9a-f]{6}$/;
const COLOR_KEYS = ['accent', 'background', 'surface', 'success', 'warning', 'error'] as const;

describe('THEME_CATALOG', () => {
  it('defines every theme id declared in THEME_IDS, and no others', () => {
    expect(Object.keys(THEME_CATALOG).sort()).toEqual([...THEME_IDS].sort());
  });

  it.each(THEME_IDS)(
    'theme "%s" defines all 6 colors, as valid hex, for both light and dark',
    (id) => {
      const theme = THEME_CATALOG[id];
      for (const scheme of ['light', 'dark'] as const) {
        for (const key of COLOR_KEYS) {
          expect(theme.colors[scheme][key]).toMatch(HEX_PATTERN);
        }
      }
    },
  );

  it('light and dark variants of the same theme are never identical (edge case: a copy-paste mistake)', () => {
    for (const id of THEME_IDS) {
      const theme = THEME_CATALOG[id];
      expect(theme.colors.light).not.toEqual(theme.colors.dark);
    }
  });
});

describe('getThemeColors', () => {
  it('returns the exact colors object for a given theme/scheme', () => {
    expect(getThemeColors('ocean', 'light')).toBe(THEME_CATALOG.ocean.colors.light);
    expect(getThemeColors('forest', 'dark')).toBe(THEME_CATALOG.forest.colors.dark);
  });
});
