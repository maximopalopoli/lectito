import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeStored, reportReadError, saveJson } from '@/lib/storage';

import type { Goal } from '@/types';

const STORAGE_KEY = 'aleph-goal';

function saveGoal(goal: Goal | null) {
  if (goal) {
    void saveJson(STORAGE_KEY, goal);
  } else {
    void removeStored(STORAGE_KEY);
  }
}

export interface GoalsState {
  goal: Goal | null;
  _hydrated: boolean;
  setGoal: (goal: Goal) => void;
  clearGoal: () => void;
}

export const useGoalsStore = create<GoalsState>()((set, get) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ goal: parsed, _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    })
    .catch(() => {
      reportReadError(STORAGE_KEY);
      set({ _hydrated: true });
    });

  return {
    goal: null,
    _hydrated: false,

    setGoal: (goal) => {
      if (!get()._hydrated) return;
      saveGoal(goal);
      set({ goal });
    },

    clearGoal: () => {
      if (!get()._hydrated) return;
      saveGoal(null);
      set({ goal: null });
    },
  };
});
