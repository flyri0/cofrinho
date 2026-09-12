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
import { computeReorderSwap } from '@/lib/reorder';

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
  /** `includeArchived` defaults to false (every existing screen's expected behavior). */
  fetchAll: (includeArchived?: boolean) => Promise<void>;
  createGroup: (name: string) => Promise<GroupMutationResult>;
  updateGroup: (id: number, name: string) => Promise<GroupMutationResult>;
  archiveGroup: (id: number) => Promise<void>;
  /** see technical-specification.md §6.2 — "drag-to-reorder groups"; see lib/reorder.ts for why this is up/down instead. */
  reorderGroup: (id: number, direction: 'up' | 'down') => Promise<void>;
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
  /** Reorders within the category's own group — see reorderGroup's note above. */
  reorderCategory: (id: number, direction: 'up' | 'down') => Promise<void>;
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

    fetchAll: async (includeArchived = false) => {
      set({ isLoading: true, error: null });
      try {
        const [groupRows, categoryRows] = await Promise.all([
          includeArchived
            ? db.select().from(categoryGroups)
            : db.select().from(categoryGroups).where(eq(categoryGroups.archived, false)),
          includeArchived
            ? db.select().from(categories)
            : db.select().from(categories).where(eq(categories.archived, false)),
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

    reorderGroup: async (id, direction) => {
      const sorted = [...get().groups].sort((a, b) => a.sortOrder - b.sortOrder);
      const swap = computeReorderSwap(sorted, id, direction);
      if (!swap) return;

      // A system group (e.g. "Credit Card Payments", pinned via a negative
      // sortOrder — see accountsStore.ts's ensureCreditCardPaymentCategory)
      // must never have its position disturbed by a neighbor's reorder
      // either — not just refuse when the system group's own arrow is
      // pressed, since a neighbor swapping INTO its slot has the same effect.
      const involvesSystemGroup = swap.some(
        (entry) => sorted.find((g) => g.id === entry.id)?.isSystem,
      );
      if (involvesSystemGroup) return;

      const [first, second] = swap;
      await db
        .update(categoryGroups)
        .set({ sortOrder: first.sortOrder })
        .where(eq(categoryGroups.id, first.id));
      await db
        .update(categoryGroups)
        .set({ sortOrder: second.sortOrder })
        .where(eq(categoryGroups.id, second.id));
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

    reorderCategory: async (id, direction) => {
      const category = get().categories.find((c) => c.id === id);
      if (!category) return;

      const sameGroup = get()
        .categories.filter((c) => c.groupId === category.groupId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const swap = computeReorderSwap(sameGroup, id, direction);
      if (!swap) return;

      // Same reasoning as reorderGroup above — a system category (e.g. a
      // credit card's "Payment — [Card]" category) must not move, whichever
      // side of the swap triggered it.
      const involvesSystemCategory = swap.some(
        (entry) => sameGroup.find((c) => c.id === entry.id)?.isSystem,
      );
      if (involvesSystemCategory) return;

      const [first, second] = swap;
      await db
        .update(categories)
        .set({ sortOrder: first.sortOrder })
        .where(eq(categories.id, first.id));
      await db
        .update(categories)
        .set({ sortOrder: second.sortOrder })
        .where(eq(categories.id, second.id));
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
