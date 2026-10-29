// Einstieg des Jobs. Phase 1: nur --stage collect (Trockenlauf: sammeln, filtern, clustern, ohne Claude).

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { FristenFile, Latest, RunKind } from '../shared/types.ts'
import { buildFristen } from './law/build-fristen.ts'
import { CURATED_FRISTEN } from './law/fristen.ts'
import { markShadowSeen } from './cluster/cluster.ts'
import { headline, rawItemsJson, reportMd, summarize } from './collect/report.ts'
import { LIMITS } from './config/models.ts'
import { SOURCES, SOURCE_BY_ID } from './config/sources.ts'
import { briefingPool, runBrief } from './llm/brief.ts'
import { LlmRunner } from './llm/budget.ts'
import { runSummarize } from './llm/summarize.ts'
import { contextBlock, runTriage } from './llm/triage.ts'
import { HOUR, readJson, writeJson, writeText } from './lib/util.ts'
import { PUBLIC_DATA, buildIdFor, runKindFor, runPipeline } from './pipeline.ts'
import { preScore } from './score/prescore.ts'
import { buildStory, sortStories } from './score/stories.ts'
import { collectStage } from './stages.ts'
import { loadModelsState, runModels } from './models/detect.ts'
import type { StarHistory } from './toplists/toplists.ts'
import { buildTopLists } from './toplists/toplists.ts'
import { applyUseCases, runUseCases } from './llm/usecases.ts'
import type { UseCaseCache } from './llm/usecases.ts'
import { CACHE_DIR, SHADOW_DIR, STATE_DIR, loadState, prepareShadow, saveState } from './state.ts'
import type { Cluster } from './types.ts'

const STAGE_PHASE: Record<string, number> = { terms: 4, weekly: 5 }
const KINDS = ['morning', 'midday', 'evening'] as const

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
  if (values.kind && !(KINDS as readonly string[]).includes(values.kind)) exitLater(`unbekannter Lauf-Typ: ${values.kind}`)
  const kind = values.kind as RunKind | undefined
  const limit = values.limit ? Number(values.limit) : undefined
  if (limit !== undefined && !(limit > 0)) exitLater('--limit braucht eine positive Zahl')
  const stage = values.stage
  if (stage && STAGE_PHASE[stage]) exitLater(`--stage ${stage} kommt in Phase ${STAGE_PHASE[stage]}`)
  if (stage && !['collect', 'triage', 'summarize', 'brief', 'review', 'watchlist', 'toplists'].includes(stage)) exitLater(`unbekannte Stufe: ${stage}`)

  if (stage === 'collect' || (values['dry-run'] && !stage)) return collectDryRun({ only: values.only, fresh: values.fresh })
  if (stage === 'triage') return stageTriage(limit, kind)
  if (stage === 'summarize' || stage === 'brief') return stagePreview(stage, limit, kind)
  if (stage === 'review') return stageReview()
  if (stage === 'watchlist') return stageWatchlist()
  if (stage === 'toplists') return stageToplists()
  if (values.only) exitLater('--only gibt es nur mit --stage collect bzw. im Smoke-Test')

  const full = limit === undefined
  if (full && process.env['AIPULSE_FULL_RUN'] !== '1') exitLater('Voller Lauf schreibt public/data/ und state/ und läuft nur auf dem Server (AIPULSE_FULL_RUN=1). Lokal: npm run pipeline -- --limit 5')
  if (full && process.env['AIPULSE_SIMULATE_LIMIT']) exitLater('AIPULSE_SIMULATE_LIMIT ist im vollen Lauf verboten')
  await runPipeline({ full, limit, kind })
}

// --stage triage: jüngste candidates.json → Triage (≤ --limit) → .cache/run/<id>/triage.json
async function stageTriage(limit: number | undefined, kind: RunKind | undefined): Promise<void> {
  const now = new Date()
  const dirs = (await readdir(join(CACHE_DIR, 'dry'))).filter(d => /^\d{4}-/.test(d)).sort().reverse()
  let cand: { clusters: Cluster[] } | undefined
  for (const d of dirs) {
    cand = await readJson<{ clusters: Cluster[] } | undefined>(join(CACHE_DIR, 'dry', d, 'candidates.json'), undefined)
    if (cand && cand.clusters.length > 0) break
  }
  if (!cand) exitLater('keine candidates.json – erst npm run collect')
  const k = kind ?? runKindFor(now)
  const id = buildIdFor(now, k)
  const clusters = [...cand.clusters].sort((a, b) => (b.preScore ?? 0) - (a.preScore ?? 0)).slice(0, Math.min(limit ?? LIMITS.triageMax, LIMITS.triageMax))
  const runner = new LlmRunner({ runId: id, kind: k, full: false, usageDir: join(CACHE_DIR, 'usage'), start: now })
  const triage = await runTriage(runner, clusters, contextBlock(now, k, []), CACHE_DIR)
  const stories = clusters.map(c => buildStory(c, c.preScore ?? preScore(c, now), triage.get(c), now))
  await runner.finish()
  await writeJson(join(CACHE_DIR, 'run', id, 'triage.json'), { generatedAt: now.toISOString(), stories })
  console.log(`Triage ${id}: ${triage.size}/${clusters.length} bewertet · CLI ${runner.cliCalls} · Backend ${runner.level}`)
  for (const s of sortStories(stories).slice(0, 10)) console.log(`  ${s.score.toFixed(1)} (${s.impact}/${s.personal}) ${s.category.padEnd(11)} ${s.title.slice(0, 80)}`)
  for (const e of runner.errors) console.log(`  Fehler: ${e}`)
}

