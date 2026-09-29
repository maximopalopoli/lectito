import type { ReadingList } from '@/types';

export function isReadingList(value: unknown): value is ReadingList {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const list = value as Record<string, unknown>;
  return typeof list.id === 'string' && list.id.length > 0 &&
    typeof list.name === 'string' && list.name.trim().length > 0 &&
    typeof list.createdAt === 'string' &&
    Array.isArray(list.bookIds) && list.bookIds.every((id) => typeof id === 'string') &&
    new Set(list.bookIds).size === list.bookIds.length;
}
