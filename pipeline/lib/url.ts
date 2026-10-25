// Einzige URL-Kanonisierung des Projekts. Optionen sind per Fixture-Test eingefroren
// (pipeline/test/url.test.ts) – jede Änderung verschiebt alle seen-Keys.

import normalizeUrl from 'normalize-url'

const OPTIONS = {
  stripHash: true,
  stripWWW: true,
  removeQueryParameters: [/^utm_/i, 'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'],
  sortQueryParameters: true,
  removeTrailingSlash: true,
} as const

export function canonicalUrl(url: string): string {
  const trimmed = url.trim()
  try {
    return normalizeUrl(trimmed, { ...OPTIONS, removeQueryParameters: [...OPTIONS.removeQueryParameters] })
  } catch {
    return trimmed
  }
}
