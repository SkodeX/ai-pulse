---
name: feedback-worker
description: Cloudflare Worker + KV für 👍/👎 in AI Pulse (Free-Plan) – API, zwei Tokens, CORS, wrangler.jsonc, Präferenzprofil für die Bewertung, Dashboard-Anbindung, Deploy. Laden, bevor du an worker/, den Feedback-Knöpfen oder am Feedback-Abruf arbeitest.
---

# Feedback-Worker (👍/👎)

Phase 6 der Roadmap. **Noch nichts gebaut** – hier stehen Plan und Regeln. Ziele: dauerhaft 0 €, rohe Votes nie öffentlich, Feedback verschiebt nur künftige `personal`-Werte. Den Feedback-Abruf macht der Job auf dem **Heimserver** (systemd-Timer, Skill `job-betrieb`); GitHub hat damit nichts zu tun. Limits Stand 2026-10-24; vor dem Bau die Limits- und Pricing-Seiten (Quellen unten) per WebFetch neu prüfen, wie im Kochbuch-Skill `cloudflare-free-plan`.

```
Dashboard (skodex.github.io) ──PUT /v1/feedback/:storyId + Write-Token──▶ Worker ai-pulse-feedback ──▶ KV FEEDBACK
Heimserver-Job (07:07/13:07/19:07) ──GET /v1/feedback + Read-Token──▶ Worker ──list()──▶ Profil im Speicher ──▶ Stufe 1
                                   └─ Abruf scheitert → Lauf ohne Profil + notices[] kind 'system' in meta.json
```

## Free-Plan-Regeln

- Nur Produkte, die bei Überschreitung **blockieren statt abrechnen**: Workers, KV, D1, Durable Objects (nur SQLite-Backend). **R2 ist hier verboten** (Überschreitung wird berechnet). Kein Workers Paid, kein Logpush, keine bezahlten Add-ons.
- Freigegeben für diesen Worker: nur `vars` und `kv_namespaces`. D1/DO erst nach Prüfung (Vorgehen im Kochbuch-Skill) – für Feedback eines Nutzers unnötig.
- **Keine Cron-Trigger:** höchstens 5 pro **Konto**, das Kochbuch belegt einen. Aufräumen erledigt `expirationTtl`.
- Kein Polling: Das Dashboard ruft den Worker nur bei Klick, App-Start, `visibilitychange` (sichtbar) und `online`.
- Deploy nur über `npm run worker:deploy` (Prüfung + Deploy), nie `wrangler deploy` direkt.

| Grenze (Free) | Wert | bei Überschreitung | Verbrauch bei ≈ 50 Votes/Tag |
|---|---|---|---|
| Worker-Requests | 100.000/Tag **je Konto** (mit Kochbuch geteilt), Reset 00:00 UTC | Error 1027, keine Rechnung | ≈ 150 (PUT + Preflight + 3 Läufe) |
| CPU | 10 ms/Request | Abbruch | SHA-256 + 1 KV-Op |
| KV Writes | 1.000/Tag (verschiedene Keys) | Op schlägt fehl, keine Kosten | ≈ 50 (5 %) |
| KV Write auf denselben Key | 1/s | `KV PUT failed: 429 Too Many Requests` | Client-Debounce |
| KV Deletes · Lists | je 1.000/Tag, getrennt gezählt | Op schlägt fehl | wenige · 3 × Seitenzahl |
| KV Reads | 100.000/Tag | Op schlägt fehl | 0 (nie `get`) |
| KV-Ops je Worker-Aufruf | 1.000 | Fehler | 1 |
| Key · Metadata · Wert | 512 B · 1.024 B · 25 MiB | Fehler | ≈ 70 B · ≈ 30 B · 0 B |
| Variablen + Secrets | 64 je Worker, je 5 KB | Deploy scheitert | 1 + 2 |

Die KV-Tageskontingente gelten ebenfalls fürs ganze Konto. Auch `wrangler kv …`-Befehle und Abfragen im Cloudflare-Dashboard zählen mit (KV-Pricing-FAQ) – zum Nachsehen keine Schleifen über `wrangler kv key list`.

## Aufbau (geplant)

