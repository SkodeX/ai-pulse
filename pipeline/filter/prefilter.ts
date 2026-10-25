// Vorfilter ohne Claude (Skill quellen § 7): ParsedEntry → RawItem. Jeder Verwerfungsgrund wird je Quelle gezählt.

import type { Category } from '../../shared/categories.ts'
import { AI_RE, SPONSOR_META_RE, SPONSOR_TITLE_RE } from '../config/keywords.ts'
import type { Source } from '../config/sources.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import { canonicalUrl } from '../lib/url.ts'
import { DAY, HOUR, collapse, sha1, truncate } from '../lib/util.ts'
import type { ParsedEntry, RawItem } from '../types.ts'
import type { Version } from './releases.ts'
import { compareVersion, isPrerelease, parseVersion } from './releases.ts'

export const DROP_REASONS = ['age', 'dupe', 'seen', 'sponsor', 'keyword', 'prerelease', 'version', 'rule', 'flood'] as const
export type DropReason = typeof DROP_REASONS[number]

export type SeenMap = Record<string, { firstSeen: string; storyId?: string }>

export interface PrefilterContext {
  now: Date
  firstSeen: string                          // Laufbeginn (ISO)
  seen: SeenMap
  prevReleases: Map<string, Version | undefined>   // Schnappschuss vor diesem Lauf je GitHub-Quelle
}

export interface AnnotatedEntry { entry: ParsedEntry; drop?: DropReason; key: string }

export interface PrefilterResult {
  items: RawItem[]
  annotated: AnnotatedEntry[]
  drops: Record<string, Partial<Record<DropReason, number>>>
  hints: Record<string, string[]>
}

const DEFAULT_MAX_NEW = 25

export function entryKey(source: Source, entry: ParsedEntry, canonical: string): string {
  if (source.adapter === 'hn' && entry.guid) return `hn:${entry.guid}`
  if (source.kind === 'github' && source.github) {
    const v = parseVersion(entry.guid ?? '')
    const suffix = v ? `${v.major}.${v.minor}` : (entry.guid ?? '')
    return `gh:${source.github.repo}@${suffix}`.toLowerCase()
  }
  if (source.kind === 'htmldiff' && entry.guid) return `${source.id}#${entry.guid}`
  return sha1(canonical).slice(0, 12)
}

function stripPaywall(source: Source, title: string): { title: string; paywall: boolean } {
  if (source.paywall === true) return { title, paywall: true }
  if (source.paywall instanceof RegExp && source.paywall.test(title)) {
    return { title: collapse(title.replace(source.paywall, '')), paywall: true }
  }
  return { title, paywall: false }
}

function isSponsor(entry: ParsedEntry): boolean {
  return SPONSOR_TITLE_RE.test(entry.title)
    || (entry.author !== undefined && SPONSOR_META_RE.test(entry.author))
    || entry.categories.some(c => SPONSOR_META_RE.test(c))
}

function passesKeywords(source: Source, entry: ParsedEntry): boolean {
  const haystack = [entry.title, entry.categories.join(' '), entry.description].join(' \n ')
  if (source.filter?.exclude?.test(haystack)) return false
  if (source.aiOnly) return true
  return (source.filter?.include ?? AI_RE).test(haystack)
}

function passesRule(source: Source, entry: ParsedEntry, now: Date): boolean {
  const f = source.filter
  if (f?.minPoints !== undefined && !((entry.signals?.hnPoints ?? 0) > f.minPoints)) return false
  if (f?.minUpvotes !== undefined && !((entry.signals?.upvotes ?? 0) >= f.minUpvotes)) return false
  if (source.adapter === 'yc') {
    const year = Number(/\b(20\d{2})\b/.exec(entry.signals?.batch ?? '')?.[1] ?? 0)
    const current = now.getUTCFullYear()
    if (year !== current && year !== current + 1) return false
  }
  return true
}

function categoryHint(source: Source, entry: ParsedEntry): Category[] {
  const mapped = source.categoryMap ? entry.categories.map(c => source.categoryMap![c]).filter((c): c is Category => !!c) : []
  return [...new Set([...mapped, ...source.categoryHint])]
}

function newestFirst(a: AnnotatedEntry, b: AnnotatedEntry): number {
  return (b.entry.publishedAt ?? '9999').localeCompare(a.entry.publishedAt ?? '9999')
}

