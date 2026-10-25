// OpenRouter-Detektor (Skill modelle-und-ranglisten § 1, § 10): Snapshot, Diff (neu, Preis, Abschaltung),
// AA-/Design-Arena-Werte für die Bestenlisten, Abschaltdaten für fristen.json.

import { ORG_ALIASES, orgFromPrefix } from '../config/watchlist.ts'

// Rückfall, solange keine berechnete Watchlist vorliegt: Basis + Ranglisten-Orgs der Alias-Tabelle
const DEFAULT_WATCH = new Set(ORG_ALIASES.filter(a => a.group === 'basis' || a.group === 'rangliste').map(a => a.org))
import { HOUR } from '../lib/util.ts'
import { modelEventKey, modelSlug } from './keys.ts'

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models'

export interface OrModel {
  id: string                // Basis-id ohne Variante
  slug: string              // canonical_slug
  name: string
  prefix: string
  created: number
  hf: string | null
  ctx: number
  priceIn: number           // USD je 1 M Token
  priceOut: number
  expires: string | null
  intel: number | null
  coding: number | null
  agentic: number | null
  design: Record<string, number>   // 'models/gamedev' → Elo
  inputs: string[]
}

export interface OrSnapshot {
  fetchedAt: string
  models: Record<string, { id: string; priceIn: number; priceOut: number; expires: string | null; firstSeen: string; created: number }>
  tombstones: Record<string, string>   // slug → entfernt am
}

export interface OrEvent {
  kind: 'new' | 'price' | 'deprecation' | 'prefix'
  model: OrModel
  clusterKey: string
  title: string
  detail: string
  org?: string
}

type Raw = Record<string, unknown>

// ~-Zeiger und openrouter/-Router weg, :free/:batch auf die Basis zusammenführen
export function reduceModels(data: unknown[]): OrModel[] {
  const byBase = new Map<string, { m: Raw; variant: boolean }>()
  for (const r of data as Raw[]) {
    const id = String(r['id'] ?? '')
    if (!id || id.startsWith('~') || id.startsWith('openrouter/')) continue
    const base = id.replace(/:.*$/, '')
    const variant = id.includes(':')
    const prev = byBase.get(base)
    if (!prev || (prev.variant && !variant)) byBase.set(base, { m: r, variant })
  }
  return [...byBase.entries()].map(([base, { m, variant }]) => {
    const pricing = (m['pricing'] ?? {}) as Raw
    const aa = ((m['benchmarks'] as Raw | undefined)?.['artificial_analysis'] ?? {}) as Raw
    const design: Record<string, number> = {}
    for (const d of (((m['benchmarks'] as Raw | undefined)?.['design_arena'] ?? []) as Raw[])) design[`${d['arena']}/${d['category']}`] = Number(d['elo'])
    const arch = (m['architecture'] ?? {}) as Raw
    return {
      id: base, slug: String(m['canonical_slug'] ?? base), name: String(m['name'] ?? base).replace(/^[^:]+:\s*/, ''),
      prefix: base.split('/')[0]!, created: Number(m['created'] ?? 0), hf: (m['hugging_face_id'] as string | null) ?? null,
      ctx: Number(m['context_length'] ?? 0),
      priceIn: variant ? 0 : Number(pricing['prompt'] ?? 0) * 1e6, priceOut: variant ? 0 : Number(pricing['completion'] ?? 0) * 1e6,
      expires: (m['expiration_date'] as string | null) ?? null,
      intel: num(aa['intelligence_index']), coding: num(aa['coding_index']), agentic: num(aa['agentic_index']),
      design, inputs: (arch['input_modalities'] as string[] | undefined) ?? [],
    }
  })
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const berlinYmd = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d)

// Familie für den Release-Schlüssel: Datums-/Größen-/Varianten-Suffixe weg
export function family(id: string): string {
  let s = modelSlug(id)
  for (let prev = ''; prev !== s;) { prev = s; s = s.replace(/-(\d+b|a\d+b|instruct|base|thinking|chat|preview|exp)$/, '') }
  return s
}

