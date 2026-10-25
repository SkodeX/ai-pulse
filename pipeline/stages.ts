// Sammelstufe als Baustein für Trockenlauf und vollen Lauf: abrufen, Vorfilter, Clustering (Stufe 0a).

import { clusterItems } from './cluster/cluster.ts'
import type { CollectResult } from './collect/collect.ts'
import { collect } from './collect/collect.ts'
import { markStale } from './collect/health.ts'
import type { Source } from './config/sources.ts'
import type { PrefilterResult } from './filter/prefilter.ts'
import { prefilter } from './filter/prefilter.ts'
import type { Version } from './filter/releases.ts'
import type { PipelineState } from './state.ts'
import type { Cluster, RawItem } from './types.ts'

export interface CollectStageResult {
  result: CollectResult
  pf: PrefilterResult
  clusters: Cluster[]
  seenItems: RawItem[]      // seen-Treffer mit storyId (hängen an bestehende Stories)
  seenDropped: number
}

export async function collectStage(sources: Source[], state: PipelineState, now: Date, force: boolean): Promise<CollectStageResult> {
  const prevReleases = new Map<string, Version | undefined>(Object.entries(state.sourceState).map(([id, s]) => [id, s.release]))
  const result = await collect({ sources, state, now, force, githubToken: process.env['AIPULSE_GITHUB_TOKEN'] || undefined })
  const pf = prefilter(result.runs.flatMap(r => r.entries), { now, firstSeen: now.toISOString(), seen: state.seen, prevReleases })

  // Health ergänzen: Flutbremse, neue Items, Frische
  const newBySource = new Map<string, number>()
  for (const item of pf.items) if (!item.seenStoryId) newBySource.set(item.sourceId, (newBySource.get(item.sourceId) ?? 0) + 1)
  for (const run of result.runs) {
    const h = result.state.health.sources[run.source.id]
    if (!h) continue
    if (run.fetched) {
      const flood = pf.hints[run.source.id]?.includes('flood') ?? false
      if (flood && !h.hints.includes('flood')) h.hints.push('flood')
      if (flood && !run.hints.includes('flood')) run.hints.push('flood')
      h.floodRuns = flood ? (h.floodRuns ?? 0) + 1 : 0
      if ((newBySource.get(run.source.id) ?? 0) > 0) h.lastNewItemAt = now.toISOString()
    }
    markStale(run.source, h, now)
  }

  const seenItems = pf.items.filter(i => i.seenStoryId)
  const { clusters } = clusterItems(pf.items.filter(i => !i.seenStoryId), now)
  return { result, pf, clusters, seenItems, seenDropped: 0 }
}
