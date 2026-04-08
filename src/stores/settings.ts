import { writable } from 'svelte/store';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  autoSave: boolean;
  notifications: boolean;
}

const defaultSettings: Settings = {
  theme: 'system',
  fontSize: 14,
  autoSave: true,
  notifications: true
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(defaultSettings);

  return {
    subscribe,
    update: (changes: Partial<Settings>) => update(s => ({ ...s, ...changes }))
  };
}

export const settings = createSettingsStore();

export async function loadSettings(): Promise<void> {
  // Implementation would go here
}

export function applyTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function needsOnboarding(): boolean {
  return !localStorage.getItem('onboarding-complete');
}

export async function completeOnboarding(): Promise<void> {
  localStorage.setItem('onboarding-complete', 'true');
}
