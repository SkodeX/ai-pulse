---
name: job-betrieb
description: AI-Pulse-Betrieb – Heimserver, systemd-Timer, run.sh, Lauf-Typ, Nachholen, Deadline, State-Dateien, Secrets, deploy.yml/watchdog.yml, Smoke-Test, Ausfälle, Wartung. Laden, bevor du an server/ oder .github/workflows/ arbeitest oder einen Lauf untersuchst.
---

# Job-Betrieb (Heimserver + GitHub)

Grundsatz: Der **Heimserver** macht alles, was Daten erzeugt. Ein systemd-Timer startet 3× täglich `server/run.sh`. Das Skript holt den neuesten Stand, startet `node pipeline/run.ts` (Claude über `claude -p` mit dem Abo) und pusht `public/data/` + `state/` per Deploy-Key. **GitHub** baut und veröffentlicht nur (`deploy.yml`) und schlägt Alarm, wenn der Server schweigt (`watchdog.yml`). Keine Pipeline in Actions, keine Secrets in GitHub. Der Lauf ist fail-soft (kaputte Quellen machen ihn nicht rot) und idempotent (ein ausgefallener Lauf wird nachgeholt). Noch ist nichts davon gebaut, alles hier ist Bauplan.

Fakten geprüft am 2026-10-24: Claude-Code-Doku (Setup, Env-Variablen, Managed Settings, CLI, Authentifizierung), systemd-Manpages und NEWS, GitHub-Doku (Auslöser, `GITHUB_TOKEN`, Deploy-Keys, PATs), NodeSource. Aufruf von `claude -p`, Flags, Limit-Erkennung → Skill `claude-headless`. Flags von `pipeline/run.ts`, Trockenlauf und Schatten-State → Steckbrief.

| Datei | Inhalt |
|---|---|
| [references/server-setup.md](references/server-setup.md) | Einrichtung Schritt für Schritt, Claude-Code-Update, Token-Erneuerung, OS-Updates, Backups, Docker-Variante |
| [references/server-dateien.md](references/server-dateien.md) | `ai-pulse.service`, `ai-pulse.timer`, `run.sh`, `env.example` vollständig |
| [references/workflows.md](references/workflows.md) | `deploy.yml` und `watchdog.yml` vollständig, Alarmtexte, Auslöser, Tests |
| [references/smoke-test.md](references/smoke-test.md) | `npm run smoke` auf dem Server: Befehle, Zeitpunkte, Bericht (Spezifikation nur in Skill `quellen` § 11) |
| [references/ausfaelle.md](references/ausfaelle.md) | Ausfälle: Symptom, Verhalten, Was tun |

## Ausbaustufen je Phase

| Phase | Wo | Inhalt |
|---|---|---|
| 1 | PC | `npm run collect -- --fresh` (Lauf 1 = Basis), ≥ 6 h später `npm run collect` (Lauf 2), `npm test`, `npm run smoke` – alles nach `.cache/` |
| 2 | PC | 3 echte Läufe mit `--limit` (`--limit 80` ≈ voller Umfang), Ausgabe `.cache/run/`, kein Commit. Notfallpfad mit `AIPULSE_SIMULATE_LIMIT=1` (API-Antwort aus Fixture), ein echter Haiku-Aufruf nur mit `AIPULSE_API_LIVE_TEST=1` |
| 3 | Server + GitHub | Server einrichten, Units, `run.sh`, `deploy.yml`, `watchdog.yml`, Smoke-Test vom Server, erster Lauf per Timer |
| 5 | Server | Stufe `weekly` in `pipeline/config/models.ts` einschalten → Sonntag 19:07 läuft als `weekly`; Archivgröße und Briefing-Ordner prüfen |
| 6 | Server | `FEEDBACK_READ_TOKEN` in `/etc/ai-pulse/env` → Skill `feedback-worker` |

## Server – Eckdaten

Linux x64/ARM64 mit systemd ≥ 243 (Begründung in `server-setup.md`, Schritt 0), dauerhaft an, NTP-synchron, ≥ 4 GB RAM (Claude Code). Für eine Neueinrichtung ein aktuelles Ubuntu LTS oder Debian stable. Eingehende Ports braucht nichts, alle Verbindungen gehen nach außen.

| Pfad | Inhalt | Eigentümer, Modus |
|---|---|---|
| `/opt/ai-pulse` | Checkout von `main` (Remote `git@github-ai-pulse:SkodeX/ai-pulse.git`) | `aipulse` |
| `/etc/ai-pulse/env` | Secrets (Tabelle unten) | `root:aipulse`, 640 |
| `/etc/claude-code/managed-settings.json` | `{ "env": { "DISABLE_UPDATES": "1" } }` | root, 644 |
| `/etc/systemd/system/ai-pulse.{service,timer}` | Kopien aus `server/` | root, 644 |
| `/home/aipulse/.local/bin/claude` | Launcher des nativen Installers (Versionen unter `~/.local/share/claude/versions/`) | `aipulse` |
| `/home/aipulse/.ssh/ai-pulse-deploy` | Deploy-Key (ed25519) + `~/.ssh/config` mit Alias `github-ai-pulse` | `aipulse`, 600 |
| `/home/aipulse/.local/share/ai-pulse/` | privat: `snapshots/` (AGB-Volltexte, Skill `vertragsaenderungen`), `logs/` | `aipulse` |

