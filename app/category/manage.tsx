import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { canArchiveGroup } from '@/src/lib/categories';
import { useCategoriesStore, type CategoryGroupRow } from '@/src/store';

export default function ManageCategoriesScreen() {
  const { t } = useTranslation();
  const groups = useCategoriesStore((s) => s.groups);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const fetchAll = useCategoriesStore((s) => s.fetchAll);
  const createGroup = useCategoriesStore((s) => s.createGroup);
  const updateGroup = useCategoriesStore((s) => s.updateGroup);
  const archiveGroup = useCategoriesStore((s) => s.archiveGroup);
  const createCategory = useCategoriesStore((s) => s.createCategory);

  const [newGroupName, setNewGroupName] = useState('');
  const [newCategoryDrafts, setNewCategoryDrafts] = useState<Record<number, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
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
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 p-4">
      {groups.map((group) => {
        const categoriesInGroup = categoriesList.filter((c) => c.groupId === group.id);

        return (
          <View key={group.id} className="gap-2 rounded-lg border border-gray-200 p-3">
            <View className="flex-row items-center justify-between">
              {editingGroupId === group.id ? (
                <TextInput
                  autoFocus
                  value={editingGroupName}
                  onChangeText={setEditingGroupName}
                  onBlur={() => saveGroupRename(group.id)}
                  onSubmitEditing={() => saveGroupRename(group.id)}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-base"
                />
              ) : (
                <Pressable
                  className="flex-1"
                  onPress={() => {
                    setEditingGroupId(group.id);
                    setEditingGroupName(group.name);
                  }}
                >
                  <Text className="text-base font-semibold text-gray-900">{group.name}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => handleArchiveGroup(group)} className="ml-2">
                <Text className="text-sm text-red-600">{t('common.archive')}</Text>
              </Pressable>
            </View>

            {categoriesInGroup.length === 0 && (
              <Text className="text-sm text-gray-400">{t('categoryManage.emptyGroup')}</Text>
            )}
            {categoriesInGroup.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => router.push(`/category/${category.id}`)}
                className="flex-row items-center gap-2 py-1"
              >
                {category.icon && <Text>{category.icon}</Text>}
                <Text className="text-sm text-gray-700">{category.name}</Text>
              </Pressable>
            ))}

            <View className="flex-row gap-2">
              <TextInput
                value={newCategoryDrafts[group.id] ?? ''}
                onChangeText={(text) =>
                  setNewCategoryDrafts((prev) => ({ ...prev, [group.id]: text }))
                }
                placeholder={t('categoryManage.newCategoryPlaceholder')}
                onSubmitEditing={() => handleAddCategory(group.id)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
              <Pressable
                onPress={() => handleAddCategory(group.id)}
                className="items-center justify-center rounded-lg bg-blue-600 px-3"
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
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <Pressable
          onPress={handleAddGroup}
          className="items-center justify-center rounded-lg bg-blue-600 px-4"
        >
          <Text className="text-sm font-semibold text-white">{t('categoryManage.newGroup')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
