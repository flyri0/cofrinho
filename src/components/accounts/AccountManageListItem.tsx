import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AccountRow } from '@/store';
import { formatCents } from '@/lib/money';

export interface AccountManageListItemProps {
  account: AccountRow;
  selected: boolean;
  onToggleSelected: () => void;
  onPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

// see technical-specification.md §6.2 — the Accounts tab's "edit mode"
// row: a selection checkbox (for bulk archive) and up/down reorder buttons,
// instead of 5.5's tap-to-view-ledger/long-press-menu row (AccountListItem).
export function AccountManageListItem({
  account,
  selected,
  onToggleSelected,
  onPress,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: AccountManageListItemProps) {
  const { t, i18n } = useTranslation();
  const isNegative = account.currentBalance < 0;

  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Pressable
        onPress={onToggleSelected}
        hitSlop={8}
        className={`h-5 w-5 items-center justify-center rounded border ${
          selected ? 'border-accent bg-accent' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {selected && <Text className="text-xs text-white">✓</Text>}
      </Pressable>

      <Pressable className="flex-1 flex-row items-center justify-between" onPress={onPress}>
        <Text className="flex-1 text-base text-gray-900 dark:text-gray-100">
          {account.name}
          {account.archived ? ` (${t('common.archive').toLowerCase()})` : ''}
        </Text>
        <Text
          className={`text-base ${isNegative ? 'font-semibold text-error' : 'text-gray-900 dark:text-gray-100'}`}
        >
          {formatCents(account.currentBalance, account.currency, i18n.language)}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-3">
        <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={8}>
          <Text
            className={
              canMoveUp ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-700'
            }
          >
            ↑
          </Text>
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={8}>
          <Text
            className={
              canMoveDown ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-700'
            }
          >
            ↓
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
