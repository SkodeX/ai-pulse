---
name: lauf-pruefen
description: Nach jedem AI-Pulse-Lauf (Teillauf, voller Lauf, Server-Lauf) das Ergebnis prüfen – npm run check, Stichprobe, Befunde einordnen, kleine Fehler selbst beheben, Prüfregeln und diesen Skill verbessern, Lernlog führen. Laden, sobald ein Lauf fertig ist oder der Nutzer „Lauf prüfen“, „check“ oder „was lief schief“ sagt.
---

# Lauf prüfen

Ziel: Jeder Lauf wird einmal geprüft, ohne zusätzlichen Claude-Aufruf aus der Pipeline. Was dabei schiefläuft, wird entweder **sofort behoben** (klein, deterministisch, mit Test) oder **als Vorschlag** gemeldet. Was der Check falsch meldet oder übersieht, verbessert **den Check selbst**. Jede Prüfung landet im [Lernlog](references/lernlog.md). So wird Lauf für Lauf besser.

## 1. Automatischer Check

```bash
npm run check
```

- Ohne Argument wird der jüngste Ordner in `.cache/run/` geprüft (sonst `public/data/`). Mit Argument ein bestimmter Lauf: `npm run check -- .cache/run/<id>`. Das Ergebnis steht in `check.md` im Lauf-Ordner.
- Code: `pipeline/check/check.ts` (reine Funktionen, Test `pipeline/test/check.test.ts`) und `pipeline/check.ts` (CLI, liest `latest.json`, `meta.json`, `briefing/latest.json` und das Kostenbuch).
- Die Einträge des Kostenbuchs ordnet der Check über das Zeitfenster zu: ab `generatedAt` (= Laufbeginn) bis zum Beginn des nächsten Laufs, höchstens 40 min. Prüfst du, während schon ein weiterer Lauf läuft, zählt der Check dessen Aufrufe mit → erst prüfen, wenn kein Lauf mehr aktiv ist.

| Check | Schwere | Prüft |
|---|---|---|
| `health` | fehler < 90 % ok; warnung je Störung ohne Ersatz | `meta.health` |
| `aufrufe` | fehler > 8 CLI-Aufrufe; warnung je Fehlversuch, Backend ≠ abo | Kostenbuch, `meta.budget` |
| `rueckschritt` | fehler | gegen den vorigen Lauf (Lauf-Ordner davor, sonst `public/data/`): bestehende Story verliert Quellen, `firstSeen` ändert sich, Zusammenfassung verschwindet |
| `duplikate` | warnung (nur hinweis, wenn beide Stories aus früheren Läufen stammen) | gleiches Modell (Kategorie `modelle`), Titel-Jaccard ≥ 0,4 mit ≥ 4 Token ohne Floskeln, gleicher Schlüssel bis auf Bindestriche, gleiche ersten zwei Schlüsselteile bei gleicher Kategorie |
| `werbung` | warnung | Originaltitel mit Angebot/Anzeige/Webinar/Workshop/Rabatt … |
| `scores` | fehler: `score` ≠ (impact + personal)/2, Hype mit impact > 5; hinweis: impact ≥ 9 bei einer Quelle | alle Stories |
| `texte` | warnung | Titel unübersetzt, Zusammenfassung englisch, Top 10 ohne Zusammenfassung |
| `kategorien` | warnung | > 50 % der Claude-Stories in `neuigkeiten` |
| `tags` | warnung > 40 % ohne Anbieter/Modell; hinweis: Anbieter klein geschrieben | `providers`, `models` |
| `briefing` | fehler: unbekannte `storyId`; warnung: Regel-Briefing trotz Abo, doppelte Punkte | `briefing/latest.json` |

## 2. Stichprobe von Hand (2 Minuten, nur lesen)

