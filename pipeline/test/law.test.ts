// Fristen und Statusmodell ohne Netz (Skill gesetze-und-fristen).

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { FristenFile } from '../../shared/types.ts'
import { buildFristen } from '../law/build-fristen.ts'
import { CURATED_FRISTEN } from '../law/fristen.ts'
import { lawRank, mergeLawStatus } from '../law/status.ts'

const NOW = new Date('2026-10-25T10:00:00Z')
const or = (items: { org: string; model: string; date: string }[]) => ({ sourceUrl: 'https://openrouter.ai/', items: items.map(i => ({ ...i, provider: i.org.toUpperCase(), itemUrl: `https://openrouter.ai/${i.model}` })) })

describe('Statusmodell', () => {
  test('Ränge und Monotonie', () => {
    assert.ok(lawRank('in_kraft')! > lawRank('verkuendet')!)
    assert.equal(mergeLawStatus('in_kraft', 'entwurf', 'meldung'), 'in_kraft')
    assert.equal(mergeLawStatus('verhandlung', 'angenommen', 'meldung'), 'angenommen')
    assert.equal(mergeLawStatus('verhandlung', 'gescheitert', 'meldung'), 'verhandlung')
    assert.equal(mergeLawStatus('verhandlung', 'gescheitert', 'quelle'), 'gescheitert')
  })
})

describe('build-fristen', () => {
  test('Kuratierte Startliste: gültige Daten, keine geratenen, sortiert, null ans Ende', () => {
    const f = buildFristen(undefined, CURATED_FRISTEN, { models: [] }, NOW)
    for (const x of f.items) assert.ok(x.date === null || /^\d{4}-\d{2}-\d{2}$/.test(x.date), x.id)
    const dates = f.items.map(x => x.date ?? '9999')
    assert.deepEqual(dates, [...dates].sort())
    assert.equal(f.items[f.items.length - 1]!.date, null)
    assert.equal(new Set(f.items.map(x => x.id)).size, f.items.length)
    for (const x of f.items) if (x.kind === 'gesetz') assert.ok(x.jurisdiction, x.id)
  })

  test('Status wird am Stichtag angehoben', () => {
    const later = new Date('2027-01-02T10:00:00Z')
    const f = buildFristen(undefined, CURATED_FRISTEN, { models: [] }, later)
    assert.equal(f.items.find(x => x.id === 'us-co-admt-act')!.status, 'in_kraft')
    assert.equal(f.items.find(x => x.id === 'eu-ai-act-neue-verbote')!.status, 'gilt_ab')
  })

  test('Modell-Abschaltungen: je Org und Tag gruppiert, Verschiebung und Rücknahme wandern mit', () => {
    const first = buildFristen(undefined, [], { models: [or([{ org: 'zai', model: 'z-ai/glm-4.5', date: '2026-12-31' }, { org: 'zai', model: 'z-ai/glm-4.5-air', date: '2026-12-31' }, { org: 'xai', model: 'x-ai/grok-3', date: '2026-10-20' }])] }, NOW)
    assert.equal(first.items.length, 1, 'vergangenes Datum ergibt keinen Eintrag')
    const e = first.items[0]!
    assert.equal(e.id, 'modell-zai-2026-12-31')
    assert.deepEqual(e.models, ['z-ai/glm-4.5', 'z-ai/glm-4.5-air'])
    assert.match(e.title, /^OpenRouter nimmt 2 Modelle/)
    assert.equal(e.origin, 'automatisch')
    const moved = buildFristen(first, [], { models: [or([{ org: 'zai', model: 'z-ai/glm-4.5', date: '2027-01-15' }])] }, NOW)
    assert.deepEqual(moved.items.map(x => x.id), ['modell-zai-2027-01-15'])
    const withdrawn = buildFristen(moved, [], { models: [or([])] }, NOW)
    assert.deepEqual(withdrawn.items, [])
  })

  test('Ohne Übergabe bleiben automatische Einträge; 30 Tage nach Datum werden sie entfernt', () => {
    const base: FristenFile = buildFristen(undefined, [], { models: [or([{ org: 'zai', model: 'z-ai/glm-4.5', date: '2026-12-31' }])] }, NOW)
    assert.equal(buildFristen(base, [], { models: [] }, NOW).items.length, 1)
    assert.equal(buildFristen(base, [], { models: [] }, new Date('2027-02-15T10:00:00Z')).items.length, 0)
  })
})
