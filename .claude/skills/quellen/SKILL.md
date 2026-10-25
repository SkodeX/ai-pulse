---
name: quellen
description: AI-Pulse-Quellen – Register, Abruf (UA, ETag, Challenge, Fallbacks), Parser, ParsedEntry → Vorfilter → RawItem, Health, Trockenlauf-Bericht, Smoke-Test. Laden, bevor du Quellen anbindest, Abruf-, Parser- oder Filtercode schreibst oder Ausfälle untersuchst.
---

# Quellen

Grundsatz: Jede Quelle steht genau einmal im Register, wird über eine gemeinsame Abruf-Schicht geholt und deterministisch geparst: **Parser → `ParsedEntry` → Vorfilter → `RawItem`** → Clustering (`bewertung`). Eine kaputte oder geblockte Quelle bricht nie den Lauf ab und überschreibt nie gespeicherte Stände – sie wird `degraded`/`blockiert`, die Fallback-Kette springt ein. Alles hier ist **geplant** (Stand 2026-10-24, noch kein Code). Befunde aus `docs/recherche/2026-10-24/katalog/`, gemessen mit curl von einer deutschen Privat-IP; der Job ruft aber mit Node-`fetch` ab, und Cloudflare behandelt beide verschieden (Fallen) → maßgeblich ist `npm run smoke` auf dem Server.

**Zuständigkeit:** Register, Abruf, Health, Parser, Vorfilter, `ParsedEntry`/`RawItem`, Trockenlauf-Bericht, Smoke-Test, allgemeine Quellen (Presse, Labs, Startups, Forschung/Open Source). Eigene Listen über dieselbe Abruf-Schicht (ab Phase 4): `sicherheitsluecken`, `gesetze-und-fristen` (`LawHint`), `vertragsaenderungen`, `modelle-und-ranglisten`. Clustering, Vor-Scores, `candidates.json`, Schreiben von `seen.json` → `bewertung`; Server, Timer, Push → `job-betrieb`.

**Phase 1** baut nur die Parser `feed` (Adapter `techmeme`), `json` (Adapter `hn`, `hfPapers`, `yc`), `sitemap`, `htmldiff`, `github` und die Kernquellen; `parquet`, `terms`, OpenRouter, GHSA/OSV, Federal Register kommen in Phase 4.

Referenzen: [kernquellen.md](references/kernquellen.md) (Startliste) · [parser.md](references/parser.md) (Eigenheiten je Quelle, Proben, `AI_RE`-Tests, Fallen je Quelle, Fixtures) · [smoke-test.md](references/smoke-test.md) (**einzige** Smoke-Spezifikation) · [neue-quelle.md](references/neue-quelle.md) · [nicht-nutzen.md](references/nicht-nutzen.md).

## 1. Register `pipeline/config/sources.ts`

```ts
import type { Category } from '../../shared/categories.ts'   // aus CATEGORY_KEYS (as const)

export type SourceKind = 'feed' | 'json' | 'sitemap' | 'htmldiff' | 'github'   // Phase 4: + 'parquet' | 'terms'
export type Cadence = '3x' | 'daily07' | 'weekly'
export type SourceRole = 'official' | 'press' | 'community' | 'aggregator'
export interface UrlContext { now: Date; lastSuccess?: string }   // lastSuccess aus Health (ISO)

export interface Source {
  id: string                    // stabil, kebab-case; steckt in seen-Keys, Health, Story.sources[].id
  name: string                  // Anzeigename (Story.sources[].name)
  kind: SourceKind
  role: SourceRole              // official = Lab/Hersteller (auch eigene Repos, Spiegel) · press = Redaktion
                                // · community = Personen/Newsletter · aggregator = verlinkt Fremdes (Techmeme, HN)
  outlet?: string               // Haus/Redaktion; gleiche outlet = eine Stimme im Mehrfachquellen-Signal (fehlt → id)
  url: string                   // finale URL nach permanentem Redirect (außer Geo-Pfade, § 3); Platzhalter erlaubt
  buildUrl?: (ctx: UrlContext) => string   // nur wenn Platzhalter nicht reichen; url bleibt Anzeige-/Health-URL
  github?: { repo: `${string}/${string}`; perPage: number }   // nur kind 'github'
  categoryHint: Category[]      // [0] = Standard, wenn ohne Claude bewertet (ratedBy 'regel')
  categoryMap?: Record<string, Category>   // ParsedEntry.categories → Kategorie ('Security' → 'sicherheit')
  priority: 'core' | 'nice'     // core = Phase 1
  cadence: Cadence
  startStatus?: 'blockiert'     // Startwert, solange Health keinen Eintrag hat (§ 5)
  aiOnly: boolean               // true = reine KI-Quelle (Whitelist), kein Keyword-Filter
  filter?: {
    include?: RegExp            // ersetzt AI_RE (z. B. Meta Newsroom)
    exclude?: RegExp
    minPoints?: number          // HN 100, Show HN 50
    minUpvotes?: number         // HF Daily Papers 30 (Steckbrief-Standard)
    pathRe?: RegExp             // sitemap: nur passende <loc>
    tagRe?: RegExp              // github: Versionslinie (n8n@2.x)
    maxNew?: number             // Flutbremse je Lauf, Standard 25
  }
  titleStrip?: RegExp           // Quellen-Suffix im Titel (` | heise online`), entfernt der Parser; Muster nach dem ersten Abruf
  paywall: boolean | RegExp     // true = immer; RegExp = Marker im Titel (entfernt der Vorfilter)
  fallbacks: string[]           // existierende Register-IDs in Reihenfolge; [] = bei Ausfall auslassen
  fallbackOnly?: boolean        // nur abrufen, wenn eine Primärquelle ausfällt
  lang: 'de' | 'en'
  adapter?: 'techmeme' | 'hn' | 'hfPapers' | 'yc'   // später 'tldr' (nice)
  html?: { mode: 'sections' | 'links'; container?: string; dateRe?: RegExp; linkRe?: RegExp }
  headers?: Record<string, string>         // z. B. { 'Accept-Language': 'en' }
  maxBytes?: number             // Standard 3 MB
  staleDays?: number            // Frische-Warnung: Standard 14, Wochenquellen 30, langsame Labs 60
  notes?: string                // Katalogbefund mit Prüfdatum
}
```

