import { create } from 'zustand';
import { loadStored, reportReadError, saveJson } from '@/lib/storage';

import type { Profile } from '@/types';

export const PROFILE_STORAGE_KEY = 'aleph-profile';
export const MAX_NAME_LENGTH = 40;

const DEFAULT_PROFILE: Profile = { name: null, welcomeDone: false };

/** Espacios de más fuera; un nombre vacío cuenta como no darlo. */
export function normalizeName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  return name === '' ? null : name;
}

export interface ProfileState extends Profile {
  _hydrated: boolean;
  setName: (value: string) => void;
  finishWelcome: (name: string) => void;
}

export const useProfileStore = create<ProfileState>()((set) => {
  loadStored(PROFILE_STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Invalid profile data');
        }
        set({
          name: typeof parsed.name === 'string' ? normalizeName(parsed.name) : null,
          welcomeDone: parsed.welcomeDone === true,
          _hydrated: true,
        });
        return;
      }
      set({ _hydrated: true });
    })
    .catch(() => {
      reportReadError(PROFILE_STORAGE_KEY);
    });

  return {
    ...DEFAULT_PROFILE,
    _hydrated: false,

    setName: (value) =>
      set((state) => {
        if (!state._hydrated) return state;
        const profile: Profile = { name: normalizeName(value), welcomeDone: state.welcomeDone };
        void saveJson(PROFILE_STORAGE_KEY, profile);
        return profile;
      }),

    finishWelcome: (value) =>
      set((state) => {
        if (!state._hydrated) return state;
        const profile: Profile = { name: normalizeName(value), welcomeDone: true };
        void saveJson(PROFILE_STORAGE_KEY, profile);
        return profile;
      }),
  };
});
