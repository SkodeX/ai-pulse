// Clustering Stufe 0a (Skill bewertung, references/clustering.md): URL-Gleichheit + Titel-Jaccard
// über Union-Find, Primärquelle nach Quellen-Prior. Phase 1: keine Abgleich-Basis, keine Watchlist-Regel.

import { getDomainWithoutSuffix } from 'tldts'
import type { Source } from '../config/sources.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import type { SeenMap } from '../filter/prefilter.ts'
import { HOUR, sha1 } from '../lib/util.ts'
import type { Cluster, RawItem } from '../types.ts'
import { similarTitles, titleTokens } from './title.ts'

const WINDOW_MS = 72 * HOUR

export interface ClusterResult {
  clusters: Cluster[]
  attached: number          // an bestehende Stories angehängt (ab Phase 2)
  seenDropped: number       // seen-Treffer mit Story ohne Abgleich-Basis verworfen
}

// Quellen-Prior: offizielle Quelle 3 · Kernpresse 2 · nice/Community/Aggregator 1 (wie Stufe 0b)
export function sourcePrior(source: Source | undefined): number {
  if (!source) return 1
  if (source.role === 'official') return 3
  if (source.role === 'press' && source.priority === 'core') return 2
  return 1
}

export function outletOf(source: Source | undefined, sourceId: string): string {
  if (!source) return sourceId
  return source.outlet ?? getDomainWithoutSuffix(source.url) ?? source.id
}

const time = (i: RawItem) => i.publishedAt ?? i.firstSeen

class UnionFind {
  private readonly parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]!]!
      i = this.parent[i]!
    }
    return i
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb)
  }
}

export function pickPrimary(items: RawItem[]): RawItem {
  return [...items].sort((a, b) => {
    const prior = sourcePrior(SOURCE_BY_ID.get(b.sourceId)) - sourcePrior(SOURCE_BY_ID.get(a.sourceId))
    return prior !== 0 ? prior : time(a).localeCompare(time(b))
  })[0]!
}

export function buildCluster(items: RawItem[], now: Date): Cluster {
  const primary = pickPrimary(items)
  const forced = items.find(i => i.clusterKey)?.clusterKey
  const ordered = [primary, ...items.filter(i => i !== primary)]
  const sources: Cluster['sources'] = []
  for (const item of ordered) {
    if (sources.some(s => s.id === item.sourceId)) continue
    const source = SOURCE_BY_ID.get(item.sourceId)
    sources.push({ id: item.sourceId, name: source?.name ?? item.sourceId, url: item.canonicalUrl, lang: item.lang })
  }
  const outlets = new Set(items.map(i => outletOf(SOURCE_BY_ID.get(i.sourceId), i.sourceId)))
  const max = (pick: (i: RawItem) => number | undefined) => {
    const values = items.map(pick).filter((v): v is number => v !== undefined)
    return values.length > 0 ? Math.max(...values) : undefined
  }
  const published = items.map(i => i.publishedAt).filter((p): p is string => !!p).sort()[0]
  const nowIso = now.toISOString()
  const signals: Cluster['signals'] = {
    techmeme: items.some(i => i.sourceId === 'techmeme' || !!i.signals?.techmemeUrl),
    independentSources: outlets.size,
  }
  const hnPoints = max(i => i.signals?.hnPoints)
  const hnComments = max(i => i.signals?.hnComments)
  const upvotes = max(i => i.signals?.upvotes)
  const releaseNotes = primary.signals?.releaseNotes ?? items.find(i => i.signals?.releaseNotes)?.signals?.releaseNotes
  if (hnPoints !== undefined) signals.hnPoints = hnPoints
  if (hnComments !== undefined) signals.hnComments = hnComments
  if (upvotes !== undefined) signals.upvotes = upvotes
  if (releaseNotes) signals.releaseNotes = releaseNotes

  const cluster: Cluster = {
    clusterKey: forced ?? 'u-' + sha1(primary.canonicalUrl).slice(0, 12),
    items,
    primary,
    sources,
    firstSeen: items.map(i => i.firstSeen).sort()[0]!,
    signals,
  }
  if (published) cluster.publishedAt = published > nowIso ? nowIso : published
  return cluster
}

export function clusterItems(input: RawItem[], now: Date): ClusterResult {
  // Phase 1: seen-Treffer mit Story haben keine Abgleich-Basis → verwerfen
  const items = input.filter(i => !i.seenStoryId)
  const seenDropped = input.length - items.length
  const uf = new UnionFind(items.length)

  // vorgegebene Schlüssel: je Schlüssel ein Cluster, verschiedene nie zusammen
  const byKey = new Map<string, number>()
  items.forEach((item, i) => {
    if (!item.clusterKey) return
    const first = byKey.get(item.clusterKey)
    if (first === undefined) byKey.set(item.clusterKey, i)
    else uf.union(first, i)
  })
  const forcedKeys = new Map<number, string>()
  items.forEach((item, i) => { if (item.clusterKey) forcedKeys.set(i, item.clusterKey) })
  const keyOfSet = (i: number): string | undefined => {
    const root = uf.find(i)
    for (const [idx, key] of forcedKeys) if (uf.find(idx) === root) return key
    return undefined
  }
  const canMerge = (a: number, b: number) => {
    const ka = keyOfSet(a)
    const kb = keyOfSet(b)
    return !ka || !kb || ka === kb
  }

  // URL-Gleichheit
  const byUrl = new Map<string, number>()
  items.forEach((item, i) => {
    const first = byUrl.get(item.canonicalUrl)
    if (first === undefined) byUrl.set(item.canonicalUrl, i)
    else if (canMerge(first, i)) uf.union(first, i)
  })

  // Titel-Jaccard ≥ 0,5 und ≥ 3 gemeinsame Token, nur innerhalb von 72 h
  const tokens = items.map(i => titleTokens(i.title))
  const times = items.map(i => Date.parse(time(i)))
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      if (Math.abs(times[a]! - times[b]!) > WINDOW_MS) continue
      if (uf.find(a) === uf.find(b)) continue
      if (similarTitles(tokens[a]!, tokens[b]!) && canMerge(a, b)) uf.union(a, b)
    }
  }

  const groups = new Map<number, RawItem[]>()
  items.forEach((item, i) => {
    const root = uf.find(i)
    const g = groups.get(root)
    if (g) g.push(item)
    else groups.set(root, [item])
  })
  const clusters = [...groups.values()].map(g => buildCluster(g, now))
  clusters.sort((a, b) => (b.publishedAt ?? b.firstSeen).localeCompare(a.publishedAt ?? a.firstSeen))
  return { clusters, attached: 0, seenDropped }
}

// Story-ID eines Clusters (auch Schatten-seen.json im Trockenlauf)
export function storyIdOf(cluster: Cluster): string {
  return cluster.existingStoryId ?? sha1(cluster.clusterKey).slice(0, 12)
}

// Schatten-seen (Trockenlauf): jeder Cluster gilt als bewertet; firstSeen bestehender Einträge bleibt.
export function markShadowSeen(seen: SeenMap, clusters: Cluster[]): SeenMap {
  const out = { ...seen }
  for (const c of clusters) {
    const storyId = storyIdOf(c)
    for (const item of c.items) {
      const prev = out[item.key]
      out[item.key] = { firstSeen: prev?.firstSeen ?? item.firstSeen, storyId: prev?.storyId ?? storyId }
    }
  }
  return out
}
