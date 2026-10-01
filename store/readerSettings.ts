import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';

import type { ReaderPosition, ReaderTheme } from '@/types';

export const READER_STORAGE_KEY = 'aleph-reader';
const LOCATIONS_KEY = 'aleph-locations';

export interface ReaderData {
  positions: Record<string, ReaderPosition>;
  settings: ReaderTheme;
}

function save(data: ReaderData) {
  void saveJson(READER_STORAGE_KEY, data);
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
  savePosition: (bookId: string, cfi: string, progress?: { percent: number; chapter: string }) => void;
  getPosition: (bookId: string) => string | null;
  updateSettings: (partial: Partial<ReaderTheme>) => void;
  saveLocations: (bookId: string, locations: string) => void;
  getLocations: (bookId: string) => Promise<string | null>;
  replaceReaderData: (data: ReaderData) => void;
}

export const useReaderSettingsStore = create<ReaderSettingsState>()((set, get) => {
  AsyncStorage.getItem(READER_STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          set({
            positions: parsed.positions ?? {},
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
            _hydrated: true,
          });
          return;
        }
        throw new Error('Invalid reader settings data');
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(READER_STORAGE_KEY);
    });

  return {
    positions: {},
    settings: DEFAULT_SETTINGS,
    _hydrated: false,

    savePosition: (bookId, cfi, progress) =>
      set((state) => {
        if (!state._hydrated) return state;
        const positions = {
          ...state.positions,
          [bookId]: { cfi, updatedAt: new Date().toISOString(), ...progress },
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
        if (!state._hydrated) return state;
        const settings = { ...state.settings, ...partial };
        save({ positions: state.positions, settings });
        return { settings };
      }),

    saveLocations: (bookId, locations) => {
      AsyncStorage.getItem(LOCATIONS_KEY)
        .then((raw) => {
          const cache = raw ? JSON.parse(raw) : {};
          cache[bookId] = locations;
          void saveJson(LOCATIONS_KEY, cache);
        })
        .catch(() => {});
    },

    getLocations: async (bookId) => {
      try {
        const raw = await AsyncStorage.getItem(LOCATIONS_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        return cache[bookId] ?? null;
      } catch {
        return null;
      }
    },

    replaceReaderData: (data) => {
      if (!get()._hydrated) return;
      save(data);
      set(data);
    },
  };
});
