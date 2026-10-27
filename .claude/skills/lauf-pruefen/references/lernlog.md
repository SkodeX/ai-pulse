# Lernlog Lauf-Prüfung

Neueste Einträge oben. Je Eintrag: Lauf, Kennzahlen, Befunde nach Art (A klein · B Bewertung/Prompt · C Struktur · D Check), Maßnahmen.

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
