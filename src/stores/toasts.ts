import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

function createToastStore() {
  const { subscribe, set, update } = writable<Toast[]>([]);

  return {
    subscribe,
    show: (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = { ...toast, id };

      update(toasts => [...toasts, newToast]);

      if (toast.duration ?? 3000) {
        setTimeout(() => {
          update(toasts => toasts.filter(t => t.id !== id));
        }, toast.duration ?? 3000);
      }
    },
    dismiss: (id: string) => {
      update(toasts => toasts.filter(t => t.id !== id));
    },
    clear: () => set([])
  };
}

export const toasts = createToastStore();
