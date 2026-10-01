import { create } from 'zustand';
import { loadStored, reportReadError, saveJson } from '@/lib/storage';

import type { RecommendationsCache } from '@/types';

const STORAGE_KEY = 'aleph-recommendations';

function save(cache: RecommendationsCache | null) {
  void saveJson(STORAGE_KEY, cache);
}

export interface RecommendationsState {
  cache: RecommendationsCache | null;
  _hydrated: boolean;
  setCache: (cache: RecommendationsCache) => void;
  clearCache: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>()((set, get) => {
  loadStored(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed: RecommendationsCache = JSON.parse(raw);
        set({ cache: parsed, _hydrated: true });
        return;
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(STORAGE_KEY);
    });

  return {
    cache: null,
    _hydrated: false,

    setCache: (cache) => {
      if (!get()._hydrated) return;
      save(cache);
      set({ cache });
    },

    clearCache: () => {
      if (!get()._hydrated) return;
      save(null);
      set({ cache: null });
    },
  };
});
