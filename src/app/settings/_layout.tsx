import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('settings.title') }} />
      <Stack.Screen name="appearance" options={{ title: t('settings.appearance.title') }} />
      <Stack.Screen
        name="accounts-categories"
        options={{ title: t('settings.accountsCategories.title') }}
      />
      <Stack.Screen name="preferences" options={{ title: t('settings.preferences.title') }} />
      <Stack.Screen name="about" options={{ title: t('settings.about.title') }} />
      <Stack.Screen name="backup" options={{ title: t('backup.title') }} />
      <Stack.Screen name="backup-history" options={{ title: t('backup.history.title') }} />
    </Stack>
  );
}
