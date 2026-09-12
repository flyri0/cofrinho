import { COLOR_THEME_IDS, type ColorThemeId } from '@/db/schema';

export type { ColorThemeId };

// see technical-specification.md §6.1 and CLAUDE.md's Theming rule — "a
// fixed, pre-built catalog... each theme is a self-contained config object
// (accent, background, surface, success/warning/error colors) with both a
// light and dark variant... structured to grow: new themes can be added to
// the catalog later without changing the application logic, since each
// theme is just a color configuration object."
//
// success/warning/error are deliberately kept identical across every theme
// (only accent/background/surface vary by theme) — that keeps semantic
// meaning (green=success, amber=warning, red=error) consistent everywhere
// the user goes, rather than reinventing "what red means" per theme, while
// still satisfying the spec: each theme is still its own complete,
// self-contained 6-color object.
export const THEME_IDS = COLOR_THEME_IDS;

export interface ThemeColors {
  /** Hex color strings (e.g. '#2563eb') — the single source of truth for every color a theme defines. */
  accent: string;
  background: string;
  surface: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeDefinition {
  id: ColorThemeId;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

const SEMANTIC_LIGHT = { success: '#059669', warning: '#d97706', error: '#dc2626' };
const SEMANTIC_DARK = { success: '#34d399', warning: '#fbbf24', error: '#f87171' };

export const THEME_CATALOG: Record<ColorThemeId, ThemeDefinition> = {
  ocean: {
    id: 'ocean',
    colors: {
      light: { accent: '#2563eb', background: '#ffffff', surface: '#f1f5f9', ...SEMANTIC_LIGHT },
      dark: { accent: '#60a5fa', background: '#0f172a', surface: '#1e293b', ...SEMANTIC_DARK },
    },
  },
  sunset: {
    id: 'sunset',
    colors: {
      light: { accent: '#ea580c', background: '#fffbf7', surface: '#fef2e8', ...SEMANTIC_LIGHT },
      dark: { accent: '#fb923c', background: '#1c140f', surface: '#291e17', ...SEMANTIC_DARK },
    },
  },
  forest: {
    id: 'forest',
    colors: {
      light: { accent: '#15803d', background: '#f7fdf7', surface: '#ecf7ed', ...SEMANTIC_LIGHT },
      dark: { accent: '#4ade80', background: '#0c140e', surface: '#162218', ...SEMANTIC_DARK },
    },
  },
};

export function getThemeColors(themeId: ColorThemeId, scheme: 'light' | 'dark'): ThemeColors {
  return THEME_CATALOG[themeId].colors[scheme];
}
