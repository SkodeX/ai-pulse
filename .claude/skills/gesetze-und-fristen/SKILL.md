---
name: gesetze-und-fristen
description: Recht für AI Pulse (EU, DE, USA, Gerichte) – LawStatus, Statusregeln je strukturierter Quelle, Rechtsquellen, Keyword-Regex, law-watch.json, fristen.json. Laden, bevor du Rechtsquellen anbindest, an pipeline/law/ arbeitest, law befüllst oder Fristen änderst.
---

# Gesetze & Fristen

Ziel: Meldungen der Kategorie `gesetze` tragen einen **verlässlichen Status** (`law`), und `public/data/fristen.json` zeigt alle wichtigen Stichtage – ohne geratene Daten. Stand 2026-10-24: nichts gebaut, alles hier ist Plan (Phase 4, Modul 2). Quellen-Rohdaten: `docs/recherche/2026-10-24/katalog/recht.md`, Lückenrecherche GAP 4 in `querschnitt.md`.

Abgrenzung: Abruf, ETag, Challenge-Erkennung, Circuit-Breaker, Parser-Mechanik → `quellen`. Prompts, Structured Outputs, Kostenbuch, `meta.json` schreiben → `bewertung`. AGB-Stichtage und Abschalttermine von den Deprecation-Seiten der Anbieter → `vertragsaenderungen`, OpenRouter-`expiration_date` → `modelle-und-ranglisten` (beide übergeben an `build-fristen.ts`, das als Einziges `fristen.json` schreibt). `bsi-presse` gehört `sicherheitsluecken` (Registereintrag, ein Abruf) – hier nur die Rechts-Treffer lesen. Ansicht **Fristen** → `dashboard-entwickeln`. Heimserver, Takt-Umsetzung, `/etc/ai-pulse/env` → `job-betrieb`.

## Grundsätze

- **Struktur schlägt Claude.** Wo eine Quelle den Status maschinenlesbar liefert, setzt Code ihn (`statusSource: 'quelle'`). Claude schlägt nur für Fließtext vor (`'meldung'`), das Dashboard zeigt dann „laut Meldung“.
- **Nie ein Datum raten.** Kein „+20 Tage nach ABl.“, kein „90 Tage nach Unterzeichnung“. Unbelegt → leer bzw. `date: null` („prüfen“).
- **Kein eigener Claude-Aufruf** für Recht (schont das Abo-Kontingent): Rechts-Items laufen durch Stufe 1/2 (Haiku 5.5) wie alle anderen (Obergrenzen ≤ 80 / ≤ 25 gelten mit). Erwartet nach Filter: ~3–10 Rechts-Items pro Tag.
- Große Volltext-Feeds (White House 575 KB, Substack 321 KB, netzpolitik 446 KB, BGBl 420 KB, CJEU-Seite 934 KB): Keyword-Filter auf Titel + erste 1.000–2.000 Zeichen, an Claude nur Titel + Teaser ≤ 300 Zeichen (`RawItem`-Vertrag in `quellen`); längeren Text holt Stufe 2 selbst.
- Kuratierte Fristen ändert **nie der Server-Job**, nur eine interaktive Claude-Code-Sitzung (mit Prüfung an der Quelle, Commit von Hand). Der Job darf nur `origin: 'automatisch'`-Einträge schreiben, Status nach Datum anheben und `checks` pflegen.

## Dateien (geplant)

| Pfad | Inhalt |
|---|---|
| `shared/law.ts` | `LAW_STATUSES` (as const) und `LawStatus` – einzige Liste, gemeinsam für Pipeline und Dashboard (Steckbrief; Code unten) |
| `pipeline/law/status.ts` | importiert `LAW_STATUSES`/`LawStatus` aus `shared/law.ts` und ergänzt Ränge, deutsche Labels, `mergeLawStatus()` |
| `pipeline/types.ts` | Typ `LawHint` (Eigentümer: dieser Skill, Steckbrief; Form unten), Feld `RawItem.lawHint` |
| `pipeline/law/map.ts` | strukturierte Felder einer Quelle → `LawHint` (Regeln unten), Verfahrens-ID-Regex |
| `pipeline/law/procedures.ts` | Watchlist: OEIL-Referenzen, DIP-Vorgangs-IDs, CourtListener-Dockets, US-Bills |
| `pipeline/law/fristen.ts` | kuratierte Fristen (Startliste: `references/fristen-start.md`) |
| `pipeline/law/build-fristen.ts` | kuratiert + automatisch + Übergaben (AGB, Modell-Abschaltungen) → `public/data/fristen.json` |
| `state/law-watch.json` | Eigentümer: dieser Skill (Steckbrief). Je Verfahren höchster Status + Quelle; je Fristenquelle extrahierte Datumsliste (Form unten) |
| `pipeline/config/sources.ts` | Rechtsquellen mit den optionalen Zusatzfeldern `jurisdiction`, `jurisdictionFixed`, `region`, `lawMap` (Erweiterung des `Source`-Typs aus `quellen`; Vorlage: `references/quellen.md`) |
| `pipeline/config/keywords.ts` | `LAW_EN`, `LAW_DE`, Blacklist (unten) |

```ts
interface LawWatch {   // state/law-watch.json, committet, < 1 MB, nichts Geheimes
  procedures: Record<string, { status: LawStatus; statusSource: 'quelle' | 'meldung'; sourceId: string; since: string }>  // Schlüssel = law.procedure
  dateSources: Record<string, { checkedAt: string; dates: string[] }>   // Schlüssel = Quellen-ID, ISO-Daten sortiert
}
```

Leere oder Challenge-Antworten überschreiben nie `dateSources` (sonst meldet der nächste Abgleich alle Daten als „neu“).

## Statusmodell

Kein `enum` (Type-Stripping) – Array + abgeleiteter Typ in `shared/law.ts`; `z.enum(LAW_STATUSES)` für Structured Outputs importiert von dort (nie eine zweite Liste in `pipeline/`):

