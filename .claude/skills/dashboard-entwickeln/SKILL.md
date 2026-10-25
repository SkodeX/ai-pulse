---
name: dashboard-entwickeln
description: Bauplan für das AI-Pulse-Dashboard (Vite 8, React 19, PWA nach Vorbild Space) – Service Worker, Hash-Routen, Komponenten, Datenladen aus public/data, localStorage, Fallen. Laden, bevor du an src/, vite.config.ts, dem Manifest oder der Datenanzeige arbeitest.
---

# Dashboard entwickeln

Grundsatz: Das Dashboard ist eine **statische PWA ohne Backend**. Es liest nur fertige JSON-Dateien aus `public/data/` (Datenvertrag und Typen im Steckbrief), rechnet nichts Teures und ruft keine fremden Server auf (einzige Ausnahme ab Phase 6: Feedback-Worker beim Klick). Die Daten schiebt der Heimserver 3× täglich ins Repo; jeder Push baut und deployt die Seite über `deploy.yml` neu (Skill `job-betrieb`). Alles hier ist Plan, Code gibt es noch nicht. Vorlage ist `E:\Coding\Space`: Dateien dort lesen und übernehmen, nicht neu erfinden. Fakten geprüft am 2026-10-24.

## Stack (von Space übernehmen)

- Versionen wie in Space (laut npm am 2026-10-24 aktuell): `react`/`react-dom` 19.3.1, `vite` 8.3.5, `typescript` 7.0.2, `@vitejs/plugin-react` 6.1.2, `vite-plugin-pwa` 2.0.0, `@vite-pwa/assets-generator` 2.0.0, `lucide-react` 1.61.0, `@fontsource-variable/inter` ^5.3.0, `@types/react`/`@types/react-dom` ^19.3.0. Neuere Versionen erst nehmen, wenn sie ≥ 14 Tage alt sind (gleiche Regel wie beim `hyparquet`-Pin).
- Nicht verwenden: react-router, UI-Bibliotheken, State-Manager, Datums-Bibliotheken, CSS-Frameworks. Stattdessen: Hash-Router aus Space, eigenes CSS mit Variablen, `Intl.*` für Datum und Zahlen, `useSyncExternalStore` für den Daten-Store.
- Kopiervorlagen in Space: `vite.config.ts`, `src/main.tsx` (`registerSW({ immediate: true })` aus `virtual:pwa-register`), `src/lib/router.ts` (≈ 25 Zeilen, `useRoute()` → `{ path, query }`, `navigate(path)`), `pwa-assets.config.mjs` (`minimal2023Preset` aus `public/logo.svg`, Skript `icons`), Kopf von `index.html` (`viewport-fit=cover`, `apple-mobile-web-app-*`), `src/components/Sheet.tsx` (am Handy ein Panel unten, Escape schließt), Safe-Area-Variablen und `100dvh` aus `src/styles/base.css`, Install-Hinweis aus `src/views/SettingsView.tsx`, `React.lazy` je Ansicht aus `src/App.tsx`.
- **Nicht** übernehmen: `src/i18n` (AI Pulse ist nur deutsch, Texte stehen direkt im Code bzw. in `src/texts.ts`), Supabase/Push, `StaleWhileRevalidate` für `/data/`, generische Cache-Namen.
- Fertige Konfigurationen (vite.config.ts, index.html, tsconfig, package.json-Ausschnitt, Icons): [references/konfiguration.md](references/konfiguration.md).

## Ordner (geplant)

```
shared/types.ts       Typen laut Steckbrief (Category, RunKind, Story, Briefing, Meta, Frist, Watchlist, Latest, ArchiveDay, IndexEntry, BriefingIndexEntry) – gemeinsam mit der Pipeline
shared/categories.ts  CATEGORY_KEYS (as const, Reihenfolge wie im Steckbrief) + Labels Schlüssel → Anzeige
shared/law.ts         LAW_STATUSES, LawStatus (Werte → Skill gesetze-und-fristen)
src/main.tsx  src/App.tsx        Shell: TopBar, StaleBanner, Routen-Weiche, BottomNav, Footer
shared/config.ts      öffentliche Konstanten an einer Stelle: REPO_URL, PAGES_URL, FEEDBACK_API_URL (auch Pipeline)
src/config.ts                    re-exportiert aus shared/config.ts; dazu CREDITS_FALLBACK, LEGAL_LINKS
src/lib/      router.ts  storage.ts (localStorage sicher)  format.ts (Intl)  sort.ts (rein, testbar)
src/data/load.ts                 Laden, Modul-Store, window.__pulse
src/components/  TopBar StoryCard ScoreBadge CategoryChips FilterBar BriefingPanel AdvisoryList StaleBanner Footer Sheet BottomNav InstallHint EmptyState
src/views/    TodayView (sofort geladen); CategoryView BriefingView SavedView SettingsView DeadlinesView RadarView ArchiveView (React.lazy)
src/styles/   base.css  components.css
```

