import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AccountLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="new" options={{ title: t('accountForm.newTitle') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('accountForm.editTitle') }} />
      <Stack.Screen name="type-picker" options={{ title: t('accountTypePicker.title') }} />
    </Stack>
  );
}
