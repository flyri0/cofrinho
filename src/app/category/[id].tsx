import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { MoneyInput } from '@/components/accounts/MoneyInput';
import { EmojiPicker } from '@/components/categories/EmojiPicker';
import { categoryArchiveIsBlocked } from '@/lib/categories';
import { formatCents } from '@/lib/money';
import { formatMonthLabel } from '@/lib/month';
import { useCategoriesStore, useMonthBudgetStore, type CategoryGroupRow } from '@/store';
import type { CategoryHistoryEntry } from '@/store/monthBudgetStore';

export default function CategoryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);

  const categoriesList = useCategoriesStore((s) => s.categories);
  const groups = useCategoriesStore((s) => s.groups);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);
  const archiveCategory = useCategoriesStore((s) => s.archiveCategory);

  const numbers = useMonthBudgetStore((s) => s.numbersByCategory[categoryId]);
  const setTargetAmount = useMonthBudgetStore((s) => s.setTargetAmount);
  const fetchCategoryHistory = useMonthBudgetStore((s) => s.fetchCategoryHistory);

  const [history, setHistory] = useState<CategoryHistoryEntry[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isGroupPickerVisible, setIsGroupPickerVisible] = useState(false);

  const category = categoriesList.find((c) => c.id === categoryId);
  const group = groups.find((g) => g.id === category?.groupId);

  useEffect(() => {
    fetchCategoryHistory(categoryId).then(setHistory);
  }, [categoryId, fetchCategoryHistory]);

  if (!category) {
    return <View className="flex-1 bg-background" />;
  }

  function saveName() {
    if (nameDraft.trim() && category) {
      updateCategory(category.id, {
        name: nameDraft,
        groupId: category.groupId,
        icon: category.icon,
      });
    }
    setIsEditingName(false);
  }

  function handleChangeIcon(icon: string) {
    if (category)
      updateCategory(category.id, { name: category.name, groupId: category.groupId, icon });
    setIsEmojiPickerVisible(false);
  }

  function handleMoveGroup(groupId: number) {
    if (category)
      updateCategory(category.id, { name: category.name, groupId, icon: category.icon });
    setIsGroupPickerVisible(false);
  }

  function handleArchive() {
    if (!category) return;
    const assignedThisMonth = numbers?.assigned ?? 0;
    if (categoryArchiveIsBlocked(assignedThisMonth)) {
      Alert.alert(
        t('categoryDetail.archiveBlocked.title'),
        t('categoryDetail.archiveBlocked.message'),
      );
      return;
    }

    const idToArchive = category.id;
    Alert.alert(t('categoryDetail.archiveConfirm.title'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('categoryDetail.archiveConfirm.confirm'),
        style: 'destructive',
        onPress: async () => {
          await archiveCategory(idToArchive);
          router.back();
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: category.name }} />
      <View className="gap-3 border-b border-gray-200 dark:border-gray-800 p-4">
        <View className="flex-row items-center gap-3">
          {category.isSystem ? (
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-surface">
              <Text className="text-2xl">{category.icon ?? '❓'}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsEmojiPickerVisible(true)}
              className="h-12 w-12 items-center justify-center rounded-lg bg-surface"
            >
              <Text className="text-2xl">{category.icon ?? '❓'}</Text>
            </Pressable>
          )}

          {!category.isSystem && isEditingName ? (
            <TextInput
              autoFocus
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={saveName}
              onSubmitEditing={saveName}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-lg"
            />
          ) : category.isSystem ? (
            <Text className="flex-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
              {category.name}
            </Text>
          ) : (
            <Pressable
              className="flex-1"
              onPress={() => {
                setNameDraft(category.name);
                setIsEditingName(true);
              }}
            >
              <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {category.name}
              </Text>
            </Pressable>
          )}
        </View>

        {category.isSystem ? (
          <Text className="text-sm text-gray-500 dark:text-gray-300">
            {t('categoryDetail.groupLabel')}: {group?.name ?? '—'}
          </Text>
        ) : (
          <Pressable onPress={() => setIsGroupPickerVisible(true)}>
            <Text className="text-sm text-gray-500 dark:text-gray-300">
              {t('categoryDetail.groupLabel')}: {group?.name ?? '—'}
            </Text>
          </Pressable>
        )}

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('categoryDetail.targetLabel')}
          </Text>
          <MoneyInput
            value={numbers?.target ?? 0}
            onChangeValue={(cents) => setTargetAmount(categoryId, cents)}
            allowNegative={false}
          />
        </View>

        {/* see technical-specification.md §5.4 — "System categories... have
            this menu disabled or hidden — they can't be manually renamed/
            archived, only through the linked account's lifecycle." */}
        {!category.isSystem && (
          <Pressable onPress={handleArchive} className="self-start">
            <Text className="text-sm font-medium text-error">
              {t('categoryDetail.options.archive')}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="p-4">
        <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
          {t('categoryDetail.history.title')}
        </Text>
        <View className="flex-row justify-between px-1 pb-2">
          <Text className="text-xs text-gray-400 dark:text-gray-300">
            {t('categoryDetail.history.assigned')}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-300">
            {t('categoryDetail.history.activity')}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-300">
            {t('categoryDetail.history.available')}
          </Text>
        </View>
        <FlatList
          data={history}
          keyExtractor={(entry) => entry.month}
          ItemSeparatorComponent={() => <View className="h-px bg-surface" />}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between py-2">
              <Text className="w-16 text-sm text-gray-700 dark:text-gray-300">
                {formatMonthLabel(item.month, i18n.language)}
              </Text>
              <Text className="flex-1 text-right text-sm text-gray-600 dark:text-gray-300">
                {formatCents(item.assigned, 'BRL', i18n.language)}
              </Text>
              <Text className="flex-1 text-right text-sm text-gray-600 dark:text-gray-300">
                {formatCents(item.activity, 'BRL', i18n.language)}
              </Text>
              <Text
                className={`flex-1 text-right text-sm font-medium ${item.available < 0 ? 'text-error' : 'text-gray-900 dark:text-gray-100'}`}
              >
                {formatCents(item.available, 'BRL', i18n.language)}
              </Text>
            </View>
          )}
        />
      </View>

      <Modal
        visible={isEmojiPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEmojiPickerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setIsEmojiPickerVisible(false)}
        >
          <Pressable
            className="rounded-t-2xl bg-background p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-3 text-center text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('categoryDetail.options.changeIcon')}
            </Text>
            <EmojiPicker value={category.icon} onChange={handleChangeIcon} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isGroupPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsGroupPickerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setIsGroupPickerVisible(false)}
        >
          <Pressable
            className="max-h-96 rounded-t-2xl bg-background p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-3 text-center text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('categoryDetail.moveGroupTitle')}
            </Text>
            <FlatList
              data={groups}
              keyExtractor={(g: CategoryGroupRow) => String(g.id)}
              ItemSeparatorComponent={() => <View className="h-px bg-surface" />}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleMoveGroup(item.id)} className="py-3">
                  <Text className="text-base text-gray-900 dark:text-gray-100">{item.name}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
