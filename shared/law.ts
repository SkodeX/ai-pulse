// Statusmodell für Gesetze und Gerichtsverfahren (Skill gesetze-und-fristen).
// Deutsche Labels nur hier; Ränge und Merge ergänzt pipeline/law/status.ts.

export const LAW_STATUSES = [
  'entwurf', 'konsultation', 'verhandlung', 'angenommen', 'verkuendet', 'in_kraft', 'gilt_ab', // Gesetzgebung
  'klage', 'anhoerung', 'urteil', 'vergleich',                                                 // Gericht
  'gescheitert', 'leitlinie', 'aufsicht',                                                      // Ergänzung
] as const

export type LawStatus = typeof LAW_STATUSES[number]

export const LAW_STATUS_LABELS: Record<LawStatus, string> = {
  entwurf: 'Entwurf',
  konsultation: 'Konsultation',
  verhandlung: 'In Verhandlung',
  angenommen: 'Angenommen',
  verkuendet: 'Verkündet',
  in_kraft: 'In Kraft',
  gilt_ab: 'Gilt ab',
  klage: 'Klage',
  anhoerung: 'Anhörung',
  urteil: 'Urteil',
  vergleich: 'Vergleich',
  gescheitert: 'Gescheitert',
  leitlinie: 'Leitlinie/Norm',
  aufsicht: 'Aufsicht',
}

export type Jurisdiction = 'EU' | 'DE' | 'US' | 'US-Staat'
