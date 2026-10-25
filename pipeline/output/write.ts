// Ausgabe des Datenvertrags (Skill bewertung, references/ausgabe.md): archive → index → briefing → latest → meta.
// Jede Datei gegen zod geprüft und atomar geschrieben; ungültige Stories werden weggelassen.

import { mkdir, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { z } from 'zod'
import type { ArchiveDay, Briefing, BriefingIndexEntry, IndexEntry, Latest, Meta, RunKind, Story } from '../../shared/types.ts'
import { HOUR, readJson } from '../lib/util.ts'
import { ArchiveDaySchema, BriefingIndexSchema, BriefingSchema, IndexEntrySchema, LatestSchema, MetaSchema, StorySchema } from './schemas.ts'

const LATEST_MAX_BYTES = 150 * 1024
const INDEX_MAX_BYTES = 300 * 1024

export const CREDITS: Meta['credits'] = [
  { name: 'Artificial Analysis (über OpenRouter)', url: 'https://artificialanalysis.ai/' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/' },
  { name: 'Hacker News (Algolia)', url: 'https://hn.algolia.com/' },
  { name: 'Hugging Face Daily Papers', url: 'https://huggingface.co/papers' },
]

export async function writeJsonAtomic<T>(file: string, data: unknown, schema: z.ZodType<T>): Promise<void> {
  const parsed = schema.parse(data)
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp-${process.pid}`
  await writeFile(tmp, JSON.stringify(parsed) + '\n', 'utf8')
  await rename(tmp, file)
}

export function berlinDate(iso: string | Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(iso))
}

export function validStories(stories: Story[], log: (m: string) => void): Story[] {
  return stories.filter(s => {
    const r = StorySchema.safeParse(s)
    if (!r.success) log(`Story ${s.id} ungültig: ${r.error.issues[0]?.path.join('.')} ${r.error.issues[0]?.message}`)
    return r.success
  })
}

export async function readLatest(root: string): Promise<Latest | undefined> {
  return readJson<Latest | undefined>(join(root, 'latest.json'), undefined)
}

// Abgleich-Basis = latest.json ∪ Tagesarchive der letzten 72 h (gleiche id → Fassung aus latest.json)
export async function loadBasis(root: string, now: Date): Promise<Story[]> {
  const byId = new Map<string, Story>()
  for (let d = 0; d <= 3; d++) {
    const day = berlinDate(new Date(now.getTime() - d * 24 * HOUR))
    const a = await readJson<ArchiveDay | undefined>(join(root, 'archive', day.slice(0, 4), day.slice(5, 7), `${day.slice(8)}.json`), undefined)
    for (const s of a?.stories ?? []) byId.set(s.id, s)
  }
  for (const s of (await readLatest(root))?.stories ?? []) byId.set(s.id, s)
  const limit = now.getTime() - 72 * HOUR
  return [...byId.values()].filter(s => Date.parse(s.firstSeen) >= limit)
}

export interface OutputInput {
  root: string               // public/data oder .cache/run/<runId>
  basisRoot: string          // woher alte Dateien gelesen werden (public/data)
  now: Date
  buildId: string
  kind: RunKind
  stories: Story[]           // alle Stories dieses Laufs (neu + geänderte bestehende)
  briefing: Briefing
  meta: Omit<Meta, 'generatedAt' | 'buildId' | 'run' | 'firstMonth' | 'credits'>
  log: (m: string) => void
}

const sortFn = (a: Story, b: Story) => b.score - a.score || b.impact - a.impact || b.firstSeen.localeCompare(a.firstSeen)

export async function writeOutput(o: OutputInput): Promise<{ latestCount: number; latestBytes: number; dropped: number }> {
  const generatedAt = o.now.toISOString()
  const stories = validStories(o.stories, o.log)
  const today = berlinDate(o.now)
  const yesterday = berlinDate(new Date(o.now.getTime() - 24 * HOUR))

  // 1. Archiv: heute + offener Vortag
  for (const day of [yesterday, today]) {
    const file = join(o.root, 'archive', day.slice(0, 4), day.slice(5, 7), `${day.slice(8)}.json`)
    const old = await readJson<ArchiveDay | undefined>(join(o.basisRoot, 'archive', day.slice(0, 4), day.slice(5, 7), `${day.slice(8)}.json`), undefined)
    if (old?.frozen) continue
    const byId = new Map((old?.stories ?? []).map(s => [s.id, s]))
    for (const s of stories) if (berlinDate(s.firstSeen) === day) byId.set(s.id, s)
    if (byId.size === 0 && !old) continue
    const archive: ArchiveDay = { date: day, generatedAt, buildId: o.buildId, frozen: day !== today, stories: [...byId.values()].sort(sortFn) }
    await writeJsonAtomic(file, archive, ArchiveDaySchema)

    // 2. Monatsindex
    const month = day.slice(0, 7)
    const indexFile = join(o.root, 'index', `${month}.json`)
    const oldIndex = await readJson<IndexEntry[]>(join(o.basisRoot, 'index', `${month}.json`), [])
    const kept = oldIndex.filter(e => e.date !== day)
    const fresh: IndexEntry[] = archive.stories.map(s => ({ id: s.id, date: day, title: s.title, category: s.category, impact: s.impact, personal: s.personal, tags: s.tags, url: s.url, src: s.sources[0]!.id }))
    let index = [...kept, ...fresh].sort((a, b) => b.date.localeCompare(a.date) || (b.impact + b.personal) - (a.impact + a.personal))
    if (Buffer.byteLength(JSON.stringify(index)) > INDEX_MAX_BYTES) index = index.map(e => ({ ...e, tags: e.tags.slice(0, 3) }))
    if (Buffer.byteLength(JSON.stringify(index)) > INDEX_MAX_BYTES) { index = index.filter(e => (e.impact + e.personal) / 2 >= 4); o.log(`Index ${month} über 300 KB`) }
    await writeJsonAtomic(indexFile, index, IndexEntrySchema.array())
  }

  // 3. Briefing
  const bFile = `${today.slice(0, 4)}/${today}-${o.briefing.kind}.json`
  await writeJsonAtomic(join(o.root, 'briefing', bFile), o.briefing, BriefingSchema)
  const bIndex = await readJson<BriefingIndexEntry[]>(join(o.basisRoot, 'briefing', 'index.json'), [])
  const entry: BriefingIndexEntry = { file: bFile, kind: o.briefing.kind, generatedAt, title: o.briefing.title }
  await writeJsonAtomic(join(o.root, 'briefing', 'index.json'), [entry, ...bIndex.filter(e => e.file !== bFile)], BriefingIndexSchema)
  await writeJsonAtomic(join(o.root, 'briefing', 'latest.json'), o.briefing, BriefingSchema)

  // 4. latest.json: alte ∪ neue, 72 h, ≤ 150 KB (Briefing-Stories geschützt)
  const old = (await readLatest(o.basisRoot))?.stories ?? []
  const byId = new Map(old.map(s => [s.id, s]))
  for (const s of stories) byId.set(s.id, s)
  const limit = o.now.getTime() - 72 * HOUR
  let list = [...byId.values()].filter(s => Date.parse(s.firstSeen) >= limit).sort(sortFn)
  const protectedIds = new Set(o.briefing.items.map(i => i.storyId))
  let dropped = 0
  const latest = (): Latest => ({ generatedAt, buildId: o.buildId, run: o.kind, stories: list })
  while (Buffer.byteLength(JSON.stringify(latest())) > LATEST_MAX_BYTES) {
    const idx = list.map(s => !protectedIds.has(s.id)).lastIndexOf(true)
    if (idx < 0) break
    list = list.filter((_, i) => i !== idx)
    dropped++
  }
  if (dropped) o.log(`latest.json: ${dropped} Stories weggekürzt (bleiben im Archiv)`)
  await writeJsonAtomic(join(o.root, 'latest.json'), latest(), LatestSchema)

  // 5. meta.json zuletzt; firstMonth übernehmen, nie neu berechnen
  const oldMeta = await readJson<Meta | undefined>(join(o.basisRoot, 'meta.json'), undefined)
  const firstMonth = oldMeta?.firstMonth ?? (await oldestArchiveMonth(o.basisRoot)) ?? today.slice(0, 7)
  const notices = o.meta.notices.map(n => ({ ...n, since: oldMeta?.notices.find(x => x.kind === n.kind && (x.sourceId ?? x.text) === (n.sourceId ?? n.text))?.since ?? n.since }))
  const meta: Meta = { generatedAt, buildId: o.buildId, run: o.kind, firstMonth, ...o.meta, notices, credits: CREDITS }
  await writeJsonAtomic(join(o.root, 'meta.json'), meta, MetaSchema)
  return { latestCount: list.length, latestBytes: Buffer.byteLength(JSON.stringify(latest())), dropped }
}

async function oldestArchiveMonth(root: string): Promise<string | undefined> {
  try {
    const years = (await readdir(join(root, 'archive'))).filter(y => /^\d{4}$/.test(y)).sort()
    if (!years[0]) return undefined
    const months = (await readdir(join(root, 'archive', years[0]))).filter(m => /^\d{2}$/.test(m)).sort()
    return months[0] ? `${years[0]}-${months[0]}` : undefined
  } catch {
    return undefined
  }
}
