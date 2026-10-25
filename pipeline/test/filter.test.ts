// Vorfilter-Tests: AI_RE, Verwerfungsgründe in der Reihenfolge aus Skill quellen § 7.

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { AI_RE } from '../config/keywords.ts'
import type { PrefilterContext } from '../filter/prefilter.ts'
import { prefilter } from '../filter/prefilter.ts'
import { isPrerelease, parseVersion } from '../filter/releases.ts'
import type { ParsedEntry } from '../types.ts'
import { NOW, entry } from './helpers.ts'

function run(entries: ParsedEntry[], over: Partial<PrefilterContext> = {}) {
  return prefilter(entries, { now: NOW, firstSeen: NOW.toISOString(), seen: {}, prevReleases: new Map(), ...over })
}

describe('AI_RE', () => {
  const hits = [
    'KI-Agenten übernehmen den Kundendienst', 'Studie zu künstlicher Intelligenz', 'GenAI startup raises $20M', 'EU AI Act tritt in Kraft',
    'grok-4.7 is out', 'Five Qwen3.8-27B models match Fable 5', 'GLM5 beats benchmarks', 'Llama4 Scout on a laptop',
    'Prompt injection in coding agents', 'Neue Inferenz-Chips von Nvidia', 'Mistral Large 3 released', 'Running MCP servers locally',
  ]
  const misses = [
    'FBI agent arrested', 'Agentur für Arbeit meldet Zahlen', 'Ein Prompt für alles', 'Multimodale Mobilität in Städten',
    'Moonshot project for fusion', 'Small Programs and Languages', 'Instagram launches an Apple TV app', 'Transformers: Rise of the Beasts review',
  ]
  test('Treffer', () => { for (const t of hits) assert.ok(AI_RE.test(t), t) })
  test('Fehltreffer bleiben draußen', () => { for (const t of misses) assert.ok(!AI_RE.test(t), t) })
})