- **`shared/` gehört Pipeline und Dashboard gemeinsam** (Steckbrief, Ordneraufbau). Das Dashboard importiert relativ zur Tiefe der Datei: aus `src/data/load.ts` → `import type { Story, Briefing, Meta } from '../../shared/types.ts'`, aus `src/App.tsx` → `'../shared/types.ts'`. Typen immer als `import type` (verlangt `verbatimModuleSyntax`; Node-Type-Stripping und Vite entfernen sie restlos). `LawStatus` kommt als `import type` aus `shared/law.ts`. Laufzeit-Importe aus `shared/` nur: `CATEGORY_KEYS` + Labels aus `categories.ts`, die Konstanten aus `config.ts` (über `src/config.ts`) und bei Bedarf `LAW_STATUSES` aus `law.ts` (unbekannten `law.status` ausblenden). Nichts aus `pipeline/` importieren (gehört nicht ins Bundle).
- **Kein Pfad-Alias** (`@shared/…`): Ein reiner Typ-Import ginge, aber Wert-Importe scheitern in den Node-Tests von `src/lib/` mit `ERR_MODULE_NOT_FOUND` (geprüft mit Node 24.20). Node kennt weder `paths` aus der tsconfig noch Vite-Aliasse.
- Die Typen `Latest` (`latest.json`), `ArchiveDay` (`archive/JJJJ/MM/TT.json`), `IndexEntry` (`index/JJJJ-MM.json`) und `BriefingIndexEntry` (`briefing/index.json`) stehen mit Namen und Feldern im Datenvertrag des Steckbriefs und liegen in `shared/types.ts` (laut Roadmap in Phase 1 zuerst angelegt; Schreiber der Dateien: `pipeline/output/`, Skill `bewertung`). Das Dashboard übernimmt sie, erfindet keine Felder und definiert keine eigenen Kopien der Typen. Ändert sich ein Typ, schlägt `npm run typecheck` in Pipeline und Dashboard gleichzeitig an. Genau das ist gewollt.
- Importe mit `.ts`/`.tsx`-Endung (`allowImportingTsExtensions`), damit reine Module (`sort.ts`, `storage.ts`) auch unter Node testbar sind. Tests als `src/lib/<name>.test.ts` in `npm test` mit aufnehmen. Sie brauchen Node-Typen (`node:test`) und gehören deshalb nicht in `tsconfig.app.json`, sondern in eine eigene `tsconfig.test.json` (siehe Konfiguration).

## Routen (Hash-Router)

| Route | Inhalt | Daten | Phase |
|---|---|---|---|
| `#/heute` (auch leer und `#/`) | BriefingPanel oben, darunter die Top-Stories aller Kategorien; ab Phase 4 Neben-Advisories nur als Zeile „+ 14 weitere Advisories“ → `#/kategorie/sicherheit` | `latest.json`, `briefing/latest.json` | 3 |
| `#/kategorie/<key>` | Chips-Leiste + Liste einer Kategorie; `key` nicht in `CATEGORY_KEYS` → `#/heute`. Bei `sicherheit` ab Phase 4 unter den Karten die eingeklappte AdvisoryList „Weitere Advisories“ | `latest.json` | 3 / 4 |
| `#/briefing` | aktuelles Briefing komplett; ab Phase 5 Archivliste und `#/briefing/<id>` | `briefing/latest.json`, `briefing/index.json`, `briefing/JJJJ/<id>.json` | 3 / 5 |
| `#/gemerkt` | gemerkte Stories als Snapshot aus localStorage (bleiben auch nach 72 h), Zähler „123 von 300“ | – | 3 |
| `#/einstellungen` | Anzeigeoptionen, Install-Hinweis, „Lokale Daten löschen“, ab Phase 6 Feedback-Token | – | 3 / 6 |
| `#/fristen` | Stichtage zu Gesetzen, Gerichten, AGB und Modell-Abschaltungen (`kind`) nach Datum, mit Status und Countdown | `fristen.json` | 4 |
| `#/radar` | Anbieter-Watchlist (Rang, Rating, Aufsteiger, „Alias fehlt“) + Firmen-Radar | `watchlist.json`, `index/*.json` | 5 |
| `#/archiv?q=…&von=JJJJ-MM&bis=JJJJ-MM` | Suche im Monatsindex; Monatsauswahl von `meta.firstMonth` bis zum aktuellen Monat (Europe/Berlin); ein Treffer klappt auf und lädt seinen Tag | `index/JJJJ-MM.json`, `archive/JJJJ/MM/TT.json` | 5 |

