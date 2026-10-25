// Stufe 2 – Zusammenfassen mit Haiku, Pakete ≤ 13, Sicherheit im eigenen Paket (Skill bewertung, Abschnitt Stufe 2).

import type { Story } from '../../shared/types.ts'
import { LIMITS, STAGES } from '../config/models.ts'
import type { LlmRunner } from './budget.ts'
import { foreign, systemPromptFile } from './prompts.ts'
import { SummaryOut, jsonSchema, parseOutput } from './schemas.ts'
import type { SummaryResult } from './schemas.ts'

export type SummaryItem = SummaryResult['items'][number] & { model: string }

export interface SummaryInput { story: Story; text: string }   // text = Artikelauszug, Release-Notes oder Teaser

export function storyBlock(ref: string, s: SummaryInput): string {
  const st = s.story
  const host = (() => { try { return new URL(st.url).hostname.replace(/^www\./, '') } catch { return '' } })()
  return `<story ref="${ref}" kategorie="${st.category}" impact="${st.impact}" personal="${st.personal}" quellen="${foreign(st.sources.map(x => x.name).join(', '))}">\nTitel: ${foreign(st.originalTitle)}\n<artikel quelle="${foreign(host)}">\n${foreign(s.text)}\n</artikel>\n</story>`
}

// Pakete: Sicherheit getrennt, je ≤ 13
export function packages(inputs: SummaryInput[]): SummaryInput[][] {
  const sec = inputs.filter(i => i.story.category === 'sicherheit')
  const rest = inputs.filter(i => i.story.category !== 'sicherheit')
  const out: SummaryInput[][] = []
  for (const group of [sec, rest]) for (let i = 0; i < group.length; i += LIMITS.summarizeBatch) out.push(group.slice(i, i + LIMITS.summarizeBatch))
  return out
}

export async function runSummarize(runner: LlmRunner, inputs: SummaryInput[], header: string, cacheDir: string): Promise<Map<string, SummaryItem>> {
  const out = new Map<string, SummaryItem>()
  if (inputs.length === 0) return out
  const prompt = await systemPromptFile('summarize', cacheDir)
  const schemaJson = jsonSchema(SummaryOut)
  const cfg = STAGES.summarize
  for (const pack of packages(inputs)) {
    if (!runner.canStart('summarize', true)) break
    const refs = pack.map((_, i) => `s${String(i + 1).padStart(2, '0')}`)
    const input = `${header}\n<stories>\n${pack.map((p, i) => storyBlock(refs[i]!, p)).join('\n')}\n</stories>\nFasse alle ${pack.length} Stories zusammen.`
    const res = await runner.call({ stage: 'summarize', system: prompt.text, systemFile: prompt.file, input, schemaJson, model: cfg.model, effort: cfg.effort, timeoutMs: cfg.timeoutMs, maxTokens: cfg.apiMaxTokens(pack.length) }, refs)
    if (!res.ok) { if (res.error === 'limit' || res.error === 'auth') break; continue }
    const parsed = parseOutput(SummaryOut, res.data)
    if (!parsed.ok) { runner.errors.push(`summarize: schema ${parsed.error}`); continue }
    for (const item of parsed.value.items) {
      const idx = refs.indexOf(item.ref)
      if (idx < 0 || out.has(pack[idx]!.story.id)) continue
      out.set(pack[idx]!.story.id, { ...item, model: res.model })
    }
  }
  return out
}
