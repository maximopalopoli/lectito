import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeStored, reportReadError, saveJson } from '@/lib/storage';

import type { Goal } from '@/types';

export const GOAL_STORAGE_KEY = 'aleph-goal';
const SUGGESTION_KEY = 'aleph-goal-suggestion-dismissed';

function saveGoal(goal: Goal | null) {
  if (goal) {
    void saveJson(GOAL_STORAGE_KEY, goal);
  } else {
    void removeStored(GOAL_STORAGE_KEY);
  }
}

export interface GoalsState {
  goal: Goal | null;
  _hydrated: boolean;
  setGoal: (goal: Goal) => void;
  clearGoal: () => void;
  /** El usuario descartó la sugerencia de objetivo del inicio. */
  suggestionDismissed: boolean;
  dismissSuggestion: () => void;
}

export const useGoalsStore = create<GoalsState>()((set, get) => {
  AsyncStorage.getItem(GOAL_STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ goal: parsed, _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    })
    .catch(() => {
      reportReadError(GOAL_STORAGE_KEY);
    });

  AsyncStorage.getItem(SUGGESTION_KEY)
    .then((raw) => {
      if (raw) set({ suggestionDismissed: true });
    })
    .catch(() => {});

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

    suggestionDismissed: false,

    dismissSuggestion: () => {
      void saveJson(SUGGESTION_KEY, true);
      set({ suggestionDismissed: true });
    },
  };
});
