import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="backup" options={{ title: t('backup.title') }} />
      <Stack.Screen name="backup-history" options={{ title: t('backup.history.title') }} />
    </Stack>
  );
}
