import { useListsStore } from '../lists';
import { saveJson } from '@/lib/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn().mockReturnValue('list-new') }));
jest.mock('@/lib/storage', () => ({ saveJson: jest.fn().mockResolvedValue(undefined), reportReadError: jest.fn() }));

const first = { id: 'list-1', name: 'Favoritos', bookIds: ['book-1', 'book-2'], createdAt: '2026-01-01' };
const second = { id: 'list-2', name: 'Pendientes', bookIds: ['book-1'], createdAt: '2026-01-02' };

beforeEach(async () => {
  await Promise.resolve();
  jest.clearAllMocks();
  useListsStore.setState({ lists: [first, second], _hydrated: true });
});

test('normalizes names and rejects duplicates', () => {
  expect(useListsStore.getState().createList('  Favoritos  ')).toBeNull();
  expect(useListsStore.getState().createList('  NUEVA   lista  ')).toBe('list-new');
  expect(useListsStore.getState().lists.at(-1)?.name).toBe('NUEVA lista');
  expect(useListsStore.getState().renameList('list-2', 'favoritos')).toBe(false);
  expect(useListsStore.getState().renameList('list-2', 'Por leer')).toBe(true);
});

test('adds and removes book memberships without changing other lists', () => {
  useListsStore.getState().toggleBook('list-2', 'book-2');
  expect(useListsStore.getState().lists[1].bookIds).toEqual(['book-1', 'book-2']);

  useListsStore.getState().removeBookFromAll('book-1');
  expect(useListsStore.getState().lists.map((list) => list.bookIds)).toEqual([['book-2'], ['book-2']]);
  expect(saveJson).toHaveBeenCalledWith('aleph-lists', expect.any(Array));
});

test('deleting a list leaves the others intact', () => {
  useListsStore.getState().deleteList('list-1');
  expect(useListsStore.getState().lists).toEqual([second]);
});