- Leerer Hash → `location.replace('#/heute')`, dann entsteht kein zusätzlicher Verlaufseintrag.
- Listen verstehen `?s=<storyId>`: zur Karte scrollen und sie kurz hervorheben. Das ist das Ziel der Links im Briefing. Fehlt die Story (aus dem 72-h-Fenster gefallen), den Text ohne Link zeigen.
- **Briefing-Dateien** (Steckbrief): `briefing/JJJJ/JJJJ-MM-TT-<kind>.json` in Jahresordnern, `<kind>` = `morning` · `midday` · `evening` · `weekly`. Ab Phase 5 gibt es sonntags kein `evening`: Der Wochenrückblick (`weekly`, 19:07) **ersetzt** das Abend-Update, auch in `briefing/latest.json`. Bis dahin ist Sonntag 19:07 ein normaler `evening`-Lauf mit „Seit heute früh“-Briefing (Steckbrief).
- `<id>` im Hash = Dateiname ohne Jahresordner und `.json`, z. B. `#/briefing/2026-10-25-weekly`. Vor dem Laden gegen `/^(\d{4})-\d{2}-\d{2}-(morning|midday|evening|weekly)$/` prüfen, den Pfad selbst bauen: `` `data/briefing/${jahr}/${id}.json` `` (`jahr` = erste Gruppe). Hash-Inhalt nie ungeprüft in einen Pfad stecken.
- Das Morgen-Briefing des Tages lässt sich ohne Index laden: `briefing/<JJJJ>/<Datum>-morning.json` mit dem Datum von `briefing.generatedAt` in Europe/Berlin (`Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' })` liefert `JJJJ-MM-TT`), nicht dem Gerätedatum (zwischen 00:00 und 07:07 gibt es für „heute“ noch keins). BriefingPanel verlinkt es bei `midday`, `evening` und `weekly`; bei 404 den Link weglassen.
- **Archivliste** (Phase 5) nur aus `briefing/index.json` (`{ file, kind, generatedAt, title }[]`, Pages kann keine Ordner auflisten): neueste zuerst, nach Monat gruppiert, Umschalter „Nur Wochenrückblicke“ (`kind === 'weekly'`). Aus `file` nur den Basisnamen ohne `.json` als `<id>` nehmen und gegen das Regex prüfen; so ist egal, ob `file` den Jahresordner enthält (Form legt Skill `bewertung` fest). Nicht passende Einträge überspringen. Keine 404-Raterei über Datumsreihen.
- Navigation über `<a href="#/…">`, Aktionen über `<button>`. Bei jedem Ansichtswechsel nach oben scrollen.
- BottomNav für den Daumen, höchstens 5 Einträge. Phase 3: Heute · Kategorien (öffnet die zuletzt genutzte Kategorie, sonst `modelle`) · Briefing · Gemerkt · Einstellungen. Ab Phase 4/5 kommen Fristen, Radar, Archiv und Einstellungen unter „Mehr“ (Sheet).

## Daten laden (`src/data/load.ts`)

- Pfade **relativ** zur Seite: `fetch('data/latest.json', { cache: 'no-cache' })` (gleichwertig: `import.meta.env.BASE_URL + 'data/…'`, bei `base: './'` ist das `./`). Nie `/data/…`.
- Beim Start parallel laden: `latest.json`, `briefing/latest.json`, `meta.json`. Erst beim Öffnen der Ansicht: `fristen.json`, `watchlist.json`, `briefing/index.json`. Für Archiv und Radar alle `index/JJJJ-MM.json`, die das Zeitfenster berührt (für 7 + 28 Tage bis zu 3 Dateien), aber **nie vor `meta.firstMonth`** (davor gibt es keine Dateien). `archive/JJJJ/MM/TT.json` erst, wenn ein Archivtreffer aufgeklappt wird. Ein 404 für einen Monat ab `firstMonth` = leerer Monat, kein Fehler.
- `cache: 'no-cache'` heißt Revalidierung per ETag (304 ist billig). Grund: Pages sendet `Cache-Control: max-age=600`. Keine Anhängsel wie `?t=Date.now()`, sonst wird jede URL ein eigener SW-Cache-Eintrag.
- Modul-Store (`Map<pfad, Promise>` + `useSyncExternalStore`): Jede Datei wird einmal geladen und von allen Ansichten geteilt, beim Ansichtswechsel wird nichts neu geladen. Den Abruf nicht im Effekt-Cleanup einer Komponente abbrechen, sonst ist das geteilte Promise für alle verworfen. Ein fehlgeschlagenes Promise aus der Map entfernen, damit „Erneut versuchen“ wirklich neu lädt.
- Neu laden nur bei `visibilitychange` → sichtbar, und nur wenn der letzte Abruf > 5 min her ist (kein Polling). Bei neuer `buildId` die Liste nicht unter dem Daumen austauschen. Stattdessen eine Pille zeigen: „Neue Meldungen – tippen zum Aktualisieren“.
- Tolerant parsen: Stories ohne Pflichtfelder (`id`, `title`, `url`, `category`, `impact`, `personal`, `score`, `firstSeen`) oder mit unbekannter Kategorie überspringen und in `__pulse.counts.skipped` zählen. Fehlende optionale Felder sind normal (alte Archive, `ratedBy: 'regel'` ohne `summary`).
- Fehlerzustände: kein Netz und kein Cache → „Daten gerade nicht erreichbar“ + „Erneut versuchen“. Offline mit Cache → normal anzeigen, Kopfzeile „Offline · Stand …“.
- **Daten nie ins JS-Bundle:** kein `import` aus `public/data/`, kein `resolveJsonModule` für Daten.
- Typen nur aus `shared/types.ts` (dazu `LawStatus` aus `shared/law.ts`). Die Form von `fristen.json` legt Skill `gesetze-und-fristen` fest, die von `watchlist.json` Skill `modelle-und-ranglisten`. Das Dashboard liest nur.
- **`meta.json` = Typ `Meta` aus dem Steckbrief.** Das Dashboard nutzt: `generatedAt`, `buildId`, `run` (Kopfzeile, StaleBanner, Footer), `firstMonth` (`'JJJJ-MM'`, Untergrenze aller Monatslisten), `health` (Footer, Sheet; Werte → Skill `quellen`), `budget` (`level` `'abo' | 'api' | 'aus'` = Claude-Backend des letzten Laufs, `apiUsdMonth`, `apiUsdCap`, optional `resetHint`), `notices[]` (`kind` `quelle` · `agb` · `recht` · `token` · `system`, optional `sourceId`, `text`, `since`) und `credits[]`. Stufe und Grenze kommen fertig aus der Pipeline; nichts davon im Client nachrechnen oder hart codieren.
- `meta.json` tolerant lesen: Fehlt die Datei oder ein Teil, zeigt der Footer den Rest; Credits fallen auf `CREDITS_FALLBACK` zurück, `firstMonth` auf den Monat von `latest.generatedAt`. Unbekannte `budget.level`- oder `notices[].kind`-Werte nicht verwerfen: Stufe ausblenden, Hinweis mit neutralem Icon zeigen.
- **Archiv-Quelle:** `index/*.json` hat nur `src` (Register-ID). Den Quellennamen nicht aus der Pipeline-Konfiguration importieren (`pipeline/config/sources.ts` gehört nicht ins Bundle), sondern den Hostnamen aus `url` zeigen (`new URL(url).hostname` ohne `www.`).
- Firmen-Radar (Phase 5) im Browser aus dem Index rechnen: Erwähnungen je `tags`-Eintrag in den letzten 7 Tagen gegen das Wochenmittel der 28 Tage davor, Funding-Ereignisse = Einträge mit `category: 'funding'`. Neue Orgs aus `watchlist.json`: `newOrgs` (neue OpenRouter-Präfixe und HF-Trending-Orgs der letzten 28 Tage) und `providers[].trend === 'new'` (Form → Skill `modelle-und-ranglisten`; `state/` wird nicht deployt). Startschwelle für „aufstrebend“: ≥ 3 Erwähnungen in 7 Tagen und ≥ 2× das Wochenmittel; mit echten Daten nachjustieren.