Fach-Skills erweitern `Source` um optionale Blöcke: `terms` (`vertragsaenderungen`), `jurisdiction`, `jurisdictionFixed`, `region`, `lawMap` (`gesetze-und-fristen`).

- **Eine Quelle = ein Eintrag = ein Abruf.** Mehrere Kategorien über `categoryHint`/`categoryMap`, nie doppelt anlegen: OpenAI-RSS einmal (Item-Kategorien Company, Research, Product, Safety, Security …), heise Security einmal mit finaler URL `https://www.heise.de/security/feed.xml` (Eintrag pflegt `sicherheitsluecken`, `outlet: 'heise'` wie `heise-ki`).
- `id` nie umbenennen – sonst gilt alles als neu und Health beginnt von vorn. **GitHub-IDs:** `gh-<name>` (Repo-Name klein, `gh-claude-code`); kollidiert sie mit einer vorhandenen ID → `gh-<owner>-<name>`. Der Register-Test prüft eindeutige IDs.
- **URL-Platzhalter** (aufgelöst in Lauf und Smoke-Test): `{since36hUnix}` = Unix-Sekunden des früheren Werts von `jetzt − 36 h` und `lastSuccess − 24 h`, nie vor `jetzt − 72 h` (holt nach Ausfällen nach); `{yesterdayUtc}` = Vortag UTC als `JJJJ-MM-TT`. `buildUrl(ctx)` nur, wo das nicht reicht (später TLDR-Ausgabeseite).
- **`fallbacks`** nennen nur existierende Register-IDs; eine unbekannte ID ist eine Warnung im Register-Test (`pipeline/test/`), kein Fehler. IDs der Fach-Skills erst eintragen, wenn deren Eintrag existiert (Matrix § 8).
- Takt: `3x` = jeder Lauf · `daily07` = fällig, wenn `lastSuccess` (Datum Europe/Berlin) nicht heute ist → normal im 07:07-Lauf, holt ausgefallene Läufe nach · `weekly` = fällig, wenn `lastSuccess` vor dem letzten Sonntag 00:00 (Europe/Berlin) liegt → normal im Sonntag-07:07-Lauf. Unabhängig vom Lauf-Typ (Sonntag 19:07 ist bis Phase 5 ein normaler `evening`-Lauf).

## 2. Schnittstellen in `pipeline/types.ts` (`ParsedEntry`, `RawItem`: Eigentümer dieser Skill)