| Datei | Inhalt |
|---|---|
| `worker/wrangler.jsonc` | Konfiguration (Vorlage unten), keine Secrets |
| `worker/src/index.ts` | `export default { fetch: (req, env) => handle(req, env) } satisfies ExportedHandler<Env>` |
| `worker/src/handle.ts` | Router, Validierung, Auth, CORS als pure Funktion `handle(request, env, deps?)`, nur Web-Standard-Typen (in Node testbar). KV über ein eigenes Mini-Interface (`put`/`delete`/`list`) statt `KVNamespace`, wie `Ablage` im Kochbuch |
| `worker/tsconfig.json` | nur `worker/src`, wie Kochbuch `tsconfig.worker.json` (`lib: ["ES2023"]`, ohne DOM, `types: ["./worker-configuration.d.ts"]`); Teil von `npm run typecheck`. `worker/scripts/` und `worker/test/` prüft die Node-tsconfig |
| `worker/worker-configuration.d.ts` | von `npm run worker:types` erzeugt, committet (wie Kochbuch) |
| `worker/src/contract.ts` | **Vertrag** für Worker, Dashboard und Pipeline (unten). Keine Workers-Globals, kein `enum` (Type-Stripping) |
| `worker/scripts/free-plan.ts` | Free-Plan-Prüfung, aus Kochbuch angepasst |
| `worker/test/` | Handler-Tests mit Fake-KV |
| `worker/.dev.vars.example` | Vorlage lokaler Werte (committet); `worker/.dev.vars`, `worker/.dist/`, `.wrangler/` gitignoren |
| `pipeline/score/feedback.ts` | Abruf + Präferenzprofil (`loadFeedbackProfile()` → `{ profile, notice }`), läuft auf dem Server |
| `src/lib/feedback.ts` | Dashboard: lokaler Vote-Speicher, Senden, Wiederholen |

```ts
// shared/config.ts (geplant, einzige Stelle für öffentliche Konstanten laut Steckbrief)
export const FEEDBACK_API_URL = ''   // nach erstem Deploy: https://ai-pulse-feedback.<sub>.workers.dev – leer = Feedback aus

// worker/src/contract.ts (geplant) – importiert die URL nicht (der Worker braucht sie nicht), nur Regeln:
export const STORY_ID_PATTERN = /^[a-z0-9-]{8,64}$/   // bewusst locker; IDs sind sha1(clusterKey).slice(0, 12) (Skill bewertung)
export const FEEDBACK_TTL_DAYS = 180
export type Vote = 1 | -1
export interface FeedbackItem { id: string; v: Vote; ts: number }   // ts: Unix-Sekunden, setzt der Worker
export interface FeedbackPage { items: FeedbackItem[]; cursor: string | null; complete: boolean }
```

Skripte in der Root-`package.json` (`wrangler` als devDependency): `worker:dev` = `wrangler dev -c worker/wrangler.jsonc --port 8787` · `worker:check` = `node worker/scripts/free-plan.ts` · `worker:deploy` = `npm run worker:check && wrangler deploy -c worker/wrangler.jsonc` · `worker:types` = `wrangler types worker/worker-configuration.d.ts -c worker/wrangler.jsonc`.

## Speicher: Workers KV

- **Ein Key pro Story:** `fb:<storyId>`, Wert `''`, Vote in der Metadata `{ v: 1 | -1, ts }`, `expirationTtl: FEEDBACK_TTL_DAYS * 86400` (= 15.552.000 s; Minimum laut Doku 60 s). Erneutes Voten setzt die TTL neu.
- `v: 0` → `FEEDBACK.delete('fb:' + id)` (zählt gegen die Deletes, nicht gegen die Writes).
- Lesen **nur per `list({ prefix: 'fb:', cursor })`**: bis 1.000 Keys je Aufruf inkl. `metadata` → eine List-Op pro 1.000 Votes, kein `get` je Story.
- Nie alle Votes in einem Key: read-modify-write + 1 Write/s/Key + eventual consistency = verlorene Updates.
- Eventual consistency: am selben Standort sofort sichtbar, anderswo (auch in `list`) bis ≈ 60 s später.
- Leerer Wert + Vote in der Metadata ist das Muster, das die List-Keys-Doku selbst empfiehlt (`put(key, "", { metadata })`). Lokal geprüft (workerd über `getPlatformProxy`, wrangler 4.149): `get` liefert `""`, `list` liefert `{ name, expiration, metadata }`. In Produktion beim ersten Deploy gegenprüfen.
- **Jurisdiktion: Entscheidung in Phase 6, Standard keine.** Ohne Flag liegt KV in den zentralen Speichern „with no jurisdictional restriction“ und wird weltweit gecacht. `--jurisdiction eu` beim `kv namespace create` legt nur die dauerhafte Speicherung in die EU (Caches bleiben weltweit) und ist **nur beim Anlegen** setzbar, später nicht änderbar oder nachrüstbar (Doku „Data location“, geprüft 2026-10-24). Eine Plan-Einschränkung nennt die Doku nicht; ob es im Free-Plan klappt, zeigt erst der Befehl. Gespeichert werden nur Story-ID, Vote und Zeitstempel eines einzigen Nutzers – deshalb ohne Gegenwunsch des Nutzers ohne Flag anlegen.

## API-Vertrag (`/v1`)

