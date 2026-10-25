// Baut models.json (Bestenlisten je Einsatzzweck, neue Modelle, Abschaltungen, Tools) und watchlist.json
// (Anbieter-Watchlist: Basis ∪ Top-12 aus Arena + AA). Aktualisierung Mo/Mi/Fr (Wunsch des Nutzers 2026-10-25).

import type { ModelBoard, ModelsFile, Watchlist, WatchlistEntry } from '../../shared/types.ts'
import { BASE_ORGS, ORG_ALIASES, orgDisplay, orgFromPrefix } from '../config/watchlist.ts'
import type { ArenaState } from './arena.ts'
import type { OrModel } from './openrouter.ts'

export interface WatchHistory { builds: { date: string; ranks: Record<string, number> }[] }

const blended = (m: OrModel) => (3 * m.priceIn + m.priceOut) / 4
const orgOf = (m: OrModel) => orgFromPrefix(m.prefix)?.org ?? m.prefix
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

// Preis zu einem Arena-Modellnamen über OpenRouter-Namen finden (best effort)
function priceFor(name: string, models: OrModel[]): number | null {
  const n = norm(name)
  const hit = models.find(m => norm(m.name) === n) ?? models.find(m => norm(m.name).startsWith(n) && m.priceIn > 0)
  return hit && hit.priceIn > 0 ? Math.round(blended(hit) * 100) / 100 : null
}

function orBoard(id: string, title: string, hint: string, unit: string, models: OrModel[], pick: (m: OrModel) => number | null, filter: (m: OrModel) => boolean = () => true): ModelBoard {
  const rows = models.filter(m => pick(m) != null && filter(m)).sort((a, b) => pick(b)! - pick(a)!).slice(0, 10)
    .map(m => ({ name: m.name, org: orgOf(m), provider: orgDisplay(orgOf(m)), value: Math.round(pick(m)! * 10) / 10, price: m.priceIn > 0 ? Math.round(blended(m) * 100) / 100 : null }))
  return { id, title, hint, unit, source: 'OpenRouter', rows }
}

function arenaBoard(id: string, title: string, hint: string, arena: ArenaState, config: string, category: string, models: OrModel[], unit = 'Elo'): ModelBoard | undefined {
  const b = arena[config]?.boards.find(x => x.category === category)
  if (!b || b.rows.length === 0) return undefined
  return {
    id, title, hint: `${hint} · Stand ${b.publishDate ?? '?'}`, unit, source: 'Arena',
    rows: b.rows.slice(0, 10).map(r => ({ name: r.model, org: r.org, provider: orgDisplay(r.org), value: unit === 'Score' ? Math.round(r.value * 1000) / 10 : Math.round(r.value), price: priceFor(r.model, models) })),
  }
}

export const TOOLS: ModelsFile['tools'] = [
  { group: 'Coding-Assistenten', items: ['Claude Code', 'OpenAI Codex', 'Cursor', 'GitHub Copilot', 'Gemini CLI', 'Cline', 'Qwen Code', 'Windsurf'] },
  { group: 'Chat-Apps', items: ['ChatGPT', 'Claude', 'Gemini', 'Le Chat (Mistral)', 'Perplexity', 'Microsoft Copilot', 'Grok'] },
  { group: 'Automatisierung & Oberflächen', items: ['n8n', 'Open WebUI', 'ComfyUI', 'Dify', 'Flowise', 'LangGraph Studio'] },
]

export function buildModelsFile(models: OrModel[], arena: ArenaState, fetchedAt: string | null, now: Date): ModelsFile {
  const nowS = now.getTime() / 1000
  const boards = [
    arenaBoard('text', 'Text & Chat allgemein', 'Arena Text (Nutzerstimmen)', arena, 'text', 'overall', models),
    arenaBoard('coding', 'Coding', 'Arena Text, Kategorie Coding', arena, 'text', 'coding', models),
    arenaBoard('agent', 'Agenten & Automatisierung', 'Arena Agent (Erfolgsquote in %)', arena, 'agent', 'overall', models, 'Score'),
    arenaBoard('webdev', 'Web- & App-Entwicklung', 'Arena WebDev', arena, 'webdev', 'overall', models),
    orBoard('gamedev', 'Game-Dev', 'Design Arena: Spiele bauen', 'Elo', models, m => m.design['models/gamedev'] ?? null),
    arenaBoard('vision', 'Bild-Verstehen', 'Arena Vision', arena, 'vision', 'overall', models),
    arenaBoard('image', 'Design & Bild-Generierung', 'Arena Text-zu-Bild', arena, 'text_to_image', 'overall', models),
    arenaBoard('video', 'Film & Video', 'Arena Text-zu-Video', arena, 'text_to_video', 'overall', models),
    orBoard('intel', 'Intelligenz-Index', 'Artificial Analysis Intelligence Index', 'Index', models, m => m.intel),
    orBoard('value', 'Preis-Leistung', 'Intelligence Index je US-$ (Mischpreis je 1 Mio. Token), nur Index ≥ 40', 'Index/$', models, m => (blended(m) > 0 && m.intel !== null ? m.intel / blended(m) : null), m => (m.intel ?? 0) >= 40),
  ].filter((b): b is ModelBoard => !!b && b.rows.length > 0)
  const local = models.filter(m => m.hf && m.intel !== null && /qwen|gemma|llama|mistral|glm|gpt-oss|deepseek|phi/i.test(m.id)).sort((a, b) => b.intel! - a.intel!).slice(0, 8).map(m => m.name)
  const fresh = models.filter(m => nowS - m.created < 30 * 86400 && orgFromPrefix(m.prefix)).sort((a, b) => b.created - a.created).slice(0, 20)
    .map(m => ({ name: m.name, provider: orgDisplay(orgOf(m)), created: new Date(m.created * 1000).toISOString(), ctx: m.ctx, priceIn: Math.round(m.priceIn * 100) / 100, priceOut: Math.round(m.priceOut * 100) / 100, intel: m.intel, vision: m.inputs.includes('image') }))
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now)
  const expiring = models.filter(m => m.expires && m.expires >= today).sort((a, b) => a.expires!.localeCompare(b.expires!)).slice(0, 15).map(m => ({ name: m.name, provider: orgDisplay(orgOf(m)), date: m.expires! }))
  const arenaDates = Object.fromEntries(Object.entries(arena).map(([k, v]) => [k, v.boards[0]?.publishDate ?? null]))
  return { generatedAt: now.toISOString(), sources: { openrouterFetchedAt: fetchedAt, arenaDates }, boards, fresh, expiring, tools: [TOOLS[0]!, TOOLS[1]!, { group: 'Lokale Modelle (Ollama)', items: local }, TOOLS[2]!] }
}

