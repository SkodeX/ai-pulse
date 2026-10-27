// Cluster → Story: Abgleich mit bestehenden Stories, Triage-Ergebnis übernehmen, 1b-Zusammenführen,
// Summary übernehmen (±2), Impact-Boost (Skill bewertung, Stufen 0b–2).

import { isCategory } from '../../shared/categories.ts'
import type { Story } from '../../shared/types.ts'
import { similarTitles, titleTokens } from '../cluster/title.ts'
import { normalizeTag } from '../config/watchlist.ts'
import type { TriageItem } from '../llm/triage.ts'
import type { SummaryItem } from '../llm/summarize.ts'
import { HOUR, sha1 } from '../lib/util.ts'
import type { Cluster } from '../types.ts'
import { detectEntities, sourceProvider } from './entities.ts'
import { boostCondition, clampScore, ruleScores, storyScore } from './prescore.ts'

export function storyIdFor(clusterKey: string): string {
  return sha1(clusterKey).slice(0, 12)
}

function mergeSources(a: Story['sources'], b: Story['sources']): Story['sources'] {
  const out = [...a]
  for (const s of b) if (!out.some(x => x.id === s.id)) out.push(s)
  return out
}

export interface BasisMatch { story: Story; cluster: Cluster }

// Abgleich-Basis: URL-Gleichheit (url oder sources[].url) oder Titel-Jaccard gegen originalTitle (72 h).
export function matchBasis(clusters: Cluster[], basis: Story[]): { fresh: Cluster[]; matched: BasisMatch[] } {
  const byUrl = new Map<string, Story>()
  for (const s of basis) {
    byUrl.set(s.url, s)
    for (const src of s.sources) byUrl.set(src.url, s)
  }
  const tokens = basis.map(s => ({ s, t: titleTokens(s.originalTitle) }))
  const fresh: Cluster[] = []
  const matched: BasisMatch[] = []
  for (const c of clusters) {
    let hit = c.items.map(i => byUrl.get(i.canonicalUrl)).find(Boolean)
    if (!hit) {
      const ct = titleTokens(c.primary.title)
      const time = Date.parse(c.publishedAt ?? c.firstSeen)
      hit = tokens.find(({ s, t }) => Math.abs(Date.parse(s.publishedAt ?? s.firstSeen) - time) <= 72 * HOUR && similarTitles(ct, t))?.s
    }
    if (hit) matched.push({ story: hit, cluster: c })
    else fresh.push(c)
  }
  return { fresh, matched }
}

export function attachSources(story: Story, cluster: Cluster): Story {
  return { ...story, sources: mergeSources(story.sources, cluster.sources), paywall: story.paywall && cluster.items.every(i => i.paywall) }
}

export function buildStory(c: Cluster, pre: number, triage: TriageItem | undefined, now: Date): Story {
  const nowIso = now.toISOString()
  const published = c.publishedAt && c.publishedAt <= nowIso ? c.publishedAt : undefined
  const base = {
    url: c.primary.canonicalUrl,
    originalTitle: c.primary.title,
    sources: c.sources,
    paywall: c.items.every(i => i.paywall),
    firstSeen: c.firstSeen,
    ...(published ? { publishedAt: published } : {}),
  }
  if (!triage) {
    const r = ruleScores(c, pre)
    return { id: storyIdFor(c.clusterKey), clusterKey: c.clusterKey, title: c.primary.title, category: r.category, tags: [], impact: r.impact, personal: r.personal, score: storyScore(r.impact, r.personal), hype: false, ratedBy: 'regel', ...base }
  }
  const impact = clampScore(triage.hype ? Math.min(triage.impact, 5) : triage.impact)
  const personal = clampScore(triage.personal)
  const story: Story = {
    id: storyIdFor(triage.clusterKey), clusterKey: triage.clusterKey,
    title: triage.titleDe.trim() || c.primary.title,
    category: isCategory(triage.category) ? triage.category : 'neuigkeiten',
    tags: [...new Set(triage.tags.map(normalizeTag).filter(t => t && !/^(ki|ai)$/i.test(t)))].slice(0, 6),
    impact, personal, score: storyScore(impact, personal), hype: triage.hype,
    providers: triage.providers.map(p => p.trim()).filter(Boolean).slice(0, 4),
    models: triage.models.map(m => m.trim()).filter(Boolean).slice(0, 4),
    ratedBy: triage.model || 'claude-haiku-5-5',
    ...base,
  }
  const lawHint = c.items.find(i => i.lawHint)?.lawHint
  if (lawHint) {
    story.law = { status: lawHint.status, jurisdiction: lawHint.jurisdiction, statusSource: 'quelle', ...(lawHint.effectiveDate ? { effectiveDate: lawHint.effectiveDate } : {}), ...(lawHint.procedure ? { procedure: lawHint.procedure } : {}), ...(lawHint.region ? { region: lawHint.region } : {}) }
  } else if (story.category === 'gesetze' && triage.law) {
    story.law = { status: triage.law.status, jurisdiction: triage.law.jurisdiction, statusSource: 'meldung' }
    if (triage.law.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(triage.law.effectiveDate)) story.law.effectiveDate = triage.law.effectiveDate
  }
  return story
}

