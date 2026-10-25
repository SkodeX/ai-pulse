// Einziger Schreiber von public/data/fristen.json (Skill gesetze-und-fristen): kuratiert + automatisch + Übergaben.
// Jeder Lauf: Status nach Datum anheben, automatische Einträge 30 Tage nach date entfernen, sortieren.

import type { Frist, FristenFile } from '../../shared/types.ts'
import { lawRank } from './status.ts'

export interface ModelHandover {
  sourceUrl: string   // Deprecation-Seite bzw. 'https://openrouter.ai/'
  items: { provider: string; org: string; model: string; date: string; itemUrl?: string; storyId?: string; replacement?: string; tentative?: boolean }[]
}

// Orgs mit eigener Deprecation-Quelle im AGB-Monitor (vertragsaenderungen). Für diese verwirft build-fristen die
// OpenRouter-Übergaben. Leer, solange der AGB-Monitor nicht läuft (sonst fehlten OpenAI/Anthropic/Google ganz).
export const PROVIDER_DEPRECATION_ORGS: string[] = []

const OPENROUTER = 'https://openrouter.ai/'
const MAX_BYTES = 30 * 1024

function berlinDay(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d)
}

function raiseStatus(f: Frist, today: string): Frist {
  if (!f.date || f.date > today) return f
  const target = f.dateKind === 'gilt_ab' ? 'gilt_ab' : f.dateKind === 'in_kraft' || f.dateKind === 'abschaltung' ? 'in_kraft' : undefined
  if (!target) return f
  const a = lawRank(f.status), b = lawRank(target)
  return a !== undefined && b !== undefined && b > a ? { ...f, status: target } : f
}

function modelEntries(h: ModelHandover, today: string): Frist[] {
  const isOR = h.sourceUrl.startsWith(OPENROUTER)
  const groups = new Map<string, ModelHandover['items']>()
  for (const it of h.items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date) || it.date < today) continue
    if (isOR && PROVIDER_DEPRECATION_ORGS.includes(it.org)) continue
    const key = `${it.org}|${it.date}`
    groups.set(key, [...(groups.get(key) ?? []), it])
  }
  return [...groups.values()].map(list => {
    const first = list[0]!
    const models = [...new Set(list.map(i => i.model.replace(/:.*$/, '')))]
    const names = models.map(m => m.replace(/^[^/]+\//, ''))
    const title = isOR
      ? `OpenRouter nimmt ${names.length === 1 ? names[0] : `${names.length} Modelle (u. a. ${names.slice(0, 3).join(', ')})`} aus dem Angebot`
      : `${first.provider} schaltet ${names.length === 1 ? names[0] : `${names.length} Modelle ab (u. a. ${names.slice(0, 3).join(', ')})`}${names.length === 1 ? ' ab' : ''}`
    const f: Frist = {
      id: `modell-${first.org.replace(/[./:]/g, '-')}-${first.date}`, kind: 'modell', title, provider: first.provider, models,
      status: 'verkuendet', date: first.date, dateKind: 'abschaltung',
      sourceUrl: isOR && list.length === 1 && first.itemUrl ? first.itemUrl : h.sourceUrl,
      verifiedAt: today, origin: 'automatisch',
    }
    const story = list.find(i => i.storyId)?.storyId
    if (story) f.storyId = story
    if (first.replacement) f.note = `Nachfolger: ${first.replacement}`
    if (list.some(i => i.tentative)) f.note = [f.note, 'Datum vorläufig'].filter(Boolean).join(' · ')
    return f
  })
}

export function buildFristen(old: FristenFile | undefined, curated: Frist[], handovers: { models: ModelHandover[]; agb?: Frist[] }, now: Date, log: (m: string) => void = () => {}): FristenFile {
  const today = berlinDay(now)
  const limit = berlinDay(new Date(now.getTime() - 30 * 86400e3))
  let auto = (old?.items ?? []).filter(f => f.origin === 'automatisch' && (!f.date || f.date >= limit))
  for (const h of handovers.models) {
    const isOR = h.sourceUrl.startsWith(OPENROUTER)
    // künftige automatische modell-Einträge dieser Quelle neu bilden (Verschiebungen wandern mit, Rücknahmen verschwinden)
    auto = auto.filter(f => !(f.kind === 'modell' && f.date && f.date >= today && (isOR ? f.sourceUrl.startsWith(OPENROUTER) : f.sourceUrl === h.sourceUrl)))
    auto.push(...modelEntries(h, today))
  }
  for (const a of handovers.agb ?? []) auto = [...auto.filter(f => f.id !== a.id), { ...a, origin: 'automatisch' }]
  const curatedIds = new Set(curated.map(c => c.id))
  let items = [...curated, ...auto.filter(f => !curatedIds.has(f.id))].map(f => raiseStatus(f, today))
  items.sort((a, b) => (a.date ?? '9999-99-99').localeCompare(b.date ?? '9999-99-99') || a.id.localeCompare(b.id))
  const file = (): FristenFile => ({ generatedAt: now.toISOString(), items, checks: old?.checks ?? [] })
  while (Buffer.byteLength(JSON.stringify(file())) > MAX_BYTES) {
    const far = [...items].reverse().find(f => f.origin === 'automatisch')
    if (!far) break
    items = items.filter(f => f !== far)
    log(`fristen.json über 30 KB: ${far.id} weggelassen`)
  }
  return file()
}
