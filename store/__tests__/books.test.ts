import { useBooksStore } from '../books';
import { useListsStore } from '../lists';
import { useSessionsStore } from '../sessions';
import { useQuotesStore } from '../quotes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  loadStored: (key: string) => jest.requireMock('@react-native-async-storage/async-storage').getItem(key),
  saveJson: jest.fn().mockResolvedValue(undefined), reportReadError: jest.fn() }));
jest.mock('../lists', () => ({ useListsStore: { getState: jest.fn() } }));
jest.mock('../sessions', () => ({ useSessionsStore: { getState: jest.fn() } }));
jest.mock('../quotes', () => ({ useQuotesStore: { getState: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
});

test('deleting a book removes it from custom lists as well as sessions and quotes', async () => {
  await Promise.resolve();
  const removeBookFromAll = jest.fn();
  const deleteByBookSessions = jest.fn();
  const deleteByBookQuotes = jest.fn();
  jest.mocked(useListsStore.getState).mockReturnValue({ _hydrated: true, removeBookFromAll } as never);
  jest.mocked(useSessionsStore.getState).mockReturnValue({ _hydrated: true, deleteByBook: deleteByBookSessions } as never);
  jest.mocked(useQuotesStore.getState).mockReturnValue({ _hydrated: true, deleteByBook: deleteByBookQuotes } as never);
  useBooksStore.setState({ books: [{ id: 'book-1' } as never], _hydrated: true });

  useBooksStore.getState().deleteBook('book-1');

  expect(useBooksStore.getState().books).toEqual([]);
  expect(removeBookFromAll).toHaveBeenCalledWith('book-1');
  expect(deleteByBookSessions).toHaveBeenCalledWith('book-1');
  expect(deleteByBookQuotes).toHaveBeenCalledWith('book-1');
});

test('does not mutate or save books while local data is still loading', async () => {
  let finishRead: ((value: string | null) => void) | undefined;
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((resolve) => {
    finishRead = resolve;
  }));

  let store: typeof useBooksStore;
  jest.isolateModules(() => {
    store = require('../books').useBooksStore;
  });
  store!.getState().addBook({ title: 'New book', status: 'WANT_TO_READ' } as never);
  expect(store!.getState().books).toEqual([]);
  expect(saveJson).not.toHaveBeenCalled();

  finishRead?.(JSON.stringify([{ id: 'existing' }]));
  await Promise.resolve();
  expect(store!.getState().books).toEqual([{ id: 'existing' }]);
  expect(store!.getState()._hydrated).toBe(true);
});

test.each([
  ['failed', () => Promise.reject(new Error('read failed'))],
  ['malformed', () => Promise.resolve('{"books":[]}')],
])('keeps books locked after a %s local read', async (_label, read) => {
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(read);
  let store: typeof useBooksStore;
  jest.isolateModules(() => {
    store = require('../books').useBooksStore;
  });
  await Promise.resolve();
  await Promise.resolve();

  expect(reportReadError).toHaveBeenCalledWith('aleph-books');
  expect(store!.getState()._hydrated).toBe(false);
  store!.getState().replaceBooks([]);
  store!.getState().addBook({ title: 'New book', status: 'WANT_TO_READ' } as never);
  expect(saveJson).not.toHaveBeenCalled();
});