- `npm run pipeline -- --stage review` gibt 20 Stories quer über die Rangfolge aus. Prüfe 5 davon gegen den Originalartikel: Stimmt die Kategorie? Passt die Tragweite zur Rubrik (Skill `bewertung`)? Enthält die Zusammenfassung Fakten, die nicht im Artikel stehen?
- Lies das Briefing: Sind die Punkte die wichtigsten des Laufs? Steht etwas doppelt drin? Gibt es erfundene Zahlen?
- Prüfe die Top 10 auf Meldungen ohne KI-Bezug und auf Werbung.

## 3. Befunde einordnen und handeln

| Art | Beispiel | Handeln |
|---|---|---|
| **A – klein, deterministisch** | Werbe-Präfix nicht gefiltert, fehlender Alias, Keyword fehlt, Floskel im Duplikat-Check | sofort beheben: Regex, Alias oder Liste ändern, **Test dazu**, `npm test` grün, kurz im Lernlog vermerken |
| **B – Bewertung oder Prompt** | Kategorie systematisch falsch, Scores zu hoch, Schlüssel uneinheitlich | Vorschlag an den Nutzer mit Beispielen. Prompt-Dateien in `pipeline/llm/prompts/` nur nach Zustimmung ändern (sie gelten byte-gleich für alle Läufe), danach Fixture-Tests |
| **C – Struktur** | neue Quelle nötig, Pipeline-Schritt fehlt, Budget reicht nicht | als Vorschlag melden; den passenden Fach-Skill laden (`quellen`, `bewertung`, `claude-headless` …) |
| **D – Check irrt** | Fehlalarm, oder einen echten Fehler hat der Check übersehen | **den Check verbessern**: Regel in `pipeline/check/check.ts` anpassen oder ergänzen, Testfall aus dem echten Beispiel in `check.test.ts`, Tabelle oben aktualisieren |

Regeln:
- Schwellen nie lockern, nur damit eine Meldung verschwindet. Erst klären, ob der Befund stimmt (Art D), dann gezielt ändern.
- Für die Prüfung keine zusätzlichen Claude-Aufrufe aus der Pipeline. Echte Läufe zum Nachprüfen nur mit Grund und als Teillauf (`--limit`), siehe `CLAUDE.md`.
- Nichts in `state/` oder `public/data/` von Hand korrigieren; Fehler werden im Code behoben und zeigen sich im nächsten Lauf.
- Commit nur mit den selbst geänderten Dateien.

## 4. Lernlog und Selbstverbesserung

Nach jeder Prüfung einen Eintrag oben in [references/lernlog.md](references/lernlog.md) anlegen: Datum, Lauf-ID, Kennzahlenzeile aus `check.md`, Befunde nach Art und was getan wurde.

- **Trend:** Vergleiche die Kennzahlen mit den letzten Einträgen (Duplikate, Anteil „Allgemein“, Aufrufe, Token). Wird etwas über drei Läufe schlechter, ist das ein Befund der Art B oder C.
- **Wiederkehrend:** Tritt derselbe Befund der Art A zum dritten Mal auf, reicht ein Einzelfix nicht. Dann die Ursache allgemeiner beheben (z. B. Regel statt Einzelwort) und das im Log vermerken.
- **Neue Fehlerart** aus der Stichprobe, die der Check nicht kennt → neuen Check bauen (Art D). So wächst der automatische Teil, und die Handprüfung wird kürzer.
- **Dieser Skill gehört dazu:** Wenn ein Schritt hier überflüssig, unklar oder falsch ist, die Datei direkt anpassen und im Lernlog vermerken, was sich geändert hat und warum.
- Ab Phase 3 (Server): Der Check läuft nach jedem Server-Lauf mit (Skill `job-betrieb`), Fehler kommen in `meta.notices` (`kind: 'system'`).

## Handy-Zusammenfassung

Am Ende kurz in Stichpunkten für den Nutzer: Kennzahlen, was behoben wurde, was als Vorschlag offen ist (Memory „Handy-Zusammenfassung“).
