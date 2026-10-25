// Gemeinsame Typen und Helfer der Parser.

import type { Source } from '../../config/sources.ts'
import type { ParsedEntry } from '../../types.ts'
import { HOUR, collapse, htmlToText, truncate } from '../../lib/util.ts'
import type { FetchResult } from '../http.ts'

export interface SourceSnapshot {
  locs?: string[]                                     // sha1-Kürzel (12) der kanonischen <loc>
  sections?: Record<string, string>                   // Datum → Hash des Abschnitts
  release?: { major: number; minor: number; tag: string }
  guids?: string[]                                    // sha1-Kürzel datumsloser Feeds
  baselineAt: string
}

export interface ParseContext {
  source: Source
  body: string
  url: string                                         // aufgelöste Abruf-URL
  now: Date
  snapshot?: SourceSnapshot
  // Zweitabrufe (Kind-Sitemaps, Seitentitel) über die Abruf-Schicht; undefined im Smoke-Test/Test
  fetchExtra?: (url: string, kind: 'sitemap' | 'page') => Promise<FetchResult | undefined>
}

export interface ParseResult {
  entries: ParsedEntry[]
  snapshot?: SourceSnapshot                           // neuer Schnappschuss (nur bei Erfolg speichern)
  hints: string[]
  error?: 'format' | 'empty'
  errorDetail?: string
}

export type Shape = 'feed' | 'sitemap' | 'json' | 'html' | 'parquet' | 'other'

// Typ am Body erkennen, nie am Content-Type (nach BOM, <?xml, Kommentaren; erste 2 KB).
export function detectShape(body: string): Shape {
  if (body.startsWith('PAR1')) return 'parquet'
  const head = body.slice(0, 2048).replace(/^﻿/, '').replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<\?xml-stylesheet[^>]*\?>/g, '').trimStart()
  if (/^<!doctype html|^<html/i.test(head)) return 'html'
  if (/<(rss|feed|rdf:RDF)[\s>]/.test(head)) return 'feed'
  if (/<urlset|<sitemapindex/.test(head)) return 'sitemap'
  const first = head[0]
  if (first === '{' || first === '[') {
    try {
      JSON.parse(body)
      return 'json'
    } catch {
      return 'other'
    }
  }
  return 'other'
}

export function cleanTitle(raw: string, source: Source): string {
  let title = htmlToText(raw)
  if (source.titleStrip) title = title.replace(source.titleStrip, '')
  return collapse(title)
}

export function cleanDescription(raw: string | undefined): string {
  return raw ? truncate(htmlToText(raw), 1000) : ''
}

// publishedAt: ISO; fehlt, wenn ungültig oder vordatiert (> jetzt + 24 h).
export function safePublished(value: string | number | undefined, now: Date): string | undefined {
  if (value === undefined || value === '') return undefined
  const d = new Date(value)
  const t = d.getTime()
  if (Number.isNaN(t) || t > now.getTime() + 24 * HOUR) return undefined
  return d.toISOString()
}

export function ok(entries: ParsedEntry[], snapshot?: SourceSnapshot, hints: string[] = []): ParseResult {
  return { entries, snapshot, hints }
}

export function fail(error: 'format' | 'empty', errorDetail: string): ParseResult {
  return { entries: [], hints: [], error, errorDetail }
}
