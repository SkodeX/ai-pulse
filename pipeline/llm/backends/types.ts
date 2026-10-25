// Gemeinsame Schnittstelle der LLM-Backends (cli = Abo, api = Notfall).

import type { Stage } from '../../config/models.ts'

export type LlmError = 'limit' | 'auth' | 'schema' | 'timeout' | 'refusal' | 'other'

export interface LlmRequest {
  stage: Stage
  system: string          // System-Prompt (API) …
  systemFile: string      // … dieselbe Datei für --system-prompt-file (CLI)
  input: string           // User-Nachricht / stdin
  schemaJson: string      // JSON-Schema (draft-07)
  model: string
  effort: string
  timeoutMs: number
  maxTokens: number       // nur API
}

export type LlmResponse =
  | { ok: true; data: unknown; model: string; inputTokens: number; outputTokens: number; cacheReadTokens?: number; schaetzungUsd?: number; usd?: number; ms: number }
  | { ok: false; error: LlmError; detail: string; resetHint?: string; ms: number }
