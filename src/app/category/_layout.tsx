import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function CategoryLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="manage" options={{ title: t('categoryManage.title') }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
