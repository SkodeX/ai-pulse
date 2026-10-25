# AI Pulse – Roadmap

KI-News-Dashboard: Ein Job auf deinem **Heimserver** sammelt 3× täglich die wichtigsten Meldungen zu Modellen, Sicherheitslücken, Gesetzen, Vertragsänderungen, Startups, Forschung und mehr. **Claude Code** sortiert sie über dein **Max-Abo** nach Wichtigkeit (Tragweite + Relevanz für dich) und fasst sie auf Deutsch zusammen. Im Normalbetrieb fallen keine API-Kosten an. Das Ergebnis erscheint als PWA auf GitHub Pages.

Stand: 2026-10-24 · Entscheidungen und Datenvertrag: Skill `pulse-steckbrief` · Quellen: `docs/recherche/2026-10-24/katalog/`

## Architektur

```
Heimserver (systemd-Timer 07:07 / 13:07 / 19:07, Europe/Berlin)
  node pipeline/run.ts
    ├─ sammeln, filtern, clustern, Regel-Scores          (ohne KI)
    ├─ claude -p  --model claude-haiku-5-5   → Vorsortieren, Zusammenfassen   (Abo)
    ├─ claude -p  --model claude-opus-5-5    → Briefing, Woche, AGB           (Abo)
    │     └─ Notfall bei Abo-Limit: Anthropic-API, Haiku 5.5, ≤ 3 €/Monat
    └─ git push public/data/ + state/  (Deploy-Key)
GitHub
  deploy.yml   bei Push → Vite-Build → GitHub Pages
  watchdog.yml prüft regelmäßig, ob meta.json frisch ist → sonst Hinweis per Mail/Issue
```

## Überblick

| Phase | Ergebnis | Claude-Kosten | Sichtbar für dich |
|---|---|---|---|
| 0 Fundament | Fragen, Recherche, Skills, Roadmap | – | ✅ erledigt |
| 1 Sammeln ohne KI | Job holt ~45 Kernquellen, filtert, clustert (lokal entwickelt) | 0 € | Trockenlauf-Bericht |
| 2 Bewerten mit Claude Code | Scores, deutsche Zusammenfassungen, Briefings; CLI-Backend + Notfall-API | 0 € (Abo), Notfall ≤ 3 € | Daten-JSON |
| 3 Server + Dashboard | Heimserver mit Timer, PWA online, Deploy und Watchdog | 0 € | **erste Version live** |
| 4 Spezialmodule | AGB-Monitor, Gesetze mit Fristen, Security-Heuristik, Anbieter-Ranglisten | 0 € | neue Ansichten |
| 5 Archiv & Trends | Tagesarchiv, Suche, Firmen- und Anbieter-Radar, Wochenrückblick | 0 € | Radar, Archiv |
| 6 Feedback-Schleife | 👍/👎 über Cloudflare-Worker, fließt in die Gewichtung | 0 € | Feedback-Knöpfe |
| 7 Optional | Push, Mail-Newsletter, weitere Quellen mit Keys, Node 26 | – | nach Wunsch |

Nach jeder Phase: Phasenstand im Steckbrief nachtragen, veröffentlichen (ab Phase 3), kurz mit dir abstimmen.

---

## Phase 0 – Fundament ✅ (2026-10-24)

- Klärungsfragen in 5 Runden, Entscheidungen im Steckbrief (inkl. Umstellung auf Heimserver + Abo).
- Live-Recherche mit 9 Agenten: ~370 Quellen geprüft, Kritiker-Durchgang, Lückenrecherche (China-Labs, DE-Recht, OTA, Arena, Budget-Messung); Fakten zu Claude Code headless aus der offiziellen Doku.
- Skills unter `.claude/skills/`, kurze `CLAUDE.md`.

**Wichtigste Erkenntnisse**

