// Register-Test: eindeutige IDs, gültige Kategorien, Nenner, Fallbacks (unbekannte ID = Warnung, kein Fehler).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCategory } from '../../shared/categories.ts'
import { SOURCES, SOURCE_BY_ID, countsInDenominator } from '../config/sources.ts'

test('IDs eindeutig, kebab-case, GitHub-Regel gh-<name>', () => {
  const ids = SOURCES.map(s => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const s of SOURCES) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, s.id)
    if (s.kind === 'github') {
      assert.ok(s.github, s.id)
      const name = s.github.repo.split('/')[1]!.toLowerCase()
      assert.ok(s.id === `gh-${name}` || s.id === `gh-${s.github.repo.replace('/', '-').toLowerCase()}`, s.id)
    }
  }
})

test('Pflichtfelder und Kategorien', () => {
  for (const s of SOURCES) {
    assert.ok(s.categoryHint.length > 0 && s.categoryHint.every(isCategory), s.id)
    for (const c of Object.values(s.categoryMap ?? {})) assert.ok(isCategory(c), s.id)
    if (s.kind === 'htmldiff') assert.ok(s.html, s.id)
    if (s.kind === 'json') assert.ok(s.adapter, s.id)
    assert.match(s.url, /^https:\/\//, s.id)
  }
})

test('Nenner: 51 Kernquellen (13 GitHub, 2 mit startStatus), 4 fallbackOnly', () => {
  const core = SOURCES.filter(countsInDenominator)
  assert.equal(core.length, 51)
  assert.equal(core.filter(s => s.kind === 'github').length, 13)
  assert.deepEqual(core.filter(s => s.startStatus).map(s => s.id).sort(), ['chatgpt-release-notes', 'xai-sitemap'])
  assert.equal(SOURCES.filter(s => s.fallbackOnly).length, 4)
})

test('Fallbacks nennen existierende IDs (sonst Warnung)', t => {
  for (const s of SOURCES) {
    for (const f of s.fallbacks) {
      if (!SOURCE_BY_ID.has(f)) t.diagnostic(`Warnung: ${s.id} → unbekannte Fallback-ID ${f}`)
      assert.notEqual(f, s.id)
    }
  }
})