| Methode + Pfad | Auth | Body / Query | Antworten |
|---|---|---|---|
| `OPTIONS *` | keine | – | 204 mit CORS-Headern bei erlaubtem Origin, sonst 403 |
| `PUT /v1/feedback/:storyId` | Write-Token | `{"v":1}` · `{"v":-1}` · `{"v":0}` (= löschen) | 204 · 400 `invalid_story_id`/`invalid_body` · 401 · 403 fremder Origin · 411 ohne `Content-Length` · 413 > 256 B · 429 · 503 |
| `GET /v1/feedback?cursor=<c>` | Read-Token | `cursor` optional, ≤ 1.024 Zeichen | 200 `FeedbackPage` · 400 · 401 |
| sonst | – | – | 404; falsche Methode 405 mit `Allow` |

- Eine `list()`-Op pro GET; der Aufrufer blättert, solange `complete === false` – **nicht** nach `items.length` (abgelaufene/gelöschte Keys werden übersprungen, Seiten können leer sein, obwohl `list_complete` false ist).
- Validierung vor jedem KV-Zugriff: Pfadsegment roh (nicht dekodieren) gegen `STORY_ID_PATTERN`; `Content-Length` Pflicht und ≤ 256, dann `await request.text()`, `JSON.parse` in try, genau ein Feld `v` ∈ {1, −1, 0}. `ts` setzt der Worker (`Math.floor(Date.now() / 1000)`), nie der Client.
- Alle Antworten: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, Fehler als `{ error: '<code>' }` (englische Codes, deutsche Texte macht das Dashboard). CORS-Header auch an Fehlerantworten.
- KV-Fehler abfangen: Meldung enthält `429` → 429 + `Retry-After: 2`; sonst 503 (z. B. Tageslimit). Nie 500 mit Stacktrace.

## Auth: zwei Tokens

- **Write-Token:** nur PUT. Der Nutzer tippt ihn **einmal je Gerät von Hand** in die Dashboard-Einstellungen → `localStorage['aipulse.feedbackToken']`. Kein QR-Code, kein Link mit Token, nie in URL oder Query (Standard laut Steckbrief).
- **Read-Token:** nur GET. Liegt ausschließlich auf dem Heimserver als `FEEDBACK_READ_TOKEN` in `/etc/ai-pulse/env` (root:aipulse, Modus 640; Einrichtung → Skill `job-betrieb`). Kein GitHub-Secret, nie im Repo, nie im Browser. Der `claude`-Kindprozess bekommt ihn nicht (expliziter `env` nach Skill `claude-headless`).
- Im Worker nur die SHA-256-Hashes (hex) als Secrets `WRITE_TOKEN_SHA256` und `READ_TOKEN_SHA256`. Klartext-Tokens nie in Cloudflare, Repo, `wrangler.jsonc` oder Chat.
- Prüfung: `Authorization: Bearer <token>` (Regex `^Bearer (\S{16,256})$`) → `crypto.subtle.digest('SHA-256', …)` → mit dem Secret (`trim().toLowerCase()`, hex → 32 Byte) per `crypto.subtle.timingSafeEqual` vergleichen. `timingSafeEqual` wirft bei ungleicher Länge – Hash gegen Hash ist immer 32 Byte und verrät die Token-Länge nicht. Kein frühes `return` vor dem Vergleich.
- **Fail closed:** Secret fehlt oder ist kein `^[0-9a-f]{64}$` → 401 (wie Kochbuch). Kein Dev-Bypass.
- Tokens = 32 Zufallsbytes base64url. Der **Nutzer** erzeugt sie in seinem eigenen Terminal (Einrichtung, Schritt 4); Claude sieht sie nie und gibt sie nie ein.
- Rotation: neues Token → neuen Hash per `secret put` → Dashboard-Einstellung auf jedem Gerät bzw. `FEEDBACK_READ_TOKEN` in `/etc/ai-pulse/env` ersetzen (Nutzer per `sudoedit`); das alte gilt sofort nicht mehr. Die Server-Änderung wirkt ab dem nächsten Timer-Lauf (jeder Lauf startet den Dienst neu und liest die Env-Datei frisch). Bis dahin liefert der Abruf 401 → System-Hinweis, Lauf ohne Profil.
- Nie `Authorization` oder Tokens loggen (`console.log`, `wrangler tail`, Server-Journal `journalctl -u ai-pulse`, Lauf-Logs unter `~aipulse/.local/share/ai-pulse/`).

## CORS

- Var `ALLOWED_ORIGINS` (kommagetrennt, exakte Origins ohne Pfad und Schrägstrich): Produktion `https://skodex.github.io`; lokal per `worker/.dev.vars` zusätzlich `http://localhost:5175,http://localhost:4175`.
- `Access-Control-Allow-Origin` = Request-Origin nur bei exaktem Treffer; immer `Vary: Origin`; dazu `Access-Control-Allow-Methods: GET, PUT, OPTIONS`, `Access-Control-Allow-Headers: Authorization, Content-Type`, `Access-Control-Max-Age: 86400`. Preflight **vor** der Auth beantworten (Browser senden dort kein `Authorization`).
- Fremder `Origin` → 403 vor jedem KV-Zugriff. Ohne `Origin` (Pipeline, curl) → weiter zur Token-Prüfung.
- **Origin ist keine Authentifizierung:** außerhalb des Browsers fälschbar, und alle Pages-Projekte des Nutzers (Orbitus, Gaia, AI Pulse …) teilen `https://skodex.github.io`. Den eigentlichen Schutz gibt nur das Token.

