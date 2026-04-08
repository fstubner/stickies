export const KEYBOARD_SHORTCUTS = {
  SAVE: { key: 'S', ctrl: true },
  NEW_NOTE: { key: 'N', ctrl: true },
  SEARCH: { key: 'K', ctrl: true },
  CLOSE: { key: 'Escape' }
};

export function matchesShortcut(event: KeyboardEvent, shortcut: any): boolean {
  const keyMatch = event.key === shortcut.key || event.code === shortcut.key;
  const ctrlMatch = !shortcut.ctrl || event.ctrlKey || event.metaKey;
  const shiftMatch = !shortcut.shift || event.shiftKey;
  return keyMatch && ctrlMatch && shiftMatch;
}
