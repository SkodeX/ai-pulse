// Arena-Ranglisten aus dem HF-Dataset lmarena-ai/leaderboard-dataset (CC-BY-4.0), Skill modelle-und-ranglisten § 3.
// HEAD ohne Redirect → X-Linked-ETag; GET nur bei Änderung. hyparquet@1.31.2 (gepinnt).

import { parquetReadObjects } from 'hyparquet'
import { USER_AGENT } from '../../shared/config.ts'
import { orgFromArena } from '../config/watchlist.ts'

export const ARENA_BASE = 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/'
export const ARENA_CONFIGS = ['text', 'webdev', 'agent', 'vision', 'text_to_image', 'text_to_video'] as const
export type ArenaConfig = typeof ARENA_CONFIGS[number]

export interface ArenaRow { model: string; raw: string; org: string; value: number; lower: number | null; upper: number | null; rank: number }
export interface ArenaBoard { config: ArenaConfig; category: string; publishDate: string | null; rows: ArenaRow[]; orgBest: Record<string, number> }
export interface ArenaState { [config: string]: { etag: string; checkedAt: string; boards: ArenaBoard[] } }

const CATEGORIES: Record<ArenaConfig, string[]> = {
  text: ['overall', 'coding'], webdev: ['overall'], agent: ['overall'], vision: ['overall'], text_to_image: ['overall'], text_to_video: ['overall'],
}

// Modellidentität ohne Klammer-Suffix („Claude Opus 5.5 (Max)" → „Claude Opus 5.5")
export const baseModel = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim()

export function boardsFromRows(config: ArenaConfig, rows: Record<string, unknown>[], keep = 20): ArenaBoard[] {
  return CATEGORIES[config].map(category => {
    const sel = rows.filter(r => r['category'] === category && String(r['organization'] ?? '') !== '')
    const best = new Map<string, ArenaRow>()
    for (const r of sel) {
      const value = Number(r['rating'] ?? r['score'])
      const model = baseModel(String(r['model_name']))
      const row: ArenaRow = {
        model, raw: String(r['model_name']), org: orgFromArena(String(r['organization']))?.org ?? String(r['organization']), value,
        lower: r['rating_lower'] ?? r['score_ci_lower'] ? Number(r['rating_lower'] ?? r['score_ci_lower']) : null,
        upper: r['rating_upper'] ?? r['score_ci_upper'] ? Number(r['rating_upper'] ?? r['score_ci_upper']) : null,
        rank: Number(r['rank']),
      }
      const prev = best.get(model)
      if (!prev || value > prev.value) best.set(model, row)
    }
    const all = [...best.values()].sort((a, b) => b.value - a.value)
    const orgBest: Record<string, number> = {}
    for (const r of all) orgBest[r.org] ??= r.value   // bestes Modell je Anbieter über die ganze Liste
    const publishDate = sel[0] ? String(sel[0]['leaderboard_publish_date'] ?? '') || null : null
    return { config, category, publishDate, rows: all.slice(0, keep), orgBest }
  })
}

export async function fetchArena(prev: ArenaState, now: Date): Promise<{ state: ArenaState; changed: ArenaConfig[]; errors: string[] }> {
  const state: ArenaState = { ...prev }
  const changed: ArenaConfig[] = []
  const errors: string[] = []
  for (const config of ARENA_CONFIGS) {
    const url = `${ARENA_BASE}${config}/latest-00000-of-00001.parquet`
    try {
      const head = await fetch(url, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) })
      const etag = head.headers.get('x-linked-etag') ?? ''
      if (head.status !== 302 || !etag) { errors.push(`${config}: HEAD ${head.status}`); continue }
      if (prev[config]?.etag === etag) { state[config] = { ...prev[config]!, checkedAt: now.toISOString() }; continue }
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) })
      const buf = await res.arrayBuffer()
      if (!res.ok || new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'PAR1') { errors.push(`${config}: kein Parquet (${res.status})`); continue }
      const rows = await parquetReadObjects({ file: buf }) as Record<string, unknown>[]
      state[config] = { etag, checkedAt: now.toISOString(), boards: boardsFromRows(config, rows) }
      changed.push(config)
    } catch (err) {
      errors.push(`${config}: ${(err as Error).message}`)
    }
  }
  return { state, changed, errors }
}
