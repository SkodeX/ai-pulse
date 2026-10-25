// Structured Outputs je Stufe (zod 4). Locker halten: keine min/max/regex – begrenzt und geclampt wird im Code.

import { z } from 'zod'
import { CATEGORY_KEYS } from '../../shared/categories.ts'
import { LAW_STATUSES } from '../../shared/law.ts'

const JURISDICTIONS = ['EU', 'DE', 'US', 'US-Staat'] as const

export const TriageOut = z.object({
  items: z.array(z.object({
    ref: z.string(),
    relevant: z.boolean(),
    category: z.enum(CATEGORY_KEYS),
    tags: z.array(z.string()),
    clusterKey: z.string(),
    titleDe: z.string(),
    impact: z.number().int(),
    personal: z.number().int(),
    hype: z.boolean(),
    incidentKind: z.enum(['breach', 'supply-chain', 'exploited', 'research', 'none']),
    law: z.object({
      status: z.enum(LAW_STATUSES),
      jurisdiction: z.enum(JURISDICTIONS),
      effectiveDate: z.string().nullable(),
    }).nullable(),
  })),
})

export const SummaryOut = z.object({
  items: z.array(z.object({
    ref: z.string(),
    titleDe: z.string(),
    summary: z.string(),
    whyImportant: z.string(),
    forYou: z.string(),
    impact: z.number().int(),
    personal: z.number().int(),
    hype: z.boolean(),
  })),
})

export const BriefingOut = z.object({
  title: z.string(),
  intro: z.string(),
  items: z.array(z.object({ storyId: z.string(), text: z.string() })),
  outlook: z.string(),
})

export type TriageResult = z.infer<typeof TriageOut>
export type SummaryResult = z.infer<typeof SummaryOut>
export type BriefingResult = z.infer<typeof BriefingOut>

// JSON-Schema für --json-schema (draft-07, sonst lehnt die CLI ab)
export function jsonSchema(schema: z.ZodType): string {
  return JSON.stringify(z.toJSONSchema(schema, { target: 'draft-7' }))
}

// Tolerant normalisieren (Enum-Schreibweise, Scores, Titellänge), dann erneut prüfen.
export function normalizeOutput(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(normalizeOutput)
  if (!data || typeof data !== 'object') return data
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if ((k === 'impact' || k === 'personal') && typeof v === 'number') out[k] = Math.max(1, Math.min(10, Math.round(v)))
    else if ((k === 'category' || k === 'incidentKind' || k === 'status') && typeof v === 'string') out[k] = v.trim().toLowerCase()
    else if ((k === 'titleDe' || k === 'title') && typeof v === 'string') out[k] = v.length > 90 ? v.slice(0, 89).trimEnd() + '…' : v
    else out[k] = normalizeOutput(v)
  }
  return out
}

export function parseOutput<T>(schema: z.ZodType<T>, data: unknown): { ok: true; value: T } | { ok: false; error: string } {
  const first = schema.safeParse(data)
  if (first.success) return { ok: true, value: first.data }
  const second = schema.safeParse(normalizeOutput(data))
  if (second.success) return { ok: true, value: second.data }
  return { ok: false, error: second.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }
}
