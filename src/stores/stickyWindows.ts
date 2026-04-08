import { writable } from 'svelte/store';

function createStickyWindowsStore() {
  const { subscribe, set } = writable<string[]>([]);

  return {
    subscribe,
    add: (id: string) => {
      // Implementation would go here
    },
    remove: (id: string) => {
      // Implementation would go here
    }
  };
}

export const stickyWindowsStore = createStickyWindowsStore();

export function updateOpenStickyWindows(ids: string[]): void {
  stickyWindowsStore.set(ids);
}
