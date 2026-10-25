// Ränge und Merge des Statusmodells (Skill gesetze-und-fristen). Werte und Labels: shared/law.ts.

import type { LawStatus } from '../../shared/law.ts'

const LEGISLATION: LawStatus[] = ['entwurf', 'konsultation', 'verhandlung', 'angenommen', 'verkuendet', 'in_kraft', 'gilt_ab']
const COURT: Partial<Record<LawStatus, number>> = { klage: 1, anhoerung: 2, urteil: 3, vergleich: 3 }

export function lawRank(s: LawStatus): number | undefined {
  const i = LEGISLATION.indexOf(s)
  if (i >= 0) return i + 1
  return COURT[s]
}

// Monotonie je Verfahren: 'meldung' nur vorwärts; 'quelle' vorwärts oder auf gescheitert; leitlinie/aufsicht ohne Rang
export function mergeLawStatus(current: LawStatus | undefined, next: LawStatus, source: 'quelle' | 'meldung'): LawStatus {
  if (!current) return next
  if (current === 'gescheitert') return source === 'quelle' ? next : current
  if (next === 'gescheitert') return source === 'quelle' ? next : current
  const a = lawRank(current), b = lawRank(next)
  if (a === undefined || b === undefined) return next
  return b >= a ? next : current
}
