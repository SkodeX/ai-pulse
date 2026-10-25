// Parser 'feed' (RSS/Atom/RDF) mit Adapter 'techmeme' (Skill quellen § 6, references/parser.md).

import { extractFromXml } from '@extractus/feed-extractor'
import type { ParsedEntry } from '../../types.ts'
import { decodeEntities, sha1 } from '../../lib/util.ts'
import type { ParseContext, ParseResult } from './common.ts'
import { cleanDescription, cleanTitle, detectShape, fail, ok, safePublished } from './common.ts'

interface Extra {
  categories: string[]
  author?: string
  rawDescription?: string
  publishedRaw?: string
}

function text(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    return text(o['#text'] ?? o['@_term'] ?? o['@_label'] ?? o['name'] ?? '')
  }
  return ''
}

function list(value: unknown): unknown[] {
  return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]
}

function extraFields(item: Record<string, unknown>): Extra {
  const categories = list(item['category']).map(c => decodeEntities(text(c)).trim()).filter(Boolean)
  const author = text(item['dc:creator']) || list(item['author']).map(text).filter(Boolean)[0] || undefined
  const publishedRaw = text(item['published']) || text(item['dc:date']) || undefined
  const rawDescription = typeof item['description'] === 'string' ? item['description'] : undefined
  return { categories, author, rawDescription, publishedRaw }
}

const TECHMEME_HOST_RE = /^https?:\/\/(www\.)?techmeme\.com/i

export function parseFeed(ctx: ParseContext): ParseResult {
  const { source, body, now } = ctx
  const shape = detectShape(body)
  if (shape !== 'feed') return fail('format', `Form ${shape} statt feed`)

  let feed
  try {
    feed = extractFromXml(body, {
      normalization: true,
      useISODateFormat: true,
      descriptionMaxLen: 0,
      getExtraEntryFields: entry => extraFields(entry) as unknown as Record<string, unknown>,
    })
  } catch (err) {
    const msg = (err as Error).message
    // Atom ohne <entry> meldet „Unrecognized feed format"
    if (/<feed[\s>]/.test(body.slice(0, 4096)) && !/<entry[\s>]/.test(body)) return fail('empty', 'Feed ohne Einträge')
    return fail('format', msg.slice(0, 120))
  }
  const raw = feed.entries ?? []
  if (raw.length === 0) return fail('empty', 'Feed ohne Einträge')

  const entries: ParsedEntry[] = []
  for (const e of raw) {
    const extra = e as unknown as Extra & { id?: string; link?: string; title?: string; description?: string; published?: string }
    let url = extra.link ?? ''
    let title = cleanTitle(extra.title ?? '', source)
    const signals: ParsedEntry['signals'] = {}

    if (source.adapter === 'techmeme') {
      const links = [...(extra.rawDescription ?? '').matchAll(/<A\s+HREF="([^"]+)"/gi)].map(m => decodeEntities(m[1]!))
      const original = links.find(l => /^https?:/i.test(l) && !TECHMEME_HOST_RE.test(l))
      if (url) signals.techmemeUrl = url
      if (original) url = original
      title = title.replace(/\s*\([^()]*\)\s*$/, '')
    }
    if (!url || !title) continue

    entries.push({
      sourceId: source.id,
      guid: extra.id ? String(extra.id) : undefined,
      url,
      title,
      description: cleanDescription(extra.description),
      categories: extra.categories ?? [],
      author: extra.author ? decodeEntities(extra.author) : undefined,
      publishedAt: safePublished(extra.publishedRaw || extra.published, now),
      signals: Object.keys(signals).length > 0 ? signals : undefined,
    })
  }
  if (entries.length === 0) return fail('empty', 'keine verwertbaren Einträge')

  // Datumslos: „neu" = GUID nicht in der gespeicherten Menge; Erstlauf = Baseline
  if (entries.every(e => !e.publishedAt)) {
    const ids = entries.map(e => sha1(e.guid ?? e.url).slice(0, 12))
    const snapshot = { guids: ids.slice(0, 2000), baselineAt: ctx.snapshot?.baselineAt ?? now.toISOString() }
    if (!ctx.snapshot?.guids) return ok([], snapshot, ['baseline'])
    const known = new Set(ctx.snapshot.guids)
    return ok(entries.filter((_, i) => !known.has(ids[i]!)), snapshot)
  }
  return ok(entries)
}
