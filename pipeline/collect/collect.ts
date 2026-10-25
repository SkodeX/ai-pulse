// Sammelstufe: fällige Quellen abrufen und parsen, Fallback-Ketten aktivieren, Health fortschreiben.
// Schreibt nichts selbst – die neuen Stände gehen an den Aufrufer (am Laufende speichern).

import type { Source, UrlContext } from '../config/sources.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import { canonicalUrl } from '../lib/url.ts'
import { HOUR } from '../lib/util.ts'
import type { ParsedEntry } from '../types.ts'
import type { AttemptOutcome, HealthEntry, HealthFile, Verdict } from './health.ts'
import { applyAttempt, effectiveStatus, isDue } from './health.ts'
import type { ErrorCode, FetchResult, HttpCacheEntry } from './http.ts'
import { ACCEPT_FEED, ACCEPT_HTML, ACCEPT_JSON, HostScheduler, httpFetch } from './http.ts'
import type { ParseContext, ParseResult, SourceSnapshot } from './parsers/common.ts'
import { parseFeed } from './parsers/feed.ts'
import { githubUrls, parseGithub } from './parsers/github.ts'
import { parseHtmlDiff } from './parsers/htmldiff.ts'
import { parseJson } from './parsers/json.ts'
import { parseSitemap } from './parsers/sitemap.ts'
import { isAllowed, robotsFor, robotsKey } from './robots.ts'

export interface CollectState {
  httpCache: Record<string, HttpCacheEntry>
  sourceState: Record<string, SourceSnapshot>
  health: HealthFile
}

export interface SourceRun {
  source: Source
  due: boolean
  fetched: boolean
  verdict: Verdict
  error?: string
  status?: number
  bytes: number
  ms: number
  entries: ParsedEntry[]
  hints: string[]
  finalUrl?: string
  asFallbackFor: string[]   // Primärquellen, für die diese Quelle einsprang
}

export interface CollectOptions {
  sources: Source[]         // Auswahl (ohne --only: alle außer fallbackOnly)
  state: CollectState
  now: Date
  force?: boolean           // --only: Takt ignorieren
  githubToken?: string
  pauseMs?: [number, number]   // Pause je Host (Standard 300–1200 ms; Tests 0)
}

export interface CollectResult {
  runs: SourceRun[]
  state: CollectState       // neue Stände (Kopie)
}

// ---------- URL-Platzhalter ----------

export function resolveUrl(source: Source, ctx: UrlContext): string {
  if (source.buildUrl) return source.buildUrl(ctx)
  const now = ctx.now.getTime()
  const floor = now - 72 * HOUR
  const candidates = [now - 36 * HOUR]
  if (ctx.lastSuccess) candidates.push(Date.parse(ctx.lastSuccess) - 24 * HOUR)
  const since = Math.max(floor, Math.min(...candidates))
  const yesterday = new Date(now - 24 * HOUR).toISOString().slice(0, 10)
  return source.url.replace('{since36hUnix}', String(Math.floor(since / 1000))).replace('{yesterdayUtc}', yesterday)
}

