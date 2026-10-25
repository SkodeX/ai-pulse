// Trockenlauf-Ausgabe (Skill quellen § 9): raw-items.json und report.md.

import { countsInDenominator } from '../config/sources.ts'
import type { AnnotatedEntry, DropReason, PrefilterResult } from '../filter/prefilter.ts'
import { DROP_REASONS } from '../filter/prefilter.ts'
import { truncate } from '../lib/util.ts'
import type { Cluster, ParsedEntry } from '../types.ts'
import type { SourceRun } from './collect.ts'
import type { Verdict } from './health.ts'

const VERDICT_ORDER: Verdict[] = ['blockiert', 'fehler', 'unerwartet', 'ok']
const MAX_RAW_PER_SOURCE = 30

export interface RunSummary {
  runId: string
  generatedAt: string
  seconds: number
  okCount: number
  denominator: number
  raw: number
  filtered: number
  clusters: number
  attached: number
  seenDropped: number
}

export function summarize(runs: SourceRun[], pf: PrefilterResult, clusters: Cluster[], extra: { runId: string; generatedAt: string; seconds: number; attached: number; seenDropped: number }): RunSummary {
  const counted = runs.filter(r => countsInDenominator(r.source))
  return {
    ...extra,
    okCount: counted.filter(r => r.verdict === 'ok').length,
    denominator: counted.length,
    raw: runs.reduce((n, r) => n + r.entries.length, 0),
    filtered: pf.items.length,
    clusters: clusters.filter(c => !c.existingStoryId).length,
  }
}

export function headline(s: RunSummary): string {
  return `Quellen ok ${s.okCount}/${s.denominator} · roh ${s.raw} → gefiltert ${s.filtered} → Cluster ${s.clusters} · Laufzeit ${s.seconds} s`
}

export function rawItemsJson(runs: SourceRun[], pf: PrefilterResult, runId: string, generatedAt: string) {
  const byEntry = new Map<ParsedEntry, AnnotatedEntry>(pf.annotated.map(a => [a.entry, a]))
  const sources: Record<string, { verdict: Verdict; parsed: number; entries: (ParsedEntry & { drop?: DropReason })[] }> = {}
  for (const r of runs) {
    if (!r.fetched && r.entries.length === 0 && !r.due) continue
    const entries = [...r.entries]
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, MAX_RAW_PER_SOURCE)
      .map(e => {
        const { signals, ...rest } = e
        const slim: ParsedEntry & { drop?: DropReason } = { ...rest, description: truncate(e.description, 200) }
        if (signals) slim.signals = { ...signals, releaseNotes: signals.releaseNotes ? truncate(signals.releaseNotes, 200) : undefined }
        const drop = byEntry.get(e)?.drop
        if (drop) slim.drop = drop
        return slim
      })
    sources[r.source.id] = { verdict: r.verdict, parsed: r.entries.length, entries }
  }
  return { runId, generatedAt, sources }
}

function esc(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function reportMd(runs: SourceRun[], pf: PrefilterResult, clusters: Cluster[], s: RunSummary): string {
  const filteredBySource = new Map<string, number>()
  for (const item of pf.items) filteredBySource.set(item.sourceId, (filteredBySource.get(item.sourceId) ?? 0) + 1)

  const row = (r: SourceRun) => {
    const drops = pf.drops[r.source.id] ?? {}
    const dropText = DROP_REASONS.filter(d => drops[d]).map(d => `${d} ${drops[d]}`).join(' · ') || '–'
    const notes: string[] = []
    if (!r.due) notes.push('nicht fällig')
    if (r.asFallbackFor.length > 0 && r.source.fallbackOnly) notes.push(`Fallback für ${r.asFallbackFor.join(', ')}`)
    const verdict = r.verdict + (notes.length > 0 ? ` (${notes.join(', ')})` : '')
    const hints = r.hints.length > 0 ? [...new Set(r.hints)].join(', ') : '–'
    return `| ${r.source.id} | ${verdict} | ${r.entries.length} | ${filteredBySource.get(r.source.id) ?? 0} | ${dropText} | ${esc(r.error ?? '–')} | ${hints} |`
  }
  const sorted = (list: SourceRun[]) => [...list].sort((a, b) => VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict) || a.source.id.localeCompare(b.source.id))
  const main = sorted(runs.filter(r => !r.source.fallbackOnly))
  const fallbacks = sorted(runs.filter(r => r.source.fallbackOnly && r.fetched))

  const lines = [
    headline(s),
    '',
    `angehängt ${s.attached} · seen verworfen ${s.seenDropped} · Lauf ${s.runId}`,
    '',
    '| Quelle | Urteil | roh | gefiltert | verworfen | Fehler | Hinweise |',
    '|---|---|---|---|---|---|---|',
    ...main.map(row),
  ]
  if (fallbacks.length > 0) lines.push('', '**Fallback-Abrufe**', '', '| Quelle | Urteil | roh | gefiltert | verworfen | Fehler | Hinweise |', '|---|---|---|---|---|---|---|', ...fallbacks.map(row))

  lines.push('', `## Cluster (${clusters.length})`, '')
  for (const c of clusters) {
    const when = (c.publishedAt ?? c.firstSeen).slice(0, 16).replace('T', ' ')
    const srcs = c.sources.map(x => x.id).join(', ')
    lines.push(`- ${when} · [${esc(c.primary.title)}](${c.primary.url}) — ${srcs}${c.items.length > 1 ? ` (${c.items.length} Items)` : ''}`)
  }
  return lines.join('\n') + '\n'
}
