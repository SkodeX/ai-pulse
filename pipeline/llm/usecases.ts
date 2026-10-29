// Top-50: deutsche Use-Case-Sätze mit Haiku, nur für Einträge ohne Text im Cache (Wunsch 2026-10-25, wöchentlich).
// Cache state/leaderboards/usecases.json (id → Satz); Teilläufe schreiben ihn nach .cache/.

import type { TopListItem, TopListsFile } from '../../shared/types.ts'
import { LIMITS, STAGES } from '../config/models.ts'
import type { LlmRunner } from './budget.ts'
import { foreign, systemPromptFile } from './prompts.ts'
import { UseCaseOut, jsonSchema, parseOutput } from './schemas.ts'

export type UseCaseCache = Record<string, string>

export function projectBlock(ref: string, it: TopListItem): string {
  const topics = it.topics.slice(0, 6).join(', ')
  return `<projekt ref="${ref}">\nName: ${foreign(it.name)}\nBeschreibung: ${foreign(it.description.slice(0, 300))}${topics ? `\nThemen: ${foreign(topics)}` : ''}\n</projekt>`
}

// Texte aus dem Cache übernehmen; liefert die Einträge, denen noch einer fehlt (entdoppelt über id)
export function applyUseCases(file: TopListsFile, cache: UseCaseCache): { file: TopListsFile; missing: TopListItem[] } {
  const missing = new Map<string, TopListItem>()
  const lists = file.lists.map(l => ({
    ...l,
    items: l.items.map(it => {
      const text = cache[it.id]
      if (!text && !it.useCase) missing.set(it.id, it)   // HF-Modelle haben schon einen Regel-Satz
      return text ? { ...it, useCase: text } : it
    }),
  }))
  return { file: { ...file, lists }, missing: [...missing.values()] }
}

export async function runUseCases(runner: LlmRunner, items: TopListItem[], cacheDir: string): Promise<UseCaseCache> {
  const out: UseCaseCache = {}
  if (items.length === 0) return out
  const prompt = await systemPromptFile('usecases', cacheDir)
  const schemaJson = jsonSchema(UseCaseOut)
  const cfg = STAGES.usecases
  let calls = 0
  for (let i = 0; i < items.length && calls < LIMITS.usecasesMaxCalls; i += LIMITS.usecasesBatch) {
    if (!runner.canStart('usecases', false)) break
    calls++
    const pack = items.slice(i, i + LIMITS.usecasesBatch)
    const refs = pack.map((_, j) => `p${String(j + 1).padStart(3, '0')}`)
    const input = `<projekte>\n${pack.map((it, j) => projectBlock(refs[j]!, it)).join('\n')}\n</projekte>\nBeschreibe alle ${pack.length} Projekte.`
    const res = await runner.call({ stage: 'usecases', system: prompt.text, systemFile: prompt.file, input, schemaJson, model: cfg.model, effort: cfg.effort, timeoutMs: cfg.timeoutMs, maxTokens: cfg.apiMaxTokens(pack.length) }, refs)
    if (!res.ok) { if (res.error === 'limit' || res.error === 'auth') break; continue }
    const parsed = parseOutput(UseCaseOut, res.data)
    if (!parsed.ok) { runner.errors.push(`usecases: schema ${parsed.error}`); continue }
    for (const item of parsed.value.items) {
      const idx = refs.indexOf(item.ref)
      const text = item.useCase.trim().slice(0, 160)
      if (idx < 0 || !text || /nicht erkennbar/i.test(text)) continue
      out[pack[idx]!.id] = text
    }
  }
  return out
}
