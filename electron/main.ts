import { app, BrowserWindow, ipcMain, screen, Menu, Tray, shell, globalShortcut, Notification } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import * as fs from 'fs';
import matter from 'gray-matter';
import type { IpcMainInvokeEvent, MenuItemConstructorOptions } from 'electron';
import type { NoteConfig, AppSettings, Board, LayoutConfig, KeyboardShortcuts } from '../types/shared';
import { captureFromClipboard, getDefaultMediaPath, captureScreenRegion, type CaptureResult } from './capture';
import { fetchWebPageMetadata, clipWebPage, type WebPageMetadata, type ClipResult } from './webClipper';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarEvents,
  isGoogleCalendarConnected,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './googleCalendar';
import { registerStorageHandlers } from './storage';
import { AiController } from './aiController';

// Define the development server URL from environment variables or defaults.
// Prefer IPv4 to avoid localhost IPv6 vs IPv4 mismatch (common in Electron on Windows).
const VITE_DEV_SERVER_HOST = process.env.VITE_DEV_SERVER_HOST || '127.0.0.1';
const VITE_DEV_SERVER_PORT = process.env.VITE_DEV_SERVER_PORT || '3001';
const VITE_DEV_SERVER_URL = `http://${VITE_DEV_SERVER_HOST}:${VITE_DEV_SERVER_PORT}`;

// Define interfaces

interface MainWindowState {
  width: number;
  height: number;
  x: number | undefined;
  y: number | undefined;
}

// AppSettings imported from shared types

// Initialize store for app settings
const store = new Store<Record<string, any>>({
  name: 'stickies-settings'
});

// Keep a global reference of windows and tray to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pickerWindow: BrowserWindow | null = null;
const stickyWindows = new Map<string, BrowserWindow>();
const reminderTimers = new Map<string, NodeJS.Timeout>();
let capturedContent: CaptureResult | null = null;

// Helper function to remove undefined values from an object (for YAML serialization)
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Notes directory
const notesDir = path.join(app.getPath('userData'), 'notes');

// Platform detection
const isMac = process.platform === 'darwin';
// const isWindows = process.platform === 'win32'; // Unused
// const isLinux = process.platform === 'linux'; // Unused

// Declare icon path variables
let mainWindowIconPath: string;
let trayIconPath: string;

function getAppSettings(): AppSettings {
  const defaultLayout: LayoutConfig = {
    leftSidebarWidth: 220,
    leftSidebarCollapsed: false,
    rightPanelWidth: 500,
    rightPanelCollapsed: false,
    activityPanelWidth: 250,
    upcomingPanelWidth: 250,
  };
  const defaultShortcuts: KeyboardShortcuts = {
    newNote: 'CommandOrControl+N',
    quickCapture: 'CommandOrControl+Shift+N',
    screenshotCapture: 'CommandOrControl+Shift+S',
    appendToNote: 'CommandOrControl+Shift+A',
    search: 'CommandOrControl+K',
    commandPalette: 'CommandOrControl+P',
  };
  const defaults: AppSettings = {
    theme: 'system',
    workspaces: [],
    activeWorkspaceId: undefined,
    tags: [],
    defaultNoteColor: '#fff740',
    alwaysOnTopDefault: false,
    defaultNoteWidth: 250,
    defaultNoteHeight: 300,
    boards: [] as Board[],
    aiAutoGenerateAnswers: true,
    aiUseOllama: false,
    shortcuts: defaultShortcuts,
    calendarIntegration: undefined,
    onboardingCompleted: false,
    layout: defaultLayout,
    storageRoot: undefined,
  };
  try {
    const saved = (store.get('appSettings') || {}) as AppSettings;
    return {
      ...defaults,
      ...saved,
      // Ensure nested objects are properly merged
      shortcuts: { ...defaultShortcuts, ...saved.shortcuts },
      layout: { ...defaultLayout, ...saved.layout },
    };
  } catch {
    return defaults;
  }
}

async function createMainWindow(): Promise<void> {
  const windowState = store.get('mainWindowState', {
    width: 900,
    height: 700,
    x: undefined,
    y: undefined
  }) as MainWindowState;

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    title: 'Stickies',
    icon: mainWindowIconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  console.log('[Main Window] Loading content...');
  if (app.isPackaged) {
    console.log('[Main Window] Loading from file: ../build/index.html');
    await mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  } else {
    console.log(`[Main Window] Loading from URL: ${VITE_DEV_SERVER_URL}`);
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
    console.log('[Main Window] URL loaded, opening DevTools');
    mainWindow.webContents.openDevTools();
  }
  console.log('[Main Window] Content loaded');

  mainWindow.on('close', () => {
    console.log('[Main Window] Close event triggered');
    if (mainWindow) {
      const { width, height } = mainWindow.getBounds();
      store.set('mainWindowState', {
        width,
        height,
        x: mainWindow.getPosition()[0],
        y: mainWindow.getPosition()[1]
      } as MainWindowState);
    }
  });

  mainWindow.on('closed', () => {
    console.log('[Main Window] Window closed');
    mainWindow = null;
  });

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Main Window] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  setupMenu();

  // Load existing notes and send them to the renderer
  mainWindow.webContents.once('did-finish-load', async () => {
    console.log('[Main Window] did-finish-load event fired');
    const existingNotes = await getAllNotes();
    console.log(`[Main Window] Loaded ${existingNotes.length} notes from storage`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send ipc-ready FIRST so renderer knows it can make IPC calls
      mainWindow.webContents.send('ipc-ready');
      console.log('[Main Process] Sent ipc-ready signal to renderer');

      mainWindow.webContents.send('all-notes', existingNotes);
      console.log('[Main Process] Sent all-notes to renderer');
      broadcastStickyWindows();
    }
  });

  // Log any dom-ready event
  mainWindow.webContents.once('dom-ready', () => {
    console.log('[Main Window] dom-ready event fired');
  });
}

