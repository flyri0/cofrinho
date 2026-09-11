import '@/global.css';
import '@/src/i18n';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';

import { useAccountsStore } from '@/src/store';

export default function RootLayout() {
  const accounts = useAccountsStore((s) => s.accounts);
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    fetchAccounts().finally(() => setIsReady(true));
  }, [fetchAccounts]);

  if (!isReady) {
    return <View className="flex-1 bg-white" />;
  }

  const hasAccounts = accounts.length > 0;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasAccounts}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!hasAccounts}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="account" />
    </Stack>
  );
}
