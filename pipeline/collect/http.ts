// Abruf-Schicht (Skill quellen § 3/§ 4): ehrlicher UA, Timeout 20 s, 1 Retry, Conditional GET,
// Challenge-Erkennung, Größenlimit, pro Host seriell. Dieselbe Schicht nutzt der Smoke-Test.

import pLimit from 'p-limit'
import { USER_AGENT } from '../../shared/config.ts'
import { randomBetween, sha256, sleep } from '../lib/util.ts'

export const TIMEOUT_MS = 20_000
export const DEFAULT_MAX_BYTES = 3 * 1024 * 1024
export const ACCEPT_FEED = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5'
export const ACCEPT_HTML = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
export const ACCEPT_JSON = 'application/json, */*;q=0.5'

// Hosts mit aktiver Challenge-Regel: höchstens 1 Request je Lauf (robots.txt ausgenommen, ≤ 1×/24 h).
export const ONE_REQUEST_HOSTS = new Set(['openai.com', 'help.openai.com', 'x.ai'])

const CHALLENGE_TEXT_RE = /Just a moment|cf-chl|Attention Required|Vercel Security Checkpoint|captcha-delivery/i
const CHALLENGE_MAX_BYTES = 15_360

export type ErrorCode =
  | 'blocked' | 'timeout' | 'network' | 'format' | 'empty' | 'too-large' | 'robots' | 'rate-limit' | 'host-budget'
  | `http-${number}`

export interface HttpCacheEntry {
  etag?: string
  lastModified?: string
  contentHash?: string
  checkedAt: string
  robots?: RobotsRules
}

export interface RobotsRules { status: number; rules: { allow: boolean; path: string }[] }

export interface FetchRequest {
  url: string
  accept: string
  headers?: Record<string, string>
  maxBytes?: number
  cache?: HttpCacheEntry        // gespeicherte Validatoren → Conditional GET
  retry?: boolean               // Standard true; Smoke-Test: false
  userAgent?: string            // nur Smoke-Test --ua kurz (UA-Vergleich)
}

// Kurzform nur für den UA-Vergleich im Smoke-Test; der Job nutzt immer USER_AGENT.
export const SHORT_USER_AGENT = 'AIPulseBot/1.0 (+https://github.com/SkodeX/ai-pulse)'

export interface FetchResult {
  ok: boolean                   // 200 oder 304 ohne Block
  status?: number
  finalUrl?: string
  notModified: boolean          // 304 oder gleicher Body-Hash
  body?: string
  bytes: number
  ms: number
  headers?: Headers
  error?: ErrorCode
  errorDetail?: string
  cache?: HttpCacheEntry        // neue Validatoren (nur bei Erfolg)
}

// ---------- Planer: global 8, je Host 1, Zufallspause 300–1200 ms ----------

export class HostScheduler {
  private readonly global: ReturnType<typeof pLimit>
  private readonly hosts = new Map<string, ReturnType<typeof pLimit>>()
  private readonly used = new Map<string, number>()
  private readonly pause: [number, number]

  constructor(concurrency = 8, pause: [number, number] = [300, 1200]) {
    this.global = pLimit(concurrency)
    this.pause = pause
  }

  // Für 1-Request-Hosts: true, wenn in diesem Lauf noch kein Request lief (und reserviert ihn).
  reserve(url: string): boolean {
    const host = hostOf(url)
    if (!ONE_REQUEST_HOSTS.has(host)) return true
    const n = this.used.get(host) ?? 0
    if (n >= 1) return false
    this.used.set(host, n + 1)
    return true
  }

