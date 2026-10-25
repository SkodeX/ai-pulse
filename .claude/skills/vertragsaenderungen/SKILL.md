---
name: vertragsaenderungen
description: AGB-Monitor von AI Pulse – Dokument-Watchlist, Open Terms Archive, Direktabruf, Normalisierung, Diff, Wesentlichkeit, Opus-Erklärung, Fristen. Laden, bevor du an pipeline/terms/, Preis-/Deprecation-Seiten oder state/terms-index.json arbeitest.
---

# Vertragsänderungen (AGB-Monitor)

Geplant für Phase 4, Modul 1: `pipeline/terms/` (Abruf, Normalisierung, Diff, Wesentlichkeit) und Stufe `terms` in `pipeline/llm/`. Alles hier ist Bauplan, es gibt noch keinen Code. Der Job läuft auf dem Heimserver (systemd-Timer, Claude Code headless über das Abo → `job-betrieb`, `claude-headless`). Messwerte vom 2026-10-24 stammen von der privaten IP des Nutzers, über die auch der Heimserver ins Netz geht; vom Server selbst noch nicht gemessen.

- **OTA zuerst.** Was Open Terms Archive (`genai-eu-versions`) frisch trackt, nicht selbst abrufen: GitHub hat keinen Bot-Schutz, OTA ist zugleich Versionsarchiv. Direkt nur: OTA-Lücken, saubere Markdown-Endpunkte (Preise, Deprecations), Hub-Seiten, wöchentliche Gegenprobe.
- **Abruffehler ≠ Änderung.** Challenge, leere Seite, starkes Schrumpfen → `stale`, alter Stand bleibt.
- **Keine AGB-Volltexte ins öffentliche Repo.** Snapshots nur privat auf dem Server (`~aipulse/.local/share/ai-pulse/snapshots/`, im Backup); ins Repo nur Hash, Datum, kurzer Auszug, Links.
- **Nur EU-Fassungen, die in DE gelten** (Standard laut Steckbrief); ROW-/US-Fassungen nie beobachten. Neue Dokumente in Hub-Listen nie automatisch aufnehmen → Hinweis `kind: 'agb'` in `meta.json`, Aufnahme von Hand.
- Nicht hier: Abrufschicht (UA, Timeout, ETag, Circuit-Breaker, Health, Host-Planer) → `quellen` · CLI-Aufruf, Abo-Login, Limit-Erkennung, Notfall-Backend → `claude-headless` (vor API-Code `claude-api`) · Prompts, Structured Outputs, Kostenbuch → `bewertung` · Server, Timer, Snapshot-Ordner samt Backup, Push von `state/` → `job-betrieb` · Schema, Status und Schreiben von `fristen.json` → `gesetze-und-fristen` · Preise/Deprecations aus OpenRouter → `modelle-und-ranglisten`.

## Ablauf je Lauf

1. OTA-Atom pollen (jeder Lauf, `If-None-Match` → meist 304), neue Commits seit `ota.<repo>.lastSha`.
2. Je neuem Commit mit Titel `Record new changes of …` die `.diff` holen → Pfad aus `diff --git` → nur Watchlist-Pfade weiter → Wesentlichkeit.
3. Fällige Direktdokumente: Vorprüfung (ETag, github/docs-Atom) → Abruf → normalisieren → validieren → Hash → Diff gegen Snapshot → Wesentlichkeit.
4. 07:07-Lauf zusätzlich: Hub-Link-Mengen. Sonntag 07:07: OTA-Issues, Gegenprobe, Wayback-Check.
5. Rechtstext wesentlich → Stufe `terms` (vor `brief`, damit das Briefing die Story sieht) → Story; angekündigtes Datum → Fristen-Eintrag an `pipeline/law/build-fristen.ts` (unten). Preis-/Deprecation-Ereignis → Kandidat `preise` für die Haiku-Stufen, künftiges Abschaltdatum → Fristen-Eintrag `kind: 'modell'`. Minor → `minor`-Liste. Rauschen → nur Log.
6. Snapshots (privat) schreiben, danach `state/terms-index.json` (nur bei Änderung); den Push von `state/` macht `server/run.sh` (`job-betrieb`).

**Erster Lauf = Baseline:** Hashes und Snapshots anlegen, `lastSha` = aktueller Kopf, keine Stories, keine OTA-Historie nachverarbeiten. Bekannte AGB-Stichtage (unten) als Startwerte an `build-fristen.ts` und in `announced`; künftige Abschaltdaten der Deprecation-Seiten gehen wie in jedem Lauf an `build-fristen.ts`. Jedes später ins Register aufgenommene Dokument und jeder Hub hat seinen eigenen Erstlauf (Baseline, keine Story, kein Hinweis).

**Test-, Teil- und lokale Läufe:** `--dry-run` ohne Claude-Aufrufe. `state/terms-index.json` (vor allem `lastSha`) und die Server-Snapshots schreibt nur der volle Lauf auf dem Server – nie lokal und auch auf dem Server nie bei `--dry-run`, `--limit`, `--only` oder `--stage` (Steckbrief) – sonst fehlen Commits oder Vergleichsbasen im nächsten vollen Lauf, oder ein Snapshot passt nicht mehr zum Index-Hash und die Änderung wird still als neue Basis übernommen; Ergebnis nur nach `.cache/`. Lokal (Windows) gibt es keine Server-Snapshots → Snapshot-Ordner `.cache/terms-snapshots/`, jeder Direktabruf ist dort ein Erstlauf.

## Watchlist und Abrufstufen

Volle Tabelle (id, URL, Stufe, OTA-Pfad, Anker, Selektor, Datumsfeld, Takt, Kategorie): [references/watchlist.md](references/watchlist.md). Register-Einträge in `pipeline/config/sources.ts` als normale `Source` aus `quellen` (stabile id `anthropic-aup`, `categoryHint: ['vertraege']` bzw. `['preise']`, `cadence: 'daily07'` für direkt abgerufene Rechtstexte, `'3x'` für Preise/Deprecations) mit `kind: 'terms'` (steht in `SourceKind` von `quellen`, Parser hier in `pipeline/terms/`) plus Block:

```ts
terms: {
  provider: string, document: string,          // 'Anthropic', 'Usage Policy'
  tier: 'A' | 'B' | 'C' | 'D', detect: 'ota' | 'direct' | 'hub',
  ota?: { repo: 'genai-eu-versions' | 'genai-contrib-versions', path: string },  // 'Claude.ai/Acceptable Use Policy.md'
  selector?: string, anchor?: string, minChars: number, accept?: string,         // accept: 'text/html' (GitHub)
}
```

