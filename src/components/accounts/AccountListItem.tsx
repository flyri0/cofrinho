import { Alert, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AccountRow } from '@/store';
import { accountArchiveRequiresConfirmation } from '@/lib/accounts';
import { formatCents } from '@/lib/money';

export interface AccountListItemProps {
  account: AccountRow;
  onEdit: () => void;
  onArchive: () => void;
  onViewLedger: () => void;
}

export function AccountListItem({
  account,
  onEdit,
  onArchive,
  onViewLedger,
}: AccountListItemProps) {
  const { t, i18n } = useTranslation();
  const isNegative = account.currentBalance < 0;

  function confirmArchive() {
    if (!accountArchiveRequiresConfirmation(account.currentBalance)) {
      onArchive();
      return;
    }

    Alert.alert(t('accounts.archiveConfirm.title'), t('accounts.archiveConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('accounts.archiveConfirm.confirm'), style: 'destructive', onPress: onArchive },
    ]);
  }

  function showOptions() {
    Alert.alert(account.name, undefined, [
      { text: t('accounts.options.edit'), onPress: onEdit },
      { text: t('accounts.options.viewLedger'), onPress: onViewLedger },
      { text: t('accounts.options.archive'), style: 'destructive', onPress: confirmArchive },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <Pressable
      onPress={onViewLedger}
      onLongPress={showOptions}
      className="flex-row items-center justify-between px-4 py-3"
    >
      <Text className="flex-1 text-base text-gray-900 dark:text-gray-100">{account.name}</Text>
      <Text
        className={`text-base ${isNegative ? 'font-semibold text-error' : 'text-gray-900 dark:text-gray-100'}`}
      >
        {formatCents(account.currentBalance, account.currency, i18n.language)}
      </Text>
      <Pressable onPress={showOptions} hitSlop={12} className="ml-3 px-1">
        <Text className="text-xl text-gray-400 dark:text-gray-300">⋮</Text>
      </Pressable>
    </Pressable>
  );
}
