import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AccountsManageView } from '@/components/accounts/AccountsManageView';
import { CategoriesManageView } from '@/components/categories/CategoriesManageView';

const TABS = ['accounts', 'categories'] as const;
type Tab = (typeof TABS)[number];

// see technical-specification.md §6.2 — "sub-screen with two tabs".
export default function AccountsCategoriesScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === tab ? 'border-accent' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab ? 'text-accent' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t(`settings.accountsCategories.tabs.${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'accounts' ? <AccountsManageView /> : <CategoriesManageView />}
    </View>
  );
}
