// Parser 'htmldiff' (Modus sections): Seite an Datumsüberschriften teilen, je Abschnitt Hash.
// Eintrag = neuer Abschnitt oder geänderter neuester Abschnitt (Skill quellen references/parser.md).

import { parseHTML } from 'linkedom'
import type { ParsedEntry } from '../../types.ts'
import { collapse, sha1, truncate } from '../../lib/util.ts'
import type { ParseContext, ParseResult } from './common.ts'
import { detectShape, fail, ok, safePublished } from './common.ts'

const MAX_SECTIONS_STORED = 60
const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'TABLE', 'SECTION', 'ARTICLE', 'BR', 'PRE', 'BLOCKQUOTE', 'DT', 'DD'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'NAV', 'BUTTON'])

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

// „October 21, 2026" · „2026.10.13" · „2026-10-13" · „Oct 22" (+ Jahr aus Kontext) → JJJJ-MM-TT
export function parseLooseDate(text: string, yearHint?: number): string | undefined {
  const t = text.trim()
  let m = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(t)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/.exec(t)
  if (m) {
    const month = MONTHS[m[1]!.slice(0, 4).toLowerCase()] ?? MONTHS[m[1]!.slice(0, 3).toLowerCase()]
    const year = m[3] ? Number(m[3]) : yearHint
    if (month && year) return iso(year, month, Number(m[2]))
  }
  return undefined
}

function iso(y: number, mo: number, d: number): string | undefined {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Section { date: string; anchor?: string; lines: string[] }

interface DomNode { nodeType: number; nodeName: string; textContent: string | null; childNodes: ArrayLike<DomNode> }
interface DomElement extends DomNode { id?: string; matches(selector: string): boolean }

export function splitSections(html: string, cfg: NonNullable<ParseContext['source']['html']>): Section[] {
  const { document } = parseHTML(html)
  const root = (cfg.container ? document.querySelector(cfg.container) : document.body) as unknown as DomElement | null
  if (!root) return []
  const heading = cfg.heading ?? 'h2, h3'
  const sections = new Map<string, Section>()
  let current: Section | undefined
  let year: number | undefined
  let line = ''

  const flush = () => {
    const l = collapse(line)
    if (l && current) current.lines.push(l)
    line = ''
  }

  const visit = (node: DomNode) => {
    if (node.nodeType === 3) {
      line += node.textContent ?? ''
      return
    }
    if (node.nodeType !== 1) return
    const el = node as DomElement
    if (SKIP_TAGS.has(el.nodeName)) return
    const text = collapse(el.textContent ?? '')
    if (cfg.yearFrom && el.matches(cfg.yearFrom)) {
      const y = /\b(20\d{2})\b/.exec(text)?.[1]
      if (y) {
        flush()
        year = Number(y)
        return
      }
    }
    if (el.matches(heading) && (!cfg.dateRe || cfg.dateRe.test(text))) {
      const date = parseLooseDate(text, year)
      if (date) {
        flush()
        current = sections.get(date) ?? { date, anchor: el.id || undefined, lines: [] }
        sections.set(date, current)
        return
      }
    }
    const block = BLOCK_TAGS.has(el.nodeName)
    if (block) flush()
    for (const child of Array.from(el.childNodes)) visit(child)
    if (block) flush()
  }
  visit(root)
  flush()
  return [...sections.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// Titel = erste Zeile mit Satzcharakter (≥ 4 Wörter); Badges wie „Update", „gpt-6-luna" überspringen.
export function sectionTitle(s: Section): string | undefined {
  return s.lines.find(l => l.split(' ').length >= 4) ?? s.lines.find(l => l.length >= 3)
}

export function sectionHash(s: Section): string {
  return sha1(s.lines.join('\n')).slice(0, 12)
}

export function parseHtmlDiff(ctx: ParseContext): ParseResult {
  const { source, body, now } = ctx
  if (!source.html) return fail('format', 'html-Konfiguration fehlt')
  const shape = detectShape(body)
  if (shape !== 'html') return fail('format', `Form ${shape} statt html`)

  const sections = splitSections(body, source.html)
  if (sections.length === 0) return fail('empty', 'kein Datumsabschnitt gefunden')

  const hashes = Object.fromEntries(sections.slice(0, MAX_SECTIONS_STORED).map(s => [s.date, sectionHash(s)]))
  const snapshot = { sections: hashes, baselineAt: ctx.snapshot?.baselineAt ?? now.toISOString() }
  const old = ctx.snapshot?.sections
  if (!old) return ok([], snapshot, ['baseline'])

  const oldDates = Object.keys(old).sort()
  const oldest = oldDates[0] ?? ''
  const newestOld = oldDates[oldDates.length - 1] ?? ''
  const entries: ParsedEntry[] = []
  for (const s of sections) {
    const hash = hashes[s.date] ?? sectionHash(s)
    const isNew = !(s.date in old) && s.date >= oldest
    const newestChanged = s.date === sections[0]!.date && s.date === newestOld && old[s.date] !== hash
    if (!isNew && !newestChanged) continue
    const title = truncate(sectionTitle(s) ?? `${source.name} ${s.date}`, 160)
    const noon = Date.parse(`${s.date}T12:00:00Z`)
    entries.push({
      sourceId: source.id,
      guid: `${s.date}#${hash}`,
      url: s.anchor ? `${source.url.replace(/#.*$/, '')}#${s.anchor}` : source.url,
      title,
      description: truncate(s.lines.join(' · '), 1000),
      categories: [],
      publishedAt: safePublished(Math.min(noon, now.getTime()), now),
    })
  }
  return ok(entries, snapshot)
}
