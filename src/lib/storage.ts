// localStorage sicher: jeder Zugriff in try/catch, Standardwert bei Fehlern, Keys mit „aipulse." (geteilter Origin).
import { useSyncExternalStore } from 'react';

const PREFIX = 'aipulse.';
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

export function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw) as T;
  } catch {
    value = fallback;
  }
  cache.set(key, value);
  return value;
}

export function write<T>(key: string, value: T): boolean {
  cache.set(key, value);
  let ok = true;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    ok = false; // privater Modus, gesperrte Daten oder Speicher voll
  }
  listeners.forEach(l => l());
  return ok;
}

export function clearAll(): void {
  cache.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // nichts zu tun
  }
  listeners.forEach(l => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      cache.delete(e.key.slice(PREFIX.length));
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
}

// ---------- konkrete Speicher ----------

export interface ReadState { v: 1; ids: Record<string, number> }
export interface SavedStory { id: string; title: string; url: string; category: string; impact: number; personal: number; score: number; sources: { name: string; url: string }[]; summary?: string; savedAt: string }
export interface SavedState { v: 1; items: SavedStory[] }
export interface Filters { v: 1; minScore: number; range: 'today' | '24h' | '72h'; hideRead: boolean }
export interface Display { v: 1; lastCategory?: string; briefingCollapsedFor?: string; installHintDismissed?: boolean; lastVisit?: string }

export const SAVED_MAX = 300;
export const DEFAULT_FILTERS: Filters = { v: 1, minScore: 5, range: '72h', hideRead: true };
export const today = () => Math.floor(Date.now() / 864e5);

export function pruneRead(): void {
  const r = read<ReadState>('read', { v: 1, ids: {} });
  const limit = today() - 30;
  const ids = Object.fromEntries(Object.entries(r.ids).filter(([, d]) => d >= limit));
  if (Object.keys(ids).length !== Object.keys(r.ids).length) write('read', { v: 1, ids });
}

export function toggleRead(id: string, force?: boolean): void {
  const r = read<ReadState>('read', { v: 1, ids: {} });
  const ids = { ...r.ids };
  const on = force ?? !ids[id];
  if (on) ids[id] = today();
  else delete ids[id];
  write('read', { v: 1, ids });
}

// Merken: höchstens 300, nie still das älteste löschen
export function toggleSaved(s: SavedStory): 'saved' | 'removed' | 'full' | 'error' {
  const st = read<SavedState>('saved', { v: 1, items: [] });
  if (st.items.some(x => x.id === s.id)) {
    write('saved', { v: 1, items: st.items.filter(x => x.id !== s.id) });
    return 'removed';
  }
  if (st.items.length >= SAVED_MAX) return 'full';
  return write('saved', { v: 1, items: [s, ...st.items] }) ? 'saved' : 'error';
}
