// Lauf-Check (Skill lauf-pruefen): Duplikate, Werbung, Score-Regeln, Aufrufzahl, Briefing-Verweise.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Story } from '../../shared/types.ts'
import { checkRun, duplicatePairs } from '../check/check.ts'

const story = (o: Partial<Story>): Story => ({
  id: 'x', clusterKey: 'a-b-c', title: 'T', originalTitle: 'T', url: 'https://example.com', sources: [{ id: 'verge-ai', name: 'Verge', url: 'u', lang: 'de' }],
  category: 'neuigkeiten', tags: [], impact: 5, personal: 5, score: 5, hype: false, paywall: false, firstSeen: '2026-10-27T08:00:00Z', ratedBy: 'claude-haiku-5-5', ...o,
})

test('Duplikate: gleiches Modell, gleicher Schlüsselanfang, kein Fehlalarm bei Floskeln', () => {
  const a = story({ id: '1', clusterKey: 'openai-gpt-6-1-terra-release', category: 'modelle', models: ['GPT-6.1 Terra'], title: 'OpenAI stellt GPT-6.1 Terra vor' })
  const b = story({ id: '2', clusterKey: 'github-copilot-gpt-6-1-terra-availability', category: 'modelle', models: ['GPT-6.1 Terra'], title: 'GitHub Copilot: GPT-6.1 Terra allgemein verfügbar' })
  const c = story({ id: '3', clusterKey: 'github-copilot-assisted-permissions-ga', category: 'opensource', title: 'GitHub Copilot: Assisted Permissions allgemein verfügbar' })
  const d = story({ id: '4', clusterKey: 'anthropic-ipo-s1-filing', category: 'funding', title: 'Anthropic reicht Börsenantrag ein' })
  const e = story({ id: '5', clusterKey: 'anthropic-ipo-governance-structure', category: 'funding', title: 'Nachfolgelisten im S-1' })
  const pairs = duplicatePairs([a, b, c, d, e]).map(([x, y]) => `${x.id}${y.id}`)
  assert.deepEqual(pairs.sort(), ['12', '45'])
  // Lauf 2026-10-31: verschiedene Copilot-Funktionen sind kein Duplikat, zwei Meldungen zu Copilot Fusion schon
  const f1 = story({ id: '6', clusterKey: 'github-copilot-plugin-controls-ga', category: 'opensource', title: 'Plugin-Standards' })
  const f2 = story({ id: '7', clusterKey: 'github-copilot-shared-automations-rollout', category: 'opensource', title: 'Geteilte Automations' })
  const f3 = story({ id: '8', clusterKey: 'github-copilot-fusion-general-availability', category: 'opensource', title: 'Fusion GA' })
  const f4 = story({ id: '9', clusterKey: 'github-copilot-fusion-local-model-routing', category: 'opensource', title: 'Fusion lokal' })
  assert.deepEqual(duplicatePairs([f1, f2, f3, f4]).map(([x, y]) => `${x.id}${y.id}`), ['89'])
})

test('Befunde: Werbung, Score, Hype, Aufrufe, Briefing-Verweis', () => {
  const r = checkRun({
    latest: { generatedAt: '2026-10-27T08:00:00Z', buildId: 'b', run: 'morning', stories: [
      story({ id: 'ad', originalTitle: 'heise-Angebot: iX-Workshop', title: 'Workshop' }),
      story({ id: 's', impact: 8, personal: 4, score: 7 }),
      story({ id: 'h', hype: true, impact: 7, personal: 5, score: 6 }),
    ] },
    briefing: { generatedAt: '2026-10-27T08:05:00Z', kind: 'morning', model: 'claude-opus-5-5', title: 'B', intro: 'i', items: [{ storyId: 'fehlt', text: 't' }] },
    usage: Array.from({ length: 9 }, () => ({ ts: '2026-10-27T08:01:00Z', stage: 'triage', model: 'm', inputTokens: 1, outputTokens: 1, ok: true })),
  })
  const checks = r.findings.map(f => `${f.check}:${f.severity}`)
  for (const c of ['werbung:warnung', 'scores:fehler', 'aufrufe:fehler', 'briefing:fehler']) assert.ok(checks.includes(c), c)
  assert.equal(r.findings.filter(f => f.check === 'scores').length, 2)
})

test('Rückschritt: bestehende Story verliert Quellen, firstSeen oder Zusammenfassung', () => {
  const before = story({ id: 'ipo', firstSeen: '2026-10-27T08:27:00Z', summary: 'S', sources: [{ id: 'hn', name: 'HN', url: 'a', lang: 'en' }, { id: 'heise-ki', name: 'heise', url: 'b', lang: 'de' }] })
  const after = story({ id: 'ipo', firstSeen: '2026-10-27T09:01:00Z' })
  const r = checkRun({ latest: { generatedAt: '2026-10-27T09:01:00Z', buildId: 'b2', run: 'morning', stories: [after] }, previous: { generatedAt: '2026-10-27T08:27:00Z', buildId: 'b1', run: 'morning', stories: [before] }, usage: [] })
  assert.equal(r.findings.filter(f => f.check === 'rueckschritt').length, 3)
})
