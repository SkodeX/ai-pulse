// Abruf-Schicht, Health, Fallback-Ketten und robots.txt – mit gemocktem fetch, ohne Netz.

import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { collect, resolveUrl } from '../collect/collect.ts'
import type { HealthEntry } from '../collect/health.ts'
import { applyAttempt, isDue } from '../collect/health.ts'
import { detectBlock, httpFetch } from '../collect/http.ts'
import { isAllowed, parseRobots } from '../collect/robots.ts'
import { USER_AGENT } from '../../shared/config.ts'
import { NOW, fixture, source } from './helpers.ts'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>
function mockFetch(handler: Handler): string[] {
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    calls.push(url)
    return handler(url, init ?? {})
  }) as typeof fetch
  return calls
}

const xml = (body: string, headers: Record<string, string> = {}) => new Response(body, { status: 200, headers: { 'content-type': 'application/xml', ...headers } })

describe('Challenge-Erkennung', () => {
  const h = (o: Record<string, string> = {}) => new Headers(o)
  test('Header vor Status vor Text', () => {
    assert.equal(detectBlock(403, h({ 'cf-mitigated': 'challenge' }), '', 9_900, 'https://help.openai.com/x'), 'blocked')
    assert.equal(detectBlock(200, h({ 'x-vercel-mitigated': 'challenge' }), '', 100, 'https://a.com'), 'blocked')
    assert.equal(detectBlock(403, h(), '<title>Attention Required!</title>', 5_500, 'https://x.ai/sitemap.xml'), 'blocked')
    assert.equal(detectBlock(401, h(), '<script src="https://ct.captcha-delivery.com/c.js">', 2_000, 'https://a.com'), 'blocked')
    assert.equal(detectBlock(200, h(), '<html>Just a moment...</html>', 3_000, 'https://a.com'), 'blocked')
  })
  test('challenge-platform in normaler großer Seite ist kein Block; GitHub-Ratelimit ist kein Block', () => {
    assert.equal(detectBlock(200, h(), '<script src="/cdn-cgi/challenge-platform/x.js"></script>' + 'x'.repeat(20_000), 20_100, 'https://openai.com/policies'), undefined)
    assert.equal(detectBlock(403, h({ 'x-ratelimit-remaining': '0' }), '{}', 2, 'https://api.github.com/repos/a/b/releases'), 'rate-limit')
  })
})

describe('httpFetch', () => {
  test('ehrlicher UA, Conditional GET, 304 = unverändert', async () => {
    let seen: Headers | undefined
    mockFetch((_url, init) => {
      seen = new Headers(init.headers)
      return new Response(null, { status: 304 })
    })
    const r = await httpFetch({ url: 'https://example.com/feed', accept: 'application/xml', cache: { etag: '"abc"', lastModified: 'Sat, 24 Oct 2026 10:35:42 GMT', checkedAt: '' } })
    assert.equal(seen?.get('user-agent'), USER_AGENT)
    assert.equal(seen?.get('if-none-match'), '"abc"')
    assert.equal(seen?.get('if-modified-since'), 'Sat, 24 Oct 2026 10:35:42 GMT')
    assert.ok(r.ok && r.notModified)
  })

  test('ohne Validatoren: gleicher Body-Hash = nicht parsen', async () => {
    mockFetch(() => xml('<rss/>'))
    const first = await httpFetch({ url: 'https://example.com/feed', accept: 'x' })
    assert.ok(first.ok && !first.notModified && first.cache?.contentHash)
    const second = await httpFetch({ url: 'https://example.com/feed', accept: 'x', cache: first.cache })
    assert.ok(second.notModified)
  })

  test('1 Retry bei 502, keiner bei 403', async () => {
    let n = 0
    mockFetch(() => (++n === 1 ? new Response('x', { status: 502 }) : xml('<rss/>')))
    const r = await httpFetch({ url: 'https://example.com/a', accept: 'x' })
    assert.ok(r.ok)
    assert.equal(n, 2)
    n = 0
    mockFetch(() => { n++; return new Response('nope', { status: 403 }) })
    const b = await httpFetch({ url: 'https://example.com/b', accept: 'x' })
    assert.equal(b.error, 'blocked')
    assert.equal(n, 1)
  })

  test('Größenlimit → too-large', async () => {
    mockFetch(() => xml('x'.repeat(5_000)))
    const r = await httpFetch({ url: 'https://example.com/big', accept: 'x', maxBytes: 1_000 })
    assert.equal(r.error, 'too-large')
  })
})