```ts
import type { Category } from '../shared/categories.ts'
// in derselben Datei: LawHint (gesetze-und-fristen), Cluster (bewertung) – Importe von LawHint immer von hier

export interface Signals { hnPoints?: number; hnComments?: number; upvotes?: number
  techmemeUrl?: string; releaseNotes?: string }   // releaseNotes: Release-Body gekürzt (2–3 KB)

export interface ParsedEntry {     // Ausgabe jedes Parsers = Eingabe des Vorfilters
  sourceId: string
  guid?: string                    // Feed-GUID/Atom-id, HN objectID, arXiv-ID, Release-Tag
  url: string                      // Original-URL (Techmeme: erster Nicht-Techmeme-Link; HN ohne url: item-Link)
  title: string                    // Entities dekodiert, Tags weg, titleStrip angewandt; Paywall-Marker bleibt bis § 7
  description: string              // Klartext ≤ 1 000 Zeichen, '' wenn keine – Basis für Keyword-Filter und Teaser
  categories: string[]             // Feed-<category>, YC-Tags; [] wenn keine
  author?: string
  publishedAt?: string             // ISO; fehlt bei datumslosen Feeds und vordatierten Items (> jetzt + 24 h)
  signals?: Signals
}

export interface RawItem {         // Ausgabe des Vorfilters = Eingabe von pipeline/cluster/ (bewertung)
  sourceId: string
  key: string                      // Dedupe-/seen-Schlüssel (§ 7)
  url: string                      // Original-URL aus dem ParsedEntry
  canonicalUrl: string             // canonicalUrl(url) aus pipeline/lib/url.ts
  title: string
  teaser: string                   // Klartext ≤ 300 Zeichen aus description
  publishedAt?: string
  firstSeen: string                // Laufbeginn (ISO)
  lang: 'de' | 'en'
  paywall: boolean
  categoryHint: Category[]         // categoryMap-Treffer zuerst, dann Source.categoryHint
  signals?: Signals
  clusterKey?: string              // vom Fach-Skill vorgegeben (sec:…, terms:…, Preis-/Deprecation-Schlüssel, fristenquelle-…,
                                   // Detektor-Slugs); Claudes Schlüssel wird dann ignoriert (bewertung)
  lawHint?: LawHint                // Status aus strukturierter Rechtsquelle (gesetze-und-fristen)
  seenStoryId?: string             // seen-Treffer mit storyId → an die bestehende Story hängen (bewertung)
}
```

## 3. Abruf-Schicht (`pipeline/collect/`)

- **UA** als eine Konstante: `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)` (Steckbrief). Nie Browser-UA, nie Challenges umgehen (Fallen).
- Client ist das eingebaute Node-`fetch` – derselbe in Lauf und Smoke-Test. `fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' })`; finale URL (`res.url`) in Health loggen, weicht sie 3 Läufe in Folge ab → Register-URL nachziehen. Ausnahme Geo-/Locale-Weiterleitungen (gemini.google/release-notes/ → 301 auf /us/release-notes/): neutrale URL behalten, in `notes` als erwartet vermerken.
- **1 Retry** nach 2 s ± 1 s nur bei Timeout, Netzfehler, 500/502/504. 429/503: `Retry-After` ≤ 30 s → ein Retry, sonst Fehler. Nie Retry bei 403 oder Challenge.
- **Conditional GET:** gespeichertes `etag` → `If-None-Match`, `lastModified` → `If-Modified-Since`; 304 = ok, nichts parsen. Ohne Validatoren SHA-256 des Bodys mit `contentHash` vergleichen, gleich = nicht parsen (welche Quelle was liefert: `references/parser.md`).
- `state/http-cache.json`, Schlüssel = Quellen-`id` (Zweitabrufe `id:teil`, robots `robots:<host>`):
  `{ "techmeme": { "etag": "\"4fbe-65e93a8980ad4\"", "lastModified": "Sat, 24 Oct 2026 10:35:42 GMT", "contentHash": "sha256:…", "checkedAt": "2026-10-24T11:07:03Z" } }`
- **Pro Host seriell:** `p-limit` global 8, je Host 1, zwischen zwei Abrufen desselben Hosts 300–1200 ms Zufallspause. Hosts mit aktiver Challenge-Regel (openai.com, help.openai.com, x.ai) höchstens **1 Request pro Lauf** – der Host-Planer gilt modulübergreifend (`pipeline/terms/`, `pipeline/law/`). Viele Abrufe erlaubt (seriell): github.com, api.github.com, raw.githubusercontent.com, huggingface.co, hn.algolia.com.
- `Accept` für Feeds `application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5`; HTML-Seiten `Accept-Language: en` (Abweichung per `headers`).
- **Größenlimit:** Body als Stream lesen, bei `maxBytes` abbrechen → Fehler `too-large`.
- **robots.txt** nur für `htmldiff` und nachgeladene Seiten: RFC 9309 – 4xx = alles erlaubt, 5xx/nicht erreichbar = alles verboten (Quelle diesen Lauf überspringen), Cache ≤ 24 h, höchstens 5 Redirects; Gruppe `AIPulseBot` anwenden, falls vorhanden, sonst `*` (nicht kombinieren).

## 4. Challenge-Erkennung