```ts
// shared/law.ts
export const LAW_STATUSES = [
  'entwurf', 'konsultation', 'verhandlung', 'angenommen', 'verkuendet', 'in_kraft', 'gilt_ab', // Gesetzgebung
  'klage', 'anhoerung', 'urteil', 'vergleich',                                                 // Gericht
  'gescheitert', 'leitlinie', 'aufsicht',                                                      // Ergänzung, s. u.
] as const
export type LawStatus = typeof LAW_STATUSES[number]
```

| Wert | Label | Bedeutung |
|---|---|---|
| `entwurf` | Entwurf | Vorschlag liegt vor (COM-Vorschlag, Referenten-/Regierungsentwurf, Bill eingebracht, Proposed Rule nach Fristende) |
| `konsultation` | Konsultation | Stellungnahme möglich, Frist läuft (Have Your Say offen, Proposed Rule vor `comments_close_on`) |
| `verhandlung` | In Verhandlung | Ausschuss, Trilog, Lesungen, Rulemaking-Anhörung |
| `angenommen` | Angenommen | beschlossen, noch nicht unterzeichnet/verkündet |
| `verkuendet` | Verkündet | im ABl./BGBl./Federal Register veröffentlicht bzw. unterzeichnet (signed, chaptered), noch nicht in Kraft |
| `in_kraft` | In Kraft | in Kraft getreten; bei gestaffelten Akten: Anwendungsdaten teils noch offen |
| `gilt_ab` | Gilt ab | Anwendungsbeginn erreicht – nur für Akte, die Inkrafttreten und Anwendung trennen (EU-Verordnungen, gestaffelte US-Gesetze) |
| `klage` · `anhoerung` · `urteil` · `vergleich` | Klage · Anhörung · Urteil · Vergleich | Gericht; `anhoerung` umfasst Hearing, mündliche Verhandlung, Schlussanträge; `urteil` auch nicht rechtskräftig |
| `gescheitert` | Gescheitert | Veto, Rücknahme, Ablehnung, Nichtigerklärung |
| `leitlinie` | Leitlinie/Norm | kein Gesetzgebungsakt: Leitlinien, Codes of Practice, harmonisierte Normen, DSK-Entschließungen |
| `aufsicht` | Aufsicht | Behördenhandeln: Bußgeld, Anordnung, Prüfverfahren |

Die letzten drei ergänzen das Grundmodell der Recherche (Veto-Saison in Kalifornien, viele Leitlinien/DPA-Meldungen ohne Verfahren) und sind gesetzter Standard (Steckbrief). Ränge: Gesetzgebung 1–7 in Tabellenreihenfolge, Gericht `klage` 1 < `anhoerung` 2 < `urteil` = `vergleich` 3; `gescheitert` ist Endzustand; `leitlinie` und `aufsicht` haben keinen Rang (keine Monotonieprüfung).

**Monotonie je Verfahren:** `state/law-watch.json` hält pro `law.procedure` den höchsten Status. Ein niedrigerer Vorschlag mit `'meldung'` wird verworfen; `'quelle'` darf nur vorwärts gehen oder auf `gescheitert` springen. Verordnung und zugehörige Durchführungsregeln (z. B. Colorado-Gesetz vs. AG-Rulemaking) sind **getrennte** Verfahren.

## Story-Feld `law`

Form steht im Datenvertrag des Steckbriefs: `law?: { status: LawStatus; jurisdiction: 'EU' | 'DE' | 'US' | 'US-Staat'; effectiveDate?: string; statusSource?: 'quelle' | 'meldung'; procedure?: string; region?: string }`. Befüllen:

- `statusSource` – fehlt = `'meldung'` (Dashboard: „laut Meldung“).
- `procedure?: string` – Verfahrens-ID für Clustering und Fristen-Verknüpfung (`2025/0359(COD)`, `BGBl. 2026 I Nr. 223`, `FR 2026-21786`, `C-806/24`, `5:26-cv-12308`).
- `region?: string` – ISO 3166-2 für Bundesstaaten und Länder (`US-CA`, `US-CO`, `US-NY`, `US-TX`, `DE-BW`, `DE-HH`, `DE-BE`, `DE-BY`).

`effectiveDate` (ISO `YYYY-MM-DD`) nur für Inkrafttreten/Anwendungsbeginn, nie für Kommentarfristen (die gehen als `frist` in `fristen.json`). Meldungen ohne Verfahren und ohne passenden Status sowie andere Rechtsräume (UK, China …): `law` weglassen.

## Status deterministisch setzen

```ts
// pipeline/types.ts
export interface LawHint {
  status: LawStatus                               // import type aus shared/law.ts
  jurisdiction: 'EU' | 'DE' | 'US' | 'US-Staat'
  region?: string; effectiveDate?: string; procedure?: string
  statusSource: 'quelle'
  changed: boolean                                // Statuswechsel gegenüber state/law-watch.json
}
```

Der Parser gibt die strukturierten Felder (z. B. Federal Register `type`, `effective_on`, `comments_close_on`) in `ParsedEntry.signals` mit (Form → `quellen`); `pipeline/law/map.ts` bildet daraus beim Erzeugen des `RawItem` nach dem Vorfilter den Hint (`RawItem.lawHint`). Stufe 1 bekommt ihn als Fakt; der Merge-Code überschreibt Claude immer mit dem Hint. `changed: true` = **Statuswechsel** im Sinne von `bewertung` (Vor-Score +2, immer an Claude): neues Verfahren oder Status höher als in `state/law-watch.json`.

