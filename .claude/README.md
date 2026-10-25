# Claude-Einstellungen für AI Pulse

Alles, was Claude Code für dieses Projekt braucht, liegt hier im Repo und lässt sich einfach mitnehmen.

| Pfad | Zweck |
| --- | --- |
| `../CLAUDE.md` | Wird in jeder Sitzung geladen – bewusst kurz, verweist nur auf die Skills |
| `skills/pulse-steckbrief/` | Umfang, Entscheidungen, Stack, Aufbau, Datenvertrag, Befehle, Phasenstand (projektspezifisch) |
| `skills/quellen/` | Quellenregister, Abruf, Parser, Filter, Fallback-Ketten (projektspezifisch) |
| `skills/bewertung/` | Scores, Clustering, Claude-Stufen, Kostenbuch (projektspezifisch) |
| `skills/claude-headless/` | Claude Code headless mit Abo aufrufen, Notfall-API (projektspezifisch, Muster wiederverwendbar) |
| `skills/vertragsaenderungen/` | AGB- und Preisseiten-Monitor (projektspezifisch) |
| `skills/gesetze-und-fristen/` | Recht EU/DE/USA, Statusmodell, Fristen (projektspezifisch) |
| `skills/sicherheitsluecken/` | CVEs, Advisories, Vorfälle, Severity-Heuristik (projektspezifisch) |
| `skills/modelle-und-ranglisten/` | Neue Modelle, Ranglisten, Anbieter-Watchlist (projektspezifisch) |
| `skills/job-betrieb/` | Heimserver mit systemd-Timer, Push, Deploy- und Watchdog-Workflow, State (projektspezifisch) |
| `skills/dashboard-entwickeln/` | Vite/React-PWA (projektspezifisch) |
| `skills/feedback-worker/` | Cloudflare Worker + KV im Free-Plan (projektspezifisch) |
| `skills/sparsam-testen/` | Token- und kostensparend prüfen (allgemein, angepasst) |
| `skills/windows-shell-fallen/` | Shell-Fallen auf diesem PC (allgemein) |
| `launch.json` | Dev- und Vorschau-Server für den Browser-Pane (kommt mit Phase 3) |

Rohdaten der Quellenrecherche vom 2026-10-24: `../docs/recherche/2026-10-24/` (Katalog je Bereich, JSON, Prototyp-Skripte).

## Warum das Token spart

Skills werden nur mit ihrer einzeiligen Beschreibung geladen; den Inhalt liest Claude erst, wenn er gebraucht wird. So muss nicht jede Sitzung das Repo neu erkunden, und bekannte Fehler werden nicht wiederholt.

## Exportieren

- **In ein anderes Projekt:** den gewünschten Ordner unter `skills/` nach `<projekt>/.claude/skills/` kopieren.
- **Für alle Projekte:** die allgemeinen Skills (`sparsam-testen`, `windows-shell-fallen`) nach `%USERPROFILE%\.claude\skills\` kopieren.
