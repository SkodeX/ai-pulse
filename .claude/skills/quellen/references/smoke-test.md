# Smoke-Test `npm run smoke` (`pipeline/smoke.ts`, geplant)

**Einzige Spezifikation des Smoke-Tests** – andere Skills verweisen hierher. Zweck: messen, welche Register-Quellen mit dem ehrlichen Bot-UA **vom Heimserver aus** erreichbar sind, mit genau der Abruf-Schicht des Jobs. Den Aufruf auf dem Server (Benutzer `aipulse`, Checkout `/opt/ai-pulse`, Env-Datei laden) beschreibt `job-betrieb`; Ergebnisse trägt dieser Skill ein.

## Aufruf und Optionen

- `npm run smoke` (`"smoke": "node pipeline/smoke.ts"`), Optionen: `--only <id>[,<id>…]` (kommagetrennt), `--ua kurz` (UA-Vergleich, unten), `--out <ordner>` (Standard `.cache/smoke/<JJJJ-MM-TT-HHMM>/`).
- **Auswahl:** jede Quelle aus `pipeline/config/sources.ts`, auch `fallbackOnly` und die Einträge der Fach-Skills (ab Phase 4), auch Quellen mit `startStatus: 'blockiert'`.
- **Genau ein Abruf je Quelle** (die Haupt-URL): Platzhalter aufgelöst wie im Lauf ohne `lastSuccess` (`{since36hUnix}` = jetzt − 36 h), `buildUrl` mit `{ now }`. Keine Zweitabrufe (Kind-Sitemaps, Seitentitel, robots.txt, Ausgabeseiten). GitHub: REST, wenn `AIPULSE_GITHUB_TOKEN` gesetzt ist, **sonst Atom wie im Lauf** (lokal der Normalfall; nie `gh auth token` einsetzen).
- **Abruf** über `pipeline/collect/` (Node-`fetch`, UA-Konstante, `AbortSignal.timeout(20_000)`, Redirects folgen, pro Host seriell, 1-Request-Hosts openai.com, help.openai.com, x.ai je einmal) – nie curl, sonst misst man den falschen Client. Abweichungen vom Lauf: kein `If-None-Match`/`If-Modified-Since`, kein Retry, global ≤ 4 parallel, schreibt **nie** nach `state/` oder `.cache/dry/state/`.

## Felder je Quelle (`report.json`)

| Feld | Inhalt |
|---|---|
| `id`, `kind`, `url`, `finalUrl` | Register-Eintrag, aufgelöste URL, `response.url` |
| `core` | zählt im Nenner (unten) |
| `fallbackOnly`, `startStatus` | aus dem Register |
| `status`, `ms`, `bytes` | Antwort (`bytes` entpackt) |
| `contentType`, `server`, `cfMitigated`, `retryAfter` | Header `content-type`, `server`, `cf-mitigated`, `Retry-After` |
| `cfBm` | `headers.getSetCookie()` enthält `__cf_bm=` |
| `challenge` | Challenge-Text-Regex aus `SKILL.md` § 4 auf die ersten 64 KB (nur Information, auch bei großen Bodys) |
| `rateRemaining` | `x-ratelimit-remaining` (nur api.github.com) |
| `shape`, `expected`, `verdict` | unten |
| `error` | Timeout, DNS, TLS, Netz |

## `shape` und erwartete Form je Quellenart

`shape` aus dem Body (nach BOM, `<?xml`, Kommentaren; erste 2 KB): `feed` = `/<(rss|feed|rdf:RDF)[\s>]/` · `sitemap` = `<urlset` oder `<sitemapindex` · `json` = `JSON.parse` klappt · `parquet` = erste 4 Bytes `PAR1` · `html` = `<!doctype html` oder `<html` · sonst `other`.

| `kind` | erwartete `shape` |
|---|---|
| `feed` | `feed` |
| `json` | `json` (zusätzlich erwartete Struktur: HN `hits[]`, YC `added[]`, HF Daily Papers Array; 0 Treffer sind ok) |
| `sitemap` | `sitemap` |
| `htmldiff` | `html` |
| `github` | `json` (REST mit Token) bzw. `feed` (Atom ohne Token) |
| `parquet` (Phase 4) | `parquet` |
| `terms` (Phase 4) | `html` oder `other` (Markdown-Endpunkte), Einzelheiten `vertragsaenderungen` |

## `verdict`