- **Benutzer `aipulse`:** Systembenutzer mit Home, Shell `nologin`; Befehle als `sudo -u aipulse -H bash -lc '…'`. Git im Checkout **nie als root**.
- **Node 24** über NodeSource (`setup_24.x`), Minor-Updates per `apt`.
- **Claude Code** per nativem Installer als `aipulse` in **fester Version** (Stand 2026-10-24: `stable` 2.1.308, `latest` 2.1.310). Updates sperrt `DISABLE_UPDATES=1` in den **Managed Settings** (gilt für jeden Aufruf, auch mit `--safe-mode` und neu gebauter Umgebung; `DISABLE_AUTOUPDATER` reicht nicht).
- **Anmeldung:** `CLAUDE_CODE_OAUTH_TOKEN` (aus `claude setup-token`, 1 Jahr) in der Env-Datei; `claude auth status` muss `"authMethod": "oauth_token"` zeigen. Kurzprüfung: `sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check`.
- **Push:** Deploy-Key mit Schreibrecht nur für `SkodeX/ai-pulse` (dort Rechte wie ein Collaborator). Bot-Commits mit `user.name "AI Pulse Bot"` und der noreply-Adresse `<ID>+SkodeX@users.noreply.github.com` (Platzhalter).
- Befehle, Versionsabfrage und Prüfungen → [references/server-setup.md](references/server-setup.md).

## systemd

Beide Units liegen versioniert unter `server/` und werden nach `/etc/systemd/system/` **kopiert** (danach `daemon-reload`). Ein Push ändert sie auf dem Server nicht. Volltext → [references/server-dateien.md](references/server-dateien.md).

- **`ai-pulse.service`:** `Type=oneshot`, `User=aipulse`, `EnvironmentFile=/etc/ai-pulse/env`, `ExecStart=/opt/ai-pulse/server/run.sh`, `After=network-online.target`. **`TimeoutStartSec=45min`** (bei `oneshot` sonst kein Start-Timeout), `SuccessExitStatus=75` (Lock belegt ist kein Fehler), `UnsetEnvironment=ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN` (wirkt auch auf Werte aus `EnvironmentFile=`). Härtung mit `ProtectSystem=strict`, `ProtectHome=read-only` + `ReadWritePaths=/opt/ai-pulse /home/aipulse`, **ohne** `MemoryDenyWriteExecute=` (JIT). Nicht geheim als `Environment=`: `AIPULSE_CLAUDE_BIN`, `AIPULSE_DATA_DIR`, `AIPULSE_DEADLINE_MIN=30`.
- **`ai-pulse.timer`:** `OnCalendar=*-*-* 07,13,19:07:00 Europe/Berlin` (IANA-Zone ab systemd 235, Sommerzeit geht von selbst), `Persistent=true` (nach Ausfall **einmal** sofort nachholen, die Lücke schließt das Zeitfenster), **kein** `RandomizedDelaySec=`. Sonntag 19:07 ist derselbe Termin – bis Phase 5 ein normaler `evening`-Lauf, erst mit eingeschalteter Stufe `weekly` macht die Pipeline daraus `weekly` (unten).
- **Bedienen:** `systemctl list-timers ai-pulse.timer`, `journalctl -u ai-pulse -n 80 --no-pager`, `systemd-analyze calendar '*-*-* 07,13,19:07:00 Europe/Berlin'`. Manueller Lauf `sudo systemctl start --no-block ai-pulse.service`; mit Argumenten `sudo -u aipulse -H /opt/ai-pulse/server/run.sh --kind morning` (lädt die Env-Datei selbst, der Lock verhindert Überschneidungen).

## server/run.sh – Ablauf

Volltext mit Begründungen je Schritt → [references/server-dateien.md](references/server-dateien.md). Der ganze Ablauf steht in einer Funktion `main` (letzte Zeile `main "$@"; exit $?`), damit bash das Skript vollständig gelesen hat, bevor `git pull` es ersetzt.

