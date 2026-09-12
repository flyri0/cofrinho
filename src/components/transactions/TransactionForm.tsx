import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { MoneyInput } from '@/components/accounts/MoneyInput';
import {
  isTransferLikeType,
  type TransactionFormErrorCode,
  type TransactionFormErrors,
} from '@/lib/transactions';
import { useAccountsStore, useCategoriesStore } from '@/store';
import {
  useTransactionFormDraftStore,
  type TransactionFormDraft,
} from '@/store/transactionFormDraftStore';

import { PayeeInput } from './PayeeInput';
import { TransactionTypeSelector } from './TransactionTypeSelector';

export type TransactionFormResult =
  { ok: true; id: number } | { ok: false; errors: TransactionFormErrors };

export interface TransactionFormProps {
  mode: 'create' | 'edit';
  onSubmit: (draft: TransactionFormDraft) => Promise<TransactionFormResult>;
  onSuccess: (id: number) => void;
  onDelete?: () => void;
}

function errorKey(field: keyof TransactionFormErrors, code: TransactionFormErrorCode): string {
  if (field === 'toAccountId' && code === 'same_account')
    return 'transactionForm.errors.toAccountSameAccount';
  const map: Record<keyof TransactionFormErrors, string> = {
    accountId: 'transactionForm.errors.accountRequired',
    toAccountId: 'transactionForm.errors.toAccountRequired',
    categoryId: 'transactionForm.errors.categoryRequired',
    amount: 'transactionForm.errors.amountMustBePositive',
    date: 'transactionForm.errors.dateRequired',
  };
  return map[field];
}

export function TransactionForm({ mode, onSubmit, onSuccess, onDelete }: TransactionFormProps) {
  const { t } = useTranslation();
  const draft = useTransactionFormDraftStore();
  const accountsList = useAccountsStore((s) => s.accounts);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTransferLike = isTransferLikeType(draft.type);
  const account = accountsList.find((a) => a.id === draft.accountId);
  const toAccount = accountsList.find((a) => a.id === draft.toAccountId);
  const category = categoriesList.find((c) => c.id === draft.categoryId);

  async function handleSave() {
    setIsSubmitting(true);
    const result = await onSubmit(draft);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSuccess(result.id);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 p-4">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('transactionForm.typeLabel')}
        </Text>
        <TransactionTypeSelector
          value={draft.type}
          onChange={(type) => draft.setField('type', type)}
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('transactionForm.amountLabel')}
        </Text>
        <MoneyInput
          value={draft.amountCents}
          onChangeValue={(cents) => draft.setField('amountCents', cents)}
          allowNegative={false}
        />
        {errors.amount && (
          <Text className="text-sm text-error">{t(errorKey('amount', errors.amount))}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isTransferLike
            ? t('transactionForm.fromAccountLabel')
            : t('transactionForm.accountLabel')}
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/transaction/account-picker', params: { field: 'account' } })
          }
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5"
        >
          <Text
            className={
              account
                ? 'text-base text-gray-900 dark:text-gray-100'
                : 'text-base text-gray-400 dark:text-gray-300'
            }
          >
            {account ? account.name : t('transactionForm.selectAccount')}
          </Text>
        </Pressable>
        {errors.accountId && (
          <Text className="text-sm text-error">{t(errorKey('accountId', errors.accountId))}</Text>
        )}
      </View>

      {isTransferLike && (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('transactionForm.toAccountLabel')}
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/transaction/account-picker',
                params: {
                  field: 'toAccount',
                  filter: draft.type === 'credit_card_payment' ? 'creditCard' : undefined,
                },
              })
            }
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5"
          >
            <Text
              className={
                toAccount
                  ? 'text-base text-gray-900 dark:text-gray-100'
                  : 'text-base text-gray-400 dark:text-gray-300'
              }
            >
              {toAccount ? toAccount.name : t('transactionForm.selectAccount')}
            </Text>
          </Pressable>
          {errors.toAccountId && (
            <Text className="text-sm text-error">
              {t(errorKey('toAccountId', errors.toAccountId))}
            </Text>
          )}
        </View>
      )}

      {!isTransferLike && (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('transactionForm.categoryLabel')}
          </Text>
          <Pressable
            onPress={() => router.push('/transaction/category-picker')}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5"
          >
            <Text
              className={
                category
                  ? 'text-base text-gray-900 dark:text-gray-100'
                  : 'text-base text-gray-400 dark:text-gray-300'
              }
            >
              {category ? category.name : t('transactionForm.categoryIncomePlaceholder')}
            </Text>
          </Pressable>
          {errors.categoryId && (
            <Text className="text-sm text-error">
              {t(errorKey('categoryId', errors.categoryId))}
            </Text>
          )}
        </View>
      )}

      {!isTransferLike && (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('transactionForm.payeeLabel')}
          </Text>
          <PayeeInput
            value={draft.payee}
            onChangeValue={(payee) => draft.setField('payee', payee)}
          />
        </View>
      )}

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('transactionForm.dateLabel')}
        </Text>
        <TextInput
          value={draft.date}
          onChangeText={(text) => draft.setField('date', text)}
          placeholder="YYYY-MM-DD"
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100"
        />
        {errors.date && (
          <Text className="text-sm text-error">{t(errorKey('date', errors.date))}</Text>
        )}
      </View>

      <Pressable onPress={() => setShowAdvanced((prev) => !prev)}>
        <Text className="text-sm font-medium text-accent">
          {showAdvanced ? t('transactionForm.showLess') : t('transactionForm.showMore')}
        </Text>
      </Pressable>

      {showAdvanced && (
        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactionForm.memoLabel')}
            </Text>
            <TextInput
              value={draft.memo}
              onChangeText={(text) => draft.setField('memo', text)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100"
              multiline
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactionForm.flagLabel')}
            </Text>
            <TextInput
              value={draft.flag ?? ''}
              onChangeText={(text) => draft.setField('flag', text || null)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactionForm.clearedLabel')}
            </Text>
            <Switch
              value={draft.cleared}
              onValueChange={(value) => draft.setField('cleared', value)}
            />
          </View>
        </View>
      )}

      <Pressable
        onPress={handleSave}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-accent py-3"
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-base font-semibold text-white">{t('transactionForm.save')}</Text>
        )}
      </Pressable>

      {mode === 'edit' && onDelete && (
        <Pressable onPress={onDelete} className="items-center rounded-lg bg-error/10 py-3">
          <Text className="text-base font-semibold text-error">{t('transactionForm.delete')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
