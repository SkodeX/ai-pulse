// Einstieg des Jobs. Phase 1: nur --stage collect (Trockenlauf: sammeln, filtern, clustern, ohne Claude).

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { clusterItems, markShadowSeen } from './cluster/cluster.ts'
import { collect } from './collect/collect.ts'
import { markStale } from './collect/health.ts'
import { headline, rawItemsJson, reportMd, summarize } from './collect/report.ts'
import { SOURCES, SOURCE_BY_ID } from './config/sources.ts'
import type { Version } from './filter/releases.ts'
import { prefilter } from './filter/prefilter.ts'
import { HOUR, writeJson, writeText } from './lib/util.ts'
import { CACHE_DIR, SHADOW_DIR, loadState, prepareShadow, saveState } from './state.ts'

const STAGE_PHASE: Record<string, number> = { triage: 2, summarize: 2, brief: 2, review: 2, terms: 4, watchlist: 4, weekly: 5 }

function exitLater(message: string): never {
  console.error(message)
  process.exit(2)
}

export function makeRunId(now: Date): string {
  return now.toISOString().slice(0, 19).replace(/:/g, '-') + 'Z'
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      stage: { type: 'string' },
      only: { type: 'string' },
      limit: { type: 'string' },
      kind: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      fresh: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.kind === 'weekly') exitLater('--kind weekly kommt in Phase 5')
  if (values.stage && values.stage !== 'collect') {
    const phase = STAGE_PHASE[values.stage]
    exitLater(phase ? `--stage ${values.stage} kommt in Phase ${phase}` : `unbekannte Stufe: ${values.stage}`)
  }
  if (!values.stage && !values['dry-run']) exitLater('Voller Lauf (Bewertung, Ausgabe nach public/data/) kommt in Phase 2; jetzt: npm run collect')
  if (values.limit) exitLater('--limit betrifft die Claude-Stufen und kommt in Phase 2')
  if (process.env['AIPULSE_SIMULATE_LIMIT'] && !values.stage && !values['dry-run']) exitLater('AIPULSE_SIMULATE_LIMIT ist im vollen Lauf verboten')

  await collectDryRun({ only: values.only, fresh: values.fresh })
}

export async function collectDryRun(opts: { only?: string; fresh: boolean }): Promise<void> {
  const t0 = Date.now()
  const now = new Date()
  const runId = makeRunId(now)
  const onlyIds = opts.only ? opts.only.split(',').map(s => s.trim()).filter(Boolean) : undefined
  const unknown = onlyIds?.filter(id => !SOURCE_BY_ID.has(id)) ?? []
  if (unknown.length > 0) {
    console.error(`unbekannte Quellen-ID: ${unknown.join(', ')}`)
    process.exit(1)
  }
  const sources = onlyIds ? onlyIds.map(id => SOURCE_BY_ID.get(id)!) : SOURCES.filter(s => !s.fallbackOnly)

  await prepareShadow(opts.fresh)
  const state = await loadState(SHADOW_DIR)
  const prevReleases = new Map<string, Version | undefined>(Object.entries(state.sourceState).map(([id, s]) => [id, s.release]))

  const result = await collect({ sources, state, now, force: !!onlyIds, githubToken: process.env['AIPULSE_GITHUB_TOKEN'] || undefined })
  const entries = result.runs.flatMap(r => r.entries)
  const pf = prefilter(entries, { now, firstSeen: now.toISOString(), seen: state.seen, prevReleases })

  // Health ergänzen: Flutbremse, neue Items, Frische
  const newBySource = new Map<string, number>()
  for (const item of pf.items) if (!item.seenStoryId) newBySource.set(item.sourceId, (newBySource.get(item.sourceId) ?? 0) + 1)
  for (const run of result.runs) {
    const h = result.state.health.sources[run.source.id]
    if (!h) continue
    if (run.fetched) {
      const flood = pf.hints[run.source.id]?.includes('flood') ?? false
      if (flood && !h.hints.includes('flood')) h.hints.push('flood')
      if (flood && !run.hints.includes('flood')) run.hints.push('flood')
      h.floodRuns = flood ? (h.floodRuns ?? 0) + 1 : 0
      if ((newBySource.get(run.source.id) ?? 0) > 0) h.lastNewItemAt = now.toISOString()
    }
    markStale(run.source, h, now)
  }

  const { clusters, attached, seenDropped } = clusterItems(pf.items, now)

  const seen = markShadowSeen(state.seen, clusters)

  const seconds = Math.round((Date.now() - t0) / 100) / 10
  const generatedAt = new Date().toISOString()
  const summary = summarize(result.runs, pf, clusters, { runId, generatedAt, seconds, attached, seenDropped })
  const outDir = join(CACHE_DIR, 'dry', runId)
  await writeJson(join(outDir, 'raw-items.json'), rawItemsJson(result.runs, pf, runId, generatedAt))
  await writeJson(join(outDir, 'candidates.json'), { runId, generatedAt, window: { from: new Date(now.getTime() - 72 * HOUR).toISOString(), to: now.toISOString() }, clusters })
  await writeJson(join(outDir, 'health.json'), result.state.health)
  await writeText(join(outDir, 'report.md'), reportMd(result.runs, pf, clusters, summary))

  // --only ist ein Test: Schatten-State bleibt unberührt (sonst fehlen Items im nächsten Lauf)
  if (!onlyIds) await saveState(SHADOW_DIR, { ...result.state, seen }, now)

  console.log(headline(summary))
  for (const r of result.runs) {
    if (r.fetched && r.verdict !== 'ok') console.log(`  ${r.verdict.padEnd(10)} ${r.source.id}: ${r.error ?? ''}`)
  }
  console.log(`  Bericht: ${join(outDir, 'report.md')}`)
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
