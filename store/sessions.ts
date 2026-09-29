import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';

import type { Session } from '@/types';

const STORAGE_KEY = 'aleph-sessions';

function saveSessions(sessions: Session[]) {
  void saveJson(STORAGE_KEY, sessions);
}

export interface SessionsState {
  sessions: Session[];
  _hydrated: boolean;
  addSession: (session: Omit<Session, 'id'>) => void;
  deleteSession: (id: string) => void;
  deleteByBook: (bookId: string) => void;
  replaceSessions: (sessions: Session[]) => void;
}

export const useSessionsStore = create<SessionsState>()((set, get) => {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Invalid sessions data');
        set({ sessions: parsed, _hydrated: true });
        return;
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(STORAGE_KEY);
    });

  return {
    sessions: [],
    _hydrated: false,

    addSession: (session) =>
      set((state) => {
        if (!state._hydrated) return state;
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
        if (!state._hydrated) return state;
        const sessions = state.sessions.filter((s) => s.id !== id);
        saveSessions(sessions);
        return { sessions };
      }),

    deleteByBook: (bookId) =>
      set((state) => {
        if (!state._hydrated) return state;
        const sessions = state.sessions.filter((s) => s.bookId !== bookId);
        saveSessions(sessions);
        return { sessions };
      }),

    replaceSessions: (sessions) => {
      if (!get()._hydrated) return;
      saveSessions(sessions);
      set({ sessions });
    },
  };
});
