// Stufe 3a – Briefing mit Opus (morgens ausführlich, mittags/abends „Seit heute früh") oder Regel-Briefing.

import type { Briefing, Frist, RunKind, Story } from '../../shared/types.ts'
import { STAGES } from '../config/models.ts'
import type { LlmRunner } from './budget.ts'
import { foreign, systemPromptFile } from './prompts.ts'
import { BriefingOut, jsonSchema, parseOutput } from './schemas.ts'

export function berlinDay(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' }).format(d)
}

// Eingabe-Stories: morgens Top 15, sonst nur neue seit dem Morgen-Briefing, Top 10.
export function briefingPool(stories: Story[], kind: RunKind, since: string | undefined): Story[] {
  const sorted = [...stories].sort((a, b) => b.score - a.score || b.impact - a.impact)
  if (kind === 'morning') return sorted.slice(0, 15)
  return sorted.filter(s => !since || s.firstSeen > since).slice(0, 10)
}

export function ruleBriefing(pool: Story[], kind: RunKind, now: Date): Briefing {
  const items = pool.slice(0, 5).map(s => ({ storyId: s.id, text: s.whyImportant ?? s.title }))
  const morning = kind === 'morning'
  return {
    generatedAt: now.toISOString(), kind, model: 'regel',
    title: morning ? `Das Wichtigste am ${berlinDay(now)}.` : 'Seit heute früh',
    intro: items.length === 0 && !morning ? 'Seit heute früh nichts Wesentliches.' : 'Automatische Auswahl der Meldungen mit dem höchsten Score (ohne KI-Text).',
    items,
  }
}

export function briefingInput(pool: Story[], kind: RunKind, now: Date, fristen: Frist[], fallback: boolean): string {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now)
  const lines = pool.map(s => `<story>${s.id} | ${s.category} | ${s.score} | ${foreign(s.title)} | ${foreign(s.summary ?? s.whyImportant ?? '')}</story>`)
  const soon = fristen.filter(f => f.date && f.date >= day && Date.parse(f.date) - now.getTime() <= 14 * 86_400_000)
  const fr = soon.map(f => `${f.date} | ${f.kind} | ${foreign(f.title)}`)
  return [`Lauf: ${kind} · Datum: ${day}`, fallback ? 'Umfang: 3–5 Punkte, kurz.' : '', 'Stories (id | category | score | title | summary):', ...lines, 'Fristen:', ...(fr.length ? fr : ['(keine in den nächsten 14 Tagen)'])].filter(Boolean).join('\n')
}

export async function runBrief(runner: LlmRunner, pool: Story[], kind: RunKind, now: Date, fristen: Frist[], cacheDir: string): Promise<Briefing> {
  const strong = pool.filter(s => s.score >= 6).length
  if (pool.length === 0 || (kind !== 'morning' && strong < 2)) return ruleBriefing(pool, kind, now)
  if (!runner.canStart('brief', false)) return ruleBriefing(pool, kind, now)
  const prompt = await systemPromptFile('brief', cacheDir)
  const cfg = STAGES.brief
  const res = await runner.call({ stage: 'brief', system: prompt.text, systemFile: prompt.file, input: briefingInput(pool, kind, now, fristen, runner.cliState !== 'ok'), schemaJson: jsonSchema(BriefingOut), model: cfg.model, effort: cfg.effort, timeoutMs: cfg.timeoutMs, maxTokens: cfg.apiMaxTokens(1) })
  if (!res.ok) return ruleBriefing(pool, kind, now)
  const parsed = parseOutput(BriefingOut, res.data)
  if (!parsed.ok) { runner.errors.push(`brief: schema ${parsed.error}`); return ruleBriefing(pool, kind, now) }
  const ids = new Set(pool.map(s => s.id))
  const b = parsed.value
  const briefing: Briefing = {
    generatedAt: now.toISOString(), kind, model: res.model,
    title: b.title.slice(0, 90), intro: b.intro,
    items: b.items.filter(i => ids.has(i.storyId)),
  }
  if (b.outlook.trim()) briefing.outlook = b.outlook.trim()
  return briefing
}
