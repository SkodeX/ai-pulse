// Die 11 Kategorien von AI Pulse – einzige Liste für Pipeline und Dashboard.

export const CATEGORY_KEYS = [
  'modelle', 'neuigkeiten', 'sicherheit', 'gesetze', 'vertraege', 'ideen',
  'startups', 'preise', 'opensource', 'forschung', 'funding',
] as const

export type Category = typeof CATEGORY_KEYS[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  modelle: 'Modelle',
  neuigkeiten: 'Neuigkeiten',
  sicherheit: 'Sicherheitslücken',
  gesetze: 'Gesetze & Regulierung',
  vertraege: 'Vertragsänderungen',
  ideen: 'Innovative Ideen',
  startups: 'Aufstrebende Unternehmen',
  preise: 'Preise & API-Änderungen',
  opensource: 'Open Source & Tools',
  forschung: 'Forschung & Benchmarks',
  funding: 'Funding & Übernahmen',
}

export function isCategory(value: string): value is Category {
  return (CATEGORY_KEYS as readonly string[]).includes(value)
}
