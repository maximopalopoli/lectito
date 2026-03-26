import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Book, BookStatus } from '@/types';

const STORAGE_KEY = 'aleph-books';

function saveBooks(books: Book[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(books)).catch(() => {});
}

export interface BooksState {
  books: Book[];
  _hydrated: boolean;
  addBook: (book: Omit<Book, 'id' | 'addedAt' | 'completedAt' | 'currentPage' | 'epubUri'> & { epubUri?: string | null }) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  changeStatus: (id: string, status: BookStatus) => void;
  replaceBooks: (books: Book[]) => void;
}

export const useBooksStore = create<BooksState>()((set) => {
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
    .catch(() => set({ _hydrated: true }));

  return {
    books: [],
    _hydrated: false,

    addBook: (book) =>
      set((state) => {
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
        const books = state.books.map((b) =>
          b.id === id ? { ...b, ...updates } : b,
        );
        saveBooks(books);
        return { books };
      }),

    deleteBook: (id) =>
      set((state) => {
        const books = state.books.filter((b) => b.id !== id);
        saveBooks(books);
        return { books };
      }),

    changeStatus: (id, status) =>
      set((state) => {
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
      saveBooks(books);
      set({ books });
    },
  };
});
