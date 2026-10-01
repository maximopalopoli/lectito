import { recordSession } from '../recordSession';
import { saveJsonMany } from '../storage';
import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'session-1') }));
jest.mock('../storage', () => ({
  saveJsonMany: jest.fn().mockResolvedValue(undefined),
  loadStored: jest.fn().mockResolvedValue(null),
  saveJson: jest.fn().mockResolvedValue(undefined),
  reportReadError: jest.fn(),
}));

const book = { id: 'book-1', currentPage: 10, status: 'TBR', completedAt: null } as never;
const session = {
  bookId: 'book-1', startedAt: '2026-10-01T10:00:00.000Z', endedAt: '2026-10-01T10:30:00.000Z',
  durationMin: 30, pagesRead: 20, note: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useBooksStore.setState({ books: [book], _hydrated: true });
  useSessionsStore.setState({ sessions: [], _hydrated: true });
});

test('saves the session and the book progress in a single write', () => {
  expect(recordSession(session, { currentPage: 30, status: 'READING' })).toBe(true);

  const expectedBooks = [{ ...(book as object), currentPage: 30, status: 'READING', completedAt: null }];
  const expectedSessions = [{ ...session, id: 'session-1' }];
  expect(saveJsonMany).toHaveBeenCalledTimes(1);
  expect(saveJsonMany).toHaveBeenCalledWith({ 'aleph-sessions': expectedSessions, 'aleph-books': expectedBooks });
  expect(useBooksStore.getState().books).toEqual(expectedBooks);
  expect(useSessionsStore.getState().sessions).toEqual(expectedSessions);
});

test('sets the completion date when the session finishes the book', () => {
  recordSession(session, { currentPage: 100, status: 'DONE' });

  expect(useBooksStore.getState().books[0].completedAt).toEqual(expect.any(String));
});

test('does nothing while either store is still loading', () => {
  useSessionsStore.setState({ _hydrated: false });

  expect(recordSession(session, { currentPage: 30 })).toBe(false);
  expect(saveJsonMany).not.toHaveBeenCalled();
  expect(useBooksStore.getState().books).toEqual([book]);
});