| Anbieter | Rechtstexte erkannt über | Direkt-Stufe | Preise/Deprecations (3×) |
|---|---|---|---|
| OpenAI | OTA-eu `ChatGPT/*` | C | `developers.openai.com/api/docs/{pricing,deprecations}.md` |
| Anthropic | OTA-eu `Claude.ai/*`; Supported Regions direkt | B | `platform.claude.com/docs/en/about-claude/{pricing,model-deprecations}.md` |
| Google/Gemini | OTA-eu `Google Generative AI Services/*`; **Gemini API Terms direkt** | A/B | `ai.google.dev/gemini-api/docs/{pricing,deprecations}.md.txt` |
| Microsoft/Copilot | OTA-eu `Microsoft Copilot/*`; Privacy-FAQ direkt | B | Foundry-Retirements (optional) |
| GitHub Copilot | github/docs-Atom + Docs-API direkt; OTA-co `GitHub Copilot/*` als Zweitdetektor | A/B | – |
| Meta/Llama | OTA-eu `Meta AI/*`; Llama-4-Lizenz direkt | D/B | – |
| Mistral | **direkt** (OTA Le Chat kaputt) | B | `mistral.ai/pricing`, `docs.mistral.ai/models.md` |
| xAI | OTA-eu `Grok/*` | C | `docs.x.ai/developers/pricing.md` |
| Cursor | **direkt** (OTA-co seit 2025-09-18 still) | B | `cursor.com/docs/models-and-pricing.md`, `/pricing` |
| Perplexity | OTA-eu `Perplexity/*` | C | – |
| DeepSeek | OTA-eu `DeepSeek/*`; CDN-ETag als Gegenprobe | B | `api-docs.deepseek.com/quick_start/pricing` |

Stufen (gelten, sobald direkt abgerufen wird):
- **A** – Markdown ohne Bot-Schutz (`*.md`, `*.md.txt`, `docs.github.com/api/article/body?pathname=…`): direkt, kein HTML-Pfad.
- **B** – serverseitiges HTML ohne Sperre: direkt, Selektor + Normalisierung, ETag/Last-Modified nutzen (DeepSeek-CDN antwortet 304).
- **C** – Cloudflare mit aktiver Challenge (`openai.com/policies/*`, `perplexity.ai/hub/legal/*`, `x.ai/legal/*`): **ein** Versuch je Host und Lauf (Host-Planer aus `quellen`, gilt auch für `pipeline/terms/`; mehrere Seiten reihum über die Läufe); bei Challenge oder 403 kein Retry → OTA-Datei (raw @ letzter SHA) → Wayback.
- **D** – dauerhaft blockiert (`facebook.com/legal/eu-ai-terms`): nie direkt; OTA primär, Wayback sonntags als Gegenprobe.
- Takt: direkt abgerufene Rechtstexte 1× täglich im 07:07-Lauf; Preise/Deprecations jeder Lauf; OTA- und github/docs-Atom jeder Lauf (kein API-Kontingent). Herkunft je Stand: `source: 'direct' | 'ota' | 'wayback'`.
- **Privat-IP ändert die Stufen nicht.** Der Heimserver umgeht viele Rechenzentrums-Sperren, aber die Node-`fetch`-403 auf `openai.com/policies/*` und `x.ai/legal/*` wurde von genau dieser privaten IP gemessen (zuletzt 2026-10-24 mit der UA-Form aus dem Steckbrief, Fallen) → beide bleiben OTA-primär (Stufe C). Abruf weiter seriell je Host über den Host-Planer aus `quellen`.

## Open Terms Archive

