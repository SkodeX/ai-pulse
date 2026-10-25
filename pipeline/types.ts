// Pipeline-interne Typen. ParsedEntry/RawItem: Skill quellen · Cluster: bewertung · LawHint: gesetze-und-fristen.

import type { Category } from '../shared/categories.ts'
import type { Jurisdiction, LawStatus } from '../shared/law.ts'
import type { Story } from '../shared/types.ts'

export interface Signals {
  hnPoints?: number
  hnComments?: number
  upvotes?: number
  techmemeUrl?: string
  releaseNotes?: string      // Release-Body gekürzt (2–3 KB)
  prerelease?: boolean       // nur GitHub REST (Atom kennt kein Flag)
  batch?: string             // nur YC (z. B. 'Fall 2026')
}

export interface ParsedEntry {
  sourceId: string
  guid?: string
  url: string
  title: string
  description: string        // Klartext ≤ 1 000 Zeichen, '' wenn keine
  categories: string[]
  author?: string
  publishedAt?: string       // ISO; fehlt bei datumslosen Feeds und vordatierten Items
  signals?: Signals
}

export interface LawHint {
  status: LawStatus
  jurisdiction: Jurisdiction
  region?: string
  effectiveDate?: string
  procedure?: string
  statusSource: 'quelle'
  changed: boolean
}

export interface RawItem {
  sourceId: string
  key: string
  url: string
  canonicalUrl: string
  title: string
  teaser: string             // Klartext ≤ 300 Zeichen
  publishedAt?: string
  firstSeen: string
  lang: 'de' | 'en'
  paywall: boolean
  categoryHint: Category[]
  signals?: Signals
  clusterKey?: string
  lawHint?: LawHint
  seenStoryId?: string
}

export interface Cluster {
  clusterKey: string         // vorgegeben oder vorläufig 'u-' + sha1(primary.canonicalUrl).slice(0, 12)
  items: RawItem[]
  primary: RawItem
  sources: Story['sources']
  firstSeen: string
  publishedAt?: string
  signals: {
    hnPoints?: number
    hnComments?: number
    upvotes?: number
    techmeme: boolean
    independentSources: number
    releaseNotes?: string
  }
  existingStoryId?: string
  preScore?: number          // ab Phase 2
}
