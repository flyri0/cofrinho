import '@/global.css';
import '@/src/i18n';

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '@/db/client';
import migrations from '@/drizzle/migrations';
import { useAccountsStore } from '@/src/store';

export default function RootLayout() {
  const { success: migrationsReady, error: migrationsError } = useMigrations(db, migrations);
  const accounts = useAccountsStore((s) => s.accounts);
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!migrationsReady) return;
    fetchAccounts().finally(() => setIsReady(true));
  }, [migrationsReady, fetchAccounts]);

  if (migrationsError) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-center text-base text-red-600">{migrationsError.message}</Text>
      </View>
    );
  }

  if (!migrationsReady || !isReady) {
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