## `worker/wrangler.jsonc` (Vorlage)

```jsonc
// Feedback-Worker von AI Pulse (Skill feedback-worker). Keine Secrets in dieser Datei.
// Secrets: WRITE_TOKEN_SHA256, READ_TOKEN_SHA256 per `npx wrangler secret put <NAME> -c worker/wrangler.jsonc`.
// Kommentare nur als ganze Zeilen – worker/scripts/free-plan.ts entfernt sie zeilenweise.
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "ai-pulse-feedback",
  "main": "./src/index.ts",
  "compatibility_date": "2026-10-24",
  "send_metrics": false,
  "workers_dev": true,
  "preview_urls": false,
  "kv_namespaces": [{ "binding": "FEEDBACK", "id": "<id aus kv namespace create>" }],
  "vars": { "ALLOWED_ORIGINS": "https://skodex.github.io" }
}
```

- Kein `triggers`, kein `assets`, keine `r2_buckets`, kein `"remote": true` am KV-Binding. Die Namespace-ID ist kein Geheimnis.
- `compatibility_date` = Datum der Anlage, nicht neuer als die installierte Wrangler-Laufzeit. Nach Konfig-Änderungen `npm run worker:types`.

## Free-Plan-Prüfung (`worker/scripts/free-plan.ts`)

Vorlage `E:\Coding\Kochbuch\scripts\free-plan.ts` (liest dort die Vite-Ausgabe `dist/kochbuch/wrangler.json`; hier gibt es keinen Vite-Build für den Worker). Anpassen:
- Konfig aus `worker/wrangler.jsonc` lesen: Zeilen mit `^\s*//` entfernen, dann `JSON.parse` (keine Inline-Kommentare – `https://` in Strings).
- `FREIGEGEBEN = ['vars', 'kv_namespaces']`, `HARMLOS` wie Kochbuch plus `$schema`; alles andere mit `genutzt(wert)` → Fehler.
- Fehler: `triggers` vorhanden · `remote: true` an einem KV-Binding · `id` noch Platzhalter · Variablen + Secrets (`['WRITE_TOKEN_SHA256', 'READ_TOKEN_SHA256']`) > 64 · Variable > 5 KB.
- Bundle: `npx wrangler deploy --dry-run --outdir worker/.dist -c worker/wrangler.jsonc`, dann `.js`-Größe messen (Fehler > 64 MiB, Warnung > 1 MiB). Aus Node unter Windows mit `execSync` bzw. `shell: true` starten – `execFileSync('npx', …)` scheitert dort (`npx.cmd`).
- Verbotene Muster in `worker/src/*.ts`: `.formData(`, `.arrayBuffer()`/`.blob()`, `setInterval(`/`setTimeout(`, mehr als ein `.list(`. Pflicht: `expirationTtl` beim `put`.
- In `src/`: `setInterval(` plus Feedback-Aufruf in einer Datei → Fehler (kein Polling).
- Ausnahme nur mit Zeilenkommentar `// free-plan: ok – <Begründung>`. Test mit Fake-Konfig in `worker/test/`.

## Pipeline: Präferenzprofil

