---
name: pulse-steckbrief
description: AI-Pulse-Vertrag – Umfang, Architektur (Heimserver + Claude-Code-Abo), Modelle, Ordner, State-Eigentümer, Pipeline-Schnittstellen, Datenvertrag, Befehle, Konventionen, Phasenstand. Laden, bevor du im Projekt planst, suchst oder baust.
---

# AI Pulse – Projektsteckbrief

Lies diesen Steckbrief statt das Repo zu durchsuchen; danach nur die Dateien öffnen, die du ändern musst. Detailwissen in den Fach-Skills (Tabelle in `CLAUDE.md`). Ausgelagert: [references/entscheidungen.md](references/entscheidungen.md) (alle Antworten des Nutzers, gesetzte Standardwerte, offene Punkte, Abo-Pflichten und Grauzone) · [references/projekt-setup.md](references/projekt-setup.md) (package.json, tsconfig, .gitignore für Phase 1). Quellenrecherche: `docs/recherche/2026-10-24/`.

## Umfang (geklärt am 2026-10-24)

- **Was:** öffentliches Dashboard (PWA, GitHub Pages `https://skodex.github.io/ai-pulse/`) mit den wichtigsten KI-News, **nach Wichtigkeit sortiert**, auf Deutsch. Ein Job auf dem **Heimserver** sammelt **3× täglich (07:07, 13:07, 19:07 Europe/Berlin)**; Claude Code (headless, Max-5×-Abo des Nutzers) bewertet und fasst zusammen.
- **11 Kategorien** (Schlüssel → Anzeige): `modelle` Modelle · `neuigkeiten` Neuigkeiten · `sicherheit` Sicherheitslücken · `gesetze` Gesetze & Regulierung · `vertraege` Vertragsänderungen · `ideen` Innovative Ideen · `startups` Aufstrebende Unternehmen · `preise` Preise & API-Änderungen · `opensource` Open Source & Tools · `forschung` Forschung & Benchmarks · `funding` Funding & Übernahmen.
- **Zwei Scores (1–10):** `impact` = Tragweite für die KI-Welt, `personal` = Relevanz für den Nutzer (`pipeline/config/profile.ts`). Sortierung: Gesamt (Mittel) · Tragweite · Für mich.
- **Persona:** Deutsch, beruflich (Produkt/Strategie) und als Entwickler; nutzt Claude/Claude Code, ChatGPT/Codex, Gemini, GitHub Copilot/Cursor; rechtlich EU/DE.
- **Anbieter:** die größten **und** die bestbewerteten – statische Basis (OpenAI, Anthropic, Google, Meta, Microsoft, Amazon, xAI, Mistral, DeepSeek, Alibaba/Qwen) ∪ wöchentliche Top-12 ∪ Aufsteiger → `modelle-und-ranglisten`.
- **Recht** EU + DE + USA mit Status und Fristen → `gesetze-und-fristen`. **Vertragsänderungen** aktiv überwachen → `vertragsaenderungen`.
- **Briefing** nach jedem Lauf (morgens ausführlich, mittags/abends „Seit heute früh"); ab Phase 5 ersetzt sonntags der Wochenrückblick das Abend-Update.
- **Dashboard:** Gelesen/Merken (localStorage), Suche & Filter, Archiv & Trends (Anbieter-/Firmen-Radar), Feedback 👍/👎 (Cloudflare-Worker). Kein Push/Mail, kein Konto, keine Werbung, nicht kommerziell.
- **Repo** öffentlich `SkodeX/ai-pulse`, Branch `main`; lokaler Ordner `E:\Coding\Newsletter_AI`; Git-Identität = GitHub-noreply-Adresse. Alter Tracker `E:\Coding\AI-news-tracker` wird nicht weitergebaut.

## Architektur

```
Heimserver (systemd-Timer, Europe/Berlin)          GitHub
  server/run.sh  (Lock, Env-Hygiene, pull --rebase)   deploy.yml   on push main → Vite-Build → Pages
  node pipeline/run.ts                                watchdog.yml geplant → meta.json älter als 14 h? → Issue/Mail
    sammeln · filtern · clustern · Regel-Scores
    claude -p (Abo) → Haiku 5.5 / Opus 5.5
      Notfall: Anthropic-API, Haiku 5.5, ≤ 3 €/Monat
  git push public/data/ + state/  (Deploy-Key)
```

- **Server:** Ubuntu 22.04+ / Debian 12+ (systemd ≥ 243), ≥ 4 GB RAM, private IP. Benutzer `aipulse`, Checkout `/opt/ai-pulse`, Env-Datei `/etc/ai-pulse/env` (root:aipulse, 640), private Daten `~aipulse/.local/share/ai-pulse/` (AGB-Snapshots, im Backup). Node 24, Claude Code per nativem Installer in **fester Version** → `job-betrieb`.
- **Push** per Deploy-Key (nur dieses Repo); solche Pushes lösen `deploy.yml` aus.
- **Nachholen:** Jeder volle Lauf deckt das Fenster seit dem letzten Erfolg ab (`state/runs.json`, max. 72 h); `Persistent=true` im Timer holt verpasste Läufe nach Ausfällen nach.
- Private IP umgeht viele Bot-Sperren – **außer** `openai.com/policies`, `help.openai.com`, `x.ai` (Node-fetch 403 schon von der Privat-IP → als blockiert eingeplant, Fallbacks in `quellen`).

## Modelle und Kosten

Claude **über Claude Code headless (`claude -p`) mit dem Max-5×-Abo** → 0 € API-Kosten im Normalbetrieb. Das Kontingent (5-h-Fenster + Wochenlimit) teilt sich der Job mit dem Nutzer → ≤ 8 gebündelte Aufrufe je Lauf, eigener System-Prompt, keine Tools. Modell-IDs exakt so:

| Stufe | Modell | Wann | Grenze je Lauf |
|---|---|---|---|
| 1 `triage` | `claude-haiku-5-5` | jeder Lauf (Pakete à 20) | ≤ 80 Meldungen |
| 2 `summarize` | `claude-haiku-5-5` | jeder Lauf, Top-Meldungen | ≤ 25 |
| 3a `brief` | `claude-opus-5-5` | morgens ausführlich; mittags/abends „Seit heute früh" | 1 |
| 3b `weekly` | `claude-opus-5-5` | ab Phase 5: Sonntag 19:07 statt Abend-Update | 1 |
| 3c `terms` | `claude-opus-5-5` | bei wesentlicher AGB-Änderung | ≤ 3, Rest nächster Lauf |

**Notfall** (CLI meldet Abo-Limit/Login-Fehler, nur im **vollen** Lauf): Anthropic-API, `claude-haiku-5-5` für alle Stufen, Deckel **3 € ≈ 3,36 USD/Monat** (Kostenbuch `state/usage/JJJJ-MM.json`, Monat UTC); danach Regel-Scores (`ratedBy: 'regel'`) und Nachholen im nächsten Lauf. `meta.budget.level`: `abo` → `api` → `aus`. **Test des Notfallpfads:** `AIPULSE_SIMULATE_LIMIT=1` lässt die CLI ein Limit melden → Auswahl springt auf `api`; in Test- und Teilläufen antwortet statt des SDK eine aufgezeichnete Fixture (`pipeline/test/fixtures/llm/api-<stufe>.json`), Kostenbuch nur in `.cache/`; einen echten Haiku-Aufruf (Cent-Betrag) nur zusätzlich mit `AIPULSE_API_LIVE_TEST=1`. Modelle, Backends, Grenzen nur in `pipeline/config/models.ts`. Aufruf/Flags/Login → `claude-headless`; Prompts/Rubriken/Kostenbuch → `bewertung`.

## Stack

- **Job:** Node 24 + TypeScript direkt (`node pipeline/run.ts`, Type-Stripping). Claude-Code-CLI als Standard-Backend, `@anthropic-ai/sdk` nur Notfall; `zod` 4 (Schemas → `--json-schema`), `@extractus/feed-extractor`, `@mozilla/readability` + `linkedom`, `normalize-url` + `tldts`, `p-limit`; ab Phase 4 `diff`, `html-to-text`, `hyparquet@1.31.2`. Kein `rss-parser`, keine MinHash-Pakete, robots.txt-Prüfung selbst. Tests: `node --test`. Versionen → `references/projekt-setup.md`.
- **Dashboard:** Vite 8 + React 19 + TypeScript 7 + `vite-plugin-pwa` 2 nach Vorbild `E:\Coding\Space` → `dashboard-entwickeln`.
- **Feedback:** Cloudflare Worker + KV (Free-Plan) → `feedback-worker`. **GitHub:** nur `deploy.yml`, `watchdog.yml` → `job-betrieb`.

## Ordneraufbau (geplant)

| Pfad | Inhalt |
|---|---|
| `pipeline/run.ts` | Einstieg; Flags unten |
| `pipeline/smoke.ts` | Erreichbarkeitstest aller Register-Quellen (Spezifikation: `quellen`) |
| `pipeline/types.ts` | pipeline-interne Typen `ParsedEntry`, `RawItem` (Eigentümer `quellen`), `Cluster` (`bewertung`), `LawHint` (`gesetze-und-fristen`) |
| `pipeline/lib/url.ts` | **einzige** `canonicalUrl()` (normalize-url-Optionen per Fixture eingefroren; Änderung verschiebt alle `seen`-Keys) |
| `pipeline/config/` | `sources.ts` (Register), `profile.ts`, `watchlist.ts`, `models.ts`, `keywords.ts` |
| `pipeline/collect/` | Abruf (UA, Timeout, ETag, Health, Fallback) und Parser `feed`, `json`, `sitemap`, `htmldiff`, `github` (AGB-Parser → `pipeline/terms/`, Arena-Parquet → `pipeline/models/`) |
| `pipeline/filter/` | Sponsor/Paywall-Marker, Keywords, Nightly, Advisory-Gruppierung, `security-match.ts` |
| `pipeline/cluster/` | Titel-Jaccard, Zusammenführen per `clusterKey` |
| `pipeline/score/` | Regel-Scores; `feedback.ts` (Phase 6) |
| `pipeline/llm/` | Stufen, `backends/cli.ts` + `backends/api.ts`, `schemas.ts` (zod), `prompts.ts`, Kostenbuch |
| `pipeline/llm/prompts/` | Prompt-**Bausteine** (Text); `prompts.ts` setzt je Stufe zusammen → `.cache/prompts/<stufe>.txt` (`--system-prompt-file`), derselbe String als `system` im API-Backend |
| `pipeline/models/` | `openrouter.ts`, `hf-authors.ts`, `arena.ts`, `boards.ts`, `provider-radar.ts`, `keys.ts` (`modelSlug()`, `modelEventKey()`) |
| `pipeline/terms/`, `pipeline/law/` | AGB-Monitor; Statusmodell + `build-fristen.ts` (einziger Schreiber von `fristen.json`) |
| `pipeline/output/` | schreibt `public/data/` atomar, gegen zod geprüft (Eigentümer `bewertung`) |
| `pipeline/test/` | `node --test` + gekürzte Fixtures, ohne Netz und Claude |
| `shared/` | `types.ts` (Story, Briefing, Meta, Frist, Watchlist, Latest, ArchiveDay, IndexEntry, BriefingIndexEntry), `categories.ts` (`CATEGORY_KEYS` as const, `CATEGORY_LABELS`), `law.ts` (`LAW_STATUSES`, `LawStatus`, `LAW_STATUS_LABELS` – deutsche Labels nur hier; `pipeline/law/status.ts` ergänzt Ränge und Merge), `config.ts` (öffentliche Konstanten **an einer Stelle**: `REPO_URL`, `PAGES_URL`, `FEEDBACK_API_URL`) |
| `server/` | `setup.md`, `ai-pulse.service`, `ai-pulse.timer`, `run.sh`, `env.example` |
| `public/data/` | öffentliche Ergebnisdaten (committet) |
| `state/` | interner Zustand (committet, öffentlich, nichts Geheimes) – Tabelle unten |
| `src/`, `worker/`, `.github/workflows/` | Dashboard · Feedback-Worker · `deploy.yml`, `watchdog.yml` |

### `pipeline/run.ts` – Flags

- `--stage <collect|triage|summarize|brief|weekly|terms|watchlist|review>`; `collect` = sammeln/filtern/clustern ohne Claude, `review` nur lokal. Noch nicht gebaute Stufen: Exit 2 mit „kommt in Phase N".
- `--only <id>[,<id>…]` (kommagetrennt, auch im Smoke-Test), `--limit <n>`, `--kind <morning|midday|evening|weekly>` (sonst aus der Berliner Uhrzeit; `weekly` vor Phase 5 → Exit 2), `--dry-run`, `--fresh`.
- **Voller Lauf** = ohne `--dry-run`, `--stage`, `--only`, `--limit` (nur Server); `--kind` allein ist erlaubt (manueller Reparaturlauf). Teilläufe schreiben **nur nach `.cache/`** – Trockenläufe nach `.cache/dry/<runId>/`, alle anderen (inkl. Fristen-, Law-Watch- und Briefing-Vorschau) nach `.cache/run/<runId>/` –, nie `state/`/`public/data/`, und nutzen **nie** das API-Backend. `AIPULSE_SIMULATE_LIMIT` in einem vollen Lauf → Abbruch mit Fehler.
- Der Wochenrückblick wird über `weeklyEnabled` in `pipeline/config/models.ts` eingeschaltet (Phase 5).
- **Trockenlauf mit Schatten-State:** `--stage collect` (immer Trockenlauf) und `--dry-run` lesen und schreiben `.cache/dry/state/` (beim ersten Mal aus `state/` kopiert, falls vorhanden; `--fresh` startet leer). So ist Lauf 1 die Basis und Lauf 2 zeigt echte neue Meldungen.
- **Trockenlauf-Ausgabe** `.cache/dry/<runId>/`: `raw-items.json` (vor dem Filter, je Quelle gekürzt), `candidates.json` (`{ runId, generatedAt, window, clusters: Cluster[] }` – Eingabe für `--stage triage`), `health.json` (Form wie `sources-health.json`), `report.md` (Kopfzeile „Quellen ok x/y · roh n → gefiltert m → Cluster k · Laufzeit s", darunter je Quelle: Urteil, roh, gefiltert, Zähler je Verwerfungsgrund, Fehler). stdout zeigt nur die Kopfzeile und Fehler.

### Pipeline-Schnittstellen (Kurzform; Felder in den Fach-Skills)

Parser → `ParsedEntry` (`sourceId`, `guid?`, `url`, `title`, `description` ≤ 1.000 Zeichen, `categories[]`, `author?`, `publishedAt?`, `signals?`) → **Vorfilter** (Marker, Keywords, Schwellen) → `RawItem` (`teaser` ≤ 300, `url` = Original, `canonicalUrl`, `key`, optional `clusterKey`, `lawHint`, `signals`, `seenStoryId`) → **Clustering** → `Cluster` → Regel-Scores → Claude-Stufen → `Story`.
- **Dedupe:** innerhalb eines Laufs nur je `(sourceId, key)` – dieselbe URL aus verschiedenen Quellen bleibt erhalten (Mehrfachquellen-Signal). `seen`-Treffer ohne `storyId` werden verworfen, mit `storyId` als `RawItem.seenStoryId` durchgereicht (hängt an die bestehende Story an).
- Register-`fallbacks` nennen nur existierende Register-IDs; unbekannte IDs = Warnung im Register-Test, kein Fehler.

### State-Dateien (`state/`, committet)

| Datei | Inhalt | Eigentümer |
|---|---|---|
| `seen.json` | `{ "<key>": { firstSeen, storyId? } }` (Keys wie in `quellen`; GitHub `gh:<owner>/<name>@<x.y>` klein geschrieben); am Laufende nur für bewertete Meldungen (Trockenlauf: Schatten-State, jeder Cluster gilt als bewertet) | `bewertung` |
| `source-state.json` | Sitemap-`loc`-Mengen, Abschnitts-Hashes, Release-Stände, GUID-Mengen datumsloser Feeds | `quellen` |
| `http-cache.json` | ETag/Last-Modified/Body-Hash je Quellen-ID | `quellen` |
| `sources-health.json` | Status je Quelle (`consecutiveFailures`, `lastSuccess`, `hints`) | `quellen` |
| `usage/JJJJ-MM.json` | Kostenbuch je Aufruf (USD nur bei API) | `bewertung` / `claude-headless` |
| `runs.json` | `lastSuccessAt`, `lastKind`, `lastRunId` | `job-betrieb` |
| `terms-index.json` | Hash, Datum, Quelle je Dokument (keine Volltexte) | `vertragsaenderungen` |
| `security.json` | Zeitfenster und Gruppenstände je Security-Quelle | `sicherheitsluecken` |
| `law-watch.json` | Verfahrensstände, Datumslisten der Fristenquellen | `gesetze-und-fristen` |
| `leaderboards/` | `openrouter.json`, `hf-authors.json`, `arena.json`, `<board>.json`, `watchlist-history.json` | `modelle-und-ranglisten` |

Dateien < 1 MB. AGB-Volltexte **nie** ins Repo → privat auf dem Server.

## Datenvertrag (`public/data/`, Typen in `shared/types.ts`)

| Datei | Inhalt | Größe |
|---|---|---|
| `latest.json` | `Latest` `{ generatedAt, buildId, run: RunKind, stories: Story[] }` – 72 h, nach `score` | ≤ 150 KB |
| `briefing/latest.json` · `briefing/JJJJ/JJJJ-MM-TT-<kind>.json` · `briefing/index.json` | aktuelles `Briefing` · Archiv in Jahresordnern · `BriefingIndexEntry[]` `{ file, kind, generatedAt, title }` | klein |
| `archive/JJJJ/MM/TT.json` | `ArchiveDay` `{ date, generatedAt, buildId, frozen, stories }` (Berliner Datum, am Folgetag eingefroren) | ≤ 100 KB |
| `index/JJJJ-MM.json` | `IndexEntry[]` `{ id, date, title, category, impact, personal, tags, url, src }` (`src` = Quellen-ID der Primärquelle) | ≤ 300 KB |
| `watchlist.json` · `fristen.json` | Form: `modelle-und-ranglisten` · `gesetze-und-fristen` (`kind` `gesetz \| gericht \| agb \| modell`) | klein |
| `meta.json` | `Meta` (unten), inkl. `firstMonth` für die Archivliste | klein |
| `models.json` | `ModelsFile`: Bestenlisten je Einsatzzweck, neue Modelle, Abschaltungen, Tools (Mo/Mi/Fr) | ≈ 15 KB |
| `toplists.json` | `TopListsFile`: Top 50 GitHub-Repos, Claude Skills, MCP-Server, Hugging Face (wöchentlich) | ≈ 80 KB |

Archiv, Index, Briefing und Meta schreibt `pipeline/output/` (Details: `bewertung/references/ausgabe.md`).

```ts
type Category = 'modelle' | 'neuigkeiten' | 'sicherheit' | 'gesetze' | 'vertraege' | 'ideen'
  | 'startups' | 'preise' | 'opensource' | 'forschung' | 'funding'
type RunKind = 'morning' | 'midday' | 'evening' | 'weekly'

interface Story {
  id: string                 // gekürzter sha1 des clusterKey
  clusterKey: string
  title: string              // deutscher Titel (Claude), sonst Originaltitel
  originalTitle: string
  url: string                // Primärlink: Originalquelle, kanonisiert
  sources: { id: string; name: string; url: string; lang: 'de' | 'en' }[]  // Primärquelle zuerst
  category: Category
  tags: string[]             // Firmen, Modelle, Produkte (über Watchlist-Aliasse normalisiert)
  impact: number; personal: number   // 1–10
  score: number              // (impact + personal) / 2, eine Nachkommastelle
  hype: boolean; paywall: boolean
  summary?: string; whyImportant?: string; forYou?: string   // Stufe 2, Deutsch
  law?: { status: LawStatus; jurisdiction: 'EU' | 'DE' | 'US' | 'US-Staat'; effectiveDate?: string
          statusSource?: 'quelle' | 'meldung'; procedure?: string; region?: string }
  security?: { severity: 'critical' | 'high' | 'medium' | 'low'; cves: string[]; advisories?: string[]
               exploited: boolean; products: string[] }
  terms?: { provider: string; document: string; effectiveDate?: string; changeExcerpt?: string }
  publishedAt?: string       // ISO, nie in der Zukunft (sonst firstSeen)
  firstSeen: string
  ratedBy: string            // Modell-ID oder 'regel'
}

interface Briefing {
  generatedAt: string; kind: RunKind; model: string   // Modell-ID oder 'regel'
  title: string; intro: string; items: { storyId: string; text: string }[]; outlook?: string
}

interface Meta {
  generatedAt: string; buildId: string; run: RunKind; firstMonth: string   // 'JJJJ-MM'
  health: { checkedAt: string; counts: { ok: number; degraded: number; blockiert: number }
            issues: { id: string; name: string; status: string; since: string; coveredBy?: string }[]; stale: string[] }
  budget: { level: 'abo' | 'api' | 'aus'; apiUsdMonth: number; apiUsdCap: number; resetHint?: string }
  notices: { kind: 'quelle' | 'agb' | 'recht' | 'token' | 'system'; sourceId?: string; text: string; since: string }[]
  credits: { name: string; url: string; license?: string }[]
}
```

Feldnamen englisch, Inhalte deutsch. Neue Felder nur optional ergänzen (alte Archivdateien bleiben gültig).

## Befehle

```bash
npm run collect                  # Trockenlauf: sammeln + filtern + clustern, Schatten-State, Ausgabe .cache/dry/<runId>/
npm run smoke                    # jede Register-Quelle einmal abrufen, Bericht .cache/smoke/
npm run pipeline -- --limit 5    # kleiner Lauf mit Claude (Abo-Kontingent), Ausgabe .cache/run/
npm run typecheck                # tsc --noEmit (wächst je Phase)
npm test                         # node --test, ohne Netz/Claude
npm run dev | build | icons      # Dashboard (Phase 3), Dev-Port 5175, Vorschau 4175
npm run worker:dev|check|deploy  # Feedback-Worker (Phase 6), Port 8787
```

Server: `systemctl list-timers ai-pulse.timer`, `journalctl -u ai-pulse -n 50`, `sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check` (muss `oauth_token` melden).

## Konventionen

- Deutsch für Antworten, Kommentare und UI; Bezeichner englisch.
- Type-Stripping: kein `enum`, keine Parameter-Properties, keine Namespaces mit Code; Importe mit `.ts`, Typ-Importe als `import type`.
- Jede Quelle hat eine stabile `id` im Register; Takt `3x` · `daily07` · `weekly`. Kaputte Quellen brechen nie den Lauf ab; leere oder Challenge-Antworten überschreiben nie gespeicherte Stände.
- UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`; **keinen Browser vortäuschen, keine Challenges/CAPTCHAs umgehen**.
- GitHub-API vom Server mit `AIPULSE_GITHUB_TOKEN` (PAT **ohne** Rechte); nie der Deploy-Key, nie `gh auth token`.
- **Env-Hygiene:** Der `claude`-Kindprozess bekommt nie `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` (rechnet sonst still über die API ab); Notfall-Key heißt `AIPULSE_FALLBACK_API_KEY`, nur für den SDK-Konstruktor. Claude bekommt Artikeltexte nur als Daten, **ohne Tools** (`--tools ""`).
- Vor Notfall-Backend-Code Skill `claude-api` laden (API lehnt `temperature`/`top_p`/`top_k` ab), vor CLI-Aufrufen `claude-headless`.
- localStorage-Keys und Cache-Namen mit `aipulse` präfixen (geteilter Origin `skodex.github.io`).
- Keine Google-News-, Reddit- oder Product-Hunt-**API**-Inhalte (öffentlicher Product-Hunt-Atom-Feed ok); Quellen-Credits im Footer. Zusammenfassungen sind eigene Kurztexte mit Link; Fixtures nur gekürzt (Platzhalter statt Artikeltext).
- Frische: Hinweis ab 14 h ohne neuen Stand, Warnbanner ab 24 h.

## Phasenstand

- 2026-10-24: Umfang geklärt, ~370 Quellen live recherchiert (`docs/recherche/2026-10-24/katalog/`), Roadmap und 13 Skills angelegt (je Skill Autor + adversarialer Prüfer, mehrere Konsistenzrunden). Am selben Tag Umstellung auf **Heimserver + Claude Code mit Abo** (Nutzerwunsch: weniger API-Kosten). Noch kein Code, noch kein Repo.

- **2026-10-25 – Phase 1 gebaut** (Abnahme siehe unten): Register 51 Kern + 4 Fallback + 2 Detektoren (`pipeline/config/sources.ts`), Abruf-Schicht, 5 Parser, Vorfilter, Clustering, Trockenlauf mit Schatten-State, Smoke-Test. Lauf 1 (`--fresh`, 09:53 Berlin): 49/51 ok, roh 3241 → 154 → 152 Cluster, 23 s; Smoke 49/51, Fallbacks 4/4. Ist-Stand und neue Fallen: Skill `quellen` § 12. Repo `SkodeX/ai-pulse` öffentlich, MIT.
- **2026-10-25 – Phase 2 gebaut, ohne echten Claude-Lauf**: Profil, Modelle/Grenzen, Vor-Score, CLI-Backend, Notfall-API im Fixture-Modus, Triage/Summarize/Brief, Ausgabe nach `public/data/`. Voller Lauf nur mit `AIPULSE_FULL_RUN=1`. Ohne Claude-Login fällt alles sauber auf Regel-Scores zurück (`--limit 80` geprüft). Offen: Claude Code am PC anmelden (`claude.exe auth login`, Binary der Desktop-App), dann `--limit 5`, voller Umfang, Stichprobe. Ist-Stand: Skills `bewertung`, `claude-headless`.
- **2026-10-25 – Phase 3 Teil 1: Dashboard-App** (Vite 8.3.4, React 19.3.0, vite-plugin-pwa 2.0.0, lucide 1.55.0): Routen `#/heute`, `#/kategorie/<key|alle|neu|fuer-mich|hype>`, `#/modelle`, `#/fristen`, `#/top`, `#/mehr` (`#/briefing`, `#/gemerkt`, `#/einstellungen`); 5 Tabs unten (Heute · Kategorien · Modelle · Fristen · Mehr). Start-JS 80 KB gzip. Lokale Testdaten in `public/data/` sind per `.git/info/exclude` vom Commit ausgenommen (Regel-Daten, nie committen). Offen: Server, `deploy.yml`, `watchdog.yml`, Impressum/Datenschutz, Pille „Neue Meldungen" bei neuer `buildId`.
- **2026-10-25 – Phase 4 (vorgezogen, ohne Claude)**: Modelle & Ranglisten (`pipeline/models/`: OpenRouter-Diff, Arena-Parquet, `models.json` mit 10 Bestenlisten, `watchlist.json` Basis + Top 12, Mo/Mi/Fr, `--stage watchlist`); Fristen (`pipeline/law/`: 21 kuratierte Stichtage, `build-fristen.ts`, `fristen.json` = `{ generatedAt, items, checks }`); Top-50-Listen (`pipeline/toplists/`, `toplists.json`, wöchentlich, `--stage toplists`). Offen: HF-Autoren, Epoch, ARC, SWE-bench, Rechtsquellen, AGB-Monitor, Security, Opus-Empfehlungen, Use-Case-Texte (Haiku).
- Neue Datendateien (Datenvertrag ergänzt, Typen in `shared/types.ts`): `models.json` (`ModelsFile`), `toplists.json` (`TopListsFile`), `fristen.json` (`FristenFile`).

(Nach jeder Phase ergänzen: was gebaut ist, Routen, Dateien, offene Punkte, neue Fallen.)