`blocked`, sobald eines zutrifft (in dieser Reihenfolge prüfen):
1. Header `cf-mitigated` (Wert `challenge`) oder `x-vercel-mitigated: challenge`.
2. Status 403, 429 oder 503 (nach der Retry-Regel); 401 mit `captcha-delivery` im Body (DataDome). Ausnahme: api.github.com mit 403/429 und `x-ratelimit-remaining: 0` = Fehler `rate-limit`, kein Block.
3. Body < 15 KB (15 360 Bytes) mit `/Just a moment|cf-chl|Attention Required|Vercel Security Checkpoint|captcha-delivery/i`.

- `challenge-platform` im HTML allein ist **kein** Block – Cloudflare bettet das Skript in normale 200-Seiten ein (openai.com/policies, help.openai.com, perplexity.ai).
- Header und Status zuerst, Text nur zusätzlich (Proben in `references/parser.md`).
- Übrige Fehlerklassen: `timeout`, `network`, `http-<code>` (404/410 = URL prüfen), `format` (Feed-Quelle liefert HTML), `empty`, `too-large`, `robots`, `rate-limit`.

## 5. Health, Circuit-Breaker, Fallback

**Nie überschreiben:** Bei Fehler oder Block bleiben `http-cache.json`, `source-state.json` und `seen.json` für diese Quelle unverändert. Plausibilität vor dem Speichern: Feed ganz ohne Items, Sitemap mit < 50 % der gespeicherten `<loc>`, Seite ohne Datumsabschnitt = Fehler `empty`, nie „keine News". Gefilterte JSON-APIs (HN, Show HN, YC `added[]`, HF Daily Papers für Sa/So) dürfen 0 Treffer liefern – dort zählt nur die erwartete Struktur. `http-cache.json` und `source-state.json` erst **am Laufende** schreiben, zusammen mit `seen.json` (`bewertung`) und erst nachdem `public/data/` geschrieben ist (sonst liefert der nächste Lauf 304 für nie verarbeitete Items). Nur der volle Lauf schreibt `state/`; Trockenläufe nutzen den Schatten-State (§ 9), übrige Teilläufe (`--limit`, `--only`, `--stage` ohne Trockenlauf) lesen `state/` nur und schreiben nach `.cache/run/` (Regel in `bewertung`).

```json
{ "updatedAt": "2026-10-24T05:07:40Z",
  "sources": { "chatgpt-release-notes": {
    "status": "blockiert", "consecutiveFailures": 3, "failingSince": "2026-10-22T05:07:05Z",
    "lastError": "blocked: http-403", "lastHttp": 403,
    "lastAttempt": "2026-10-24T05:07:12Z", "lastSuccess": null,
    "bytes": 9912, "items": 0, "newestItem": null, "lastNewItemAt": null, "stale": false,
    "finalUrl": "https://help.openai.com/…", "fallbackActive": ["openai-api-changelog"], "hints": [] } } }
```

