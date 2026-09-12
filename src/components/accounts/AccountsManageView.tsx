import { useCallback, useState } from 'react';
import { FlatList, Pressable, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { AccountManageListItem } from '@/components/accounts/AccountManageListItem';
import { groupAccountsByKind } from '@/lib/accounts';
import { useAccountsStore } from '@/store';

// see technical-specification.md §6.2 — "the same list from 5.5, but with
// edit mode enabled by default (drag-to-reorder, bulk archive)". Reordering
// is up/down buttons rather than a drag gesture (see lib/reorder/reorder.ts).
export function AccountsManageView() {
  const { t } = useTranslation();
  const accounts = useAccountsStore((s) => s.accounts);
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const archiveAccounts = useAccountsStore((s) => s.archiveAccounts);
  const reorderAccount = useAccountsStore((s) => s.reorderAccount);

  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      fetchAccounts(showArchived);
    }, [fetchAccounts, showArchived]),
  );

  const groups = groupAccountsByKind(accounts);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkArchive() {
    await archiveAccounts([...selectedIds]);
    setSelectedIds(new Set());
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Pressable
          onPress={() => router.push('/account/new')}
          className="items-center rounded-lg bg-accent py-2.5"
        >
          <Text className="text-base font-semibold text-white">{t('accounts.addAccount')}</Text>
        </Pressable>
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-gray-900 dark:text-gray-100">
            {t('categoryManage.showArchived')}
          </Text>
          <Switch value={showArchived} onValueChange={setShowArchived} />
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(group) => group.kind}
        renderItem={({ item: group }) => (
          <View>
            <View className="bg-surface px-4 py-2">
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t(`accountGroups.${group.kind}.title`)}
              </Text>
            </View>
            {group.accounts.map((account, index) => (
              <AccountManageListItem
                key={account.id}
                account={account}
                selected={selectedIds.has(account.id)}
                onToggleSelected={() => toggleSelected(account.id)}
                onPress={() => router.push(`/account/${account.id}/edit`)}
                onMoveUp={() => reorderAccount(account.id, 'up')}
                onMoveDown={() => reorderAccount(account.id, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < group.accounts.length - 1}
              />
            ))}
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-surface" />}
      />

      {selectedIds.size > 0 && (
        <Pressable
          onPress={handleBulkArchive}
          className="items-center border-t border-gray-200 bg-error py-3 dark:border-gray-800"
        >
          <Text className="text-base font-semibold text-white">
            {t('settings.accountsCategories.archiveSelected', { count: selectedIds.size })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
