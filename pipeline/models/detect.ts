// Modell-Detektoren im Lauf: OpenRouter jeder Lauf (Ereignisse → RawItems), Bestenlisten/Watchlist Mo/Mi/Fr.
// State in <stateDir>/leaderboards/; der Aufrufer entscheidet, ob er ihn speichert (nur voller Lauf bzw. Schatten).

import { join } from 'node:path'
import type { ModelsFile, Watchlist } from '../../shared/types.ts'
import { ACCEPT_JSON, httpFetch } from '../collect/http.ts'
import { canonicalUrl } from '../lib/url.ts'
import { readJson, writeJson } from '../lib/util.ts'
import type { RawItem } from '../types.ts'
import type { ArenaState } from './arena.ts'
import { fetchArena } from './arena.ts'
import type { WatchHistory } from './build.ts'
import { buildModelsFile, buildWatchlist, modelsDue } from './build.ts'
import type { OrEvent, OrSnapshot } from './openrouter.ts'
import { OPENROUTER_URL, diffModels, expirations, reduceModels } from './openrouter.ts'

export interface ModelsState { openrouter?: OrSnapshot; arena: ArenaState; history: WatchHistory; lastBuild?: string }

export async function loadModelsState(stateDir: string): Promise<ModelsState> {
  const d = join(stateDir, 'leaderboards')
  return {
    openrouter: await readJson<OrSnapshot | undefined>(join(d, 'openrouter.json'), undefined),
    arena: await readJson<ArenaState>(join(d, 'arena.json'), {}),
    history: await readJson<WatchHistory>(join(d, 'watchlist-history.json'), { builds: [] }),
    lastBuild: (await readJson<{ lastBuild?: string }>(join(d, 'models-build.json'), {})).lastBuild,
  }
}

export async function saveModelsState(stateDir: string, s: ModelsState): Promise<void> {
  const d = join(stateDir, 'leaderboards')
  if (s.openrouter) await writeJson(join(d, 'openrouter.json'), s.openrouter, 0)
  await writeJson(join(d, 'arena.json'), s.arena, 0)
  await writeJson(join(d, 'watchlist-history.json'), s.history)
  await writeJson(join(d, 'models-build.json'), { lastBuild: s.lastBuild })
}

export function eventToItem(e: OrEvent, now: Date): RawItem {
  const url = `https://openrouter.ai/${e.model.id}`
  const nowIso = now.toISOString()
  return {
    sourceId: 'openrouter-models', key: `or:${e.model.slug}:${e.kind}:${e.model.expires ?? ''}`.slice(0, 120), url, canonicalUrl: canonicalUrl(url),
    title: e.title, teaser: e.detail.slice(0, 300), publishedAt: nowIso, firstSeen: nowIso, lang: 'de', paywall: false,
    categoryHint: e.kind === 'prefix' ? ['startups'] : e.kind === 'new' ? ['modelle'] : ['preise'], clusterKey: e.clusterKey,
  }
}

export interface ModelsRun {
  items: RawItem[]
  state: ModelsState
  modelsFile?: ModelsFile
  watchlist?: Watchlist
  expirations?: ReturnType<typeof expirations>
  errors: string[]
}

export async function runModels(prev: ModelsState, now: Date, forceBuild: boolean): Promise<ModelsRun> {
  const errors: string[] = []
  const state: ModelsState = { ...prev }
  const res = await httpFetch({ url: OPENROUTER_URL, accept: ACCEPT_JSON, maxBytes: 8 * 1024 * 1024 })
  let models: ReturnType<typeof reduceModels> = []
  let items: RawItem[] = []
  let exp: ModelsRun['expirations']
  if (res.ok && res.body) {
    try {
      const data = (JSON.parse(res.body) as { data?: unknown[] }).data
      if (!Array.isArray(data)) throw new Error('data[] fehlt')
      models = reduceModels(data)
      const diff = diffModels(models, prev.openrouter, now)
      if (diff.error) errors.push(`openrouter: ${diff.error}`)
      else {
        state.openrouter = diff.snapshot
        items = diff.events.map(e => eventToItem(e, now))
        const lastRanks = prev.history.builds[prev.history.builds.length - 1]?.ranks
        exp = expirations(models, now, lastRanks ? new Set(Object.keys(lastRanks)) : undefined)
      }
    } catch (err) {
      errors.push(`openrouter: ${(err as Error).message}`)
    }
  } else {
    errors.push(`openrouter: ${res.error ?? res.status}`)
  }

  let modelsFile: ModelsFile | undefined
  let watchlist: Watchlist | undefined
  if ((forceBuild || modelsDue(prev.lastBuild, now)) && models.length > 0) {
    const arena = await fetchArena(prev.arena, now)
    errors.push(...arena.errors.map(e => `arena ${e}`))
    state.arena = arena.state
    const fetchedAt = state.openrouter?.fetchedAt ?? null
    modelsFile = buildModelsFile(models, arena.state, fetchedAt, now)
    const wl = buildWatchlist(models, arena.state, fetchedAt, prev.history, now)
    watchlist = wl.file
    state.history = wl.history
    state.lastBuild = now.toISOString()
  }
  return { items, state, modelsFile, watchlist, expirations: exp, errors }
}
