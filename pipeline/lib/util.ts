// Kleine Hilfen ohne Abhängigkeiten: Hashes, Text, Zeit, Dateien.

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export function sha1(text: string): string {
  return createHash('sha1').update(text).digest('hex')
}

export function sha256(data: string | Uint8Array): string {
  return 'sha256:' + createHash('sha256').update(data).digest('hex')
}

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// ---------- Text ----------

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '„', bdquo: '„', laquo: '«', raquo: '»', middot: '·',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è',
  copy: '©', reg: '®', trade: '™', euro: '€', bull: '•', zwj: '', zwnj: '', shy: '',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match
    }
    return NAMED_ENTITIES[code] ?? match
  })
}

// HTML → Klartext: CDATA, Skripte und Tags weg, Entities dekodiert, Leerraum zusammengefasst.
export function htmlToText(html: string): string {
  const withoutCdata = html.replace(/<!\[CDATA\[|\]\]>/g, '')
  const withoutBlocks = withoutCdata.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  const withoutTags = withoutBlocks.replace(/<[^>]*>/g, ' ')
  // zweimal dekodieren: manche Feeds escapen doppelt (&amp;#8217;)
  return collapse(decodeEntities(decodeEntities(withoutTags)).replace(/<[^>]*>/g, ' '))
}

export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}

// ---------- Zeit (Europe/Berlin) ----------

const berlinDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
const berlinWeekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' })

export function berlinDate(date: Date): string {
  return berlinDateFmt.format(date)   // JJJJ-MM-TT
}

// Beginn (00:00 Berliner Zeit) des letzten Sonntags ≤ date, als Datum JJJJ-MM-TT.
export function lastSundayBerlin(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const offset = days.indexOf(berlinWeekdayFmt.format(date))
  return berlinDate(new Date(date.getTime() - Math.max(offset, 0) * DAY))
}

export function toIso(value: string | number | Date | undefined | null): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

// ---------- Dateien ----------

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw err
  }
}

// Atomar schreiben: erst Temp-Datei, dann umbenennen.
export async function writeJson(path: string, data: unknown, indent = 1): Promise<void> {
  await writeText(path, JSON.stringify(data, null, indent) + '\n')
}

export async function writeText(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp-${process.pid}`
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, path)
}

export function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}
