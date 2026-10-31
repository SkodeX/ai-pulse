// Lauf-Check (Skill lauf-pruefen): prüft das Ergebnis eines Laufs ohne Claude und liefert Befunde mit Schwere.

import type { Briefing, Latest, Meta, Story } from '../../shared/types.ts'
import { overlap, titleTokens } from '../cluster/title.ts'
import { keyNorm } from '../score/stories.ts'

export type Severity = 'fehler' | 'warnung' | 'hinweis'
export interface Finding { check: string; severity: Severity; text: string }
export interface UsageLike { ts: string; stage: string; model: string; inputTokens: number; outputTokens: number; ok: boolean; error?: string; backend?: string }
export interface CheckInput { latest: Latest; briefing?: Briefing; meta?: Meta; usage: UsageLike[]; previous?: Latest }
export interface CheckResult { findings: Finding[]; metrics: Record<string, number | string> }

const MAX_CALLS = 8
const SPONSOR_HINT_RE = /\b(angebot|anzeige|sponsored|sponsor|webinar|workshop|rabatt|gutschein|deal of the|% off)\b/i
const EN_WORDS_RE = /\b(the|and|with|for|this|that|from|will|are|is)\b/gi
const HOUR = 3_600_000
// Floskeln aus Changelog-Titeln, die nichts über das Ereignis sagen
const EVENT_WORDS = new Set(['ipo', 'funding', 'acquisition', 'lawsuit', 'layoffs', 'outage', 'breach', 'leak', 'merger', 'ruling'])
const GENERIC = new Set(['allgemein', 'verfugbar', 'generally', 'available', 'neue', 'neues', 'stellt', 'bringt', 'veroffentlicht', 'release', 'update'])

const short = (s: Story) => `„${s.title.slice(0, 70)}“`

// Dasselbe Ereignis in zwei Stories: gleiches Modell, ähnlicher deutscher Titel oder Schlüssel mit gleichem Kern.
export function duplicatePairs(stories: Story[]): [Story, Story, string][] {
  const rated = stories.filter(s => s.ratedBy !== 'regel')
  const tokens = new Map(rated.map(s => [s, new Set([...titleTokens(s.title)].filter(t => !GENERIC.has(t)))]))
  const out: [Story, Story, string][] = []
  for (let i = 0; i < rated.length; i++) {
    for (let j = i + 1; j < rated.length; j++) {
      const a = rated[i]!
      const b = rated[j]!
      if (Math.abs(Date.parse(a.firstSeen) - Date.parse(b.firstSeen)) > 72 * HOUR) continue
      const sharedModel = (a.models ?? []).find(m => (b.models ?? []).includes(m))
      const { common, jaccard } = overlap(tokens.get(a)!, tokens.get(b)!)
      // Gleicher Schlüsselanfang: drei Teile (github-copilot-fusion-…) oder zwei, wenn der zweite ein Ereignis ist (anthropic-ipo-…);
      // zwei Teile allein sind zu grob (github-copilot-plugin… ≠ github-copilot-automations…, Lauf 2026-10-31)
      const parts = a.clusterKey.split('-')
      const pa = parts.slice(0, EVENT_WORDS.has(parts[1] ?? '') ? 2 : 3).join('-')
      const differentModels = (a.models?.length ?? 0) > 0 && (b.models?.length ?? 0) > 0 && !sharedModel
      let why = ''
      if (sharedModel && a.category === b.category && a.category === 'modelle') why = `gleiches Modell ${sharedModel}`
      else if (jaccard >= 0.4 && common >= 4) why = `Titel ähnlich (Jaccard ${jaccard.toFixed(2)})`
      else if (keyNorm(a.clusterKey) === keyNorm(b.clusterKey)) why = 'gleicher Schlüssel'
      else if (a.category === b.category && !differentModels && pa.split('-').length >= 2 && (b.clusterKey === pa || b.clusterKey.startsWith(`${pa}-`))) why = `Schlüssel beginnen gleich (${pa}-…)`
      if (why) out.push([a, b, why])
    }
  }
  return out
}

