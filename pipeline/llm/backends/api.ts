// Notfall-Backend (Anthropic-API, nur Haiku 5.5). Phase 2: Fixture-Modus für Test- und Teilläufe
// (AIPULSE_SIMULATE_LIMIT=1). Der echte SDK-Aufruf kommt mit dem Notfall-Key (Nutzerentscheidung 2026-10-25: „später").

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { API_PRICE, FALLBACK_MODEL } from '../../config/models.ts'
import type { LlmRequest, LlmResponse } from './types.ts'

export const FIXTURE_DIR = join(import.meta.dirname, '..', '..', 'test', 'fixtures', 'llm')

export function estimateUsd(inputChars: number, maxTokens: number): number {
  return (Math.ceil(inputChars / 3) * API_PRICE.inputPerMTok + maxTokens * API_PRICE.outputPerMTok) / 1e6
}

export function exactUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * API_PRICE.inputPerMTok + outputTokens * API_PRICE.outputPerMTok) / 1e6
}

// Antwort aus aufgezeichneter Fixture (gleiche zod-Prüfung und Kostenrechnung wie echt, kein Key nötig).
export async function callApiFixture(req: LlmRequest, refs?: string[]): Promise<LlmResponse> {
  const t0 = Date.now()
  try {
    const raw = JSON.parse(await readFile(join(FIXTURE_DIR, `api-${req.stage}.json`), 'utf8')) as { data: Record<string, unknown>; usage: { input_tokens: number; output_tokens: number } }
    let data: unknown = raw.data
    // Fixture-Items auf die refs dieses Pakets umschreiben, damit sie zugeordnet werden können
    if (refs && Array.isArray(raw.data['items'])) {
      const template = raw.data['items'] as Record<string, unknown>[]
      data = { ...raw.data, items: refs.map((ref, i) => ({ ...template[i % template.length], ref })) }
    }
    return { ok: true, data, model: FALLBACK_MODEL, inputTokens: raw.usage.input_tokens, outputTokens: raw.usage.output_tokens, usd: exactUsd(raw.usage.input_tokens, raw.usage.output_tokens), ms: Date.now() - t0 }
  } catch (err) {
    return { ok: false, error: 'other', detail: `Fixture api-${req.stage}.json: ${(err as Error).message}`, ms: Date.now() - t0 }
  }
}

export async function callApiLive(_req: LlmRequest): Promise<LlmResponse> {
  return { ok: false, error: 'other', detail: 'Notfall-API noch nicht angebunden (kommt mit dem Notfall-Key, Phase 3)', ms: 0 }
}
