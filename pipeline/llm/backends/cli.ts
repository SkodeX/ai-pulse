// Standard-Backend: Claude Code headless mit dem Abo (Skill claude-headless).
// --safe-mode statt --bare (bare schließt den Abo-Login aus), keine Tools, eigener System-Prompt, Daten über stdin.

import { spawn } from 'node:child_process'
import type { LlmRequest, LlmResponse } from './types.ts'

const LIMIT_RE = /You've hit your (session|weekly|Opus|Sonnet)[^·\n]*limit(?:\s*·\s*(resets[^"\n]*))?/i
const AUTH_RE = /authentication_failed|Invalid API key|OAuth token (has )?expired|Please run \/login|Not logged in/i

export function claudeBin(): string {
  return process.env['AIPULSE_CLAUDE_BIN'] || 'claude'
}

// Env-Hygiene: nie ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / Cloud-Provider / CLAUDE_CODE_EFFORT_LEVEL weitergeben.
export function cleanEnv(src: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const keep = ['PATH', 'HOME', 'LANG', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CONFIG_DIR']
  if (process.platform === 'win32') keep.push('USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'TEMP', 'TMP', 'HOMEDRIVE', 'HOMEPATH', 'ComSpec', 'PATHEXT')
  const env: NodeJS.ProcessEnv = {}
  for (const k of keep) if (src[k] !== undefined) env[k] = src[k]
  return env
}

interface Exec { code: number | null; stdout: string; stderr: string; timedOut: boolean; ms: number }

function run(args: string[], input: string | undefined, timeoutMs: number): Promise<Exec> {
  const t0 = Date.now()
  return new Promise(resolve => {
    const child = spawn(claudeBin(), args, { env: cleanEnv(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; child.kill() }, timeoutMs)
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })
    child.on('error', err => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: stderr + String(err), timedOut, ms: Date.now() - t0 }) })
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut, ms: Date.now() - t0 }) })
    child.stdin.end(input ?? '')
  })
}

// Vor dem ersten Aufruf je Lauf: muss über das Abo-Token/den Abo-Login laufen, nie über einen API-Key.
export async function authStatus(): Promise<{ ok: boolean; method: string; detail: string }> {
  const r = await run(['auth', 'status'], undefined, 30_000)
  const text = r.stdout.trim()
  try {
    const j = JSON.parse(text) as Record<string, unknown>
    const method = String(j['authMethod'] ?? j['auth_method'] ?? 'unbekannt')
    const loggedIn = j['loggedIn'] !== false
    const ok = r.code === 0 && loggedIn && !/api_key/.test(method) && method !== 'none'
    return { ok, method, detail: text.slice(0, 200) }
  } catch {
    return { ok: false, method: 'unbekannt', detail: (text || r.stderr).slice(0, 200) }
  }
}

export function limitResponse(message: string, ms = 0): LlmResponse {
  const m = LIMIT_RE.exec(message)
  return { ok: false, error: 'limit', detail: message.slice(0, 200), resetHint: m?.[2]?.trim(), ms }
}

// Antwort defensiv auswerten: Exit, JSON, is_error/subtype, structured_output.
export function interpret(exec: Exec): LlmResponse {
  const all = `${exec.stdout}\n${exec.stderr}`
  if (exec.timedOut) return { ok: false, error: 'timeout', detail: `nach ${exec.ms} ms`, ms: exec.ms }
  if (LIMIT_RE.test(all)) return limitResponse(LIMIT_RE.exec(all)![0], exec.ms)
  if (AUTH_RE.test(all)) return { ok: false, error: 'auth', detail: all.trim().slice(0, 200), ms: exec.ms }
  let j: Record<string, unknown>
  try {
    j = JSON.parse(exec.stdout) as Record<string, unknown>
  } catch {
    return { ok: false, error: 'other', detail: `kein JSON (Exit ${exec.code}): ${all.trim().slice(0, 160)}`, ms: exec.ms }
  }
  if (exec.code !== 0 || j['is_error'] === true || String(j['subtype'] ?? '').startsWith('error_')) {
    const sub = String(j['subtype'] ?? '')
    const err = sub === 'error_max_structured_output_retries' ? 'schema' : 'other'
    return { ok: false, error: err, detail: `${sub || 'Exit ' + exec.code}: ${String(j['result'] ?? '').slice(0, 160)}`, ms: exec.ms }
  }
  if (j['structured_output'] === undefined || j['structured_output'] === null) {
    return { ok: false, error: 'refusal', detail: `structured_output fehlt: ${String(j['result'] ?? '').slice(0, 160)}`, ms: exec.ms }
  }
  const usage = (j['usage'] ?? {}) as Record<string, number>
  const modelUsage = (j['modelUsage'] ?? j['model_usage'] ?? {}) as Record<string, Record<string, number>>
  const model = Object.entries(modelUsage).sort((a, b) => (b[1]['outputTokens'] ?? 0) - (a[1]['outputTokens'] ?? 0))[0]?.[0] ?? ''
  return {
    ok: true,
    data: j['structured_output'],
    model,
    inputTokens: (usage['input_tokens'] ?? 0) + (usage['cache_creation_input_tokens'] ?? 0) + (usage['cache_read_input_tokens'] ?? 0),
    outputTokens: usage['output_tokens'] ?? 0,
    cacheReadTokens: usage['cache_read_input_tokens'],
    schaetzungUsd: typeof j['total_cost_usd'] === 'number' ? j['total_cost_usd'] : undefined,
    ms: exec.ms,
  }
}

export async function callCli(req: LlmRequest): Promise<LlmResponse> {
  if (process.env['AIPULSE_SIMULATE_LIMIT']) return limitResponse("You've hit your session limit · resets 3:45pm")
  const args = [
    '-p', 'Bearbeite die Eingabe nach den Regeln im System-Prompt und antworte im vorgegebenen Schema.',
    '--safe-mode', '--tools', '',
    '--system-prompt-file', req.systemFile,
    '--model', req.model, '--effort', req.effort,
    '--output-format', 'json', '--json-schema', req.schemaJson,
    '--no-session-persistence',
  ]
  const exec = await run(args, req.input, req.timeoutMs)
  const res = interpret(exec)
  if (res.ok && !res.model) res.model = req.model
  return res
}