- Das ist `state/sources-health.json` (Eigentümer dieser Skill). Erfolg → `ok`, Zähler 0, `failingSince` weg, Fallback aus. Fehler → `consecutiveFailures++` (beim ersten Fehler `failingSince` setzen); ab **3** → `degraded` (`blockiert`, wenn der letzte Fehler ein Block war), Fallback-Kette aktiv.
- **`startStatus: 'blockiert'`** (Startliste: `xai-sitemap`, `chatgpt-release-notes`): ohne Health-Eintrag (erster Lauf, `--fresh`) startet die Quelle als `blockiert`, ihre Fallbacks laufen ab Lauf 1. Sie wird wie jede blockierte Quelle geprobt und zählt im Nenner von Smoke-Test und Trockenlauf-Bericht.
- `blockiert`: Primärquelle nur einmal je Berliner Kalendertag proben (fällig, wenn `lastAttempt` nicht von heute ist → normal der 07:07-Lauf, 1 Request); erster Erfolg setzt auf `ok` zurück.
- Block im aktuellen Lauf → Fallback sofort für diesen Lauf, auch vor dem dritten Fehler (10-Item-Feeds laufen sonst über).
- Kette: `fallbacks[0]`, scheitert er, `fallbacks[1]`. `fallbackOnly`-Quellen laufen nur dann; IDs, die ohnehin laufen (Presse), dokumentieren nur die Abdeckung. Fallback-Items tragen ihre eigene Quelle in `sources[]`; Doppelte nach der Rückkehr fängt das Clustering über `canonicalUrl`.
- `hints`: kurze Codes aus dem letzten Abruf, ohne Statuswirkung – `flood` (mehr als `maxNew`), `final-url` (`res.url` weicht ab), `baseline` (Erstlauf, nur Schnappschuss), `no-validators` (weder ETag noch Last-Modified), `no-token` (GitHub über Atom), `start-ok` (Quelle mit `startStatus` lieferte `ok`). Fach-Skills ergänzen eigene Codes (z. B. OTA-Lücke in `vertragsaenderungen`).
- `stale`, wenn `jetzt − max(newestItem, lastNewItemAt) > staleDays` → nur Warnung, Status bleibt. Frische am neuesten Item messen, nie an `lastBuildDate`.
- **→ `public/data/meta.json`**, Teil `health` (Typ `Meta` im Steckbrief, nur Abweichungen): `issues: [{ "id": "chatgpt-release-notes", "name": "ChatGPT Release Notes", "status": "blockiert", "since": "2026-10-22T05:07:05Z", "coveredBy": "OpenAI API Changelog" }]`, `stale: ["Black Forest Labs"]`, dazu `checkedAt` und `counts`. `since` = `failingSince`; `coveredBy` ist **ein String** (Anzeigenamen der aktiven Fallbacks, mit „, " verbunden; fehlt ohne Fallback); `stale` = Anzeigenamen (das Dashboard kennt das Register nicht). Anzeige → `dashboard-entwickeln`.
- **→ `meta.json` `notices`** (`kind: 'quelle'`, `sourceId`, `text` deutsch, `since`) nur, wo der Nutzer handeln muss: `final-url` 3 Läufe in Folge („Register-URL nachziehen"), `start-ok` („startStatus entfernen"), `degraded`/`blockiert` ohne greifenden Fallback, `flood` 3 Läufe in Folge, `stale` einer `core`-Quelle.

## 6. Parser (`pipeline/collect/`; Eigenheiten je Quelle → `references/parser.md`)

| Art | Werkzeug | erzeugt `ParsedEntry` | Schnappschuss |
|---|---|---|---|
| `feed` | `@extractus/feed-extractor`: `extractFromXml(body, { normalization: true, useISODateFormat: true, descriptionMaxLen: 0, getExtraEntryFields })` | je Item; Adapter `techmeme` | GUID-Menge nur bei datumslosen Feeds |
| `json` | Adapter `hn`, `hfPapers`, `yc` | je Treffer | – |
| `sitemap` | Regex auf `<loc>`/`<lastmod>`, `<sitemapindex>` → Kind-Sitemaps zu `pathRe` | nur neue `<loc>` (Set-Diff) | `locs` |
| `htmldiff` | `linkedom`, nur Server-gerendertes HTML | neuer/geänderter Datumsabschnitt bzw. neuer Link | `sections` bzw. `locs` |
| `github` | REST mit Token, sonst Atom | je Release ohne `draft`, `guid` = Tag | `release` |

- **Typ am Body erkennen**, nie am Content-Type: nach BOM/`<?xml`/Kommentaren `<rss`, `<feed`, `<rdf:RDF` = Feed; `<urlset`/`<sitemapindex` = Sitemap; `<!doctype html`/`<html` = Fehler `format`.
- **Erstlauf = Baseline:** Bei Sitemap, htmldiff, github und datumslosen Feeds speichert der erste erfolgreiche Abruf nur den Schnappschuss und liefert 0 Einträge (Hint `baseline`; sonst 486 Anthropic-Posts auf einmal). Datierte Feeds liefern alles, das Altersfenster (§ 7) filtert.
- **Datumslos:** „neu" = GUID nicht in der gespeicherten Menge (die 30-Tage-TTL von `seen.json` würde alte Items wieder „neu" machen).
- **htmldiff:** `container` und `dateRe` je Quelle erst nach dem ersten Abruf festlegen; `chatgpt-release-notes` ohne Parser-Fixture (Node 403).
- **github** (URLs aus `github.repo`, `references/parser.md`): REST mit `Authorization: Bearer $AIPULSE_GITHUB_TOKEN` (Server-Env; fine-grained PAT **ohne** Rechte, 5 000/h statt anonym 60/h), ETag mitschicken (authentifizierte 304 zählen nicht gegen das Kontingent). **Ohne Token** (lokal, abgelaufen): Atom (10 Einträge, kein REST-Kontingent), Hint `no-token`, kein Fehler. Lokal **nie** `gh auth token` einsetzen (Konto mit Repo-Rechten); wer REST braucht, legt einen eigenen PAT ohne Rechte an. 401 trotz Token → `notices` `kind: 'token'` (Regel in `job-betrieb`). Nie `GITHUB_TOKEN`, nie den Deploy-Key.
- **Schnappschüsse** in `state/source-state.json` (Eigentümer dieser Skill), je Quelle `{ locs?: string[] (sha1, 12 Zeichen), sections?: Record<string, string>, release?: { major, minor, tag }, guids?: string[], baselineAt }`. Datei < 1 MB (nur Hash-Kürzel, nie Bodies).

## 7. Vorfilter (`pipeline/filter/`, ohne Claude): `ParsedEntry` → `RawItem`

Schritte in dieser Reihenfolge; jeder Verwerfungsgrund wird je Quelle gezählt (Code in Klammern, erscheint in `raw-items.json` und `report.md`):

