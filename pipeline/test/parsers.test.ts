// Parser-Tests mit gekürzten Fixtures (feed, json, sitemap, htmldiff, github).

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { decodeBody } from '../collect/http.ts'
import { detectShape } from '../collect/parsers/common.ts'
import { parseFeed } from '../collect/parsers/feed.ts'
import { parseGithub } from '../collect/parsers/github.ts'
import { parseHtmlDiff, parseLooseDate, splitSections } from '../collect/parsers/htmldiff.ts'
import { parseJson } from '../collect/parsers/json.ts'
import { locKey, parseSitemap, titleFromSlug } from '../collect/parsers/sitemap.ts'
import { NOW, ctx, fixture, source } from './helpers.ts'

describe('Form am Body erkennen', () => {
  test('feed, sitemap, json, html, other', () => {
    assert.equal(detectShape('﻿<?xml version="1.0"?>\n<!-- x -->\n<rss version="2.0">'), 'feed')
    assert.equal(detectShape('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">'), 'feed')
    assert.equal(detectShape('<?xml version="1.0"?><urlset xmlns="x">'), 'sitemap')
    assert.equal(detectShape('{"hits":[]}'), 'json')
    assert.equal(detectShape('<!DOCTYPE html><html>'), 'html')
    assert.equal(detectShape('hallo'), 'other')
  })

  test('Feed-Quelle liefert HTML → Fehler format', () => {
    const r = parseFeed(ctx('heise-ki', '<!doctype html><html><body>Fehlerseite</body></html>'))
    assert.equal(r.error, 'format')
  })

  test('Zeichensatz ISO-8859-1 aus der XML-Deklaration', () => {
    const latin1 = Uint8Array.from(Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><rss><title>Künstliche Intelligenz</title></rss>', 'latin1'))
    assert.match(decodeBody(latin1, 'application/rss+xml; charset=ISO-8859-1'), /Künstliche/)
    assert.match(decodeBody(latin1, null), /Künstliche/)
  })
})

describe('feed', () => {
  test('heise (Atom, CDATA-Titel, heise+ bleibt bis zum Vorfilter)', () => {
    const r = parseFeed(ctx('heise-ki', fixture('heise-ki.xml')))
    assert.equal(r.error, undefined)
    assert.equal(r.entries.length, 5)
    const first = r.entries[0]!
    assert.equal(first.title, 'OpenAI stellt seine neue Trainingsumgebung vor – ohne Air Gap')
    assert.equal(first.publishedAt, '2026-10-24T11:37:00.000Z')
    assert.match(first.url, /^https:\/\/www\.heise\.de\//)
    assert.match(first.description, /Platzhalter/)
    assert.ok(r.entries.some(e => e.title.startsWith('heise+ |')))
  })

  test('Techmeme-Adapter: Original-URL, Autor im Titel weg, Permalink als Signal', () => {
    const r = parseFeed(ctx('techmeme', fixture('techmeme.xml')))
    const first = r.entries[0]!
    assert.match(first.url, /^https:\/\/www\.bloomberg\.com\/news\/articles\//)
    assert.ok(!/\(Bloomberg\)$/.test(first.title))
    assert.match(first.signals?.techmemeUrl ?? '', /techmeme\.com/)
    assert.ok(r.entries.every(e => !/techmeme\.com/.test(e.url)))
  })

  test('OpenAI: Kategorien aus CDATA', () => {
    const r = parseFeed(ctx('openai-news', fixture('openai-news.xml')))
    assert.equal(r.entries.length, 6)
    assert.ok(r.entries.some(e => e.categories.includes('Security')))
    assert.ok(r.entries.every(e => e.publishedAt))
  })

  test('Feed ohne Items = Fehler empty, nie „keine News"', () => {
    const r = parseFeed(ctx('decoder-de', '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>'))
    assert.equal(r.error, 'empty')
  })

  test('vordatierte Items ohne publishedAt', () => {
    const xml = '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><item><title>Zukunft</title><link>https://example.com/a</link><pubDate>Wed, 16 Dec 2026 10:00:00 GMT</pubDate></item><item><title>Heute</title><link>https://example.com/b</link><pubDate>Sun, 25 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>'
    const r = parseFeed(ctx('decoder-de', xml))
    assert.equal(r.entries[0]!.publishedAt, undefined)
    assert.equal(r.entries[1]!.publishedAt, '2026-10-25T08:00:00.000Z')
  })

  test('datumsloser Feed: Erstlauf Baseline, danach nur neue GUIDs', () => {
    const item = (n: number) => `<item><title>Eintrag ${n}</title><link>https://example.com/${n}</link><guid>g${n}</guid></item>`
    const feed = (ids: number[]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${ids.map(item).join('')}</channel></rss>`
    const first = parseFeed(ctx('decoder-de', feed([1, 2])))
    assert.deepEqual(first.entries, [])
    assert.deepEqual(first.hints, ['baseline'])
    const second = parseFeed(ctx('decoder-de', feed([3, 1, 2]), { snapshot: first.snapshot }))
    assert.deepEqual(second.entries.map(e => e.guid), ['g3'])
  })
})

describe('json', () => {
  test('HN: Felder, Signale, item-Link ohne url', () => {
    const r = parseJson(ctx('hn', fixture('hn.json')))
    assert.equal(r.entries.length, 9)
    const first = r.entries[0]!
    assert.equal(first.guid !== undefined, true)
    assert.equal(first.signals?.hnPoints, 157)
    const noUrl = r.entries.find(e => e.guid === '1')!
    assert.equal(noUrl.url, 'https://news.ycombinator.com/item?id=1')
  })

  test('HN: fehlendes hits[] = format', () => {
    assert.equal(parseJson(ctx('hn', '{"foo":1}')).error, 'format')
  })

  test('HF Daily Papers: Link, Upvotes, publishedAt = submittedOnDailyAt', () => {
    const r = parseJson(ctx('hf-daily-papers', fixture('hf-daily-papers.json')))
    assert.equal(r.entries.length, 6)
    assert.equal(r.entries[0]!.url, 'https://huggingface.co/papers/2610.31329')
    assert.equal(r.entries[0]!.signals?.upvotes, 241)
    assert.equal(r.entries[0]!.publishedAt, '2026-10-23T00:00:00.000Z')
  })

  test('HF Daily Papers: Wochenende [] ist ok', () => {
    const r = parseJson(ctx('hf-daily-papers', '[]'))
    assert.equal(r.error, undefined)
    assert.equal(r.entries.length, 0)
  })

  test('YC: added[], Batch als Signal', () => {
    const r = parseJson(ctx('yc-changes', fixture('yc-changes.json')))
    assert.equal(r.entries.length, 3)
    assert.equal(r.entries[0]!.signals?.batch, 'Fall 2026')
    assert.match(r.entries[0]!.url, /^https:\/\/www\.ycombinator\.com\/companies\//)
  })
})

describe('sitemap', () => {
  test('Erstlauf = Baseline mit pathRe-Filter', async () => {
    const r = await parseSitemap(ctx('anthropic-sitemap', fixture('anthropic-sitemap.xml')))
    assert.deepEqual(r.entries, [])
    assert.deepEqual(r.hints, ['baseline'])
    assert.equal(r.snapshot?.locs?.length, 20)
  })

  test('Set-Diff: neue <loc> wird Eintrag (Titel aus Slug ohne Seitenabruf)', async () => {
    const xml = fixture('anthropic-sitemap.xml')
    const base = await parseSitemap(ctx('anthropic-sitemap', xml))
    const added = xml.replace('</urlset>', '<url><loc>https://www.anthropic.com/news/claude-neu-7</loc><lastmod>2026-10-25T08:00:00.000Z</lastmod></url>\n</urlset>')
    const r = await parseSitemap(ctx('anthropic-sitemap', added, { snapshot: base.snapshot }))
    assert.equal(r.entries.length, 1)
    assert.equal(r.entries[0]!.url, 'https://www.anthropic.com/news/claude-neu-7')
    assert.equal(r.entries[0]!.title, 'Claude neu 7')
    assert.equal(r.entries[0]!.publishedAt, undefined, 'lastmod bei Anthropic ignorieren')
  })

  test('Plausibilität: weniger als 50 % der gespeicherten <loc> = empty', async () => {
    const xml = fixture('anthropic-sitemap.xml')
    const base = await parseSitemap(ctx('anthropic-sitemap', xml))
    const cut = xml.replace(/<url>\s*<loc>https:\/\/www\.anthropic\.com\/(news|research)\/[\s\S]*?<\/url>/g, '')
    const r = await parseSitemap(ctx('anthropic-sitemap', cut, { snapshot: base.snapshot }))
    assert.equal(r.error, 'empty')
  })

  test('Locale-Präfix und www zählen nicht als neue URL; DeepSeek-Datum aus URL', async () => {
    assert.equal(locKey('https://www.anthropic.com/ja/news/x'), locKey('https://anthropic.com/news/x/'))
    assert.equal(titleFromSlug('https://bfl.ai/blog/flux-3-pro'), 'Flux 3 pro')
    const xml = (locs: string[]) => `<?xml version="1.0"?><urlset>${locs.map(l => `<url><loc>${l}</loc></url>`).join('')}</urlset>`
    const base = await parseSitemap(ctx('deepseek-sitemap', xml(['https://api-docs.deepseek.com/news/news261001'])))
    const r = await parseSitemap(ctx('deepseek-sitemap', xml(['https://api-docs.deepseek.com/news/news261001', 'https://api-docs.deepseek.com/news/news261024']), { snapshot: base.snapshot }))
    assert.equal(r.entries[0]!.publishedAt, '2026-10-24T12:00:00.000Z')
  })
})

describe('htmldiff', () => {
  test('Datumsformate', () => {
    assert.equal(parseLooseDate('October 21, 2026'), '2026-10-21')
    assert.equal(parseLooseDate('2026.10.13'), '2026-10-13')
    assert.equal(parseLooseDate('Oct 22', 2026), '2026-10-22')
    assert.equal(parseLooseDate('Sept 3', 2026), '2026-09-03')
    assert.equal(parseLooseDate('Oct 22'), undefined)
  })

  const cases: [string, string, string[], string][] = [
    ['claude-apps-notes', 'claude-apps-notes.html', ['2026-10-21', '2026-10-07', '2026-09-28'], 'Claude Duet research preview for Pro and Max plans'],
    ['gemini-api-changelog', 'gemini-api-changelog.html', ['2026-10-13', '2026-10-08', '2026-10-06'], 'Gemini 4 Argon (gemini-4-argon) generally available (GA): Platzhalter – Originaltext entfernt.'],
    ['openai-api-changelog', 'openai-api-changelog.html', ['2026-10-22', '2026-10-21', '2026-09-30'], 'Released gpt-6-luna in the API – Platzhalter, Originaltext entfernt.'],
    ['gemini-apps-notes', 'gemini-apps-notes.html', ['2026-10-13', '2026-09-30', '2026-09-10'], 'Gemini 4 Argon, our flagship model for complex tasks'],
  ]
  for (const [id, file, dates, firstTitle] of cases) {
    test(`${id}: Abschnitte je Datum, Baseline, neuer Abschnitt`, () => {
      const html = fixture(file)
      assert.deepEqual(splitSections(html, source(id).html!).map(s => s.date), dates)
      const base = parseHtmlDiff(ctx(id, html))
      assert.deepEqual(base.hints, ['baseline'])
      assert.equal(Object.keys(base.snapshot?.sections ?? {}).length, 3)
      // ältesten Abschnitt aus dem Schnappschuss nehmen, neuesten entfernen → neuester gilt als neu
      const snapshot = { ...base.snapshot!, sections: { ...base.snapshot!.sections } }
      delete snapshot.sections[dates[0]!]
      const r = parseHtmlDiff(ctx(id, html, { snapshot }))
      assert.equal(r.entries.length, 1)
      assert.equal(r.entries[0]!.title, firstTitle)
      assert.equal(r.entries[0]!.publishedAt, `${dates[0]}T12:00:00.000Z`)
      assert.match(r.entries[0]!.guid ?? '', new RegExp(`^${dates[0]}#[0-9a-f]{12}$`))
    })
  }

  test('geänderter neuester Abschnitt = Eintrag, geänderter alter Abschnitt nicht', () => {
    const html = fixture('gemini-api-changelog.html')
    const base = parseHtmlDiff(ctx('gemini-api-changelog', html))
    const changedNewest = html.replace('generally available (GA): Platzhalter', 'generally available (GA): neuer Zusatz, Platzhalter')
    const r1 = parseHtmlDiff(ctx('gemini-api-changelog', changedNewest, { snapshot: base.snapshot }))
    assert.equal(r1.entries.length, 1)
    assert.equal(r1.entries[0]!.url, 'https://ai.google.dev/gemini-api/docs/changelog#10-13-2026')
    const changedOld = html.replace('Gemini Nano Banana 2.1', 'Gemini Nano Banana 2.2')
    const r2 = parseHtmlDiff(ctx('gemini-api-changelog', changedOld, { snapshot: base.snapshot }))
    assert.equal(r2.entries.length, 0)
  })

  test('Seite ohne Datumsabschnitt = empty', () => {
    const r = parseHtmlDiff(ctx('gemini-api-changelog', '<!doctype html><html><body><div class="devsite-article-body"><p>leer</p></div></body></html>'))
    assert.equal(r.error, 'empty')
  })
})

describe('github', () => {
  test('Atom: Tags aus der id, Baseline speichert höchste stabile Version', () => {
    const r = parseGithub(ctx('gh-gemini-cli', fixture('gh-gemini-cli.xml')))
    assert.deepEqual(r.entries, [])
    assert.deepEqual(r.hints, ['baseline'])
    assert.deepEqual(r.snapshot?.release, { major: 0, minor: 65, tag: 'v0.65.0' })
  })

  test('Atom: danach alle Releases als Einträge (Filter macht der Vorfilter)', () => {
    const r = parseGithub(ctx('gh-gemini-cli', fixture('gh-gemini-cli.xml'), { snapshot: { release: { major: 0, minor: 64, tag: 'v0.64.0' }, baselineAt: NOW.toISOString() } }))
    assert.equal(r.entries.length, 10)
    assert.equal(r.entries[0]!.title, 'gemini-cli v0.67.0-nightly.20261025.gcd1b45c2d')
    assert.match(r.entries[0]!.url, /\/releases\/tag\//)
    assert.deepEqual(r.snapshot?.release, { major: 0, minor: 65, tag: 'v0.65.0' })
  })

  test('REST: draft verworfen, prerelease-Flag als Signal', () => {
    const json = JSON.stringify([
      { tag_name: 'v2.0.0', draft: true, prerelease: false, html_url: 'https://github.com/a/b/releases/tag/v2.0.0', published_at: '2026-10-25T01:00:00Z', body: 'x' },
      { tag_name: 'v1.9.0', draft: false, prerelease: true, html_url: 'https://github.com/a/b/releases/tag/v1.9.0', published_at: '2026-10-25T00:00:00Z', body: 'Notes' },
      { tag_name: 'v1.8.0', draft: false, prerelease: false, html_url: 'https://github.com/a/b/releases/tag/v1.8.0', published_at: '2026-10-24T00:00:00Z', body: '## Changes\n- Platzhalter' },
    ])
    const r = parseGithub(ctx('gh-ollama', json, { snapshot: { baselineAt: NOW.toISOString() } }))
    assert.deepEqual(r.entries.map(e => e.guid), ['v1.9.0', 'v1.8.0'])
    assert.equal(r.entries[0]!.signals?.prerelease, true)
    assert.deepEqual(r.snapshot?.release, { major: 1, minor: 8, tag: 'v1.8.0' })
  })
})
