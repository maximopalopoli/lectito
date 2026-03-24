import { create } from 'zustand';

import type { Book, BookStatus } from '@/types';

export interface BooksState {
  books: Book[];
  addBook: (book: Omit<Book, 'id' | 'addedAt' | 'currentPage'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  changeStatus: (id: string, status: BookStatus) => void;
}

export const useBooksStore = create<BooksState>()((set) => ({
  books: [],

  addBook: (book) =>
    set((state) => ({
      books: [
        ...state.books,
        {
          ...book,
          id: crypto.randomUUID(),
          addedAt: new Date().toISOString(),
          currentPage: 0,
        },
      ],
    })),

  updateBook: (id, updates) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    })),

  deleteBook: (id) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    })),

  changeStatus: (id, status) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === id ? { ...b, status } : b,
      ),
    })),
}));
