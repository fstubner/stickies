import { writable } from 'svelte/store';

export interface SearchState {
  query: string;
  results: any[];
  isSearching: boolean;
  filters: {
    tags?: string[];
    colors?: string[];
    dateRange?: { start: number; end: number };
  };
}

const initialState: SearchState = {
  query: '',
  results: [],
  isSearching: false,
  filters: {}
};

function createSearchStore() {
  const { subscribe, set, update } = writable<SearchState>(initialState);

  return {
    subscribe,
    setQuery: (query: string) => update(state => ({ ...state, query })),
    setResults: (results: any[]) => update(state => ({ ...state, results })),
    setSearching: (isSearching: boolean) => update(state => ({ ...state, isSearching })),
    addFilter: (key: string, value: any) => {
      update(state => ({
        ...state,
        filters: { ...state.filters, [key]: value }
      }));
    },
    clearFilters: () => update(state => ({ ...state, filters: {} })),
    reset: () => set(initialState)
  };
}

export const search = createSearchStore();
