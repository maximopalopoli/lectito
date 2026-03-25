import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Goal } from '@/types';

const STORAGE_KEY = 'aleph-goal';

function saveGoal(goal: Goal | null) {
  if (goal) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goal)).catch(() => {});
  } else {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }
}

export interface GoalsState {
  goal: Goal | null;
  _hydrated: boolean;
  setGoal: (goal: Goal) => void;
  clearGoal: () => void;
}

export const useGoalsStore = create<GoalsState>()((set) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ goal: parsed, _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    })
    .catch(() => set({ _hydrated: true }));

  return {
    goal: null,
    _hydrated: false,

    setGoal: (goal) => {
      saveGoal(goal);
      set({ goal });
    },

    clearGoal: () => {
      saveGoal(null);
      set({ goal: null });
    },
  };
});
