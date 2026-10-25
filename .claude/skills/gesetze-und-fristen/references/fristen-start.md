# Fristen-Startliste (kuratiert, Stand 2026-10-24)

Vorlage für `pipeline/law/fristen.ts` (`origin: 'kuratiert'`). Jede Zeile mit Datum ist am 2026-10-24 an der genannten Quelle geprüft (`verifiedAt: '2026-10-24'`). `date: null` = **prüfen** – nie raten, Dashboard zeigt „Datum prüfen“. `status` = Stand heute; der Job hebt ihn beim Erreichen des Datums an (Regel in SKILL.md).

Quellen-Kürzel:
- **SD** = AI Act Service Desk Timeline `https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act` (berücksichtigt den Digital Omnibus on AI; `**` = durch den Omnibus geändert)
- **OEIL** = `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0359(COD)`
- **GII** = `https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html`
- **COAG** = `https://coag.gov/ai/`
- **CPPA** = `https://cppa.ca.gov/regulations/`
- **LEGINFO** = `https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB53`
- **NYA** = `https://nyassembly.gov/leg/?bn=S06953&term=2025&Actions=Y`
- **TXC** = `https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149`
- **CELLAR** = SPARQL `https://publications.europa.eu/webapi/rdf/sparql` (Abfrage in SKILL.md, geprüft 2026-10-24); als `sourceUrl` den EUR-Lex-Link `https://eur-lex.europa.eu/eli/reg/2026/1744/oj` eintragen (für Bots WAF-202, im Browser lesbar; nicht im wöchentlichen Abgleich)

## EU – KI-Verordnung (EU) 2024/1689 inkl. Digital Omnibus

| id | title | status | date | dateKind | Quelle | note |
|---|---|---|---|---|---|---|
| `eu-ai-act-inkrafttreten` | KI-Verordnung tritt in Kraft | `in_kraft` | 2024-08-01 | `in_kraft` | SD | |
| `eu-ai-act-verbote-ki-kompetenz` | Allgemeine Bestimmungen (Definitionen, KI-Kompetenz) und Verbote gelten | `gilt_ab` | 2025-02-02 | `gilt_ab` | SD | |
| `eu-ai-act-gpai-governance` | Pflichten für GPAI-Modelle gelten; Behörden und Sanktionsregeln der Mitgliedstaaten, AI Board, Scientific Panel, Advisory Forum | `gilt_ab` | 2025-08-02 | `gilt_ab` | SD | |
| `eu-ai-act-art50-durchsetzung` | Transparenzpflichten (Art. 50) gelten, Durchsetzung beginnt (GPAI, Verbote, Transparenz, KI-Kompetenz) | `gilt_ab` | 2026-08-02 | `gilt_ab` | SD | „Mehrheit der Regeln“ laut SD |
| `eu-ai-act-neue-verbote` | Neue Verbote (nicht-einvernehmliche sexuelle Deepfakes, Darstellungen sexuellen Kindesmissbrauchs) gelten | `in_kraft` | 2026-12-02 | `gilt_ab` | SD | durch Digital Omnibus (`**`) |
| `eu-ai-act-art50-2-uebergang` | Übergangsfrist Art. 50 Abs. 2 endet für Systeme (inkl. GPAI-Systeme) mit synthetischen Inhalten, die vor dem 02.08.2026 in Verkehr gebracht wurden | `in_kraft` | 2026-12-02 | `frist` | SD | durch Digital Omnibus (`**`) |
| `eu-ai-act-reallabore` | Mindestens ein KI-Reallabor je Mitgliedstaat in Betrieb | `in_kraft` | 2027-08-02 | `stichtag` | SD | |
| `eu-ai-act-hochrisiko-anhang-iii` | Regeln für Hochrisiko-KI nach Anhang III gelten | `in_kraft` | 2027-12-02 | `gilt_ab` | SD | durch Digital Omnibus verschoben (`**`); Katalog-Zusammenfassung „02.08.2027“ ist überholt |
| `eu-ai-act-hochrisiko-anhang-i` | Regeln für Hochrisiko-KI in Produkten nach Anhang I gelten | `in_kraft` | 2028-08-02 | `gilt_ab` | SD | `**`; letzter Haupt-Meilenstein |
| `eu-digital-omnibus-ki-abl` | Digital Omnibus zur KI: Verordnung (EU) 2026/1744 im ABl. L veröffentlicht | `in_kraft` | 2026-07-24 | `stichtag` | OEIL | Rat 29.06.2026, unterzeichnet 08.07.2026, Stage „Procedure completed“ |
| `eu-digital-omnibus-ki-inkraft` | Digital Omnibus zur KI (Verordnung (EU) 2026/1744) in Kraft | `in_kraft` | 2026-07-27 | `in_kraft` | CELLAR | CELEX 32026R1744, `cdm:resource_legal_date_entry-into-force`; geänderte Anwendungsdaten stehen in den SD-Zeilen oben |

## Deutschland

| id | title | status | date | dateKind | Quelle | note |
|---|---|---|---|---|---|---|
| `de-ki-mig-inkraft` | KI-MIG in Kraft – Bundesnetzagentur ist Marktüberwachungsbehörde für die KI-VO | `in_kraft` | 2026-07-29 | `in_kraft` | GII | Gesetz vom 22.07.2026, BGBl. 2026 I Nr. 223 (Ausgabe vom 28.07.2026 laut BGBl-RSS); Inkrafttreten nach Art. 5 des Mantelgesetzes. BT-Drs. 21/4594, BR-Drs. 375/26 |

