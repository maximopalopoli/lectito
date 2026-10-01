import { useToastStore } from '../toast';
import { changeStatusWithUndo, deleteBookWithUndo, deleteListWithUndo, deleteQuoteWithUndo } from '../undoableActions';
import { useBooksStore } from '@/store/books';
import { useListsStore } from '@/store/lists';
import { useQuotesStore } from '@/store/quotes';
import { useSessionsStore } from '@/store/sessions';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('@/lib/storage', () => ({ saveJson: jest.fn().mockResolvedValue(undefined), reportReadError: jest.fn() }));

const book = { id: 'b1', title: 'Meditaciones', status: 'READING', completedAt: null } as never;
const other = { id: 'b2', title: 'Otro', status: 'TBR', completedAt: null } as never;

beforeEach(() => {
  useBooksStore.setState({ books: [book, other], _hydrated: true });
  useSessionsStore.setState({ sessions: [{ id: 's1', bookId: 'b1' }, { id: 's2', bookId: 'b2' }] as never, _hydrated: true });
  useQuotesStore.setState({ quotes: [{ id: 'q1', bookId: 'b1' }, { id: 'q2', bookId: 'b1' }] as never, _hydrated: true });
  useListsStore.setState({ lists: [{ id: 'l1', name: 'Estoicos', bookIds: ['b1', 'b2'] }] as never, _hydrated: true });
  useToastStore.setState({ toast: null });
});

function undo() {
  const toast = useToastStore.getState().toast;
  expect(toast?.actionLabel).toBe('Deshacer');
  toast!.onAction!();
}

test('deleting a book is immediate and undo brings back its sessions, quotes and lists', () => {
  deleteBookWithUndo('b1');

  expect(useBooksStore.getState().books.map((b) => b.id)).toEqual(['b2']);
  expect(useSessionsStore.getState().sessions.map((s) => s.id)).toEqual(['s2']);
  expect(useQuotesStore.getState().quotes).toEqual([]);
  expect(useListsStore.getState().lists[0].bookIds).toEqual(['b2']);
  expect(useToastStore.getState().toast?.message).toBe('Eliminaste “Meditaciones”');

  undo();

  expect(useBooksStore.getState().books.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  expect(useSessionsStore.getState().sessions.map((s) => s.id).sort()).toEqual(['s1', 's2']);
  expect(useQuotesStore.getState().quotes.map((q) => q.id)).toEqual(['q1', 'q2']);
  expect(useListsStore.getState().lists[0].bookIds.sort()).toEqual(['b1', 'b2']);
});

test('undoing a status change restores the previous status and completion date', () => {
  useBooksStore.setState({ books: [{ ...(book as object), status: 'DONE', completedAt: '2026-05-01' } as never] });
  changeStatusWithUndo('b1', 'DNF', 'Abandonado');
  expect(useBooksStore.getState().books[0]).toMatchObject({ status: 'DNF', completedAt: null });

  undo();
  expect(useBooksStore.getState().books[0]).toMatchObject({ status: 'DONE', completedAt: '2026-05-01' });
});

test('undoing a quote or list deletion puts it back in the same position', () => {
  deleteQuoteWithUndo('q1');
  expect(useQuotesStore.getState().quotes.map((q) => q.id)).toEqual(['q2']);
  undo();
  expect(useQuotesStore.getState().quotes.map((q) => q.id)).toEqual(['q1', 'q2']);

  deleteListWithUndo('l1');
  expect(useListsStore.getState().lists).toEqual([]);
  undo();
  expect(useListsStore.getState().lists.map((l) => l.id)).toEqual(['l1']);
});

test('a newer toast replaces the previous one and a stale timeout does not close it', () => {
  useToastStore.getState().show({ message: 'uno' });
  const first = useToastStore.getState().toast!.id;
  useToastStore.getState().show({ message: 'dos' });
  useToastStore.getState().hide(first);
  expect(useToastStore.getState().toast?.message).toBe('dos');
});
