interface StorageData {
  notes: any[];
  workspaces: any[];
  settings: Record<string, any>;
}

class StorageService {
  private storageKey = 'stickies-data';
  private data: StorageData = {
    notes: [],
    workspaces: [],
    settings: {}
  };

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          this.data = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to load storage:', e);
        }
      }
    }
  }

  save() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }
  }

  getData(): StorageData {
    return this.data;
  }

  setData(data: Partial<StorageData>) {
    this.data = { ...this.data, ...data };
    this.save();
  }
}

export const storageService = new StorageService();
