// Titel normalisieren und vergleichen (Skill bewertung, references/clustering.md, Schritt 6/7).

import { STOP_WORDS } from '../config/keywords.ts'
import { decodeEntities } from '../lib/util.ts'

const SUFFIX_RE = /\s+[|–—-]\s+(heise online|heise|the decoder|golem\.de|techcrunch|the verge|hacker news|anthropic|openai|google deepmind|google|mistral ai|hugging face)\s*$/i
const VERSION_RE = /[a-z]*-?\d+(?:\.\d+)+[a-z]*/gi

function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase()
}

const STOP = new Set(STOP_WORDS.map(fold))

export function titleTokens(title: string): Set<string> {
  let t = decodeEntities(title).replace(SUFFIX_RE, '')
  const versions: string[] = []
  t = t.replace(VERSION_RE, m => {
    versions.push(fold(m))
    return ' '
  })
  const words = fold(t).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')
  const tokens = new Set<string>()
  for (const w of words) if (w.length >= 3 && !STOP.has(w)) tokens.add(w)
  for (const v of versions) tokens.add(v)
  return tokens
}

export function overlap(a: Set<string>, b: Set<string>): { common: number; jaccard: number } {
  let common = 0
  for (const w of a) if (b.has(w)) common++
  const union = a.size + b.size - common
  return { common, jaccard: union === 0 ? 0 : common / union }
}

export const JACCARD_MIN = 0.5
export const COMMON_MIN = 3

export function similarTitles(a: Set<string>, b: Set<string>): boolean {
  const { common, jaccard } = overlap(a, b)
  return jaccard >= JACCARD_MIN && common >= COMMON_MIN
}
