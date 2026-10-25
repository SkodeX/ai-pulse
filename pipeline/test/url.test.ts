// Friert die Optionen von canonicalUrl() ein – eine Änderung verschiebt alle seen-Keys.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalUrl } from '../lib/url.ts'

const TABLE: [string, string][] = [
  ['https://www.heise.de/news/Foo-123.html?utm_source=rss&utm_medium=feed', 'https://heise.de/news/Foo-123.html'],
  ['https://example.com/a/?b=2&a=1#section', 'https://example.com/a?a=1&b=2'],
  ['http://www.Example.com/path/', 'http://example.com/path'],
  ['https://techcrunch.com/2026/10/24/x/?ref=techmeme&fbclid=abc', 'https://techcrunch.com/2026/10/24/x'],
  ['https://news.ycombinator.com/item?id=4242', 'https://news.ycombinator.com/item?id=4242'],
  ['https://openai.com/index/foo/?gclid=1&mc_cid=2&mc_eid=3&keep=yes', 'https://openai.com/index/foo?keep=yes'],
  ['HTTPS://Simonwillison.net/2026/Oct/24/thing/', 'https://simonwillison.net/2026/Oct/24/thing'],
  ['https://huggingface.co/papers/2610.31329', 'https://huggingface.co/papers/2610.31329'],
  ['https://www.anthropic.com/news/claude-haiku-5-5#:~:text=abc', 'https://anthropic.com/news/claude-haiku-5-5'],
  ['https://user:pw@example.com:443/p', 'https://example.com/p'],
  ['  https://x.ai/news/grok-5  ', 'https://x.ai/news/grok-5'],
  ['not a url', 'not a url'],
]

test('canonicalUrl: eingefrorene Fixture-Tabelle', () => {
  for (const [input, expected] of TABLE) assert.equal(canonicalUrl(input), expected, input)
})