## Sortierung und Filter (`src/lib/sort.ts`, reine Funktionen)

- Sortschlüssel = Feldname: `score` (Anzeige „Gesamt“, Standard), `impact` („Tragweite“), `personal` („Für mich“). `score` = (impact + personal) / 2 kommt fertig aus der Pipeline, nicht neu rechnen. Gleichstand: `score` → `impact` → `firstSeen` (wie die Pipeline laut `bewertung`), `impact` → `personal` → `firstSeen`, `personal` → `impact` → `firstSeen`; `firstSeen` immer neueste zuerst.
- Mindest-Score (aus · 5 · 6 · 7 · 8) gilt für den Wert der aktiven Sortierung.
- Zeitraum innerhalb von `latest.json`: Heute (ab 00:00 Europe/Berlin) · 24 h · 72 h (Standard). Zeitbasis ist immer `firstSeen`, nicht `publishedAt` (siehe Fallen). Längere Zeiträume gehören ins Archiv.
- Firma/Modell: Chips für die 12 häufigsten `tags` im geladenen Stand, Mehrfachauswahl verknüpft mit ODER.
- Textsuche über `title`, `originalTitle`, `summary`, `tags`, `sources[].name`. Beide Seiten normalisieren: `toLocaleLowerCase('de')`, NFKD, Kombinationszeichen (`\p{M}`) entfernen, `ß` → `ss`. 72 h sind wenige hundert Stories, also im Speicher filtern; `useDeferredValue` reicht.
- Heute zeigt zuerst 20 Karten, dann Knopf „Weitere 20“. Gelesene werden abgeblendet oder, als Option, ausgeblendet. Knopf „Alle sichtbaren als gelesen“.

## Komponenten

- **StoryCard** (`<article data-story={id}>`):
  - Kopf: CategoryChip (Icon + Kurzname), Zeit („vor 3 Std.“), Badges `Tragweite 8` / `Für mich 6`, bei Sortierung „Gesamt“ vorn zusätzlich `score` („7,5“). Die aktive Sortierung ist hervorgehoben; immer Zahl + Text, nie nur Farbe. Dazu bei Bedarf `Paywall` (Lock), `Hype?` (Megaphone) und `ohne KI bewertet` bei `ratedBy === 'regel'`.
  - Titel als Link auf `url` (`target="_blank" rel="noopener noreferrer"`); der Klick markiert die Story als gelesen.
  - `summary` ist sichtbar, `whyImportant` („Warum wichtig“) und `forYou` („Für mich“) stecken in `<details>`. Ein Label „Für mich“ für Sortierung, Badge und Details – nie „Für dich“ daneben.
  - Quellen: die ersten 2 Namen als Links, der Rest als „+3 Quellen“, englische mit „EN“ markiert.
  - Zusatzzeile, falls das Feld da ist: `law` (Status, Rechtsraum, gilt ab), `security` (Schweregrad, CVEs, „wird aktiv ausgenutzt“, Produkte), `terms` (Anbieter, Dokument, gilt ab, Auszug).
  - Fuß: Knöpfe Gelesen und Merken (`aria-pressed`), ab Phase 6 👍 „Mehr davon“ und 👎 „Weniger davon“.
  - **👎 blendet die Karte nur lokal ab** (Steckbrief, Standardwert): `aipulse.votes[id].vote === -1` → `data-vote="down"`, schwächer dargestellt, bleibt an ihrem Platz in der Sortierung, „Gelesene ausblenden“ blendet sie nicht aus. Der Zustand steht zusätzlich als Text (👎-Knopf `aria-pressed="true"`). Erneutes Tippen setzt `vote: 0`. Das Abblenden hängt nur an `aipulse.votes`, nicht an Token oder Worker-URL.
