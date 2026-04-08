import { writable } from 'svelte/store';

function createSearchStore() {
  const { subscribe, set } = writable<string>('');

  return {
    subscribe,
    setQuery: (query: string) => set(query),
    clear: () => set('')
  };
}

export const searchStore = createSearchStore();
