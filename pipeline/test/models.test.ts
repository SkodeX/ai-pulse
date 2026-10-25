// Modell-Detektoren ohne Netz: Schlüssel, OpenRouter-Reduktion und -Diff, Arena-Normalisierung, Watchlist.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { boardsFromRows, baseModel } from '../models/arena.ts'
import type { ArenaState } from '../models/arena.ts'
import { buildModelsFile, buildWatchlist, isoWeek, modelsDue } from '../models/build.ts'
import { modelEventKey, modelSlug } from '../models/keys.ts'
import { diffModels, expirations, family, reduceModels } from '../models/openrouter.ts'
import type { OrModel } from '../models/openrouter.ts'
import { fixture } from './helpers.ts'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+){2,7}$/
const NOW = new Date('2026-10-25T10:00:00Z')
const data = () => (JSON.parse(fixture('models/openrouter-models.json')) as { data: unknown[] }).data

describe('Schlüssel', () => {
  test('modelSlug: OpenRouter und Anbieter-API ergeben denselben Slug, ISO-Datum bleibt', () => {
    assert.equal(modelSlug('anthropic/claude-sonnet-4.5'), 'claude-sonnet-4-5')
    assert.equal(modelSlug('claude-sonnet-4-5-20250929'), 'claude-sonnet-4-5')
    assert.equal(modelSlug('openai/gpt-4o-2024-11-20'), 'gpt-4o-2024-11-20')
    assert.equal(modelSlug('z-ai/glm-4.5:free'), 'glm-4-5')
  })
  test('modelEventKey: Format, Kürzung mit Hash, keine Kollision bei langen Google-Namen', () => {
    const a = modelEventKey('google', 'google/gemini-3.1-flash-lite', 'price', '2026-10-24')
    const b = modelEventKey('google', 'google/gemini-3.1-flash-lite-preview', 'price', '2026-10-24')
    assert.notEqual(a, b)
    for (const k of [a, b, modelEventKey('zai', 'z-ai/glm-4.5', 'deprecation'), modelEventKey('anthropic', 'claude-opus-5-5', 'price', '2026-10-24')]) assert.match(k, SLUG_RE, k)
    assert.equal(modelEventKey('zai', 'z-ai/glm-4.5', 'deprecation'), 'zai-glm-4-5-deprecation')
  })
  test('Familie ohne Größen-/Varianten-Suffix', () => {
    assert.equal(family('qwen/qwen3.8-27b-instruct'), 'qwen3-8')
  })
})

describe('OpenRouter', () => {
  test('Reduktion: ~-Zeiger und Router weg, :free auf Basis, Variante ohne Basis zählt', () => {
    const m = reduceModels(data())
    assert.deepEqual(m.map(x => x.id).sort(), ['anthropic/claude-opus-5.5', 'anthropic/claude-sonnet-4.5', 'poolside/laguna-s-2.1', 'recursive/flint-v1.0', 'z-ai/glm-4.5'])
    const glm = m.find(x => x.id === 'z-ai/glm-4.5')!
    assert.equal(glm.expires, '2026-12-31', 'Basis-Eintrag, nicht die :free-Variante')
    assert.equal(Math.round(glm.priceIn * 100) / 100, 0.6)
    assert.equal(m.find(x => x.id === 'recursive/flint-v1.0')!.priceIn, 0, 'Preis 0 der Variante')
    assert.equal(m.find(x => x.id === 'anthropic/claude-opus-5.5')!.design['models/gamedev'], 1450)
  })

  test('Erster Lauf initialisiert nur; danach neu, Preis, Abschaltung, neuer Präfix', () => {
    const models = reduceModels(data())
    const first = diffModels(models, undefined, NOW)
    assert.deepEqual(first.events, [])
    const prev = structuredClone(first.snapshot)
    delete prev.models['anthropic/claude-opus-5.5-20261001']   // gilt als neu – aber created ist alt → Re-Listung
    prev.models['anthropic/claude-4.5-sonnet-20250929']!.priceIn = 4        // Preis gesunken um 25 %
    prev.models['z-ai/glm-4.5']!.expires = null                              // Abschaltung neu gesetzt
    delete prev.models['recursive/flint-v1.0']                               // neuer Präfix, frisch gelistet
    const later = new Date('2026-10-25T12:00:00Z')
    const r = diffModels(models, prev, later)
    const kinds = r.events.map(e => `${e.kind}:${e.model.id}`).sort()
    assert.deepEqual(kinds, ['deprecation:z-ai/glm-4.5', 'prefix:recursive/flint-v1.0', 'price:anthropic/claude-sonnet-4.5'])
    const price = r.events.find(e => e.kind === 'price')!
    assert.equal(price.clusterKey, 'anthropic-claude-sonnet-4-5-price-20261025')
    assert.equal(r.events.find(e => e.kind === 'deprecation')!.clusterKey, 'zai-glm-4-5-deprecation')
    for (const e of r.events) assert.match(e.clusterKey, SLUG_RE, e.clusterKey)
  })

  test('Plausibilität: weniger als 80 % der Modelle → kein Diff, alter Snapshot bleibt', () => {
    const models = reduceModels(data())
    const first = diffModels(models, undefined, NOW)
    const r = diffModels(models.slice(0, 2), first.snapshot, NOW)
    assert.ok(r.error)
    assert.equal(r.snapshot, first.snapshot)
  })

  test('Abschaltdaten nur für Watchlist-Orgs, ohne :free-Ablauf', () => {
    const e = expirations(reduceModels(data()), NOW)
    assert.deepEqual(e.items.map(i => `${i.org}:${i.model}:${i.date}`), ['zai:z-ai/glm-4.5:2026-12-31'])
    assert.equal(e.items[0]!.itemUrl, 'https://openrouter.ai/z-ai/glm-4.5')
  })
})

