// Stufe 1 – Vorsortieren mit Haiku in Paketen à 20 (Skill bewertung, Abschnitt Stufe 1).

import { LIMITS, STAGES } from '../config/models.ts'
import type { Cluster } from '../types.ts'
import type { LlmRunner } from './budget.ts'
import { foreign, systemPromptFile } from './prompts.ts'
import { TriageOut, jsonSchema, parseOutput } from './schemas.ts'
import type { TriageResult } from './schemas.ts'

export type TriageItem = TriageResult['items'][number] & { model: string }

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+){2,7}$/

export function slugify(key: string): string {
  const parts = key.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean)
  while (parts.length < 3) parts.push('news')
  return parts.slice(0, 8).join('-')
}

// Schlüssel aus dem Kontext unverändert, neue gegen die Regex prüfen, sonst slugifizieren.
export function acceptKey(key: string, known: Set<string>): string {
  if (known.has(key)) return key
  return SLUG_RE.test(key) ? key : slugify(key)
}

export function weekday(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long' }).format(date)
}

export function contextBlock(date: Date, kind: string, known: { clusterKey: string; title: string }[]): string {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(date)
  const lines = known.slice(0, 250).map(k => `${k.clusterKey} | ${foreign(k.title)}`)
  return `<kontext>\nDatum: ${day} (${weekday(date)}) · Lauf: ${kind}\nBekannte Stories der letzten 72 h (clusterKey | Titel):\n${lines.join('\n') || '(keine)'}\n</kontext>`
}

export function candidateBlock(ref: string, c: Cluster, sourceName: string): string {
  const p = c.primary
  const law = c.items.find(i => i.lawHint)?.lawHint
  const date = (p.publishedAt ?? p.firstSeen).slice(0, 10)
  const attrs = `ref="${ref}" quelle="${foreign(sourceName)}" sprache="${p.lang}" datum="${date}"${law ? ` recht="${law.status} · ${law.jurisdiction}"` : ''}`
  return `<kandidat ${attrs}>\nTitel: ${foreign(p.title)}\nTeaser: ${foreign(p.teaser.slice(0, 300))}\n</kandidat>`
}

export async function runTriage(runner: LlmRunner, clusters: Cluster[], ctx: string, cacheDir: string): Promise<Map<Cluster, TriageItem>> {
  const out = new Map<Cluster, TriageItem>()
  if (clusters.length === 0) return out
  const prompt = await systemPromptFile('triage', cacheDir)
  const schemaJson = jsonSchema(TriageOut)
  const cfg = STAGES.triage
  const queue: Cluster[][] = []
  for (let i = 0; i < clusters.length; i += LIMITS.triageBatch) queue.push(clusters.slice(i, i + LIMITS.triageBatch))
  let halved = false
  while (queue.length > 0) {
    const batch = queue.shift()!
    if (!runner.canStart('triage', true)) break
    const refs = batch.map((_, i) => `k${String(i + 1).padStart(2, '0')}`)
    const input = `${ctx}\n<kandidaten>\n${batch.map((c, i) => candidateBlock(refs[i]!, c, c.sources[0]?.name ?? c.primary.sourceId)).join('\n')}\n</kandidaten>\nBewerte alle ${batch.length} Kandidaten.`
    const res = await runner.call({ stage: 'triage', system: prompt.text, systemFile: prompt.file, input, schemaJson, model: cfg.model, effort: cfg.effort, timeoutMs: cfg.timeoutMs, maxTokens: cfg.apiMaxTokens(batch.length) }, refs)
    if (!res.ok) {
      if ((res.error === 'schema' || res.error === 'refusal' || res.error === 'timeout') && !halved && batch.length > 1) {
        halved = true
        const mid = Math.ceil(batch.length / 2)
        queue.unshift(batch.slice(0, mid), batch.slice(mid))
        continue
      }
      if (res.error === 'limit' || res.error === 'auth') break
      continue
    }
    const parsed = parseOutput(TriageOut, res.data)
    if (!parsed.ok) { runner.errors.push(`triage: schema ${parsed.error}`); continue }
    const seen = new Set<string>()
    for (const item of parsed.value.items) {
      const idx = refs.indexOf(item.ref)
      if (idx < 0 || seen.has(item.ref)) continue   // unbekannt oder doppelt → erstes zählt
      seen.add(item.ref)
      out.set(batch[idx]!, { ...item, model: res.model })
    }
  }
  return out
}
