import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';

import type { Quote, QuoteColor } from '@/types';

const STORAGE_KEY = 'aleph-quotes';

function saveQuotes(quotes: Quote[]) {
  void saveJson(STORAGE_KEY, quotes);
}

export interface QuotesState {
  quotes: Quote[];
  _hydrated: boolean;
  addQuote: (
    bookId: string,
    text: string,
    pageNumber?: number | null,
    note?: string | null,
    color?: QuoteColor,
    cfi?: string | null,
  ) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  deleteByBook: (bookId: string) => void;
  replaceQuotes: (quotes: Quote[]) => void;
}

export const useQuotesStore = create<QuotesState>()((set, get) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ quotes: parsed, _hydrated: true });
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
    quotes: [],
    _hydrated: false,

    addQuote: (bookId, text, pageNumber, note, color, cfi) =>
      set((state) => {
        if (!state._hydrated) return state;
        const quotes = [
          ...state.quotes,
          {
            id: randomUUID(),
            bookId,
            text,
            pageNumber: pageNumber ?? null,
            note: note ?? null,
            color: color ?? 'yellow',
            cfi: cfi ?? null,
            createdAt: new Date().toISOString(),
          },
        ];
        saveQuotes(quotes);
        return { quotes };
      }),

    updateQuote: (id, updates) =>
      set((state) => {
        if (!state._hydrated) return state;
        const quotes = state.quotes.map((q) =>
          q.id === id ? { ...q, ...updates } : q,
        );
        saveQuotes(quotes);
        return { quotes };
      }),

    deleteQuote: (id) =>
      set((state) => {
        if (!state._hydrated) return state;
        const quotes = state.quotes.filter((q) => q.id !== id);
        saveQuotes(quotes);
        return { quotes };
      }),

    deleteByBook: (bookId) =>
      set((state) => {
        if (!state._hydrated) return state;
        const quotes = state.quotes.filter((q) => q.bookId !== bookId);
        saveQuotes(quotes);
        return { quotes };
      }),

    replaceQuotes: (quotes) => {
      if (!get()._hydrated) return;
      saveQuotes(quotes);
      set({ quotes });
    },
  };
});
