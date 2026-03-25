import { create } from 'zustand';

import type { Session } from '@/types';

const STORAGE_KEY = 'aleph-sessions';

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore
  }
}

export interface SessionsState {
  sessions: Session[];
  addSession: (session: Omit<Session, 'id'>) => void;
  deleteSession: (id: string) => void;
}

export const useSessionsStore = create<SessionsState>()((set) => ({
  sessions: loadSessions(),

  addSession: (session) =>
    set((state) => {
      const sessions = [
        ...state.sessions,
        {
          ...session,
          id: crypto.randomUUID(),
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
}));