1. **Schlüssel:** `canonicalUrl` = `canonicalUrl(url)` – die einzige Funktion in `pipeline/lib/url.ts`, nie eine eigene Normalisierung (Änderung verschiebt alle `seen`-Keys). `key`: HN `hn:<objectID>` · GitHub `gh:<owner>/<name>@<x.y>` (klein geschrieben) · htmldiff `<id>#<datum>#<hash>` · sonst die ersten 12 Hex von sha1(`canonicalUrl`).
2. **Altersfenster** (`age`): `publishedAt` älter als 72 h (weekly: 8 Tage).
3. **Dedupe im Lauf** (`dupe`): nur je `(sourceId, key)`, der erste gewinnt. Dieselbe URL aus verschiedenen Quellen bleibt erhalten (Mehrfachquellen-Signal; zusammengeführt in `pipeline/cluster/`).
4. **seen** (`seen`): `state/seen.json` (`{ "<key>": { firstSeen, storyId? } }`, TTL 30 Tage, Eigentümer `bewertung`) nur lesen. Treffer ohne `storyId` → verwerfen. Treffer **mit** `storyId` → `seenStoryId` setzen und ohne die Schritte 5–9 weiterreichen; `pipeline/cluster/` hängt die Quelle an die Story oder verwirft sie, ohne Claude (sonst ginge z. B. Techmeme nach dem Lab-Post samt Boost verloren). Was hier oder später rausfällt, prüft der nächste Lauf erneut.
5. **Sponsor/Anzeige** (`sponsor`): Titel `^Anzeige:` (golem), `(Sponsor)` (TLDR), Autor/Kategorie „MIT Technology Review Insights". **Paywall** → behalten, `paywall: true` (Register-Flag oder Marker; Marker aus dem Titel entfernen, heise `/\s*\|\s*heise\+\s*$/`).
6. **Keyword-Regex** (`keyword`) nur bei `aiOnly: false`, auf `title` + `categories` + `description` – nie nur Titel (Simon Willison, Zvi). `filter.include` ersetzt `AI_RE`, `filter.exclude` wirkt zusätzlich.
7. **Releases** (nur `github`): `prerelease`-Flag oder Tag/Name passend zu `/(^|[-.+_\s\d])(rc|alpha|beta|nightly|dev|preview)([-.+_\d\s]|$)/i` (`\d` vorn für vllm `v0.32.0rc3`, PEP 440) → `prerelease`. Dann (`version`): nur Tags der Linie `tagRe`, `(\d+)\.(\d+)` aus dem Tag (Präfixe `v`, `rust-v`, `n8n@`, `langchain-core==`), nur Major-/Minor-Sprung gegenüber dem Schnappschuss, je Repo und Lauf nur die höchste Version.
8. **Quellenregeln** (`rule`): HN `points > 100` (Show HN > 50), HF Daily Papers `upvotes ≥ 30` (Steckbrief-Standard), YC nur Batches des aktuellen/kommenden Jahres.
9. **Flutbremse** (`flood`): mehr als `maxNew` (25) neue Einträge je Quelle und Lauf → nur die neuesten 25, Hint `flood`.
10. **`RawItem` bauen:** `teaser` = `description` gekürzt auf ≤ 300 Zeichen, `categoryHint`, `lang`, `paywall`, `signals`, `firstSeen`; Fach-Module setzen `clusterKey`/`lawHint`.

```ts
// pipeline/config/keywords.ts – Ausgangspunkt docs/recherche/2026-10-24/prototypen/dryrun.mjs (Konstante AI), mehrdeutige Wörter geschärft
export const AI_RE = new RegExp(String.raw`\b(?:ki|ai|genai|llms?|gpt[-\w.]*|chatgpt|codex|claude|anthropic|openai|gemini|gemma|deepmind|copilot|cursor|mistral|deepseek|qwen|llama|grok|xai|kimi|glm|zhipu|minimax|perplexity|hugging ?face|nvidia|mcp|agentic|(?:coding|software)[- ]agents?|chatbots?|prompt[- ]injection|inferen(?:ce|z)|sprachmodell\w*|(?:large )?language models?|foundation models?|machine learning|maschinelles lernen|deep learning|neural networks?|neuronale\w* netz\w*|künstliche[nr]? intelligenz|artificial intelligence|diffusion models?)\b`, 'i')
```

Jede Änderung an `AI_RE` mit Fixture-Test (Präzision auf Register/Axios/Semafor, Trefferquote auf Simon Willison); getestete Treffer/Fehltreffer, `include`-Beispiele und gemessene Mengen (Ø ~29 Kandidaten/Lauf am Wochenende, ~40 werktags, Spitzen ~65 → Abnahme 30–65 Cluster) in `references/parser.md`.