- **AdvisoryList** „Weitere Advisories“ (Phase 4, Regeln aus Skill `sicherheitsluecken`): Neben-Advisory = `category === 'sicherheit' && ratedBy === 'regel' && !summary` (nur Advisory-Gruppen: zusätzlich `clusterKey.startsWith('sec:')`). Solche Stories bekommen nie eine volle Karte. In `#/kategorie/sicherheit` stehen sie unter den Karten in einem eingeklappten `<details>` „Weitere Advisories (14)“, auf `#/heute` nur als Linkzeile. Je Eintrag eine kompakte Zeile **ohne `summary`**: Schweregrad, Titel als Link (Klick = gelesen), Produkte, erste CVE + „+2“, „wird aktiv ausgenutzt“, Zeit. Gleiche Filter und Sortierung wie die Hauptliste, keine Merken-/Feedback-Knöpfe. Ausnahme: `meta.budget.level === 'aus'` → der ganze Lauf ist regelbewertet, dann keine Abtrennung (siehe Fallen).
- **BriefingPanel**: `title`, `intro`, `items[]` (Text + Link `#/heute?s=<storyId>`), `outlook` und die Zeile „erstellt mit Claude Opus 5.5“ (aus `model`; im Notfall-Backend steht dort `claude-haiku-5-5`; `model: 'regel'` = Regel-Briefing ohne Claude → „ohne KI erstellt“). Überschrift aus `kind`, nicht aus Uhrzeit oder Wochentag: `morning` „Das Wichtigste“, `midday`/`evening` „Seit heute früh“, `weekly` „Wochenrückblick“. Ab Phase 5 liegt sonntags ab 19:07 der Wochenrückblick in `briefing/latest.json` (kein Sonntags-`evening`); vorher kommt sonntags ein normales `evening`. Das Panel ist einklappbar. Eingeklappt bleibt es nur für dieses `generatedAt`; ein neues Briefing ist wieder offen.
- **FilterBar** (sticky unter der Kopfzeile): Suchfeld + Knopf „Filter“ mit der Zahl aktiver Filter. Er öffnet ein Sheet mit Sortierung (Segment Gesamt/Tragweite/Für mich), Mindest-Score, Zeitraum, Firma/Modell, „Gelesene ausblenden“ und „Zurücksetzen“. Darunter die CategoryChips, horizontal scrollbar. Jeder Chip ist ein Link auf `#/kategorie/<key>`, der aktive führt zurück auf `#/heute`. Im Chip steht die Zahl der ungelesenen Stories.
- **Frische** (Steckbrief: 14 h Hinweis, 24 h Banner), gemessen an `meta.generatedAt` (fehlt `meta.json`: `latest.generatedAt`) gegen die Gerätezeit:
  - ab 14 h: Stand-Anzeige in der Kopfzeile bekommt Icon `ClockAlert`, Warnfarbe und den Zusatz „· Update überfällig“ (nie nur Farbe). Die längste reguläre Lücke ist 19:07 → 07:07, also 12 h; der Watchdog meldet ebenfalls ab 14 h.
  - ab 24 h: **StaleBanner** über der Liste (Text in den UI-Texten).
  - Neu rechnen bei jedem Sichtbarwerden und alle 10 min (nur Uhrzeit, kein Abruf).
- **Footer** (von oben nach unten, alles Phase 3):
  - Stand, Lauf, `buildId` und App-Version.
  - **Claude-Backend des letzten Laufs** aus `meta.budget.level`: `abo` · `api` (mit `apiUsdMonth` von `apiUsdCap`, `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' })` → „1,20 $“) · `aus` (mit `resetHint`, falls vorhanden). Bei `abo` und `apiUsdMonth > 0` den Monatsverbrauch des Notfall-Backends als Zusatz. Texte in den UI-Texten.
  - Quellen-Health aus `health.counts` („41 ok · 2 gestört · 1 blockiert“); Tippen öffnet ein Sheet mit `health.issues` (Name, Status, seit, „abgedeckt durch …“ aus `coveredBy`) und `health.stale` („Lange nichts Neues: …“, Anzeigenamen wie geliefert – das Dashboard kennt das Register nicht).
  - **Hinweise** aus `notices[]`, nur wenn vorhanden: Reihenfolge `token` → `system` → Rest, innerhalb nach `since` neueste zuerst; je Hinweis Icon nach `kind`, Art-Label, `text` als Text, „seit 20.10.“. Der `token`-Hinweis (Abo-Token läuft bald ab) ist für den Betreiber gedacht und darf öffentlich stehen; er enthält nie das Token selbst.
  - Credits und ein Link zum Repo `SkodeX/ai-pulse`.
  - **Platz für „Impressum“ · „Datenschutz“** in der letzten Zeile: offene Entscheidung des Nutzers vor dem Livegang (Steckbrief, Offene Punkte). Gerendert wird nur, was `LEGAL_LINKS` in `src/config.ts` enthält (anfangs leer → Zeile entfällt). Keine Platzhalter- oder Mustertexte erfinden, keine Rechtsfragen selbst entscheiden. Entscheidet sich der Nutzer für eigene Seiten: Routen `#/impressum` und `#/datenschutz` mit Text aus `src/texts.ts`, sonst externe Links. Datenflüsse, die eine Datenschutzerklärung nennen müsste: Hosting auf GitHub Pages (GitHub protokolliert laut Pages-Doku die IP jedes Besuchers „for security purposes“, geprüft 2026-10-24), ab Phase 6 Feedback-Klick an den Cloudflare-Worker, sonst nur localStorage im Browser; keine Cookies, keine fremden Schriften oder Bilder.