const setupMenu = (): void => {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    } as MenuItemConstructorOptions] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sticky Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('create-new-note');
            }
          }
        },
        {
          label: 'Snooze Active Note 10m',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            for (const [id, win] of stickyWindows) {
              if (win === focused) {
                void snoozeNoteInternal(id, 10);
                break;
              }
            }
          }
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
          { type: 'separator' as const },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' as const },
              { role: 'stopSpeaking' as const }
            ]
          }
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    },
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/fstubner/stickies');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Function to read all notes from the notes directory
async function getAllNotes(): Promise<NoteConfig[]> {
  try {
    // Ensure directory exists
    try {
        await fs.promises.access(notesDir);
    } catch {
        await fs.promises.mkdir(notesDir, { recursive: true });
    }

    const files = await fs.promises.readdir(notesDir);
    const readPromises = files
        .filter(file => path.extname(file) === '.md')
        .map(async (file) => {
            const noteId = path.basename(file, '.md');
            const notePath = path.join(notesDir, file);
            try {
                const fileContent = await fs.promises.readFile(notePath, 'utf-8');
                const { content, data } = matter(fileContent);
                return {
                    id: noteId,
                    title: data.title || '',
                    content: content || '',
                    position: data.position || { x: 0, y: 0 },
                    size: data.size || { width: 300, height: 200 },
                    color: data.color || 'yellow',
                    alwaysOnTop: typeof data.alwaysOnTop === 'boolean' ? data.alwaysOnTop : false,
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
                    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
                } as NoteConfig;
            } catch (error) {
                console.error(`Failed to read note file ${file}:`, error);
                return null;
            }
        });

    const results = await Promise.all(readPromises);
    return results.filter((n): n is NoteConfig => n !== null);
  } catch (error) {
    console.error('Error in getAllNotes:', error);
    return [];
  }
}

// Debounce map for saving note bounds to disk
const pendingBoundsSaveTimers = new Map<string, NodeJS.Timeout>();