## 8. Fallback-Matrix (Phase-1-IDs; `npm run smoke` auf dem Server bestätigt oder ändert sie)

`chatgpt-release-notes` und `xai-sitemap` (Node 403, Fallen) starten mit `startStatus: 'blockiert'`. `olshansk-*` sind `fallbackOnly`; Presse-IDs laufen ohnehin und dokumentieren nur die Abdeckung.

| Primär | `fallbacks` | ab Phase 4 ergänzen (IDs der Fach-Skills) |
|---|---|---|
| `openai-news` | `olshansk-openai`, `techmeme` | – |
| `chatgpt-release-notes` (blockiert) | `openai-api-changelog` | `openrouter-models` |
| `anthropic-sitemap` | `olshansk-anthropic-news`, `claude-platform-notes` | – |
| `claude-platform-notes` | `gh-claude-code`, `olshansk-claude` | `openrouter-models` |
| `claude-apps-notes` | `olshansk-claude` | – |
| `xai-sitemap` (blockiert) | `techmeme`, `techcrunch-ai` (Olshansk-`feed_xainews` stale) | `openrouter-models`, `genai-eu-versions` (nur AGB) |
| `mistral-news` | `olshansk-mistral` | `hf-authors`, `openrouter-models` |
| `techcrunch-ai` · `techmeme` · `heise-ki` · `decoder-de` | gegenseitig: `techcrunch-ai` → `techmeme`, `techmeme` → `techcrunch-ai`, `heise-ki` → `decoder-de`, `decoder-de` → `heise-ki` | – |
| alle übrigen Kernquellen | `[]` = bei Ausfall auslassen | – |

Ketten für OpenRouter, NVD, EU-DSM und AGB-Seiten pflegen die Fach-Skills mit ihren eigenen IDs.

## 9. Trockenlauf der Sammelstufe

`npm run collect` = `--stage collect` = **immer Trockenlauf** (sammeln, filtern, clustern, ohne Claude, ohne API-Backend). `--only <id>[,<id>…]` grenzt die Quellen ein.

- **Schatten-State `.cache/dry/state/`:** beim ersten Trockenlauf aus `state/` kopiert (falls vorhanden), `--fresh` startet leer. Gelesen und am Laufende geschrieben: `http-cache.json`, `source-state.json`, `sources-health.json`, `seen.json`; `state/` bleibt unberührt. In die Schatten-`seen.json` trägt der Trockenlauf jeden `key` aus `candidates.json` ein, mit `storyId = existingStoryId ?? sha1(clusterKey).slice(0, 12)` (Regel des Eigentümers `bewertung`, `references/clustering.md`) – sonst brächte Lauf 2 das ganze 72-h-Fenster erneut.
- **Abnahme Phase 1:** Lauf 1 `npm run collect -- --fresh` = Basis (Schnappschüsse); Lauf 2 ≥ 6 h später ohne `--fresh` → 30–65 Cluster, ≥ 90 % der Kernquellen mit Urteil `ok`, je Lauf < 3 min.
- **Urteil je Quelle** (gleiche Werte wie im Smoke-Test): `ok` = 200/304 mit erwarteter Struktur (0 neue Einträge erlaubt) · `blockiert` = Challenge (§ 4) · `unerwartet` = Fehler `format` oder `empty` · `fehler` = alles Übrige. Nicht fällige Quellen (Takt, Tagesprobe) behalten das Urteil ihres letzten Abrufs aus dem Schatten-State, Zusatz „nicht fällig".

Ausgabe `.cache/dry/<runId>/` (stdout nur Kopfzeile und Fehlerzeilen):

- `raw-items.json` – vor dem Filter, je Quelle gekürzt: `{ runId, generatedAt, sources: { "<id>": { verdict, parsed, entries: (ParsedEntry & { drop?: string })[] } } }`; höchstens 30 Einträge je Quelle (neueste zuerst), `description` auf 200 Zeichen gekürzt, `drop` = Verwerfungsgrund aus § 7 (fehlt = durchgelassen), `parsed` = Anzahl vor dem Kürzen.
- `candidates.json` – `{ runId, generatedAt, window, clusters: Cluster[] }`, Inhalt → `bewertung`; Eingabe für `--stage triage`.
- `health.json` – Form wie `state/sources-health.json` (§ 5), Stand nach diesem Lauf.
- `report.md`:

```
Quellen ok 47/51 · roh 612 → gefiltert 58 → Cluster 46 · Laufzeit 94 s

| Quelle | Urteil | roh | gefiltert | verworfen | Fehler |
|---|---|---|---|---|---|
| xai-sitemap | blockiert (nicht fällig) | 0 | 0 | – | blocked: http-403 |
| techmeme | ok | 15 | 4 | keyword 9 · seen 2 | – |
```

