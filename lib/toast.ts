import { create } from 'zustand';

export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toast: ToastData | null;
  show: (toast: Omit<ToastData, 'id'>) => void;
  hide: (id?: number) => void;
}

export const TOAST_DURATION_MS = 5000;

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  // Con `id`, solo se cierra si sigue siendo ese toast (no uno más nuevo que lo reemplazó).
  hide: (id) => {
    if (id === undefined || get().toast?.id === id) set({ toast: null });
  },
}));

export function showToast(toast: Omit<ToastData, 'id'>) {
  useToastStore.getState().show(toast);
}