- `blockiert` = Ergebnis der Challenge-Erkennung der Abruf-Schicht (`SKILL.md` § 4, nicht nachbauen): `cf-mitigated`/`x-vercel-mitigated`, Status 403/429/503, 401 mit `captcha-delivery`, Body < 15 360 Bytes mit Challenge-Text. `challenge-platform` im HTML allein ist **kein** Block.
- `fehler` = Netzfehler, Timeout, übrige 4xx/5xx; api.github.com mit 403/429 und `x-ratelimit-remaining: 0`.
- `unerwartet` = 200, aber `shape` ≠ `expected` (z. B. HTML-Fehlerseite statt Feed) oder JSON ohne erwartete Struktur.
- `ok` = alles andere (auch 0 Einträge).

Dieselben vier Werte nutzt der Trockenlauf-Bericht (`SKILL.md` § 9).

## Nenner und Quote

- **Nenner** = alle `priority: 'core'`-Quellen ohne `fallbackOnly`, **inklusive** `startStatus: 'blockiert'`; jedes GitHub-Repo zählt einmal (REST oder Atom, nie beides). Mit `--only` die gewählten Quellen. Derselbe Nenner wie „Quellen ok x/y" im Trockenlauf.
- Stand der Startliste (`kernquellen.md`): 51 Kernquellen, davon 13 GitHub-Repos und 2 mit `startStatus: 'blockiert'` → für ≥ 90 % sind ≥ 46 `ok` nötig. `fallbackOnly`-Quellen (Olshansk) stehen getrennt („Fallbacks ok 4/4").
- Eine Quelle mit `startStatus`, die `ok` liefert → im Bericht markieren („startStatus prüfen"), nicht automatisch ändern.

## Ausgabe (`.cache/smoke/<stempel>/`, nie committen)

- `report.json` mit allen Feldern.
- `report.md`: erste Zeile `ok 47/51 Kernquellen (92 %) · Fallbacks ok 4/4 · UA standard · GitHub atom`, danach `| Quelle | Urteil | Status | KB | Form | erwartet | cf-mitigated | __cf_bm | Challenge | ms |`, Blockierte zuerst, dann `fehler`, `unerwartet`, `ok`.
- `heads/<id>.txt`: Statuszeile, Header, erste 2 KB des Bodys; von `Set-Cookie` nur die Cookie-**Namen** (Berichte werden geteilt).
- Exit 0 auch bei Blocks (das Skript erstellt nur einen Bericht), Exit 1 nur bei Absturz.

## UA-Vergleich (optional)

`--ua kurz` wiederholt die Messung mit `AIPulseBot/1.0 (+https://github.com/SkodeX/ai-pulse)`. Liefert die Kurzform irgendwo `ok`, wo der Standard-UA `blockiert` ist (oder umgekehrt): Quelle und Unterschied notieren und dem Nutzer vorlegen; die Konstante bleibt in der Abruf-Schicht. **Nie** einen Browser-UA messen, auch nicht zum Vergleich.

## Auswertung

- **Phase 1 (PC):** lokal zur Orientierung; maßgeblich für die Abnahme ist das Abruf-Urteil im Trockenlauf (ROADMAP: ≥ 90 % der Kernquellen `ok`).
- **Phase 3 (Server):** drei Läufe zu verschiedenen Zeiten (etwa 08:30, 14:30, 20:30 Berliner Zeit, nie in den Laufterminen :07 bis etwa :40, mindestens einer werktags), Env-Datei geladen (GitHub per REST). **Erreichbar** = in ≥ 2 von 3 Läufen `ok`. Fertig, wenn ≥ 90 % des Nenners erreichbar sind; sonst braucht jede nicht erreichbare Quelle einen greifenden Fallback.
- **Beobachten** (GAP 1 der Recherche): aktive Challenge-Regel bei `openai.com/policies/*`, `help.openai.com`, `x.ai`; `__cf_bm` setzen openai.com, help.openai.com, platform.claude.com, support.claude.com, x.ai, mistral.ai, openrouter.ai, NVD, Substack, perplexity.ai; ohne Cloudflare: developers.openai.com, cursor.com (Vercel), ai.google.dev, digital-strategy.ec.europa.eu (CloudFront); weitere WAFs: minimax.io (Akamai), gesetze-bayern.de (Myra). Bursts sind nicht deterministisch → Serialisierung pro Host bleibt.
- **Ergebnisse eintragen:** Spalte „Server" in `kernquellen.md`, Fallback-Matrix (`SKILL.md` § 8), `startStatus` im Register nachziehen; UA-Ergebnis und Datum im Steckbrief-Phasenstand. Nur falls der Job später in ein Rechenzentrum (VPS, CI) wandert: dort neu messen.
