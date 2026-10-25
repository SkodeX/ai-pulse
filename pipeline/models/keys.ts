// Gemeinsame Schlüssel für Modell-Ereignisse (Skill modelle-und-ranglisten § 9) – auch von pipeline/terms/ zu importieren.

import { sha1 } from '../lib/util.ts'

// API-Modellname → Slug: klein, 8-stelliges Datumssuffix weg, Nicht-[a-z0-9] → '-'. ISO-Datumssuffixe bleiben.
export function modelSlug(apiName: string): string {
  const name = apiName.replace(/^[^/]+\//, '').replace(/:.*$/, '').toLowerCase().replace(/-\d{8}$/, '')
  return name.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// <org>-<modell>-price-<JJJJMMTT> bzw. <org>-<modell>-deprecation; über 8 Teile → kürzen + Hash-Teil
export function modelEventKey(org: string, apiName: string, kind: 'price' | 'deprecation' | 'release', date?: string): string {
  const slug = modelSlug(apiName)
  const suffix = kind === 'price' ? ['price', (date ?? '').replace(/-/g, '')] : [kind]
  const orgParts = org.split('-').filter(Boolean)
  const modelParts = slug.split('-').filter(Boolean)
  const free = 8 - orgParts.length - suffix.length
  const parts = modelParts.length <= free ? modelParts : [...modelParts.slice(0, free - 1), sha1(slug).slice(0, 6)]
  return [...orgParts, ...parts, ...suffix].join('-')
}