async function updateNoteDataOnDisk(noteId: string, updates: Partial<NoteConfig>): Promise<boolean> {
  const notePath = path.join(notesDir, `${noteId}.md`);
  try {
    let fileData: Record<string, any> = {};
    let fileContent = '';

    if (fs.existsSync(notePath)) {
      const existingFile = await fs.promises.readFile(notePath, 'utf8');
      const parsed = matter(existingFile);
      fileData = parsed.data;
      fileContent = parsed.content;
    } else {
      fileData = { createdAt: new Date().toISOString() };
    }

    const newData = { ...fileData, ...updates, updatedAt: new Date().toISOString() };
    const newContent = typeof updates.content === 'string' ? updates.content : fileContent;

    if (Object.prototype.hasOwnProperty.call(newData, 'content')) {
      delete (newData as any).content;
    }

    // Ensure position and size have defaults
    if (newData.position === undefined) {
      const settings = getAppSettings();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      newData.position = {
        x: Math.floor(width / 2 - (settings.defaultNoteWidth || 250) / 2 + (Math.random() * 100 - 50)),
        y: Math.floor(height / 2 - (settings.defaultNoteHeight || 300) / 2 + (Math.random() * 100 - 50))
      };
    }
    if (newData.size === undefined) {
      const settings = getAppSettings();
      newData.size = {
        width: settings.defaultNoteWidth || 250,
        height: settings.defaultNoteHeight || 300
      };
    }

    const fileString = matter.stringify(newContent, newData);
    await fs.promises.writeFile(notePath, fileString, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Failed to persist note ${noteId}:`, error);
    return false;
  }
}

function schedulePersistBounds(noteId: string, win: BrowserWindow): void {
  if (pendingBoundsSaveTimers.has(noteId)) {
    clearTimeout(pendingBoundsSaveTimers.get(noteId)!);
  }
  const timer = setTimeout(async () => {
    if (win.isDestroyed()) return;
    const { x, y, width, height } = win.getBounds();
    await updateNoteDataOnDisk(noteId, {
      position: { x, y },
      size: { width, height }
    });
  }, 300);
  pendingBoundsSaveTimers.set(noteId, timer);
}

async function createStickyNote(noteConfig: NoteConfig = {}): Promise<{ noteId: string; window: BrowserWindow }> {
  const noteId = noteConfig.id || Date.now().toString();
  console.log(`[Main Process - createStickyNote] Initializing note with ID: ${noteId}, Config:`, noteConfig);

  // Ensure notes directory exists
  try {
      await fs.promises.access(notesDir);
  } catch {
      await fs.promises.mkdir(notesDir, { recursive: true });
  }

  const noteFilePath = path.join(notesDir, `${noteId}.md`);
  let existingData: NoteConfig | null = null;

  try {
    const fileContent = await fs.promises.readFile(noteFilePath, 'utf-8');
    const parsed = matter(fileContent);
    existingData = {
      id: noteId,
      title: parsed.data.title,
      content: parsed.content,
      position: parsed.data.position,
      size: parsed.data.size,
      color: parsed.data.color,
      alwaysOnTop: parsed.data.alwaysOnTop,
      createdAt: parsed.data.createdAt ? new Date(parsed.data.createdAt) : undefined,
      updatedAt: parsed.data.updatedAt ? new Date(parsed.data.updatedAt) : undefined,
    };
    console.log(`[Main Process - createStickyNote] Loaded existing note: ${noteId}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
        console.error(`[Main Process - createStickyNote] Error reading existing note ${noteId}:`, error);
    }
    // Proceed with defaults if file doesn't exist
  }

  const defaults = getAppSettings(); // Get current default settings

  const noteToSave: NoteConfig = {
    id: noteId,
    title: existingData?.title || noteConfig.title || 'Untitled',
    content: existingData?.content || noteConfig.content || '',
    position: existingData?.position || noteConfig.position || { x: 0, y: 0 },
    size: existingData?.size || noteConfig.size || { width: defaults.defaultNoteWidth || 250, height: defaults.defaultNoteHeight || 200 },
    color: existingData?.color || noteConfig.color || defaults.defaultNoteColor || '#fff740',
    alwaysOnTop: existingData?.alwaysOnTop ?? noteConfig.alwaysOnTop ?? defaults.alwaysOnTopDefault ?? false,
    tags: existingData?.tags || noteConfig.tags || [],
    isTask: existingData?.isTask ?? noteConfig.isTask ?? false,
    reminderAt: (existingData?.reminderAt || noteConfig.reminderAt || '') as string,
    repeat: ((existingData?.repeat || noteConfig.repeat || 'none') as any) as 'none' | 'daily' | 'weekly' | 'monthly',
    snoozeUntil: (existingData?.snoozeUntil || noteConfig.snoozeUntil || '') as string,
    nextTriggerAt: (existingData?.nextTriggerAt || noteConfig.nextTriggerAt || '') as string,
    createdAt: existingData?.createdAt || (noteConfig.createdAt ? new Date(noteConfig.createdAt) : new Date()),
    updatedAt: new Date(),
    // New workspace/task fields - carry over from existing or config
    workspaceId: (existingData as any)?.workspaceId || noteConfig.workspaceId,
    linkedWorkspaceIds: (existingData as any)?.linkedWorkspaceIds || noteConfig.linkedWorkspaceIds,
    dueDate: (existingData as any)?.dueDate || noteConfig.dueDate,
    statusId: (existingData as any)?.statusId || noteConfig.statusId,
    priorityId: (existingData as any)?.priorityId || noteConfig.priorityId,
    completedAt: (existingData as any)?.completedAt || noteConfig.completedAt,
    tagIds: (existingData as any)?.tagIds || noteConfig.tagIds,
    links: (existingData as any)?.links || noteConfig.links,
    attachments: (existingData as any)?.attachments || noteConfig.attachments,
  };

  // Ensure position and size are not undefined before saving
  if (noteToSave.position === undefined) {
    noteToSave.position = { x: Math.floor(Math.random() * 300), y: Math.floor(Math.random() * 200) };
  }
  if (noteToSave.size === undefined) {
    const settings = getAppSettings();
    noteToSave.size = { width: settings.defaultNoteWidth || 250, height: settings.defaultNoteHeight || 200 };
  }

  // Save the note data (frontmatter + content)
  // Strip undefined values to prevent YAML serialization errors
  try {
    const frontmatter = stripUndefined(noteToSave);
    const markdownWithMeta = matter.stringify(noteToSave.content || '', frontmatter);
    await fs.promises.writeFile(noteFilePath, markdownWithMeta);
    console.log(`[Main Process - createStickyNote] Saved note ${noteId} to file.`);
  } catch (error) {
    console.error(`[Main Process - createStickyNote] Failed to save new/updated note ${noteId}:`, error);
    // Decide if we should throw or still try to open a window
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  let x: number, y: number;

  if (!noteToSave.position) {
    x = Math.floor(width / 2 - (noteToSave.size?.width ?? 250) / 2 + (Math.random() * 100 - 50));
    y = Math.floor(height / 2 - (noteToSave.size?.height ?? 300) / 2 + (Math.random() * 100 - 50));
  } else {
    x = noteToSave.position.x;
    y = noteToSave.position.y;
  }

  const stickyWindow = new BrowserWindow({
    width: noteToSave.size?.width || 250,
    height: noteToSave.size?.height || 300,
    x,
    y,
    frame: false,
    alwaysOnTop: noteToSave.alwaysOnTop || false,
    transparent: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (app.isPackaged) {
    // For packaged app, use hash routing since file:// doesn't support SPA paths
    stickyWindow.loadFile(path.join(__dirname, '../build/index.html'), {
      hash: `sticky/${noteId}`
    });
  } else {
    // For dev mode, use path-based routing (svelte-routing uses path, not hash)
    stickyWindow.loadURL(`${VITE_DEV_SERVER_URL}/sticky/${noteId}`);
  }

  stickyWindows.set(noteId, stickyWindow);
  broadcastStickyWindows(); // Notify main window

  stickyWindow.webContents.on('did-finish-load', () => {
    stickyWindow.webContents.send('note-data', {
      id: noteId, // Ensure we use the determined noteIdToUse
      title: noteToSave.title || 'Untitled', // Use data from fileData as it's the source of truth
      content: noteToSave.content || '',
      color: noteToSave.color || '#fff740',
      alwaysOnTop: noteToSave.alwaysOnTop || false,
      position: noteToSave.position,
      size: noteToSave.size,
      createdAt: noteToSave.createdAt ? new Date(noteToSave.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: noteToSave.updatedAt ? new Date(noteToSave.updatedAt).toISOString() : new Date().toISOString(),
    } as NoteConfig);
  });

  // Persist bounds when moved/resized/closed
  stickyWindow.on('move', () => schedulePersistBounds(noteId, stickyWindow));
  stickyWindow.on('resize', () => schedulePersistBounds(noteId, stickyWindow));
  stickyWindow.on('close', () => schedulePersistBounds(noteId, stickyWindow));

  stickyWindow.on('closed', () => {
    stickyWindows.delete(noteId);
    broadcastStickyWindows(); // Notify main window
  });

  return { noteId: noteId, window: stickyWindow };
}

function broadcastStickyWindows() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const ids = Array.from(stickyWindows.keys());
    mainWindow.webContents.send('sticky-window-list', ids);
  }
}

function scheduleReminder(noteId: string, _cfg?: NoteConfig) {
  const notePath = path.join(notesDir, `${noteId}.md`);
  try {
    const file = matter.read(notePath);
    const data = file.data as NoteConfig;
    const now = new Date();
    let when: Date | null = null;
    if (data.snoozeUntil) {
      const s = new Date(data.snoozeUntil);
      if (s > now) when = s;
    } else if (data.reminderAt) {
      const r = new Date(data.reminderAt);
      if (r > now) when = r;
    }
    if (!when) return;
    if (reminderTimers.has(noteId)) clearTimeout(reminderTimers.get(noteId)!);
    const ms = when.getTime() - now.getTime();
    const t = setTimeout(async () => {
      // Open the note
      await createStickyNote({ id: noteId });
      // Compute next repeat
      let next: Date | null = null;
      const rep = data.repeat || 'none';
      if (rep === 'daily') next = new Date(when!.getTime() + 24 * 3600 * 1000);
      else if (rep === 'weekly') next = new Date(when!.getTime() + 7 * 24 * 3600 * 1000);
      else if (rep === 'monthly') {
        next = new Date(when!);
        next.setMonth(next.getMonth() + 1);
      }
      const updates: Partial<NoteConfig> = { snoozeUntil: undefined, nextTriggerAt: next ? next.toISOString() : undefined };
      if (next) updates.reminderAt = next.toISOString();
      await updateNoteDataOnDisk(noteId, updates);
      scheduleReminder(noteId);
    }, Math.max(0, ms));
    reminderTimers.set(noteId, t);
  } catch (e) {
    // ignore scheduling errors
  }
}

async function snoozeNoteInternal(noteId: string, minutes: number): Promise<boolean> {
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  const ok = await updateNoteDataOnDisk(noteId, { snoozeUntil: until });
  if (ok) scheduleReminder(noteId);
  return ok;
}

function setupTray(): void {
  if (!tray) {
    tray = new Tray(trayIconPath);
    const contextMenuTemplate: MenuItemConstructorOptions[] = [
      {
        label: 'Show Main Window',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          } else {
            createMainWindow();
          }
        }
      },
      {
        label: 'New Sticky Note',
        click: () => {
          createStickyNote(); // Call with no args for a new note
        }
      },
      { type: 'separator' as const },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ];
    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    tray.setToolTip('Stickies');
    tray.setContextMenu(contextMenu);

    if (isMac) {
      tray.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createMainWindow();
        }
      });
    }
  }
}

