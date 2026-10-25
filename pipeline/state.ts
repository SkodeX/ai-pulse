// State-Dateien lesen/schreiben. Trockenläufe nutzen den Schatten-State .cache/dry/state/
// (beim ersten Mal aus state/ kopiert, --fresh startet leer); state/ schreibt nur der volle Lauf.

import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { CollectState } from './collect/collect.ts'
import type { SeenMap } from './filter/prefilter.ts'
import { DAY, readJson, sortKeys, writeJson } from './lib/util.ts'

export const ROOT = join(import.meta.dirname, '..')
export const STATE_DIR = join(ROOT, 'state')
export const CACHE_DIR = join(ROOT, '.cache')
export const SHADOW_DIR = join(CACHE_DIR, 'dry', 'state')

const FILES = { httpCache: 'http-cache.json', sourceState: 'source-state.json', health: 'sources-health.json', seen: 'seen.json' } as const
const SEEN_TTL_MS = 30 * DAY

export interface PipelineState extends CollectState {
  seen: SeenMap
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function prepareShadow(fresh: boolean, shadowDir = SHADOW_DIR, stateDir = STATE_DIR): Promise<void> {
  if (fresh) await rm(shadowDir, { recursive: true, force: true })
  if (await exists(shadowDir)) return
  await mkdir(shadowDir, { recursive: true })
  if (fresh) return
  for (const file of Object.values(FILES)) {
    const src = join(stateDir, file)
    if (await exists(src)) await cp(src, join(shadowDir, file))
  }
}

export async function loadState(dir: string): Promise<PipelineState> {
  return {
    httpCache: await readJson(join(dir, FILES.httpCache), {}),
    sourceState: await readJson(join(dir, FILES.sourceState), {}),
    health: await readJson(join(dir, FILES.health), { updatedAt: '', sources: {} }),
    seen: await readJson(join(dir, FILES.seen), {}),
  }
}

export async function saveState(dir: string, state: PipelineState, now: Date): Promise<void> {
  await writeJson(join(dir, FILES.httpCache), sortKeys(state.httpCache))
  await writeJson(join(dir, FILES.sourceState), sortKeys(state.sourceState))
  await writeJson(join(dir, FILES.health), { updatedAt: state.health.updatedAt, sources: sortKeys(state.health.sources) })
  await writeJson(join(dir, FILES.seen), pruneSeen(state.seen, now))
}

// TTL 30 Tage nach firstSeen, Schlüssel sortiert
export function pruneSeen(seen: SeenMap, now: Date): SeenMap {
  const limit = now.getTime() - SEEN_TTL_MS
  return sortKeys(Object.fromEntries(Object.entries(seen).filter(([, v]) => Date.parse(v.firstSeen) >= limit)))
}