1. `set -Eeuo pipefail`, `umask 027`; Env-Datei nachladen, falls `CLAUDE_CODE_OAUTH_TOKEN` fehlt (manueller Aufruf); `unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN`, `HOME` aus `getent passwd`, fester `PATH`. `--auth-check` prüft nur die Anmeldung und endet.
2. **Lock** `flock -n` auf `.cache/run.lock`, belegt → Exit 75. Danach verwaistes `.git/index.lock` und hängenden Rebase aufräumen.
3. `git pull --rebase --autostash` (Fehlschlag → `rebase --abort`, Exit 10); `npm ci --ignore-scripts` nur bei geändertem `package-lock.json` oder fehlendem `node_modules/` (Exit 11).
4. `claude auth status` mit `env -i` → `AIPULSE_AUTH_METHOD`; ≠ `oauth_token` → Warnung, das Backend wählt die Pipeline (Skill `claude-headless`).
5. `node pipeline/run.ts "$@"`, Exit-Code merken. Teil-Flags (`--dry-run`, `--stage`, `--only`, `--limit`) reicht das Skript durch: Die Pipeline schreibt dann nur nach `.cache/`, nutzt nie das API-Backend, und der Commit-Schritt findet nichts.
6. **Commit** nur bei Änderungen (`mkdir -p public/data state` vorher): Pipeline ok → `git add --all -- public/data state`; Fehlschlag → nur `state/usage` (Notfall-API-Kosten sind angefallen). Nachricht `data: JJJJ-MM-TT HH:MM <kind>` (Berliner Zeit).
7. **Reste verwerfen** (`git restore --staged --worktree` + `git clean -fdq` auf `public/data state`), dann **Push mit Retry**, sobald `origin/main..HEAD` Commits enthält: 3 Versuche, dazwischen 15/30 s und `git pull --rebase`; Konflikt → `rebase --abort`, Exit 30, der Commit bleibt lokal.
8. **Exit-Codes:** 0 ok · 10 Pull · 11 npm ci · 20 Pipeline · 30 Push · 75 Lock belegt.

**Logging:** stdout/stderr gehen ins Journal (`SyslogIdentifier=ai-pulse`). Zeilen mit `[run]`, am Ende eine Zusammenfassung von der Pipeline: Lauf-Typ, Quellen ok/degraded/blockiert, Kandidaten, Claude-Aufrufe, Backend, Dauer. **Nie** `set -x`, nie Umgebung, Tokens, Meldungstexte oder ganze Claude-Ausgaben loggen.

## Lauf-Typ, Zeitfenster, Nachholen

- **Lauf-Typ aus der Berliner Ortszeit**, nie aus der Systemzeitzone: `Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })`.
  - 04–10 Uhr → `morning`, 11–16 Uhr → `midday`, 17–03 Uhr → `evening`. Die Spannen fangen späte Nachholläufe ab.
  - **Lauf-Datum** = Berliner Datum von (jetzt − 4 h). Ein Nachhollauf um 02:00 gehört also noch zum Vortag.
  - **`weekly` erst ab Phase 5:** Nur wenn die Stufe `weekly` in `pipeline/config/models.ts` eingeschaltet ist, wird `evening` an einem Lauf-Datum, das ein Sonntag ist, zu `weekly` (der Wochenrückblick ersetzt das Abend-Update). Bis dahin ist Sonntag 19:07 ein normaler `evening`-Lauf mit Abend-Briefing.
  - `--kind morning|midday|evening|weekly` überschreibt den Typ (Tests, Reparatur). `--kind weekly` und `--stage weekly` enden vor Phase 5 wie jede nicht gebaute Stufe mit Exit 2 „kommt in Phase 5". Lokal unter Windows gilt dieselbe Funktion, `TZ` nicht setzen.
- **Zeitfenster ab dem letzten Erfolg:** APIs mit Datumsparameter fragen ab `state/runs.json` → `lastSuccessAt − 1 h` ab, höchstens 72 h zurück. Beim ersten Lauf (keine `runs.json`) gelten 24 h. Beispiele: Federal Register `conditions[publication_date][gte]`, DIP `f.aktualisiert.start`. Doppelte fängt `state/seen.json` ab.
  - **Erlaubte Ausnahmen:** Skill `sicherheitsluecken` führt eigene Fenster je Quelle in `state/security.json` (2 h Überlappung, NVD nach Ausfall bis 120 Tage). Quellen mit Punkte-Schwelle behalten ein festes Fenster (HN Algolia mit `points>100` 36 h, HF Daily Papers ab 30 Upvotes ein eigenes), weil eine Meldung die Schwelle oft erst Stunden nach dem Erstellen erreicht.
- **`state/runs.json`** (Eigentümer dieser Skill): `{ "lastSuccessAt": ISO-UTC, "lastKind": RunKind, "lastRunId": "<buildId aus meta.json>" }`.
  - Die Pipeline schreibt die Datei als **letzte**, nachdem `public/data/` geprüft und vollständig geschrieben ist.
  - Nur volle Läufe (ohne `--limit`, `--only`, `--dry-run`, `--stage`) schreiben sie. Teilläufe arbeiten nur in `.cache/` (Trockenlauf mit Schatten-State `.cache/dry/state/`, sonst `.cache/run/`; Steckbrief). Sonst verschöbe ein Testlauf das Fenster, und nicht bewertete Meldungen aus Datums-APIs kämen nie wieder.
