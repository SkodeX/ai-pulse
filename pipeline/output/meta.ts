// Teil health und notices für meta.json aus state/sources-health.json (Skill quellen § 5).

import type { HealthFile } from '../collect/health.ts'
import { SOURCE_BY_ID } from '../config/sources.ts'
import type { Meta } from '../../shared/types.ts'

export function buildHealth(health: HealthFile, now: Date): Meta['health'] {
  const entries = Object.entries(health.sources).filter(([id]) => !SOURCE_BY_ID.get(id)?.fallbackOnly)
  const counts = { ok: 0, degraded: 0, blockiert: 0 }
  for (const [, h] of entries) counts[h.status]++
  const name = (id: string) => SOURCE_BY_ID.get(id)?.name ?? id
  const issues = entries.filter(([, h]) => h.status !== 'ok').map(([id, h]) => {
    const issue: Meta['health']['issues'][number] = { id, name: name(id), status: h.status, since: h.failingSince ?? h.lastAttempt ?? now.toISOString() }
    if (h.fallbackActive.length) issue.coveredBy = h.fallbackActive.map(name).join(', ')
    return issue
  })
  const stale = entries.filter(([, h]) => h.stale).map(([id]) => name(id))
  return { checkedAt: health.updatedAt || now.toISOString(), counts, issues, stale }
}

export function sourceNotices(health: HealthFile, now: Date): Meta['notices'] {
  const out: Meta['notices'] = []
  const since = now.toISOString()
  for (const [id, h] of Object.entries(health.sources)) {
    const s = SOURCE_BY_ID.get(id)
    if (!s || s.fallbackOnly) continue
    if ((h.finalUrlRuns ?? 0) >= 3) out.push({ kind: 'quelle', sourceId: id, text: `${s.name}: Weiterleitung seit 3 Läufen – Register-URL nachziehen.`, since })
    if (h.hints.includes('start-ok')) out.push({ kind: 'quelle', sourceId: id, text: `${s.name} ist wieder erreichbar – startStatus im Register entfernen.`, since })
    if (h.status !== 'ok' && h.fallbackActive.length === 0) out.push({ kind: 'quelle', sourceId: id, text: `${s.name} ist ${h.status} und hat keinen greifenden Fallback.`, since })
    if ((h.floodRuns ?? 0) >= 3) out.push({ kind: 'quelle', sourceId: id, text: `${s.name} liefert seit 3 Läufen mehr Einträge als die Flutbremse erlaubt.`, since })
    if (h.stale && s.priority === 'core') out.push({ kind: 'quelle', sourceId: id, text: `${s.name} hat seit über ${s.staleDays ?? 14} Tagen nichts Neues.`, since })
  }
  return out
}