// --stage summarize|brief: Vorschau auf Basis der jüngsten latest.json (public/data, sonst .cache/run)
async function stagePreview(stage: 'summarize' | 'brief', limit: number | undefined, kind: RunKind | undefined): Promise<void> {
  const now = new Date()
  const latest = await newestLatest()
  if (!latest) exitLater('keine latest.json – erst npm run pipeline -- --limit 5')
  const k = kind ?? runKindFor(now)
  const id = buildIdFor(now, k)
  const runner = new LlmRunner({ runId: id, kind: k, full: false, usageDir: join(CACHE_DIR, 'usage'), start: now })
  if (stage === 'brief') {
    const b = await runBrief(runner, briefingPool(latest.stories, k, undefined), k, now, [], CACHE_DIR)
    await writeJson(join(CACHE_DIR, 'run', id, 'briefing.json'), b)
    console.log(`Briefing ${id} (${b.model}): ${b.title}\n  ${b.intro}`)
  } else {
    const todo = sortStories(latest.stories.filter(s => !s.summary)).slice(0, Math.min(limit ?? LIMITS.summarizeMax, LIMITS.summarizeMax))
    const map = await runSummarize(runner, todo.map(s => ({ story: s, text: s.originalTitle })), `Lauf: ${k}`, CACHE_DIR)
    await writeJson(join(CACHE_DIR, 'run', id, 'summaries.json'), Object.fromEntries(map))
    console.log(`Zusammenfassungen ${id}: ${map.size}/${todo.length}`)
  }
  await runner.finish()
  for (const e of runner.errors) console.log(`  Fehler: ${e}`)
}

async function newestLatest(): Promise<Latest | undefined> {
  const pub = await readJson<Latest | undefined>(join(PUBLIC_DATA, 'latest.json'), undefined)
  if (pub) return pub
  const runs = (await readdir(join(CACHE_DIR, 'run')).catch(() => [] as string[])).sort().reverse()
  for (const r of runs) {
    const l = await readJson<Latest | undefined>(join(CACHE_DIR, 'run', r, 'latest.json'), undefined)
    if (l) return l
  }
  return undefined
}

// --stage watchlist: Bestenlisten + Anbieter-Watchlist unabhängig vom Wochentag bauen → .cache/run/<id>/ (liest state/, schreibt ihn nicht)
async function stageWatchlist(): Promise<void> {
  const now = new Date()
  const id = buildIdFor(now, runKindFor(now))
  const r = await runModels(await loadModelsState(STATE_DIR), now, true)
  const dir = join(CACHE_DIR, 'run', id)
  if (r.modelsFile) await writeJson(join(dir, 'models.json'), r.modelsFile, 0)
  if (r.watchlist) await writeJson(join(dir, 'watchlist.json'), r.watchlist, 0)
  if (r.expirations) await writeJson(join(dir, 'expirations-openrouter.json'), r.expirations)
  const fristen = buildFristen(await readJson<FristenFile | undefined>(join(PUBLIC_DATA, 'fristen.json'), undefined), CURATED_FRISTEN, { models: r.expirations ? [r.expirations] : [] }, now)
  await writeJson(join(dir, 'fristen.json'), fristen, 0)
  console.log(`Fristen: ${fristen.items.length} Einträge (${fristen.items.filter(f => f.origin === 'automatisch').length} automatisch)`)
  console.log(`Modelle ${id}: ${r.modelsFile?.boards.length ?? 0} Bestenlisten · ${r.watchlist?.providers.length ?? 0} Anbieter · ${r.modelsFile?.fresh.length ?? 0} neue Modelle · ${r.expirations?.items.length ?? 0} Abschaltungen (Watchlist) · Ausgabe ${dir}`)
  for (const b of r.modelsFile?.boards ?? []) console.log(`  ${b.title}: ${b.rows.slice(0, 3).map(x => x.name).join(' · ')}`)
  for (const p of r.watchlist?.providers.slice(0, 15) ?? []) console.log(`  #${p.combinedRank} ${p.displayName} (Arena ${p.arenaRating ?? '–'}, AA ${p.aaIndex ?? '–'}) ${p.reason.join('+')}`)
  for (const e of r.errors) console.log(`  Fehler: ${e}`)
}

