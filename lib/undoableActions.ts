import { showToast } from '@/lib/toast';
import { useBooksStore } from '@/store/books';
import { useListsStore } from '@/store/lists';
import { useQuotesStore } from '@/store/quotes';
import { useSessionsStore } from '@/store/sessions';
import type { BookStatus } from '@/types';

/**
 * Acciones destructivas que se aplican al instante y se pueden deshacer desde un toast,
 * en lugar de pedir confirmación con `Alert` (que en web no hace nada).
 */

export function deleteBookWithUndo(bookId: string) {
  const book = useBooksStore.getState().books.find((b) => b.id === bookId);
  if (!book) return;
  const sessions = useSessionsStore.getState().sessions.filter((s) => s.bookId === bookId);
  const quotes = useQuotesStore.getState().quotes.filter((q) => q.bookId === bookId);
  const listIds = useListsStore.getState().lists.filter((l) => l.bookIds.includes(bookId)).map((l) => l.id);

  useBooksStore.getState().deleteBook(bookId);

  showToast({
    message: `Eliminaste “${book.title}”`,
    actionLabel: 'Deshacer',
    onAction: () => {
      const books = useBooksStore.getState();
      if (!books.books.some((b) => b.id === bookId)) books.replaceBooks([...books.books, book]);
      const sessionStore = useSessionsStore.getState();
      sessionStore.replaceSessions([...sessionStore.sessions, ...sessions]);
      const quoteStore = useQuotesStore.getState();
      quoteStore.replaceQuotes([...quoteStore.quotes, ...quotes]);
      const listStore = useListsStore.getState();
      listStore.replaceLists(
        listStore.lists.map((l) =>
          listIds.includes(l.id) && !l.bookIds.includes(bookId) ? { ...l, bookIds: [...l.bookIds, bookId] } : l,
        ),
      );
    },
  });
}

export function changeStatusWithUndo(bookId: string, status: BookStatus, message: string) {
  const book = useBooksStore.getState().books.find((b) => b.id === bookId);
  if (!book) return;
  const { status: previousStatus, completedAt } = book;
  useBooksStore.getState().changeStatus(bookId, status);
  showToast({
    message,
    actionLabel: 'Deshacer',
    // changeStatus pisa completedAt, así que se restaura tal cual estaba.
    onAction: () => useBooksStore.getState().updateBook(bookId, { status: previousStatus, completedAt }),
  });
}

export function deleteQuoteWithUndo(quoteId: string) {
  const quotes = useQuotesStore.getState().quotes;
  const index = quotes.findIndex((q) => q.id === quoteId);
  if (index === -1) return;
  const quote = quotes[index];
  useQuotesStore.getState().deleteQuote(quoteId);
  showToast({
    message: 'Cita eliminada',
    actionLabel: 'Deshacer',
    onAction: () => {
      const current = useQuotesStore.getState().quotes;
      if (current.some((q) => q.id === quoteId)) return;
      const restored = [...current];
      restored.splice(Math.min(index, restored.length), 0, quote);
      useQuotesStore.getState().replaceQuotes(restored);
    },
  });
}

export function deleteListWithUndo(listId: string) {
  const lists = useListsStore.getState().lists;
  const index = lists.findIndex((l) => l.id === listId);
  if (index === -1) return;
  const list = lists[index];
  useListsStore.getState().deleteList(listId);
  showToast({
    message: `Eliminaste la lista “${list.name}”`,
    actionLabel: 'Deshacer',
    onAction: () => {
      const current = useListsStore.getState().lists;
      if (current.some((l) => l.id === listId)) return;
      const restored = [...current];
      restored.splice(Math.min(index, restored.length), 0, list);
      useListsStore.getState().replaceLists(restored);
    },
  });
}
