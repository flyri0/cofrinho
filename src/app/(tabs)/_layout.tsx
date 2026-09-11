import { Pressable, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          // Temporary entry point: there's no Settings tab/menu yet (§6.1,
          // §6.2, §6.4, §6.5 are separate, not-yet-built milestones), so this
          // gear icon is the only way to reach the Backup screen (§6.3) for
          // now. Replace with a proper Settings root once those exist.
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings/backup')}
              hitSlop={12}
              className="pr-4"
            >
              <Text className="text-xl">⚙️</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="budget" options={{ title: t('tabs.budget') }} />
      <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions') }} />
      <Tabs.Screen name="accounts" options={{ title: t('tabs.accounts') }} />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports') }} />
    </Tabs>
  );
}
