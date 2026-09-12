import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { categories, categoryGroups } from '@/db/schema';

import { createCategoriesStore } from '../categoriesStore';
import { createTestDatabase } from '../testDb';

describe('categoriesStore', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('creates a group and reflects it in the fetched list', async () => {
    const store = createCategoriesStore(db);
    const result = await store.getState().createGroup('Fixed Bills');

    expect(result.ok).toBe(true);
    expect(store.getState().groups).toHaveLength(1);
    expect(store.getState().groups[0]).toMatchObject({
      name: 'Fixed Bills',
      archived: false,
      isSystem: false,
    });
  });

  it('reports empty groups/categories for a freshly created database (no prior history)', async () => {
    const store = createCategoriesStore(db);
    await store.getState().fetchAll();
    expect(store.getState().groups).toEqual([]);
    expect(store.getState().categories).toEqual([]);
  });

  it('rejects a blank group name without writing to the db', async () => {
    const store = createCategoriesStore(db);
    const result = await store.getState().createGroup('   ');
    expect(result).toEqual({ ok: false, errors: { name: 'required' } });
    expect(store.getState().groups).toHaveLength(0);
  });

  it('creates a category under a group', async () => {
    const store = createCategoriesStore(db);
    const group = await store.getState().createGroup('Needs');
    if (!group.ok) throw new Error('expected group creation to succeed');

    const result = await store
      .getState()
      .createCategory({ name: 'Groceries', groupId: group.id, icon: '🛒' });
    expect(result.ok).toBe(true);
    expect(store.getState().categories[0]).toMatchObject({
      name: 'Groceries',
      groupId: group.id,
      icon: '🛒',
    });
  });

  it('rejects a category with no group selected (edge case)', async () => {
    const store = createCategoriesStore(db);
    const result = await store
      .getState()
      .createCategory({ name: 'Groceries', groupId: null, icon: null });
    expect(result).toEqual({ ok: false, errors: { groupId: 'required' } });
  });

  it('moves a category to a different group on update', async () => {
    const store = createCategoriesStore(db);
    const groupA = await store.getState().createGroup('Needs');
    const groupB = await store.getState().createGroup('Wants');
    if (!groupA.ok || !groupB.ok) throw new Error('expected groups to be created');

    const category = await store
      .getState()
      .createCategory({ name: 'Dining', groupId: groupA.id, icon: null });
    if (!category.ok) throw new Error('expected category creation to succeed');

    await store
      .getState()
      .updateCategory(category.id, { name: 'Dining Out', groupId: groupB.id, icon: '🍔' });

    const updated = store.getState().categories.find((c) => c.id === category.id);
    expect(updated).toMatchObject({ name: 'Dining Out', groupId: groupB.id, icon: '🍔' });
  });

  it('archives a category and excludes it from the fetched list', async () => {
    const store = createCategoriesStore(db);
    const group = await store.getState().createGroup('Needs');
    if (!group.ok) throw new Error('expected group creation to succeed');
    const category = await store
      .getState()
      .createCategory({ name: 'Groceries', groupId: group.id, icon: null });
    if (!category.ok) throw new Error('expected category creation to succeed');

    await store.getState().archiveCategory(category.id);

    expect(store.getState().categories).toHaveLength(0);
    const [row] = await db.select().from(categories).where(eq(categories.id, category.id));
    expect(row.archived).toBe(true);
  });

  it('archives a group and excludes it from the fetched list', async () => {
    const store = createCategoriesStore(db);
    const group = await store.getState().createGroup('Empty Group');
    if (!group.ok) throw new Error('expected group creation to succeed');

    await store.getState().archiveGroup(group.id);

    expect(store.getState().groups).toHaveLength(0);
    const [row] = await db.select().from(categoryGroups).where(eq(categoryGroups.id, group.id));
    expect(row.archived).toBe(true);
  });

  it('creates a full suggested-categories batch (groups + their categories)', async () => {
    const store = createCategoriesStore(db);

    await store.getState().createSuggestedCategories([
      {
        name: 'Fixed Bills',
        categories: [
          { name: 'Rent', icon: '🏠' },
          { name: 'Electricity', icon: '⚡' },
        ],
      },
      { name: 'Needs', categories: [{ name: 'Groceries', icon: '🛒' }] },
    ]);

    expect(store.getState().groups.map((g) => g.name)).toEqual(['Fixed Bills', 'Needs']);
    expect(
      store
        .getState()
        .categories.map((c) => c.name)
        .sort(),
    ).toEqual(['Electricity', 'Groceries', 'Rent']);
  });

  describe('§6.2 edit-mode Categories and Groups tab', () => {
    it('includes archived groups/categories only when explicitly requested', async () => {
      const store = createCategoriesStore(db);
      const group = await store.getState().createGroup('Needs');
      if (!group.ok) throw new Error('expected group creation to succeed');
      const category = await store
        .getState()
        .createCategory({ name: 'Groceries', groupId: group.id, icon: null });
      if (!category.ok) throw new Error('expected category creation to succeed');

      await store.getState().archiveCategory(category.id);
      await store.getState().archiveGroup(group.id);

      await store.getState().fetchAll();
      expect(store.getState().groups).toHaveLength(0);
      expect(store.getState().categories).toHaveLength(0);

      await store.getState().fetchAll(true);
      expect(store.getState().groups).toHaveLength(1);
      expect(store.getState().categories).toHaveLength(1);
    });

    it('reorders two groups', async () => {
      const store = createCategoriesStore(db);
      const a = await store.getState().createGroup('A');
      const b = await store.getState().createGroup('B');
      if (!a.ok || !b.ok) throw new Error('expected both groups to be created');
      expect(store.getState().groups.map((g) => g.name)).toEqual(['A', 'B']);

      await store.getState().reorderGroup(b.id, 'up');

      expect(store.getState().groups.map((g) => g.name)).toEqual(['B', 'A']);
    });

    it('reorders two categories within the same group', async () => {
      const store = createCategoriesStore(db);
      const group = await store.getState().createGroup('Needs');
      if (!group.ok) throw new Error('expected group creation to succeed');
      const a = await store
        .getState()
        .createCategory({ name: 'Groceries', groupId: group.id, icon: null });
      const b = await store
        .getState()
        .createCategory({ name: 'Gas', groupId: group.id, icon: null });
      if (!a.ok || !b.ok) throw new Error('expected both categories to be created');
      expect(store.getState().categories.map((c) => c.name)).toEqual(['Groceries', 'Gas']);

      await store.getState().reorderCategory(b.id, 'up');

      expect(store.getState().categories.map((c) => c.name)).toEqual(['Gas', 'Groceries']);
    });

    it('does not reorder a category across a different group (edge case)', async () => {
      const store = createCategoriesStore(db);
      const groupA = await store.getState().createGroup('Needs');
      const groupB = await store.getState().createGroup('Wants');
      if (!groupA.ok || !groupB.ok) throw new Error('expected groups to be created');
      const onlyInB = await store
        .getState()
        .createCategory({ name: 'Dining', groupId: groupB.id, icon: null });
      if (!onlyInB.ok) throw new Error('expected category creation to succeed');

      await store.getState().reorderCategory(onlyInB.id, 'up');

      const [row] = await db.select().from(categories).where(eq(categories.id, onlyInB.id));
      expect(row.sortOrder).toBe(0);
    });

    it("never disturbs a pinned system group's position, even via a neighbor's reorder (§2.4)", async () => {
      const store = createCategoriesStore(db);
      // Mirrors accountsStore.ts's ensureCreditCardPaymentCategory: a system
      // group is pinned first via a negative sortOrder.
      const [systemGroup] = await db
        .insert(categoryGroups)
        .values({ name: 'Credit Card Payments', sortOrder: -1, isSystem: true, archived: false })
        .returning();
      const normal = await store.getState().createGroup('Needs');
      if (!normal.ok) throw new Error('expected group creation to succeed');
      await store.getState().fetchAll();

      // The normal group tries to move "up", which would swap it with the
      // system group sitting right before it.
      await store.getState().reorderGroup(normal.id, 'up');

      const [systemRow] = await db
        .select()
        .from(categoryGroups)
        .where(eq(categoryGroups.id, systemGroup.id));
      expect(systemRow.sortOrder).toBe(-1); // unchanged
    });

    it("never disturbs a pinned system category's position, even via a neighbor's reorder", async () => {
      const store = createCategoriesStore(db);
      const group = await store.getState().createGroup('Credit Card Payments');
      if (!group.ok) throw new Error('expected group creation to succeed');
      const [systemCategory] = await db
        .insert(categories)
        .values({
          groupId: group.id,
          name: 'Payment — Nubank',
          isSystem: true,
          sortOrder: 0,
          archived: false,
        })
        .returning();
      const normal = await store
        .getState()
        .createCategory({ name: 'Payment — Inter', groupId: group.id, icon: null });
      if (!normal.ok) throw new Error('expected category creation to succeed');
      await store.getState().fetchAll();

      await store.getState().reorderCategory(normal.id, 'up');

      const [systemRow] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, systemCategory.id));
      expect(systemRow.sortOrder).toBe(0); // unchanged
    });
  });
});
