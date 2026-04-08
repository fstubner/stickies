import { writable } from 'svelte/store';

export interface StickyWindow {
  id: string;
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  alwaysOnTop: boolean;
}

function createStickyWindowsStore() {
  const { subscribe, set, update } = writable<StickyWindow[]>([]);

  return {
    subscribe,
    add: (window: StickyWindow) => {
      update(windows => [...windows, window]);
    },
    remove: (id: string) => {
      update(windows => windows.filter(w => w.id !== id));
    },
    update: (id: string, window: Partial<StickyWindow>) => {
      update(windows =>
        windows.map(w => (w.id === id ? { ...w, ...window } : w))
      );
    },
    clear: () => set([])
  };
}

export const stickyWindows = createStickyWindowsStore();
