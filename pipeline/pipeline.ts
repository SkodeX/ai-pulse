// Lauf mit Bewertung (Phase 2): 0a → 0b → 1 → 1b → 2 → 3 → Ausgabe.
// Voller Lauf (nur Server) schreibt public/data/ + state/; --limit schreibt nach .cache/run/<runId>/.

import { join } from 'node:path'
import type { Briefing, BriefingIndexEntry, Frist, Meta, RunKind, Story } from '../shared/types.ts'
import { SOURCES } from './config/sources.ts'
import { LIMITS } from './config/models.ts'
import { fetchArticles } from './llm/article.ts'
import { briefingPool, runBrief } from './llm/brief.ts'
import { LlmRunner } from './llm/budget.ts'
import { runSummarize } from './llm/summarize.ts'
import type { SummaryInput } from './llm/summarize.ts'
import { contextBlock, runTriage } from './llm/triage.ts'
import { HOUR, readJson, writeJson } from './lib/util.ts'
import { buildHealth, sourceNotices } from './output/meta.ts'
import { loadBasis, writeOutput } from './output/write.ts'
import { preScore } from './score/prescore.ts'
import { applyBoost, applySummary, attachSources, buildStory, matchBasis, mergeByKey, sortStories } from './score/stories.ts'
import { collectStage } from './stages.ts'
import { CACHE_DIR, ROOT, STATE_DIR, loadState, saveState } from './state.ts'
import type { Cluster } from './types.ts'

export const PUBLIC_DATA = join(ROOT, 'public', 'data')

export function runKindFor(now: Date): RunKind {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(now))
  return hour < 11 ? 'morning' : hour < 17 ? 'midday' : 'evening'
}

