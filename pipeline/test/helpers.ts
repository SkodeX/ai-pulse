// Test-Helfer: Fixtures laden, Einträge bauen. Tests laufen ohne Netz und ohne Claude.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Source } from '../config/sources.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import type { ParseContext } from '../collect/parsers/common.ts'
import type { ParsedEntry, RawItem } from '../types.ts'

export const NOW = new Date('2026-10-25T09:00:00Z')

export function fixture(name: string): string {
  return readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')
}

export function source(id: string): Source {
  const s = SOURCE_BY_ID.get(id)
  if (!s) throw new Error(`Quelle ${id} fehlt im Register`)
  return s
}

export function ctx(id: string, body: string, extra: Partial<ParseContext> = {}): ParseContext {
  const s = source(id)
  return { source: s, body, url: s.url, now: NOW, ...extra }
}

export function entry(sourceId: string, over: Partial<ParsedEntry> = {}): ParsedEntry {
  return {
    sourceId,
    url: `https://example.com/${Math.random().toString(36).slice(2)}`,
    title: 'OpenAI veröffentlicht neues Sprachmodell',
    description: '',
    categories: [],
    publishedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    ...over,
  }
}

export function item(sourceId: string, over: Partial<RawItem> = {}): RawItem {
  const url = over.url ?? `https://example.com/${Math.random().toString(36).slice(2)}`
  return {
    sourceId,
    key: Math.random().toString(16).slice(2, 14),
    url,
    canonicalUrl: over.canonicalUrl ?? url,
    title: 'Titel',
    teaser: '',
    publishedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    firstSeen: NOW.toISOString(),
    lang: 'en',
    paywall: false,
    categoryHint: ['neuigkeiten'],
    ...over,
  }
}