describe('Health und Takt', () => {
  const fail = { verdict: 'fehler' as const, error: 'timeout', bytes: 0, items: 0, hints: [] }
  test('Circuit-Breaker: ab 3 Fehlern degraded, Erfolg setzt zurück', () => {
    const s = source('verge-ai')
    let h: HealthEntry | undefined
    for (let i = 0; i < 2; i++) h = applyAttempt(s, h, fail, NOW)
    assert.equal(h!.status, 'ok')
    h = applyAttempt(s, h, fail, NOW)
    assert.equal(h.status, 'degraded')
    assert.equal(h.consecutiveFailures, 3)
    h = applyAttempt(s, h, { verdict: 'ok', bytes: 10, items: 2, hints: [] }, NOW)
    assert.equal(h.status, 'ok')
    assert.equal(h.failingSince, undefined)
  })

  test('startStatus blockiert: bleibt blockiert, Tagesprobe nur einmal je Berliner Tag', () => {
    const s = source('xai-sitemap')
    assert.equal(isDue(s, undefined, NOW), true)
    const h = applyAttempt(s, undefined, { verdict: 'blockiert', error: 'blocked', bytes: 0, items: 0, hints: [] }, NOW)
    assert.equal(h.status, 'blockiert')
    assert.equal(isDue(s, h, new Date('2026-10-25T18:00:00Z')), false)
    assert.equal(isDue(s, h, new Date('2026-10-26T06:07:00Z')), true)
  })

  test('daily07 nur einmal je Berliner Tag, 3x immer', () => {
    const h = applyAttempt(source('producthunt'), undefined, { verdict: 'ok', bytes: 1, items: 1, hints: [] }, new Date('2026-10-25T06:07:00Z'))
    assert.equal(isDue(source('producthunt'), h, new Date('2026-10-25T12:07:00Z')), false)
    assert.equal(isDue(source('producthunt'), h, new Date('2026-10-26T06:07:00Z')), true)
    assert.equal(isDue(source('techmeme'), h, new Date('2026-10-25T12:07:00Z')), true)
  })

  test('Platzhalter {since36hUnix} holt nach Ausfall nach, höchstens 72 h', () => {
    const hn = source('hn')
    const since = (u: string) => Number(/created_at_i%3E(\d+)/.exec(u)![1])
    assert.equal(since(resolveUrl(hn, { now: NOW })), Math.floor((NOW.getTime() - 36 * 3_600_000) / 1000))
    assert.equal(since(resolveUrl(hn, { now: NOW, lastSuccess: '2026-10-24T09:00:00Z' })), Math.floor((NOW.getTime() - 48 * 3_600_000) / 1000))
    assert.equal(since(resolveUrl(hn, { now: NOW, lastSuccess: '2026-10-10T00:00:00Z' })), Math.floor((NOW.getTime() - 72 * 3_600_000) / 1000))
    assert.match(resolveUrl(source('hf-daily-papers'), { now: NOW }), /date=2026-10-24$/)
  })
})

describe('Sammeln mit Fallback-Ketten', () => {
  test('blockierte Primärquelle → Fallback-Feed wird abgerufen; kaputte Quelle bricht den Lauf nicht ab', async () => {
    const calls = mockFetch(url => {
      if (url.includes('openai.com/news/rss.xml')) return new Response('<title>Just a moment...</title>', { status: 403, headers: { 'cf-mitigated': 'challenge' } })
      if (url.includes('feed_openai_main.xml')) return xml(fixture('openai-news.xml'), { 'content-type': 'text/plain' })
      if (url.includes('techmeme.com')) return xml(fixture('techmeme.xml'))
      if (url.includes('heise.de')) throw new TypeError('fetch failed')
      return new Response('', { status: 404 })
    })
    const empty = { httpCache: {}, sourceState: {}, health: { updatedAt: '', sources: {} } }
    const r = await collect({ sources: [source('openai-news'), source('techmeme'), source('heise-ki')], state: empty, now: NOW, pauseMs: [0, 0] })
    const by = (id: string) => r.runs.find(x => x.source.id === id)!
    assert.equal(by('openai-news').verdict, 'blockiert')
    assert.equal(by('olshansk-openai').verdict, 'ok')
    assert.deepEqual(by('olshansk-openai').asFallbackFor, ['openai-news'])
    assert.equal(by('heise-ki').verdict, 'fehler')
    assert.deepEqual(r.state.health.sources['openai-news']!.fallbackActive, ['olshansk-openai'])
    assert.equal(r.state.health.sources['openai-news']!.status, 'ok', 'erst ab 3 Fehlern blockiert')
    assert.ok(by('techmeme').entries.length > 0)
    assert.equal(calls.filter(u => u.includes('openai.com/news')).length, 1, 'kein Retry bei Block, 1 Request je Host')
    assert.equal(r.state.httpCache['openai-news'], undefined, 'Fehler überschreibt keinen Cache')
  })

  test('1-Request-Host: zweiter Abruf im selben Lauf wird verweigert', async () => {
    mockFetch(() => xml(fixture('openai-news.xml')))
    const empty = { httpCache: {}, sourceState: {}, health: { updatedAt: '', sources: {} } }
    const twin = { ...source('openai-news'), id: 'openai-zwilling', fallbacks: [] }
    const r = await collect({ sources: [source('openai-news'), twin], state: empty, now: NOW, pauseMs: [0, 0] })
    const verdicts = r.runs.filter(x => x.source.id.startsWith('openai')).map(x => x.error ?? 'ok').sort()
    assert.equal(verdicts.filter(v => v.startsWith('host-budget')).length, 1)
  })
})

describe('robots.txt', () => {
  test('eigene Gruppe vor *, längste Regel gewinnt, Status-Regeln', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: AIPulseBot\nDisallow: /private\nAllow: /private/public\n')
    assert.ok(isAllowed({ status: 200, rules }, 'https://a.com/changelog'))
    assert.ok(!isAllowed({ status: 200, rules }, 'https://a.com/private/x'))
    assert.ok(isAllowed({ status: 200, rules }, 'https://a.com/private/public/y'))
    const star = parseRobots('User-agent: *\nDisallow: /search*\n')
    assert.ok(!isAllowed({ status: 200, rules: star }, 'https://a.com/search?q=1'))
    assert.ok(isAllowed({ status: 404, rules: [] }, 'https://a.com/x'), '4xx = alles erlaubt')
    assert.ok(!isAllowed({ status: 503, rules: [] }, 'https://a.com/x'), '5xx = alles verboten')
  })
})