function setupIPC(): void {
  console.log('[Main Process] Setting up IPC handlers...');

  ipcMain.handle('toggle-always-on-top', async (_event: IpcMainInvokeEvent, noteId: string): Promise<boolean> => {
    const stickyWindow = stickyWindows.get(noteId);
    if (stickyWindow) {
      const isAlwaysOnTop = stickyWindow.isAlwaysOnTop();
      stickyWindow.setAlwaysOnTop(!isAlwaysOnTop);
      return !isAlwaysOnTop;
    }
    return false;
  });
  console.log('[Main Process] Registered handler for toggle-always-on-top');

  ipcMain.handle('create-sticky-note', async (_event: IpcMainInvokeEvent, noteConfig: NoteConfig = {}): Promise<string | null> => {
    console.log('[Main Process - IPC Handler] create-sticky-note invoked with config:', noteConfig);
    const { noteId } = await createStickyNote(noteConfig);
    return noteId;
  });
  console.log('[Main Process] Registered handler for create-sticky-note');

  // Save note to disk without opening a window
  ipcMain.handle('save-note', async (_event: IpcMainInvokeEvent, noteConfig: Partial<NoteConfig>): Promise<string | null> => {
    console.log('[Main Process - IPC Handler] save-note invoked with config:', noteConfig);
    const noteId = noteConfig.id || Date.now().toString();
    const notePath = path.join(notesDir, `${noteId}.md`);

    const noteToSave: NoteConfig = {
      id: noteId,
      title: noteConfig.title || 'Untitled',
      content: noteConfig.content || '',
      color: noteConfig.color || '#fff740',
      alwaysOnTop: noteConfig.alwaysOnTop || false,
      createdAt: noteConfig.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: noteConfig.position,
      size: noteConfig.size,
      tags: noteConfig.tags,
      workspaceId: noteConfig.workspaceId,
      isTask: noteConfig.isTask,
      dueDate: noteConfig.dueDate,
      statusId: noteConfig.statusId,
      priorityId: noteConfig.priorityId,
      reminderAt: noteConfig.reminderAt,
      repeat: noteConfig.repeat,
    };

    try {
      const { content, ...frontmatter } = noteToSave;
      const fileContent = matter.stringify(content || '', stripUndefined(frontmatter));
      await fs.promises.writeFile(notePath, fileContent, 'utf-8');
      console.log(`[Main Process - save-note] Saved note ${noteId} to file.`);
      return noteId;
    } catch (error) {
      console.error(`[Main Process - save-note] Failed to save note ${noteId}:`, error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for save-note');

  ipcMain.handle('close-sticky-note', (_event: IpcMainInvokeEvent, noteId: string): boolean => {
    const stickyWindow = stickyWindows.get(noteId);
    if (stickyWindow) {
      stickyWindow.close();
      return true;
    }
    return false;
  });
  console.log('[Main Process] Registered handler for close-sticky-note');

  ipcMain.handle('open-in-app', (_event: IpcMainInvokeEvent, noteId: string): void => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      // Send navigation event to renderer
      mainWindow.webContents.send('intersect-note', noteId); // reuse logic or distinct event?
      // Let's use a specific event 'navigate-to-note'
      mainWindow.webContents.send('navigate-to-note', noteId);
    } else {
      createMainWindow().then(() => {
        // Wait for load? handled by did-finish-load listeners usually, might need delay
        setTimeout(() => {
          mainWindow?.webContents.send('navigate-to-note', noteId);
        }, 1000);
      });
    }
  });
  console.log('[Main Process] Registered handler for open-in-app');

  ipcMain.handle('open-note-by-title', async (_event: IpcMainInvokeEvent, title: string): Promise<boolean> => {
    console.log(`[Main Process] Opening note by title: "${title}"`);
    try {
      const allNotes = await getAllNotes();
      // Case-insensitive exact match
      const targetNote = allNotes.find(n => n.title?.toLowerCase() === title.toLowerCase());

      if (targetNote && targetNote.id) {
        if (mainWindow) {
            mainWindow.webContents.send('navigate-to-note', targetNote.id);
            mainWindow.show();
            mainWindow.focus();
        } else {
            // If main window is closed, create it then navigate
             await createMainWindow();
             setTimeout(() => {
                mainWindow?.webContents.send('navigate-to-note', targetNote!.id);
             }, 1000);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Main Process] Failed to open note by title:', err);
      return false;
    }
  });
  console.log('[Main Process] Registered handler for open-note-by-title');

  ipcMain.handle('update-note-data', async (_event: IpcMainInvokeEvent, { noteId, updates }: { noteId: string; updates: Partial<NoteConfig> }): Promise<boolean> => {
    if (!noteId || !updates) {
      console.error('Attempted to update note with no ID or no updates.');
      return false;
    }
    const ok = await updateNoteDataOnDisk(noteId, updates);
    if (ok) {
      console.log(`Note ${noteId} data updated.`);
      // Recompute scheduling on any update; lightweight and safe
      scheduleReminder(noteId);
    }
    return ok;
  });
  console.log('[Main Process] Registered handler for update-note-data');

  ipcMain.handle('get-all-notes', async (): Promise<NoteConfig[]> => {
    console.log('[Main Process] IPC Invoked: get-all-notes');
    try {
      const noteFiles = await fs.promises.readdir(notesDir);
      const notes: NoteConfig[] = [];
      for (const fileName of noteFiles) {
        if (fileName.endsWith('.md')) {
          const noteId = fileName.replace('.md', '');
          const notePath = path.join(notesDir, fileName);
          try {
            const file = matter.read(notePath);
            notes.push({
              id: noteId,
              content: file.content,
              ...(file.data as Omit<NoteConfig, 'id' | 'content'>)
            });
          } catch (readError) {
            console.error(`Failed to read note file ${fileName}:`, readError);
          }
        }
      }
      return notes;
    } catch (error) {
      console.error('Failed to read notes directory:', error);
      return [];
    }
  });
  console.log('[Main Process] Registered handler for get-all-notes');

  ipcMain.handle('get-note', async (_event: IpcMainInvokeEvent, noteId: string): Promise<NoteConfig | null> => {
    console.log('[Main Process] IPC Invoked: get-note', noteId);
    if (!noteId) {
      console.log('[Main Process] get-note: No noteId provided');
      return null;
    }
    const notePath = path.join(notesDir, `${noteId}.md`);
    console.log('[Main Process] get-note: Looking for file at', notePath);
    try {
      try {
        await fs.promises.access(notePath);
        const fileContent = await fs.promises.readFile(notePath, 'utf8');
        const parsed = matter(fileContent);
        const result = {
          id: noteId,
          content: parsed.content,
          ...(parsed.data as Omit<NoteConfig, 'id' | 'content'>)
        };
        console.log('[Main Process] get-note: Found and returning note:', result.title);
        return result;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
             console.error(`[Main Process] get-note: Failed to read note ${noteId}:`, error);
        }
        console.log('[Main Process] get-note: File not found at', notePath);
        return null;
      }
    } catch (error) {
      console.error(`[Main Process] get-note: Failed to read note ${noteId}:`, error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for get-note');

  ipcMain.handle('delete-note', async (_event: IpcMainInvokeEvent, noteId: string): Promise<boolean> => {
    if (!noteId) {
      console.error('Attempted to delete note with no ID.');
      return false;
    }
    const notePath = path.join(notesDir, `${noteId}.md`);
    try {
      if (fs.existsSync(notePath)) {
        await fs.promises.unlink(notePath);
        console.log(`Note ${noteId} deleted successfully.`);
        const stickyWindow = stickyWindows.get(noteId);
        if (stickyWindow) {
          stickyWindow.close();
          stickyWindows.delete(noteId);
        }
        return true;
      } else {
        console.warn(`Note file ${notePath} not found for deletion.`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to delete note ${noteId}:`, error);
      return false;
    }
  });
  console.log('[Main Process] Registered handler for delete-note');

  ipcMain.handle('snooze-note', async (_event: IpcMainInvokeEvent, payload: { noteId: string; minutes: number }): Promise<boolean> => {
    if (!payload?.noteId || !payload?.minutes) return false;
    return snoozeNoteInternal(payload.noteId, payload.minutes);
  });
  console.log('[Main Process] Registered handler for snooze-note');

  // IPC handler for getting settings
  ipcMain.handle('get-settings', async (): Promise<AppSettings | null> => {
    console.log('[Main Process] IPC Invoked: get-settings');
    try {
      const settings = store.get('appSettings');
      return settings as AppSettings | null;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for get-settings');

  // IPC handler for saving settings
  ipcMain.handle('save-settings', async (_event: IpcMainInvokeEvent, settings: AppSettings): Promise<void> => {
    try {
      store.set('appSettings', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Potentially throw error or return a boolean indicating success/failure
    }
  });
  console.log('[Main Process] Registered handler for save-settings');

  // Capture system handlers
  ipcMain.handle('capture-clipboard', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<CaptureResult | null> => {
    try {
      const mediaPath = getDefaultMediaPath(workspaceId);
      return await captureFromClipboard(mediaPath);
    } catch (error) {
      console.error('Failed to capture from clipboard:', error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for capture-clipboard');

  ipcMain.handle('capture-screenshot', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<CaptureResult | null> => {
    try {
      const mediaPath = getDefaultMediaPath(workspaceId);
      return await captureScreenRegion(mediaPath);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for capture-screenshot');

  ipcMain.handle('fetch-webpage-metadata', async (_event: IpcMainInvokeEvent, url: string): Promise<WebPageMetadata | null> => {
    try {
      return await fetchWebPageMetadata(url);
    } catch (error) {
      console.error('Failed to fetch webpage metadata:', error);
      return null;
    }
  });
  console.log('[Main Process] Registered handler for fetch-webpage-metadata');

  ipcMain.handle('clip-webpage', async (_event: IpcMainInvokeEvent, { url, workspaceId, captureThumbnail }: { url: string; workspaceId: string; captureThumbnail?: boolean }): Promise<ClipResult> => {
    try {
      const mediaPath = getDefaultMediaPath(workspaceId);
      return await clipWebPage(url, mediaPath, captureThumbnail);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
  console.log('[Main Process] Registered handler for clip-webpage');

  ipcMain.handle('get-captured-content', async (): Promise<CaptureResult | null> => {
    return capturedContent;
  });
  console.log('[Main Process] Registered handler for get-captured-content');

  ipcMain.handle('clear-captured-content', async (): Promise<void> => {
    capturedContent = null;
  });
  console.log('[Main Process] Registered handler for clear-captured-content');

  // Google Calendar handlers
  ipcMain.handle('connect-google-calendar', async (): Promise<boolean> => {
    return connectGoogleCalendar();
  });
  console.log('[Main Process] Registered handler for connect-google-calendar');

  ipcMain.handle('disconnect-google-calendar', async (): Promise<boolean> => {
    return disconnectGoogleCalendar();
  });
  console.log('[Main Process] Registered handler for disconnect-google-calendar');

  ipcMain.handle('is-google-calendar-connected', async (): Promise<boolean> => {
    return isGoogleCalendarConnected();
  });
  console.log('[Main Process] Registered handler for is-google-calendar-connected');

  ipcMain.handle('get-calendar-events', async (_event: IpcMainInvokeEvent, { startDate, endDate }: { startDate: string; endDate: string }): Promise<any[]> => {
    return getCalendarEvents(startDate, endDate);
  });
  console.log('[Main Process] Registered handler for get-calendar-events');

  ipcMain.handle('create-calendar-event', async (_event: IpcMainInvokeEvent, { title, start, end, allDay }: { title: string; start: string; end: string; allDay?: boolean }): Promise<string | null> => {
    return createCalendarEvent(title, start, end, allDay);
  });
  console.log('[Main Process] Registered handler for create-calendar-event');

  ipcMain.handle('update-calendar-event', async (_event: IpcMainInvokeEvent, { eventId, updates }: { eventId: string; updates: any }): Promise<boolean> => {
    return updateCalendarEvent(eventId, updates);
  });
  console.log('[Main Process] Registered handler for update-calendar-event');

  ipcMain.handle('delete-calendar-event', async (_event, eventId) => {
    return deleteCalendarEvent(eventId);
  });
  console.log('[Main Process] Registered handler for delete-calendar-event');

  // AI Handlers are now managed by AiController

  ipcMain.handle('save-media', async (_event: IpcMainInvokeEvent, { workspaceId, dataUrl, name }: { workspaceId: string; dataUrl: string; name?: string }): Promise<string | null> => {
    try {
      const mediaPath = getDefaultMediaPath(workspaceId);
      // Ensure directory
      if (!fs.existsSync(mediaPath)) {
        await fs.promises.mkdir(mediaPath, { recursive: true });
      }

      // Decode base64
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
         throw new Error('Invalid input string');
      }
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = 'png';
      const filename = name ? `${name}.${ext}` : `drawing-${Date.now()}.png`;
      const filePath = path.join(mediaPath, filename);

      await fs.promises.writeFile(filePath, buffer);

      // Return protocol string for rendering
      // Note: In production with webSecurity, we might need a custom protocol handler 'stickies://'
      // For now, assume file:// works or we map it.
      // Returning just filename allows front-end to decide, but absolute path is safer for now.
      return `file://${filePath.replace(/\\/g, '/')}`;
    } catch (e) {
      console.error('Failed to save media:', e);
      return null;
    }
  });

  console.log('[Main Process] IPC setup complete.');
}

function createQuickPickerWindow(): void {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.show();
    pickerWindow.focus();
    return;
  }

  pickerWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (app.isPackaged) {
    pickerWindow.loadFile(path.join(__dirname, '../build/index.html'), {
      hash: 'picker'
    });
  } else {
    pickerWindow.loadURL(`${VITE_DEV_SERVER_URL}/#picker`);
  }

  pickerWindow.once('ready-to-show', () => {
    pickerWindow?.show();
    pickerWindow?.focus();
  });

  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });

  pickerWindow.on('blur', () => {
    // Optionally close on blur
    // pickerWindow?.close();
  });
}

async function quickCaptureFromClipboard(): Promise<void> {
  try {
    // Capture clipboard content
    const workspaceId = 'default'; // Use default workspace for quick capture
    const mediaPath = getDefaultMediaPath(workspaceId);
    const result = await captureFromClipboard(mediaPath);

    if (!result) {
      new Notification({
        title: 'Stickies',
        body: 'Clipboard is empty'
      }).show();
      return;
    }

    capturedContent = result;

    // Open the picker to choose where to append
    createQuickPickerWindow();
  } catch (error) {
    console.error('Quick capture failed:', error);
    new Notification({
      title: 'Stickies',
      body: 'Failed to capture from clipboard'
    }).show();
  }
}

function setupGlobalShortcuts(): void {
  // Get shortcuts from settings or use defaults
  const settings = getAppSettings() as any;
  const shortcuts = settings.shortcuts || {
    newNote: 'CommandOrControl+N',
    quickCapture: 'CommandOrControl+Shift+N',
    search: 'CommandOrControl+K',
  };

  // Register quick capture shortcut (global - works when app is in background)
  try {
    const registered = globalShortcut.register(shortcuts.quickCapture || 'CommandOrControl+Shift+N', () => {
      quickCaptureFromClipboard();
    });

    if (!registered) {
      console.warn('[Shortcuts] Failed to register quick capture shortcut');
    } else {
      console.log('[Shortcuts] Registered quick capture shortcut:', shortcuts.quickCapture);
    }
  } catch (error) {
    console.error('[Shortcuts] Error registering quick capture:', error);
  }

  // Register append to note shortcut
  try {
    const appendRegistered = globalShortcut.register('CommandOrControl+Shift+A', () => {
      quickCaptureFromClipboard();
    });

    if (!appendRegistered) {
      console.warn('[Shortcuts] Failed to register append shortcut');
    } else {
      console.log('[Shortcuts] Registered append shortcut');
    }
  } catch (error) {
    console.error('[Shortcuts] Error registering append shortcut:', error);
  }

  // Register screenshot capture shortcut
  try {
    const screenshotShortcut = shortcuts.screenshotCapture || 'CommandOrControl+Shift+S';
    const screenshotRegistered = globalShortcut.register(screenshotShortcut, async () => {
      await captureScreenshot();
    });

    if (!screenshotRegistered) {
      console.warn('[Shortcuts] Failed to register screenshot shortcut');
    } else {
      console.log('[Shortcuts] Registered screenshot shortcut:', screenshotShortcut);
    }
  } catch (error) {
    console.error('[Shortcuts] Error registering screenshot shortcut:', error);
  }
}

async function captureScreenshot(): Promise<void> {
  try {
    const settings = getAppSettings();
    const workspaceId = settings.activeWorkspaceId || 'default';
    const mediaPath = getDefaultMediaPath(workspaceId);

    const result = await captureScreenRegion(mediaPath);

    if (!result) {
      return; // User cancelled or capture failed silently
    }

    // Store the captured content
    capturedContent = result;

    new Notification({
      title: 'Stickies',
      body: 'Screenshot captured! Click to create a note.'
    }).show();

    // Open the quick picker to let user choose where to add the screenshot
    createQuickPickerWindow();
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    new Notification({
      title: 'Stickies',
      body: 'Failed to capture screenshot'
    }).show();
  }
}


async function handleOpenFile(filePath: string) {
  console.log('[Main] Opening external file:', filePath);
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    // Basic heuristics: Try to parse as stickies note (frontmatter), or just plain text
    let noteData: Partial<NoteConfig> = {};

    try {
      const parsed = matter(fileContent);
      if (parsed.data && (parsed.data.id || parsed.data.title)) {
        // Likely a stickies note or compatible MD
        noteData = {
           title: parsed.data.title || path.basename(filePath, '.md'),
           content: parsed.content,
           color: parsed.data.color,
           tags: parsed.data.tags
        };
      } else {
         throw new Error('Not a sticky note structure');
      }
    } catch {
       // Plain markdown/text
       noteData = {
         title: path.basename(filePath, '.md'),
         content: fileContent,
         color: '#fff740'
       };
    }

    // Create a new sticky note with this content
    // Note: We are importing it as a new note, not editing the original file in place
    // This avoids messing up user's external files with our metadata unless explicit
    await createStickyNote({
      ...noteData,
       // Force a new ID to avoid conflicts unless we strictly want to open THAT file
       // For now, "Import" behavior is safer than "Edit External" behavior
    });

  } catch (error) {
    console.error('[Main] Failed to open file:', error);
  }
}



// File association handling
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    // Handle file opening on Windows/Linux (argv)
    const filePath = commandLine.find(arg => arg.endsWith('.md'));
    if (filePath) {
      handleOpenFile(filePath);
    }
  });

  // Handle file opening on macOS
  app.on('open-file', (event, path) => {
    event.preventDefault();
    if (app.isReady()) {
      handleOpenFile(path);
    } else {
      app.once('ready', () => {
        handleOpenFile(path);
      });
    }
  });

  app.on('ready', async () => {
    // Determine base path for icons now that app is ready
  const iconBaseDir = app.isPackaged ? '../build/icons' : '../public/icons';
  mainWindowIconPath = path.join(__dirname, iconBaseDir, 'icon.png');
  const trayIconFile = isMac ? 'icon-tray.png' : 'icon.ico';
  trayIconPath = path.join(__dirname, iconBaseDir, trayIconFile);

  if (!fs.existsSync(notesDir)) {
    try {
      fs.mkdirSync(notesDir, { recursive: true });
      console.log(`Created notes directory: ${notesDir}`);
    } catch (error) {
      console.error(`Failed to create notes directory ${notesDir}:`, error);
    }
  }

    // Start AI service
    AiController.getInstance().initialize();

  await createMainWindow();
  setupTray();
  setupIPC();
  registerStorageHandlers();
  setupGlobalShortcuts();

  // Note: ipc-ready is now sent in did-finish-load handler in createMainWindow()

  // Schedule reminders for all notes at startup
  try {
    const files = await fs.promises.readdir(notesDir);
    for (const f of files) {
      if (f.endsWith('.md')) {
        const id = f.replace('.md', '');
        scheduleReminder(id);
      }
    }
  } catch {}
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  if (!isMac) {
    console.log('[App] Quitting app (non-Mac behavior)');
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on('before-quit', () => {
  // Save any app state here
  AiController.getInstance().terminate();
});