describe('Vorfilter', () => {
  test('Altersfenster 72 h', () => {
    const r = run([entry('techcrunch-ai', { publishedAt: '2026-10-21T08:00:00Z' }), entry('techcrunch-ai')])
    assert.equal(r.items.length, 1)
    assert.equal(r.drops['techcrunch-ai']?.age, 1)
  })

  test('Dedupe nur je (sourceId, key): gleiche URL aus zwei Quellen bleibt', () => {
    const url = 'https://example.com/story?utm_source=x'
    const r = run([entry('techcrunch-ai', { url }), entry('techcrunch-ai', { url: 'https://www.example.com/story' }), entry('verge-ai', { url })])
    assert.equal(r.items.length, 2)
    assert.equal(r.drops['techcrunch-ai']?.dupe, 1)
    assert.equal(r.items[0]!.key, r.items[1]!.key)
  })

  test('seen: ohne storyId verwerfen, mit storyId durchreichen', () => {
    const a = entry('techcrunch-ai', { url: 'https://example.com/a' })
    const b = entry('techcrunch-ai', { url: 'https://example.com/b', title: 'Sport-Ergebnisse vom Wochenende' })
    const first = run([a, b])
    const keyA = first.annotated[0]!.key
    const keyB = first.annotated[1]!.key
    const r = run([a, b], { seen: { [keyA]: { firstSeen: NOW.toISOString() }, [keyB]: { firstSeen: NOW.toISOString(), storyId: 'abc123abc123' } } })
    assert.equal(r.drops['techcrunch-ai']?.seen, 1)
    assert.equal(r.items.length, 1)
    assert.equal(r.items[0]!.seenStoryId, 'abc123abc123', 'seen mit Story überspringt den Keyword-Filter')
  })

  test('Sponsor/Anzeige und Paywall-Marker', () => {
    const r = run([
      entry('golem-ki', { title: 'Anzeige: Sechs IT-Jobs in Datenanalyse' }),
      entry('heise-ki', { title: 'heise+ | Grenzen lokaler KI: Was iPhone und Pixel leisten' }),
      entry('techcrunch-ai', { title: 'AI report', author: 'MIT Technology Review Insights' }),
    ])
    assert.equal(r.drops['golem-ki']?.sponsor, 1)
    assert.equal(r.drops['techcrunch-ai']?.sponsor, 1)
    const heise = r.items.find(i => i.sourceId === 'heise-ki')!
    assert.equal(heise.paywall, true)
    assert.equal(heise.title, 'Grenzen lokaler KI: Was iPhone und Pixel leisten')
  })

  test('Keyword-Filter auf Titel + Kategorien + Beschreibung, nur bei aiOnly false', () => {
    const r = run([
      entry('simonw', { title: 'Weeknotes', description: 'Notes on running Claude with tools' }),
      entry('simonw', { title: 'Weeknotes 2', description: 'Gardening' }),
      entry('techcrunch-ai', { title: 'Robotaxi expands', categories: ['AI'] }),
      entry('golem-ki', { title: 'Bio-Robotik: Muskel kann springen' }),
    ])
    assert.equal(r.drops['simonw']?.keyword, 1)
    assert.ok(r.items.some(i => i.sourceId === 'techcrunch-ai'))
    assert.ok(r.items.some(i => i.sourceId === 'golem-ki'), 'aiOnly-Quelle ohne Keyword-Filter')
  })

  test('filter.include ersetzt AI_RE (Meta Newsroom)', () => {
    const r = run([entry('meta-newsroom', { title: 'Introducing Muse Spark' }), entry('meta-newsroom', { title: 'New Instagram feature for teens' })])
    assert.equal(r.items.length, 1)
    assert.equal(r.drops['meta-newsroom']?.keyword, 1)
  })

  test('categoryMap-Treffer zuerst', () => {
    const r = run([entry('openai-news', { categories: ['Security'] })])
    assert.deepEqual(r.items[0]!.categoryHint, ['sicherheit', 'neuigkeiten'])
  })

  test('Quellenregeln: HN > 100, HF ≥ 30, YC nur aktuelle Batches', () => {
    const r = run([
      entry('hn', { guid: '1', title: 'OpenAI ships agents', signals: { hnPoints: 100 } }),
      entry('hn', { guid: '2', title: 'OpenAI ships agents 2', signals: { hnPoints: 101 } }),
      entry('hf-daily-papers', { signals: { upvotes: 29 } }),
      entry('hf-daily-papers', { signals: { upvotes: 30 } }),
      entry('yc-changes', { title: 'AltFirma: AI platform', signals: { batch: 'Summer 2018' } }),
      entry('yc-changes', { title: 'Vouch: The AI wealth manager', signals: { batch: 'Fall 2026' } }),
    ])
    assert.equal(r.drops['hn']?.rule, 1)
    assert.equal(r.drops['hf-daily-papers']?.rule, 1)
    assert.equal(r.drops['yc-changes']?.rule, 1)
    assert.equal(r.items.length, 3)
    assert.equal(r.items.find(i => i.sourceId === 'hn')!.key, 'hn:2')
  })

  test('Releases: Vorabversionen, Linie, nur Sprung, nur höchste Version', () => {
    const rel = (tag: string, extra: Partial<ParsedEntry> = {}) => entry('gh-n8n', { guid: tag, title: `n8n ${tag}`, url: `https://github.com/n8n-io/n8n/releases/tag/${tag}`, ...extra })
    const r = run([rel('n8n@2.47.0'), rel('n8n@2.46.1'), rel('n8n@2.45.9'), rel('n8n@1.99.0'), rel('n8n@2.48.0-rc.1'), rel('n8n@2.48.0', { signals: { prerelease: true } })], {
      prevReleases: new Map([['gh-n8n', { major: 2, minor: 45, tag: 'n8n@2.45.3' }]]),
    })
    assert.equal(r.items.length, 1)
    assert.equal(r.items[0]!.key, 'gh:n8n-io/n8n@2.47')
    assert.equal(r.drops['gh-n8n']?.prerelease, 2)
    assert.equal(r.drops['gh-n8n']?.version, 3)
  })

  test('Releases: Vorabversion oder fremde Linie derselben Minor-Version verdrängt das stabile Release nicht', () => {
    const rel = (id: string, tag: string) => entry(id, { guid: tag, title: tag, url: `https://github.com/x/y/releases/tag/${tag}` })
    const r = run([rel('gh-n8n', 'n8n@2.48.1-rc.1'), rel('gh-n8n', 'n8n@2.48.0'), rel('gh-langchain', 'langchain-text-splitters==1.8.0'), rel('gh-langchain', 'langchain-core==1.8.0')], {
      prevReleases: new Map([['gh-n8n', { major: 2, minor: 47, tag: 'n8n@2.47.0' }], ['gh-langchain', { major: 1, minor: 7, tag: 'langchain-core==1.7.0' }]]),
    })
    assert.deepEqual(r.items.map(i => i.key).sort(), ['gh:langchain-ai/langchain@1.8', 'gh:n8n-io/n8n@2.48'])
    assert.equal(r.items.find(i => i.sourceId === 'gh-n8n')!.url, 'https://github.com/x/y/releases/tag/n8n@2.48.0')
  })

  test('Prerelease-Regex und Versionsparser', () => {
    assert.ok(isPrerelease(entry('gh-vllm', { guid: 'v0.32.0rc3', title: 'vllm v0.32.0rc3' })))
    assert.ok(isPrerelease(entry('gh-gemini-cli', { guid: 'v0.67.0-nightly.20261025.gcd1b45c2d', title: 'x' })))
    assert.ok(!isPrerelease(entry('gh-ollama', { guid: 'v0.40.11', title: 'ollama v0.40.11' })))
    assert.deepEqual(parseVersion('rust-v0.164.0'), { major: 0, minor: 164, tag: 'rust-v0.164.0' })
    assert.deepEqual(parseVersion('langchain-core==1.7.0'), { major: 1, minor: 7, tag: 'langchain-core==1.7.0' })
    assert.deepEqual(parseVersion('n8n@2.45.3'), { major: 2, minor: 45, tag: 'n8n@2.45.3' })
  })

  test('Flutbremse: höchstens 25 neue je Quelle, neueste zuerst', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry('heise-ki', { publishedAt: new Date(NOW.getTime() - (i + 1) * 60_000).toISOString() }))
    const r = run(many)
    assert.equal(r.items.length, 25)
    assert.equal(r.drops['heise-ki']?.flood, 5)
    assert.deepEqual(r.hints['heise-ki'], ['flood'])
    assert.equal(r.items[0]!.publishedAt, many[0]!.publishedAt)
  })

  test('RawItem: Teaser ≤ 300 Zeichen, canonicalUrl, firstSeen', () => {
    const r = run([entry('decoder-de', { url: 'https://www.the-decoder.de/x/?utm_source=rss', description: 'Wort '.repeat(200) })])
    const i = r.items[0]!
    assert.ok(i.teaser.length <= 300)
    assert.equal(i.canonicalUrl, 'https://the-decoder.de/x')
    assert.equal(i.url, 'https://www.the-decoder.de/x/?utm_source=rss')
    assert.equal(i.firstSeen, NOW.toISOString())
    assert.equal(i.lang, 'de')
  })
})