- Credits immer zeigen, auch wenn `meta.json` fehlt (`CREDITS_FALLBACK` in `src/config.ts`): Arena-Dataset (CC-BY-4.0) https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset · Epoch AI (CC-BY-4.0) https://epoch.ai/benchmarks/use-this-data · Artificial Analysis über OpenRouter https://artificialanalysis.ai/ und https://openrouter.ai/ · Open Terms Archive (ODC-By) https://opentermsarchive.org/ (alle geprüft: 200). Liefert `meta.credits` Einträge, gelten diese.
- Kategorie-Tabelle (Kurzname, lucide-Icon), Labels und alle UI-Texte: [references/ui-texte.md](references/ui-texte.md).

## Lokaler Zustand (localStorage)

Alle Keys beginnen mit `aipulse.`, denn alle Pages-Projekte teilen den Origin `skodex.github.io` und damit auch das Speicherkontingent. Zugriff nur über `src/lib/storage.ts`: Jedes `getItem`, `setItem` und `JSON.parse` steht in try/catch und fällt bei Fehlern auf den Standardwert zurück. Die App muss auch ganz ohne Speicher laufen. Objekte bekommen ein Versionsfeld `v: 1`.

| Key | Inhalt | Phase |
|---|---|---|
| `aipulse.read` | `{ v: 1, ids: { [storyId]: tagNr } }` mit `tagNr = Math.floor(Date.now() / 864e5)`; beim Start Einträge > 30 Tage löschen | 3 |
| `aipulse.saved` | `{ v: 1, items: SavedStory[] }`, Snapshot aus `id, title, url, category, impact, personal, score, sources (name, url), summary?, savedAt`, weil `latest.json` nur 72 h hält. **Höchstens 300** (Steckbrief): Der 301. wird nicht gespeichert, der Knopf bleibt aus und ein Hinweis erscheint (Text in den UI-Texten); nie still das älteste löschen | 3 |
| `aipulse.sort` | `'score' \| 'impact' \| 'personal'` | 3 |
| `aipulse.filters` | `{ v: 1, minScore, range: 'today' \| '24h' \| '72h', tags: string[], hideRead }`; den Suchtext nicht speichern | 3 |
| `aipulse.display` | `{ v: 1, compact, lastCategory?, briefingCollapsedFor?, installHintDismissed? }` | 3 |
| `aipulse.feedbackToken` | Schreib-Token für den Worker, wird einmal in den Einstellungen eingegeben; nie loggen, nie in `__pulse` | 6 |
| `aipulse.votes` | `{ v: 1, votes: { [storyId]: { vote: 1 \| -1 \| 0, ts, pending } } }`, eigene Stimmen und noch nicht gesendete Votes; `-1` blendet die Karte ab (StoryCard). Form und Sende-Regeln → Skill `feedback-worker` | 6 |

- Das `storage`-Event abonnieren, damit zwei Tabs synchron bleiben. „Lokale Daten löschen“ entfernt nur `aipulse.*`, nie fremde Keys.
- Feedback (Phase 6): Endpunkt, Token-Regeln, CORS und Validierung stehen im Skill `feedback-worker`. Die Worker-URL steht als öffentliche Konstante `FEEDBACK_API_URL` in `shared/config.ts` (einzige Stelle laut Steckbrief, `src/config.ts` re-exportiert sie); `VITE_FEEDBACK_URL` überschreibt sie nur lokal (z. B. `.env.local` → `http://localhost:8787`). Ohne URL oder Token die Feedback-Knöpfe ausblenden statt einen Fehler zu zeigen.

## PWA und Service Worker