- Nach Filter und Clustering bleiben nur **~30–65 Kandidaten pro Lauf** übrig. Das ergibt wenige gebündelte Claude-Aufrufe und schont das Abo-Kontingent.
- **Claude Code headless:** `claude setup-token` liefert ein Abo-Token (1 Jahr) für Skripte. `--bare` schließt den Abo-Login aus → `--safe-mode --tools ""` + eigener System-Prompt. Ein `ANTHROPIC_API_KEY` in der Umgebung würde still über die API abrechnen.
- **Heimserver statt GitHub Actions:** Die private IP umgeht viele Bot-Sperren von Rechenzentrums-IPs. Ausnahme: openai.com/policies, help.openai.com und x.ai liefern Skript-Zugriffen schon von der Privat-IP 403 → als blockiert eingeplant (Open Terms Archive, OpenRouter, Fallback-Ketten).
- **Open Terms Archive** (GitHub) verfolgt die meisten Anbieter-AGB bereits → primäre Quelle für Vertragsänderungen.
- **OpenRouter-API** erkennt neue Modelle und liefert den Artificial-Analysis-Index gratis; **Arena-Rangliste** als Parquet von Hugging Face → dynamische Anbieter-Watchlist ohne Keys.
- 6 Feeds des alten Trackers sind tot (Anthropic, Meta AI, Microsoft AI, Azure AI, VentureBeat, AI News).

---

## Phase 1 – Sammeln ohne KI

**Ziel:** Ein lokaler Trockenlauf liefert eine saubere, deduplizierte Kandidatenliste.

0. **Auswahlrunde mit dir:** Repo jetzt öffentlich anlegen und pushen? Lizenz? `.claude/` und `docs/recherche/` mitveröffentlichen? (Steckbrief → `references/entscheidungen.md`)
1. Repo `SkodeX/ai-pulse` anlegen mit den Startwerten aus `pulse-steckbrief/references/projekt-setup.md` (package.json, `tsconfig.pipeline.json`, `.gitignore`, `.gitattributes`); `shared/types.ts`, `shared/categories.ts`, `shared/law.ts`, `pipeline/types.ts`, `pipeline/lib/url.ts` zuerst.
2. **Quellenregister** `pipeline/config/sources.ts` mit den Phase-1-Kernquellen (`quellen/references/kernquellen.md`); je Quelle `id`, Art, Rolle (`official`/`press`/`community`/`aggregator`), URL, Kategorie-Hinweis, Priorität, Takt (`3x` / `daily07` / `weekly`), Filterregel, Fallback-IDs (nur existierende).
3. **Abruf-Schicht:** ehrlicher UA, Timeout 20 s, 1 Retry, ETag/If-Modified-Since, Challenge-Erkennung, pro Host nacheinander, Health-Status mit Circuit-Breaker (3 Fehler → degraded → Fallback).
4. **Parser (nur diese Arten):** `feed` (RSS/Atom, Content-Type ignorieren), `json` (HN Algolia, HF Daily Papers, YC), `sitemap` (`loc`-Diff), `htmldiff` (datierte Changelogs), `github` (Releases). OpenRouter, Arena-Parquet, GHSA/OSV und Federal Register kommen erst in Phase 4.
5. **Vorfilter:** Sponsor-, Anzeige- und Paywall-Marker, DE/EN-Keywords für gemischte Feeds, Nightly-Filter, HF Daily Papers ab 30 Upvotes, HN `points > 100`.
6. **Clustering:** `canonicalUrl()`, Techmeme-Original-URL, Titel-Jaccard über 72 h (Schwelle 0,5; die Watchlist-Regel 0,4 kommt erst mit den Aliassen).
7. Fixture-Tests (`node --test`, Fixtures gekürzt) für Parser, Filter und Clustering; `npm run smoke` für die Erreichbarkeit aller Register-Quellen.

**Fertig, wenn:** `npm run collect -- --fresh` (Lauf 1 = Basis) und ≥ 6 h später `npm run collect` (Lauf 2) laufen lokal je < 3 min; Lauf 2 liefert 30–65 Cluster; ≥ 90 % der Kernquellen haben das Abruf-Urteil `ok` (0 Items erlaubt, wenn die Struktur stimmt); `report.md` ist lesbar.
**Skills (nur diese Teile laden):** `pulse-steckbrief`; `quellen` (ganz, `references/nicht-nutzen.md` nur beim Anbinden neuer Quellen); `bewertung` nur Stufe 0a + `state/seen.json` (bzw. `references/clustering.md`); `sparsam-testen`; `windows-shell-fallen`.

