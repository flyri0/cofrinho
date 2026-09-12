import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemePreviewCard } from '@/components/settings/ThemePreviewCard';
import { THEME_IDS } from '@/lib/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store';
import { THEME_MODES, type ThemeMode } from '@/db/schema';

// see technical-specification.md §6.1
export default function AppearanceScreen() {
  const { t } = useTranslation();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colorThemeId = useSettingsStore((s) => s.colorThemeId);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setColorThemeId = useSettingsStore((s) => s.setColorThemeId);
  const { scheme } = useTheme();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.appearance.mode')}
        </Text>
        <View className="flex-row gap-2">
          {THEME_MODES.map((mode: ThemeMode) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              className={`flex-1 items-center rounded-lg py-2.5 ${
                themeMode === mode ? 'bg-accent' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  themeMode === mode ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t(`settings.appearance.modes.${mode}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.appearance.colorTheme')}
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {THEME_IDS.map((themeId) => (
            <ThemePreviewCard
              key={themeId}
              themeId={themeId}
              scheme={scheme}
              selected={colorThemeId === themeId}
              onPress={() => setColorThemeId(themeId)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
