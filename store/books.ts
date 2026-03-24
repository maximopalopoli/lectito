import { create } from 'zustand';

import type { Book, BookStatus } from '@/types';

const STORAGE_KEY = 'aleph-books';

function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveBooks(books: Book[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch {
    // Ignore
  }
}

export interface BooksState {
  books: Book[];
  addBook: (book: Omit<Book, 'id' | 'addedAt' | 'currentPage'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  changeStatus: (id: string, status: BookStatus) => void;
}

export const useBooksStore = create<BooksState>()((set) => ({
  books: loadBooks(),

  addBook: (book) =>
    set((state) => {
      const books = [
        ...state.books,
        {
          ...book,
          id: crypto.randomUUID(),
          addedAt: new Date().toISOString(),
          currentPage: 0,
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
        b.id === id ? { ...b, status } : b,
      );
      saveBooks(books);
      return { books };
    }),
}));
