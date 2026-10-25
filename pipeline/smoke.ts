// Smoke-Test: jede Register-Quelle genau einmal über die Abruf-Schicht des Jobs abrufen
// (Spezifikation: .claude/skills/quellen/references/smoke-test.md). Schreibt nie state/.

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { Source } from './config/sources.ts'
import { SOURCES, SOURCE_BY_ID, countsInDenominator } from './config/sources.ts'
import { fetchPlan } from './collect/collect.ts'
import type { Verdict } from './collect/health.ts'
import type { FetchResult } from './collect/http.ts'
import { HostScheduler, SHORT_USER_AGENT, challengeText, httpFetch } from './collect/http.ts'
import type { Shape } from './collect/parsers/common.ts'
import { detectShape } from './collect/parsers/common.ts'
import { writeJson, writeText } from './lib/util.ts'
import { CACHE_DIR } from './state.ts'

interface SmokeRow {
  id: string
  kind: Source['kind']
  url: string
  finalUrl?: string
  core: boolean
  fallbackOnly: boolean
  startStatus?: string
  status?: number
  ms: number
  bytes: number
  contentType?: string
  server?: string
  cfMitigated?: string
  retryAfter?: string
  cfBm: boolean
  challenge: boolean
  rateRemaining?: string
  shape: Shape | 'none'
  expected: Shape
  verdict: Verdict
  error?: string
  note?: string
}

const ORDER: Verdict[] = ['blockiert', 'fehler', 'unerwartet', 'ok']

