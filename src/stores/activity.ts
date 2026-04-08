import { writable } from 'svelte/store';

export interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'view';
  noteId: string;
  timestamp: number;
  description: string;
}

function createActivityStore() {
  const { subscribe, set, update } = writable<Activity[]>([]);

  return {
    subscribe,
    log: (activity: Activity) => {
      update(activities => [activity, ...activities].slice(0, 100));
    },
    clear: () => set([])
  };
}

export const activity = createActivityStore();
