import { writable } from 'svelte/store';

export type ViewMode = 'dashboard' | 'kanban' | 'calendar' | 'canvas' | 'list';

function createNavigationStore() {
  const { subscribe, set } = writable<ViewMode>('dashboard');

  return {
    subscribe,
    setView: (view: ViewMode) => set(view),
    back: () => {
      // Implementation would go here
    },
    forward: () => {
      // Implementation would go here
    }
  };
}

export const navigationStore = createNavigationStore();