## US-Bundesstaaten (`jurisdiction: 'US-Staat'`)

| id | region | title | status | date | dateKind | Quelle | note |
|---|---|---|---|---|---|---|---|
| `us-co-admt-act` | US-CO | Colorado ADMT Act (SB 26-189, ersetzt SB 24-205) gilt | `verkuendet` | 2027-01-01 | `in_kraft` | COAG | unterzeichnet Mai 2026; AG muss Regeln vor dem 01.01.2027 erlassen |
| `us-co-chatbot-safety` | US-CO | Colorado Chatbot Safety Act (HB 26-1263) gilt | `verkuendet` | 2027-01-01 | `in_kraft` | COAG | Unterzeichnungsdatum auf der Seite widersprüchlich (Mai bzw. 01.07.2026) → nicht verwenden |
| `us-co-regeln-kommentarfrist` | US-CO | Colorado: Kommentarfrist und Anhörung zu den ADMT- und Chatbot-Regeln | `konsultation` | 2026-10-26 | `frist` | COAG | Frist läuft bis zum letzten Anhörungstag, falls die Anhörung länger dauert |
| `us-ca-ccpa-regs` | US-CA | Kalifornien: CCPA-Regulations wirksam | `in_kraft` | 2026-01-01 | `in_kraft` | CPPA | Paket „CCPA Updates, … Risk Assessments, and ADMT Regulations“ im Sept. 2025 abgeschlossen; eigene ADMT-Compliance-Stichtage: **prüfen** |
| `us-ca-sb53` | US-CA | Kalifornien SB 53 | `verkuendet` | null | `in_kraft` | LEGINFO | Katalog: Status „Chaptered“. Gegenstand und Inkrafttreten: **prüfen** (leginfo seit 2026-10-24 hinter Cloudflare-Challenge → im Browser nachsehen) |
| `us-ny-raise` | US-NY | New York RAISE Act (S6953B, Chapter 699/2025) | `verkuendet` | null | `in_kraft` | NYA | unterzeichnet 19.12.2025 mit Approval Memo 76 (Chapter Amendment). Originaltext: in Kraft am 90. Tag nach Unterzeichnung – Chapter Amendment kann das ändern → **prüfen** |
| `us-tx-traiga` | US-TX | Texas Responsible AI Governance Act (HB 149) in Kraft | `in_kraft` | 2026-01-01 | `in_kraft` | TXC | unterzeichnet 22.06.2025 |

## AGB-Stichtage (liefert der Skill `vertragsaenderungen` an `build-fristen.ts`, `kind: 'agb'`, `origin: 'automatisch'`)

In der Recherche bestätigt: Anthropic AUP gültig ab 12.11.2026, OpenAI Usage Policies gültig ab 20.11.2026.

## Modell-Abschaltungen (liefern `vertragsaenderungen` und `modelle-und-ranglisten` an `build-fristen.ts`, `kind: 'modell'`, `origin: 'automatisch'`)

Nicht in `fristen.ts` eintragen – der Job baut sie bei jedem Lauf aus den Quellen neu (Regeln in SKILL.md). Stichprobe zum Abgleich der ersten Läufe, am 2026-10-24 mit curl an der Quelle gelesen:

| erwartete id | Modelle | date | Quelle | note |
|---|---|---|---|---|
| `modell-anthropic-2026-11-30` | `claude-sonnet-4-5-20250929` | 2026-11-30 | `https://platform.claude.com/docs/en/about-claude/model-deprecations` | „Tentative retirement date“ → vorläufig; Nachfolger `claude-sonnet-5-5` |
| `modell-openai-2027-01-14` | `gpt-4o-2024-08-06`, `gpt-4o-2024-11-20`, `gpt-4o-mini-2024-07-18`, `gpt-4.1-2025-04-14`, `gpt-4.1-mini-2025-04-14` | 2027-01-14 | `https://developers.openai.com/api/docs/deprecations` | angekündigt 14.10.2026; Nachfolger `gpt-6-luna` |
| `modell-google-2026-11-17` | 5 Gemini-Preview-/TTS-/Live-Modelle (u. a. `gemini-3.1-flash-tts-preview`) | 2026-11-17 | `https://ai.google.dev/gemini-api/docs/deprecations` | Gemini hat 2026-10-24 insgesamt 8 künftige Abschaltungen an 4 Tagen |
| `modell-zai-2026-12-31` | `z-ai/glm-4.5` | 2026-12-31 | `https://openrouter.ai/z-ai/glm-4.5` | nur solange `zai` in der dynamischen Watchlist steht (OpenRouter-Org `z-ai` → Schlüssel `zai`, Top-12 am 2026-10-24 laut `modelle-und-ranglisten`); Seite zeigt „Going away December 31, 2026“ |

## Offen / bewusst nicht aufgenommen

- Kalifornien SB 53 und weitere CA-Gesetze 2026 (Unterzeichnungen Sep./Okt. über `gov-ca`), CalPrivacy-ADMT-Stichtage.
- NY RAISE: endgültiges Inkrafttreten nach Chapter Amendment.
- BNetzA-Standardisierungskonferenz 15.12.2026 ist ein Termin, keine Frist → nicht in die Tabelle.
