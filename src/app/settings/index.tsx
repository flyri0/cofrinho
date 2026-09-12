import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

// see technical-specification.md §6 — "a simple list of sections; each
// section... opens its own sub-screen (not a modal)".
const SETTINGS_SECTIONS = [
  { key: 'appearance', href: '/settings/appearance' },
  { key: 'accountsCategories', href: '/settings/accounts-categories' },
  { key: 'backup', href: '/settings/backup' },
  { key: 'preferences', href: '/settings/preferences' },
  { key: 'about', href: '/settings/about' },
] as const;

export default function SettingsIndexScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background">
      {SETTINGS_SECTIONS.map((section, index) => (
        <Pressable
          key={section.key}
          onPress={() => router.push(section.href)}
          className={`flex-row items-center justify-between px-4 py-4 ${
            index > 0 ? 'border-t border-gray-200 dark:border-gray-800' : ''
          }`}
        >
          <Text className="text-base text-gray-900 dark:text-gray-100">
            {t(`settings.${section.key}.title`)}
          </Text>
          <Text className="text-gray-400 dark:text-gray-600">›</Text>
        </Pressable>
      ))}
    </View>
  );
}
