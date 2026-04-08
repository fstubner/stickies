export interface ElectronAPI {
  createNewNote?: () => void;
  onCreateNewNote?: (callback: () => void) => void;
  onNavigateToNote?: (callback: (noteId: string) => void) => void;
  onStickyWindowsUpdate?: (callback: (ids: string[]) => void) => void;
  getTitlebarHeight?: () => Promise<number>;
}

class ElectronService {
  private api: ElectronAPI | null = null;

  async init(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electron) {
      this.api = (window as any).electron;
    }
  }

  onCreateNewNote(callback: () => void): void {
    this.api?.onCreateNewNote?.(callback);
  }

  onNavigateToNote(callback: (noteId: string) => void): void {
    this.api?.onNavigateToNote?.(callback);
  }

  onStickyWindowsUpdate(callback: (ids: string[]) => void): void {
    this.api?.onStickyWindowsUpdate?.(callback);
  }
}

export const electronService = new ElectronService();