- **Idempotenz:**
  - **Briefings:** höchstens ein Briefing je Lauf-Datum und Lauf-Typ (`briefing/JJJJ/JJJJ-MM-TT-<kind>.json`). Gibt es die Datei schon, überspringt der Lauf die Stufe. `--stage brief` (ab Phase 5 auch `--stage weekly`) erzeugt trotzdem eins, aber nur als Vorschau nach `.cache/run/`. Neu erzeugen auf dem Server: Briefing-Datei löschen und einen vollen Lauf starten (Skill `bewertung`, `references/ausgabe.md`).
  - **Fehlendes Morgen-Briefing:** Jeder Lauf schreibt nur das Briefing seines eigenen Typs. Gibt es für das Lauf-Datum noch kein Morgen-Briefing, ist das Mittags- oder Abend-Briefing die ausführliche Form (Inhalt → Skill `bewertung`).
  - **Fehlender Wochenrückblick (ab Phase 5):** Fehlt er am Sonntag (Lauf ausgefallen), holt ihn der nächste Lauf bis Montag 10:59 nach. Die Datei trägt das Sonntagsdatum (`JJJJ-MM-TT-weekly.json`).
  - **`seen.json`:** Hier landet nur, was bewertet oder per Regel endgültig verworfen wurde. Sonst verschluckt ein `--limit 5`-Lauf den Rest.
  - **Wiederholung:** Derselbe Termin lässt sich gefahrlos wiederholen – keine doppelten Stories, kein doppeltes Briefing, ein neuer Commit nur bei echten Änderungen.
- **Interne Deadline:** `AIPULSE_DEADLINE_MIN` (bleibt 30, gesetzt in der Unit) gilt ab Laufstart der Pipeline.
  - **Zeitreserve fürs Briefing** (Regel und Timeouts: Skill `bewertung`): Einen Aufruf von `triage`, `summarize` oder `terms` startet die Pipeline nur, wenn `jetzt + Timeout dieser Stufe + Timeout des Briefings` (300 s `brief`, ab Phase 5 sonntags 600 s `weekly`) vor der Deadline liegt; das Briefing selbst nur, wenn `jetzt + sein Timeout` passt. Wiederholungen zählen genauso; die Reserve entfällt, wenn die Briefing-Datei des Laufs schon existiert.
  - Passt ein Aufruf nicht mehr, bekommt der Rest `ratedBy: 'regel'`. Das Claude-Briefing läuft dank Reserve trotzdem; nur wenn auch es nicht mehr passt oder scheitert, entsteht das Regel-Briefing (`model: 'regel'` – jeder Lauf hat ein Briefing). Der Lauf endet sauber.
  - Rechnung: Timeouts laut `bewertung` 180 s Haiku, 300 s `brief`/`terms`, 600 s `weekly`; ≤ 8 Aufrufe ergeben im schlimmsten Fall 28 min (ab Phase 5 sonntags 33 min). Mit der Reserve enden alle Claude-Aufrufe spätestens 30 min nach dem Start; danach folgen Ausgabe, Commit und Push mit Retry (≈ 2 min), davor Pull und ggf. `npm ci`. `TimeoutStartSec=45min` bleibt die harte Grenze mit rund 10 min Puffer.
  - Bricht erst systemd ab, sind Ergebnisse verloren, und der Push fehlt.
- **Server-Ausfall:** Nach dem Start holt `Persistent=true` einen Lauf sofort nach, das Fenster deckt bis 72 h ab. Bei längeren Lücken fehlt bei Datums-APIs der Teil vor 72 h (außer bei den Security-Fenstern); Feeds liefern ohnehin nur ihre letzten Einträge. Sichtbar wird ein Ausfall im Dashboard (Hinweis ab 14 h, Warnbanner ab 24 h) und als Watchdog-Issue ab 14 h.

## State-Dateien

Was Kosten verhindert oder Duplikate abfängt, liegt **in Git** unter `state/`. Das Repo ist öffentlich, also nichts Geheimes dort ablegen. Die Feldbedeutung regelt der Eigentümer-Skill, hier geht es nur um Ablage und Größe. Eine neue State-Datei kommt zuerst mit Eigentümer in den Steckbrief.

| Datei | Inhalt | Eigentümer | Größe |
|---|---|---|---|
| `seen.json` | `{ "<key>": { firstSeen, storyId? } }` | `bewertung` | TTL 30 Tage, Warnung ab 800 KB |
| `source-state.json` | Sitemap-`loc`-Mengen, Abschnitts-Hashes, Release-Stände, GUID-Mengen | `quellen` | Hash-Kürzel statt Volltext |
| `http-cache.json` | ETag/Last-Modified/Body-Hash je Quellen-ID | `quellen` | ~10 KB |
| `sources-health.json` | Status je Quelle | `quellen` | klein |
| `usage/JJJJ-MM.json` | Kostenbuch je Aufruf (UTC-Monat) | `bewertung` / `claude-headless` | ≈ 200 KB/Monat (< 1 MB), **auch nach Fehlschlag** committet |
| `runs.json` | `lastSuccessAt`, `lastKind`, `lastRunId` | `job-betrieb` | winzig |
| `terms-index.json` | Hash, Datum, Quelle je Dokument | `vertragsaenderungen` | klein |
| `security.json` | Fenster und Gruppenstände je Security-Quelle | `sicherheitsluecken` | klein |
| `law-watch.json` | Verfahrensstände, Datumslisten | `gesetze-und-fristen` | klein |
| `leaderboards/` | Snapshots + `watchlist-history.json` (12 Wochen) | `modelle-und-ranglisten` | je < 500 KB |

