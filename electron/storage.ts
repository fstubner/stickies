/**
 * Storage handlers for file-system based persistence
 *
 * This module provides IPC handlers for workspace and activity storage
 * following the file-system first architecture from the plan.
 */

import { app, ipcMain, dialog } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { Workspace, ActivityEntry, Tag } from '../types/shared';

// Default storage root
let storageRoot = path.join(app.getPath('userData'), 'stickies-data');

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get workspaces directory path
 */
function getWorkspacesDir(): string {
  return path.join(storageRoot, 'workspaces');
}

/**
 * Get workspace directory path
 */
function getWorkspaceDir(workspaceId: string): string {
  return path.join(getWorkspacesDir(), workspaceId);
}

/**
 * Get workspace config file path
 */
function getWorkspaceConfigPath(workspaceId: string): string {
  return path.join(getWorkspaceDir(workspaceId), 'workspace.json');
}

/**
 * Get activity file path for a workspace
 */
function getActivityPath(workspaceId: string): string {
  return path.join(getWorkspaceDir(workspaceId), 'activity.json');
}

/**
 * Get tags file path
 */
function getTagsPath(): string {
  return path.join(storageRoot, 'tags.json');
}

/**
 * Read JSON file safely
 */
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`[Storage] Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath: string, data: unknown): boolean {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[Storage] Error writing ${filePath}:`, error);
    return false;
  }
}

/**
 * Get all workspaces
 */
