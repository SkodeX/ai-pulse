// Stufe 0b: deterministischer Vor-Score und Regel-Score ohne Claude (Skill bewertung, Abschnitt Stufe 0b).

import type { Category } from '../../shared/categories.ts'
import { mentionsOwnTool } from '../config/profile.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import { mentionsWatchProvider } from '../config/watchlist.ts'
import { HOUR } from '../lib/util.ts'
import type { Cluster } from '../types.ts'

export function sourcePrior(sourceId: string): number {
  const s = SOURCE_BY_ID.get(sourceId)
  if (!s) return 1
  if (s.role === 'official') return 3
  if (s.role === 'press' && s.priority === 'core') return 2
  return 1
}

const text = (c: Cluster) => `${c.primary.title} ${c.primary.teaser}`

export function preScore(c: Cluster, now: Date): number {
  let p = sourcePrior(c.primary.sourceId)
  p += Math.min(Math.max(c.signals.independentSources - 1, 0), 3)
  if (c.signals.techmeme) p += 1.5
  const hn = c.signals.hnPoints ?? 0
  p += hn >= 300 ? 2 : hn > 100 ? 1 : 0
  if ((c.signals.hnComments ?? 0) > 100) p += 0.5
  if ((c.signals.upvotes ?? 0) >= 50) p += 1
  if (mentionsWatchProvider(text(c))) p += 1
  if (mentionsOwnTool(text(c))) p += 1
  if (c.items.some(i => i.lawHint?.changed)) p += 2
  if (c.items.some(i => i.paywall)) p -= 1
  if (now.getTime() - Date.parse(c.publishedAt ?? c.firstSeen) > 48 * HOUR) p -= 1
  return Math.max(0, Math.min(10, Math.round(p * 10) / 10))
}

// Kategorie ohne Claude: erster Register-Hinweis (categoryMap-Treffer stehen vorn), sonst neuigkeiten.
export function ruleCategory(c: Cluster): Category {
  return c.primary.categoryHint[0] ?? 'neuigkeiten'
}

const EU_LAW_RE = /\b(ai act|ki-verordnung|dsgvo|gdpr|eu-kommission|european commission|bundesnetzagentur|ki-mig|datenschutzbehörde|dsk)\b/i

export function ruleScores(c: Cluster, pre: number): { impact: number; personal: number; category: Category } {
  const category = ruleCategory(c)
  const t = text(c)
  const personal = 3 + (mentionsOwnTool(t) ? 3 : 0) + (EU_LAW_RE.test(t) ? 2 : 0)
    + (['preise', 'vertraege', 'sicherheit'].includes(category) ? 1 : 0) + (mentionsWatchProvider(t) ? 1 : 0)
  return { impact: clampScore(Math.round(pre)), personal: clampScore(personal), category }
}

export function clampScore(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)))
}

export function storyScore(impact: number, personal: number): number {
  return Math.round(((impact + personal) / 2) * 10) / 10
}

// Impact-Boost nach Claude (ohne Tokens): Techmeme, HN > 100 oder ≥ 3 unabhängige Quellen.
export function boostCondition(c: Pick<Cluster, 'signals'>): boolean {
  return c.signals.techmeme || (c.signals.hnPoints ?? 0) > 100 || c.signals.independentSources >= 3
}