Außerhalb von Git (alles unter `.cache/` ist gitignored):

| Ablage | Inhalt |
|---|---|
| `.cache/http/` auf dem Server | Antwortkörper von Diff-Quellen, große Downloads; lässt sich neu holen |
| `.cache/dry/state/` | Schatten-State der Trockenläufe (beim ersten Mal aus `state/` kopiert, `--fresh` leert ihn) |
| `.cache/dry/<runId>/` | Trockenlauf-Ausgabe `raw-items.json`, `candidates.json`, `health.json`, `report.md` |
| `.cache/run/`, `.cache/smoke/`, `.cache/prompts/`, `.cache/run.lock` | Teilläufe mit Claude (inkl. Kostenbuch), Smoke-Berichte, zusammengesetzte System-Prompts (Skill `bewertung`), Lock |
| `~aipulse/.local/share/ai-pulse/snapshots/` | AGB-Volltexte: privat, im Backup, **nie** ins Repo |

- **Größen:** Dateien < 1 MB (GitHub-Empfehlung), ≤ 3.000 Einträge je Verzeichnis. Darum Tagesdateien `archive/JJJJ/MM/TT.json` und Briefings in Jahresordnern `briefing/JJJJ/` (≈ 1.150 Dateien pro Jahr). `.git` wächst grob um ≤ 50 MB pro Jahr, `public/data/archive/` um ≈ 36 MB pro Jahr.
- **Schreiben:** Die Pipeline schreibt atomar (Temp-Datei `<datei>.tmp-<pid>` im Zielordner, dann umbenennen – Skill `bewertung`; Muster `*.tmp-*` in `.gitignore` wie in `pulse-steckbrief/references/projekt-setup.md`) und prüft `public/data/` vorher mit zod gegen den Datenvertrag. Ist die Ausgabe ungültig: Exit 1, der alte Stand bleibt.
- **Konflikte:** Bei einem Rebase-Konflikt in `state/` oder `public/data/` **nie** `-X theirs` auf JSON anwenden, das ergibt halb gemergtes JSON. Lösung: siehe Ausfälle.

## GitHub-Workflows

Volltext, Alarmtexte und Tests → [references/workflows.md](references/workflows.md). Beide nutzen nur `github.token`, keine Secrets.

