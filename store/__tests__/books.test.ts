import { useBooksStore } from '../books';
import { useListsStore } from '../lists';
import { useSessionsStore } from '../sessions';
import { useQuotesStore } from '../quotes';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('@/lib/storage', () => ({ saveJson: jest.fn().mockResolvedValue(undefined), reportReadError: jest.fn() }));
jest.mock('../lists', () => ({ useListsStore: { getState: jest.fn() } }));
jest.mock('../sessions', () => ({ useSessionsStore: { getState: jest.fn() } }));
jest.mock('../quotes', () => ({ useQuotesStore: { getState: jest.fn() } }));

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
