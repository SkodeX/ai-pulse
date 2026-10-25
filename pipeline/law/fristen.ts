// Kuratierte Fristen (Startliste geprüft am 2026-10-24, Skill gesetze-und-fristen references/fristen-start.md).
// Nur eine interaktive Sitzung ändert diese Liste (Prüfung an der Quelle, verifiedAt setzen) – nie der Server-Job.
// date: null = „Datum prüfen", nie raten.

import type { Frist } from '../../shared/types.ts'

const SD = 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act'
const OEIL = 'https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0359(COD)'
const GII = 'https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html'
const COAG = 'https://coag.gov/ai/'
const CPPA = 'https://cppa.ca.gov/regulations/'
const LEGINFO = 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB53'
const NYA = 'https://nyassembly.gov/leg/?bn=S06953&term=2025&Actions=Y'
const TXC = 'https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149'
const CELLAR = 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj'
const V = '2026-10-24'

type Curated = Omit<Frist, 'origin'>
const eu = (id: string, title: string, status: Frist['status'], date: string | null, dateKind: Frist['dateKind'], sourceUrl: string, note?: string): Curated =>
  ({ id, kind: 'gesetz', title, jurisdiction: 'EU', status, date, dateKind, sourceUrl, verifiedAt: V, ...(note ? { note } : {}), procedure: id.startsWith('eu-digital-omnibus') ? '2025/0359(COD)' : '2024/1689' })
const us = (id: string, region: string, title: string, status: Frist['status'], date: string | null, dateKind: Frist['dateKind'], sourceUrl: string, note?: string): Curated =>
  ({ id, kind: 'gesetz', title, jurisdiction: 'US-Staat', region, status, date, dateKind, sourceUrl, verifiedAt: date ? V : null, ...(note ? { note } : {}) })