function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`
}

function expectedShape(source: Source, githubRest: boolean): Shape {
  switch (source.kind) {
    case 'feed': return 'feed'
    case 'json': return 'json'
    case 'sitemap': return 'sitemap'
    case 'htmldiff': return 'html'
    case 'github': return githubRest ? 'json' : 'feed'
    case 'detector': return source.url.endsWith('.parquet') ? 'parquet' : 'json'
  }
}

function jsonStructureOk(source: Source, body: string): boolean {
  try {
    const data = JSON.parse(body) as Record<string, unknown>
    if (source.adapter === 'hn') return Array.isArray(data['hits'])
    if (source.adapter === 'yc') return Array.isArray(data['added'])
    if (source.adapter === 'hfPapers') return Array.isArray(data)
    if (source.kind === 'github') return Array.isArray(data)
    return true
  } catch {
    return false
  }
}

function judge(source: Source, res: FetchResult, expected: Shape): { verdict: Verdict; shape: Shape | 'none'; error?: string } {
  const shape = res.body !== undefined ? detectShape(res.body) : 'none'
  if (res.error === 'blocked') return { verdict: 'blockiert', shape, error: res.errorDetail }
  if (!res.ok) return { verdict: 'fehler', shape, error: [res.error, res.errorDetail].filter(Boolean).join(': ') }
  if (shape !== expected) return { verdict: 'unerwartet', shape }
  if (shape === 'json' && !jsonStructureOk(source, res.body ?? '')) return { verdict: 'unerwartet', shape, error: 'JSON ohne erwartete Struktur' }
  return { verdict: 'ok', shape }
}

function headDump(res: FetchResult): string {
  const lines = [`HTTP ${res.status ?? '-'} ${res.finalUrl ?? ''}`]
  res.headers?.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') return
    lines.push(`${name}: ${value}`)
  })
  const cookies = res.headers?.getSetCookie().map(c => c.split('=')[0]).filter(Boolean) ?? []
  if (cookies.length > 0) lines.push(`set-cookie (Namen): ${cookies.join(', ')}`)
  lines.push('', (res.body ?? '').slice(0, 2048))
  return lines.join('\n') + '\n'
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { only: { type: 'string' }, ua: { type: 'string' }, out: { type: 'string' } }, strict: true })
  const now = new Date()
  const ids = values.only?.split(',').map(s => s.trim()).filter(Boolean)
  const unknown = ids?.filter(id => !SOURCE_BY_ID.has(id)) ?? []
  if (unknown.length > 0) {
    console.error(`unbekannte Quellen-ID: ${unknown.join(', ')}`)
    process.exit(1)
  }
  const sources = ids ? ids.map(id => SOURCE_BY_ID.get(id)!) : SOURCES
  const shortUa = values.ua === 'kurz'
  const token = process.env['AIPULSE_GITHUB_TOKEN'] || undefined
  const outDir = values.out ?? join(CACHE_DIR, 'smoke', stamp(now))
  const scheduler = new HostScheduler(4)

  const rows = await Promise.all(sources.map(async (source): Promise<SmokeRow> => {
    const plan = fetchPlan(source, { now }, token)
    const expected = expectedShape(source, plan.mode === 'rest')
    const base = {
      id: source.id, kind: source.kind, url: plan.url,
      core: countsInDenominator(source), fallbackOnly: !!source.fallbackOnly, startStatus: source.startStatus,
      cfBm: false, challenge: false, expected, bytes: 0, ms: 0,
    }
    if (!scheduler.reserve(plan.url)) return { ...base, shape: 'none', verdict: 'fehler', error: 'host-budget' }
    const res = await scheduler.run(plan.url, () => httpFetch({ url: plan.url, accept: plan.accept, headers: plan.headers, retry: false, maxBytes: source.maxBytes, userAgent: shortUa ? SHORT_USER_AGENT : undefined }))
    await writeText(join(outDir, 'heads', `${source.id}.txt`), headDump(res))
    const { verdict, shape, error } = judge(source, res, expected)
    const h = res.headers
    return {
      ...base,
      finalUrl: res.finalUrl,
      status: res.status, ms: res.ms, bytes: res.bytes,
      contentType: h?.get('content-type') ?? undefined,
      server: h?.get('server') ?? undefined,
      cfMitigated: h?.get('cf-mitigated') ?? undefined,
      retryAfter: h?.get('retry-after') ?? undefined,
      cfBm: h?.getSetCookie().some(c => c.startsWith('__cf_bm=')) ?? false,
      challenge: res.body ? challengeText(res.body) : false,
      rateRemaining: plan.url.includes('api.github.com') ? (h?.get('x-ratelimit-remaining') ?? undefined) : undefined,
      shape, verdict, error,
      note: source.startStatus && verdict === 'ok' ? 'startStatus prüfen' : undefined,
    }
  }))

  rows.sort((a, b) => ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict) || a.id.localeCompare(b.id))
  const core = rows.filter(r => r.core)
  const coreOk = core.filter(r => r.verdict === 'ok').length
  const fb = rows.filter(r => r.fallbackOnly)
  const fbOk = fb.filter(r => r.verdict === 'ok').length
  const pct = core.length > 0 ? Math.round((coreOk / core.length) * 100) : 0
  const head = `ok ${coreOk}/${core.length} Kernquellen (${pct} %) · Fallbacks ok ${fbOk}/${fb.length} · UA ${shortUa ? 'kurz' : 'standard'} · GitHub ${token ? 'rest' : 'atom'}`

  const md = [
    head, '',
    '| Quelle | Urteil | Status | KB | Form | erwartet | cf-mitigated | __cf_bm | Challenge | ms |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.id}${r.fallbackOnly ? ' (Fallback)' : ''} | ${r.verdict}${r.note ? ` (${r.note})` : ''}${r.error ? ` – ${r.error.replace(/\|/g, '/')}` : ''} | ${r.status ?? '–'} | ${Math.round(r.bytes / 1024)} | ${r.shape} | ${r.expected} | ${r.cfMitigated ?? '–'} | ${r.cfBm ? 'ja' : '–'} | ${r.challenge ? 'ja' : '–'} | ${r.ms} |`),
  ].join('\n') + '\n'

  await writeJson(join(outDir, 'report.json'), { generatedAt: now.toISOString(), ua: shortUa ? 'kurz' : 'standard', github: token ? 'rest' : 'atom', rows }, 1)
  await writeText(join(outDir, 'report.md'), md)
  console.log(head)
  for (const r of rows) if (r.verdict !== 'ok') console.log(`  ${r.verdict.padEnd(10)} ${r.id}: ${r.error ?? r.shape}`)
  console.log(`  Bericht: ${join(outDir, 'report.md')}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
