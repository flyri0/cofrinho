import { FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { AccountListItem } from '@/components/accounts/AccountListItem';
import { groupAccountsByKind } from '@/lib/accounts';
import { formatCents } from '@/lib/money';
import { useAccountsStore } from '@/store';

export default function AccountsScreen() {
  const { t, i18n } = useTranslation();
  const accounts = useAccountsStore((s) => s.accounts);
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const archiveAccount = useAccountsStore((s) => s.archiveAccount);

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [fetchAccounts]),
  );

  const groups = groupAccountsByKind(accounts);

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 px-4 py-3">
        <Pressable
          onPress={() => router.push('/account/new')}
          className="items-center rounded-lg bg-blue-600 py-2.5"
        >
          <Text className="text-base font-semibold text-white">{t('accounts.addAccount')}</Text>
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-lg font-semibold text-gray-900">
            {t('accounts.emptyState.title')}
          </Text>
          <Text className="text-center text-base text-gray-500">
            {t('accounts.emptyState.message')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => group.kind}
          renderItem={({ item: group }) => (
            <View>
              <View className="flex-row items-center justify-between bg-gray-50 px-4 py-2">
                <Text className="text-sm font-semibold text-gray-600">
                  {t(`accountGroups.${group.kind}.title`)}
                </Text>
                <Text className="text-sm font-semibold text-gray-600">
                  {t('accounts.subtotal')}: {formatCents(group.subtotal, 'BRL', i18n.language)}
                </Text>
              </View>
              {group.accounts.map((account) => (
                <AccountListItem
                  key={account.id}
                  account={account}
                  onEdit={() => router.push(`/account/${account.id}/edit`)}
                  onArchive={() => archiveAccount(account.id)}
                  onViewLedger={() =>
                    router.push({
                      pathname: '/(tabs)/transactions',
                      params: { accountId: String(account.id) },
                    })
                  }
                />
              ))}
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
        />
      )}
    </View>
  );
}
