import { useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import {
  isAccountFormValid,
  isLoanAccountType,
  validateAccountForm,
  type AccountFormErrorCode,
  type AccountFormErrors,
} from '@/lib/accounts';
import { useAccountFormDraftStore, type AccountFormDraft } from '@/store/accountFormDraftStore';

import { MoneyInput } from './MoneyInput';

export type AccountFormResult = { ok: true; id: number } | { ok: false; errors: AccountFormErrors };

export interface AccountFormProps {
  mode: 'create' | 'edit';
  /** Shown read-only in edit mode — the balance can only be set at creation (§5.6). */
  currentBalanceCents?: number;
  onSubmit: (draft: AccountFormDraft) => Promise<AccountFormResult>;
  onSuccess: (id: number) => void;
}

function interestRateErrorKey(code: AccountFormErrorCode): string {
  return code === 'invalid_number'
    ? 'accountForm.errors.interestRateInvalidNumber'
    : 'accountForm.errors.interestRateMustBePositive';
}

export function AccountForm({ mode, currentBalanceCents, onSubmit, onSuccess }: AccountFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useAccountFormDraftStore();
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [typeRequiredError, setTypeRequiredError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showLoanFields = draft.type !== null && isLoanAccountType(draft.type);

  async function handleSave() {
    if (draft.type === null) {
      setTypeRequiredError(true);
      return;
    }

    const validationErrors = validateAccountForm({
      name: draft.name,
      type: draft.type,
      interestRateAnnualInput: draft.interestRateAnnualInput,
      monthlyPaymentCents: draft.monthlyPaymentCents,
    });

    if (!isAccountFormValid(validationErrors)) {
      setErrors(validationErrors);
      setTypeRequiredError(false);
      return;
    }

    setErrors({});
    setTypeRequiredError(false);
    setIsSubmitting(true);
    const result = await onSubmit(draft);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    onSuccess(result.id);
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-5 p-4">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">{t('accountForm.nameLabel')}</Text>
        <TextInput
          value={draft.name}
          onChangeText={(text) => draft.setField('name', text)}
          placeholder={t('accountForm.namePlaceholder')}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900"
        />
        {errors.name && (
          <Text className="text-sm text-red-600">{t('accountForm.errors.nameRequired')}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">{t('accountForm.typeLabel')}</Text>
        <Pressable
          onPress={() => router.push('/account/type-picker')}
          className="rounded-lg border border-gray-300 px-3 py-2.5"
        >
          <Text className={draft.type ? 'text-base text-gray-900' : 'text-base text-gray-400'}>
            {draft.type ? t(`accountTypes.${draft.type}`) : t('accountForm.selectType')}
          </Text>
        </Pressable>
        {typeRequiredError && (
          <Text className="text-sm text-red-600">{t('accountForm.errors.typeRequired')}</Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">{t('accountForm.balanceLabel')}</Text>
        {mode === 'create' ? (
          <MoneyInput
            value={draft.balanceCents}
            onChangeValue={(cents) => draft.setField('balanceCents', cents)}
          />
        ) : (
          <>
            <MoneyInput
              value={currentBalanceCents ?? 0}
              onChangeValue={() => {}}
              editable={false}
            />
            <Text className="text-xs text-gray-500">{t('accountForm.balanceReadOnlyHint')}</Text>
          </>
        )}
      </View>

      {showLoanFields && (
        <>
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700">
              {t('accountForm.interestRateLabel')}
            </Text>
            <TextInput
              value={draft.interestRateAnnualInput}
              onChangeText={(text) => draft.setField('interestRateAnnualInput', text)}
              keyboardType="decimal-pad"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900"
            />
            {errors.interestRateAnnual && (
              <Text className="text-sm text-red-600">
                {t(interestRateErrorKey(errors.interestRateAnnual))}
              </Text>
            )}
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700">
              {t('accountForm.monthlyPaymentLabel')}
            </Text>
            <MoneyInput
              value={draft.monthlyPaymentCents}
              onChangeValue={(cents) => draft.setField('monthlyPaymentCents', cents)}
              allowNegative={false}
            />
            {errors.monthlyPayment && (
              <Text className="text-sm text-red-600">
                {t('accountForm.errors.monthlyPaymentMustBePositive')}
              </Text>
            )}
          </View>
        </>
      )}

      <Pressable
        onPress={handleSave}
        disabled={isSubmitting}
        className="items-center rounded-lg bg-blue-600 py-3"
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-base font-semibold text-white">{t('accountForm.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