- `genai-eu-versions` = Hauptquelle (ChatGPT, Claude.ai, DeepSeek, Google Generative AI Services, Grok, Le Chat, Llama API, Meta AI, Microsoft Copilot, Perplexity, Qwen Chat, Vibe). `genai-contrib-versions` (~50 Dienste) nur für `GitHub Copilot` und als Zweitdetektor – dort viele „not tracked anymore".
- Feeds: `https://github.com/OpenTermsArchive/genai-eu-versions/commits/main.atom` (contrib analog). Pfadgefiltert je Dienst: `https://github.com/OpenTermsArchive/genai-contrib-versions/commits/main/GitHub%20Copilot.atom`. Atom liefert nur die letzten **20** Commits, ETag → 304.
- Nur Titel `^Record new changes of ` verarbeiten; `Start tracking …` / `First record …` ignorieren (Baseline), andere Titel loggen. Pfad aus `^diff --git a/(.+) b/\1$` lesen, nicht aus dem Titel (Dienstnamen enthalten Leerzeichen).
- Diff: `https://github.com/OpenTermsArchive/<repo>/commit/<sha>.diff` (text/plain, kein REST-Kontingent); `.patch` liefert zusätzlich `Date:`/`Subject:`. Volltext einer Fassung: `https://raw.githubusercontent.com/OpenTermsArchive/<repo>/<sha>/<Pfad>`, Pfad je Segment mit `encodeURIComponent` (`ChatGPT/Acceptable%20Use%20Policy.md`).
- Überlauf (`lastSha` nicht mehr im Atom, z. B. nach Server-Ausfall): `https://api.github.com/repos/OpenTermsArchive/<repo>/commits?since=<lastCommitAt>&per_page=100` nachholen, mit `AIPULSE_GITHUB_TOKEN` (fine-grained PAT ohne Repo-Rechte, Header `Authorization: Bearer …`, nur an `api.github.com` senden). Atom, `.diff`, `.patch`, raw und `docs.github.com/api/article/body` brauchen keinen Token und zählen nicht gegen das REST-Kontingent.
- Pfadschema `<Dienst>/<Dokumenttyp>.md`; Typen u. a. `Terms of Service`, `Privacy Policy`, `Acceptable Use Policy`, `Commercial Terms`, `Developer Terms`, `Data Processor Agreement`, `Trackers Policy`.
- **Kombinierte Dokumente:** eine OTA-Datei kann mehrere Seiten enthalten (`ChatGPT/Terms of Service.md` = EU Terms of Use + Service Terms; `Microsoft Copilot/Acceptable Use Policy.md` = Services Agreement en-gb). Welche Seiten, steht in der Declaration `https://raw.githubusercontent.com/OpenTermsArchive/genai-eu-declarations/main/declarations/<Dienst>.json` (`terms.<Typ>.fetch` bzw. `combine[]`, dazu `select`: `#write` DeepSeek, `.prose` xAI, `#mainContent` Microsoft).
- Latenz: genai-eu nimmt etwa 10:30 und 22:30 UTC auf, contrib etwa 07:00 und 19:00 UTC → bis ~12 h Verzug, Treffer meist im 13:07- oder nächsten 07:07-Lauf.
- Frische (Sonntag): offene Issues `https://api.github.com/repos/OpenTermsArchive/genai-eu-declarations/issues?state=open&per_page=100` (contrib analog, > 100 offen → über `Link` paginieren; `AIPULSE_GITHUB_TOKEN` wie oben). Titel-Regex ``/^`([^`]+)` ‧ `([^`]+)` ‧ not tracked anymore/`` (Dienst, Typ; die Liste enthält auch PRs) → nur Einträge treffen, deren `ota.repo` zu diesem Declarations-Repo gehört – contrib hat offene Issues zu ChatGPT, Grok und Claude.ai AUP, die genai-eu-Einträge sind davon nicht betroffen. Treffer: Stufe A/B → bis zur Register-Änderung direkt abrufen (Laufzeit-Override `docs.<id>.detect: 'direct'` in `terms-index.json`); Stufe C/D → Wayback-Gegenprobe; immer Health „OTA-Lücke" plus Hinweis `kind: 'agb'` in `meta.json` (Register von Hand umstellen). Stand 2026-10-24: genai-eu nur `Llama API`; contrib u. a. Cursor, Grok, Le Chat, Perplexity AUP/DPA, Claude.ai AUP.
- Bekannte Lücken: Gemini API Additional Terms fehlen ganz; Cursor (contrib) letzter Commit 2025-09-18; Le Chat in genai-eu mit leerer Declaration (`"terms": {}`, letzte Fassung 2026-06-16, Mistral änderte am 2026-10-08); contrib `OpenAI`, `xAI`, `Mistral AI` seit 2024/2025 still. Anthropic Commercial Terms sind **nicht** lückenhaft.
- Lizenz ODC-By: Credit „Open Terms Archive" in den `meta.json`-Credits und im Footer; jede OTA-Story verlinkt den Commit in `sources`.

## Normalisieren (Direktabruf)

1. **Datum zuerst**, aus dem vollen DOM (`linkedom`), bevor etwas entfernt wird: `<time datetime>` neben „Effective"/„Last updated" (Anthropic, Cursor), sonst Regex auf dem Text → ISO `effectiveDate`:
   `/(effective(?: date)?|last updated|last update|last modified|version effective date|updated)\s*:?\s*([A-Z][a-z]+\.? \d{1,2}(?:st|nd|rd|th)?,? \d{4}|\d{1,2} [A-Z][a-z]+ \d{4}|\d{4}-\d{2}-\d{2})/i`. Erster Treffer im Inhaltsblock zählt (Gemini Privacy Hub hat mehrere). `updated` deckt OpenAIs `Updated: January 16, 2026` ab. `Published:` (Microsoft) ist kein Gültigkeitsdatum.
2. Inhaltsblock per `selector` (Standard `main`, dann `article`, sonst `body` mit Health-Warnung).
3. Entfernen: `script, style, noscript, svg, template, iframe, nav, footer, form, button`, Cookie-/Promo-Banner. `header` nur außerhalb des Inhaltsblocks löschen.
4. `html-to-text` (Optionen in v9 und v10 gleich, geprüft 2026-10-24): `wordwrap: false`, Überschriften `uppercase: false`, `a` mit `ignoreHref: true`, `img` `format: 'skip'`, Tabellen `format: 'dataTable'` mit `uppercaseHeaderCells: false` und `maxColumnWidth: 10000` (Standard 60 bricht Zellen um und verwürfelt den Text).
5. `normalize('NFKC')`, `/[\u200B-\u200D\u2060\uFEFF]/g` löschen, ’ ‘ → ', “ ” → ", Whitespace je Zeile zusammenfassen, Leerzeilen auf eine kürzen.
6. Wechselnde Tokens raus: kurze Zeilen (< 80 Zeichen) mit relativem Datum (`/\b(updated|aktualisiert)?:?\s*(yesterday|today|gestern|heute|\d+\s+(days?|hours?|weeks?|months?)\s+ago|vor\s+\d+\s+\w+)\b/i`) – längere nie (mit `wordwrap: false` ist jeder Absatz eine Zeile, sonst fliegt jeder Absatz mit „today" raus); Ziffernfolgen `/\d{12,}/g`, Hex-IDs `/\b[0-9a-f]{20,}\b/gi`, devsite-Footer „Last updated … UTC".
7. Doppelte Absätze entfernen. Mengen-Dokumente (Supported Regions, Hubs): sortierte Zeilenmenge statt Fließtext.

Markdown-Endpunkte (Stufe A): Schritt 1 (nur die Regex auf dem Text, z. B. `Effective March 23, 2026`, `Effective date: April 27, 2026`) und Schritte 5–7.

## Validieren, Hash, Snapshots (privat auf dem Server)

- Vor dem Hash ablehnen → `status: 'stale'`, alter Snapshot bleibt, `fails + 1`:
  - HTTP ≠ 200 (304 = unverändert, ok), Header `cf-mitigated`, Body < 15 KB mit `Just a moment` · `Enable JavaScript and cookies` · `cf-chl` · `Attention Required!` · `Authentication required`;
  - Text < `minChars` (Startwert 50 % der Baseline, mindestens 1.500 Zeichen; Supported Regions und Hubs eigene Werte) oder `anchor` fehlt;
  - Text schrumpft gegenüber dem letzten guten Stand um **> 40 %**.
- `challenge-platform` im HTML allein ist kein Block (Cloudflare bettet das JSD-Script auch in normale 200-Seiten ein).
- Schrumpfung mit gültigem Anker an 3 Tagen in Folge mit identischem Hash → als echte Neufassung übernehmen und melden.
- 3 Fehlschläge in Folge → `degraded`, Fallback-Kette aktiv, `meta.json` zeigt „Quelle gestört" (Circuit-Breaker-Mechanik → `quellen`).
- Hash `sha256:<hex>` über den normalisierten Text. Hashes nur innerhalb derselben `source` vergleichen (OTA-Markdown ≠ eigener Text).
- **Snapshots** = normalisierter Text je Direktdokument: `$AIPULSE_DATA_DIR/snapshots/<id>.txt` (Server: `~aipulse/.local/share/ai-pulse/snapshots/`) (UTF-8, LF; Ordner Modus 700, Eigentümer `aipulse`; Basisordner und Backup → `job-betrieb`). ~45 Dateien, zusammen < 10 MB. Atomar schreiben (Temp-Datei + `rename`), nur nach bestandener Validierung, nur im vollen Lauf (Test- und Teilläufe nutzen `.cache/terms-snapshots/`). Fehler einzelner Dokumente brechen den Lauf nicht ab (fail-soft). Für OTA-Dokumente keine Snapshots: Vorfassung = raw @ Eltern-SHA.
- **Reihenfolge bei Änderung:** alten Snapshot nach `<id>.prev.txt`, neuen schreiben, dann Index. `.prev` bleibt, bis die Änderung erklärt ist oder `pending` aufgibt (Diff-Basis für den nächsten Lauf). Ist der Index-Hash gleich dem Hash von `<id>.prev.txt` (Absturz oder gescheiterter Push vor dem Index-Commit), die Änderung im nächsten Lauf erneut verarbeiten (Diff `.prev` → neuer Text).
- `state/terms-index.json` (committet, öffentlich, nur Metadaten; einziger Schreiber ist der Server-Lauf; `changedAt` = Lauf, der die letzte Änderung erkannt hat); ETag/Last-Modified liegen in `state/http-cache.json` (Abrufschicht, `quellen`), nicht hier:

```json
{
  "docs": { "cursor-terms": { "hash": "sha256:…", "fetchedAt": "2026-10-24T05:07:41Z", "changedAt": "2026-10-24T05:07:41Z",
    "effectiveDate": "2026-09-03", "urlEffective": "https://cursor.com/terms-of-service", "source": "direct",
    "lastOk": "2026-10-24T05:07:41Z", "status": "ok", "fails": 0, "chars": 30816 } },
  "ota": { "genai-eu-versions": { "lastSha": "…", "lastCommitAt": "2026-10-24T10:31:54Z" } },
  "hubs": { "anthropic-legal-hub": { "links": ["aup", "commercial-terms", "consumer-terms", "…"],
    "fresh": [{ "url": "https://www.anthropic.com/legal/…", "change": "neu", "since": "2026-10-24T05:07:41Z" }] } },
  "announced": [{ "id": "openai-usage-policies", "date": "2026-11-20", "storyId": "…" }],
  "minor": [{ "id": "xai-privacy", "at": "2026-10-24T11:07:00Z", "netWords": 14, "ref": "<sha oder hash>" }],
  "pending": [{ "id": "mistral-privacy", "source": "direct", "ref": "sha256:…", "prevRef": "sha256:…",
    "detectedAt": "2026-10-24T05:07:41Z", "attempts": 0, "storyId": null }]
}
```

Optionale Felder je `docs.<id>`: `rebaselinedAt`, `detect` (Laufzeit-Override bei OTA-Lücke). `pending.ref` = OTA-SHA oder Hash des neuen Snapshots; aus `ref`/`prevRef` baut der nächste Lauf den Diff neu (OTA: `.diff` des Commits, direkt: `.prev.txt` gegen `<id>.txt`).

**Erstlauf, Backup-Verlust, Quellenwechsel** – nie einen Diff gegen eine Basis erklären lassen, deren Alter unklar ist:

| Lage | Erkennung | Folge |
|---|---|---|
| Erstlauf (Projektstart, neues Register-Dokument) | kein `docs.<id>` | Baseline: Snapshot + Hash, keine Story |
| Snapshot fehlt (neuer Server, Platte getauscht, Restore ohne Snapshot-Ordner) | `docs.<id>.hash` da, Datei fehlt | Hash gleich → Snapshot still neu anlegen. Hash anders, `effectiveDate` gleich → still neu baselinen (`rebaselinedAt`, keine Story, kein Fehlalarm). `effectiveDate` neu → Regel-Story „Neue Fassung ab <Datum>" ohne Diff-Erklärung |
| Snapshot aus altem Backup | Hash der Datei ≠ `docs.<id>.hash`, kein passendes `.prev` | wie „Snapshot fehlt" – der Diff enthielte schon gemeldete Änderungen |
| Index zurückgesetzt, Snapshots da | kein `docs.<id>`, Datei da | Baseline, Snapshot überschreiben |
| Quellenwechsel (direct ↔ ota ↔ wayback) | `source` anders | wie „Snapshot fehlt" (Hashes verschiedener Quellen nie vergleichen) |

- Fehlen mehr als 5 Snapshots auf einmal → **ein** Hinweis `kind: 'system'` in `meta.json` („AGB-Snapshots fehlten, N Dokumente neu als Basis übernommen – Backup prüfen"), keine Einzelmeldungen.
- Ohne Snapshot für dieses Dokument keine bedingten Header (`If-None-Match`/`If-Modified-Since`) senden, sonst kommt 304 und die Vergleichsbasis fehlt weiter – die Abrufschicht (`quellen`) muss das je Aufruf abschalten können.

## Wesentlichkeit

Eine Funktion für OTA-`.diff` und eigenen Diff (`diffLines` aus `diff` → `+`/`-`-Zeilen, ohne `+++`/`---`). Vorlage: `docs/recherche/2026-10-24/prototypen/ota_noise.mjs`.

1. Zeilen normalisieren: `](…)` und URLs löschen, `` * _ # > ` | [ ] \ - `` → Leerzeichen, lowercase, Whitespace zusammenfassen.
2. Sind alle geänderten Zeilen kurze relative Datumszeilen (< 80 Zeichen, Regex oben) → Rauschen. Ohne Längengrenze gälte ein geänderter Absatz mit „today" als Rauschen.
3. Netto-Wörter = Σ |Anzahl in `+` − Anzahl in `-`| je Wort (Wörter ≥ 2 Zeichen).
4. Datumswechsel = eine `+`-Zeile passt auf `/\b(effective|last updated|last modified|updated on|gültig ab|stand|wirksam)\b[^\n]{0,40}\b(20\d\d|\d{1,2}[./]\d{1,2}[./]\d{2,4})/i`.

| Klasse | Regel | Folge |
|---|---|---|
| wesentlich | ≥ 30 Netto-Wörter **oder** neues Effective-/Last-updated-Datum | Stufe `terms`, Story |
| minor | 8–29 Netto-Wörter | `minor`-Liste → Wochenrückblick |
| Rauschen | < 8, 0 oder nur relative Daten | verwerfen, nur Log |

Gemessen: 22 von 40 OTA-Commits Rauschen (contrib 13 von 20, meist `+1/−1` Footer-Navigation), 16 wesentlich. ChatGPT AUP 21.10.: neues „Effective: 20 November 2026", +58/−21 Zeilen, 690 Netto-Wörter; dieselbe Datei 22.10.: nur „Updated: yesterday" entfernt. Claude.ai AUP 18./19./22.10.: Formatierung und Inhaltsverzeichnis.

- **Angekündigtes Datum nicht doppelt zählen:** steht das neue Datum schon in `announced`, ist der Datumswechsel kein Grund (Seiten bauen am Stichtag „Previous Version"-Links um).
- **Supported Regions:** Mengen-Diff, jedes neue oder entfernte Land ist wesentlich. **Hubs:** Mengen-Diff, aber nur Hinweis, nie Story (unten).
- **Preise:** Diff je Abschnitt (`###` bzw. Tabellenzeile); wesentlich, wenn sich eine Zeile mit Zahl oder `$` ändert oder ein Abschnitt dazukommt/wegfällt. Geht nicht an Opus, sondern als Kandidat (`preise`, `clusterKey` unten) in die normalen Haiku-Stufen (→ `bewertung`).
- **Deprecations ohne Claude parsen** (Formate geprüft 2026-10-24); Tabellen erst als alte und neue Zeilenmenge parsen, dann vergleichen:
  - OpenAI: Abschnitt `### JJJJ-MM-TT: <Titel>` (Ankündigungsdatum) mit Tabelle `| Shutdown date | Model / system | Recommended replacement |`; Datum `January 14, 2027` oder `Apr 1, 2027`; mehrere IDs je Zelle in Backticks, getrennt durch `\|` (escapter Strich) oder Komma in Klammern. Neuer Abschnitt = Ereignis.
  - Anthropic: Tabelle `| API model name | Current state | Deprecated | Tentative retirement date |`, Schlüssel Modellname; Ereignis = Zustandswechsel (`Active` → `Deprecated`) oder neues Datum. `Not sooner than <Datum>` bei aktiven Modellen ist eine Mindestzusage, **kein** Abschaltdatum; `To be announced` = kein Datum.
  - Gemini: Tabelle je Modellfamilie `| **Model** | **Release date** | **Shutdown date** | **Recommended replacement** |`, Zwischenzeilen `| Preview models ||||`; `No shutdown date announced` und `N/A` = kein Datum. Ereignis = Datum neu in einer Zeile oder neue Zeile mit Datum.
  - Mistral: `https://docs.mistral.ai/models.md`, Abschnitt `## Deprecated and retired models`, Spalten `… | Deprecation | Retirement | Replacement |`, Daten gemischt ISO (`2026-10-31`) und `April 30, 2026`. Ereignis = neue Zeile oder neues `Retirement`.
  - Ereignis → Kandidat `preise` mit Modell, Datum, Nachfolger (`clusterKey` unten); künftiges Abschaltdatum → Fristen-Eintrag `kind: 'modell'` (Ausgabe).

## Stufe `terms` (Claude)

- **Menge:** höchstens 3 Erklärungen je Lauf, alle in **einem** Aufruf (je Dokument ein `<aenderung ref="t01" …>`, Ausgabe `items[]` je `ref`; der Code ordnet `ref` → Dokument-`id` zu, Schema `TermsOut` in `bewertung`) – so bleibt der Lauf bei ≤ 8 CLI-Aufrufen (Triage ≤ 4, Zusammenfassen 1–2, Briefing 1, `terms` 1). Reihenfolge: zuerst `pending` (älteste zuerst), dann Dokumente der Persona-Tools (Claude, ChatGPT, Gemini, Copilot, Cursor), dann neues `effectiveDate`, dann Netto-Wörter. Überlauf → `pending` in `state/terms-index.json`, noch ohne Story.
- **Backend-Kette** (Erkennung von Limit/Login und Umschaltung → `claude-headless`; Modelle und Grenzen nur in `pipeline/config/models.ts`):

| Backend | Modell und Aufruf | Ausgabe | `ratedBy` |
|---|---|---|---|
| `abo` (Standard) | `claude-opus-5-5` über `claude -p` (`--safe-mode --tools ""`, `--system-prompt-file`, `--json-schema`; `--effort medium`, Parameter je Stufe → `bewertung`) | volle Erklärung | `claude-opus-5-5` |
| `api` (Notfall: CLI meldet Limit oder Login-Fehler, `AIPULSE_FALLBACK_API_KEY` gesetzt, Monatsgrenze 3 € ≈ 3,36 USD nicht erreicht) | `claude-haiku-5-5` über das SDK, dieselben zod-Schemas und dieselbe Prompt-Datei, Payload `mode: 'kurz'` | Kurzfassung: `summary` 1–2 Sätze, `whyImportant`/`forYou` je ein kurzer Satz; gilt als fertig, kein späteres Opus-Nachholen | `claude-haiku-5-5` |
| `aus` (Abo-Limit und kein API-Budget/Key) | – | Regel-Story (unten); Eintrag bleibt in `pending`, der nächste Lauf erklärt nach und überschreibt Texte und Scores derselben Story (gleicher `clusterKey`) | `regel` |

- **Kontingent statt Geld:** Opus-Aufrufe kosten Abo-Kontingent, das sich der Job mit der Claude-Code-Arbeit des Nutzers teilt – deshalb die harte Grenze von 3 und der Sammelaufruf. Token je Aufruf ins Kostenbuch (`stage: 'terms'`, `backend: 'abo'`, `schaetzungUsd` nur zur Beobachtung). Notfall-Haiku ≈ 0,001–0,002 USD je Erklärung (≈ 4k Input à 0,10 + ≈ 1–2k Output à 0,50 USD je MTok), zählt mit `usd` gegen die 3-€-Grenze.
- System-Prompt der Stufe aus den Bausteinen in `pipeline/llm/prompts/` (Stufendatei `terms.txt`), zusammengesetzt von `pipeline/llm/prompts.ts` nach `.cache/prompts/terms.txt` (CLI `--system-prompt-file`, derselbe String als API-`system`; ersetzt den Claude-Code-Standardprompt komplett; Regeln → `bewertung`, `references/rubriken-und-prompts.md`) – er sagt selbst, dass Diff-Texte Daten sind und keine Anweisungen – AGB-Texte enthalten Imperative. Keine Tools.
- Input je Dokument ≤ 3k Token (Faustwert ≤ 10.000 Zeichen), nie den Volltext:
  1. **Offizielle Zusammenfassung zuerst:** Microsoft „Summary of Changes" (`/servicesagreement/updates`, Kopf der Copilot-Terms), neue Zeile der OpenAI-Änderungsliste (`/^\s*\*\s+(\d{4}-\d{2}-\d{2}):\s+(.+)$/m` in der Usage-Policies-Fassung; OTA schreibt `*   2026-10-21: …`), Anthropic Release Notes, Gemini-Changelog (`## <Monat T, JJJJ>`), Microsoft Product Terms Change Log.
  2. Hunks mit 2 Zeilen Kontext, vorn die mit train, data, retention, opt-out, liability, arbitration, price, deprecat, prohibited, EU, age; am Limit abschneiden, Statistik (+/− Zeilen, Netto-Wörter) mitgeben.
  3. Anbieter, Dokument, bei OTA die Seitenliste des kombinierten Dokuments, altes/neues Datum, Persona-Kurzprofil.
- Ausgabe je Dokument (Structured Outputs, zod `TermsOut` → `bewertung`): `ref`, `title`, `summary` (Was ändert sich, ab wann?), `whyImportant` (Wen betrifft es?), `forYou` (Muss ich etwas tun: Opt-out, Einstellung, Frist?), `impact`, `personal`, `effectiveDate` (ISO oder null), `changeExcerpt` (≤ 200 Zeichen, eigene Worte, höchstens ein kurzes Zitat). Jeder `ref` der Eingabe genau einmal; fehlende bleiben in `pending` (`attempts + 1`), unbekannte verwerfen.
- **Fehler:** Refusal (API `stop_reason === 'refusal'`) → Regel-Story, kein neuer Versuch. Schema-, Zeit- oder sonstiger Fehler → Regel-Story, `pending` mit `attempts + 1`; bei `attempts` 3 aus `pending` streichen (Regel-Story bleibt). Überlauf-Einträge, die länger als 24 h warten → Regel-Story, bleiben in `pending`. `pending`-Eintrag und `.prev.txt` erst löschen, wenn eine Claude-Erklärung vorliegt oder aufgegeben wird.
- **Regel-Story** „<Anbieter> ändert <Dokument>", `ratedBy: 'regel'`, Scores aus einer Persona-Regel (Startwert: Claude, ChatGPT, Gemini, Copilot, Cursor `impact` 6/`personal` 7, sonst 4/3; nach Stichprobe justieren).

## Ausgabe

Story-Auszug (übrige Felder wie im Datenvertrag des Steckbriefs):

```json
{ "clusterKey": "terms:openai-usage-policies:2026-11-20", "category": "vertraege",
  "title": "OpenAI präzisiert Regeln zum Training anderer Modelle mit OpenAI-Ausgaben",
  "originalTitle": "OpenAI Usage Policies – Effective November 20, 2026",
  "url": "https://openai.com/policies/usage-policies/",
  "sources": [{ "id": "ota-genai-eu", "name": "Open Terms Archive", "lang": "en",
    "url": "https://github.com/OpenTermsArchive/genai-eu-versions/commit/1fe5f1df50f6a273b40b194673e0c27e95f48892" }],
  "tags": ["OpenAI", "ChatGPT"], "hype": false, "paywall": false,
  "terms": { "provider": "OpenAI", "document": "Usage Policies", "effectiveDate": "2026-11-20", "changeExcerpt": "…" },
  "publishedAt": "2026-10-21T22:30:45Z", "firstSeen": "2026-10-22T05:07:00Z", "ratedBy": "claude-opus-5-5" }
```

**`clusterKey`** (Fach-Schlüssel: der Code gibt ihn über `RawItem.clusterKey` vor, Claudes Schlüssel aus Stufe 1 wird ignoriert → `bewertung`):

| Ereignis | Schlüssel | Beispiel |
|---|---|---|
| Rechtstext geändert | `terms:<id>:<effectiveDate \| hash8>` | `terms:openai-usage-policies:2026-11-20` |
| Stichtag erreicht | `terms:<id>:gilt-ab:<JJJJ-MM-TT>` | `terms:anthropic-aup:gilt-ab:2026-11-12` |
| Preisänderung eines bestimmten Modells | `<org>-<modell>-price-<JJJJMMTT>` | `anthropic-claude-opus-5-5-price-20261024` |
| Preisänderung ohne einzelnes Modell (Seite, Plan, mehrere Modelle) | `price-<doc-id>-<JJJJMMTT>` | `price-cursor-pricing-20261024` |
| Deprecation/Abschaltung eines Modells | `<org>-<modell>-deprecation` | `openai-gpt-4-1-deprecation` |

- **Preis und Deprecation = dieselben Schlüssel wie beim OpenRouter-Detektor** (`modelle-und-ranglisten`) → eine Story statt zwei: kebab-case, keine Doppelpunkte, `<org>` = Watchlist-Schlüssel (Anbieter → `org` über die Alias-Tabelle; kein Alias → Log „Alias fehlt"), Schlüssel immer über `modelEventKey()` mit `<modell>` = `modelSlug(apiName)` aus `pipeline/models/keys.ts` – importieren, nie nachbauen (Regeln dort, § 9: nur ein 8-stelliges Datumssuffix `-\d{8}` fällt weg, ISO-Datumssuffixe bleiben als eigene Snapshots, Kürzung mit Hash-Teil ab 8 Teilen). Beispiele: `claude-sonnet-4-5-20250929` → `anthropic-claude-sonnet-4-5`, `gpt-4.1` → `openai-gpt-4-1`, `gpt-4.1-2025-04-14` → `openai-gpt-4-1-2025-04-14`. Mistral-Kürzel wie `mistral-medium-2508` sind Versionen und bleiben stehen.
- `<JJJJMMTT>` = Erkennungstag (Europe/Berlin). Steht in `latest.json` (72 h) schon ein Schlüssel mit demselben Präfix (`<org>-<modell>-price-` bzw. `price-<doc-id>-`), diesen wiederverwenden – sonst ergeben ein 19:07-Treffer bei OpenRouter und ein 07:07-Treffer auf der Preisseite zwei Stories.
- Mehrere Modelle in einer Deprecation-Ankündigung (ein OpenAI-Abschnitt; Anthropic-/Gemini-/Mistral-Zeilen, die im selben Lauf mit demselben Datum auftauchen) → eine Story mit dem Schlüssel des ersten Modells, alle Modelle in `tags`, je Modell ein Fristen-Item (gruppiert in `build-fristen.ts`). Verschiebt der Anbieter ein schon gemeldetes Abschaltdatum → keine neue Story (gleicher Schlüssel = gleiche `id`); den Fristen-Eintrag zieht die nächste vollständige Übergabe nach.

Felder und Fristen:

- `url` = `urlEffective` (Original), bei Preis-/Deprecation-Seiten die HTML-Fassung ohne `.md`/`.md.txt` (z. B. `https://developers.openai.com/api/docs/deprecations`, `https://docs.mistral.ai/models`); OTA-Commit oder Wayback nur in `sources`. `publishedAt` = OTA-Commitzeit bzw. `fetchedAt`; Gültigkeit nur in `terms.effectiveDate`.
- **Fristen AGB:** neues künftiges `effectiveDate` → Eintrag an `pipeline/law/build-fristen.ts` übergeben, nie selbst schreiben (nur `build-fristen.ts` schreibt `public/data/fristen.json`, Schema → `gesetze-und-fristen`): `id` `agb-<doc-id>-<JJJJ-MM-TT>`, `kind: 'agb'`, deutscher `title`, `provider`, `document`, `date`, `dateKind: 'in_kraft'`, `status: 'verkuendet'` (hebt `build-fristen.ts` am Stichtag an), `sourceUrl` = `urlEffective` (kein Feld `url`), `verifiedAt`, `origin: 'automatisch'`, `storyId`; dazu in `announced`. Startwerte (bestätigt 2026-10-24): OpenAI Usage Policies **2026-11-20**, Anthropic AUP **2026-11-12**, Anthropic Supported Regions **2026-11-12**.
- **Fristen Modell-Abschaltung** (Standard laut Steckbrief): jeder erfolgreiche Abruf einer Deprecation-Seite übergibt die **vollständige** Liste künftiger Abschaltdaten an `build-fristen.ts` (auch im Erstlauf), nicht nur Neues: `{ sourceUrl, items: [{ provider, org, model, date, storyId?, replacement?, tentative? }] }` – `sourceUrl` = HTML-Fassung der Deprecation-Seite ohne `.md`/`.md.txt` (kein Feld `url`), `model` = API-Name, `org` = Watchlist-Schlüssel, `tentative: true` bei Anthropics „Tentative retirement date“, `storyId` falls vorhanden. Snapshot-Varianten eines Modells = ein Modell; nur Daten ≥ heute (Europe/Berlin). Gruppierung je Org und Abschalttag (`id` `modell-<org>-<JJJJ-MM-TT>`), `title`, `status`, `verifiedAt`, `note`, Größenregel (< 30 KB) und das Verwerfen verschobener oder zurückgezogener Daten übernimmt `build-fristen.ts` (Regeln → `gesetze-und-fristen`, Abschnitt „Übergaben“). Für Orgs mit eigener Deprecation-Seite hier (OpenAI, Anthropic, Google, Mistral) verwirft `build-fristen.ts` die OpenRouter-Übergaben aus `modelle-und-ranglisten`.
- **Stichtag** (Datum in Europe/Berlin), 07:07-Lauf: Regel-Story „Ab heute gilt: <Dokument> (<Anbieter>)", Scores von der Ankündigungs-Story, `ratedBy: 'regel'`; das Morgen-Briefing greift sie wie jede Story auf.
- **Wochenrückblick** (Sonntag 19:07, ersetzt das Abend-Update, Opus über das Abo): bekommt die `minor`-Einträge der Woche als Liste (Anbieter, Dokument, Datum, Netto-Wörter, Link), keine eigenen `terms`-Aufrufe; danach Liste leeren. Einträge älter als 8 Tage auch ohne Wochenrückblick verwerfen (der kommt erst in Phase 5).

## Neue Dokumente, Gegenprobe, Dokument hinzufügen

- **Hubs** (07:07-Lauf), Link-Mengen sortiert diffen: `https://openai.com/policies/` (`/policies/*`, 31 Links; Stufe C, bei Challenge auslassen – Node-`fetch` bekam auf `openai.com/policies/*` bisher immer 403, siehe Fallen), `https://www.anthropic.com/legal` (`/legal/*`, 15 Slugs), `https://legal.mistral.ai/terms/get-started` (`/terms/*`, 13 Slugs), `https://github.com/customer-terms` (10 Links, nur mit `Accept: text/html`), Llama-Lizenzseite (`llamaN/license`). Neuer oder entfernter Link → keine Story, sondern Hinweis an `pipeline/output/` für `meta.json`: `{ kind: 'agb', sourceId: '<hub-id>', text: 'Neues Dokument im <Hub>: <URL> – Aufnahme prüfen' (bzw. 'entfernt'), since }`, 14 Tage lang aus `hubs.<id>.fresh`. Aufnahme von Hand (Standard laut Steckbrief); die neue Link-Menge gilt sofort als Basis.
- **Gegenprobe** (Sonntag 07:07): OTA-primäre Dokumente der Stufe B einmal direkt holen, nur `effectiveDate` lesen; neuer als die letzte OTA-Fassung → OTA trackt kaputt → Laufzeit-Override `detect: 'direct'`, Health „OTA-Lücke" plus Hinweis `kind: 'agb'` (Register von Hand umstellen). Stufe C/D über Wayback: `https://web.archive.org/cdx/search/cdx?url=<host/pfad>&output=json&limit=-3&fl=timestamp,statuscode,digest,length&filter=statuscode:200` → `https://web.archive.org/web/<ts>id_/<url>` (Roh-HTML ohne Wayback-Leiste) → normalisieren, Datum vergleichen.
- **Hinzufügen:** (1) Seite einmal mit Node-`fetch` und der UA aus dem Steckbrief prüfen, nicht nur mit curl (siehe Fallen; Status, Bytes, Challenge-Text, Datum; Ausgabe kürzen); der Entwicklungs-PC hängt am selben Anschluss wie der Server (bis zum ersten Server-Smoke-Test unbestätigt). (2) OTA prüfen: `https://api.github.com/repos/OpenTermsArchive/genai-eu-versions/git/trees/main?recursive=1` (ohne Token 60/h reichen dafür) und Declaration; frisch → `detect: 'ota'`. (3) Register-Eintrag (id `<anbieter>-<dokument>`, Stufe, Selektor, Anker aus 5–10 Wörtern ohne Datum, `minChars`, `cadence`, `categoryHint`). (4) Fixture unter `pipeline/test/fixtures/terms/` – synthetisch oder < 20 Zeilen Auszug, nie Volltext –, `npm test`. (5) Zeile in `references/watchlist.md`. Erster Lauf = Baseline.

## Fallen

- **Node-Client ≠ curl** (gemessen 2026-10-24 von der privaten IP, über die auch der Heimserver ins Netz geht; Nachmessung mit der Steckbrief-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; …)`): `openai.com/policies/usage-policies/` mit Node-`fetch` (auch `node:https`) → 403 `cf-mitigated: challenge` (~10 KB), curl mit derselben UA → 200 (347 KB). `x.ai/legal/terms-of-service` mit Node-`fetch` → 403 „Attention Required! | Cloudflare" (5,5 KB, **ohne** `cf-mitigated`), curl → 200 (242 KB). Die Privat-IP löst das also nicht. Smoke-Test mit dem echten Node-Client fahren. Nicht den Client wechseln oder Browser-Header nachbauen, um durchzukommen: Sperre = Stufe C/D.
- `perplexity.ai/hub/legal/terms-of-service` gab Node-`fetch` bei der Nachmessung 200 (233 KB), früher Challenge → bleibt Stufe C mit OTA primär; erst nach einer Woche stabiler 200 im Server-Smoke-Test auf B heben.
- Cloudflare-Burst nicht deterministisch: die Terms-Recherche bekam beim sofortigen 2. Request eine Challenge (Text 0 Zeichen), der Recheck nicht. 4 parallele OpenAI-Requests → 403. Pro Host seriell.
- Challenge-Seite mit HTTP 200 ohne Validierung → falsche „Änderung" (Text → 0) und im nächsten Lauf die falsche Rückänderung.
- `github/site-policy` ist veraltet (letzter main-Commit 2026-05-29, Copilot-Datei „April 27, 2026", Docs „August 27, 2026") → github/docs-Atom `content/site-policy` + Docs-API.
- `github.com/customer-terms/*` ohne `Accept: text/html` → HTTP 500 mit `Content-Type: application/pdf`, auch mit Browser-UA.
- Google: Sprache/Währung nach IP (DE-IP bekam Deutsch) → immer `?hl=en` (OTA nutzt `hl=en-GB&gl=IE`); Help Center hat zufällige Ziffern-IDs → Hash ändert sich bei jedem Abruf; devsite-HTML hat dynamischen „Last updated"-Footer → `.md.txt`. ai.google.dev sendet `Last-Modified`, antwortet auf If-Modified-Since aber nie mit 304.
- Meta AI Terms: facebook.com liefert dem Bot-UA nur eine JS-Hülle (Text ~0), Browser-UA 400; `meta.ai/legal/terms` → 401 „Authentication required".
- Wayback: Availability-API (`archive.org/wayback/available`) gab bei jedem Versuch 429 → nur CDX. `id_` kommt mit `content-encoding: gzip`: curl braucht `--compressed`, Node-`fetch` entpackt selbst. CDX-`digest` gilt fürs Roh-HTML, kein Änderungssignal. Captures hinken hinterher (OpenAI Usage Policies: neuester am 2026-10-24 vom 2026-10-22).
- Datum sitzt bei Anthropic und Cursor in einem `<header>` **innerhalb** von `<main>` → pauschales Löschen von `header` verliert `effectiveDate`.
- `html-to-text`-Standard schreibt Überschriften in GROSSBUCHSTABEN und hängt Link-URLs an → jede Link-Änderung wird Diff-Rauschen.
- Text doppelt im HTML (Cursor: 63k sichtbar, 31k in `<main>`); Llama-Seite ohne `<main>`/`<article>`, Promo-Banner „… Hackathon … Apply Now" im Body.
- Datumsformate: DeepSeek `Last Update: Feb 10, 2026`, aber `Last-Modified` 2026-07-15 → Signal ist ETag/Hash; Perplexity-ToS-Datum nur im Sanity-JSON mit Ordinal („January 23rd, 2026"); Mistral-Models-Markdown mischt `2026-10-31` und `April 30, 2026`, die HTML-Fassung zeigt `M/D/YYYY`.
- Mistral-Models: `docs.mistral.ai/getting-started/models/models_overview/` leitet auf `/models` um (Next.js, 1,4 MB, Tabellendaten zwischen RSC-Payload und Klassen-Rauschen) → nur `https://docs.mistral.ai/models.md` (16,5 KB) parsen.
- Deprecation-Tabellen: naiv an jedem `|` splitten zerlegt OpenAIs Mehrfach-IDs (`\|`); `Not sooner than` als Datum gelesen schiebt jedes aktive Anthropic-Modell in die Fristen (Formate unter „Wesentlichkeit"). Vergangene Daten (`Retired`, Shutdown vorbei) nie als Frist übergeben.
- **Backup-Restore** legt alte Snapshots zurück → ohne Hash-Abgleich mit `docs.<id>.hash` erklärt Opus längst gemeldete Änderungen erneut (Tabelle „Erstlauf, Backup-Verlust").
- Ein lokaler Lauf mit dem Repo-`state/` und ohne Server-Snapshots sähe für jedes Dokument „Snapshot fehlt" → `state/terms-index.json` nie lokal schreiben oder pushen.
- OTA-`.diff`: bei Pfaden mit Leerzeichen hängt an `---`/`+++` ein Tab → Pfad aus `diff --git` lesen.
- OTA „kaputt statt unverändert": lange kein Commit kann Ausfall heißen (Cursor 13 Monate; contrib-Le-Chat holt `mistral.ai/terms/`, das jetzt auf eine 1,8k-Zeichen-Übersicht umleitet).
- Sitemaps: openai.com stempelt alle `lastmod` auf heute; anthropic.com stempelte am 2026-10-23T20:56Z Dutzende alte /research/-Seiten neu → `lastmod` nur mit Inhalts-Hash.
- Redirects: docs.anthropic.com → platform.claude.com, llama.com → dev.meta.ai, platform.openai.com/docs → developers.openai.com, `anthropic.com/supported-countries` → `/legal/supported-regions`, legal.mistral.ai hängt `/` an, `mistral.ai/terms` → Übersicht (nie als Dokument diffen). Wechsel von `urlEffective` loggen, Selektor und Anker prüfen.
- Preise nur per JS/Standort (chatgpt.com/pricing, one.google.com) → Beträge nicht beobachten.
- Große Seiten (Google Help 1,7 MB, Mistral 1,4 MB, MS Product Terms 1,3 MB, Anthropic Privacy 1,2 MB): nie Roh-HTML speichern oder loggen.
- GitHub-REST ohne Token: 60/h (in der Recherche schnell leer) → vom Server `AIPULSE_GITHUB_TOKEN` (5.000/h), nie den Deploy-Key; Atom, `.diff`, `.patch` und raw zählen nicht und bekommen keinen Token.

## Nach dem Bauen

- Diesen Skill aktualisieren: echte Dateinamen in `pipeline/terms/`, funktionierende Selektoren und Anker, gemessene Rausch-/Wesentlichkeitsquote, Smoke-Test-Ergebnis je Stufe vom Heimserver (gilt die Node-403 der Stufe C dort genauso?), Token je `terms`-Aufruf und Erklärungen pro Monat aus dem Kostenbuch, Umfang des Snapshot-Ordners, neue Fallen.
- `references/watchlist.md` pflegen (Dokumente, OTA-Status, Stufenwechsel).
- Phasenstand im Steckbrief ergänzen; Credits (OTA ODC-By) im Footer prüfen; neue Quellen auch im Katalog-Abschnitt von `quellen`.