Läuft im Server-Job vor Stufe 1 (`triage`), einmal je Lauf (auch beim Nachholen nur einmal); wie das Profil in Prompt und Score eingeht → Skill `bewertung`. `FEEDBACK_READ_TOKEN` kommt aus der Prozessumgebung, die der Dienst aus `/etc/ai-pulse/env` lädt. URL = `process.env.AIPULSE_FEEDBACK_URL || FEEDBACK_API_URL` (die Variable nur lokal, Produktion nutzt die Konstante `FEEDBACK_API_URL` aus `shared/config.ts` – einzige Quelle laut Steckbrief).
1. URL leer → Feedback ist aus: ohne Profil weiter, **kein** Hinweis (Normalzustand vor Phase 6). URL gesetzt, aber `FEEDBACK_READ_TOKEN` fehlt → ohne Profil weiter **mit** System-Hinweis (Konfigurationsfehler auf dem Server).
2. `GET /v1/feedback` mit `Authorization: Bearer …`, `User-Agent` aus den Konventionen und `AbortSignal.timeout(10_000)`, blättern bis `complete`, höchstens 20 Seiten. 401/429/503/Timeout/Netzfehler/ungültiges JSON → Warnung im Lauf-Log (ohne Token, ohne Antwortkörper), System-Hinweis, Lauf ohne Profil (fail-soft, nie Abbruch). Seiten bis zum Fehler verwerfen – kein halbes Profil. 401 heißt meist: Token rotiert, Server-Env nicht nachgezogen.
3. Votes den Stories zuordnen, ohne Tagesarchive zu laden: zuerst `public/data/latest.json` (`category`, `tags`, `sources[0].id`), dann `public/data/index/JJJJ-MM.json` (`category`, `tags`, `src`) für alle Monate, die das TTL-Fenster (180 Tage) berührt – höchstens 7 Dateien, nie vor `firstMonth` aus `meta.json`, fehlende Datei überspringen. Nicht gefunden → `unmatched`, fällt weg.
4. Zählen je Primärquelle (`sources[0].id` bzw. `src` – laut Datenvertrag beide die Primärquelle), je `category`, je Eintrag in `tags` → `{ up, down }`. Nur Einträge mit ≥ 3 Votes, sortiert nach |up − down|, höchstens 10 Quellen, 11 Kategorien, 20 Tags. Unter 10 zugeordneten Votes → kein Profil (kein Hinweis, das ist kein Fehler).
5. An Claude geht nur eine daraus formatierte Kurzfassung (≤ 10 Zeilen, ≤ 150 Token, Format → Skill `bewertung`); sie verschiebt nur künftige `personal`-Werte (höchstens ±2), nie `impact`. Bereits bewertete Stories behalten ihre Werte (Skill `bewertung`); ein 👎 versteckt nichts und senkt nichts rückwirkend.
6. **Nie** rohe Votes oder das Profil nach `public/data/` oder `state/` schreiben (öffentliches Repo, Push per Deploy-Key). Nur im Speicher; bei `--dry-run` nach `.cache/dry/feedback-profile.json` (gitignored; unter 10 Votes mit leeren Listen, damit `votes`/`unmatched` sichtbar bleiben).

```ts
interface FeedbackProfile {           // pipeline/score/feedback.ts (geplant)
  votes: number; unmatched: number     // zugeordnet / verworfen
  sources: { id: string; up: number; down: number }[]   // id = sources[0].id bzw. src
  categories: { key: Category; up: number; down: number }[]
  tags: { tag: string; up: number; down: number }[]
}
type FeedbackNotice = Meta['notices'][number] & { kind: 'system' }   // Meta aus shared/types.ts
// loadFeedbackProfile(): Promise<{ profile: FeedbackProfile | null; notice: FeedbackNotice | null }>
```

### System-Hinweis in `meta.json`

`loadFeedbackProfile()` gibt neben dem Profil höchstens einen Hinweis zurück; `pipeline/output/` (Skill `bewertung`) hängt ihn an `notices[]` (Typ `Meta` im Steckbrief). Form:

```ts
{ kind: 'system', text: 'Feedback-Abruf fehlgeschlagen: <Grund> – Bewertung ohne Feedback-Profil.', since: '<ISO>' }
```

| Ursache | `<Grund>` |
|---|---|
| URL gesetzt, Token fehlt | `Lese-Token fehlt auf dem Server` |
| 401 | `Lese-Token ungültig (rotiert?)` |
| 429 / 503 (vom eigenen Handler) | `KV überlastet oder Tageslimit erreicht` |
| HTML-Antwort mit `1027` im Körper | `Tageslimit der Worker-Requests erreicht (Reset 00:00 UTC)` – 1xxx-Fehler stehen laut Cloudflare im HTML-Körper, der HTTP-Status dazu ist nicht dokumentiert → am Körper erkennen, vor dem JSON-Parse |
| Timeout, Netzfehler, anderer Status, kaputtes JSON | `Worker nicht erreichbar` bzw. `unerwartete Antwort (HTTP <code>)` |

- Text mit festem Präfix `Feedback-Abruf fehlgeschlagen` (Konstante), kein `sourceId` (der Worker ist keine Register-Quelle). Nie Token, URL-Subdomain, Header oder Antwortkörper in den Text – `meta.json` ist öffentlich.
- `since`: steht in der vorherigen `public/data/meta.json` schon ein Hinweis mit diesem Präfix, dessen `since` übernehmen, sonst Laufzeitpunkt. Keine eigene State-Datei.
- Verschwindet von selbst beim nächsten erfolgreichen Abruf (`meta.json` wird je Lauf neu geschrieben).
- Anzeige im Dashboard → Skill `dashboard-entwickeln`; der Watchdog (`watchdog.yml`) prüft nur Frische, `budget.level` und `token`-Hinweise in `meta.json`, keine `system`-Hinweise wie diesen.

## Dashboard-Anbindung