// 1b: gleicher clusterKey → eine Story (Maximum der Scores, Quellen vereinigt; ältere/bestehende id gewinnt).
// Schlüssel nur bis auf Bindestriche vergleichen: openai-gpt-61-terra-release = openai-gpt-6-1-terra-release
export const keyNorm = (k: string): string => k.replace(/-/g, '')

export function mergeByKey(stories: Story[], basisByKey: Map<string, Story>): { stories: Story[]; attached: Story[] } {
  const byKey = new Map<string, Story>()
  const basis = new Map<string, Story>()
  for (const [k, s] of basisByKey) if (!basis.has(keyNorm(k))) basis.set(keyNorm(k), s)
  const attached: Story[] = []
  for (const s of stories) {
    const key = keyNorm(s.clusterKey)
    const existing = basis.get(key)
    // auch bei gleicher id (sha1 desselben Schlüssels): bestehende Story behält firstSeen, Texte und Quellen, sonst würde sie überschrieben
    if (existing) {
      attached.push({ ...existing, sources: mergeSources(existing.sources, s.sources) })
      continue
    }
    const prev = byKey.get(key)
    if (!prev) { byKey.set(key, s); continue }
    const impact = Math.max(prev.impact, s.impact)
    const personal = Math.max(prev.personal, s.personal)
    const first = prev.firstSeen <= s.firstSeen ? prev : s
    byKey.set(key, { ...first, sources: mergeSources(first.sources, (first === prev ? s : prev).sources), impact, personal, score: storyScore(impact, personal) })
  }
  return { stories: [...byKey.values()], attached }
}

export function applySummary(s: Story, item: SummaryItem): Story {
  const clamp2 = (v: number, ref: number) => clampScore(Math.max(ref - 2, Math.min(ref + 2, v)))
  const hype = item.hype
  let impact = clamp2(item.impact, s.impact)
  if (hype) impact = Math.min(impact, 5)
  const personal = clamp2(item.personal, s.personal)
  return { ...s, title: item.titleDe.trim() || s.title, summary: item.summary.trim(), whyImportant: item.whyImportant.trim(), forYou: item.forYou.trim(), impact, personal, score: storyScore(impact, personal), hype }
}

export function applyBoost(s: Story, c: Pick<Cluster, 'signals'>): Story {
  if (s.ratedBy === 'regel' || !boostCondition(c)) return s
  const impact = Math.min(10, s.impact + 1)
  return { ...s, impact, score: storyScore(impact, s.personal) }
}

// Anbieter-/Modell-Tags aus Titel, Originaltitel, Teaser, Zusammenfassung und Tags (auch für Regel-Stories)
// Regel-Erkennung ∪ Claude-Angaben (Claude zuerst, ohne Dubletten); kein Anbieter → offizielle Primärquelle
export function withEntities(s: Story, teaser = ''): Story {
  const rule = detectEntities([s.originalTitle, s.title, teaser, s.summary ?? ''].join(' \n '), s.tags)
  const merge = (a: string[], b: string[]) => {
    const out: string[] = []
    for (const x of [...a, ...b]) if (!out.some(y => y.toLowerCase().replace(/[\s-]+/g, '') === x.toLowerCase().replace(/[\s-]+/g, ''))) out.push(x)
    return out.slice(0, 4)
  }
  // Claude-Namen auf die Schreibweise der Regel-Erkennung bringen („openai" → „OpenAI")
  const claudeProviders = (s.providers ?? []).map(p => detectEntities(p).providers[0] ?? p)
  let providers = merge(claudeProviders, rule.providers)
  if (providers.length === 0) {
    const fallback = sourceProvider(s.sources[0]?.id ?? '')
    if (fallback) providers = [fallback]
  }
  return { ...s, providers, models: merge(s.models ?? [], rule.models) }
}

export function sortStories(list: Story[]): Story[] {
  return [...list].sort((a, b) => b.score - a.score || b.impact - a.impact || b.firstSeen.localeCompare(a.firstSeen))
}