---

## Phase 2 – Bewerten mit Claude Code

**Ziel:** Aus Kandidaten werden sortierte deutsche Stories im Datenvertrag, plus Briefing, über das Abo.

1. Persona-Profil `pipeline/config/profile.ts`, Modelle/Backends/Grenzen `pipeline/config/models.ts`.
2. **LLM-Backends** mit gemeinsamer Schnittstelle: `cli` (Claude Code headless, Abo, Standard) und `api` (Anthropic-SDK, nur Notfall). Limit- und Login-Fehler der CLI erkennen → Notfall-Backend → sonst Regel-Scores + Nachholen. Fehlerformen einmal gezielt messen (absichtlich ungültiges Token).
3. **Deterministische Vor-Scores** (Quellen-Prior, Mehrfachquellen, Techmeme/HN-Boost, Watchlist-Treffer).
4. **Stufe 1 – Haiku 5.5:** Vorsortieren (≤ 80/Lauf, Pakete à 20, JSON-Schema): Kategorie, Tags, `clusterKey`, `impact`, `personal`, Hype-Flag, deutscher Titel.
5. **Stufe 2 – Haiku 5.5:** Zusammenfassung, „Warum wichtig", „Für dich" für die Top ≤ 25.
6. **Stufe 3 – Opus 5.5:** Briefing nach jedem Lauf (morgens ausführlich, mittags/abends „Seit heute früh").
7. Kostenbuch `state/usage/` (Abo: Aufrufe/Token als Schätzung; API: USD, Grenze 3 €).
8. Ausgabe nach `public/data/` über `pipeline/output/` (latest, archive, index, briefing, meta – gegen zod geprüft), Zustand nach `state/`.

**Fertig, wenn:** 3 echte Läufe (lokal mit `--limit 80` ≈ voller Umfang, Ausgabe nach `.cache/`) ergeben plausible Rangfolgen (Stichprobe mit dir), ein Lauf braucht ≤ 8 CLI-Aufrufe, Notfall-Umschaltung ist mit simuliertem Limit (`AIPULSE_SIMULATE_LIMIT=1`, API-Antwort aus Fixture) getestet und ein einzelner echter Haiku-Aufruf mit `AIPULSE_API_LIVE_TEST=1` hat funktioniert.
**Skills:** `bewertung`, `claude-headless`, `claude-api` (nur Notfall-Backend), `sparsam-testen`.

---

## Phase 3 – Server + Dashboard (erste Version live)

**Ziel:** Du öffnest die App auf Handy/PC und siehst 3× täglich frische, sortierte News, ohne dass dein PC laufen muss.

1. **Heimserver einrichten** (Skill `job-betrieb`, Schritt-für-Schritt in `references/server-setup.md`): eigener Benutzer `aipulse`, Node 24, Claude Code per nativem Installer in fester Version (Updates bewusst), `CLAUDE_CODE_OAUTH_TOKEN` aus `claude setup-token`, `AIPULSE_GITHUB_TOKEN` ohne Rechte, Deploy-Key mit Schreibrecht nur für dieses Repo, `run.sh` (Lock, Env-Hygiene, `git pull --rebase`, Lauf, Push), systemd-Service + Timer (`Persistent=true` holt verpasste Läufe nach), danach `npm run smoke` auf dem Server.
2. **GitHub:** `deploy.yml` (bei Push auf `main`: Vite-Build, Pages-Deploy), `watchdog.yml` (geplant; meldet, wenn `meta.json` älter als 14 h ist).
3. **Dashboard** (Vite/React-PWA nach Vorbild Space): **Heute** (Briefing oben, Top-Stories), **Kategorien** (11 Chips), **Briefing**, Story-Karte (Scores, Quellen, Paywall-Hinweis, Zusammenfassung), Sortierung Gesamt/Tragweite/Für mich, **Gelesen/Merken**, Suche in den letzten 72 h, Mindest-Score-Filter.
4. Frische: Daten-JSON per NetworkFirst mit `cache: 'no-cache'`, Warnbanner bei Stand > 24 h, Footer mit Quellen-Credits, Quellen-Health und Claude-Backend (Abo/API/aus).

**Fertig, wenn:** Die Seite läuft 3 Tage ohne Eingriff, ein Server-Neustart verliert keinen Lauf (Nachholen), Handy-Ansicht passt.
**Skills:** `job-betrieb`, `dashboard-entwickeln`, `sparsam-testen`.

---

## Phase 4 – Spezialmodule

Reihenfolge nach Nutzen; jedes Modul einzeln veröffentlichen.

1. **Vertragsänderungen:** Open-Terms-Archive-Commits, Direktabruf für Lücken, Normalisierung, Wesentlichkeitsschwelle, Opus erklärt in Klartext, Stichtag-Erinnerungen (OpenAI Usage Policies ab 20.11.2026, Anthropic AUP ab 12.11.2026). Snapshots privat auf dem Server. → `vertragsaenderungen`
2. **Gesetze & Fristen:** Statusmodell, strukturierte Quellen setzen den Status, kuratierte Fristen-Tabelle, Ansicht **Fristen**. → `gesetze-und-fristen`
3. **Sicherheitslücken:** GHSA-Watchlist in einem Aufruf, NVD-Zeitfenster + Produkt-Regex, KEV/EPSS/MSRC, Gruppierung je Produkt, Severity-Heuristik. → `sicherheitsluecken`
4. **Modelle & Ranglisten:** OpenRouter-Snapshot-Diff, Arena-Parquet + AA-Index → Anbieter-Watchlist wöchentlich, Alias-Tabelle, „Neue #1"-Erkennung. → `modelle-und-ranglisten`
5. **Ansicht „Modelle & Tools"** (Wunsch 2026-10-25): Bestenliste je Einsatzzweck (Coding & Agenten, Text, WebDev, Vision, Preis-Leistung, Film/Video, Design, Game-Dev, Automatisierung), Tool-Vergleiche (Coding-Assistenten, Chat-Apps, lokale Modelle, Automatisierung & UIs), Modellerweiterungen als Verlauf je Anbieter; Aktualisierung 3× pro Woche (Mo, Mi, Fr 07:07) inkl. Opus-Urteil „Empfehlung für dich". Details: Steckbrief → `references/entscheidungen.md`.

**Skills außerdem:** `quellen` (Register-Einträge aller neuen Quellen), `dashboard-entwickeln` (Ansicht **Fristen**, Liste „Weitere Advisories"), `bewertung` (Sonder-`clusterKey`s und Score-Übernahmen).

---

## Phase 5 – Archiv & Trends

1. Tagesarchiv, Monatsindex, **Archiv-Ansicht mit Suche** (Firma, Modell, Kategorie, Zeitraum).
2. **Firmen-Radar:** Erwähnungswachstum (7 Tage vs. 28 Tage davor), Funding-Ereignisse, neue Orgs in HF-Trending/OpenRouter.
3. **Anbieter-Radar:** Watchlist-Ansicht mit Rang, Rating-Verlauf, Aufsteigern.
4. **Wochenrückblick** sonntags mit Opus 5.5 (ersetzt das Abend-Update), eigenes Archiv.

**Skills:** `dashboard-entwickeln` (Archiv, Radar), `bewertung` (Wochenrückblick, Archiv-/Index-Ausgabe), `modelle-und-ranglisten` (Anbieter-Radar, `watchlist.json`), `job-betrieb` (Archivgröße, Briefing-Ordner).

---

## Phase 6 – Feedback-Schleife

1. Cloudflare Worker `ai-pulse-feedback` + KV, zwei Tokens (Schreiben im Browser, Lesen nur auf dem Server), CORS nur `skodex.github.io`.
2. 👍/👎 in der Story-Karte, Token einmalig in den Einstellungen.
3. Job liest Feedback vor dem Bewerten, verdichtet es zu einem Präferenzprofil und gibt nur das Profil an Claude. Rohe Votes nie ins öffentliche Repo.

**Skills:** `feedback-worker`, `bewertung` (Profil im Kontext der Stufe 1), `dashboard-entwickeln` (Knöpfe, `aipulse.votes`), `job-betrieb` (`FEEDBACK_READ_TOKEN` in der Server-Env).

---

## Phase 7 – Optional / später

- Push für sehr wichtige Meldungen (ntfy oder Telegram), Wochen-Newsletter per Mail.
- Kostenlose Keys ergänzen: DIP Bundestag, NVD, Artificial Analysis, Congress.gov.
- Umstieg auf Node 26 LTS.
- Weitere Quellen aus dem „Ergänzend"-Teil des Katalogs.

---

## Was du beisteuern musst

| Wann | Was |
|---|---|
| Phase 1 | OK für das öffentliche Repo `SkodeX/ai-pulse` |
| Phase 2 | **Zusatzkredite (Usage credits) im Claude-Konto aus lassen.** Lokale Testläufe nutzen deinen normalen Claude-Code-Login. |
| Phase 2 | Optional Notfall-API-Key mit Monatslimit 5 USD in der Anthropic-Konsole |
| Phase 2 | Profil-Fragen beantworten (Interessen/Desinteressen, selbst gehostete Tools) und Stichprobe der ersten Rangfolgen bewerten („passt" / „zu hoch" / „zu niedrig") |
| Phase 3 | Heimserver bereitstellen (Linux, Ubuntu 22.04+ oder Debian 12+, ≥ 4 GB RAM, dauerhaft an) und SSH-Zugang; Backup-Ziel für die privaten AGB-Snapshots nennen |
| Phase 3 | `claude setup-token` auf einem Rechner mit Browser ausführen (1 Jahr gültig ab Erstellung) und das Token sicher in die Env-Datei des Servers legen |
| Phase 3 | Deploy-Key im Repo eintragen (Schreibrecht) und einen GitHub-Token **ohne** Rechte für API-Lesezugriffe erzeugen |
| Phase 3 | Entscheidung Impressum/Datenschutzerklärung vor dem Livegang |
| Phase 6 | Cloudflare-Login für den Worker (Konto existiert) |
| ~~offen~~ | Code-Lizenz: MIT (2026-10-25) |
| 2027-10 | Abo-Token erneuern (1 Jahr gültig; das Dashboard warnt 30 Tage vorher) |

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Abo-Kontingent leer (teilt sich der Job mit deiner Claude-Code-Arbeit) | gebündelte Aufrufe, Haiku für die Masse, Notfall-API ≤ 3 €, sonst Rohschlagzeilen + Nachholen |
| Nutzungsbedingungen: Ergebnisse aus dem Abo auf öffentlicher Seite nicht ausdrücklich geregelt | statische Seite (Besucher lösen keine Aufrufe aus), nicht kommerziell; die Claude-Code-Bedingungen werden selbst mit überwacht; Umstellung auf API möglich (Backend, Deckel und Modellwahl in `models.ts` plus Konsolenlimit ändern; ≈ 10 USD/Monat, mit Sonnet mittags/abends ≈ 7 USD) |
| Server aus oder Internet weg | Nachholen über Zeitfenster seit letztem Erfolg, Watchdog-Hinweis, Warnbanner im Dashboard |
| Claude-Code-Update ändert Verhalten | feste Version, Updates bewusst einspielen, nach Update `--limit 5`-Lauf |
| API-Key landet versehentlich im Claude-Prozess | Env-Hygiene im Wrapper, `claude auth status` vor jedem Lauf muss `oauth_token` zeigen |
| Advisory-/Release-Fluten | Gruppierung je Produkt und Lauf, Nightly-Filter, Obergrenzen |
| Urheberrecht | nur eigene Kurztexte mit Link; AGB-Volltexte nur privat auf dem Server |
