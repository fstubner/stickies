import { writable } from 'svelte/store';

export type ViewType = 'canvas' | 'kanban' | 'calendar' | 'list' | 'activity' | 'chat' | 'settings';

interface NavigationState {
  currentView: ViewType;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
}

const initialState: NavigationState = {
  currentView: 'canvas',
  sidebarOpen: true,
  rightPanelOpen: false
};

function createNavigationStore() {
  const { subscribe, set, update } = writable<NavigationState>(initialState);

  return {
    subscribe,
    setView: (view: ViewType) => update(state => ({ ...state, currentView: view })),
    toggleSidebar: () => update(state => ({ ...state, sidebarOpen: !state.sidebarOpen })),
    toggleRightPanel: () => update(state => ({ ...state, rightPanelOpen: !state.rightPanelOpen })),
    reset: () => set(initialState)
  };
}

export const navigation = createNavigationStore();
