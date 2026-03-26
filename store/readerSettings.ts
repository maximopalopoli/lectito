import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ReaderPosition, ReaderTheme } from '@/types';

const STORAGE_KEY = 'aleph-reader';

interface ReaderData {
  positions: Record<string, ReaderPosition>;
  settings: ReaderTheme;
}

function save(data: ReaderData) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

const DEFAULT_SETTINGS: ReaderTheme = {
  fontSize: 100,
  fontFamily: 'default',
  theme: 'light',
};

export interface ReaderSettingsState {
  positions: Record<string, ReaderPosition>;
  settings: ReaderTheme;
  _hydrated: boolean;
  savePosition: (bookId: string, cfi: string) => void;
  getPosition: (bookId: string) => string | null;
  updateSettings: (partial: Partial<ReaderTheme>) => void;
}

export const useReaderSettingsStore = create<ReaderSettingsState>()((set, get) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          set({
            positions: parsed.positions ?? {},
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
            _hydrated: true,
          });
          return;
        }
      }
      set({ _hydrated: true });
    })
    .catch(() => set({ _hydrated: true }));

  return {
    positions: {},
    settings: DEFAULT_SETTINGS,
    _hydrated: false,

    savePosition: (bookId, cfi) =>
      set((state) => {
        const positions = {
          ...state.positions,
          [bookId]: { cfi, updatedAt: new Date().toISOString() },
        };
        save({ positions, settings: state.settings });
        return { positions };
      }),

    getPosition: (bookId) => {
      const pos = get().positions[bookId];
      return pos?.cfi ?? null;
    },

    updateSettings: (partial) =>
      set((state) => {
        const settings = { ...state.settings, ...partial };
        save({ positions: state.positions, settings });
        return { settings };
      }),
  };
});
