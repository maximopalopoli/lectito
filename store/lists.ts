import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportReadError, saveJson } from '@/lib/storage';
import { isReadingList } from '@/lib/listValidation';
import type { ReadingList } from '@/types';

export const LISTS_STORAGE_KEY = 'aleph-lists';

export interface ListsState {
  lists: ReadingList[];
  _hydrated: boolean;
  createList: (name: string) => string | null;
  renameList: (id: string, name: string) => boolean;
  deleteList: (id: string) => void;
  toggleBook: (listId: string, bookId: string) => void;
  removeBookFromAll: (bookId: string) => void;
  replaceLists: (lists: ReadingList[]) => void;
}

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function validName(lists: ReadingList[], name: string, exceptId?: string): boolean {
  return name.length > 0 && name.length <= 60 &&
    !lists.some((list) => list.id !== exceptId && list.name.toLocaleLowerCase() === name.toLocaleLowerCase());
}

function saveLists(lists: ReadingList[]): void {
  void saveJson(LISTS_STORAGE_KEY, lists);
}

export const useListsStore = create<ListsState>()((set, get) => {
  AsyncStorage.getItem(LISTS_STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isReadingList) ||
          new Set(parsed.map((list) => list.id)).size !== parsed.length ||
          new Set(parsed.map((list) => list.name.toLocaleLowerCase())).size !== parsed.length) {
          reportReadError(LISTS_STORAGE_KEY);
          return;
        }
        set({ lists: parsed, _hydrated: true });
        return;
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(LISTS_STORAGE_KEY);
    });

  return {
    lists: [],
    _hydrated: false,

    createList: (rawName) => {
      const name = normalizedName(rawName);
      if (!get()._hydrated || !validName(get().lists, name)) return null;
      const id = randomUUID();
      set((state) => {
        const lists = [...state.lists, { id, name, bookIds: [], createdAt: new Date().toISOString() }];
        saveLists(lists);
        return { lists };
      });
      return id;
    },

    renameList: (id, rawName) => {
      const name = normalizedName(rawName);
      if (!get()._hydrated || !get().lists.some((list) => list.id === id) || !validName(get().lists, name, id)) return false;
      set((state) => {
        const lists = state.lists.map((list) => list.id === id ? { ...list, name } : list);
        saveLists(lists);
        return { lists };
      });
      return true;
    },

    deleteList: (id) => set((state) => {
      if (!state._hydrated || !state.lists.some((list) => list.id === id)) return state;
      const lists = state.lists.filter((list) => list.id !== id);
      saveLists(lists);
      return { lists };
    }),

    toggleBook: (listId, bookId) => set((state) => {
      if (!state._hydrated || !state.lists.some((list) => list.id === listId)) return state;
      const lists = state.lists.map((list) => {
        if (list.id !== listId) return list;
        const bookIds = list.bookIds.includes(bookId)
          ? list.bookIds.filter((id) => id !== bookId)
          : [...list.bookIds, bookId];
        return { ...list, bookIds };
      });
      saveLists(lists);
      return { lists };
    }),

    removeBookFromAll: (bookId) => set((state) => {
      if (!state._hydrated || !state.lists.some((list) => list.bookIds.includes(bookId))) return state;
      const lists = state.lists.map((list) => ({
        ...list,
        bookIds: list.bookIds.filter((id) => id !== bookId),
      }));
      saveLists(lists);
      return { lists };
    }),

    replaceLists: (lists) => {
      if (!get()._hydrated) return;
      saveLists(lists);
      set({ lists });
    },
  };
});