export function fetchPlan(source: Source, ctx: UrlContext, githubToken?: string): { url: string; accept: string; headers?: Record<string, string>; mode?: 'rest' | 'atom' } {
  if (source.kind === 'github' && source.github) {
    const urls = githubUrls(source.github.repo, source.github.perPage)
    if (githubToken) {
      return {
        url: urls.rest, accept: ACCEPT_JSON, mode: 'rest',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${githubToken}`, 'X-GitHub-Api-Version': '2022-11-28' },
      }
    }
    return { url: urls.atom, accept: ACCEPT_FEED, mode: 'atom' }
  }
  const accept = source.kind === 'json' || source.kind === 'detector' ? ACCEPT_JSON : source.kind === 'htmldiff' ? ACCEPT_HTML : ACCEPT_FEED
  return { url: resolveUrl(source, ctx), accept, headers: source.headers }
}

export function verdictOf(error: ErrorCode | 'format' | 'empty' | undefined): Verdict {
  if (!error) return 'ok'
  if (error === 'blocked') return 'blockiert'
  if (error === 'format' || error === 'empty') return 'unerwartet'
  return 'fehler'
}

async function parse(ctx: ParseContext): Promise<ParseResult> {
  switch (ctx.source.kind) {
    case 'feed': return parseFeed(ctx)
    case 'json': return parseJson(ctx)
    case 'sitemap': return parseSitemap(ctx)
    case 'htmldiff': return parseHtmlDiff(ctx)
    case 'github': return parseGithub(ctx)
    case 'detector': return { entries: [], hints: [], error: 'format', errorDetail: 'Detektor – Abruf in pipeline/models/' }
  }
}

// ---------- Ein Abruf ----------

async function runSource(source: Source, opts: CollectOptions, state: CollectState, scheduler: HostScheduler): Promise<SourceRun> {
  const { now } = opts
  const health = state.health.sources[source.id]
  const plan = fetchPlan(source, { now, lastSuccess: health?.lastSuccess ?? undefined }, opts.githubToken)
  const run: SourceRun = { source, due: true, fetched: false, verdict: 'fehler', bytes: 0, ms: 0, entries: [], hints: [], asFallbackFor: [] }

  if (!scheduler.reserve(plan.url)) {
    run.error = 'host-budget: schon ein Request auf diesem Host in diesem Lauf'
    return run
  }

  if (source.kind === 'htmldiff') {
    const key = robotsKey(plan.url)
    const robots = await scheduler.run(plan.url, () => robotsFor(plan.url, state.httpCache[key], now))
    if (robots.entry) state.httpCache[key] = robots.entry
    if (!isAllowed(robots.rules, plan.url)) {
      run.error = robots.rules.status >= 500 || robots.rules.status === 0 ? 'robots: nicht erreichbar' : 'robots: verboten'
      return run
    }
  }

  const res = await scheduler.run(plan.url, () => httpFetch({ url: plan.url, accept: plan.accept, headers: plan.headers, cache: state.httpCache[source.id], maxBytes: source.maxBytes }))
  run.fetched = true
  run.status = res.status
  run.bytes = res.bytes
  run.ms = res.ms
  run.finalUrl = res.finalUrl
  if (plan.mode === 'atom') run.hints.push('no-token')
  if (res.finalUrl && canonicalUrl(res.finalUrl) !== canonicalUrl(plan.url)) run.hints.push('final-url')

  if (!res.ok) {
    run.verdict = verdictOf(res.error)
    run.error = [res.error, res.errorDetail].filter(Boolean).join(': ')
    return run
  }
  if (res.cache && !res.cache.etag && !res.cache.lastModified) run.hints.push('no-validators')
  if (res.notModified) {
    run.verdict = 'ok'
    state.httpCache[source.id] = { ...state.httpCache[source.id], ...res.cache!, checkedAt: now.toISOString() }
    return run
  }

  const fetchExtra = makeExtraFetcher(source, state, scheduler, now)
  const parsed = await parse({ source, body: res.body ?? '', url: plan.url, now, snapshot: state.sourceState[source.id], fetchExtra })
  run.hints.push(...parsed.hints)
  if (parsed.error) {
    run.verdict = 'unerwartet'
    run.error = `${parsed.error}: ${parsed.errorDetail ?? ''}`.trim()
    return run   // Cache und Schnappschuss bleiben unverändert
  }
  run.verdict = 'ok'
  run.entries = parsed.entries
  if (res.cache) state.httpCache[source.id] = res.cache
  if (parsed.snapshot) state.sourceState[source.id] = parsed.snapshot
  return run
}

function makeExtraFetcher(source: Source, state: CollectState, scheduler: HostScheduler, now: Date): ParseContext['fetchExtra'] {
  let part = 0
  return async (url, kind) => {
    if (!scheduler.reserve(url)) return undefined
    if (kind === 'page') {
      const key = robotsKey(url)
      const robots = await scheduler.run(url, () => robotsFor(url, state.httpCache[key], now))
      if (robots.entry) state.httpCache[key] = robots.entry
      if (!isAllowed(robots.rules, url)) return undefined
      return scheduler.run(url, () => httpFetch({ url, accept: ACCEPT_HTML, maxBytes: 2 * 1024 * 1024 }))
    }
    const cacheKey = `${source.id}:${++part}`
    const res: FetchResult = await scheduler.run(url, () => httpFetch({ url, accept: ACCEPT_FEED, cache: state.httpCache[cacheKey] }))
    if (res.ok && res.cache) state.httpCache[cacheKey] = res.cache
    return res
  }
}

// ---------- Lauf ----------

export async function collect(opts: CollectOptions): Promise<CollectResult> {
  const { now } = opts
  const state: CollectState = structuredClone(opts.state)
  const scheduler = new HostScheduler(8, opts.pauseMs)
  const runs = new Map<string, SourceRun>()

  const notDue = (source: Source): SourceRun => {
    const h = state.health.sources[source.id]
    return { source, due: false, fetched: false, verdict: h?.verdict ?? (effectiveStatus(source, h) === 'blockiert' ? 'blockiert' : 'ok'), error: h?.lastError ?? undefined, bytes: 0, ms: 0, entries: [], hints: [], asFallbackFor: [] }
  }

  const execute = async (list: Source[]) => {
    const results = await Promise.all(list.map(async source => {
      try {
        return await runSource(source, opts, state, scheduler)
      } catch (err) {
        // Kaputte Quellen brechen nie den Lauf ab
        return { source, due: true, fetched: true, verdict: 'fehler', error: `absturz: ${(err as Error).message}`.slice(0, 200), bytes: 0, ms: 0, entries: [], hints: [], asFallbackFor: [] } satisfies SourceRun
      }
    }))
    for (const r of results) runs.set(r.source.id, r)
  }

  // Welle 1: alle ausgewählten Quellen (fällige werden abgerufen)
  const wave1: Source[] = []
  for (const source of opts.sources) {
    if (opts.force || isDue(source, state.health.sources[source.id], now)) wave1.push(source)
    else runs.set(source.id, notDue(source))
  }
  await execute(wave1)

  // Health der abgerufenen Quellen fortschreiben
  const updateHealth = (r: SourceRun) => {
    if (!r.fetched) return
    const outcome: AttemptOutcome = {
      verdict: r.verdict, error: r.error, status: r.status, bytes: r.bytes, items: r.entries.length,
      newestItem: r.entries.map(e => e.publishedAt).filter((p): p is string => !!p).sort().pop(),
      finalUrl: r.finalUrl, hints: r.hints,
    }
    state.health.sources[r.source.id] = applyAttempt(r.source, state.health.sources[r.source.id], outcome, now)
  }
  for (const r of runs.values()) updateHealth(r)

  // Fallback-Ketten: Primärquelle scheitert in diesem Lauf oder ist degraded/blockiert
  const needsFallback = (id: string): boolean => {
    const r = runs.get(id)
    const h = state.health.sources[id]
    const source = SOURCE_BY_ID.get(id)!
    return (r?.fetched === true && r.verdict !== 'ok') || effectiveStatus(source, h) !== 'ok'
  }
  const primaries = [...runs.values()].filter(r => !r.source.fallbackOnly && r.source.fallbacks.length > 0)
  for (let round = 0; round < 3; round++) {
    const toFetch = new Map<string, Source>()
    for (const p of primaries) {
      if (!needsFallback(p.source.id)) continue
      const active: string[] = []
      for (const fid of p.source.fallbacks) {
        const fsrc = SOURCE_BY_ID.get(fid)
        if (!fsrc) continue
        active.push(fid)
        const fr = runs.get(fid)
        if (!fr) {
          if (fsrc.fallbackOnly) toFetch.set(fid, fsrc)
          break
        }
        if (!fr.asFallbackFor.includes(p.source.id)) fr.asFallbackFor.push(p.source.id)
        if (fr.verdict === 'ok') break
      }
      const h = state.health.sources[p.source.id]
      if (h) h.fallbackActive = active
    }
    if (toFetch.size === 0) break
    await execute([...toFetch.values()])
    for (const id of toFetch.keys()) updateHealth(runs.get(id)!)
  }
  // Primärquellen ohne Ausfall: Fallback aus
  for (const p of primaries) {
    const h = state.health.sources[p.source.id]
    if (h && !needsFallback(p.source.id)) h.fallbackActive = []
  }
  // Fallback-Abrufe ihren Primärquellen zuordnen
  for (const p of primaries) {
    for (const fid of state.health.sources[p.source.id]?.fallbackActive ?? []) {
      const fr = runs.get(fid)
      if (fr && !fr.asFallbackFor.includes(p.source.id)) fr.asFallbackFor.push(p.source.id)
    }
  }

  state.health.updatedAt = now.toISOString()
  return { runs: [...runs.values()], state }
}

export function healthEntry(state: CollectState, id: string): HealthEntry | undefined {
  return state.health.sources[id]
}
