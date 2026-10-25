// Parser 'github': Releases per REST (mit AIPULSE_GITHUB_TOKEN) oder Atom (ohne Token).
// Prerelease-, Linien- und Minor-Sprung-Filter macht der Vorfilter (pipeline/filter/releases.ts).

import { extractFromXml } from '@extractus/feed-extractor'
import type { ParsedEntry } from '../../types.ts'
import { htmlToText, truncate } from '../../lib/util.ts'
import { highestStable } from '../../filter/releases.ts'
import type { ParseContext, ParseResult, SourceSnapshot } from './common.ts'
import { cleanDescription, detectShape, fail, ok, safePublished } from './common.ts'

const NOTES_MAX = 2500

export function githubUrls(repo: string, perPage: number): { rest: string; atom: string } {
  return {
    rest: `https://api.github.com/repos/${repo}/releases?per_page=${perPage}`,
    atom: `https://github.com/${repo}/releases.atom`,
  }
}

export function parseGithub(ctx: ParseContext): ParseResult {
  const { source, body, now } = ctx
  if (!source.github) return fail('format', 'github-Konfiguration fehlt')
  const repoName = source.github.repo.split('/')[1]!
  const shape = detectShape(body)
  let entries: ParsedEntry[]

  if (shape === 'json') {
    const data = JSON.parse(body) as unknown
    if (!Array.isArray(data)) return fail('format', 'Release-Array erwartet')
    entries = (data as Record<string, unknown>[])
      .filter(r => !r['draft'] && typeof r['tag_name'] === 'string')
      .map(r => {
        const tag = String(r['tag_name'])
        const notes = typeof r['body'] === 'string' ? r['body'] : ''
        return {
          sourceId: source.id,
          guid: tag,
          url: String(r['html_url'] ?? `https://github.com/${source.github!.repo}/releases/tag/${encodeURIComponent(tag)}`),
          title: `${repoName} ${tag}`,
          description: cleanDescription(notes),
          categories: [],
          publishedAt: safePublished(String(r['published_at'] ?? r['created_at'] ?? ''), now),
          signals: { releaseNotes: truncate(notes, NOTES_MAX), prerelease: Boolean(r['prerelease']) },
        }
      })
  } else if (shape === 'feed') {
    let feed
    try {
      feed = extractFromXml(body, {
        normalization: true,
        useISODateFormat: true,
        descriptionMaxLen: 0,
        getExtraEntryFields: item => {
          const content = item['content'] as unknown
          const html = typeof content === 'string' ? content : (content as Record<string, unknown> | undefined)?.['#text']
          return { contentHtml: typeof html === 'string' ? html : '' }
        },
      })
    } catch (err) {
      if (!/<entry[\s>]/.test(body)) return ok([], baselineSnapshot(ctx, []), ctx.snapshot ? [] : ['baseline'])
      return fail('format', (err as Error).message.slice(0, 120))
    }
    entries = (feed.entries ?? []).map(e => {
      const tag = /Repository\/\d+\/(.+)$/.exec(String(e.id))?.[1] ?? String(e.title ?? '')
      const notes = htmlToText(String((e as Record<string, unknown>)['contentHtml'] ?? ''))
      return {
        sourceId: source.id,
        guid: tag,
        url: e.link ?? `https://github.com/${source.github!.repo}/releases/tag/${encodeURIComponent(tag)}`,
        title: `${repoName} ${tag}`,
        description: truncate(notes, 1000),
        categories: [],
        publishedAt: safePublished(e.published, now),
        signals: { releaseNotes: truncate(notes, NOTES_MAX) },
      }
    })
  } else {
    return fail('format', `Form ${shape} statt json/feed`)
  }

  const snapshot = baselineSnapshot(ctx, entries)
  if (!ctx.snapshot) return ok([], snapshot, ['baseline'])
  return ok(entries, snapshot)
}

// Schnappschuss = höchste stabile Version der Linie (nie rückwärts).
function baselineSnapshot(ctx: ParseContext, entries: ParsedEntry[]): SourceSnapshot {
  const prev = ctx.snapshot?.release
  const best = highestStable(entries, ctx.source.filter?.tagRe)
  const release = best && (!prev || best.major > prev.major || (best.major === prev.major && best.minor > prev.minor)) ? best : prev
  return { release, baselineAt: ctx.snapshot?.baselineAt ?? ctx.now.toISOString() }
}
