import '@/global.css';
import '@/i18n';

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '@/db/client';
import migrations from '@/drizzle/migrations';
import { useAccountsStore } from '@/store';

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
      {/* On a cold app launch there's no deep link, so React Navigation has no
          URL to resolve and falls back to the first screen registered with the
          navigator as the initial route. `(tabs)` must be declared first so
          that fallback lands on it whenever accounts already exist — otherwise
          the unconditionally-mounted `onboarding` screen below would always
          win that fallback and onboarding would show on every launch,
          regardless of hasAccounts. */}
      <Stack.Protected guard={hasAccounts}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      {/* `onboarding` stays mounted even after the first account is created —
          step 3 (suggested categories) runs right after account creation,
          while hasAccounts is already true. */}
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="account" />
      <Stack.Screen name="category" />
      <Stack.Screen name="transaction" />
    </Stack>
  );
}
