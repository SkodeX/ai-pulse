// robots.txt nach RFC 9309 (nur für htmldiff und nachgeladene Seiten, Skill quellen § 3):
// 4xx = alles erlaubt, 5xx/nicht erreichbar = alles verboten, Cache ≤ 24 h, Gruppe AIPulseBot vor *.

import { USER_AGENT } from '../../shared/config.ts'
import { HOUR } from '../lib/util.ts'
import type { HttpCacheEntry, RobotsRules } from './http.ts'
import { TIMEOUT_MS, hostOf } from './http.ts'

const PRODUCT = 'aipulsebot'
const MAX_AGE_MS = 24 * HOUR

export function parseRobots(text: string): RobotsRules['rules'] {
  const groups: { agents: string[]; rules: RobotsRules['rules'] }[] = []
  let current: { agents: string[]; rules: RobotsRules['rules'] } | undefined
  let lastWasAgent = false
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line)
    if (!m) continue
    const field = m[1]!.toLowerCase()
    const value = m[2]!.trim()
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if (field === 'allow' || field === 'disallow') {
      lastWasAgent = false
      if (current && value) current.rules.push({ allow: field === 'allow', path: value })
    } else {
      lastWasAgent = false
    }
  }
  const own = groups.filter(g => g.agents.some(a => a === PRODUCT))
  const chosen = own.length > 0 ? own : groups.filter(g => g.agents.includes('*'))
  return chosen.flatMap(g => g.rules)
}

function patternToRegExp(path: string): RegExp {
  const anchored = path.endsWith('$')
  const body = (anchored ? path.slice(0, -1) : path).split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  return new RegExp('^' + body + (anchored ? '$' : ''))
}

export function isAllowed(rules: RobotsRules, url: string): boolean {
  if (rules.status >= 400 && rules.status < 500) return true
  if (rules.status >= 500 || rules.status === 0) return false
  const u = new URL(url)
  const target = u.pathname + u.search
  let best: { allow: boolean; len: number } | undefined
  for (const r of rules.rules) {
    if (!patternToRegExp(r.path).test(target)) continue
    const len = r.path.length
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len }
  }
  return best ? best.allow : true
}

// Liefert die Regeln aus dem Cache (≤ 24 h) oder holt robots.txt neu. cacheOut erhält den neuen Eintrag.
export async function robotsFor(url: string, cached: HttpCacheEntry | undefined, now: Date): Promise<{ rules: RobotsRules; entry?: HttpCacheEntry }> {
  if (cached?.robots && now.getTime() - Date.parse(cached.checkedAt) < MAX_AGE_MS) return { rules: cached.robots }
  const origin = new URL(url).origin
  let rules: RobotsRules
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain, */*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = res.status === 200 ? await res.text() : (await res.body?.cancel(), '')
    rules = { status: res.status, rules: res.status === 200 ? parseRobots(text.slice(0, 500_000)) : [] }
  } catch {
    rules = { status: 0, rules: [] }   // nicht erreichbar = alles verboten, nicht cachen
    return { rules }
  }
  // 5xx nicht cachen, damit der nächste Lauf neu prüft
  if (rules.status >= 500) return { rules }
  return { rules, entry: { checkedAt: now.toISOString(), robots: rules } }
}

export function robotsKey(url: string): string {
  return `robots:${hostOf(url)}`
}
