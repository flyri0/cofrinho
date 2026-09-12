import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ColorThemeId } from '@/lib/theme';
import { getThemeColors } from '@/lib/theme';

export interface ThemePreviewCardProps {
  themeId: ColorThemeId;
  scheme: 'light' | 'dark';
  selected: boolean;
  onPress: () => void;
}

// see technical-specification.md §6.1 — "Each theme appears as a sample card
// (mini-preview with the actual colors applied), allowing visual comparison
// before choosing — no need to apply it just to see the result." The
// preview always renders in the CURRENTLY resolved light/dark scheme (not
// necessarily the theme being previewed is "active") so cards compare like
// for like.
export function ThemePreviewCard({ themeId, scheme, selected, onPress }: ThemePreviewCardProps) {
  const { t } = useTranslation();
  const colors = getThemeColors(themeId, scheme);

  return (
    <Pressable
      onPress={onPress}
      className={`w-36 gap-2 rounded-xl border-2 p-2 ${selected ? 'border-accent' : 'border-transparent'}`}
    >
      <View
        className="h-16 justify-end rounded-lg p-1.5"
        style={{ backgroundColor: colors.background }}
      >
        <View className="h-6 w-full rounded" style={{ backgroundColor: colors.surface }} />
        <View
          className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t(`settings.appearance.themes.${themeId}`)}
        </Text>
        {selected && <Text className="text-sm text-accent">✓</Text>}
      </View>
    </Pressable>
  );
}
