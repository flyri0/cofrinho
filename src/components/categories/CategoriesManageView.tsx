import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { canArchiveGroup } from '@/lib/categories';
import { useCategoriesStore, type CategoryGroupRow } from '@/store';

// see technical-specification.md §6.2 — "list of collapsible groups (like
// 5.3, but in edit mode)... Drag-to-reorder groups and categories... Show
// archived toggle." Reordering is up/down buttons rather than a drag gesture
// (see src/lib/reorder/reorder.ts for why). Shared by app/category/manage.tsx
// (reached from the Budget screen) and the Settings > Accounts and
// Categories screen's Categories tab, so there's one implementation, not two.
export function CategoriesManageView() {
  const { t } = useTranslation();
  const groups = useCategoriesStore((s) => s.groups);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const fetchAll = useCategoriesStore((s) => s.fetchAll);
  const createGroup = useCategoriesStore((s) => s.createGroup);
  const updateGroup = useCategoriesStore((s) => s.updateGroup);
  const archiveGroup = useCategoriesStore((s) => s.archiveGroup);
  const reorderGroup = useCategoriesStore((s) => s.reorderGroup);
  const createCategory = useCategoriesStore((s) => s.createCategory);
  const reorderCategory = useCategoriesStore((s) => s.reorderCategory);

  const [newGroupName, setNewGroupName] = useState('');
  const [newCategoryDrafts, setNewCategoryDrafts] = useState<Record<number, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAll(showArchived);
    }, [fetchAll, showArchived]),
  );

  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    const result = await createGroup(newGroupName);
    if (result.ok) setNewGroupName('');
  }

  async function handleAddCategory(groupId: number) {
    const name = newCategoryDrafts[groupId] ?? '';
    if (!name.trim()) return;
    const result = await createCategory({ name, groupId, icon: null });
    if (result.ok) setNewCategoryDrafts((prev) => ({ ...prev, [groupId]: '' }));
  }

  function handleArchiveGroup(group: CategoryGroupRow) {
    const categoriesInGroup = categoriesList.filter((c) => c.groupId === group.id);
    if (!canArchiveGroup(categoriesInGroup)) {
      Alert.alert(
        t('categoryManage.archiveGroupBlocked.title'),
        t('categoryManage.archiveGroupBlocked.message'),
      );
      return;
    }

    Alert.alert(t('categoryManage.archiveGroupConfirm.title'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('categoryManage.archiveGroupConfirm.confirm'),
        style: 'destructive',
        onPress: () => archiveGroup(group.id),
      },
    ]);
  }

  function saveGroupRename(groupId: number) {
    if (editingGroupName.trim()) updateGroup(groupId, editingGroupName);
    setEditingGroupId(null);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-gray-900 dark:text-gray-100">
          {t('categoryManage.showArchived')}
        </Text>
        <Switch value={showArchived} onValueChange={setShowArchived} />
      </View>

      {groups.map((group, groupIndex) => {
        const categoriesInGroup = categoriesList.filter((c) => c.groupId === group.id);

        return (
          <View
            key={group.id}
            className="gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            <View className="flex-row items-center justify-between">
              {editingGroupId === group.id ? (
                <TextInput
                  autoFocus
                  value={editingGroupName}
                  onChangeText={setEditingGroupName}
                  onBlur={() => saveGroupRename(group.id)}
                  onSubmitEditing={() => saveGroupRename(group.id)}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-base dark:border-gray-700 dark:text-gray-100"
                />
              ) : (
                <Pressable
                  className="flex-1"
                  onPress={() => {
                    setEditingGroupId(group.id);
                    setEditingGroupName(group.name);
                  }}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {group.name}
                    {group.archived ? ` (${t('common.archive').toLowerCase()})` : ''}
                  </Text>
                </Pressable>
              )}
              <View className="ml-2 flex-row items-center gap-3">
                {/* A system group (e.g. "Credit Card Payments") is pinned first via
                    a negative sortOrder (see accountsStore.ts) — reordering it, or
                    a neighbor into its slot, is refused at the store level too, but
                    hiding the controls here avoids suggesting it's possible at all. */}
                {!group.isSystem && (
                  <>
                    <Pressable
                      onPress={() => reorderGroup(group.id, 'up')}
                      disabled={groupIndex === 0}
                      hitSlop={8}
                    >
                      <Text
                        className={
                          groupIndex === 0
                            ? 'text-gray-300 dark:text-gray-700'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        ↑
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => reorderGroup(group.id, 'down')}
                      disabled={groupIndex === groups.length - 1}
                      hitSlop={8}
                    >
                      <Text
                        className={
                          groupIndex === groups.length - 1
                            ? 'text-gray-300 dark:text-gray-700'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        ↓
                      </Text>
                    </Pressable>
                  </>
                )}
                {!group.archived && !group.isSystem && (
                  <Pressable onPress={() => handleArchiveGroup(group)}>
                    <Text className="text-sm text-error">{t('common.archive')}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {categoriesInGroup.length === 0 && (
              <Text className="text-sm text-gray-400 dark:text-gray-600">
                {t('categoryManage.emptyGroup')}
              </Text>
            )}
            {categoriesInGroup.map((category, categoryIndex) => (
              <View key={category.id} className="flex-row items-center justify-between py-1">
                <Pressable
                  className="flex-1 flex-row items-center gap-2"
                  onPress={() => router.push(`/category/${category.id}`)}
                >
                  {category.icon && <Text>{category.icon}</Text>}
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {category.name}
                    {category.archived ? ` (${t('common.archive').toLowerCase()})` : ''}
                  </Text>
                </Pressable>
                <View className="flex-row items-center gap-3">
                  {/* Same reasoning as the group's own reorder controls above —
                      a system category's position is fixed. */}
                  {!category.isSystem && (
                    <>
                      <Pressable
                        onPress={() => reorderCategory(category.id, 'up')}
                        disabled={categoryIndex === 0}
                        hitSlop={8}
                      >
                        <Text
                          className={
                            categoryIndex === 0
                              ? 'text-gray-300 dark:text-gray-700'
                              : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          ↑
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => reorderCategory(category.id, 'down')}
                        disabled={categoryIndex === categoriesInGroup.length - 1}
                        hitSlop={8}
                      >
                        <Text
                          className={
                            categoryIndex === categoriesInGroup.length - 1
                              ? 'text-gray-300 dark:text-gray-700'
                              : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          ↓
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}

            <View className="flex-row gap-2">
              <TextInput
                value={newCategoryDrafts[group.id] ?? ''}
                onChangeText={(text) =>
                  setNewCategoryDrafts((prev) => ({ ...prev, [group.id]: text }))
                }
                placeholder={t('categoryManage.newCategoryPlaceholder')}
                onSubmitEditing={() => handleAddCategory(group.id)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:text-gray-100"
              />
              <Pressable
                onPress={() => handleAddCategory(group.id)}
                className="items-center justify-center rounded-lg bg-accent px-3"
              >
                <Text className="text-sm font-semibold text-white">+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <View className="flex-row gap-2">
        <TextInput
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder={t('categoryManage.newGroupPlaceholder')}
          onSubmitEditing={handleAddGroup}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:text-gray-100"
        />
        <Pressable
          onPress={handleAddGroup}
          className="items-center justify-center rounded-lg bg-accent px-4"
        >
          <Text className="text-sm font-semibold text-white">{t('categoryManage.newGroup')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
