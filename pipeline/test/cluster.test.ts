// Clustering-Tests (Skill bewertung, references/clustering.md → Tests Phase 1).

import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { clusterItems, markShadowSeen, pickPrimary, storyIdOf } from '../cluster/cluster.ts'
import { overlap, similarTitles, titleTokens } from '../cluster/title.ts'
import { loadState, prepareShadow, saveState } from '../state.ts'
import { NOW, item } from './helpers.ts'

describe('Titel', () => {
  test('Versionstoken bleibt ganz, Stoppwörter (auch „für") fallen, Suffixe verschwinden', () => {
    const t = titleTokens('OpenAI stellt gpt-5.5 für Entwickler vor | heise online')
    assert.ok(t.has('gpt-5.5'))
    assert.ok(!t.has('fur') && !t.has('für'))
    assert.ok(!t.has('heise') && !t.has('online'))
    assert.ok(titleTokens('Anthropic bringt Claude 6 - The Decoder').has('anthropic'))
    assert.ok(!titleTokens('Anthropic bringt Claude 6 - The Decoder').has('decoder'))
  })

  test('Diakritika werden gefaltet', () => {
    assert.ok(titleTokens('Künstliche Intelligenz überall').has('kunstliche'))
  })

  test('Jaccard knapp über/unter 0,5 und Mindestzahl gemeinsamer Token', () => {
    const a = new Set(['openai', 'releases', 'model', 'agents'])
    const above = new Set(['openai', 'releases', 'model', 'today'])        // 3/5 = 0,6
    const below = new Set(['openai', 'releases', 'model', 'today', 'big', 'news'])  // 3/7 ≈ 0,43
    assert.ok(similarTitles(a, above))
    assert.ok(!similarTitles(a, below))
    const two = new Set(['openai', 'releases'])
    assert.equal(overlap(two, new Set(['openai', 'releases'])).jaccard, 1)
    assert.ok(!similarTitles(two, new Set(['openai', 'releases'])), 'nur 2 gemeinsame Token → kein Merge')
  })
})

describe('Cluster', () => {
  test('gleiche canonicalUrl aus zwei Quellen → ein Cluster mit zwei Häusern', () => {
    const url = 'https://example.com/story'
    const { clusters } = clusterItems([item('techcrunch-ai', { url, title: 'Alpha' }), item('techmeme', { url, title: 'Beta' })], NOW)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0]!.signals.independentSources, 2)
    assert.equal(clusters[0]!.signals.techmeme, true)
    assert.match(clusters[0]!.clusterKey, /^u-[0-9a-f]{12}$/)
  })

  test('Union-Find ist transitiv (A≈B, B≈C)', () => {
    const items = [
      item('techcrunch-ai', { title: 'Anthropic launches Claude Opus coding agent' }),
      item('verge-ai', { title: 'Anthropic launches Claude Opus today worldwide' }),
      item('scmp-tech', { title: 'Claude Opus today worldwide pricing Europe' }),
    ]
    assert.ok(!similarTitles(titleTokens(items[0]!.title), titleTokens(items[2]!.title)), 'A und C allein reichen nicht')
    const { clusters } = clusterItems(items, NOW)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0]!.items.length, 3)
  })

  test('Paare außerhalb von 72 h werden nicht verglichen', () => {
    const items = [
      item('techcrunch-ai', { title: 'Anthropic launches Claude Opus model', publishedAt: '2026-10-25T08:00:00Z' }),
      item('verge-ai', { title: 'Anthropic launches Claude Opus model', publishedAt: '2026-10-21T07:00:00Z' }),
    ]
    assert.equal(clusterItems(items, NOW).clusters.length, 2)
  })

  test('Primärquelle: offizielle Quelle rückt vor die Presse, Gleichstand → früheste', () => {
    const press = item('techcrunch-ai', { publishedAt: '2026-10-25T06:00:00Z' })
    const official = item('openai-news', { publishedAt: '2026-10-25T07:00:00Z' })
    assert.equal(pickPrimary([press, official]), official)
    const early = item('verge-ai', { publishedAt: '2026-10-25T05:00:00Z' })
    const late = item('techcrunch-ai', { publishedAt: '2026-10-25T06:00:00Z' })
    assert.equal(pickPrimary([late, early]), early)
    const url = 'https://openai.com/index/x'
    const { clusters } = clusterItems([item('techcrunch-ai', { url, title: 'A' }), item('openai-news', { url, title: 'B' })], NOW)
    assert.equal(clusters[0]!.sources[0]!.id, 'openai-news')
  })

  test('vorgegebene clusterKeys werden nie zusammengelegt', () => {
    const url = 'https://example.com/same'
    const { clusters } = clusterItems([item('techcrunch-ai', { url, clusterKey: 'sec:a' }), item('verge-ai', { url, clusterKey: 'sec:b' })], NOW)
    assert.equal(clusters.length, 2)
    assert.deepEqual(clusters.map(c => c.clusterKey).sort(), ['sec:a', 'sec:b'])
  })

  test('seenStoryId ohne Abgleich-Basis → verworfen (Phase 1)', () => {
    const r = clusterItems([item('techcrunch-ai', { seenStoryId: 'abc' }), item('verge-ai')], NOW)
    assert.equal(r.seenDropped, 1)
    assert.equal(r.clusters.length, 1)
  })

  test('Signale: Maximum der HN-Punkte, publishedAt nie in der Zukunft', () => {
    const url = 'https://example.com/x'
    const { clusters } = clusterItems([
      item('hn', { url, signals: { hnPoints: 120 }, publishedAt: '2026-10-25T12:00:00Z' }),
      item('hn-show', { url, signals: { hnPoints: 300 } }),
    ], NOW)
    assert.equal(clusters[0]!.signals.hnPoints, 300)
    assert.equal(clusters[0]!.signals.independentSources, 1, 'hn und hn-show sind ein Haus')
    assert.ok(clusters[0]!.publishedAt! <= NOW.toISOString())
  })
})