| Quelle | Signal | Status / Datum |
|---|---|---|
| Federal Register `type` | `Proposed Rule` + `comments_close_on ≥ heute` | `konsultation`; Frist → `fristen.json` (`frist`, automatisch) |
| | `Proposed Rule` sonst | `entwurf` |
| | `Rule` + `effective_on > heute` | `verkuendet`, `effectiveDate = effective_on` |
| | `Rule` + `effective_on ≤ heute` oder `null` | `in_kraft` |
| | `Presidential Document` | `in_kraft` (gilt mit Unterzeichnung); Art über Feld `subtype` (`Executive Order`, `Notice` …) |
| White House Presidential Actions | jedes Item (unterzeichnet) | `in_kraft`; FR-Veröffentlichung (PRESDOCU) folgt später → clustern |
| EUR-Lex OJ-L-RSS / CELLAR | Rechtsakt im ABl. | `verkuendet`; Inkrafttreten nur aus CELLAR (`cdm:resource_legal_date_entry-into-force`), sonst leer |
| OEIL `Stage reached in procedure` | `Procedure completed` + Key event „Final act published in Official Journal“ | `verkuendet`, Datum des Events |
| | Key event „Final act signed“ / „Act adopted by Council…“ | `angenommen` |
| | `Awaiting …`, Ausschuss-/Trilog-Stadien | `verhandlung` |
| Have Your Say | Eintrag in `currentStatuses[]` mit `isCurrent: true`: `feedbackEndDate` in der Zukunft (bzw. `receivingFeedbackStatus` „offen“ – beobachtet nur `CLOSED`, `DISABLED`, Wert beim Bau prüfen) | `konsultation`, `feedbackEndDate` → `frist` |
| BGBl-I-RSS | `<meta:typ>` = `Gesetz`/`Verordnung` (nicht den Titelanfang prüfen: „Erste Verordnung …“, „Zweites Gesetz …“ sind fast die Hälfte) | `verkuendet`, `procedure` aus `<meta:fundstelle>` (`BGBl. 2026 I Nr. 223 vom 28.07.2026` → `BGBl. 2026 I Nr. 223`, Datum = Verkündung) bzw. ELI-Link `…/eli/bund/bgbl-1/<Jahr>/<Nr>` |
| | Titel `Bekanntmachung über das Inkrafttreten …` (`meta:typ` `Sonstiges`) | `in_kraft` |
| DIP (nur mit Key) | `verkuendung[]` nicht leer | `verkuendet` (`verkuendungsdatum`) |
| | `inkrafttreten[].datum` | `≤ heute` → `in_kraft`, sonst `effectiveDate` |
| | nur `beratungsstand` (String, Spec nennt nur Beispiel `Abgeschlossen`) | Werte beim ersten Abruf sammeln, Mapping-Tabelle ergänzen; bis dahin Claude |
| Bundestag hib `digitales.rss` | 2. `<category>` = `Gesetzentwurf` | `entwurf` (andere Kategorien: kein Status) |
| CourtListener RECAP-Suche | neues Docket, `dateFiled` | `klage`; `dateTerminated` gesetzt → Claude schlägt `urteil`/`vergleich` vor |
| CourtListener Opinion-Feed, Bayern.Recht-Feed | Entscheidung | `urteil` |
| CJEU-Pressemitteilungen | Titel `^Judgments? of the (Court\|General Court\|Court of Justice)` / `^Opinions? of (the )?Advocate General` (beobachtet: „Opinions of the …“, „Opinion of Advocate General …“); `^Order of` → kein Status | `urteil` / `anhoerung`; Rechtssache `\b[CT]-\d{1,4}\/\d{2}( P)?\b` |
| NY Assembly Actions | Zeile `SIGNED CHAP.\d+` | `verkuendet` |

Ohne strukturiertes Signal: Stufe 1 liefert `law` mit `statusSource: 'meldung'`; `effectiveDate` nur, wenn das Datum wörtlich im Text steht. Dafür braucht `TriageOut` in `bewertung` ein Feld `law` (nullable, nur bei `category: 'gesetze'` gefüllt: `status` per `z.enum(LAW_STATUSES)` aus `shared/law.ts`, `jurisdiction`, `effectiveDate`; dasselbe zod-Schema geht als `--json-schema` an die CLI und ans Notfall-Backend) – steht dort im Schema `TriageOut`. Zusätzlich dürfen Wort-Signale den Prompt stützen (nicht ersetzen): `Referentenentwurf|Regierungsentwurf` → `entwurf`, `provisional agreement|Trilog` → `verhandlung`, `Council adopts|plenary adopted|beschlossen` → `angenommen`, `signed|unterzeichnet` → `verkuendet`, `vetoed|Veto` → `gescheitert`.

## Rechtsraum

- Fest pro Quelle im Register (`jurisdiction`, `region`), nicht von Claude: EU-Institutionen, CJEU → `EU`; Bund, Bundesbehörden, BGH → `DE`; Landesbehörden/-gerichte → `DE` + `region`; Federal Register, White House, NIST, Copyright Office, Bundesgerichte → `US`; MultiState, gov.ca.gov, CalPrivacy, coag.gov, nyassembly.gov, capitol.texas.gov → `US-Staat` + `region`.
- Gemischte Quellen (`jurisdictionFixed: false`: Rapporteur, netzpolitik, LTO, ChatGPT Is Eating the World; bei MultiState nur die `region`) → Register-Standard, Claude darf korrigieren.
- CourtListener: RECAP-Suche (`type=r`) kommt aus PACER und ist immer Bundesgericht → `US`. Opinion-Feed: `court` enthält `District Court|Court of Appeals|Bankruptcy|Federal Claims|Supreme Court of the United States` → `US`, sonst `US-Staat`.

## Quellen (Kurzfassung)

Vollständige Tabelle mit URL, Filter, Datums-Eigenheit, Takt und Status-Signal: **`references/quellen.md`**. Kern ohne Key:

- **EU:** Digital-Strategy-RSS, AI Act Service Desk Timeline (Diff), EUR-Lex ABl. L RSS (`rssId=222`) + CELLAR SPARQL, AI-Act-Substack, EP-/Rat-/Press-Corner-RSS, EDPB, OEIL-Watchlist, Have Your Say, CJEU-Pressemitteilungen.
- **DE:** BNetzA-PM (KI-Marktüberwachung laut KI-MIG), BNetzA-KI-Service-Desk, BMDS, Bundestag hib `digitales.rss`, BGBl I, BMJV-Gesetzgebung, Bundesrat, KI-MIG auf gesetze-im-internet (Diff), BfDI, LfDI BW (Feed), HmbBfDI (News-Sitemap über Index), BlnBDI (HTML), BayLDA (stale, wöchentlich), DSK.
- **US:** Federal Register API, White House Presidential Actions, MultiState, gov.ca.gov, CalPrivacy, coag.gov/ai, NIST (inkl. CAISSI), Copyright Office NewsNet.
- **Gerichte:** ChatGPT Is Eating the World, CourtListener (Suche + Opinion-Feed), CJEU, LTO, Bayern.Recht (LG/OLG München, GEMA ./. OpenAI), BGH-PM.

Takt (`cadence`-Werte aus `quellen`): Feeds und Federal Register `3x` (jeder Lauf); CourtListener, CJEU, HmbBfDI, BlnBDI, Copyright NewsNet, DSM-HTML-Backfill, DIP `daily07` (07:07-Lauf); HTML-Diffs der Fristenquellen, OEIL, CELLAR, Have Your Say, DSK, BNetzA-Service-Desk, BayLDA `weekly`. Diffs nur über den normalisierten Textauszug des relevanten Abschnitts (nicht Roh-HTML: Tracking-IDs, „Load more“-Blöcke, MEP-Listen).

**Federal Register** inkrementell (`3x`, `gte` = Datum von `lastSuccessAt − 1 h`, Zeitfenster-Regel in `job-betrieb`):

```
https://www.federalregister.gov/api/v1/documents.json?conditions[term]="artificial intelligence"
  &conditions[type][]=RULE&conditions[type][]=PRORULE&conditions[type][]=PRESDOCU
  &conditions[publication_date][gte]=<JJJJ-MM-TT>&order=newest&per_page=50
  &fields[]=title&fields[]=type&fields[]=abstract&fields[]=action&fields[]=agencies&fields[]=publication_date
  &fields[]=effective_on&fields[]=comments_close_on&fields[]=html_url&fields[]=document_number
```

(Klammern und Leerzeichen URL-kodieren.) Danach `LAW_EN` auf `title` + `abstract` – Pflicht, siehe Fallen.

**CELLAR** (wöchentlich, POST `query=…`, `Accept: application/sparql-results+json`): `?work cdm:resource_legal_based_on_resource_legal ?ai . ?ai cdm:resource_legal_id_celex "32024R1689"^^xsd:string`, dazu `cdm:resource_legal_id_celex` und `cdm:work_date_document` des Werks. Liefert delegierte/Durchführungsrechtsakte, COM-Dokumente, EP-Entschließungen (zuletzt CELEX 32026R1755 vom 20.07.2026). Änderungsakte fehlen darin (Rechtsgrundlage AEUV) → zweite Abfrage mit `?work cdm:resource_legal_amends_resource_legal ?ai` (liefert 32026R1744, Digital Omnibus). Inkrafttreten über `cdm:resource_legal_date_entry-into-force` (32026R1744: 2026-07-27, geprüft 2026-10-24). Im Dashboard trotzdem auf EUR-Lex verlinken.

## Keyword-Filter (`pipeline/config/keywords.ts`)

Für gemischte Feeds, zusätzlich zu den Quellen-Filtern aus `references/quellen.md`:

```ts
export const LAW_EN = /\b(artificial intelligence|AI Act|2024\/1689|GPAI|general[- ]purpose AI|AI (?:system|model|Office|Board)s?|algorithm(?:ic|s)?|automated decision(?:[- ]making)?|ADMT|deepfakes?|chatbots?|frontier (?:AI|model)s?|super ?intelligence|foundation models?|CAISS?I|si\.gov|Digital Omnibus|codes? of practice|harmonised standards?)\b/i
export const LAW_EN_AI = /(?<![\p{L}\d])AI(?![\p{L}\d])/u                 // case-sensitiv
export const LAW_DE = /(künstliche[nrs]? Intelligenz|KI-Verordnung|KI-VO|KI-MIG|Sprachmodell|Algorithm|Deepfake|Superintelligenz|Chatbot|automatisierte[nr]? Entscheidung)/i
export const LAW_DE_KI = /(?<![\p{L}\d])KI(?![\p{L}\d])/u                 // „KI“, „KI-MIG“, nicht „Ski“
export const LAW_COPYRIGHT = /(copyright|Urheberrecht).{0,80}\b(AI|KI|training|models?)\b/i  // \b nötig: sonst trifft „ai“ in „claim“
export const LAW_BLACKLIST = /^(Daily News|Forward look|Media advisory|Speech by|Rede |Tagesordnung|Agenda|Termine?\b)/i
```

