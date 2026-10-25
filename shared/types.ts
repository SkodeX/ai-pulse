// Datenvertrag public/data/ (Steckbrief). Feldnamen englisch, Inhalte deutsch.
// Neue Felder nur optional ergänzen – alte Archivdateien bleiben gültig.

import type { Category } from './categories.ts'
import type { Jurisdiction, LawStatus } from './law.ts'

export type RunKind = 'morning' | 'midday' | 'evening' | 'weekly'

export interface StorySource {
  id: string
  name: string
  url: string
  lang: 'de' | 'en'
}

export interface Story {
  id: string                 // gekürzter sha1 des clusterKey
  clusterKey: string
  title: string              // deutscher Titel (Claude), sonst Originaltitel
  originalTitle: string
  url: string                // Primärlink: Originalquelle, kanonisiert
  sources: StorySource[]     // Primärquelle zuerst
  category: Category
  tags: string[]
  impact: number             // 1–10
  personal: number           // 1–10
  score: number              // (impact + personal) / 2, eine Nachkommastelle
  hype: boolean
  paywall: boolean
  summary?: string
  whyImportant?: string
  forYou?: string
  law?: {
    status: LawStatus
    jurisdiction: Jurisdiction
    effectiveDate?: string
    statusSource?: 'quelle' | 'meldung'
    procedure?: string
    region?: string
  }
  security?: {
    severity: 'critical' | 'high' | 'medium' | 'low'
    cves: string[]
    advisories?: string[]
    exploited: boolean
    products: string[]
  }
  terms?: { provider: string; document: string; effectiveDate?: string; changeExcerpt?: string }
  publishedAt?: string       // ISO, nie in der Zukunft (sonst firstSeen)
  firstSeen: string
  ratedBy: string            // Modell-ID oder 'regel'
}

export interface Briefing {
  generatedAt: string
  kind: RunKind
  model: string              // Modell-ID oder 'regel'
  title: string
  intro: string
  items: { storyId: string; text: string }[]
  outlook?: string
}

export interface BriefingIndexEntry {
  file: string
  kind: RunKind
  generatedAt: string
  title: string
}

export interface Latest {
  generatedAt: string
  buildId: string
  run: RunKind
  stories: Story[]
}

export interface ArchiveDay {
  date: string               // Berliner Datum JJJJ-MM-TT
  generatedAt: string
  buildId: string
  frozen: boolean
  stories: Story[]
}

export interface IndexEntry {
  id: string
  date: string
  title: string
  category: Category
  impact: number
  personal: number
  tags: string[]
  url: string
  src: string                // Quellen-ID der Primärquelle
}

export interface MetaHealthIssue {
  id: string
  name: string
  status: string
  since: string
  coveredBy?: string
}

export interface Meta {
  generatedAt: string
  buildId: string
  run: RunKind
  firstMonth: string         // 'JJJJ-MM'
  health: {
    checkedAt: string
    counts: { ok: number; degraded: number; blockiert: number }
    issues: MetaHealthIssue[]
    stale: string[]
  }
  budget: { level: 'abo' | 'api' | 'aus'; apiUsdMonth: number; apiUsdCap: number; resetHint?: string }
  notices: { kind: 'quelle' | 'agb' | 'recht' | 'token' | 'system'; sourceId?: string; text: string; since: string }[]
  credits: { name: string; url: string; license?: string }[]
}

// fristen.json (Skill gesetze-und-fristen)
export interface Frist {
  id: string
  kind: 'gesetz' | 'gericht' | 'agb' | 'modell'
  title: string
  jurisdiction?: Jurisdiction
  region?: string
  provider?: string
  document?: string
  models?: string[]
  status: LawStatus
  date: string | null
  dateKind: 'gilt_ab' | 'in_kraft' | 'frist' | 'stichtag' | 'abschaltung'
  sourceUrl: string
  verifiedAt: string | null
  note?: string
  origin: 'kuratiert' | 'automatisch'
  procedure?: string
  storyId?: string
}

// watchlist.json (Skill modelle-und-ranglisten)
export interface WatchlistEntry {
  org: string
  displayName: string
  aliases: { arena: string | null; openrouter: string[]; hf: string[]; github: string[] }
  arenaRank: number | null
  arenaRating: number | null
  aaIndex: number | null
  combinedRank: number
  trend: 'up' | 'down' | 'same' | 'new'
  isClimber: boolean
  reason: ('basis' | 'top12' | 'aufsteiger')[]
  sourcesActive: string[]
  aliasMissing: boolean
  history?: { week: string; combinedRank: number | null; arenaRating: number | null; aaIndex: number | null }[]
}

export interface Watchlist {
  generatedAt: string
  week: string               // 'JJJJ-Www'
  basis: { arenaPublishDate: string | null; arenaStale: boolean; openrouterFetchedAt: string }
  providers: WatchlistEntry[]
  newOrgs?: { org: string; via: 'openrouter-prefix' | 'hf-trending'; firstSeen: string; example: string }[]
}
