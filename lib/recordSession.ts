import { randomUUID } from 'expo-crypto';

import { saveJsonMany } from '@/lib/storage';
import { BOOKS_STORAGE_KEY, useBooksStore, withStatus } from '@/store/books';
import { SESSIONS_STORAGE_KEY, useSessionsStore } from '@/store/sessions';
import type { BookStatus, Session } from '@/types';

/**
 * Record a reading session together with the book's new progress. Both are
 * written in a single storage call so a failure cannot keep one without the other.
 */
export function recordSession(
  session: Omit<Session, 'id'>,
  progress: { currentPage?: number; status?: BookStatus },
): boolean {
  const booksState = useBooksStore.getState();
  const sessionsState = useSessionsStore.getState();
  if (!booksState._hydrated || !sessionsState._hydrated) return false;

  const sessions = [...sessionsState.sessions, { ...session, id: randomUUID() }];
  const books = booksState.books.map((book) => {
    if (book.id !== session.bookId) return book;
    const updated = progress.currentPage === undefined ? book : { ...book, currentPage: progress.currentPage };
    return progress.status && progress.status !== book.status ? withStatus(updated, progress.status) : updated;
  });

  void saveJsonMany({ [SESSIONS_STORAGE_KEY]: sessions, [BOOKS_STORAGE_KEY]: books });
  useSessionsStore.setState({ sessions });
  useBooksStore.setState({ books });
  return true;
}
