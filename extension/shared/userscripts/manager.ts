import { UserscriptMetadata, parseUserscriptHeader, extractScriptBody } from './parser';

export interface Userscript {
  id: string;
  metadata: UserscriptMetadata;
  source: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserscriptStorage {
  scripts: Record<string, Userscript>;
  version: number;
}

const STORAGE_KEY = 'userscripts';
const CURRENT_VERSION = 1;

// Initialize storage if needed
async function initStorage(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  if (!data[STORAGE_KEY]) {
    const initial: UserscriptStorage = {
      scripts: {},
      version: CURRENT_VERSION
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: initial });
  }
}

// Get all userscripts
export async function getAllUserscripts(): Promise<Userscript[]> {
  await initStorage();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as UserscriptStorage;
  return Object.values(storage.scripts);
}

// Get a specific userscript
export async function getUserscript(id: string): Promise<Userscript | null> {
  await initStorage();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as UserscriptStorage;
  return storage.scripts[id] || null;
}

// Add a new userscript
export async function addUserscript(source: string, enabled = true): Promise<Userscript | null> {
  const metadata = parseUserscriptHeader(source);
  if (!metadata) {
    throw new Error('Invalid userscript header');
  }

  const id = generateId();
  const userscript: Userscript = {
    id,
    metadata,
    source,
    enabled,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await initStorage();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as UserscriptStorage;
  
  storage.scripts[id] = userscript;
  await chrome.storage.local.set({ [STORAGE_KEY]: storage });

  // Notify background script of changes
  await chrome.runtime.sendMessage({ type: 'userscripts:changed' });

  return userscript;
}

// Update a userscript
export async function updateUserscript(id: string, updates: Partial<Omit<Userscript, 'id'>>): Promise<Userscript | null> {
  await initStorage();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as UserscriptStorage;
  
  if (!storage.scripts[id]) {
    return null;
  }

  // If source is updated, reparse metadata
  if (updates.source) {
    const metadata = parseUserscriptHeader(updates.source);
    if (!metadata) {
      throw new Error('Invalid userscript header');
    }
    updates.metadata = metadata;
  }

  storage.scripts[id] = {
    ...storage.scripts[id],
    ...updates,
    updatedAt: Date.now()
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: storage });

  // Notify background script of changes
  await chrome.runtime.sendMessage({ type: 'userscripts:changed' });

  return storage.scripts[id];
}

// Delete a userscript
export async function deleteUserscript(id: string): Promise<boolean> {
  await initStorage();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const storage = data[STORAGE_KEY] as UserscriptStorage;
  
  if (!storage.scripts[id]) {
    return false;
  }

  delete storage.scripts[id];
  await chrome.storage.local.set({ [STORAGE_KEY]: storage });

  // Notify background script of changes
  await chrome.runtime.sendMessage({ type: 'userscripts:changed' });

  return true;
}

// Toggle enabled state
export async function toggleUserscript(id: string): Promise<Userscript | null> {
  const script = await getUserscript(id);
  if (!script) return null;

  return updateUserscript(id, { enabled: !script.enabled });
}

// Get only enabled scripts
export async function getEnabledUserscripts(): Promise<Userscript[]> {
  const scripts = await getAllUserscripts();
  return scripts.filter(s => s.enabled);
}

// Generate a unique ID
function generateId(): string {
  return `us_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export script body for a specific userscript
export function getScriptBody(userscript: Userscript): string {
  return extractScriptBody(userscript.source);
} 