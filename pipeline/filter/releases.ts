// Release-Regeln (Skill quellen § 7, Schritt 7): Vorabversionen raus, nur Linie tagRe, nur Major-/Minor-Sprung.

import { PRERELEASE_RE } from '../config/keywords.ts'
import type { ParsedEntry } from '../types.ts'

export interface Version { major: number; minor: number; tag: string }

export function isPrerelease(entry: ParsedEntry): boolean {
  if (entry.signals?.prerelease) return true
  const tag = entry.guid ?? ''
  return PRERELEASE_RE.test(tag) || PRERELEASE_RE.test(entry.title)
}

// (\d+)\.(\d+) aus dem Tag; Präfixe wie v, rust-v, n8n@, langchain-core== stören nicht.
export function parseVersion(tag: string): Version | undefined {
  const cleaned = tag.replace(/^.*?(?:==|@)/, '')
  const m = /(\d+)\.(\d+)/.exec(cleaned)
  return m ? { major: Number(m[1]), minor: Number(m[2]), tag } : undefined
}

export function compareVersion(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor
}

export function highestStable(entries: ParsedEntry[], tagRe?: RegExp): Version | undefined {
  let best: Version | undefined
  for (const e of entries) {
    const tag = e.guid ?? ''
    if (isPrerelease(e) || (tagRe && !tagRe.test(tag))) continue
    const v = parseVersion(tag)
    if (v && (!best || compareVersion(v, best) > 0)) best = v
  }
  return best
}
