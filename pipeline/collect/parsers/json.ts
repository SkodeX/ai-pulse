// Parser 'json' mit Adaptern hn, hfPapers, yc (Skill quellen references/parser.md).
// Gefilterte JSON-APIs dürfen 0 Treffer liefern – es zählt nur die erwartete Struktur.

import type { ParsedEntry } from '../../types.ts'
import type { ParseContext, ParseResult } from './common.ts'
import { cleanDescription, cleanTitle, fail, ok, safePublished } from './common.ts'

type Json = Record<string, unknown>

export function parseJson(ctx: ParseContext): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(ctx.body)
  } catch {
    return fail('format', 'kein JSON')
  }
  switch (ctx.source.adapter) {
    case 'hn': return parseHn(ctx, data)
    case 'hfPapers': return parseHfPapers(ctx, data)
    case 'yc': return parseYc(ctx, data)
    default: return fail('format', `kein JSON-Adapter für ${ctx.source.id}`)
  }
}

function parseHn(ctx: ParseContext, data: unknown): ParseResult {
  const hits = (data as Json)?.['hits']
  if (!Array.isArray(hits)) return fail('format', 'hits[] fehlt')
  const entries: ParsedEntry[] = []
  for (const h of hits as Json[]) {
    const id = String(h['objectID'] ?? '')
    const title = cleanTitle(String(h['title'] ?? ''), ctx.source)
    if (!id || !title) continue
    entries.push({
      sourceId: ctx.source.id,
      guid: id,
      url: typeof h['url'] === 'string' && h['url'] ? h['url'] : `https://news.ycombinator.com/item?id=${id}`,
      title,
      description: cleanDescription(typeof h['story_text'] === 'string' ? h['story_text'] : ''),
      categories: [],
      author: typeof h['author'] === 'string' ? h['author'] : undefined,
      publishedAt: typeof h['created_at_i'] === 'number' ? safePublished(h['created_at_i'] * 1000, ctx.now) : undefined,
      signals: { hnPoints: Number(h['points'] ?? 0), hnComments: Number(h['num_comments'] ?? 0) },
    })
  }
  return ok(entries)
}

function parseHfPapers(ctx: ParseContext, data: unknown): ParseResult {
  if (!Array.isArray(data)) return fail('format', 'Array erwartet')
  const entries: ParsedEntry[] = []
  for (const item of data as Json[]) {
    const paper = (item['paper'] ?? {}) as Json
    const id = String(paper['id'] ?? '')
    const title = cleanTitle(String(paper['title'] ?? item['title'] ?? ''), ctx.source)
    if (!id || !title) continue
    entries.push({
      sourceId: ctx.source.id,
      guid: id,
      url: `https://huggingface.co/papers/${id}`,
      title,
      description: cleanDescription(String(paper['ai_summary'] ?? paper['summary'] ?? '')),
      categories: [],
      publishedAt: safePublished(String(paper['submittedOnDailyAt'] ?? item['publishedAt'] ?? ''), ctx.now),
      signals: { upvotes: Number(paper['upvotes'] ?? 0) },
    })
  }
  return ok(entries)
}

function parseYc(ctx: ParseContext, data: unknown): ParseResult {
  const added = (data as Json)?.['added']
  if (!Array.isArray(added)) return fail('format', 'added[] fehlt')
  const generatedAt = safePublished(String((data as Json)['generated_at'] ?? ''), ctx.now)
  const entries: ParsedEntry[] = []
  for (const c of added as Json[]) {
    const name = String(c['name'] ?? '')
    const slug = String(c['slug'] ?? '')
    if (!name || !slug) continue
    const oneLiner = String(c['one_liner'] ?? '')
    entries.push({
      sourceId: ctx.source.id,
      guid: String(c['id'] ?? slug),
      url: typeof c['url'] === 'string' && c['url'] ? c['url'] : `https://www.ycombinator.com/companies/${slug}`,
      title: cleanTitle(oneLiner ? `${name}: ${oneLiner}` : name, ctx.source),
      description: cleanDescription(oneLiner || String(c['long_description'] ?? '')),
      categories: Array.isArray(c['tags']) ? (c['tags'] as unknown[]).map(String) : [],
      publishedAt: generatedAt,
      signals: { batch: String(c['batch'] ?? '') },
    })
  }
  return ok(entries)
}