export function checkRun(input: CheckInput): CheckResult {
  const { latest, briefing, meta, usage } = input
  const f: Finding[] = []
  const add = (check: string, severity: Severity, text: string) => f.push({ check, severity, text })
  const stories = latest.stories
  const rated = stories.filter(s => s.ratedBy !== 'regel')

  // 1. Quellen-Health
  const c = meta?.health?.counts
  const total = c ? Object.values(c).reduce((x, y) => x + y, 0) : 0
  const okShare = c && total ? (c['ok'] ?? 0) / total : NaN
  if (c && okShare < 0.9) add('health', 'fehler', `nur ${Math.round(okShare * 100)} % der Quellen ok (Ziel ≥ 90 %)`)
  for (const i of meta?.health?.issues ?? []) if (i.status !== 'blockiert' || !i.coveredBy) add('health', 'warnung', `${i.name}: ${i.status}${i.coveredBy ? '' : ' ohne Ersatzquelle'}`)

  // 2. Claude-Aufrufe und Fehler
  const calls = usage.length
  if (calls > MAX_CALLS) add('aufrufe', 'fehler', `${calls} CLI-Aufrufe (höchstens ${MAX_CALLS})`)
  for (const u of usage.filter(x => !x.ok)) add('aufrufe', 'warnung', `${u.stage} (${u.model}) fehlgeschlagen: ${u.error ?? 'unbekannt'}`)
  if (meta?.budget?.level && meta.budget.level !== 'abo') add('aufrufe', 'warnung', `Backend ${meta.budget.level} statt abo`)

  // 3. Duplikate
  const dups = duplicatePairs(stories)
  // Paare aus früheren Läufen (beide vor diesem Lauf gesehen) nur als Hinweis: sie altern aus dem 72-h-Fenster, neue Duplikate zählen
  const runStart = Date.parse(latest.generatedAt)
  const isOld = (s: Story) => Date.parse(s.firstSeen) < runStart - 60_000
  const newDups = dups.filter(([a, b]) => !(isOld(a) && isOld(b)))
  for (const [a, b, why] of dups.slice(0, 20)) add('duplikate', isOld(a) && isOld(b) ? 'hinweis' : 'warnung', `${short(a)} ≈ ${short(b)} – ${why} (${a.clusterKey} / ${b.clusterKey})${isOld(a) && isOld(b) ? ' · aus früherem Lauf' : ''}`)

  // 3b. Rückschritt gegen den vorigen Lauf: eine bestehende Story darf nur wachsen
  const prevById = new Map((input.previous?.stories ?? []).map(s => [s.id, s]))
  for (const s of stories) {
    const p = prevById.get(s.id)
    if (!p) continue
    if (s.sources.length < p.sources.length) add('rueckschritt', 'fehler', `${short(s)}: Quellen ${p.sources.length} → ${s.sources.length}`)
    if (s.firstSeen !== p.firstSeen) add('rueckschritt', 'fehler', `${short(s)}: firstSeen ${p.firstSeen} → ${s.firstSeen}`)
    if (p.summary && !s.summary) add('rueckschritt', 'fehler', `${short(s)}: Zusammenfassung verloren`)
  }

  // 4. Werbung durchgerutscht
  for (const s of stories) if (SPONSOR_HINT_RE.test(s.originalTitle)) add('werbung', 'warnung', `${short(s)} sieht nach Werbung aus (${s.sources[0]?.id})`)

  // 5. Bewertungsregeln
  for (const s of stories) {
    const expect = Math.round((s.impact + s.personal) / 2 * 10) / 10
    if (Math.abs(s.score - expect) > 0.01) add('scores', 'fehler', `${short(s)}: score ${s.score} ≠ ${expect}`)
    if (s.hype && s.impact > 5) add('scores', 'fehler', `${short(s)}: Hype mit Tragweite ${s.impact} (> 5)`)
  }
  for (const s of rated) if (s.impact >= 9 && s.sources.length === 1) add('scores', 'hinweis', `${short(s)}: Tragweite ${s.impact} bei nur einer Quelle`)

  // 6. Texte: deutsch, Zusammenfassungen vorhanden
  for (const s of rated) {
    if (s.title === s.originalTitle && s.sources[0]?.lang === 'en') add('texte', 'warnung', `${short(s)}: Titel nicht übersetzt`)
    const en = (s.summary ?? '').match(EN_WORDS_RE)?.length ?? 0
    if (en >= 4) add('texte', 'warnung', `${short(s)}: Zusammenfassung wirkt englisch (${en} englische Füllwörter)`)
  }
  const top = [...rated].sort((a, b) => b.score - a.score).slice(0, 10)
  const noSummary = top.filter(s => !s.summary).length
  if (noSummary > 0) add('texte', 'warnung', `${noSummary} der Top 10 ohne Zusammenfassung`)

  // 7. Kategorien und Tags
  const share = (n: number, d: number) => (d ? n / d : 0)
  const news = share(rated.filter(s => s.category === 'neuigkeiten').length, rated.length)
  if (news > 0.5) add('kategorien', 'warnung', `${Math.round(news * 100)} % der Claude-Stories in „neuigkeiten“ – Kategorien zu grob?`)
  const general = share(rated.filter(s => !(s.providers?.length) && !(s.models?.length)).length, rated.length)
  if (general > 0.4) add('tags', 'warnung', `${Math.round(general * 100)} % der Claude-Stories ohne Anbieter/Modell`)
  for (const s of stories) for (const p of s.providers ?? []) if (p === p.toLowerCase()) add('tags', 'hinweis', `${short(s)}: Anbieter „${p}“ nicht normalisiert`)

  // 8. Briefing
  if (briefing) {
    const ids = new Set(stories.map(s => s.id))
    const missing = briefing.items.filter(i => !ids.has(i.storyId)).length
    if (missing) add('briefing', 'fehler', `${missing} Briefing-Punkte verweisen auf unbekannte Stories`)
    if (briefing.model === 'regel' && meta?.budget?.level === 'abo' && briefing.kind === 'morning') add('briefing', 'warnung', 'Morgen-Briefing ohne Claude, obwohl das Abo verfügbar war')
    const linked = briefing.items.map(i => stories.find(s => s.id === i.storyId)).filter((s): s is Story => !!s)
    const bdups = duplicatePairs(linked)
    if (bdups.length) add('briefing', 'warnung', `${bdups.length} Briefing-Punkte behandeln dasselbe Ereignis`)
  } else add('briefing', 'warnung', 'kein Briefing gefunden')

  const metrics: Record<string, number | string> = {
    stories: stories.length,
    claude: rated.length,
    regel: stories.length - rated.length,
    zusammenfassungen: stories.filter(s => s.summary).length,
    duplikate: dups.length,
    duplikateNeu: newDups.length,
    aufrufe: calls,
    tokenIn: usage.reduce((x, u) => x + u.inputTokens, 0),
    tokenOut: usage.reduce((x, u) => x + u.outputTokens, 0),
    quellenOk: Number.isNaN(okShare) ? '–' : `${Math.round(okShare * 100)} %`,
    allgemein: `${Math.round(general * 100)} %`,
  }
  return { findings: f, metrics }
}

export function renderReport(runDir: string, r: CheckResult): string {
  const order: Severity[] = ['fehler', 'warnung', 'hinweis']
  const lines = [`# Lauf-Check ${runDir}`, '', Object.entries(r.metrics).map(([k, v]) => `${k} ${v}`).join(' · '), '']
  for (const sev of order) {
    const list = r.findings.filter(x => x.severity === sev)
    if (!list.length) continue
    lines.push(`## ${sev} (${list.length})`, '')
    for (const x of list) lines.push(`- [${x.check}] ${x.text}`)
    lines.push('')
  }
  if (!r.findings.length) lines.push('Keine Befunde.')
  return lines.join('\n')
}
