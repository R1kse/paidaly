import { create } from 'zustand';

type Toast = {
  id: string;
  message: string;
  tone: 'info' | 'error';
};

type ToastState = {
  toasts: Toast[];
  show: (message: string, tone?: Toast['tone']) => void;
  remove: (id: string) => void;
  clear: () => void;
};

function nextId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, tone = 'info') => {
    const id = nextId();
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone }],
    }));
    setTimeout(() => {
      useToastStore.getState().remove(id);
    }, 3500);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));