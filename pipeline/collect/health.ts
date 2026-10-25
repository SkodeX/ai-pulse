// Health je Quelle mit Circuit-Breaker (Skill quellen § 5) – state/sources-health.json.

import type { Source } from '../config/sources.ts'
import { DAY, berlinDate, lastSundayBerlin } from '../lib/util.ts'

export type Verdict = 'ok' | 'blockiert' | 'unerwartet' | 'fehler'
export type HealthStatus = 'ok' | 'degraded' | 'blockiert'

export interface HealthEntry {
  status: HealthStatus
  consecutiveFailures: number
  failingSince?: string
  lastError: string | null
  lastHttp: number | null
  lastAttempt: string | null
  lastSuccess: string | null
  bytes: number
  items: number
  newestItem: string | null
  lastNewItemAt: string | null
  stale: boolean
  finalUrl?: string
  fallbackActive: string[]
  hints: string[]
  verdict?: Verdict          // Urteil des letzten Abrufs (für „nicht fällig")
  finalUrlRuns?: number      // Läufe in Folge mit abweichender finaler URL
  floodRuns?: number         // Läufe in Folge mit Flutbremse
}

export interface HealthFile {
  updatedAt: string
  sources: Record<string, HealthEntry>
}

export const BREAKER_THRESHOLD = 3

export function effectiveStatus(source: Source, entry: HealthEntry | undefined): HealthStatus {
  return entry?.status ?? (source.startStatus === 'blockiert' ? 'blockiert' : 'ok')
}

// Fällig nach Takt; blockierte Quellen nur einmal je Berliner Kalendertag proben.
export function isDue(source: Source, entry: HealthEntry | undefined, now: Date): boolean {
  const today = berlinDate(now)
  if (effectiveStatus(source, entry) === 'blockiert') {
    return !entry?.lastAttempt || berlinDate(new Date(entry.lastAttempt)) !== today
  }
  if (source.cadence === '3x') return true
  if (!entry?.lastSuccess) return true
  const last = new Date(entry.lastSuccess)
  if (source.cadence === 'daily07') return berlinDate(last) !== today
  return berlinDate(last) < lastSundayBerlin(now)
}

export function emptyEntry(source: Source): HealthEntry {
  return {
    status: source.startStatus === 'blockiert' ? 'blockiert' : 'ok',
    consecutiveFailures: 0,
    lastError: null, lastHttp: null, lastAttempt: null, lastSuccess: null,
    bytes: 0, items: 0, newestItem: null, lastNewItemAt: null, stale: false,
    fallbackActive: [], hints: [],
  }
}

export interface AttemptOutcome {
  verdict: Verdict
  error?: string
  status?: number
  bytes: number
  items: number               // geparste Einträge
  newestItem?: string
  finalUrl?: string
  hints: string[]
}

export function applyAttempt(source: Source, prev: HealthEntry | undefined, o: AttemptOutcome, now: Date): HealthEntry {
  const base = prev ? { ...prev } : emptyEntry(source)
  const nowIso = now.toISOString()
  base.lastAttempt = nowIso
  base.lastHttp = o.status ?? null
  base.verdict = o.verdict
  base.hints = [...o.hints]
  if (o.finalUrl) base.finalUrl = o.finalUrl
  base.finalUrlRuns = o.hints.includes('final-url') ? (base.finalUrlRuns ?? 0) + 1 : 0
  if (o.verdict === 'ok') {
    base.status = 'ok'
    base.consecutiveFailures = 0
    delete base.failingSince
    base.lastError = null
    base.lastSuccess = nowIso
    base.bytes = o.bytes
    base.items = o.items
    if (o.newestItem && (!base.newestItem || o.newestItem > base.newestItem)) base.newestItem = o.newestItem
    if (source.startStatus && prev?.status !== 'ok') base.hints.push('start-ok')
  } else {
    base.consecutiveFailures += 1
    base.failingSince ??= nowIso
    base.lastError = o.error ?? o.verdict
    const tripped = base.consecutiveFailures >= BREAKER_THRESHOLD || (prev?.status ?? effectiveStatus(source, prev)) !== 'ok'
    base.status = tripped ? (o.verdict === 'blockiert' ? 'blockiert' : 'degraded') : 'ok'
  }
  return base
}

export function markStale(source: Source, entry: HealthEntry, now: Date): void {
  const newest = [entry.newestItem, entry.lastNewItemAt].filter((v): v is string => !!v).sort().pop()
  const days = source.staleDays ?? 14
  entry.stale = newest ? now.getTime() - Date.parse(newest) > days * DAY : false
}