export function diffModels(models: OrModel[], prev: OrSnapshot | undefined, now: Date): { events: OrEvent[]; snapshot: OrSnapshot; error?: string } {
  const nowIso = now.toISOString()
  const prevCount = prev ? Object.keys(prev.models).length : 0
  if (prev && models.length < prevCount * 0.8) return { events: [], snapshot: prev, error: `nur ${models.length} von ${prevCount} Modellen` }
  const snapshot: OrSnapshot = { fetchedAt: nowIso, models: {}, tombstones: { ...(prev?.tombstones ?? {}) } }
  const knownIds = new Set(Object.values(prev?.models ?? {}).map(m => m.id))
  const knownPrefixes = new Set(Object.values(prev?.models ?? {}).map(m => m.id.split('/')[0]))
  const events: OrEvent[] = []
  const today = berlinYmd(now)
  for (const m of models) {
    const old = prev?.models[m.slug]
    snapshot.models[m.slug] = { id: m.id, priceIn: m.priceIn, priceOut: m.priceOut, expires: m.expires, firstSeen: old?.firstSeen ?? nowIso, created: m.created }
    if (!prev) continue
    const alias = orgFromPrefix(m.prefix)
    if (!old && !knownIds.has(m.id)) {
      const relisted = now.getTime() / 1000 - m.created > 14 * 24 * 3600 || snapshot.tombstones[m.slug]
      if (relisted) continue
      if (!knownPrefixes.has(m.prefix) && !alias) {
        events.push({ kind: 'prefix', model: m, clusterKey: `${m.prefix.replace(/[^a-z0-9]+/g, '-')}-openrouter-debut`.replace(/^-+/, ''), title: `Neuer Anbieter bei OpenRouter: ${m.prefix} (${m.name})`, detail: `Erstes Modell des Anbieters ${m.prefix} bei OpenRouter.` })
      } else {
        const org = alias?.org ?? m.prefix
        events.push({ kind: 'new', model: m, org, clusterKey: `${org}-${family(m.id)}-release`.split('-').slice(0, 8).join('-'), title: `Neu bei OpenRouter: ${m.name}`, detail: `${m.name} ist neu bei OpenRouter verfügbar${m.ctx ? `, Kontext ${Math.round(m.ctx / 1000)}K Token` : ''}${m.priceIn ? `, ${m.priceIn.toFixed(2)} $ / ${m.priceOut.toFixed(2)} $ je 1 Mio. Token` : ''}.` })
      }
      continue
    }
    if (!old || !alias) continue
    // Preis: nur Watchlist-Orgs, nur Closed-Modelle, ab ±10 %
    const changed = (a: number, b: number) => a > 0 && b > 0 && Math.abs(a - b) / b >= 0.1
    if (m.hf === null && (changed(m.priceIn, old.priceIn) || changed(m.priceOut, old.priceOut))) {
      events.push({ kind: 'price', model: m, org: alias.org, clusterKey: modelEventKey(alias.org, m.id, 'price', today), title: `${alias.displayName} ändert den Preis von ${m.name}`, detail: `Neu ${m.priceIn.toFixed(2)} $ / ${m.priceOut.toFixed(2)} $ je 1 Mio. Token (vorher ${old.priceIn.toFixed(2)} $ / ${old.priceOut.toFixed(2)} $), laut OpenRouter.` })
    }
    if (m.expires && m.expires !== old.expires) {
      events.push({ kind: 'deprecation', model: m, org: alias.org, clusterKey: modelEventKey(alias.org, m.id, 'deprecation'), title: `OpenRouter nimmt ${m.name} am ${m.expires} aus dem Angebot`, detail: `Abschaltdatum laut OpenRouter: ${m.expires}.` })
    }
  }
  // Grabsteine für entfernte Slugs (90 Tage)
  for (const slug of Object.keys(prev?.models ?? {})) if (!snapshot.models[slug]) snapshot.tombstones[slug] = nowIso
  for (const [slug, t] of Object.entries(snapshot.tombstones)) if (now.getTime() - Date.parse(t) > 90 * 24 * HOUR) delete snapshot.tombstones[slug]
  // Massenfall: > 15 neue → ein Sammelkandidat
  const fresh = events.filter(e => e.kind === 'new' || e.kind === 'prefix')
  if (fresh.length > 15) {
    return { events: [...events.filter(e => e.kind !== 'new' && e.kind !== 'prefix'), { kind: 'new', model: fresh[0]!.model, clusterKey: `openrouter-catalog-update-${today.replace(/-/g, '')}`, title: `OpenRouter listet ${fresh.length} neue Modelle`, detail: fresh.slice(0, 10).map(e => e.model.name).join(', ') }], snapshot }
  }
  return { events, snapshot }
}

// Abschaltdaten der Watchlist-Orgs für build-fristen.ts (vollständige Liste künftiger Daten)
export function expirations(models: OrModel[], now: Date, watchOrgs: Set<string> = DEFAULT_WATCH): { sourceUrl: string; items: { provider: string; org: string; model: string; date: string; itemUrl: string }[] } {
  const today = berlinYmd(now)
  const items = models.filter(m => m.expires && m.expires >= today && watchOrgs.has(orgFromPrefix(m.prefix)?.org ?? '')).map(m => {
    const a = orgFromPrefix(m.prefix)!
    return { provider: a.displayName, org: a.org, model: m.id, date: m.expires!, itemUrl: `https://openrouter.ai/${m.id}` }
  })
  return { sourceUrl: 'https://openrouter.ai/', items }
}
