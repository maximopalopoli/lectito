import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Session } from '@/types';

const STORAGE_KEY = 'aleph-sessions';

function saveSessions(sessions: Session[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)).catch(() => {});
}

export interface SessionsState {
  sessions: Session[];
  _hydrated: boolean;
  addSession: (session: Omit<Session, 'id'>) => void;
  deleteSession: (id: string) => void;
}

export const useSessionsStore = create<SessionsState>()((set) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ sessions: parsed, _hydrated: true });
          return;
        }
      }
      set({ _hydrated: true });
    })
    .catch(() => set({ _hydrated: true }));

  return {
    sessions: [],
    _hydrated: false,

    addSession: (session) =>
      set((state) => {
        const sessions = [
          ...state.sessions,
          {
            ...session,
            id: randomUUID(),
          },
        ];
        saveSessions(sessions);
        return { sessions };
      }),

    deleteSession: (id) =>
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id);
        saveSessions(sessions);
        return { sessions };
      }),
  };
});
