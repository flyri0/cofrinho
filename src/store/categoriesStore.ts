import { eq } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import { categories, categoryGroups } from '@/db/schema';
import {
  buildCategoryUpdate,
  buildGroupUpdate,
  buildNewCategoryRecord,
  buildNewGroupRecord,
  isCategoryFormValid,
  isGroupFormValid,
  validateCategoryForm,
  validateGroupForm,
  type BuiltSuggestedCategoryGroup,
  type CategoryFormErrors,
  type GroupFormErrors,
} from '@/lib/categories';

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;

export type GroupMutationResult = { ok: true; id: number } | { ok: false; errors: GroupFormErrors };
export type CategoryMutationResult =
  { ok: true; id: number } | { ok: false; errors: CategoryFormErrors };

export interface CategoriesState {
  groups: CategoryGroupRow[];
  categories: CategoryRow[];
  isLoading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  createGroup: (name: string) => Promise<GroupMutationResult>;
  updateGroup: (id: number, name: string) => Promise<GroupMutationResult>;
  archiveGroup: (id: number) => Promise<void>;
  createCategory: (values: {
    name: string;
    groupId: number | null;
    icon: string | null;
  }) => Promise<CategoryMutationResult>;
  updateCategory: (
    id: number,
    values: { name: string; groupId: number | null; icon: string | null },
  ) => Promise<CategoryMutationResult>;
  archiveCategory: (id: number) => Promise<void>;
  createSuggestedCategories: (groups: BuiltSuggestedCategoryGroup[]) => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createCategoriesStore(db: AppDatabase): UseBoundStore<StoreApi<CategoriesState>> {
  return create<CategoriesState>((set, get) => ({
    groups: [],
    categories: [],
    isLoading: false,
    error: null,

    fetchAll: async () => {
      set({ isLoading: true, error: null });
      try {
        const [groupRows, categoryRows] = await Promise.all([
          db.select().from(categoryGroups).where(eq(categoryGroups.archived, false)),
          db.select().from(categories).where(eq(categories.archived, false)),
        ]);
        groupRows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
        categoryRows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
        set({ groups: groupRows, categories: categoryRows, isLoading: false });
      } catch (error) {
        set({ error: toErrorMessage(error), isLoading: false });
      }
    },

    createGroup: async (name) => {
      const errors = validateGroupForm({ name });
      if (!isGroupFormValid(errors)) return { ok: false, errors };

      const nextSortOrder = get().groups.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1;
      const record = buildNewGroupRecord({ name }, nextSortOrder);
      const [inserted] = await db
        .insert(categoryGroups)
        .values(record)
        .returning({ id: categoryGroups.id });

      await get().fetchAll();
      return { ok: true, id: inserted.id };
    },

    updateGroup: async (id, name) => {
      const errors = validateGroupForm({ name });
      if (!isGroupFormValid(errors)) return { ok: false, errors };

      await db
        .update(categoryGroups)
        .set(buildGroupUpdate({ name }))
        .where(eq(categoryGroups.id, id));
      await get().fetchAll();
      return { ok: true, id };
    },

    archiveGroup: async (id) => {
      await db.update(categoryGroups).set({ archived: true }).where(eq(categoryGroups.id, id));
      await get().fetchAll();
    },

    createCategory: async ({ name, groupId, icon }) => {
      const errors = validateCategoryForm({ name, groupId });
      if (!isCategoryFormValid(errors)) return { ok: false, errors };

      const siblingCategories = get().categories.filter((c) => c.groupId === groupId);
      const nextSortOrder =
        siblingCategories.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
      const record = buildNewCategoryRecord(
        { name, groupId: groupId as number, icon },
        nextSortOrder,
      );
      const [inserted] = await db
        .insert(categories)
        .values(record)
        .returning({ id: categories.id });

      await get().fetchAll();
      return { ok: true, id: inserted.id };
    },

    updateCategory: async (id, { name, groupId, icon }) => {
      const errors = validateCategoryForm({ name, groupId });
      if (!isCategoryFormValid(errors)) return { ok: false, errors };

      const update = buildCategoryUpdate({ name, groupId: groupId as number, icon });
      await db.update(categories).set(update).where(eq(categories.id, id));
      await get().fetchAll();
      return { ok: true, id };
    },

    archiveCategory: async (id) => {
      await db.update(categories).set({ archived: true }).where(eq(categories.id, id));
      await get().fetchAll();
    },

    createSuggestedCategories: async (suggestedGroups) => {
      let groupSortOrder = get().groups.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1;

      for (const group of suggestedGroups) {
        const [insertedGroup] = await db
          .insert(categoryGroups)
          .values(buildNewGroupRecord({ name: group.name }, groupSortOrder))
          .returning({ id: categoryGroups.id });
        groupSortOrder += 1;

        let categorySortOrder = 0;
        for (const category of group.categories) {
          await db
            .insert(categories)
            .values(
              buildNewCategoryRecord(
                { name: category.name, groupId: insertedGroup.id, icon: category.icon },
                categorySortOrder,
              ),
            );
          categorySortOrder += 1;
        }
      }

      await get().fetchAll();
    },
  }));
}
