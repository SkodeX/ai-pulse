// npm run check [-- <lauf-ordner>]: prüft den jüngsten Lauf (Skill lauf-pruefen), ohne Claude.
// Ohne Argument: jüngster Ordner in .cache/run/ mit latest.json, sonst public/data/. Schreibt check.md in den Lauf-Ordner.

import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Briefing, Latest, Meta } from '../shared/types.ts'
import { checkRun, renderReport } from './check/check.ts'
import type { UsageLike } from './check/check.ts'
import { readJson } from './lib/util.ts'
import { PUBLIC_DATA } from './pipeline.ts'
import { CACHE_DIR, STATE_DIR } from './state.ts'

const runs = (await readdir(join(CACHE_DIR, 'run')).catch(() => [] as string[])).filter(d => /^\d{4}-/.test(d)).sort()

async function newestRunDir(): Promise<string> {
  for (const r of [...runs].reverse()) if (await readJson(join(CACHE_DIR, 'run', r, 'latest.json'), undefined)) return join(CACHE_DIR, 'run', r)
  return PUBLIC_DATA
}

const dir = process.argv[2] ?? await newestRunDir()
const latest = await readJson<Latest | undefined>(join(dir, 'latest.json'), undefined)
if (!latest) {
  console.error(`keine latest.json in ${dir}`)
  process.exit(1)
}
const meta = await readJson<Meta | undefined>(join(dir, 'meta.json'), undefined)
const briefing = await readJson<Briefing | undefined>(join(dir, 'briefing', 'latest.json'), undefined)

// Kostenbuch: Teilläufe in .cache/usage, volle Läufe in state/usage. generatedAt ist der Laufbeginn →
// Einträge ab dort bis zum Beginn des nächsten Laufs (höchstens 40 min, Deadline 30 min + Reserve)
const month = latest.generatedAt.slice(0, 7)
const start = Date.parse(meta?.generatedAt ?? latest.generatedAt)
let end = start + 40 * 60_000
for (const r of runs) {
  const next = await readJson<Latest | undefined>(join(CACHE_DIR, 'run', r, 'latest.json'), undefined)
  const t = next ? Date.parse(next.generatedAt) : NaN
  if (t > start && t < end) end = t
}
const usage: UsageLike[] = []
for (const base of [join(CACHE_DIR, 'usage'), join(STATE_DIR, 'usage')]) {
  const raw = await readJson<{ entries?: UsageLike[] } | UsageLike[]>(join(base, `${month}.json`), [])
  const entries = Array.isArray(raw) ? raw : raw.entries ?? []
  for (const u of entries) {
    const t = Date.parse(u.ts)
    if (t >= start && t < end) usage.push(u)
  }
}

// Voriger Lauf zum Vergleich: der Lauf-Ordner direkt davor, sonst public/data/ mit anderer buildId
let previous: Latest | undefined
for (const r of [...runs].reverse()) {
  const p = await readJson<Latest | undefined>(join(CACHE_DIR, 'run', r, 'latest.json'), undefined)
  if (p && p.generatedAt < latest.generatedAt) { previous = p; break }
}
if (!previous) {
  const pub = await readJson<Latest | undefined>(join(PUBLIC_DATA, 'latest.json'), undefined)
  if (pub && pub.buildId !== latest.buildId && pub.generatedAt < latest.generatedAt) previous = pub
}

const result = checkRun({ latest, briefing, meta, usage, previous })
const report = renderReport(dir, result)
if (dir !== PUBLIC_DATA) await writeFile(join(dir, 'check.md'), report)
console.log(report)
