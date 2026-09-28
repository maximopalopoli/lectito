import { create } from 'zustand';

interface StorageHealthState {
  readError: string | null;
  writeError: string | null;
  reportReadError: (key: string) => void;
  reportWriteError: (key: string) => void;
  clearWriteError: (key: string) => void;
}

export const useStorageHealthStore = create<StorageHealthState>()((set) => ({
  readError: null,
  writeError: null,
  reportReadError: (key) => set({ readError: key }),
  reportWriteError: (key) => set({ writeError: key }),
  clearWriteError: (key) => set((state) => ({
    writeError: state.writeError === key ? null : state.writeError,
  })),
}));
