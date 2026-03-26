import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecommendationsCache } from '@/types';

const STORAGE_KEY = 'aleph-recommendations';

function save(cache: RecommendationsCache | null) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {});
}

export interface RecommendationsState {
  cache: RecommendationsCache | null;
  _hydrated: boolean;
  setCache: (cache: RecommendationsCache) => void;
  clearCache: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>()((set) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed: RecommendationsCache = JSON.parse(raw);
        set({ cache: parsed, _hydrated: true });
        return;
      }
      set({ _hydrated: true });
    })
    .catch(() => set({ _hydrated: true }));

  return {
    cache: null,
    _hydrated: false,

    setCache: (cache) => {
      save(cache);
      set({ cache });
    },

    clearCache: () => {
      save(null);
      set({ cache: null });
    },
  };
});
