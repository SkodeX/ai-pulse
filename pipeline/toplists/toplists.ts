// Top-Listen „Die 50 besten …" (Wunsch 2026-10-25): GitHub-Repos (KI), Claude Skills & Plugins, MCP-Server, Hugging Face.
// Ranking-Mix: Gesamtsterne + Wachstum der letzten 7 Tage, nur gepflegte Projekte (Push ≤ 60 Tage). Update wöchentlich.
// GitHub-Suche: mit AIPULSE_GITHUB_TOKEN (Server), sonst anonym (10 Suchen/Minute → gestaffelt). Nie gh auth token.

import type { TopList, TopListItem, TopListsFile } from '../../shared/types.ts'
import { ACCEPT_JSON, httpFetch } from '../collect/http.ts'
import { sleep } from '../lib/util.ts'

export interface StarHistory { snapshots: { date: string; stars: Record<string, number> }[] }

interface ListDef { id: string; title: string; hint: string; queries: string[] }

export const GITHUB_LISTS: ListDef[] = [
  { id: 'repos', title: 'GitHub-Repos (KI)', hint: 'Agenten, Frameworks, Coding-Tools, lokale Modelle, RAG', queries: ['topic:llm', 'topic:ai-agents', 'topic:rag', 'topic:generative-ai', 'topic:local-llm'] },
  { id: 'skills', title: 'Claude Skills & Plugins', hint: 'Skills, Plugins und Agenten für Claude Code (auch Codex/Cursor-Regeln)', queries: ['topic:claude-code', 'topic:claude-skills', 'topic:agent-skills', 'claude code in:name,description topic:plugin'] },
  { id: 'mcp', title: 'MCP-Server', hint: 'Beliebte und neue Model-Context-Protocol-Server', queries: ['topic:mcp-server', 'topic:model-context-protocol'] },
]

const BAD = /uncensored|nsfw|nude|porn|undress|deepnude|jailbreak|abliterat|\d*eros\b|erotic|hentai|waifu|wank/i
const DAY = 86400e3

function dateMinus(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY).toISOString().slice(0, 10)
}

export async function searchGithub(query: string, now: Date, token?: string): Promise<{ items: Record<string, unknown>[]; error?: string }> {
  const q = `${query} stars:>300 pushed:>${dateMinus(now, 60)} archived:false fork:false`
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=50`
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await httpFetch({ url, accept: ACCEPT_JSON, headers, retry: false })
  if (!res.ok || !res.body) return { items: [], error: `${query}: ${res.error ?? res.status}` }
  try {
    return { items: ((JSON.parse(res.body) as { items?: Record<string, unknown>[] }).items ?? []) }
  } catch {
    return { items: [], error: `${query}: kein JSON` }
  }
}

export function repoItem(r: Record<string, unknown>): TopListItem {
  return {
    id: String(r['full_name']).toLowerCase(), name: String(r['full_name']), url: String(r['html_url']),
    description: String(r['description'] ?? '').slice(0, 280), stars: Number(r['stargazers_count'] ?? 0), growth7d: null,
    updatedAt: String(r['pushed_at'] ?? ''), language: r['language'] ? String(r['language']) : undefined,
    topics: Array.isArray(r['topics']) ? (r['topics'] as string[]).slice(0, 6) : [],
  }
}

// Wachstum aus der Sternhistorie (Snapshot vor ≥ 6 Tagen), Ranking = Mittel der Perzentile (Sterne, Wachstum)
export function rankItems(items: TopListItem[], history: StarHistory, now: Date, limit = 50): TopListItem[] {
  const ref = [...history.snapshots].reverse().find(s => now.getTime() - Date.parse(s.date) >= 6 * DAY)
  const withGrowth = items.map(i => ({ ...i, growth7d: ref && ref.stars[i.id] !== undefined ? i.stars - ref.stars[i.id]! : null }))
  const pct = (vals: number[], v: number) => (vals.length > 1 ? vals.filter(x => x < v).length / (vals.length - 1) : 1)
  const starVals = withGrowth.map(i => i.stars)
  const growthVals = withGrowth.filter(i => i.growth7d !== null).map(i => i.growth7d!)
  const scored = withGrowth.map(i => ({ i, s: growthVals.length > 0 && i.growth7d !== null ? (pct(starVals, i.stars) + pct(growthVals, i.growth7d)) / 2 : pct(starVals, i.stars) }))
  scored.sort((a, b) => b.s - a.s || b.i.stars - a.i.stars)
  const top = scored.slice(0, limit).map(x => x.i)
  // Aufsteiger der Woche: höchstes relatives Wachstum (mind. 50 neue Sterne)
  const rising = new Set([...withGrowth].filter(i => (i.growth7d ?? 0) >= 50).sort((a, b) => b.growth7d! / b.stars - a.growth7d! / a.stars).slice(0, 5).map(i => i.id))
  return top.map(i => (rising.has(i.id) ? { ...i, rising: true } : i))
}

// HF-Modelle haben keine Beschreibung, nur pipeline_tag → deutscher Satz nach Regel statt Claude
const HF_TASKS: Record<string, string> = {
  'text-generation': 'Sprachmodell für Text und Chat',
  'image-text-to-text': 'Multimodales Modell, versteht Bilder und Text',
  'any-to-any': 'Multimodales Modell für Text, Bild und Ton',
  'text-to-image': 'Bildgenerierung aus Text',
  'image-to-image': 'Bildbearbeitung per Modell',
  'text-to-video': 'Videogenerierung aus Text',
  'image-to-video': 'Videos aus Bildern erzeugen',
  'text-to-speech': 'Sprachausgabe (Text zu Sprache)',
  'automatic-speech-recognition': 'Spracherkennung (Sprache zu Text)',
  'feature-extraction': 'Embedding-Modell für Suche und RAG',
  'sentence-similarity': 'Embedding-Modell für Suche und RAG',
  'text-ranking': 'Reranker für Suche und RAG',
}

export function hfModelUseCase(id: string, task: string | undefined): string | undefined {
  const what = task ? HF_TASKS[task] : undefined
  if (!what) return undefined
  const org = id.split('/')[0] ?? ''
  const size = /(?:^|[-_.])(\d+(?:\.\d+)?)[bB](?:$|[-_.])/.exec(id.split('/')[1] ?? '')?.[1]
  return `${what} · offene Gewichte von ${org}${size ? ` · ${size.replace('.', ',')} Mrd. Parameter` : ''}`
}

export async function huggingFaceList(now: Date): Promise<{ list?: TopList; error?: string }> {
  const get = async (kind: 'models' | 'spaces') => {
    const res = await httpFetch({ url: `https://huggingface.co/api/${kind}?sort=trendingScore&limit=80`, accept: ACCEPT_JSON, retry: false })
    if (!res.ok || !res.body) throw new Error(`${kind}: ${res.error ?? res.status}`)
    return JSON.parse(res.body) as Record<string, unknown>[]
  }
  try {
    const [models, spaces] = await Promise.all([get('models'), get('spaces')])
    const ok = (x: Record<string, unknown>) => !BAD.test(String(x['id'])) && !((x['tags'] as string[] | undefined) ?? []).some(t => BAD.test(t))
    const m = models.filter(ok).slice(0, 35).map(x => ({ id: `hf:${x['id']}`, name: String(x['id']), url: `https://huggingface.co/${x['id']}`, description: [x['pipeline_tag'], x['library_name']].filter(Boolean).join(' · '), useCase: hfModelUseCase(String(x['id']), x['pipeline_tag'] as string | undefined), stars: Number(x['likes'] ?? 0), growth7d: null, updatedAt: String(x['createdAt'] ?? ''), kind: 'model' as const, topics: [] }))
    const s = spaces.filter(x => ok(x) && Number(x['likes'] ?? 0) >= 50).slice(0, 15).map(x => ({ id: `hfs:${x['id']}`, name: String(x['id']), url: `https://huggingface.co/spaces/${x['id']}`, description: `Space · ${x['sdk'] ?? ''}`.trim(), stars: Number(x['likes'] ?? 0), growth7d: null, updatedAt: String(x['createdAt'] ?? ''), kind: 'space' as const, topics: [] }))
    return { list: { id: 'hf', title: 'Hugging Face (Trending)', hint: 'Trend-Modelle und Spaces der Woche; Zahl = Likes', unit: 'Likes', items: [...m, ...s] } }
  } catch (err) {
    return { error: `hf ${(err as Error).message}` }
  }
}

