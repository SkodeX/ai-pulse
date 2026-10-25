// UI-Texte und Labels (Skill dashboard-entwickeln, references/ui-texte.md). Du-Form, kurz.
import type { LawStatus } from '../shared/law.ts';
import type { RunKind } from '../shared/types.ts';

export const CATEGORY_SHORT: Record<string, string> = {
  modelle: 'Modelle', neuigkeiten: 'Neues', sicherheit: 'Sicherheit', gesetze: 'Recht', vertraege: 'Verträge', ideen: 'Ideen',
  startups: 'Startups', preise: 'Preise', opensource: 'Open Source', forschung: 'Forschung', funding: 'Funding',
};

export const RUN_LABEL: Record<RunKind, string> = { morning: 'Morgenlauf', midday: 'Mittagslauf', evening: 'Abendlauf', weekly: 'Wochenlauf' };
export const BRIEFING_HEAD: Record<RunKind, string> = { morning: 'Das Wichtigste', midday: 'Seit heute früh', evening: 'Seit heute früh', weekly: 'Wochenrückblick' };

export const LAW_LABEL: Record<LawStatus, string> = {
  entwurf: 'Entwurf', konsultation: 'Konsultation', verhandlung: 'In Verhandlung', angenommen: 'Angenommen', verkuendet: 'Verkündet',
  in_kraft: 'In Kraft', gilt_ab: 'Gilt ab', klage: 'Klage', anhoerung: 'Anhörung', urteil: 'Urteil', vergleich: 'Vergleich',
  gescheitert: 'Gescheitert', leitlinie: 'Leitlinie/Norm', aufsicht: 'Aufsicht',
};
export const JURISDICTION: Record<string, string> = { EU: 'EU', DE: 'Deutschland', US: 'USA (Bund)', 'US-Staat': 'US-Bundesstaat' };
export const SEVERITY: Record<string, string> = { critical: 'kritisch', high: 'hoch', medium: 'mittel', low: 'niedrig' };
export const NOTICE_KIND: Record<string, string> = { quelle: 'Quelle', agb: 'AGB', recht: 'Recht', token: 'Abo-Token', system: 'System' };
export const HEALTH_LABEL: Record<string, string> = { ok: 'ok', degraded: 'gestört', blockiert: 'blockiert' };
export const FRIST_KIND: Record<string, string> = { gesetz: 'Gesetz', gericht: 'Gericht', agb: 'AGB', modell: 'Abschaltung' };

export function modelLabel(model: string): string {
  if (model === 'regel') return 'ohne KI erstellt';
  if (model === 'claude-opus-5-5') return 'erstellt mit Claude Opus 5.5';
  if (model === 'claude-haiku-5-5') return 'erstellt mit Claude Haiku 5.5';
  return `erstellt mit ${model}`;
}

export const T = {
  stale: (stand: string) => `Die Daten sind älter als 24 Stunden (Stand: ${stand}). Der automatische Lauf ist vermutlich ausgefallen.`,
  overdue: 'Update überfällig',
  offline: 'Offline',
  loadError: 'Daten gerade nicht erreichbar.',
  retry: 'Erneut versuchen',
  emptyFilter: 'Keine Meldungen für diese Filter.',
  emptyCategory: 'Für diese Kategorie gibt es in den letzten 72 Stunden nichts.',
  emptySaved: 'Noch nichts gemerkt. Tippe bei einer Meldung auf das Lesezeichen.',
  savedFull: 'Du hast schon 300 Meldungen gemerkt. Entferne ältere unter Gemerkt, dann klappt es.',
  storageFull: 'Speicher voll – lösche ältere Merkzettel.',
  privacy: 'Gelesen und Gemerkt speichert nur dein Browser. Keine Cookies, kein Tracking, kein Konto.',
  ruleRated: 'ohne KI bewertet',
};