- `base: './'`. Manifest: `name` und `short_name` „AI Pulse“, `lang: 'de'`, `display: 'standalone'`, `start_url: './'`, `scope: './'`, Icons wie in Space (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`).
- `registerType: 'autoUpdate'` + `registerSW({ immediate: true })`: vite-plugin-pwa erzwingt dann `skipWaiting`/`clientsClaim`, und eine neue Version lädt offene Fenster neu (https://vite-pwa-org.netlify.app/guide/auto-update).
- `workbox.globIgnores` enthält `'data/**'`, Daten liegen nie im Precache. Die Daten-Route läuft über `NetworkFirst` mit `cacheName: 'aipulse-data'`, `networkTimeoutSeconds: 4`, `fetchOptions: { cache: 'no-cache' }` und `expiration: { maxEntries: 60, maxAgeSeconds: 14 * 86400 }` (Optionen: https://developer.chrome.com/docs/workbox/modules/workbox-build). Nach dem Timeout liefert der SW den Cache-Stand. Deshalb immer „Stand“ anzeigen und beim nächsten Sichtbarwerden neu laden.
- Von Inter nur latin und latin-ext precachen. Space precacht alle 7 Inter-Subsets mit.
- Install-Hinweis einmal auf `#/heute` zeigen, wenn weder `matchMedia('(display-mode: standalone)').matches` noch `navigator.standalone` zutrifft. iPhone: „Teilen → Zum Home-Bildschirm → Hinzufügen“, sonst „Im Browsermenü: App installieren“ (Muster aus Space, ohne `beforeinstallprompt`).
- Lighthouse hat seit v12 keine PWA-Kategorie mehr (https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0). Das Roadmap-Kriterium „Lighthouse-PWA ok“ deshalb von Hand prüfen: Manifest wird geladen, SW ist aktiv, die App startet offline mit dem letzten Stand, die Installation klappt auf iPhone und Android. Lighthouse nur noch für Performance und Barrierefreiheit nutzen.

## Mobil, Barrierefreiheit, Texte

- Mobile first, Einhandbedienung am iPhone: BottomNav und Kartenknöpfe liegen im Daumenbereich, Tippziele ≥ 44 × 44 px. Dazu Safe Areas (`env(safe-area-inset-*)`), `100dvh`, Hell/Dunkel über `prefers-color-scheme` mit zwei `theme-color`-Metas und `prefers-reduced-motion`.
- `<html lang="de">`. Originaltitel (`ratedBy === 'regel'` und `sources[0].lang === 'en'`) bekommen `lang="en"`. Icon-Knöpfe haben ein deutsches `aria-label`, Umschalter `aria-pressed`. Die Trefferzahl nach einem Filterwechsel steht in einer `aria-live="polite"`-Zeile. Fokus sichtbar, Skip-Link „Zum Inhalt“, Kontrast ≥ 4,5 : 1 in beiden Farbschemata.
- Texte: du-Form, kurz, ohne Fachjargon („Tragweite“ statt „Impact“, „gestört“ statt „degraded“, „Quellen“ statt „Cluster“). Zahlen und Daten über `Intl` mit `timeZone: 'Europe/Berlin'` („Sa., 24.10., 13:07“, Score „7,5“). Eingabefelder mit Schriftgröße ≥ 16 px.
- Fremdinhalte: Nur `http(s)`-URLs werden als `href` gerendert, Texte nur als Text (kein `dangerouslySetInnerHTML`, Markdown-Zeichen in Claude-Texten nicht interpretieren). Keine Bilder, Favicons oder Schriften von fremden Servern laden: Jeder Abruf verrät die IP, und Fontsource liegt ohnehin lokal.

## Performance

- `React.lazy` + `Suspense` für jede Ansicht außer `TodayView` (wie in Space `App.tsx`). Ziel für das Start-JS: ≤ 120 KB gzip. `vite build` zeigt die Größen; den echten Wert nach dem Bau hier eintragen.
- lucide nur mit benannten Importen (`import { Bookmark } from 'lucide-react'`). Eine Listen-Virtualisierung ist unnötig (höchstens ein paar hundert Karten, 20 pro Seite).
- Nichts, was sich je Lauf ändert, ins Bundle bringen. `define` nur mit der Version aus package.json wie in Space (siehe Fallen).

## Debug

- `window.__pulse` gibt es immer, auch im Build: `{ buildId, generatedAt, run, backend, firstMonth, counts: { stories, visible, minorAdvisories, read, saved, disliked, notices, skipped }, sort, filters, route, errors }` (`backend` = `meta.budget.level`). Klein halten: keine Story-Arrays, kein Token. `window.__lastError` über `error`, `unhandledrejection` und eine Error-Boundary setzen.
- Nur bei `import.meta.env.DEV`: `window.__pulse.override({ generatedAt: '2026-10-20T07:07:00+02:00' })` mischt Werte in den geladenen Stand (auch `meta`-Teile wie `budget: { level: 'aus', … }` oder `notices`). So lassen sich Frische-Stufen, Backend-Zeile, Hinweise und Leerzustände ohne Dateien testen.
- Prüfablauf (Typecheck → Build → Vorschau, Browser-Pane über DOM/JS, `[data-story]` zählen) → Skill `sparsam-testen`. Für UI-Arbeit die vorhandenen Dateien in `public/data/` nehmen; keinen echten Claude-Lauf nur fürs Aussehen starten (verbraucht das Abo-Kontingent, das sich der Job mit dem Nutzer teilt).

`.claude/launch.json` (Ports laut Steckbrief, Muster aus Space):

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "pulse-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5175 },
    { "name": "pulse-preview", "runtimeExecutable": "npx", "runtimeArgs": ["vite", "preview", "--port", "4175", "--strictPort"], "port": 4175 }
  ]
}
```

## Fallen

- **Absoluter Datenpfad** `/data/latest.json`: Lokal geht er, auf Pages zeigt er auf `skodex.github.io/data/` (404 oder Datei eines anderen Projekts). Symptom: Die Seite ist nur online leer.
- **`max-age=600` von Pages** (gemessen): Ohne `cache: 'no-cache'` in Seite und SW zeigt die App bis zu 10 min nach einem Lauf den alten Stand, das „Stand“ im Footer hinkt hinterher.
- **`StaleWhileRevalidate` aus Space kopiert**: Die App zeigt immer den vorletzten Lauf, der neue Stand erscheint erst nach dem zweiten Neuladen.
- **Werte, die sich je Lauf ändern, im Bundle** (`define: { __BUILD_ID__ }`, Datum, Daten-Import): Jeder der 3 täglichen Deploys erzeugt neue Asset-Hashes, also einen neuen SW. autoUpdate lädt dann offene Tabs neu, und der Leser verliert Scrollposition und Eingaben. Ohne solche Werte bleibt `sw.js` bei reinen Datenläufen unverändert.
- **Daten im Precache** (`json` in `globPatterns` oder `globIgnores` vergessen): Die Daten frieren auf dem Stand des letzten SW-Updates ein.
- **`urlPattern`-Funktion** landet als Quelltext in `sw.js` (im Space-Build sichtbar). Darin also keine Variablen oder Importe aus `vite.config.ts` verwenden, nur `url`, `request` und `self`. Es greift die erste passende Route.
- **Geteilter Origin:** Cache-Namen ohne Präfix kollidieren mit Space (`weather`, `geocoding`), darum `aipulse-data`. Das localStorage-Kontingent teilen sich alle Projekte: `QuotaExceededError` beim Merken abfangen und melden („Speicher voll – lösche ältere Merkzettel“).
- **localStorage wirft** (gesperrte Website-Daten, privater Modus): Ohne try/catch gibt es beim Start eine weiße Seite.
- **`publishedAt` stimmt nicht oder fehlt:** Der Bundesrat-Feed hatte ein Item auf 2026-12-16 vordatiert, das Federal Register eines auf 2026-10-26. Der Bundestag-Feed `digitales.rss` (hib) und der BNetzA-Feed liefern gar kein Datum. Sortierung und Zeitfilter laufen deshalb über `firstSeen`; `publishedAt` nur anzeigen, wenn es ≤ jetzt ist.
- **Briefing verweist auf eine fehlende Story** (aus den 72 h gefallen, oder Archiv-Briefing): kein Absturz, den Text ohne Link zeigen.
- **Briefing-Pfad ohne Jahresordner** (`briefing/2026-10-24-morning.json`): 404. Archivdateien liegen immer unter `briefing/JJJJ/`.
- **Sonntags kein `evening` (ab Phase 5):** Code, der für jeden Tag ein `-evening.json` erwartet (z. B. „nächstes Briefing“ per Datumsrechnung), läuft sonntags ins 404; umgekehrt gibt es vor Phase 5 kein `weekly`. Blättern nur über `briefing/index.json`, Überschrift nur aus `kind`.
- **`budget.level === 'aus'` und Neben-Advisories:** Dann ist jede neue Story `ratedBy: 'regel'`. Ohne die Ausnahme in der AdvisoryList landen alle Security-Meldungen in der Kurzliste, und Heute zeigt keine einzige Security-Karte – auch nicht eine aktiv ausgenutzte Lücke.
- **Monatslisten aus dem Gerätedatum zurückgerechnet:** 404-Kaskade für Monate vor dem Projektstart. Untergrenze ist immer `meta.firstMonth`.
- **Notfall-Grenze hart codiert** (3,36 USD): Ändert der Nutzer die Grenze in `pipeline/config/models.ts`, zeigt der Footer Unsinn. Immer `apiUsdCap` aus `meta.json`.
- **`resetHint` geparst:** Die Form ist nicht festgelegt (Reset-Zeit aus der CLI-Limit-Meldung, Skill `claude-headless`, dort englisch wie „resets 3:45pm“). Nur als Text zeigen; ausschließlich einen ISO-Zeitstempel über `Intl` formatieren.
- **`health.issues[].coveredBy`:** ein `string` (Steckbrief und Skill `quellen`: Anzeigenamen der aktiven Fallbacks, mit „, “ verbunden; fehlt ohne Fallback). Nicht als Array behandeln; fehlt das Feld, „abgedeckt durch …“ weglassen.
- **StrictMode** führt Effekte im Dev doppelt aus. Startet eine Komponente den Abruf selbst, gibt es zwei Requests je Datei. Der Modul-Store verhindert das, weil er ein vorhandenes Promise wiederverwendet. StrictMode nicht entfernen.
- **Gleicher Hash löst kein `hashchange` aus:** Ein zweites Tippen auf denselben Briefing-Link scrollt nicht. Das Hervorheben zusätzlich im Klick-Handler auslösen.
- **Vorschau ohne `--strictPort`:** Vite weicht still auf den nächsten freien Port aus (https://vite.dev/config/server-options), und `preview_start` wartet auf 4175 vergeblich. Gleiches gilt für `server.strictPort` beim Dev-Port 5175.
- **Service Worker in der Vorschau** liefert alte Builds oder Daten → Abmelde-Snippet im Skill `sparsam-testen`.

## Nach dem Bauen

- Diesen Skill aktualisieren: echte Dateinamen, Komponenten, Routen, gemessene Bundle-Größe, neue Fallen. Plan-Formulierungen durch „gebaut (Phase X)“ ersetzen.
- Steckbrief nachtragen: Phasenstand (Routen, Dateien).
- Entscheidung des Nutzers zu Impressum/Datenschutz umsetzen (`LEGAL_LINKS`) und im Steckbrief unter Offene Punkte abhaken – vor dem Livegang in Phase 3.
- `.claude/launch.json` wie oben anlegen, falls sie noch fehlt.
- Am Handy prüfen: iPhone in Safari und als installierte App, außerdem Android Chrome. Prüfen, ob Gelesen/Gemerkt zwischen Safari und der installierten App getrennt sind; falls ja, im Install-Hinweis erwähnen.
- Credits im Footer mit der aktiven Quellenliste abgleichen: Kommt eine Quelle mit CC-BY oder Attributionspflicht dazu, den Credit ergänzen.
