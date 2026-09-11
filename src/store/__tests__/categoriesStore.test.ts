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
});
