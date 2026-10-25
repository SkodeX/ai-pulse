// Datenladen: relative Pfade, cache: 'no-cache' (Pages sendet max-age=600), Modul-Store mit useSyncExternalStore.
// Jede Datei wird einmal geladen und von allen Ansichten geteilt. Daten nie ins Bundle.
import { useSyncExternalStore } from 'react';
import { CATEGORY_KEYS } from '../../shared/categories.ts';
import type { Briefing, FristenFile, Latest, Meta, Story } from '../../shared/types.ts';

export type Status = 'loading' | 'ok' | 'missing' | 'error';
export interface Entry<T> { status: Status; data?: T; loadedAt?: number }

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

declare global {
  interface Window { __pulse?: Record<string, unknown>; __lastError?: string }
}

export const debug: Record<string, unknown> = { counts: {}, errors: [] as string[] };
window.__pulse = debug;

async function fetchJson(path: string, parse?: (raw: unknown) => unknown): Promise<void> {
  const prev = store.get(path);
  store.set(path, { ...prev, status: prev?.data ? 'ok' : 'loading' });
  emit();
  try {
    const res = await fetch(`data/${path}`, { cache: 'no-cache' });
    // 404 oder SPA-Fallback (HTML statt JSON, z. B. vite preview) = Datei fehlt
    if (res.status === 404 || (res.ok && !/json/i.test(res.headers.get('content-type') ?? ''))) {
      store.set(path, { status: 'missing', loadedAt: Date.now() });
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const raw = await res.json();
      store.set(path, { status: 'ok', data: parse ? parse(raw) : raw, loadedAt: Date.now() });
    }
  } catch (err) {
    (debug.errors as string[]).push(`${path}: ${(err as Error).message}`);
    store.set(path, prev?.data ? { ...prev, status: 'ok' } : { status: 'error' });
  } finally {
    inflight.delete(path);
    emit();
  }
}

// Lädt nur, wenn noch nie geladen wurde – ein Fehler wird nicht automatisch wiederholt (sonst Endlosschleife
// beim Rendern); „Erneut versuchen" und das Sichtbarwerden laden mit force neu.
export function load(path: string, parse?: (raw: unknown) => unknown, force = false): void {
  if (inflight.has(path)) return;
  if (!force && store.has(path)) return;
  inflight.set(path, fetchJson(path, parse));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useData<T>(path: string, parse?: (raw: unknown) => unknown): Entry<T> {
  load(path, parse);
  return useSyncExternalStore(subscribe, () => (store.get(path) ?? { status: 'loading' }) as Entry<T>);
}

// Tolerant parsen: Stories ohne Pflichtfelder oder mit unbekannter Kategorie überspringen
const CATS = new Set<string>(CATEGORY_KEYS);
export function parseLatest(raw: unknown): Latest {
  const l = raw as Latest;
  let skipped = 0;
  const stories = (Array.isArray(l?.stories) ? l.stories : []).filter((s: Story) => {
    const ok = s && s.id && s.title && s.url && CATS.has(s.category) && typeof s.impact === 'number' && typeof s.personal === 'number' && typeof s.score === 'number' && s.firstSeen;
    if (!ok) skipped++;
    return ok;
  });
  (debug.counts as Record<string, number>).skipped = skipped;
  (debug.counts as Record<string, number>).stories = stories.length;
  debug.buildId = l?.buildId;
  debug.generatedAt = l?.generatedAt;
  return { ...l, stories: stories.map(s => ({ ...s, tags: Array.isArray(s.tags) ? s.tags : [], sources: Array.isArray(s.sources) ? s.sources : [] })) };
}

export const useLatest = () => useData<Latest>('latest.json', parseLatest);
export const useBriefing = () => useData<Briefing>('briefing/latest.json');
export const useMeta = () => useData<Meta>('meta.json');
export const useFristen = () => useData<FristenFile>('fristen.json');

export function reloadCore(): void {
  for (const p of ['latest.json', 'briefing/latest.json', 'meta.json']) load(p, p === 'latest.json' ? parseLatest : undefined, true);
}

// Neu laden beim Sichtbarwerden, wenn der letzte Abruf > 5 min her ist (kein Polling)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = store.get('latest.json')?.loadedAt ?? 0;
  if (Date.now() - t > 5 * 60_000) reloadCore();
});

window.addEventListener('error', e => { window.__lastError = String(e.message); });
window.addEventListener('unhandledrejection', e => { window.__lastError = String(e.reason); });
