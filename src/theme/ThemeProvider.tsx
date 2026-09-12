import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useColorScheme, vars } from 'nativewind';

import { getThemeColors, hexToRgbTriplet, resolveScheme, type ThemeColors } from '@/lib/theme';
import { useSettingsStore } from '@/store';

export interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// For anything that needs a literal color string rather than a className —
// e.g. <ActivityIndicator color={...} />, which can't take Tailwind classes.
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

// CLAUDE.md's Theming rule: "Implement theme switching via a theme context/
// provider that maps the active color_theme_id to NativeWind-compatible
// class names or CSS variables consumed by tailwind.config." This is that
// provider — it reads the persisted themeMode/colorThemeId from settingsStore
// and, on every change, recomputes the six CSS variables tailwind.config.js
// maps its accent/background/surface/success/warning/error tokens to,
// injecting them via NativeWind's `vars()` on a root View so every screen
// inherits them.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colorThemeId = useSettingsStore((s) => s.colorThemeId);
  const { colorScheme: systemScheme, setColorScheme } = useColorScheme();

  // Forces NativeWind's own `dark:` variant classes (used for neutral grays/
  // borders that aren't part of the theme catalog, e.g. `dark:text-gray-100`)
  // to follow the same user choice as the CSS-var-driven colors below,
  // instead of only ever tracking the OS regardless of an explicit
  // light/dark override.
  useEffect(() => {
    setColorScheme(themeMode);
  }, [themeMode, setColorScheme]);

  const scheme = resolveScheme(themeMode, systemScheme);
  const colors = getThemeColors(colorThemeId, scheme);

  const themeVars = useMemo(
    () =>
      vars({
        '--color-accent': hexToRgbTriplet(colors.accent),
        '--color-background': hexToRgbTriplet(colors.background),
        '--color-surface': hexToRgbTriplet(colors.surface),
        '--color-success': hexToRgbTriplet(colors.success),
        '--color-warning': hexToRgbTriplet(colors.warning),
        '--color-error': hexToRgbTriplet(colors.error),
      }),
    [colors],
  );

  const value = useMemo(() => ({ colors, scheme }), [colors, scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}
