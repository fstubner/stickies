import { writable } from 'svelte/store';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  defaultNoteColor: string;
  fontSize: number;
  syncEnabled: boolean;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  alwaysOnTop: false,
  minimizeToTray: true,
  defaultNoteColor: 'yellow',
  fontSize: 14,
  syncEnabled: false
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<AppSettings>(defaultSettings);

  return {
    subscribe,
    updateSetting: (key: keyof AppSettings, value: any) => {
      update(state => ({ ...state, [key]: value }));
    },
    reset: () => set(defaultSettings)
  };
}

export const settings = createSettingsStore();