export function buildIdFor(now: Date, kind: RunKind): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const g = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}-${g('hour')}${g('minute')}-${kind}`
}

export interface PipelineOptions { full: boolean; limit?: number; kind?: RunKind }

export async function runPipeline(opts: PipelineOptions): Promise<void> {
  const t0 = Date.now()
  const now = new Date()
  const kind = opts.kind ?? runKindFor(now)
  const buildId = buildIdFor(now, kind)
  const outRoot = opts.full ? PUBLIC_DATA : join(CACHE_DIR, 'run', buildId)
  const log: string[] = []
  const say = (m: string) => { log.push(m) }

  // 0a: sammeln (state/ nur lesen; schreiben nur im vollen Lauf am Ende)
  const state = await loadState(STATE_DIR)
  const col = await collectStage(SOURCES.filter(s => !s.fallbackOnly), state, now, false)

  // Abgleich mit bestehenden Stories
  const basis = await loadBasis(PUBLIC_DATA, now)
  const basisById = new Map(basis.map(s => [s.id, s]))
  const changed = new Map<string, Story>()
  for (const item of col.seenItems) {
    const s = changed.get(item.seenStoryId!) ?? basisById.get(item.seenStoryId!)
    if (s && !s.sources.some(x => x.id === item.sourceId)) changed.set(s.id, { ...s, sources: [...s.sources, { id: item.sourceId, name: SOURCES.find(x => x.id === item.sourceId)?.name ?? item.sourceId, url: item.canonicalUrl, lang: item.lang }] })
  }
  const { fresh, matched } = matchBasis(col.clusters, basis)
  for (const m of matched) changed.set(m.story.id, attachSources(changed.get(m.story.id) ?? m.story, m.cluster))

  // 0b: Vor-Score, Auswahl für Claude
  const pre = new Map<Cluster, number>(fresh.map(c => [c, preScore(c, now)]))
  const ranked = [...fresh].sort((a, b) => pre.get(b)! - pre.get(a)!)
  const forClaude = ranked.slice(0, Math.min(opts.limit ?? LIMITS.triageMax, LIMITS.triageMax))
  const runner = new LlmRunner({ runId: buildId, kind, full: opts.full, usageDir: opts.full ? join(STATE_DIR, 'usage') : join(CACHE_DIR, 'usage'), start: now })

  // 1: Triage
  const ctx = contextBlock(now, kind, sortStories(basis).map(s => ({ clusterKey: s.clusterKey, title: s.title })))
  const triage = await runTriage(runner, forClaude, ctx, CACHE_DIR)
  const irrelevant: Cluster[] = []
  let built: Story[] = []
  const clusterOf = new Map<string, Cluster>()
  for (const c of opts.limit ? forClaude : fresh) {
    const t = triage.get(c)
    if (t && !t.relevant) { irrelevant.push(c); continue }
    const s = buildStory(c, pre.get(c)!, t, now)
    if (s.ratedBy === 'regel') runner.ruleOnly++
    clusterOf.set(s.id, c)
    built.push(s)
  }

  // 1b: Zusammenführen per clusterKey (im Lauf und gegen die Basis)
  const basisByKey = new Map(basis.map(s => [s.clusterKey, s]))
  const merged = mergeByKey(built, basisByKey)
  for (const a of merged.attached) changed.set(a.id, a)
  built = merged.stories

  // 2: Zusammenfassen (Top 25 der von Claude bewerteten neuen Stories)
  const toSummarize = sortStories(built.filter(s => s.ratedBy !== 'regel' && !s.summary)).slice(0, LIMITS.summarizeMax)
  const articles = await fetchArticles(toSummarize.map(s => s.url), now)
  const inputs: SummaryInput[] = toSummarize.map(s => {
    const c = clusterOf.get(s.id)
    return { story: s, text: c?.signals.releaseNotes ?? articles.get(s.url) ?? c?.primary.teaser ?? '' }
  })
  const summaries = await runSummarize(runner, inputs, `Lauf: ${kind} · Datum: ${now.toISOString().slice(0, 10)}`, CACHE_DIR)
  built = built.map(s => {
    const sum = summaries.get(s.id)
    const withSum = sum ? applySummary(s, sum) : s
    const c = clusterOf.get(s.id)
    return c ? applyBoost(withSum, c) : withSum
  })

  // 3: Briefing
  const allStories = sortStories([...built, ...changed.values()])
  const latestPool = sortStories([...new Map([...basis, ...allStories].map(s => [s.id, s])).values()])
  const bIndex = await readJson<BriefingIndexEntry[]>(join(PUBLIC_DATA, 'briefing', 'index.json'), [])
  const lastMorning = bIndex.find(e => e.kind === 'morning')?.generatedAt
  const todayMorning = lastMorning && new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(lastMorning)) === new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now) ? lastMorning : undefined
  const since = kind === 'morning' ? (lastMorning ?? new Date(now.getTime() - 24 * HOUR).toISOString()) : todayMorning
  const pool = briefingPool(latestPool.filter(s => !since || s.firstSeen > since || kind === 'morning'), kind, since)
  const fristen = await readJson<Frist[]>(join(PUBLIC_DATA, 'fristen.json'), [])
  const briefing: Briefing = await runBrief(runner, pool, kind, now, fristen, CACHE_DIR)

  // 4: Ausgabe
  const usage = await runner.finish()
  const notices: Meta['notices'] = [...sourceNotices(col.result.state.health, now)]
  if (runner.level !== 'abo') notices.unshift({ kind: 'system', text: runner.level === 'api' ? 'Claude-Abo am Limit – Notfall-API genutzt.' : 'Kein Claude-Backend verfügbar – Regel-Scores, Bewertung wird nachgeholt.', since: now.toISOString() })
  if (runner.cliState === 'auth') notices.unshift({ kind: 'token', text: 'Claude-Login auf dem Server fehlgeschlagen – Abo-Token prüfen.', since: now.toISOString() })
  const budget: Meta['budget'] = { level: runner.level, apiUsdMonth: usage.apiUsdMonth, apiUsdCap: 3.36 }
  if (runner.level !== 'abo' && runner.resetHint) budget.resetHint = runner.resetHint
  const out = await writeOutput({ root: outRoot, basisRoot: PUBLIC_DATA, now, buildId, kind, stories: allStories, briefing, meta: { health: buildHealth(col.result.state.health, now), budget, notices: notices.slice(0, 20) }, log: say })

  // state/ nur im vollen Lauf, nach public/data/
  if (opts.full) {
    const seen = { ...state.seen }
    for (const s of built.filter(x => x.ratedBy !== 'regel')) for (const i of clusterOf.get(s.id)?.items ?? []) seen[i.key] ??= { firstSeen: i.firstSeen, storyId: s.id }
    for (const c of irrelevant) for (const i of c.items) seen[i.key] ??= { firstSeen: i.firstSeen }
    for (const m of matched) for (const i of m.cluster.items) seen[i.key] ??= { firstSeen: i.firstSeen, storyId: m.story.id }
    for (const i of col.seenItems) seen[i.key] ??= { firstSeen: i.firstSeen, storyId: i.seenStoryId! }
    await saveState(STATE_DIR, { ...col.result.state, seen }, now)
    await writeJson(join(STATE_DIR, 'runs.json'), { lastSuccessAt: now.toISOString(), lastKind: kind, lastRunId: buildId })
  }

  const secs = Math.round((Date.now() - t0) / 1000)
  console.log(`${opts.full ? 'Voller Lauf' : 'Testlauf'} ${buildId} · neu ${fresh.length} → Claude ${forClaude.length} · Stories ${built.length} (+${changed.size} ergänzt) · Zusammenfassungen ${summaries.size} · Briefing ${briefing.model} · CLI ${runner.cliCalls} · Backend ${runner.level} · ${secs} s`)
  console.log(`  latest.json ${out.latestCount} Stories, ${Math.round(out.latestBytes / 1024)} KB · Ausgabe ${outRoot}`)
  for (const e of runner.errors.slice(0, 10)) console.log(`  Fehler: ${e}`)
  for (const m of log.slice(0, 10)) console.log(`  ${m}`)
}
