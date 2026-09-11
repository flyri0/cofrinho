import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TransactionLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="new" options={{ title: t('transactionForm.newTitle') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('transactionForm.editTitle') }} />
      <Stack.Screen name="category-picker" options={{ title: t('categoryPicker.title') }} />
      <Stack.Screen name="account-picker" options={{ title: t('accountPicker.title') }} />
    </Stack>
  );
}