- **`deploy.yml`:** `push` auf `main` (`paths-ignore`: `docs/**`, `.claude/**`, `server/**`, `worker/**`, `state/**`, `**/*.md` – reine State-Commits nach Fehlläufen bauen nicht) und `workflow_dispatch`. Concurrency `pages` mit `cancel-in-progress: false` wie in GitHubs Pages-Vorlage (ein wartender Lauf wird durch den neuesten ersetzt). Permissions `contents: read`, `pages: write`, `id-token: write`; Build mit `npm ci` + `npm run build`, Artefakt `dist`. Server-Pushes per Deploy-Key **lösen ihn aus** (ausgenommen sind nur Ereignisse des `GITHUB_TOKEN`). Einmalig: Pages-Source „GitHub Actions", Environment `github-pages` nur für `main`.
- **`watchdog.yml`:** `schedule` `'23 */3 * * *'` mit `timezone: "Europe/Berlin"` (Feld seit 2026-03-19, ohne gilt UTC) und `workflow_dispatch` mit String-Input `max_age_h`; Permissions nur `issues: write`. Holt `https://skodex.github.io/ai-pulse/data/meta.json?ts=…` (umgeht den 10-min-CDN-Cache) und hält je Titel genau **ein** offenes Issue: „Server meldet sich nicht" (`generatedAt` älter als 14 h – Nachtlücke 19:07 → 07:07 = 12 h – oder Datei nicht abrufbar), „Claude-Bewertung aus" (`budget.level == 'aus'`), „Token erneuern" (Hinweis `kind: 'token'`). Ein **neues** Issue erwähnt `@SkodeX` und macht den Lauf rot (eine Mail je Ausfall, keine Serie); Entwarnung → Kommentar und Schließen.
- **Token-Hinweise erzeugt die Pipeline** in `meta.json` → `notices` (`kind: 'token'`): Abo-Token läuft in ≤ 30 Tagen ab (`AIPULSE_TOKEN_CREATED` + 1 Jahr); `authMethod` ≠ `oauth_token` oder `authentication_failed`; `AIPULSE_GITHUB_TOKEN` antwortet mit 401.
- **60-Tage-Regel:** In öffentlichen Repos schaltet GitHub geplante Workflows nach 60 Tagen ohne Repo-Aktivität ab. Die Daten-Pushes des Servers halten das Repo aktiv; fällt der Server so lange aus, hat der Watchdog längst gemeldet. Kein Keepalive nötig.
- **Benachrichtigungen:** Actions-Benachrichtigungen im GitHub-Konto an („Only notify for failed workflows"). Fehler-Mails geplanter Workflows gehen an die Person, die die Cron-Zeile zuletzt geändert hat.
- **Pages-Grenzen** (1 GB Site, 100 GB/Monat weich, Deploy ≤ 10 min, JSON mit `max-age=600`) → [references/workflows.md](references/workflows.md).

## Secrets (Env-Datei auf dem Server)

Secrets stehen **nur** in `/etc/ai-pulse/env` (Eigentümer `root`, Gruppe `aipulse`, Modus 640 – `aipulse` liest, kann aber nichts ändern) und als Werte im Passwortmanager des Nutzers. Nicht in GitHub-Secrets, nicht ins Repo, nicht in Chat, Logs oder Commit-Texte. Format für systemd **und** `.` in bash: `KEY=wert` je Zeile, Kommentare nur auf eigenen Zeilen, keine Anführungszeichen, kein `export`, kein `$`. Vorlage `server/env.example` → [references/server-dateien.md](references/server-dateien.md).

| Variable | ab | Zweck | fehlt/leer → |
|---|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Phase 3, Pflicht | Abo-Login für `claude -p` | Notfall-Backend, sonst Regel-Scores; Hinweis `token` |
| `AIPULSE_TOKEN_CREATED` | Phase 3, Pflicht | `JJJJ-MM-TT` der Token-Erstellung, Warnung 30 Tage vor Ablauf | keine Ablaufwarnung, Hinweis `system` |
| `AIPULSE_GITHUB_TOKEN` | Phase 3, Pflicht | fine-grained PAT **ohne** Repo-Rechte (enthält immer Lesezugriff auf öffentliche Repos), Ablauf 1 Jahr | REST nur 60/h statt 5.000/h → GitHub-REST-Quellen gedrosselt |
| `AIPULSE_FALLBACK_API_KEY` | optional | Notfall-Backend (Haiku 5.5, ≤ 3 € ≈ 3,36 USD/Monat), nur an den SDK-Konstruktor, nur in vollen Läufen | bei Abo-Limit direkt Regel-Scores |
| `FEEDBACK_READ_TOKEN` | Phase 6 | `GET /v1/feedback` am Worker | keine Feedback-Gewichtung |
| `NVD_API_KEY` | optional | NVD mit 3 s statt 6,5 s Pause | NVD seriell mit 6,5-s-Pause |
| `DIP_API_KEY`, `API_DATA_GOV_KEY` | optional (Phase 7) | DIP Bundestag; Congress.gov, regulations.gov | DIP aus (401 → Health „Key abgelaufen"); Federal Register, MultiState |
| `ARTIFICIAL_ANALYSIS_API_KEY`, `COURTLISTENER_TOKEN`, `OPENSTATES_API_KEY` | optional | AA-API direkt; CourtListener `/dockets/`; Open States | AA über OpenRouter; CourtListener anonym; MultiState |

- **Niemals `ANTHROPIC_API_KEY` oder `ANTHROPIC_AUTH_TOKEN`:** nicht in Env-Datei, Unit, Shell-Profil, `/etc/environment` oder `~/.claude/settings.json`, und kein `apiKeyHelper`. Im `-p`-Modus würde ein Key still über die API abrechnen.
  - Doppelt abgesichert durch `UnsetEnvironment=` in der Unit und `unset` in `run.sh`.
  - Prüfen: `sudo grep -rl 'ANTHROPIC_[A-Z_]*\(=\|"[[:space:]]*:\)\|apiKeyHelper' /etc/ai-pulse /etc/environment /etc/claude-code /etc/systemd/system/ai-pulse.* /home/aipulse/.profile /home/aipulse/.bashrc /home/aipulse/.claude/settings.json 2>/dev/null` muss leer sein (trifft nur Zuweisungen, nicht `UnsetEnvironment=` oder den Warnkommentar; `-l` zeigt nur Dateinamen, kein Key im Terminal).
- **Fehlende Werte:** Optionale Keys kommen als leerer String oder gar nicht an. Im Code `process.env.X?.trim()` prüfen, die Quelle ohne Health-Fehler überspringen (Skill `gesetze-und-fristen`). Optionale Keys erst eintragen, wenn die Quelle gebaut ist.
- **GitHub-Kontingent mit `AIPULSE_GITHUB_TOKEN`:** 5.000 REST-Anfragen pro Stunde, geteilt mit dem eigenen `gh` des Nutzers; Search 30 pro Minute. Atom, `.diff`/`.patch` und raw.githubusercontent.com zählen nicht mit. `x-ratelimit-remaining` je Lauf loggen, unter 100 die GitHub-REST-Quellen für diesen Lauf aussetzen.
- **Zweite Kostensicherung:** Monatslimit 5 USD in der Anthropic-Konsole für den Notfall-Key. Zusatzkredite (Usage credits) im Claude-Konto aus lassen (Skill `claude-headless`).

## Smoke-Test auf dem Server

Nach der Einrichtung, vor dem ersten Timer-Lauf: `npm run smoke` als `aipulse` mit geladener Env-Datei, drei Durchläufe zu verschiedenen Zeiten außerhalb der Lauftermine; Bericht in `/opt/ai-pulse/.cache/smoke/<JJJJ-MM-TT-HHMM>/`. Befehle und Zeitpunkte → [references/smoke-test.md](references/smoke-test.md). Was der Test misst, die Urteile und die Abnahme (≥ 90 % der `core`-Quellen in 2 von 3 Durchläufen `ok`, sonst greifender Fallback) stehen **nur** in Skill `quellen` § 11.

## Ausfälle und Gegenmaßnahmen

Vollständige Tabelle (Symptom, Verhalten, Was tun) → [references/ausfaelle.md](references/ausfaelle.md). Kurz:

- **Exit 10** (Pull): Netz, Deploy-Key (`sudo -u aipulse -H ssh -T git@github-ai-pulse`) oder ein lokaler Commit, der nach einem Rebase-Konflikt weiter kollidiert (`git fetch && git reset --hard origin/main` als `aipulse`, verwirft nur diesen einen Lauf).
- **Exit 30** (Push): meist von selbst erledigt, der Commit geht mit dem nächsten Lauf raus.
- **Warnung `authMethod`/Hinweis `token`:** `run.sh --auth-check`, Token erneuern, fremde `ANTHROPIC_*` suchen.
- **`budget.level: 'aus'`:** Abo-Limit und kein Notfall-Budget – abwarten (Reset-Zeit in `meta.json`).
- **Hänger:** Deadline 30 min mit Briefing-Reserve, harte Grenze 45 min. **Platte voll:** Journal, npm-Cache, alte `.cache/smoke/` und `.cache/dry/<runId>/` aufräumen. **Build kaputt:** zuerst Actions → Deploy.

## Wartung

Befehle und Abläufe → [references/server-setup.md](references/server-setup.md).

- **Claude-Code-Update** nur bewusst: Timer stoppen, Changelog (`-p`, `--safe-mode`, `--bare`-Standard, JSON-Form) lesen, Managed Settings beiseitelegen (`DISABLE_UPDATES` sperrt auch das `claude install` des Installers), installieren, zurücklegen, `claude doctor`, `--auth-check`, `npm test`, `run.sh --limit 5`, Version in `server/setup.md`, Timer starten. Rückweg gleich mit alter Version.
- **Token-Erneuerung** jährlich (≈ 11 Monate nach `AIPULSE_TOKEN_CREATED`): `claude setup-token` auf dem PC, `sudoedit /etc/ai-pulse/env` (Token und Datum), `run.sh --auth-check`; im selben Termin `AIPULSE_GITHUB_TOKEN` neu (1 Jahr).
- **OS-Updates:** `unattended-upgrades` mit Neustart um 03:30 (außerhalb der Läufe); monatlich `apt upgrade` (enthält Node-Minor-Updates), danach `npm test`; geänderte Units erneut kopieren + `daemon-reload`.
- **Backups:** täglich nur `~aipulse/.local/share/ai-pulse/` (AGB-Snapshots, nicht wiederbeschaffbar); Env-Werte im Passwortmanager; Deploy-Key neu erzeugen statt sichern; Units, `run.sh`, `state/`, `public/data/` liegen in Git.
- **Docker-Variante (NAS ohne systemd-Zugang):** `node:24-bookworm-slim`, Claude Code und Managed Settings im Image, gleiche Termine über den Planer des Hosts.

## Lokal oder Server

- **Lokal (PC)** nur `npm run collect` (immer Trockenlauf mit Schatten-State `.cache/dry/state/`, `-- --fresh` beginnt leer), `npm test`, `npm run smoke` und `npm run pipeline -- --limit <n>` (erst 5, zur Phase-2-Abnahme 80) → alles nach `.cache/`, **nie** nach `public/data/` oder `state/`, nie ein Commit (Skill `sparsam-testen`).
  - Lokale Echtläufe verbrauchen dasselbe Abo-Kontingent.
  - **Teilläufe nutzen nie das API-Backend** – lokal wie auf dem Server. `AIPULSE_SIMULATE_LIMIT=1` lässt die Auswahl auf `api` springen; die Antwort kommt dann aus `pipeline/test/fixtures/llm/api-<stufe>.json`, das Kostenbuch nur nach `.cache/`. Ein echter Haiku-Aufruf (Cent-Betrag) nur zusätzlich mit `AIPULSE_API_LIVE_TEST=1`; nur dafür `AIPULSE_FALLBACK_API_KEY` in der eigenen Shell setzen (der Nutzer tippt den Key selbst), nie dauerhaft und nie in eine Datei im Repo.
- **Volle Läufe** nur auf dem Server per Timer oder `systemctl start`.
- **Code-Pushes vom PC** wirken ab dem nächsten Lauf (Pull am Anfang). Vorher lokal `npm run typecheck && npm test`, denn `deploy.yml` prüft nur den Build der Seite.
- **Muss `state/` oder `public/data/` von Hand repariert werden:** außerhalb der Läufe (07, 13 und 19 Uhr, jeweils :07 bis etwa :40), vorher `git pull --rebase`, dann sofort pushen. Der Server rebased beim nächsten Lauf.
- **`.gitattributes`:** `* text=auto eol=lf`. Ein Windows-Checkout erzeugt sonst CRLF-Diffs im JSON, und `run.sh` mit CRLF scheitert mit `/usr/bin/env: 'bash\r': No such file or directory`.
- **Ausführbit:** `server/run.sh` unter Windows mit `git add --chmod=+x server/run.sh` committen. Sonst meldet systemd `status=203/EXEC`.

## Fallen

- **Ein API-Key irgendwo in der Umgebung** (Shell-Profil, Unit, `.env`, `apiKeyHelper`) rechnet im `-p`-Modus still über die API ab. Darum der Grep-Check und `claude auth status` vor jedem Lauf.
- **`DISABLE_UPDATES` nur in der Env-Datei** erreicht den `claude`-Prozess nicht, weil die Pipeline dessen Umgebung neu baut – darum Managed Settings. Sie sperren auch den Installer: ohne Beiseitelegen scheitert jedes Update.
- **`ProtectHome=yes`** (statt `read-only` + `ReadWritePaths`) macht `/home/aipulse` unsichtbar: kein `claude`, kein `~/.claude`, keine SSH-Konfiguration, der Lauf scheitert spätestens am Pull (Exit 10) oder die Unit startet gar nicht.
- **`OnCalendar` ohne Zeitzone** nimmt die Systemzeitzone; ein Server in UTC liefe um 08:07/09:07 Berliner Zeit. Kontrolle mit `systemd-analyze calendar`.
- **Nachhollauf direkt nach dem Booten** vor dem Netz → Exit 10. Darum `After=network-online.target`, und einer der `*-wait-online.service` muss aktiv sein (`systemctl is-enabled systemd-networkd-wait-online NetworkManager-wait-online`).
- **Rechner ohne gepufferte Echtzeituhr** (z. B. Raspberry Pi ohne RTC-Batterie): Nur mit `sudo systemctl enable systemd-time-wait-sync.service` wartet `time-sync.target` wirklich auf NTP (Manpage `systemd.timer`). Sonst startet der Nachhollauf womöglich mit falscher Uhr (TLS-Fehler, falscher Lauf-Typ).
- **Kommentar hinter einem Wert in der Env-Datei:** systemd nimmt `# …` mit in den Wert, bash nicht. Kommentare nur auf eigene Zeilen.
- **Git als root im Checkout** → „detected dubious ownership". **Installer mit `sudo`** installiert nach `/root/.local/bin` und verweigert das ohnehin. Immer als `aipulse`.
- **Workflows:** `gh issue list --search` hinkt nach (doppelte Issues), ein `number`-Input mit `|| 14` verschluckt den Testwert 0, ein kaputter Build sieht aus wie ein schweigender Server, `cancel-in-progress: true` bräche einen laufenden Pages-Deploy ab. Lösungen → [references/workflows.md](references/workflows.md).
- **Rohes Feedback, Fehlerlisten mit Tokens und AGB-Volltexte** gehören nie nach `state/`. Alles Committete ist öffentlich.
- **Lokale Messungen** (curl oder Node am PC) gelten für die PC-IP, nicht unbedingt für den Server (anderer Anschluss, CGNAT); curl und Node-`fetch` unterscheiden sich zudem (Skill `quellen`, Fallen). Maßgeblich ist der Smoke-Test vom Server.

## Nach dem Bauen

- Diesen Skill auf den echten Stand bringen: tatsächliche Unit-, Skript- und Workflow-Dateien und Abweichungen vom Bauplan, installierte Claude-Code-Version, gemessene Laufdauer (Deadline, Briefing-Reserve und Timeout ggf. anpassen), Smoke-Ergebnisse (Datum, Quote der drei Durchläufe, ggf. UA-Vergleich), neue Fallen mit echtem Symptom.
- Steckbrief: Phasenstand, Hardware/OS des Servers (offener Punkt).
- Nach dem ersten Tag prüfen: `list-timers` zeigt die Termine; drei `data:`-Commits und drei grüne Deploys; die Pages-Seite ist aktuell; die Journal-Zusammenfassungen sind plausibel.
- Watchdog testen: Dispatch mit `max_age_h=0` → Issue mit Erwähnung, roter Lauf, Mail kommt an; Dispatch ohne Input → Issue wird geschlossen.
- Neustart-Test: Server über einen Termin hinaus aus, nach dem Booten holt der Timer einen Lauf nach, und das Fenster in `runs.json` passt.