export function getWorkspaces(): Workspace[] {
  const workspacesDir = getWorkspacesDir();
  ensureDir(workspacesDir);

  const workspaces: Workspace[] = [];

  try {
    const dirs = fs.readdirSync(workspacesDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const configPath = getWorkspaceConfigPath(dir.name);
        if (fs.existsSync(configPath)) {
          const workspace = readJsonFile<Workspace | null>(configPath, null);
          if (workspace) {
            workspaces.push(workspace);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Storage] Error reading workspaces:', error);
  }

  return workspaces;
}

/**
 * Save workspaces (creates/updates workspace.json files)
 */
export function saveWorkspaces(workspaces: Workspace[]): boolean {
  try {
    for (const workspace of workspaces) {
      const configPath = getWorkspaceConfigPath(workspace.id);
      ensureDir(getWorkspaceDir(workspace.id));
      writeJsonFile(configPath, workspace);
    }
    return true;
  } catch (error) {
    console.error('[Storage] Error saving workspaces:', error);
    return false;
  }
}

/**
 * Get a single workspace
 */
export function getWorkspace(workspaceId: string): Workspace | null {
  const configPath = getWorkspaceConfigPath(workspaceId);
  return readJsonFile<Workspace | null>(configPath, null);
}

/**
 * Save a single workspace
 */
export function saveWorkspace(workspace: Workspace): boolean {
  const configPath = getWorkspaceConfigPath(workspace.id);
  ensureDir(getWorkspaceDir(workspace.id));
  return writeJsonFile(configPath, workspace);
}

/**
 * Delete a workspace
 */
export function deleteWorkspace(workspaceId: string): boolean {
  try {
    const workspaceDir = getWorkspaceDir(workspaceId);
    if (fs.existsSync(workspaceDir)) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    console.error('[Storage] Error deleting workspace:', error);
    return false;
  }
}

/**
 * Get activity for a workspace
 */
export function getWorkspaceActivity(workspaceId: string): ActivityEntry[] {
  const activityPath = getActivityPath(workspaceId);
  return readJsonFile<ActivityEntry[]>(activityPath, []);
}

/**
 * Log activity for a workspace
 */
export function logActivity(
  workspaceId: string,
  entry: Omit<ActivityEntry, 'id' | 'timestamp'>
): ActivityEntry {
  const activity = getWorkspaceActivity(workspaceId);

  const newEntry: ActivityEntry = {
    ...entry,
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  activity.unshift(newEntry);

  // Keep only last 500 entries
  const trimmed = activity.slice(0, 500);

  const activityPath = getActivityPath(workspaceId);
  writeJsonFile(activityPath, trimmed);

  return newEntry;
}

/**
 * Clear activity for a workspace
 */
export function clearWorkspaceActivity(workspaceId: string): boolean {
  const activityPath = getActivityPath(workspaceId);
  return writeJsonFile(activityPath, []);
}

/**
 * Get all tags
 */
export function getTags(): Tag[] {
  return readJsonFile<Tag[]>(getTagsPath(), []);
}

/**
 * Save tags
 */
export function saveTags(tags: Tag[]): boolean {
  return writeJsonFile(getTagsPath(), tags);
}

/**
 * Get storage root
 */
export function getStorageRoot(): string {
  return storageRoot;
}

/**
 * Set storage root
 */
export function setStorageRoot(newRoot: string): boolean {
  try {
    ensureDir(newRoot);
    storageRoot = newRoot;
    return true;
  } catch (error) {
    console.error('[Storage] Error setting storage root:', error);
    return false;
  }
}

/**
 * Register all storage IPC handlers
 */
export function registerStorageHandlers(): void {
  // Workspace handlers
  ipcMain.handle('get-workspaces', async (): Promise<Workspace[]> => {
    return getWorkspaces();
  });
  console.log('[Storage] Registered handler for get-workspaces');

  ipcMain.handle('save-workspaces', async (_event: IpcMainInvokeEvent, workspaces: Workspace[]): Promise<boolean> => {
    return saveWorkspaces(workspaces);
  });
  console.log('[Storage] Registered handler for save-workspaces');

  ipcMain.handle('get-workspace', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<Workspace | null> => {
    return getWorkspace(workspaceId);
  });
  console.log('[Storage] Registered handler for get-workspace');

  ipcMain.handle('save-workspace', async (_event: IpcMainInvokeEvent, workspace: Workspace): Promise<boolean> => {
    return saveWorkspace(workspace);
  });
  console.log('[Storage] Registered handler for save-workspace');

  ipcMain.handle('delete-workspace', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<boolean> => {
    return deleteWorkspace(workspaceId);
  });
  console.log('[Storage] Registered handler for delete-workspace');

  // Activity handlers
  ipcMain.handle('get-workspace-activity', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<ActivityEntry[]> => {
    return getWorkspaceActivity(workspaceId);
  });
  console.log('[Storage] Registered handler for get-workspace-activity');

  ipcMain.handle('log-activity', async (
    _event: IpcMainInvokeEvent,
    { workspaceId, entry }: { workspaceId: string; entry: Omit<ActivityEntry, 'id' | 'timestamp'> }
  ): Promise<ActivityEntry> => {
    return logActivity(workspaceId, entry);
  });
  console.log('[Storage] Registered handler for log-activity');

  ipcMain.handle('clear-workspace-activity', async (_event: IpcMainInvokeEvent, workspaceId: string): Promise<boolean> => {
    return clearWorkspaceActivity(workspaceId);
  });
  console.log('[Storage] Registered handler for clear-workspace-activity');

  // Tag handlers
  ipcMain.handle('get-tags', async (): Promise<Tag[]> => {
    return getTags();
  });
  console.log('[Storage] Registered handler for get-tags');

  ipcMain.handle('save-tags', async (_event: IpcMainInvokeEvent, tags: Tag[]): Promise<boolean> => {
    return saveTags(tags);
  });
  console.log('[Storage] Registered handler for save-tags');

  // Storage root handlers
  ipcMain.handle('get-storage-root', async (): Promise<string> => {
    return getStorageRoot();
  });
  console.log('[Storage] Registered handler for get-storage-root');

  ipcMain.handle('set-storage-root', async (_event: IpcMainInvokeEvent, newRoot: string): Promise<boolean> => {
    return setStorageRoot(newRoot);
  });
  console.log('[Storage] Registered handler for set-storage-root');

  ipcMain.handle('browse-for-folder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Storage Location',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
  console.log('[Storage] Registered handler for browse-for-folder');
}