export async function buildTopLists(history: StarHistory, now: Date, token?: string, pauseMs = token ? 2500 : 6500): Promise<{ file: TopListsFile; history: StarHistory; errors: string[] }> {
  const errors: string[] = []
  const lists: TopList[] = []
  const allStars: Record<string, number> = {}
  const taken = new Set<string>()   // jedes Repo nur in der spezifischsten Liste (Reihenfolge: Skills → MCP → allgemein)
  const order = ['skills', 'mcp', 'repos']
  const results = new Map<string, Map<string, TopListItem>>()
  let first = true
  for (const def of [...GITHUB_LISTS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))) {
    const byId = new Map<string, TopListItem>()
    for (const q of def.queries) {
      if (!first) await sleep(pauseMs)   // Suche: 10/min anonym, 30/min mit Token
      first = false
      let r = await searchGithub(q, now, token)
      if (r.error?.endsWith('rate-limit')) { await sleep(61_000); r = await searchGithub(q, now, token) }
      if (r.error) errors.push(r.error)
      for (const raw of r.items) {
        const it = repoItem(raw)
        if (!BAD.test(it.name) && !taken.has(it.id)) byId.set(it.id, it)
      }
    }
    for (const it of byId.values()) { allStars[it.id] = it.stars; taken.add(it.id) }
    results.set(def.id, byId)
  }
  for (const def of GITHUB_LISTS) {
    const byId = results.get(def.id)
    if (byId && byId.size > 0) lists.push({ id: def.id, title: def.title, hint: def.hint, unit: 'Sterne', items: rankItems([...byId.values()], history, now) })
  }
  const hf = await huggingFaceList(now)
  if (hf.list) lists.push(hf.list)
  if (hf.error) errors.push(hf.error)
  const date = now.toISOString().slice(0, 10)
  const snapshots = [...history.snapshots.filter(s => s.date !== date), ...(Object.keys(allStars).length ? [{ date, stars: allStars }] : [])].slice(-8)
  return { file: { generatedAt: now.toISOString(), lists }, history: { snapshots }, errors }
}

// Wöchentlich: fällig, wenn der letzte Stand vor dem letzten Sonntag 00:00 (Berlin) liegt
export function toplistsDue(last: string | undefined, now: Date): boolean {
  if (!last) return true
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' })
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(now))
  const sunday = fmt.format(new Date(now.getTime() - Math.max(wd, 0) * DAY))
  return fmt.format(new Date(last)) < sunday
}
