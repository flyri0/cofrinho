export type NameFieldErrorCode = 'required';

export interface GroupFormErrors {
  name?: NameFieldErrorCode;
}

export function validateGroupForm(values: { name: string }): GroupFormErrors {
  return values.name.trim() ? {} : { name: 'required' };
}

export function isGroupFormValid(errors: GroupFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

export interface NewGroupRecord {
  name: string;
  sortOrder: number;
  isSystem: false;
  archived: false;
}

export function buildNewGroupRecord(values: { name: string }, sortOrder: number): NewGroupRecord {
  return { name: values.name.trim(), sortOrder, isSystem: false, archived: false };
}

export interface GroupRecordUpdate {
  name: string;
}

export function buildGroupUpdate(values: { name: string }): GroupRecordUpdate {
  return { name: values.name.trim() };
}

export interface CategoryFormErrors {
  name?: NameFieldErrorCode;
  groupId?: NameFieldErrorCode;
}

export function validateCategoryForm(values: {
  name: string;
  groupId: number | null;
}): CategoryFormErrors {
  const errors: CategoryFormErrors = {};
  if (!values.name.trim()) errors.name = 'required';
  if (values.groupId === null) errors.groupId = 'required';
  return errors;
}

export function isCategoryFormValid(errors: CategoryFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

export interface NewCategoryRecord {
  name: string;
  groupId: number;
  icon: string | null;
  sortOrder: number;
  isSystem: false;
  archived: false;
}

export function buildNewCategoryRecord(
  values: { name: string; groupId: number; icon: string | null },
  sortOrder: number,
): NewCategoryRecord {
  return {
    name: values.name.trim(),
    groupId: values.groupId,
    icon: values.icon,
    sortOrder,
    isSystem: false,
    archived: false,
  };
}

export interface CategoryRecordUpdate {
  name: string;
  groupId: number;
  icon: string | null;
}

export function buildCategoryUpdate(values: {
  name: string;
  groupId: number;
  icon: string | null;
}): CategoryRecordUpdate {
  return { name: values.name.trim(), groupId: values.groupId, icon: values.icon };
}
