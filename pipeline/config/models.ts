// Modelle, Backends, Grenzen und Timeouts – nur hier (Skill bewertung, Abschnitt „Aufrufe je Stufe").

export type Stage = 'triage' | 'summarize' | 'brief' | 'weekly' | 'terms' | 'usecases'
export type Backend = 'abo' | 'api'
export type Effort = 'low' | 'medium' | 'high'

export interface StageConfig {
  model: string
  effort: Effort
  timeoutMs: number
  apiMaxTokens: (n: number) => number   // Notfall-API: max_tokens je Paketgröße
}

export const STAGES: Record<Stage, StageConfig> = {
  triage: { model: 'claude-haiku-5-5', effort: 'low', timeoutMs: 180_000, apiMaxTokens: n => 120 * n + 200 },
  summarize: { model: 'claude-haiku-5-5', effort: 'low', timeoutMs: 180_000, apiMaxTokens: n => 450 * n + 200 },
  terms: { model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 300_000, apiMaxTokens: n => 700 * n + 200 },
  brief: { model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 300_000, apiMaxTokens: () => 2500 },
  weekly: { model: 'claude-opus-5-5', effort: 'high', timeoutMs: 600_000, apiMaxTokens: () => 3000 },
  usecases: { model: 'claude-haiku-5-5', effort: 'low', timeoutMs: 240_000, apiMaxTokens: n => 80 * n + 200 },   // Top-50, wöchentlich
}

export const LIMITS = {
  triageMax: 80,          // Kandidaten je Lauf an Claude
  triageBatch: 20,
  summarizeMax: 25,
  summarizeBatch: 13,
  termsMax: 3,
  usecasesBatch: 100,     // Top-50-Einträge je Aufruf (nur neue ohne Text)
  usecasesMaxCalls: 2,
  maxCliCalls: 8,         // ein Zähler über alle Stufen inkl. Wiederholungen
  maxInputChars: 60_000,  // ≈ 20 000 Token
  articleChars: 3_600,    // Artikelauszug ≈ 1 200 Token
}

export const DEFAULT_BACKEND: Backend = 'abo'
export const FALLBACK_MODEL = 'claude-haiku-5-5'   // Notfall-API: alle Stufen
export const API_USD_CAP = 3.36                     // 3 € je UTC-Monat
export const API_PRICE = { inputPerMTok: 0.10, outputPerMTok: 0.50 }   // Haiku 5.5, Prompt ≤ 100K
export const DEADLINE_MIN_DEFAULT = 30
export const weeklyEnabled = false                  // Phase 5
