// „Neu seit letztem Besuch": vorheriger Besuch wird beim Start einmal gelesen, dann auf jetzt gesetzt.
import { read, write } from './storage.ts';
import type { Display } from './storage.ts';

const display = read<Display>('display', { v: 1 });
export const previousVisit: string = display.lastVisit ?? new Date(Date.now() - 6 * 3600e3).toISOString();
write('display', { ...display, lastVisit: new Date().toISOString() });

export const isNewSinceVisit = (firstSeen: string) => firstSeen > previousVisit;