export function prefilter(entries: ParsedEntry[], ctx: PrefilterContext): PrefilterResult {
  const drops: PrefilterResult['drops'] = {}
  const hints: PrefilterResult['hints'] = {}
  const annotated: AnnotatedEntry[] = []
  const passed: { a: AnnotatedEntry; seenStoryId?: string; canonical: string }[] = []
  const dupes = new Set<string>()
  const nowMs = ctx.now.getTime()

  const drop = (a: AnnotatedEntry, reason: DropReason) => {
    a.drop = reason
    const d = (drops[a.entry.sourceId] ??= {})
    d[reason] = (d[reason] ?? 0) + 1
  }

  // Schritte 1–8 je Eintrag
  const bySource = new Map<string, typeof passed>()
  const githubCandidates = new Map<string, { a: AnnotatedEntry; v: Version; canonical: string }[]>()
  for (const entry of entries) {
    const source = SOURCE_BY_ID.get(entry.sourceId)
    if (!source) continue
    const canonical = canonicalUrl(entry.url)
    const a: AnnotatedEntry = { entry, key: entryKey(source, entry, canonical) }
    annotated.push(a)

    const maxAge = source.cadence === 'weekly' ? 8 * DAY : 72 * HOUR
    if (entry.publishedAt && nowMs - Date.parse(entry.publishedAt) > maxAge) { drop(a, 'age'); continue }
    // GitHub: Schlüssel ist @<x.y> – Vorabversionen und fremde Linien vor dem Dedupe aussortieren,
    // sonst verdrängt v2.48.1-rc.1 (oder langchain-text-splitters==1.7.0) das stabile Release derselben Minor-Version.
    if (source.kind === 'github') {
      if (isPrerelease(entry)) { drop(a, 'prerelease'); continue }
      if (source.filter?.tagRe && !source.filter.tagRe.test(entry.guid ?? '')) { drop(a, 'version'); continue }
    }
    const dupeKey = `${source.id}\u0000${a.key}`
    if (dupes.has(dupeKey)) { drop(a, 'dupe'); continue }
    dupes.add(dupeKey)
    const seen = ctx.seen[a.key]
    if (seen && !seen.storyId) { drop(a, 'seen'); continue }
    if (seen?.storyId) {
      push(bySource, source.id, { a, seenStoryId: seen.storyId, canonical })
      continue
    }
    if (isSponsor(entry)) { drop(a, 'sponsor'); continue }
    if (!passesKeywords(source, entry)) { drop(a, 'keyword'); continue }
    if (source.kind === 'github') {
      const v = parseVersion(entry.guid ?? '')
      const prev = ctx.prevReleases.get(source.id)
      if (!v || (prev && compareVersion(v, prev) <= 0)) { drop(a, 'version'); continue }
      const list = githubCandidates.get(source.id) ?? []
      list.push({ a, v, canonical })
      githubCandidates.set(source.id, list)
      continue
    }
    if (!passesRule(source, entry, ctx.now)) { drop(a, 'rule'); continue }
    push(bySource, source.id, { a, canonical })
  }

  // je Repo und Lauf nur die höchste Version
  for (const [sourceId, list] of githubCandidates) {
    list.sort((x, y) => compareVersion(y.v, x.v))
    const [best, ...rest] = list
    for (const r of rest) drop(r.a, 'version')
    if (best) push(bySource, sourceId, { a: best.a, canonical: best.canonical })
  }

  // Schritt 9: Flutbremse, dann RawItem bauen
  const items: RawItem[] = []
  for (const [sourceId, list] of bySource) {
    const source = SOURCE_BY_ID.get(sourceId)!
    const maxNew = source.filter?.maxNew ?? DEFAULT_MAX_NEW
    const fresh = list.filter(p => !p.seenStoryId).sort((x, y) => newestFirst(x.a, y.a))
    if (fresh.length > maxNew) {
      for (const p of fresh.slice(maxNew)) drop(p.a, 'flood')
      ;(hints[sourceId] ??= []).push('flood')
    }
    for (const p of list) {
      if (p.a.drop) continue
      const { title, paywall } = stripPaywall(source, p.a.entry.title)
      items.push({
        sourceId,
        key: p.a.key,
        url: p.a.entry.url,
        canonicalUrl: p.canonical,
        title,
        teaser: truncate(p.a.entry.description, 300),
        publishedAt: p.a.entry.publishedAt,
        firstSeen: ctx.firstSeen,
        lang: source.lang,
        paywall,
        categoryHint: categoryHint(source, p.a.entry),
        signals: p.a.entry.signals,
        seenStoryId: p.seenStoryId,
      })
    }
  }
  return { items, annotated, drops, hints }
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}