- Umbenennungen 2026 sind eingebaut: ai.gov → si.gov („America's Super Intelligence Initiatives“), NIST `/artificial-intelligence` → `/super-intelligence`, CAISI → CAISSI, Euractiv → Rapporteur, CPPA → CalPrivacy (`privacy.ca.gov`). Neue Umbenennungen sofort hier und in `quellen` nachtragen.
- **Verfahrens-IDs** (für `law.procedure` und Clustering über Quellen hinweg): EU-Verfahren `\b20\d{2}\/\d{4}\((COD|CNS|NLE|APP|INI)\)`, CELEX `\b3\d{4}[RLD]\d{4}\b`, `(Regulation|Directive|Verordnung|Richtlinie) \(EU\) 20\d{2}\/\d{1,4}`, BT-Drucksache `(Drucksache|Drs\.)\s*\d{2}\/\d{3,5}`, `BGBl\. 20\d{2} I Nr\. \d+`, CJEU `\b[CT]-\d{1,4}\/\d{2}\b`, US-Docket `\b\d:\d{2}-cv-\d{3,6}\b`. US-Bills (`\b(SB|AB|HB|S|A)\s?\d{1,5}\b`) nur zusammen mit dem Staat der Quelle – allein zu mehrdeutig. FR-`document_number` nur aus dem API-Feld.
- Taucht eine EU-Verfahrensnummer in Rechts-Items auf, die nicht in `procedures.ts` steht → `checks`-Eintrag `kind: 'verfahren'` („Verfahren beobachten?“, ohne Hinweis in `meta.json`).

## Fristen-Tabelle `public/data/fristen.json`

```ts
interface FristenFile { generatedAt: string; items: Frist[]; checks: FristCheck[] }
interface FristCheck {
  id: string                     // 'fristenquelle-<sourceId>' bzw. 'verfahren-<Nummer als Slug>'
  kind: 'fristenquelle' | 'verfahren'
  sourceId?: string              // Quellen-ID aus dem Register
  reason: string                 // deutsch, z. B. 'neu: 2027-01-01 · weg: 2026-12-02'
  since: string                  // 'YYYY-MM-DD' der letzten erkannten Änderung
}
interface Frist {
  id: string                     // stabil, kebab-case, z. B. 'eu-ai-act-hochrisiko-anhang-iii'
  kind: 'gesetz' | 'gericht' | 'agb' | 'modell'
  title: string                  // deutsch, ein Satz
  jurisdiction?: 'EU' | 'DE' | 'US' | 'US-Staat'   // Pflicht bei 'gesetz' und 'gericht'
  region?: string                // 'US-CO', 'DE-HH' …
  provider?: string              // 'agb' und 'modell' (Anzeigename aus der Watchlist, z. B. 'OpenAI')
  document?: string              // nur 'agb' (z. B. 'Usage Policies')
  models?: string[]              // nur 'modell': betroffene Modell-IDs (API-Name bzw. OpenRouter-ID ohne ':free'/':batch')
  status: LawStatus              // Stand heute; 'agb'/'modell': 'verkuendet' bis zum Datum, dann 'in_kraft'
  date: string | null            // 'YYYY-MM-DD'; null = prüfen (nur kuratierte Einträge)
  dateKind: 'gilt_ab' | 'in_kraft' | 'frist' | 'stichtag' | 'abschaltung'
  sourceUrl: string              // Seite, an der das Datum geprüft wurde (kein Feld `url`)
  verifiedAt: string | null      // 'YYYY-MM-DD' der letzten Prüfung an sourceUrl
  note?: string
  origin: 'kuratiert' | 'automatisch'
  procedure?: string
  storyId?: string
}
```

- `dateKind`: `gilt_ab` = Anwendungsbeginn, `in_kraft` = Inkrafttreten, `frist` = Handlungsfrist (Kommentar, Übergang, Meldung), `stichtag` = sonstiges festes Datum (Veröffentlichung, Behördenpflicht), `abschaltung` = Tag, an dem ein Modell aus der API bzw. aus dem OpenRouter-Angebot verschwindet.
- Anzeige bei `kind: 'agb'` und `'modell'` statt der LawStatus-Labels: `verkuendet` = „angekündigt“, `in_kraft` = „gilt“ (AGB) bzw. „abgeschaltet“ (Modell).
- **Startliste** (nur am 2026-10-24 geprüfte Daten, Rest „prüfen“): `references/fristen-start.md` – AI Act inkl. Digital Omnibus (Service Desk), Omnibus-Verordnung 2026/1744 (OEIL; in Kraft 27.07.2026 laut CELLAR), KI-MIG (in Kraft 29.07.2026), Colorado ADMT/Chatbot (01.01.2027, Kommentarfrist 26.10.2026), Kalifornien (CCPA-Regs 01.01.2026; SB 53 prüfen), NY RAISE (unterzeichnet, Inkrafttreten prüfen), Texas TRAIGA (01.01.2026); dazu eine Stichprobe erwarteter `modell`-Einträge (baut der Job, nicht `fristen.ts`).
- **Nur `build-fristen.ts` schreibt die Datei** (einmal je Lauf, nach `pipeline/terms/` und `pipeline/models/`): bestehende `fristen.json` lesen, `origin: 'automatisch'`-Einträge und offene `checks` behalten, Übergaben einarbeiten (unten), alle kuratierten aus `fristen.ts` neu einsetzen. Andere Module schreiben nie selbst.
- **Jeder Lauf** (`build-fristen.ts`): Status anheben, wenn `date ≤ heute` (`dateKind: 'in_kraft'` → mind. `in_kraft`, `'gilt_ab'` → `gilt_ab`, `'abschaltung'` → `in_kraft`); automatische Einträge aus Federal Register (`comments_close_on` relevanter Proposed Rules), Have Your Say (`feedbackEndDate`) und DIP (`inkrafttreten[]`) ergänzen, `verifiedAt` = Abrufdatum; automatische Einträge 30 Tage nach `date` entfernen; kuratierte bleiben. Sortierung nach `date`, `null` ans Ende. Größe < 30 KB; darüber zuerst automatische Einträge mit dem fernsten Datum weglassen und im Lauf-Log warnen.

### Übergaben an `build-fristen.ts`

- **AGB** (`vertragsaenderungen`): fertige `Frist` mit `kind: 'agb'`, `id` `agb-<doc-id>-<JJJJ-MM-TT>`, Upsert per `id` (Felder dort beschrieben).
- **Modell-Abschaltungen** (`vertragsaenderungen` aus `openai-deprecations`, `anthropic-deprecations`, `gemini-api-deprecations`, `mistral-deprecations`; `modelle-und-ranglisten` aus OpenRouter `expiration_date`, nur Watchlist-Orgs): je erfolgreich geparster Quelle die **vollständige** Liste künftiger Abschaltungen, nicht nur Neues: `{ sourceUrl, items: { provider, org, model, date, storyId?, replacement?, tentative?, itemUrl? }[] }`. `sourceUrl` = Deprecation-Seite ohne `.md`/`.md.txt` (z. B. `https://platform.claude.com/docs/en/about-claude/model-deprecations`); bei OpenRouter siehe unten (`itemUrl` = Modellseite `https://openrouter.ai/<id ohne :free>`, zeigt „Going away <Datum>“, geprüft 2026-10-24). Quelle ausgefallen → keine Übergabe → bestehende Einträge bleiben. **OpenRouter:** Übergabe-`sourceUrl` = `https://openrouter.ai/`, jedes Item trägt zusätzlich `itemUrl` (Modellseite); der Gruppeneintrag bekommt als `sourceUrl` die `itemUrl` des ersten Modells, weitere Modelle stehen in `models` und `note`.
- `build-fristen.ts` verwirft alle automatischen `modell`-Einträge dieser Quelle mit `date ≥ heute` (gleiche `sourceUrl`; OpenRouter: Präfix `https://openrouter.ai/`) und bildet sie neu – so wandern verschobene Daten mit und zurückgezogene verschwinden. Einträge mit `date < heute` bleiben bis zur 30-Tage-Löschung.
- Gruppierung: **ein Eintrag je Org und Abschalttag**, `id` `modell-<org>-<JJJJ-MM-TT>` (`<org>` = Watchlist-Schlüssel, `.`, `/`, `:` → `-` wie im Deprecation-`clusterKey`), `models` vereinigt und dedupliziert (`:free`-/`:batch`-Varianten = ein Modell). `title` aus dem Code: „<Anbieter> schaltet <Modell> ab“ bzw. „<Anbieter> schaltet <n> Modelle ab (u. a. <a>, <b>, <c>)“; OpenRouter: „OpenRouter nimmt <Modell> aus dem Angebot“. `status: 'verkuendet'`, `dateKind: 'abschaltung'`, `origin: 'automatisch'`, `verifiedAt` = Abrufdatum, `storyId` = jüngste Story der Gruppe, `note` = Nachfolger und bei `tentative` „vorläufiges Datum laut Anbieter“.
- Vorrang: Für Orgs mit eigener Deprecation-Quelle in `vertragsaenderungen` (Stand: OpenAI, Anthropic, Google, Mistral) verwirft `build-fristen.ts` OpenRouter-Übergaben – sonst zwei Daten für dasselbe Modell.
- Ohne konkretes künftiges Datum kein Eintrag: `date` muss `YYYY-MM-DD` und `≥ heute` (Europe/Berlin) sein; automatische Einträge nie mit `null`. Menge am 2026-10-24 (gezählt mit curl): OpenAI 39 Zeilen an 9 Tagen (inkl. Plattform-Funktionen wie Evals/Agent Builder – welche Zeilen als Modell gelten, entscheidet der Parser in `vertragsaenderungen`), Anthropic 1, Gemini 8 an 4 Tagen, OpenRouter 12 (davon nur Watchlist-Orgs), Mistral nicht gezählt → mit Gruppierung ~15–20 Einträge.

### Wöchentlicher Abgleich der Fristenquellen

- Quellen `eu-aiact-timeline`, `oeil-watch`, `kimig-gii`, `coag-ai`, `cppa-regs`, `ny-assembly-raise` (Takt `weekly`, normal im Sonntag-07:07-Lauf): Abschnitt normalisieren, alle Daten extrahieren (`\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}`, `(January|…|December) \d{1,2}, \d{4}`, `\d{1,2}\.\d{1,2}\.\d{4}` – gesetze-im-internet schreibt „am 29.7.2026 in Kraft“ –, `\d{2}\/\d{2}\/\d{4}`) und mit `dateSources` in `state/law-watch.json` vergleichen (nicht mit `fristen.json` – OEIL und coag.gov enthalten Dutzende Daten ohne Fristen-Eintrag); zusätzlich prüfen, ob jedes `date` der Einträge mit dieser `sourceUrl` noch auf der Seite steht. Extrahierte Daten je Quelle nach ISO normalisieren (`\d{2}\/\d{2}\/\d{4}` ist bei OEIL TT/MM, bei NY Assembly MM/TT).
- Neues oder verschwundenes Datum (gesetzter Standard, **kein PR, kein Issue**, kuratierte Werte nie automatisch ändern):
  1. `checks`-Eintrag `fristenquelle-<sourceId>` (`kind: 'fristenquelle'`, `reason` mit neuen/verschwundenen Daten; bei erneuter Änderung `reason` ergänzen und `since` auf heute).
  2. Kandidat „Fristenquelle geändert: <Name>“ durch die normalen Stufen, `category: 'gesetze'`, `clusterKey` `fristenquelle-<sourceId>-<JJJJMMTT>` (Format aus `bewertung`), Teaser = Diff-Auszug ≤ 300 Zeichen; den längeren Auszug ≤ 1.500 Zeichen bekommt Stufe 2 statt Readability-Text (analog `signals.releaseNotes`).
  3. Hinweis für `meta.json.notices` (schreibt `pipeline/output/`, Skill `bewertung`): `{ kind: 'recht', sourceId, text: 'Fristenquelle geändert: <Name> – Stichtage prüfen', since }`, solange der Check offen ist.
- Check schließen (`build-fristen.ts`, jeder Lauf): `fristenquelle` → sobald alle kuratierten Einträge mit dieser `sourceUrl` `verifiedAt ≥ since` tragen, ohne kuratierten Eintrag nach 30 Tagen; `verfahren` („Verfahren beobachten?“, Keyword-Abschnitt) → sobald die Nummer in `procedures.ts` steht, sonst nach 30 Tagen. Mit dem Check verschwindet der Hinweis.
- Nachpflege in einer Sitzung (auch für offene Checks): Quelle im Browser/mit curl prüfen, `fristen.ts` ändern, `verifiedAt` setzen, Startliste in diesem Skill aktualisieren.

## Gesperrt oder eingeschränkt – Workarounds

| Quelle | Symptom | Workaround |
|---|---|---|
| EUR-Lex HTML (ELI/CELEX) | 202, leerer Body, `x-amzn-waf-action: challenge` (Bot- und Browser-UA) | RSS `rssId=222` + CELLAR; nur verlinken |
| FTC | Bot-UA 403 „abusive automated request“, Browser-UA maskierte 404 (Akamai) | Federal Register (Behörde FTC), Presse/Rapporteur |
| nysenate.gov, LegiScan | Cloudflare „Just a moment…“ für jeden UA | `nyassembly.gov`-Bill-Seite, MultiState |
| leginfo.legislature.ca.gov | Katalog 200, Nachprüfung 2026-10-24: 403 `cf-mitigated: challenge` | `gov-ca`, MultiState; leginfo nur als Link |
| leg.colorado.gov | 406 ohne Header | `Accept: text/html` senden (dann 200) |
| Have Your Say | `sort=modifiedDate,DESC` → 406 | ohne `sort`, clientseitig nach `feedbackStartDate` sortieren |
| openJur | Mensch-Prüfung | nicht nutzen, nie umgehen |
| Cloudflare-Quellen (Substack, consilium, nist.gov, copyright.gov, gov.ca.gov, privacy.ca.gov, rapporteur.com, artificialintelligenceact.eu); Myra-WAF bei gesetze-bayern.de | von der Privat-IP am 2026-10-24 erreichbar; WAF-Regeln ändern sich, Challenge jederzeit möglich | Health-Status, Challenge nie als „keine News“ werten, auslassen statt umgehen |

## Optionale Keys (keiner nötig fürs MVP)

Alle als Variable in `/etc/ai-pulse/env` auf dem Server (root:aipulse, Modus 640, Vorlage `server/env.example`; nicht in GitHub-Secrets). Nur der Node-Prozess liest sie – nie an den `claude`-Kindprozess weitergeben (Env-Hygiene, Skill `claude-headless`).

| Variable | Nutzen | Ohne Key |
|---|---|---|
| `DIP_API_KEY` | DIP `/vorgang` mit `beratungsstand`, `verkuendung[]`, `inkrafttreten[]`. Header `Authorization: ApiKey <key>`; max. 25 parallele Anfragen. Persönlicher Dauer-Key per formloser Mail an parlamentsdokumentation@bundestag.de (E-Mail, Ansprechperson, ggf. Institution). Dann einmal `/vorgang?f.drucksache=21/4594` (KI-MIG) → ID in `procedures.ts`; laufend `/vorgang?f.deskriptor=Künstliche Intelligenz&f.aktualisiert.start=<letzter Lauf>` und `f.kom` für EU-Dokumente | BGBl + hib + BMJV + gesetze-im-internet |
| `API_DATA_GOV_KEY` | Congress.gov (`latestAction`) nur für Watchlist-Bills; regulations.gov (Kommentarfristen) | Federal Register, MultiState |
| `COURTLISTENER_TOKEN` | `/dockets/` (anonym 401), höhere Limits | Suche + Feed anonym |
| `OPENSTATES_API_KEY` | Bills aller Staaten mit `latest_action` (`X-API-KEY`) | MultiState |

Fehlt ein Key: Quelle überspringen – kein Abruf, kein Health-Fehler (also nicht `degraded`; Health kennt nur `ok`/`degraded`/`blockiert`). 401 trotz Key → Health „Key abgelaufen“. Den öffentlichen DIP-Key (JS-Hilfeseite, rotiert, zuletzt bis 05/2026) und den Portal-Key aus `dip-config.js` nie einbauen. Variablen eintragen → `job-betrieb`.

## Testen

Fixtures unter `pipeline/test/fixtures/law/` (Federal-Register-JSON, OEIL-Auszug, Have-Your-Say-JSON, BGBl-, BNetzA-, hib-Feed, CourtListener-JSON, Service-Desk-Timeline). Tests: Mapping-Tabelle oben, Datum aus BNetzA-Link, Keyword-Regex (SNAP-EBT-Titel fällt raus, „Skiurlaub“ trifft nicht `KI`), `fristen.json` gegen zod-Schema, jeder Eintrag mit `date` hat `verifiedAt`. `build-fristen.ts`: Modell-Übergaben gruppieren je Org + Tag, `:free`-Variante dedupliziert, OpenRouter-Übergabe für `openai` verworfen, Eintrag ohne künftiges Datum abgelehnt, verschobenes Datum ersetzt den alten Eintrag; geänderte Fristenquelle → Check + Kandidat + `notice` `recht`, Check schließt nach `verifiedAt ≥ since`. Einzelquelle: `npm run collect -- --only fedreg-api` (immer Trockenlauf mit Schatten-State `.cache/dry/state/`, auch für `law-watch.json`; mit `--fresh` gilt jedes Verfahren als neu → `changed: true`; Ergebnis in `.cache/dry/<runId>/`). Teilläufe schreiben nie `state/law-watch.json` oder `public/data/fristen.json`. Weiteres → `sparsam-testen`.

## Fallen

- **Federal Register:** `conditions[term]` liefert vor allem Fremdes (Top 5 am 2026-10-24: Outbound Investment, SNAP-EBT, Medicare, Forest Review, Crypto) → `type`-Filter **und** `LAW_EN` auf `title`/`abstract`. Unbekannte Felder brechen die ganze Abfrage: `fields[]=presidential_document_type` → 400 `field 'presidential_document_type' not valid`; neue Felder erst mit `per_page=1` testen.
- **Vordatierte Items:** Federal Register (Public Inspection, `publication_date` 2026-10-26 am 2026-10-24) und Bundesrat (Item auf 17.12.2026). `publishedAt` nie in der Zukunft → dann `firstSeen` nehmen, sonst steht das Item tagelang oben.
- **Feeds ohne brauchbares Datum:** BNetzA (kein `pubDate`, Datum aus Link `/(\d{4})(\d{2})(\d{2})_[^/]+\.html$`, Links `http://` → kanonisieren), Bundestag `digitales.rss` (kein Datum, GUID teils PDF-Link), Rat der EU (nur `a10:updated`), BGBl (nur `YYYY-MM-DD`), BfDI (unsortiert). → GUID/Link-Dedupe, `firstSeen`.
- **10-Item-Feeds** (Digital Strategy, gov.ca.gov, EDPB, Press Corner ohne `pagesize`) verlieren bei Spitzen Items zwischen zwei Läufen → GUIDs persistieren, DSM-HTML-Backfill, `pagesize=50`.
- **CourtListener-Volltext:** `"OpenAI" AND copyright` liefert Reservoir Media ./. Anthropic und Levine ./. Meta (Treffer in Docket-Texten) → Firma im `caseName` verlangen, dedupe über `docket_absolute_url`.
- **Have Your Say:** Antwort unter `initiativeResultDtoPage.content[]`, Stadium nicht auf oberster Ebene, sondern in `currentStatuses[]` (`isCurrent`); Datumsformat `2026/09/11 23:59:59` ohne Zeitzone (als Europe/Brussels lesen). Beobachtete `frontEndStage`: `PLANNING_WORKFLOW`, `ADOPTION_WORKFLOW`, `OPC_LAUNCHED`, `ISC_WORKFLOW` – nicht weiter ausdeuten. Treffer sind nach Relevanz sortiert (2020er Einträge vorn, neue auf Seite 2) → `size=100`, alle Treffer in einem Abruf (2026-10-24: 20 Treffer, 85 KB). Undokumentiert, kann sich ohne Ankündigung ändern.
- **OEIL:** Stage steht in `<th>Stage reached in procedure</th><td>…</td>`, Key events als `TT/MM/JJJJ` vor dem Ereignistext; Seite enthält wechselnde Sitzungs-/MEP-Listen → nur diese Felder diffen, sonst Fehlalarm jede Woche.
- **AI-Act-Daten:** Die Katalog-Zusammenfassung nennt „02.08.2027 Sandboxes, Annex-III-Hochrisiko“ – laut Service Desk (geprüft 2026-10-24) gilt Anhang III erst ab **02.12.2027**; neu ist der 02.12.2026 (neue Verbote, Übergang Art. 50 Abs. 2). Immer die Service-Desk-Seite nehmen.
- **BGBl-RSS-Datum:** `<meta:ausfertigung>` und `pubDate` tragen das Ausgabedatum (KI-MIG: 28.07.2026), nicht das Ausfertigungsdatum des Gesetzes (22.07.2026 laut gesetze-im-internet). Titel ist der amtliche Langtitel (KI-MIG: „Gesetz zur Durchführung der Verordnung (EU) 2024/1689 …“), Kurztitel in `<meta:shortTitle>` → Filter auf beide, case-insensitiv.
- **Bayern.Recht** veröffentlicht Entscheidungen teils Jahre später → Veröffentlichung ≠ neues Urteil; Entscheidungsdatum aus dem Titel, alte Entscheidungen niedrig gewichten.
- **HmbBfDI:** `cHash` im News-Sitemap-Link ändert sich → immer über den Index auflösen; `<loc>` enthält `&amp;`.
- **Regex und Umlaute:** JS-`\b` kennt nur ASCII → `\bÜber…` trifft nie. Für DE-Wörter Lookarounds mit `\p{L}` und Flag `u`; `KI`/`AI` case-sensitiv.
- **Colorado-Seite** widerspricht sich beim Unterzeichnungsdatum von HB 26-1263 (Mai vs. 01.07.2026) → nur das Inkrafttreten (01.01.2027) verwenden.
- **BNetzA-/BfDI-/BSI-Feeds** haben 2026 ihre Pfade geändert (alte URLs 404); BNetzA nur mit `?nn=693926`.
- Status aus Fließtext ist fehleranfällig (Recherche) – nie als Fakt anzeigen, immer „laut Meldung“.
- **Abschaltdaten, die keine sind** (geprüft 2026-10-24): Anthropic nennt bei aktiven Modellen „Not sooner than <Datum>“ (Mindestlaufzeit, kein Abschalttag) und bei manchen veralteten „To be announced“; Gemini „No shutdown date announced“ bzw. „N/A“ → kein Eintrag. Anthropics Spalte heißt „Tentative retirement date“ → `tentative: true`. Bei OpenAI ist `### JJJJ-MM-TT: …` das **Ankündigungs**datum, der Abschalttag steht in der Spalte `Shutdown date` (Formate `January 14, 2027` und `Apr 1, 2027` gemischt).
- **OpenRouter:** API-`expiration_date` ist `JJJJ-MM-TT`, die Modellseite trägt `deprecation_date` `2026-12-31T16:00:00.000Z` → immer das API-Feld nehmen, nicht über Zeitzonen umrechnen. `:free`-Varianten haben eigene Einträge mit demselben Datum (poolside/laguna-s-2.1 und `:free`) → Basis-ID.

## Nach dem Bauen

Diesen Skill aktualisieren: echte Quellen-IDs und Dateinamen, Health aus dem ersten `npm run smoke` auf dem Heimserver (welche Rechtsquellen von der Privat-IP blockiert sind), gesammelte DIP-`beratungsstand`-Werte, Have-Your-Say-Wert für „offen“, tatsächliche Zahl der `modell`-Einträge und Größe von `fristen.json`, neue Fallen. Startliste (`references/fristen-start.md`) mit neuen `verifiedAt` pflegen, „prüfen“-Einträge abarbeiten. Neue Quellen auch im Katalog-Abschnitt von `quellen` eintragen. Phasenstand im Steckbrief nachtragen.
