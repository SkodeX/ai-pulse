# AI Pulse

Öffentliches KI-News-Dashboard (PWA auf GitHub Pages): Ein Job auf dem Heimserver des Nutzers sammelt 3× täglich Meldungen aus ~45 Kernquellen, Claude Code (headless, über das Max-Abo) sortiert sie nach Wichtigkeit und fasst sie auf Deutsch zusammen. Roadmap: `ROADMAP.md`.

- Antworte auf Deutsch. Rückfragen als kurze Auswahlrunden (AskUserQuestion), nicht als Fließtext.
- Bevor du den Code durchsuchst: Skill `pulse-steckbrief` laden – dort stehen Entscheidungen, Aufbau, Datenvertrag, Befehle und Phasenstand.
- Nach jeder fertigen Phase den Phasenstand im Steckbrief nachtragen, damit die nächste Sitzung nichts neu erkunden muss.

## Skills – immer den passenden nutzen

| Anlass | Skill |
|---|---|
| Quelle anbinden, Abruf, Parser, Filter, Fallback, Quellen-Health | `quellen` |
| Scores, Clustering, Claude-Stufen, Prompts, Kostenbuch | `bewertung` |
| `claude -p` aufrufen: Flags, Abo-Login, Limit-Erkennung, Notfall-Backend | `claude-headless` (+ `claude-api` nur fürs Notfall-Backend) |
| AGB, Nutzungsrichtlinien, Datenschutz, Preis-/Deprecation-Seiten überwachen | `vertragsaenderungen` |
| Gesetze, Statusmodell, Fristen-Tabelle, Gerichtsverfahren | `gesetze-und-fristen` |
| CVEs, Advisories, KI-Vorfälle, Severity-Heuristik | `sicherheitsluecken` |
| Neue Modelle, Ranglisten, Anbieter-Watchlist, Aliasse | `modelle-und-ranglisten` |
| Heimserver, systemd-Timer, Push, Deploy-/Watchdog-Workflow, State, Secrets | `job-betrieb` |
| Dashboard-Ansichten, PWA, Datenladen, Gelesen/Merken | `dashboard-entwickeln` |
| 👍/👎-Feedback, Cloudflare Worker + KV | `feedback-worker` |
| Lokal prüfen ohne API-Kosten, Browser-Pane | `sparsam-testen` |
| Nach jedem Lauf: Ergebnis prüfen, kleine Fehler beheben, Check und Lernlog verbessern | `lauf-pruefen` |
| Shell-Befehle unter Windows | `windows-shell-fallen` |

## Sparsam arbeiten

- Quellenkatalog nicht ganz lesen: gezielt die Bereichsdatei in `docs/recherche/2026-10-24/katalog/` öffnen bzw. mit Grep suchen.
- Echte Claude-Läufe nur mit Grund – sie verbrauchen das Abo-Kontingent, das sich der Job mit dem Nutzer teilt; zum Testen `--dry-run` oder `--limit 5`.