// Anbieter-Watchlist: Perzentile aus Arena (bestes text/overall je Org) und AA (max Index je Org)
export function buildWatchlist(models: OrModel[], arena: ArenaState, fetchedAt: string | null, history: WatchHistory, now: Date): { file: Watchlist; history: WatchHistory } {
  const textOverall = arena['text']?.boards.find(b => b.category === 'overall')
  const publish = arena['text']?.boards[0]?.publishDate ?? null
  const stale = !publish || now.getTime() - Date.parse(publish) > 21 * 86400e3
  const bestArena = new Map<string, number>(Object.entries(textOverall?.orgBest ?? {}))
  const bestAA = new Map<string, number>()
  for (const m of models) if (m.intel !== null) bestAA.set(orgOf(m), Math.max(bestAA.get(orgOf(m)) ?? 0, m.intel))
  const rankOf = (map: Map<string, number>) => new Map([...map.entries()].sort((a, b) => b[1] - a[1]).map(([o], i) => [o, i + 1]))
  const ra = rankOf(bestArena), rb = rankOf(bestAA)
  const p = (rank: number | undefined, n: number) => (rank && n > 1 ? (n - rank) / (n - 1) : 0)
  const orgs = new Set([...bestArena.keys(), ...bestAA.keys(), ...BASE_ORGS])
  const scored = [...orgs].map(org => ({ org, combined: stale ? p(rb.get(org), rb.size) : (p(ra.get(org), ra.size) + p(rb.get(org), rb.size)) / 2 }))
    .sort((a, b) => b.combined - a.combined || (bestArena.get(b.org) ?? 0) - (bestArena.get(a.org) ?? 0))
  const top12 = new Set(scored.slice(0, 12).map(s => s.org))
  const prevRanks = history.builds[history.builds.length - 1]?.ranks ?? {}
  const providers: WatchlistEntry[] = scored.filter(s => top12.has(s.org) || BASE_ORGS.includes(s.org)).map(s => {
    const combinedRank = scored.indexOf(s) + 1
    const prev = prevRanks[s.org]
    const alias = ORG_ALIASES.find(a => a.org === s.org)
    const reason: WatchlistEntry['reason'] = []
    if (BASE_ORGS.includes(s.org)) reason.push('basis')
    if (top12.has(s.org)) reason.push('top12')
    return {
      org: s.org, displayName: orgDisplay(s.org),
      aliases: { arena: alias?.arena ?? null, openrouter: alias?.openrouter ?? [], hf: alias?.hf ?? [], github: [] },
      arenaRank: ra.get(s.org) ?? null, arenaRating: bestArena.has(s.org) ? Math.round(bestArena.get(s.org)!) : null,
      aaIndex: bestAA.get(s.org) ?? null, combinedRank,
      trend: prev === undefined ? (history.builds.length ? 'new' : 'same') : prev - combinedRank >= 2 ? 'up' : combinedRank - prev >= 2 ? 'down' : 'same',
      isClimber: false, reason, sourcesActive: [], aliasMissing: !alias,
    }
  })
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now)
  const builds = [...history.builds.filter(b => b.date !== date), { date, ranks: Object.fromEntries(providers.map(x => [x.org, x.combinedRank])) }].slice(-36)
  const week = isoWeek(now)
  return { file: { generatedAt: now.toISOString(), week, basis: { arenaPublishDate: publish, arenaStale: stale, openrouterFetchedAt: fetchedAt ?? '' }, providers }, history: { builds } }
}

export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
}

// Fällig Mo/Mi/Fr (Europe/Berlin), sonst wenn der letzte Stand älter als 3 Tage ist (Nachholen)
export function modelsDue(lastBuild: string | undefined, now: Date): boolean {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now)
  if (lastBuild && new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(lastBuild)) === date) return false
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(now)
  return ['Mon', 'Wed', 'Fri'].includes(wd) || !lastBuild || now.getTime() - Date.parse(lastBuild) > 3 * 86400e3
}
