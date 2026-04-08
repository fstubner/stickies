import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

function createToastsStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString();
      update(toasts => [...toasts, { ...toast, id }]);
      if (toast.duration) {
        setTimeout(() => {
          update(toasts => toasts.filter(t => t.id !== id));
        }, toast.duration);
      }
    },
    remove: (id: string) => update(toasts => toasts.filter(t => t.id !== id))
  };
}

export const toastsStore = createToastsStore();