const LIST: Curated[] = [
  eu('eu-ai-act-inkrafttreten', 'KI-Verordnung tritt in Kraft', 'in_kraft', '2024-08-01', 'in_kraft', SD),
  eu('eu-ai-act-verbote-ki-kompetenz', 'Allgemeine Bestimmungen (Definitionen, KI-Kompetenz) und Verbote gelten', 'gilt_ab', '2025-02-02', 'gilt_ab', SD),
  eu('eu-ai-act-gpai-governance', 'Pflichten für GPAI-Modelle gelten; Behörden und Sanktionsregeln der Mitgliedstaaten, AI Board, Scientific Panel, Advisory Forum', 'gilt_ab', '2025-08-02', 'gilt_ab', SD),
  eu('eu-ai-act-art50-durchsetzung', 'Transparenzpflichten (Art. 50) gelten, Durchsetzung beginnt (GPAI, Verbote, Transparenz, KI-Kompetenz)', 'gilt_ab', '2026-08-02', 'gilt_ab', SD, '„Mehrheit der Regeln" laut Service Desk'),
  eu('eu-ai-act-neue-verbote', 'Neue Verbote (nicht-einvernehmliche sexuelle Deepfakes, Darstellungen sexuellen Kindesmissbrauchs) gelten', 'in_kraft', '2026-12-02', 'gilt_ab', SD, 'durch den Digital Omnibus eingefügt'),
  eu('eu-ai-act-art50-2-uebergang', 'Übergangsfrist Art. 50 Abs. 2 endet für Systeme mit synthetischen Inhalten, die vor dem 02.08.2026 in Verkehr gebracht wurden', 'in_kraft', '2026-12-02', 'frist', SD, 'durch den Digital Omnibus geändert'),
  eu('eu-ai-act-reallabore', 'Mindestens ein KI-Reallabor je Mitgliedstaat in Betrieb', 'in_kraft', '2027-08-02', 'stichtag', SD),
  eu('eu-ai-act-hochrisiko-anhang-iii', 'Regeln für Hochrisiko-KI nach Anhang III gelten', 'in_kraft', '2027-12-02', 'gilt_ab', SD, 'durch den Digital Omnibus verschoben (früher 02.08.2027)'),
  eu('eu-ai-act-hochrisiko-anhang-i', 'Regeln für Hochrisiko-KI in Produkten nach Anhang I gelten', 'in_kraft', '2028-08-02', 'gilt_ab', SD, 'letzter Haupt-Meilenstein'),
  eu('eu-digital-omnibus-ki-abl', 'Digital Omnibus zur KI: Verordnung (EU) 2026/1744 im Amtsblatt veröffentlicht', 'in_kraft', '2026-07-24', 'stichtag', OEIL, 'Rat 29.06.2026, unterzeichnet 08.07.2026'),
  eu('eu-digital-omnibus-ki-inkraft', 'Digital Omnibus zur KI (Verordnung (EU) 2026/1744) in Kraft', 'in_kraft', '2026-07-27', 'in_kraft', CELLAR, 'CELEX 32026R1744'),
  { id: 'de-ki-mig-inkraft', kind: 'gesetz', title: 'KI-MIG in Kraft – Bundesnetzagentur ist Marktüberwachungsbehörde für die KI-VO', jurisdiction: 'DE', status: 'in_kraft', date: '2026-07-29', dateKind: 'in_kraft', sourceUrl: GII, verifiedAt: V, note: 'Gesetz vom 22.07.2026, BGBl. 2026 I Nr. 223', procedure: 'BGBl. 2026 I Nr. 223' },
  us('us-co-admt-act', 'US-CO', 'Colorado ADMT Act (SB 26-189, ersetzt SB 24-205) gilt', 'verkuendet', '2027-01-01', 'in_kraft', COAG, 'Generalstaatsanwalt muss Regeln vor dem 01.01.2027 erlassen'),
  us('us-co-chatbot-safety', 'US-CO', 'Colorado Chatbot Safety Act (HB 26-1263) gilt', 'verkuendet', '2027-01-01', 'in_kraft', COAG),
  us('us-co-regeln-kommentarfrist', 'US-CO', 'Colorado: Kommentarfrist und Anhörung zu den ADMT- und Chatbot-Regeln', 'konsultation', '2026-10-26', 'frist', COAG, 'Frist läuft bis zum letzten Anhörungstag, falls die Anhörung länger dauert'),
  us('us-ca-ccpa-regs', 'US-CA', 'Kalifornien: CCPA-Regulations wirksam', 'in_kraft', '2026-01-01', 'in_kraft', CPPA, 'eigene ADMT-Compliance-Stichtage noch prüfen'),
  us('us-ca-sb53', 'US-CA', 'Kalifornien SB 53', 'verkuendet', null, 'in_kraft', LEGINFO, 'Gegenstand und Inkrafttreten prüfen'),
  us('us-ny-raise', 'US-NY', 'New York RAISE Act (S6953B, Chapter 699/2025)', 'verkuendet', null, 'in_kraft', NYA, 'unterzeichnet 19.12.2025; Inkrafttreten nach Chapter Amendment prüfen'),
  us('us-tx-traiga', 'US-TX', 'Texas Responsible AI Governance Act (HB 149) in Kraft', 'in_kraft', '2026-01-01', 'in_kraft', TXC),
  // AGB-Stichtage: Übergangsweise kuratiert, bis der AGB-Monitor (vertragsaenderungen) sie automatisch liefert
  { id: 'agb-anthropic-aup-2026-11-12', kind: 'agb', title: 'Neue Anthropic Usage Policy gilt', provider: 'Anthropic', document: 'Usage Policy', status: 'verkuendet', date: '2026-11-12', dateKind: 'stichtag', sourceUrl: 'https://www.anthropic.com/legal/aup', verifiedAt: V, note: 'aus der Recherche; wird vom AGB-Monitor übernommen' },
  { id: 'agb-openai-usage-policies-2026-11-20', kind: 'agb', title: 'Neue OpenAI Usage Policies gelten', provider: 'OpenAI', document: 'Usage Policies', status: 'verkuendet', date: '2026-11-20', dateKind: 'stichtag', sourceUrl: 'https://openai.com/policies/usage-policies/', verifiedAt: V, note: 'aus der Recherche; wird vom AGB-Monitor übernommen' },
]

export const CURATED_FRISTEN: Frist[] = LIST.map(f => ({ ...f, origin: 'kuratiert' }))
