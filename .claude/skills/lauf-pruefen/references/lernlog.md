# Lernlog Lauf-Prüfung

Neueste Einträge oben. Je Eintrag: Lauf, Kennzahlen, Befunde nach Art (A klein · B Bewertung/Prompt · C Struktur · D Check), Maßnahmen.

## 2026-10-31 · 2026-10-31-1445-midday (dritter echter Lauf, `--limit 80`, Basis älter als 72 h)

`stories 53 · claude 53 · regel 0 · zusammenfassungen 25 · duplikate 1 · duplikateNeu 1 · aufrufe 8 · tokenIn 85521 · tokenOut 75754 · quellenOk 96 % · allgemein 8 %`

- Wirkung der Fixes vom 27.10.: „Allgemein“ 24 % → 8 % (Anbieter = Akteur greift), keine Rückschritte, Briefing ohne Doppelungen, 8 Aufrufe.
- **D** Fünf Duplikat-Fehlalarme durch die Zwei-Teile-Regel (`github-copilot-plugin…` vs `github-copilot-automations…`, `ai-labs-…`, `google-gemini-…`). → Schlüsselanfang jetzt drei Teile, zwei nur wenn der zweite ein Ereignis ist (`ipo`, `funding`, `lawsuit` …); Testfall aus diesem Lauf. Übrig: Copilot Fusion GA vs. Fusion lokales Routing (Grenzfall, bleibt Warnung).
- Stichprobe mit dem Nutzer (15 Stories, Top/Mitte/Unten): alles „passt“, Funding-Gewichtung „so lassen“ → keine Änderung an Rubriken oder Profil.
- Notfallpfad (`AIPULSE_SIMULATE_LIMIT=1`): Limit erkannt, Umschaltung auf `api`, Fixture-Antworten für triage/summarize/brief, Kostenbuch nur in `.cache/` (zusammen ≈ 0,008 USD gerechnet), `state/usage` unberührt.

## 2026-10-27 · Umsetzung der B-Vorschläge (vom Nutzer freigegeben)

- `feldregeln.txt`: `providers` = handelnde Firma, nicht angebundene/erwähnte Werkzeuge (mit zwei Beispielen); `models` analog. `clusterKey`: Folgemeldungen zu einem Release der letzten 72 h (Verfügbarkeit in weiteren Produkten, Rollout, Einordnung, erste Tests) übernehmen den Release-Schlüssel; eigener Schlüssel nur bei neuem Ereignis.
- `withEntities`: Hat Claude `providers` geliefert, gelten nur diese (ohne Anbieter, aber mit Modell → Anbieter des Modells); Regel-Erkennung nur noch auf den Titeln, nicht auf Teaser/Zusammenfassung.
- Probe `--stage triage --limit 20` (1 Aufruf, Lauf 1010): Copilot-Terra → `openai-gpt-6-1-terra-release` ✓, 4× Anthropic-S-1 → ein Schlüssel ✓, Greptile nur „Greptile“ ✓, Hob ohne Anbieter ✓. Beobachten: Release `openai-python v3.39.0` landete ebenfalls im Terra-Schlüssel – SDK-Releases sind eigene Ereignisse, falls das wieder vorkommt (dann Art B).

## 2026-10-27 · 2026-10-27-1001-morning (zweiter echter Lauf, `--limit 80`, Basis = Lauf 0927)

`stories 154 · claude 82 · regel 72 · zusammenfassungen 47 · duplikate 9 · duplikateNeu 5 · aufrufe 6 · tokenIn 80582 · tokenOut 58835 · quellenOk 96 % · allgemein 24 %`

- **A/Fehler** `mergeByKey` hängte nur bei *anderer* id an. Neue Meldung mit demselben Schlüssel wie eine Basis-Story = dieselbe id (sha1) → die Basis-Story wurde ersetzt (Anthropic-S-1: 8 Quellen → 1, firstSeen neu, Titel neu; ebenso „404 Media“). → Bedingung `if (existing)`, Test in `llm.test.ts`. Wirkung im nächsten Lauf prüfen.
- **D** Den Fehler zeigte der Check nur indirekt → neuer Check `rueckschritt` (Vergleich mit dem vorigen Lauf). Duplikate aus früheren Läufen sind jetzt nur Hinweise, Kennzahl `duplikateNeu`.
- **B (Vorschlag)** Verschiedene Blickwinkel auf ein Ereignis bekommen eigene Schlüssel: Terra-Release / Terra in Copilot / Einordnung durch Ted Sanders; im Briefing stehen Terra und Copilot-Terra als zwei Punkte. Option: Feldregel „Folgemeldungen zum selben Produkt-Release (Verfügbarkeit in anderen Produkten, Einordnungen) → Schlüssel des Release wiederverwenden“.
- **B (Vorschlag)** Show-HN-Werkzeuge mit Claude/Codex-Anbindung bekommen OpenAI/Anthropic als Anbieter (PaperPilot, PulseDev, ManyAgents) – „betrifft“ ist hier zu weit. Option: Regel-Erkennung nur auf den Titel des Akteurs, nicht auf erwähnte Integrationen.
- Positiv: 65 neue Meldungen an bestehende Stories angehängt statt neu, 6 Aufrufe, Briefing ohne Regelverstöße.

## 2026-10-27 · 2026-10-27-0927-morning (erster echter Lauf, `--limit 80`)

`stories 129 · claude 52 · regel 77 · zusammenfassungen 24 · aufrufe 8 · quellenOk 96 % · allgemein 15 %`

- **A** heise-Anzeige „heise-Angebot: iX-Workshop …“ kam durch → `SPONSOR_TITLE_RE` ergänzt, Test in `filter.test.ts`.
- **B** Dasselbe Ereignis mehrfach: GPT-6.1 Terra 3×, Anthropic-Börsengang 4× (eine Story mit 8 Quellen plus 3 einzelne). Ursachen: Schlüssel unterscheiden sich nur durch einen Bindestrich (`gpt-61` / `gpt-6-1`), und spätere Triage-Pakete kannten die Schlüssel der früheren nicht. → `keyNorm` in 1b, `<kontext-lauf>` in der Triage. Offen: Mehrere Blickwinkel auf dasselbe Ereignis (Copilot-Verfügbarkeit, Governance im S-1) vergibt Claude bewusst eigene Schlüssel. Ob das gewollt ist, entscheidet der Nutzer.
- **D** Erste Version des Checks: Aufruf-Zeitfenster war falsch, weil `generatedAt` den Laufbeginn markiert; Fehlalarm bei „allgemein verfügbar“; Schlüssel-Präfix-Regel fehlte → behoben, Testfälle aus diesem Lauf.