`y` = alle `core`-Quellen ohne `fallbackOnly`, **inklusive** `startStatus: 'blockiert'`, jedes GitHub-Repo einmal (mit `--only`: die gewählten) – derselbe Nenner wie im Smoke-Test; `x` = davon Urteil `ok`. roh = Anzahl `ParsedEntry`, gefiltert = Anzahl `RawItem`, Cluster = Länge von `clusters`. Reihenfolge: `blockiert`, `fehler`, `unerwartet`, `ok`; `fallbackOnly`-Quellen darunter, nur wenn abgerufen.

## 10. Neue Quelle anbinden

Ablauf in [references/neue-quelle.md](references/neue-quelle.md): Zuständigkeit und `nicht-nutzen.md` prüfen (Reddit, Google News, Product-Hunt-API verboten) → curl **und** Node-`fetch` prüfen (Node 403 → nur mit Fallback und `startStatus`) → Frische < 60 Tage, KI-Quote → Registereintrag mit `role`, `outlet`, `fallbacks` → gekürzte Fixture + Test → `npm run collect -- --only <id>` → Zeile in `kernquellen.md`.

## 11. Smoke-Test `npm run smoke`

Spezifikation (Felder, `shape` je Quellenart, Urteile, Nenner, Bericht, Auswertung) **nur** in [references/smoke-test.md](references/smoke-test.md). Kurz: je Register-Quelle genau ein Abruf über die Abruf-Schicht des Jobs (Node-`fetch`, nie curl), kein Conditional GET, kein Retry, schreibt nie `state/`; lokal ohne Token GitHub über Atom wie der Lauf. Maßgeblich sind drei Läufe auf dem Server in Phase 3 (Aufruf als Benutzer `aipulse` → `job-betrieb`).

## Fallen

- **Node-fetch ≠ curl** (24.10., Windows-PC, Privat-IP, Node 24, Steckbrief-UA, je zweimal; Server noch nicht gemessen): x.ai/sitemap.xml, x.ai/legal/terms-of-service → Node 403 „Attention Required!"; help.openai.com/…/6825453-chatgpt-release-notes, openai.com/policies/usage-policies/ → Node 403 `cf-mitigated: challenge`; curl jeweils 200. openai.com/news/rss.xml und alle übrigen Kernquellen: Node 200. Katalogbefunde (curl) nie ungeprüft übernehmen; nie den Client wechseln (curl-Kindprozess, anderer HTTP-Stack, Browser-Header) – das umgeht eine Sperre.
- **UA-Form:** Die Mozilla-compatible-Form des Steckbriefs kam bei help.openai.com in allen curl-Versuchen durch, die Kurzform `AIPulseBot/1.0 (+…)` einmal nicht; curl-/python-Standard-UA bekamen bei openai.com/policies, help.openai.com, x.ai 403.
- **GitHub-Kontingent gilt je Konto:** Die 5 000/h teilen sich alle Tokens und `gh`-Aufrufe des Nutzers und alle Module (Releases, GHSA, OTA). `x-ratelimit-remaining` in Health loggen; ein Lauf braucht geschätzt einige Dutzend Anfragen.
- Sitemap-Schnappschuss mit leerer/abgeschnittener Antwort überschrieben → nächster Lauf meldet Hunderte „neue" URLs. Plausibilitätsregel aus § 5 nie abschwächen.
- ETag gespeichert, Items aber nicht → 304, Meldungen verloren. Ein Testlauf, der `state/` statt des Schatten-States schreibt → derselbe Effekt im nächsten echten Lauf.
- Trockenlauf ohne Schatten-`seen.json` → Lauf 2 zeigt das ganze 72-h-Fenster erneut und sprengt die 30–65 Cluster.
- Quellenspezifische Fallen (Redirect-URLs der alten Liste, 10-Item-Feeds, Gemini Apps auf Deutsch, Olshansk hinkt, Decoder EN = Übersetzung, arXiv) → `references/parser.md`.

## Nach dem Bauen

Diesen Skill auf den echten Stand bringen (Dateinamen in `pipeline/collect/`, `pipeline/filter/`, `pipeline/smoke.ts`, Registergröße, tatsächliche Formate von `sources-health.json`, `source-state.json`, `raw-items.json` und `hints`-Codes, festgelegte `container`/`dateRe`/`titleStrip`), Smoke-Ergebnisse vom Server je Kernquelle in `references/kernquellen.md` (Spalte „Server") und die Fallback-Matrix eintragen, `startStatus` nach den Messungen nachziehen, UA-Bestätigung festhalten, neue Fallen mit echtem Symptom ergänzen und den Phasenstand im Steckbrief nachtragen.