// --stage toplists: Top-50-Listen sofort bauen → .cache/run/<id>/toplists.json (liest state/, schreibt ihn nicht)
async function stageToplists(): Promise<void> {
  const now = new Date()
  const id = buildIdFor(now, runKindFor(now))
  const history = await readJson<StarHistory>(join(STATE_DIR, 'leaderboards', 'toplists-history.json'), { snapshots: [] })
  const r = await buildTopLists(history, now, process.env['AIPULSE_GITHUB_TOKEN'] || undefined)
  const dir = join(CACHE_DIR, 'run', id)
  // Use-Case-Texte: Cache aus state/ (nur lesen) + .cache/, fehlende mit Haiku (≤ 2 Aufrufe); Teillauf schreibt nur .cache/usecases.json
  const ucCache = join(CACHE_DIR, 'usecases.json')
  const cache: UseCaseCache = { ...await readJson<UseCaseCache>(join(STATE_DIR, 'leaderboards', 'usecases.json'), {}), ...await readJson<UseCaseCache>(ucCache, {}) }
  const { missing } = applyUseCases(r.file, cache)
  const runner = new LlmRunner({ runId: id, kind: runKindFor(now), full: false, usageDir: join(CACHE_DIR, 'usage'), start: now })
  const fresh = await runUseCases(runner, missing, CACHE_DIR)
  await runner.finish()
  if (Object.keys(fresh).length) await writeJson(ucCache, { ...cache, ...fresh }, 0)
  const file = applyUseCases(r.file, { ...cache, ...fresh }).file
  await writeJson(join(dir, 'toplists.json'), file, 0)
  console.log(`Use-Cases: ${Object.keys(fresh).length} neu von ${missing.length} fehlenden · CLI ${runner.cliCalls} · Backend ${runner.level}`)
  for (const e of runner.errors) console.log(`  Fehler: ${e}`)
  console.log(`Top-Listen ${id}: ${r.file.lists.map(l => `${l.title} ${l.items.length}`).join(' · ')} · Ausgabe ${dir}`)
  for (const l of file.lists) console.log(`  ${l.title}: ${l.items.slice(0, 3).map(i => `${i.name} – ${i.useCase ?? '?'}`).join(' · ')}`)
  for (const e of r.errors) console.log(`  Fehler: ${e}`)
}

// --stage review: Stichprobe für den Nutzer (kein Claude, schreibt nichts nach public/data/ oder state/)
async function stageReview(): Promise<void> {
  const latest = await newestLatest()
  if (!latest) exitLater('keine latest.json')
  const s = sortStories(latest.stories)
  const rule = s.filter(x => x.ratedBy === 'regel')
  const claude = s.filter(x => x.ratedBy !== 'regel')
  const mid = Math.floor(claude.length / 2)
  const pick = [...claude.slice(0, 5), ...claude.slice(Math.max(mid - 2, 5), mid + 3), ...claude.slice(-5), ...rule.slice(0, 5)]
  console.log('| # | Titel | Kategorie | Tragweite | Für mich | Hype | Quelle |\n|---|---|---|---|---|---|---|')
  pick.forEach((x, i) => console.log(`| ${i + 1} | ${x.title.replace(/\|/g, '/')} | ${x.category} | ${x.impact} | ${x.personal} | ${x.hype ? 'ja' : '–'} | ${x.sources[0]?.name ?? ''}${x.ratedBy === 'regel' ? ' (Regel)' : ''} |`))
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
  const sources = onlyIds ? onlyIds.map(id => SOURCE_BY_ID.get(id)!) : SOURCES.filter(s => !s.fallbackOnly && s.kind !== 'detector')

  await prepareShadow(opts.fresh)
  const state = await loadState(SHADOW_DIR)
  const { result, pf, clusters: raw, seenItems } = await collectStage(sources, state, now, !!onlyIds)
  // Stufe 0b: Vor-Score; Trockenlauf hat keine Abgleich-Basis → seen-Treffer mit Story fallen weg
  const clusters = raw.map(c => ({ ...c, preScore: preScore(c, now) })).sort((a, b) => b.preScore - a.preScore)
  const attached = 0
  const seenDropped = seenItems.length

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
