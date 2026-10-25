// Backend-Auswahl, Aufruf-Budget (≤ 8 CLI-Aufrufe), Deadline mit Briefing-Reserve und Kostenbuch.

import { join } from 'node:path'
import type { RunKind } from '../../shared/types.ts'
import { API_USD_CAP, DEADLINE_MIN_DEFAULT, LIMITS, STAGES } from '../config/models.ts'
import type { Stage } from '../config/models.ts'
import { readJson, writeJson } from '../lib/util.ts'
import { callApiFixture, callApiLive, estimateUsd } from './backends/api.ts'
import { authStatus, callCli } from './backends/cli.ts'
import type { LlmError, LlmRequest, LlmResponse } from './backends/types.ts'

export type BudgetLevel = 'abo' | 'api' | 'aus'

export interface UsageEntry {
  ts: string; run: RunKind; stage: Stage; backend: 'abo' | 'api'; model: string
  inputTokens: number; outputTokens: number; cacheReadTokens?: number
  usd?: number; schaetzungUsd?: number; ok: boolean; error?: LlmError
}

interface UsageBook {
  month: string; apiUsd: number
  runs: { id: string; level: BudgetLevel; cliCalls: number; apiCalls: number; inputTokens: number; outputTokens: number; ruleOnly: number; errors: string[] }[]
  entries: UsageEntry[]
}

export interface RunnerOptions {
  runId: string
  kind: RunKind
  full: boolean             // voller Lauf (Server): echtes Kostenbuch, echte Notfall-API
  usageDir: string          // state/usage oder .cache/usage
  start: Date
}

export class LlmRunner {
  readonly opts: RunnerOptions
  cliCalls = 0
  apiCalls = 0
  cliState: 'ok' | 'limit' | 'auth' | 'unchecked' = 'unchecked'
  level: BudgetLevel = 'abo'
  resetHint?: string
  ruleOnly = 0
  errors: string[] = []
  private book?: UsageBook
  private liveTestUsed = false
  private readonly deadline: number

  constructor(opts: RunnerOptions) {
    this.opts = opts
    const min = Number(process.env['AIPULSE_DEADLINE_MIN'] || DEADLINE_MIN_DEFAULT)
    this.deadline = opts.start.getTime() + min * 60_000
  }

  // Briefing-Reserve: Stufen vor dem Briefing starten nur, wenn danach noch das Briefing passt.
  canStart(stage: Stage, reserveBriefing: boolean): boolean {
    const now = Date.now()
    const own = STAGES[stage].timeoutMs
    const reserve = reserveBriefing && stage !== 'brief' && stage !== 'weekly' ? STAGES.brief.timeoutMs : 0
    if (now + own + reserve > this.deadline) return false
    const slots = LIMITS.maxCliCalls - this.cliCalls - (reserveBriefing && stage !== 'brief' ? 1 : 0)
    return this.cliState === 'limit' || this.cliState === 'auth' || slots > 0
  }

  async call(req: LlmRequest, refs?: string[]): Promise<LlmResponse> {
    // 1. Abo (CLI)
    if (this.cliState === 'unchecked') {
      if (process.env['AIPULSE_SIMULATE_LIMIT']) {
        this.cliState = 'ok'
      } else {
        const auth = await authStatus()
        this.cliState = auth.ok ? 'ok' : 'auth'
        if (!auth.ok) this.errors.push(`auth: ${auth.method} ${auth.detail}`.slice(0, 160))
      }
    }
    if (this.cliState === 'ok' && this.cliCalls < LIMITS.maxCliCalls) {
      this.cliCalls++
      const res = await callCli(req)
      await this.log(req, 'abo', res)
      if (res.ok || (res.error !== 'limit' && res.error !== 'auth')) return res
      this.cliState = res.error
      if (res.resetHint) this.resetHint = res.resetHint
    }
    if (this.cliState === 'ok') return { ok: false, error: 'other', detail: 'Aufruf-Budget erschöpft', ms: 0 }
    // 2. Notfall-API
    const simulated = Boolean(process.env['AIPULSE_SIMULATE_LIMIT'])
    if (simulated && !this.opts.full) {
      const live = process.env['AIPULSE_API_LIVE_TEST'] && process.env['AIPULSE_FALLBACK_API_KEY'] && !this.liveTestUsed
      if (live) this.liveTestUsed = true
      const res = live ? await callApiLive(req) : await callApiFixture(req, refs)
      this.apiCalls++
      this.level = 'api'
      await this.log(req, 'api', res)
      return res
    }
    if (this.opts.full && process.env['AIPULSE_FALLBACK_API_KEY']) {
      const book = await this.loadBook()
      if (book.apiUsd + estimateUsd(req.input.length + req.system.length, req.maxTokens) <= API_USD_CAP) {
        const res = await callApiLive(req)
        this.apiCalls++
        this.level = 'api'
        await this.log(req, 'api', res)
        if (res.ok) return res
      }
    }
    // 3. aus
    this.level = 'aus'
    return { ok: false, error: this.cliState === 'auth' ? 'auth' : 'limit', detail: 'kein Backend verfügbar', resetHint: this.resetHint, ms: 0 }
  }

  private bookFile(): string {
    return join(this.opts.usageDir, `${this.opts.start.toISOString().slice(0, 7)}.json`)
  }

  private async loadBook(): Promise<UsageBook> {
    this.book ??= await readJson<UsageBook>(this.bookFile(), { month: this.opts.start.toISOString().slice(0, 7), apiUsd: 0, runs: [], entries: [] })
    return this.book
  }

  private async log(req: LlmRequest, backend: 'abo' | 'api', res: LlmResponse): Promise<void> {
    const book = await this.loadBook()
    const entry: UsageEntry = { ts: new Date().toISOString(), run: this.opts.kind, stage: req.stage, backend, model: res.ok ? res.model : req.model, inputTokens: res.ok ? res.inputTokens : 0, outputTokens: res.ok ? res.outputTokens : 0, ok: res.ok }
    if (res.ok && res.cacheReadTokens !== undefined) entry.cacheReadTokens = res.cacheReadTokens
    if (res.ok && res.schaetzungUsd !== undefined) entry.schaetzungUsd = Math.round(res.schaetzungUsd * 1e4) / 1e4
    if (res.ok && res.usd !== undefined && backend === 'api') {
      entry.usd = Math.round(res.usd * 1e6) / 1e6
      // Fixture-Kosten zählen nie gegen den Deckel (Kostenbuch liegt dann ohnehin in .cache/)
      if (this.opts.full) book.apiUsd = Math.round((book.apiUsd + entry.usd) * 1e4) / 1e4
    }
    if (!res.ok) { entry.error = res.error; this.errors.push(`${req.stage}: ${res.error} ${res.detail}`.slice(0, 200)) }
    book.entries.push(entry)
    await writeJson(this.bookFile(), book)
  }

  async finish(): Promise<{ apiUsdMonth: number }> {
    const book = await this.loadBook()
    const mine = book.entries.filter(e => Date.parse(e.ts) >= this.opts.start.getTime())
    book.runs = book.runs.filter(r => r.id !== this.opts.runId)
    book.runs.push({
      id: this.opts.runId, level: this.level, cliCalls: this.cliCalls, apiCalls: this.apiCalls,
      inputTokens: mine.reduce((n, e) => n + e.inputTokens, 0), outputTokens: mine.reduce((n, e) => n + e.outputTokens, 0),
      ruleOnly: this.ruleOnly, errors: this.errors.slice(0, 20),
    })
    await writeJson(this.bookFile(), book)
    return { apiUsdMonth: book.apiUsd }
  }
}