describe('Schatten-seen', () => {
  test('nach Lauf 1 enthält seen alle Items der Cluster mit storyId; firstSeen bleibt', () => {
    const url = 'https://example.com/y'
    const a = item('techcrunch-ai', { url, key: 'aaaaaaaaaaaa' })
    const b = item('verge-ai', { url, key: 'aaaaaaaaaaaa' })
    const c = item('decoder-de', { key: 'cccccccccccc', title: 'Anderes Thema' })
    const { clusters } = clusterItems([a, b, c], NOW)
    const seen = markShadowSeen({ cccccccccccc: { firstSeen: '2026-10-20T00:00:00.000Z' } }, clusters)
    assert.deepEqual(Object.keys(seen).sort(), ['aaaaaaaaaaaa', 'cccccccccccc'])
    assert.equal(seen['aaaaaaaaaaaa']!.storyId, storyIdOf(clusters.find(x => x.items.includes(a))!))
    assert.equal(seen['cccccccccccc']!.firstSeen, '2026-10-20T00:00:00.000Z')
  })

  test('--fresh leert den Schatten-State, sonst Kopie aus state/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aipulse-'))
    const stateDir = join(root, 'state')
    const shadow = join(root, 'shadow')
    await saveState(stateDir, { httpCache: {}, sourceState: {}, health: { updatedAt: '', sources: {} }, seen: { k1: { firstSeen: NOW.toISOString() } } }, NOW)
    await prepareShadow(false, shadow, stateDir)
    assert.deepEqual(Object.keys((await loadState(shadow)).seen), ['k1'])
    await writeFile(join(shadow, 'seen.json'), JSON.stringify({ k1: { firstSeen: NOW.toISOString() }, k2: { firstSeen: NOW.toISOString() } }))
    await prepareShadow(false, shadow, stateDir)
    assert.equal(Object.keys(JSON.parse(await readFile(join(shadow, 'seen.json'), 'utf8'))).length, 2, 'bestehender Schatten bleibt')
    await prepareShadow(true, shadow, stateDir)
    assert.deepEqual((await loadState(shadow)).seen, {})
  })

  test('seen: TTL 30 Tage beim Schreiben', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aipulse-'))
    await saveState(root, { httpCache: {}, sourceState: {}, health: { updatedAt: '', sources: {} }, seen: { alt: { firstSeen: '2026-09-01T00:00:00Z' }, neu: { firstSeen: '2026-10-20T00:00:00Z' } } }, NOW)
    assert.deepEqual(Object.keys((await loadState(root)).seen), ['neu'])
  })
})
