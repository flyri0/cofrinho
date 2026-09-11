import {
  buildCategoryUpdate,
  buildGroupUpdate,
  buildNewCategoryRecord,
  buildNewGroupRecord,
  isCategoryFormValid,
  isGroupFormValid,
  validateCategoryForm,
  validateGroupForm,
} from '../categoryForm';

describe('validateGroupForm / buildNewGroupRecord / buildGroupUpdate', () => {
  it('passes for a normal name and produces a fresh, non-system, non-archived record', () => {
    const errors = validateGroupForm({ name: 'Fixed Bills' });
    expect(isGroupFormValid(errors)).toBe(true);
    expect(buildNewGroupRecord({ name: '  Fixed Bills  ' }, 0)).toEqual({
      name: 'Fixed Bills',
      sortOrder: 0,
      isSystem: false,
      archived: false,
    });
  });

  it('requires a name (first group, no prior history)', () => {
    const errors = validateGroupForm({ name: '   ' });
    expect(errors.name).toBe('required');
    expect(isGroupFormValid(errors)).toBe(false);
  });

  it('trims the name on update, without touching other fields', () => {
    expect(buildGroupUpdate({ name: '  Needs  ' })).toEqual({ name: 'Needs' });
  });
});

describe('validateCategoryForm / buildNewCategoryRecord / buildCategoryUpdate', () => {
  it('passes for a normal category with a name and a group', () => {
    const errors = validateCategoryForm({ name: 'Groceries', groupId: 1 });
    expect(isCategoryFormValid(errors)).toBe(true);
  });

  it('requires both a name and a group', () => {
    const errors = validateCategoryForm({ name: '', groupId: null });
    expect(errors).toEqual({ name: 'required', groupId: 'required' });
  });

  it('requires a group even when the name is filled in (edge case)', () => {
    const errors = validateCategoryForm({ name: 'Groceries', groupId: null });
    expect(errors).toEqual({ groupId: 'required' });
  });

  it('builds a fresh category record with a null icon allowed', () => {
    const record = buildNewCategoryRecord({ name: '  Groceries  ', groupId: 3, icon: null }, 2);
    expect(record).toEqual({
      name: 'Groceries',
      groupId: 3,
      icon: null,
      sortOrder: 2,
      isSystem: false,
      archived: false,
    });
  });

  it('builds an update that moves a category to a different group', () => {
    expect(buildCategoryUpdate({ name: 'Market', groupId: 5, icon: '🛒' })).toEqual({
      name: 'Market',
      groupId: 5,
      icon: '🛒',
    });
  });
});
