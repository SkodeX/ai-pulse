// Parser 'sitemap': Set-Diff der <loc> gegen den Schnappschuss (Skill quellen references/parser.md).

import { canonicalUrl } from '../../lib/url.ts'
import type { ParsedEntry } from '../../types.ts'
import { decodeEntities, sha1 } from '../../lib/util.ts'
import { ONE_REQUEST_HOSTS, hostOf } from '../http.ts'
import type { ParseContext, ParseResult } from './common.ts'
import { cleanTitle, detectShape, fail, ok, safePublished } from './common.ts'

const MAX_CHILD_SITEMAPS = 3
const MAX_TITLE_FETCHES = 3
const LOCALE_RE = /^(https?:\/\/[^/]+)\/(?:zh|ja|ko|de|fr|es|it|pt|ru|ar|hi|id|tr|vi|zh-cn|zh-tw|zh-hans|zh-hant|pt-br|es-419|en-us|en-gb)(?=\/)/i

interface Loc { loc: string; lastmod?: string }

export function readLocs(xml: string): Loc[] {
  const out: Loc[] = []
  for (const block of xml.match(/<(?:url|sitemap)>[\s\S]*?<\/(?:url|sitemap)>/g) ?? []) {
    const loc = /<loc>\s*([\s\S]*?)\s*<\/loc>/.exec(block)?.[1]
    if (!loc) continue
    const lastmod = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/.exec(block)?.[1]
    out.push({ loc: decodeEntities(loc.replace(/<!\[CDATA\[|\]\]>/g, '').trim()), lastmod })
  }
  return out
}

// Diff-Schlüssel: kanonische URL ohne Locale-Präfix, als sha1-Kürzel
export function locKey(loc: string): string {
  return sha1(canonicalUrl(loc).replace(LOCALE_RE, '$1')).slice(0, 12)
}

export function titleFromSlug(loc: string): string {
  const path = new URL(loc).pathname.replace(/\/+$/, '')
  const slug = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1))
  const words = slug.replace(/[-_]+/g, ' ').trim()
  return words ? words[0]!.toUpperCase() + words.slice(1) : loc
}

function pageTitle(html: string): string | undefined {
  const og = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1]
    ?? /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html)?.[1]
  const title = og ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
  return title?.trim() || undefined
}

function dateFromUrl(loc: string, re: RegExp | undefined): string | undefined {
  const m = re?.exec(loc)?.[1]
  if (!m || m.length !== 6) return undefined
  return `20${m.slice(0, 2)}-${m.slice(2, 4)}-${m.slice(4, 6)}T12:00:00Z`
}

export async function parseSitemap(ctx: ParseContext): Promise<ParseResult> {
  const { source, body, now } = ctx
  const shape = detectShape(body)
  if (shape !== 'sitemap') return fail('format', `Form ${shape} statt sitemap`)

  let locs: Loc[]
  if (/<sitemapindex/.test(body.slice(0, 4096))) {
    const children = readLocs(body).filter(c => !source.filter?.pathRe || source.filter.pathRe.test(c.loc) || /news|blog|post/i.test(c.loc)).slice(0, MAX_CHILD_SITEMAPS)
    locs = []
    for (const child of children) {
      const res = await ctx.fetchExtra?.(child.loc, 'sitemap')
      if (!res?.ok || !res.body) return fail('empty', `Kind-Sitemap nicht lesbar: ${child.loc}`)
      locs.push(...readLocs(res.body))
    }
  } else {
    locs = readLocs(body)
  }
  if (locs.length === 0) return fail('empty', 'Sitemap ohne <loc>')

  const relevant = locs.filter(l => !source.filter?.pathRe || source.filter.pathRe.test(l.loc))
  const keys = relevant.map(l => locKey(l.loc))
  const old = ctx.snapshot?.locs
  if (old && keys.length < old.length * 0.5) return fail('empty', `nur ${keys.length} von ${old.length} gespeicherten <loc>`)

  const snapshot = { locs: [...new Set(keys)], baselineAt: ctx.snapshot?.baselineAt ?? now.toISOString() }
  if (!old) return ok([], snapshot, ['baseline'])

  const known = new Set(old)
  const fresh = relevant.filter((_, i) => !known.has(keys[i]!))
  const entries: ParsedEntry[] = []
  let titleFetches = 0
  const mayFetchTitles = !ONE_REQUEST_HOSTS.has(hostOf(source.url))
  for (const l of fresh) {
    let title: string | undefined
    if (mayFetchTitles && titleFetches < MAX_TITLE_FETCHES && ctx.fetchExtra) {
      titleFetches++
      const res = await ctx.fetchExtra(l.loc, 'page')
      if (res?.ok && res.body) title = pageTitle(res.body)
    }
    const publishedAt = dateFromUrl(l.loc, source.sitemap?.urlDateRe) ?? (source.sitemap?.lastmod ? l.lastmod : undefined)
    entries.push({
      sourceId: source.id,
      guid: l.loc,
      url: l.loc,
      title: cleanTitle(title ?? titleFromSlug(l.loc), source),
      description: '',
      categories: [],
      publishedAt: safePublished(publishedAt, now),
    })
  }
  return ok(entries, snapshot)
}