describe('Arena und Watchlist', () => {
  const rows = [
    { model_name: 'Claude Opus 5.5 (Max)', organization: 'anthropic', rating: 1806.9, rank: 1n, category: 'overall', leaderboard_publish_date: '2026-10-23' },
    { model_name: 'Claude Opus 5.5 (High)', organization: 'anthropic', rating: 1790, rank: 2n, category: 'overall', leaderboard_publish_date: '2026-10-23' },
    { model_name: 'GPT-6 Astra (Max)', organization: 'openai', rating: 1774.3, rank: 3n, category: 'overall', leaderboard_publish_date: '2026-10-23' },
    { model_name: 'Mystery', organization: '', rating: 1900, rank: 0n, category: 'overall', leaderboard_publish_date: '2026-10-23' },
  ]
  test('BigInt-Ränge, Varianten zusammengefasst, leere Org ignoriert, bester Wert je Org', () => {
    const [b] = boardsFromRows('webdev', rows)
    assert.equal(b!.rows.length, 2)
    assert.equal(b!.rows[0]!.model, 'Claude Opus 5.5')
    assert.equal(b!.rows[0]!.rank, 1)
    assert.deepEqual(b!.orgBest, { anthropic: 1806.9, openai: 1774.3 })
    assert.doesNotThrow(() => JSON.stringify(b))
    assert.equal(baseModel('Gemini 4 Argon (High)'), 'Gemini 4 Argon')
  })

  test('Watchlist: Basis immer dabei, Top-12 aus Arena + AA, Trend ab 2 Plätzen', () => {
    const models = reduceModels(data())
    const arena: ArenaState = { text: { etag: 'x', checkedAt: '', boards: boardsFromRows('text', rows.map(r => ({ ...r, rank: Number(r.rank) }))) } }
    const first = buildWatchlist(models, arena, NOW.toISOString(), { builds: [] }, NOW)
    const orgs = first.file.providers.map(p => p.org)
    for (const o of ['openai', 'anthropic', 'google', 'mistral', 'microsoft']) assert.ok(orgs.includes(o), o)
    assert.equal(first.file.providers[0]!.org, 'anthropic')
    assert.equal(first.file.week, isoWeek(NOW))
    const hist = { builds: [{ date: '2026-10-23', ranks: { anthropic: 5 } }] }
    const second = buildWatchlist(models, arena, NOW.toISOString(), hist, NOW)
    assert.equal(second.file.providers.find(p => p.org === 'anthropic')!.trend, 'up')
  })

  test('models.json: Bestenlisten aus Arena und OpenRouter, Abschaltungen, Tools', () => {
    const models: OrModel[] = reduceModels(data())
    const arena: ArenaState = { webdev: { etag: 'x', checkedAt: '', boards: boardsFromRows('webdev', rows) } }
    const f = buildModelsFile(models, arena, NOW.toISOString(), NOW)
    assert.ok(f.boards.some(b => b.id === 'webdev'))
    assert.ok(f.boards.some(b => b.id === 'gamedev'))
    assert.equal(f.boards.find(b => b.id === 'intel')!.rows[0]!.name, 'Claude Opus 5.5')
    assert.deepEqual(f.expiring.map(e => e.date), ['2026-10-31', '2026-12-31'])
    assert.ok(f.tools.length >= 4)
  })

  test('Takt Mo/Mi/Fr, sonst Nachholen nach 3 Tagen', () => {
    assert.equal(modelsDue(undefined, new Date('2026-10-25T06:07:00Z')), true, 'nie gebaut')
    assert.equal(modelsDue('2026-10-23T06:07:00Z', new Date('2026-10-25T06:07:00Z')), false, 'Sonntag, Freitag gebaut')
    assert.equal(modelsDue('2026-10-23T06:07:00Z', new Date('2026-10-26T06:07:00Z')), true, 'Montag')
    assert.equal(modelsDue('2026-10-26T06:07:00Z', new Date('2026-10-26T12:07:00Z')), false, 'heute schon gebaut')
  })
})
