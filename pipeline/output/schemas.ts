// zod-Schemas des Datenvertrags (typgleich mit shared/types.ts; zod nur in der Pipeline).

import { z } from 'zod'
import { CATEGORY_KEYS } from '../../shared/categories.ts'
import { LAW_STATUSES } from '../../shared/law.ts'
import type { ArchiveDay, Briefing, BriefingIndexEntry, IndexEntry, Latest, Meta, Story } from '../../shared/types.ts'

const RUN_KINDS = ['morning', 'midday', 'evening', 'weekly'] as const
const score = z.number().int().min(1).max(10)

export const StorySchema = z.object({
  id: z.string(), clusterKey: z.string(), title: z.string(), originalTitle: z.string(), url: z.string(),
  sources: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), lang: z.enum(['de', 'en']) })).min(1),
  category: z.enum(CATEGORY_KEYS), tags: z.array(z.string()),
  impact: score, personal: score, score: z.number().min(1).max(10),
  hype: z.boolean(), paywall: z.boolean(),
  summary: z.string().optional(), whyImportant: z.string().optional(), forYou: z.string().optional(),
  law: z.object({
    status: z.enum(LAW_STATUSES), jurisdiction: z.enum(['EU', 'DE', 'US', 'US-Staat']),
    effectiveDate: z.string().optional(), statusSource: z.enum(['quelle', 'meldung']).optional(),
    procedure: z.string().optional(), region: z.string().optional(),
  }).optional(),
  security: z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']), cves: z.array(z.string()), advisories: z.array(z.string()).optional(),
    exploited: z.boolean(), products: z.array(z.string()),
  }).optional(),
  terms: z.object({ provider: z.string(), document: z.string(), effectiveDate: z.string().optional(), changeExcerpt: z.string().optional() }).optional(),
  publishedAt: z.string().optional(), firstSeen: z.string(), ratedBy: z.string(),
})

export const BriefingSchema = z.object({
  generatedAt: z.string(), kind: z.enum(RUN_KINDS), model: z.string(), title: z.string(), intro: z.string(),
  items: z.array(z.object({ storyId: z.string(), text: z.string() })), outlook: z.string().optional(),
})

export const LatestSchema = z.object({ generatedAt: z.string(), buildId: z.string(), run: z.enum(RUN_KINDS), stories: z.array(StorySchema) })
export const ArchiveDaySchema = z.object({ date: z.string(), generatedAt: z.string(), buildId: z.string(), frozen: z.boolean(), stories: z.array(StorySchema) })
export const IndexEntrySchema = z.object({ id: z.string(), date: z.string(), title: z.string(), category: z.enum(CATEGORY_KEYS), impact: score, personal: score, tags: z.array(z.string()), url: z.string(), src: z.string() })
export const BriefingIndexSchema = z.array(z.object({ file: z.string(), kind: z.enum(RUN_KINDS), generatedAt: z.string(), title: z.string() }))

export const MetaSchema = z.object({
  generatedAt: z.string(), buildId: z.string(), run: z.enum(RUN_KINDS), firstMonth: z.string(),
  health: z.object({
    checkedAt: z.string(), counts: z.object({ ok: z.number(), degraded: z.number(), blockiert: z.number() }),
    issues: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), since: z.string(), coveredBy: z.string().optional() })),
    stale: z.array(z.string()),
  }),
  budget: z.object({ level: z.enum(['abo', 'api', 'aus']), apiUsdMonth: z.number(), apiUsdCap: z.number(), resetHint: z.string().optional() }),
  notices: z.array(z.object({ kind: z.enum(['quelle', 'agb', 'recht', 'token', 'system']), sourceId: z.string().optional(), text: z.string(), since: z.string() })),
  credits: z.array(z.object({ name: z.string(), url: z.string(), license: z.string().optional() })),
})

// Typgleichheit zur Compile-Zeit
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const _story: Same<z.infer<typeof StorySchema>, Story> = true
const _briefing: Same<z.infer<typeof BriefingSchema>, Briefing> = true
const _latest: Same<z.infer<typeof LatestSchema>, Latest> = true
const _archive: Same<z.infer<typeof ArchiveDaySchema>, ArchiveDay> = true
const _index: Same<z.infer<typeof IndexEntrySchema>, IndexEntry> = true
const _bindex: Same<z.infer<typeof BriefingIndexSchema>, BriefingIndexEntry[]> = true
const _meta: Same<z.infer<typeof MetaSchema>, Meta> = true
void [_story, _briefing, _latest, _archive, _index, _bindex, _meta]