UI-Details → Skill `dashboard-entwickeln`; hier der Vertrag.
- 👍/👎 in der Story-Karte nur, wenn eine Worker-URL gesetzt **und** ein Token gespeichert ist; sonst Knöpfe ausblenden, kein Fehler (wie Skill `dashboard-entwickeln`). Den Hinweis „Token in den Einstellungen eintragen“ zeigt nur `#/einstellungen`.
- Einstellungen: Feld `type="password"` für den Write-Token → `aipulse.feedbackToken`, dazu „Entfernen“. Einmal je Gerät von Hand eintippen bzw. einfügen; kein QR-Code, kein Import per Link oder `#/einstellungen?token=…` (Standard laut Steckbrief).
- **👎 blendet nur lokal ab:** Karte bleibt sichtbar und an ihrem Platz (keine Umsortierung, kein Ausblenden), wird abgeblendet wie eine gelesene Karte – die Option „Gelesene ausblenden“ gilt dafür nicht; `vote` wieder `0` hebt das auf. Gilt nur auf dem Gerät mit dem Vote (aus `aipulse.votes`). 👍 ändert nur den Knopfzustand (`aria-pressed`). Auf die Sortierung wirkt Feedback ausschließlich über das Profil in künftigen Läufen (`personal`).
- Eigene Votes nur lokal: `localStorage['aipulse.votes']` = `{ v: 1, votes: { [storyId]: { vote: 1 | -1 | 0, ts, pending } } }` (Key und Form wie im Skill `dashboard-entwickeln`). Das Dashboard liest den Worker **nie** (kein Read-Token im Browser); auf neuen Geräten fehlen alte Votes – gewollt.
- Optimistisch: Klick setzt sofort den Zustand (gleicher Knopf erneut = `0`), `pending: true`; je Story nach 1,5 s Ruhe nur den letzten Stand senden (1 Write/s/Key). 204 → `pending: false` · 401 → pending behalten, Hinweis „Token prüfen“ · 400 → verwerfen · 429/503/Netzfehler → pending behalten.
- Offene Votes erneut senden bei App-Start, `visibilitychange` (→ sichtbar) und `online`. Kein `setInterval`. Lokale Einträge älter als 180 Tage löschen.
- Aufruf: ``fetch(`${api}/v1/feedback/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ v }) })`` mit `api` = `import.meta.env.VITE_FEEDBACK_URL || FEEDBACK_API_URL` (Name wie im Skill `dashboard-entwickeln`; Produktion nutzt die Konstante, die Variable überschreibt lokal).
- Service Worker: Worker-Aufrufe nie cachen (Workbox-Routen nur für same-origin `/data/`).

## Einrichtung und Deploy

Konto und Cloudflare-Dashboard bedient der Nutzer (Konto existiert, wie Kochbuch). Claude erklärt, führt nur tokenfreie Befehle aus und sieht keine Tokens.
1. `npx wrangler login` (Nutzer bestätigt im Browser).
2. Jurisdiktion mit dem Nutzer klären (Standard keine, siehe „Speicher“), dann `npx wrangler kv namespace create ai-pulse-feedback -c worker/wrangler.jsonc` (nur auf Wunsch `--jurisdiction eu` – nachträglich nicht änderbar) → ausgegebene `id` in `kv_namespaces[0].id` (oder `--binding FEEDBACK --update-config`, nie `--use-remote` – das setzt `remote: true`).
3. `npm run worker:deploy` – bewusst **vor** den Secrets: fail closed, alles 401. Adresse `https://ai-pulse-feedback.<sub>.workers.dev` aus der Ausgabe in `FEEDBACK_API_URL` in `shared/config.ts` eintragen (einzige Stelle; Worker-Vertrag, Dashboard und Pipeline importieren von dort).
4. Nutzer erzeugt in seinem Terminal zwei Tokens samt Hash (zweimal ausführen, Tokens im Passwortmanager ablegen):
   `node -e "const c=require('node:crypto'),t=c.randomBytes(32).toString('base64url');console.log(t,c.createHash('sha256').update(t).digest('hex'))"`
5. Nutzer: `npx wrangler secret put WRITE_TOKEN_SHA256 -c worker/wrangler.jsonc`, ebenso `READ_TOKEN_SHA256` – Hash in die Abfrage einfügen (deployt sofort eine neue Version). In Git Bash geht auch `printf '%s' '<hash>' | npx wrangler secret put …`; nicht aus PowerShell pipen.
6. Nutzer auf dem Heimserver: `sudoedit /etc/ai-pulse/env` → Zeile `FEEDBACK_READ_TOKEN=<token>` (nicht per `echo … >>`, landet sonst in der Shell-Historie). Write-Token von Hand in die Dashboard-Einstellungen auf Handy und PC. `FEEDBACK_API_URL` committen (öffentlich, kein Geheimnis) – der Server holt die Konstante mit dem nächsten `git pull --rebase` seines Laufs.
7. Prüfen ohne Token (Claude darf):
   ```bash
   U=https://ai-pulse-feedback.<sub>.workers.dev
   curl -s -o /dev/null -w "%{http_code}\n" "$U/v1/feedback"                                                          # 401
   curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS -H "Origin: https://skodex.github.io" "$U/v1/feedback/abcdef12"  # 204
   curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS -H "Origin: https://example.org" "$U/v1/feedback/abcdef12"       # 403
   ```
   Mit Token prüft der Nutzer selbst: ein Klick im Dashboard (204 im Netzwerk-Tab), danach auf dem Server einen Trockenlauf mit geladener Env-Datei (Aufruf → Skill `job-betrieb`) → `.cache/dry/feedback-profile.json` zeigt `votes`/`unmatched`, das Lauf-Log keine Feedback-Warnung. Claude liest weder die Env-Datei noch das Token.

## Lokal entwickeln und testen

- `worker/.dev.vars` (neben `wrangler.jsonc`): `ALLOWED_ORIGINS=https://skodex.github.io,http://localhost:5175,http://localhost:4175`, `WRITE_TOKEN_SHA256=…`, `READ_TOKEN_SHA256=…`. `.dev.vars.example` enthält die Hashes zweier fester Test-Tokens, die nur lokal gelten (Tokens als Kommentar daneben) – nie die echten.
- Nur `.dev.vars`, **keine** `worker/.env` daneben (laut Doku entweder–oder; mit `.dev.vars` ignoriert Wrangler `.env`). `CLOUDFLARE_INCLUDE_PROCESS_ENV` nicht setzen.
- `npm run worker:dev` → `http://localhost:8787`, KV lokal simuliert. Dashboard dagegen mit `VITE_FEEDBACK_URL=http://localhost:8787` starten (z. B. in `.env.local`, gitignored). Für die Browser-Pane einen Eintrag `pulse-worker` (`npm run worker:dev`, Port 8787) in `.claude/launch.json` anlegen.
- Tests: `handle()` mit Fake-KV (Map mit `put`/`delete`/`list` inkl. `prefix`, `cursor`, `limit`, `metadata`) und injizierter Vergleichsfunktion – Node kennt `crypto.subtle.timingSafeEqual` nicht (nur `timingSafeEqual` aus `node:crypto`). Fälle: jede Route Erfolg + Fehler, fehlende Secrets → 401, fremder Origin → 403, CORS-Header an 401, `v: 0` löscht, leere Seite mit `complete: false`.
- Pipeline lokal unter Windows: ohne `FEEDBACK_READ_TOKEN` in der Umgebung läuft sie ohne Profil (bei gesetzter URL mit System-Hinweis – nur in `.cache/`, nie committen). Zum Testen gegen `wrangler dev`: `AIPULSE_FEEDBACK_URL=http://localhost:8787` und als `FEEDBACK_READ_TOKEN` das lokale Test-Token aus `.dev.vars.example`, nie das echte. Profil-Logik mit Fixtures testen (Fake-Antworten inkl. leerer Seite mit `complete: false`, 401, HTML mit `1027`, Timeout), ohne Netz.
- Prüfreihenfolge `npm run typecheck` → `npm test` → `npm run worker:check` (→ Skill `sparsam-testen`).

## Fallen

- Alle Votes in einem Key → verlorene Updates. Immer `fb:<storyId>`.
- `list()` je Seitenaufruf → 1.000 Lists/Tag schnell weg; das Dashboard listet nie, die Pipeline 3× täglich.
- Doppelklick 👍→👎 innerhalb 1 s → `KV PUT failed: 429 Too Many Requests` → Debounce im Client, 429 im Worker durchreichen.
- Blättern bis `items.length === 0` endet falsch – nur `complete` zählt; Folgeseiten mit demselben `prefix`.
- Vote kurz vor dem Lauf fehlt im `list` (bis ≈ 60 s Verzögerung) – kommt im nächsten Lauf.
- CORS-Header fehlen an 401/429 → Browser meldet nur `TypeError: Failed to fetch`; „Token falsch“ und „offline“ sind nicht mehr unterscheidbar.
- `ALLOWED_ORIGINS` mit Pfad (`https://skodex.github.io/ai-pulse/`) → nie ein Treffer, CORS-Fehler trotz 204. Der Origin-Header hat nie einen Pfad.
- Auth-Pflicht im Preflight → jeder PUT scheitert im Browser.
- Hash per PowerShell 5.1 gepipet → Zeilenumbruch im Secret → immer 401. Der Worker trimmt, trotzdem Abfrage oder Git-Bash-`printf '%s'` nutzen.
- `.dev.vars` im Repo-Root statt in `worker/` → lokal alles 401 (fail closed).
- `"remote": true` oder `wrangler dev --remote` → lokale Tests schreiben in die echte KV und verbrauchen Writes.
- Bestehende Stories behalten ihre `id`; verschmelzen zwei, gewinnt die ältere (Skill `bewertung`) → Votes auf die jüngere `id` werden `unmatched`. Über ≈ 20 % `unmatched` die ID-Vergabe in `bewertung` prüfen (z. B. neue `clusterKey` je Lauf statt Wiederverwendung).
- Write-Token im geteilten localStorage von `skodex.github.io` → XSS in irgendeinem Pages-Projekt des Nutzers kann ihn lesen. Schaden begrenzt (Votes schreiben/löschen, nichts lesen, keine Kosten) → rotieren.
- Rohe Votes oder Profil committet → im öffentlichen Repo dauerhaft in der Git-Historie. Der Server pusht `public/data/` + `state/` automatisch; `.cache/` muss gitignored sein.
- Read-Token als `echo FEEDBACK_READ_TOKEN=… >> /etc/ai-pulse/env` eingetragen → steht in `~/.bash_history`. Nur `sudoedit`.
- Server-Env nach Rotation nicht nachgezogen → jeder Lauf 401, System-Hinweis seit der Rotation; Bewertung läuft weiter, nur ohne Profil.
- `since` des Hinweises nicht aus der vorherigen `meta.json` übernommen → springt jeden Lauf auf „gerade eben“, ein Dauerfehler sieht frisch aus.
- Grund-Text mit Antwortkörper oder URL gebaut → Subdomain, Fehlerdetails oder Schlimmeres landen in der öffentlichen `meta.json`. Nur die festen Gründe aus der Tabelle.
- 1027-Seite ist HTML → `JSON.parse` wirft; ohne Körper-Prüfung davor steht nur „unerwartete Antwort“ im Hinweis.
- Teilseiten nach einem Fehler weiterverwendet → verzerrtes Profil (nur die ersten 1.000 Votes). Ganz oder gar nicht.
- KV mit `--jurisdiction eu` angelegt und später doch ohne gewünscht (oder umgekehrt) → nur neuer Namespace, alte Votes gehen verloren (180 Tage TTL ohnehin). Vor dem Anlegen entscheiden.
- Free-Plan-Schutz gilt nur, solange das Konto Free bleibt.

## Quellen (geprüft 2026-10-24)

- Limits: https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/kv/platform/limits/ · https://developers.cloudflare.com/kv/platform/pricing/ · https://developers.cloudflare.com/r2/pricing/ (warum kein R2) · D1/DO: https://developers.cloudflare.com/d1/platform/pricing/ · https://developers.cloudflare.com/durable-objects/platform/pricing/
- KV-API: https://developers.cloudflare.com/kv/api/write-key-value-pairs/ · https://developers.cloudflare.com/kv/api/list-keys/ · https://developers.cloudflare.com/kv/api/delete-key-value-pairs/ · https://developers.cloudflare.com/kv/get-started/ · https://developers.cloudflare.com/kv/reference/data-location/ (Jurisdiktion, erneut geprüft 2026-10-24) · https://developers.cloudflare.com/workers/wrangler/commands/kv/ (`--jurisdiction` nur bei `namespace create`, nicht kombinierbar mit `--experimental-mode`)
- Fehlerseiten: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/ (1xxx im HTML-Körper) · Error 1027 im Abschnitt „Daily requests“ der Workers-Limits
- Auth/Secrets: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/ · https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/ · https://developers.cloudflare.com/workers/configuration/secrets/
- Vorbild: `E:\Coding\Kochbuch\.claude\skills\cloudflare-free-plan\SKILL.md`, `E:\Coding\Kochbuch\.claude\skills\worker-api\SKILL.md`, `E:\Coding\Kochbuch\wrangler.jsonc`, `E:\Coding\Kochbuch\scripts\free-plan.ts`; Recherche `docs/recherche/2026-10-24/katalog/infrastruktur.md`.

## Nach dem Bauen

- Diesen Skill auf den echten Stand bringen: Dateinamen, Statuscodes, Worker-URL mit Subdomain, gewählte Jurisdiktion, gemessener Verbrauch, echte Form der 1027-Antwort (Status, Körper), neue Fallen.
- Steckbrief: Phasenstand. `server/env.example` muss `FEEDBACK_READ_TOKEN=` (leer) enthalten. Weicht der Bau ab, nachziehen: Skill `job-betrieb` (Env-Variable), `bewertung` (Profilzeilen im Triage-Kontext, Übernahme des Hinweises in `notices`), `dashboard-entwickeln` (`aipulse.votes`, Abblendung bei 👎, Anzeige der `system`-Hinweise).
- Nach einigen Wochen den echten Verbrauch im Cloudflare-Dashboard ansehen (Worker- und KV-Metriken) und die Tabelle oben anpassen; Anteil `unmatched` im Lauf-Log prüfen.
