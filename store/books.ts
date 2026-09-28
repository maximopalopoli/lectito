import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';

import type { Book, BookSearchResult, BookStatus } from '@/types';
import { useSessionsStore } from './sessions';
import { useQuotesStore } from './quotes';

const STORAGE_KEY = 'aleph-books';

function saveBooks(books: Book[]) {
  void saveJson(STORAGE_KEY, books);
}

export interface BooksState {
  books: Book[];
  _hydrated: boolean;
  addBook: (book: BookSearchResult & { status: BookStatus; epubUri?: string | null }) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  changeStatus: (id: string, status: BookStatus) => void;
  replaceBooks: (books: Book[]) => void;
}

export const useBooksStore = create<BooksState>()((set, get) => {
  // Hydrate asynchronously
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ books: parsed, _hydrated: true });
          return;
        }
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(STORAGE_KEY);
      set({ _hydrated: true });
    });

  return {
    books: [],
    _hydrated: false,

    addBook: (book) =>
      set((state) => {
        if (!state._hydrated) return state;
        const books = [
          ...state.books,
          {
            ...book,
            id: randomUUID(),
            addedAt: new Date().toISOString(),
            completedAt: book.status === 'DONE' ? new Date().toISOString() : null,
            currentPage: 0,
            epubUri: book.epubUri ?? null,
            rating: null,
            review: null,
            tags: [],
          },
        ];
        saveBooks(books);
        return { books };
      }),

    updateBook: (id, updates) =>
      set((state) => {
        if (!state._hydrated) return state;
        const books = state.books.map((b) =>
          b.id === id ? { ...b, ...updates } : b,
        );
        saveBooks(books);
        return { books };
      }),

    deleteBook: (id) => {
      if (!get()._hydrated || !useSessionsStore.getState()._hydrated || !useQuotesStore.getState()._hydrated) return;
      // Cascade: drop the book's sessions and quotes so no orphan data keeps
      // feeding stats / streaks for a book that no longer exists.
      useSessionsStore.getState().deleteByBook(id);
      useQuotesStore.getState().deleteByBook(id);
      set((state) => {
        const books = state.books.filter((b) => b.id !== id);
        saveBooks(books);
        return { books };
      });
    },

    changeStatus: (id, status) =>
      set((state) => {
        if (!state._hydrated) return state;
        const books = state.books.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                completedAt: status === 'DONE' ? new Date().toISOString() : null,
              }
            : b,
        );
        saveBooks(books);
        return { books };
      }),

    replaceBooks: (books) => {
      if (!get()._hydrated) return;
      saveBooks(books);
      set({ books });
    },
  };
});