  run<T>(url: string, task: () => Promise<T>): Promise<T> {
    const host = hostOf(url)
    let limit = this.hosts.get(host)
    if (!limit) {
      limit = pLimit(1)
      this.hosts.set(host, limit)
    }
    return limit(async () => {
      try {
        return await this.global(task)
      } finally {
        await sleep(randomBetween(this.pause[0], this.pause[1]))
      }
    })
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ---------- Challenge-Erkennung (§ 4) ----------

export function detectBlock(status: number, headers: Headers, body: string, bytes: number, url: string): ErrorCode | undefined {
  if (headers.get('cf-mitigated') === 'challenge' || headers.get('x-vercel-mitigated') === 'challenge') return 'blocked'
  if ((status === 403 || status === 429) && hostOf(url) === 'api.github.com' && headers.get('x-ratelimit-remaining') === '0') return 'rate-limit'
  if (status === 403 || status === 429 || status === 503) return 'blocked'
  if (status === 401 && body.includes('captcha-delivery')) return 'blocked'
  if (bytes < CHALLENGE_MAX_BYTES && CHALLENGE_TEXT_RE.test(body)) return 'blocked'
  return undefined
}

export function challengeText(body: string): boolean {
  return CHALLENGE_TEXT_RE.test(body.slice(0, 65_536))
}

// ---------- Abruf ----------

export async function httpFetch(req: FetchRequest): Promise<FetchResult> {
  const first = await attempt(req)
  if (req.retry === false || !shouldRetry(first)) return first
  const wait = retryDelay(first)
  if (wait === undefined) return first
  await sleep(wait)
  const second = await attempt(req)
  second.ms += first.ms + wait
  return second
}

function shouldRetry(r: FetchResult): boolean {
  if (r.error === 'timeout' || r.error === 'network') return true
  return r.status === 500 || r.status === 502 || r.status === 504 || r.status === 429 || r.status === 503
}

function retryDelay(r: FetchResult): number | undefined {
  if (r.status === 429 || r.status === 503) {
    if (r.headers?.get('cf-mitigated')) return undefined
    const ra = r.headers?.get('retry-after')
    const seconds = ra ? Number(ra) : NaN
    return Number.isFinite(seconds) && seconds <= 30 ? Math.max(seconds, 1) * 1000 : undefined
  }
  return randomBetween(1000, 3000)
}

async function attempt(req: FetchRequest): Promise<FetchResult> {
  const t0 = Date.now()
  const headers: Record<string, string> = { 'User-Agent': req.userAgent ?? USER_AGENT, Accept: req.accept, ...req.headers }
  if (req.accept === ACCEPT_HTML && !Object.keys(headers).some(h => h.toLowerCase() === 'accept-language')) headers['Accept-Language'] = 'en'
  if (req.cache?.etag) headers['If-None-Match'] = req.cache.etag
  if (req.cache?.lastModified) headers['If-Modified-Since'] = req.cache.lastModified

  let res: Response
  try {
    res = await fetch(req.url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    return failure(t0, isTimeout(err) ? 'timeout' : 'network', errorMessage(err))
  }

  const base = { status: res.status, finalUrl: res.url, headers: res.headers }
  if (res.status === 304) {
    await res.body?.cancel()
    return { ...base, ok: true, notModified: true, bytes: 0, ms: Date.now() - t0, cache: { ...req.cache, checkedAt: new Date().toISOString() } }
  }

  let raw: Uint8Array
  try {
    raw = await readLimited(res, req.maxBytes ?? DEFAULT_MAX_BYTES)
  } catch (err) {
    const code: ErrorCode = err instanceof TooLargeError ? 'too-large' : isTimeout(err) ? 'timeout' : 'network'
    return { ...base, ok: false, notModified: false, bytes: 0, ms: Date.now() - t0, error: code, errorDetail: errorMessage(err) }
  }
  const body = decodeBody(raw, res.headers.get('content-type'))
  const ms = Date.now() - t0

  const block = detectBlock(res.status, res.headers, body, raw.length, req.url)
  if (block) return { ...base, ok: false, notModified: false, body, bytes: raw.length, ms, error: block, errorDetail: `http-${res.status}` }
  if (res.status !== 200) return { ...base, ok: false, notModified: false, body, bytes: raw.length, ms, error: `http-${res.status}` }

  const etag = res.headers.get('etag') ?? undefined
  const lastModified = res.headers.get('last-modified') ?? undefined
  const contentHash = sha256(raw)
  const cache: HttpCacheEntry = { etag, lastModified, contentHash, checkedAt: new Date().toISOString() }
  // Ohne Validatoren: gleicher Body-Hash = unverändert (nicht parsen)
  const notModified = !etag && !lastModified && req.cache?.contentHash === contentHash
  return { ...base, ok: true, notModified, body, bytes: raw.length, ms, cache }
}

function failure(t0: number, error: ErrorCode, detail?: string): FetchResult {
  return { ok: false, notModified: false, bytes: 0, ms: Date.now() - t0, error, errorDetail: detail }
}

class TooLargeError extends Error {}

async function readLimited(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      throw new TooLargeError(`> ${maxBytes} Bytes`)
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

// Zeichensatz aus Content-Type oder XML-Deklaration (golem.de liefert ISO-8859-1).
export function decodeBody(raw: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder('latin1').decode(raw.subarray(0, 300))
  const label = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? 'utf-8'
  try {
    return new TextDecoder(label.toLowerCase()).decode(raw).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('utf-8').decode(raw).replace(/^﻿/, '')
  }
}

function isTimeout(err: unknown): boolean {
  const name = (err as { name?: string })?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

function errorMessage(err: unknown): string {
  const e = err as { message?: string; cause?: { code?: string; message?: string } }
  return [e?.message, e?.cause?.code ?? e?.cause?.message].filter(Boolean).join(': ').slice(0, 160)
}
