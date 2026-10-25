# Clustering (Stufe 0a) und `state/seen.json`

Bauplan für `pipeline/cluster/` und die seen-Regeln (Skill `bewertung`). **In Phase 1 ist das die einzige Datei dieses Skills, die du lädst** (dazu Steckbrief, `quellen`, `sparsam-testen`, `windows-shell-fallen`). Stand 2026-10-24, noch kein Code. Schnittstellen laut Steckbrief: `RawItem[]` (nach dem Vorfilter, Eigentümer `quellen`) → Clustering → `Cluster[]` → ab Phase 2 Vor-Score und Claude-Stufen (SKILL.md).

## Was in welcher Phase gilt

| Teil | Phase 1 (`npm run collect`) | ab Phase 2 |
|---|---|---|
| URL-Gleichheit, Titel-Jaccard ≥ 0,5 | ja | ja |
| Watchlist-Regel (Schwelle 0,4) | nein | sobald Watchlist-Aliasse existieren (Phase 2 mit `pipeline/config/watchlist.ts`, spätestens Phase 4 mit der Alias-Tabelle aus `modelle-und-ranglisten`) |
| Abgleich-Basis `public/data/` → `existingStoryId` | gibt es noch nicht → alle Cluster neu | ja |
| `preScore` | fehlt | Stufe 0b (SKILL.md) |
| `seen.json` | nur Schatten-State `.cache/dry/state/` | `state/` im vollen Lauf |

**Abnahme Phase 1** (ROADMAP): `npm run collect -- --fresh` = Lauf 1 (Basis), ≥ 6 h später `npm run collect` = Lauf 2 mit 30–65 Clustern.

## Typ `Cluster` (`pipeline/types.ts`)

`RawItem` (Eigentümer `quellen`) und `Cluster` (Eigentümer `bewertung`) stehen in derselben Datei.

```ts
import type { Story } from '../shared/types.ts'

export interface Cluster {
  clusterKey: string           // vorgegebener RawItem.clusterKey, sonst vorläufig 'u-' + sha1(primary.canonicalUrl).slice(0, 12); Stufe 1 ersetzt nur vorläufige
  items: RawItem[]             // alle Mitglieder, Reihenfolge des Hinzukommens
  primary: RawItem             // Repräsentant → Story.url, originalTitle, Teaser für Stufe 1
  sources: Story['sources']    // primary zuerst, danach Reihenfolge des Hinzukommens, je sourceId einmal
  firstSeen: string            // frühestes items[].firstSeen
  publishedAt?: string         // frühestes items[].publishedAt (nie in der Zukunft)
  signals: {                   // aggregiert über items
    hnPoints?: number; hnComments?: number; upvotes?: number   // jeweils Maximum
    techmeme: boolean          // ein Item von Techmeme oder mit signals.techmemeUrl
    independentSources: number // Quellen verschiedener Redaktionen (Regel unten)
    releaseNotes?: string      // vom primary, sonst vom ersten Item mit Wert
  }
  existingStoryId?: string     // Treffer in der Abgleich-Basis oder seenStoryId → nur sources ergänzen, nicht an Claude
  preScore?: number            // 0–10, Stufe 0b (ab Phase 2)
}
```

- `sources[i]` = `{ id: sourceId, name: <Register-Name>, url: <canonicalUrl des ersten Items dieser Quelle>, lang }`.
- `independentSources` = Anzahl verschiedener Häuser: Register-Feld `outlet`, sonst `getDomainWithoutSuffix()` (`tldts`) der Register-URL – so zählen the-decoder.de und the-decoder.com einmal (Übersetzung derselben Redaktion), Techmeme und der Lab-Blog zweimal.
- Weitere Signale (z. B. Bluesky-Link-Signal) kommen mit ihren Quellen als optionale Felder dazu; Phase 1 bindet sie nicht an.
- Neue Story aus einem Cluster: `id = sha1(clusterKey).slice(0, 12)` (bei `existingStoryId` diese), `url = primary.canonicalUrl`, `originalTitle = primary.title`, `sources = Cluster.sources`, `firstSeen = Cluster.firstSeen`.

## `candidates.json`

`.cache/dry/<runId>/candidates.json` = `{ runId, generatedAt, window, clusters: Cluster[] }` (Steckbrief) – Ergebnis jedes Trockenlaufs und Eingabe für `--stage triage` (Phase 2).

- Reihenfolge: `preScore` ↓ (ab Phase 2), sonst `publishedAt ?? firstSeen` ↓.
- `report.md`: „Cluster k" in der Kopfzeile zählt nur Cluster **ohne** `existingStoryId`. Darunter eine Zeile „angehängt j · seen verworfen i" (Items, die an bestehende Stories gingen bzw. per seen-Treffer wegfielen).

## Ablauf

1. **Eingabe:** `RawItem[]` nach dem Vorfilter (Dedupe innerhalb des Laufs nur je `(sourceId, key)`, Skill `quellen` – dieselbe URL aus verschiedenen Quellen kommt hier mehrfach an). `RawItem.canonicalUrl` kommt fertig mit und wird nicht neu berechnet. Original-URL statt Aggregator-Link (Techmeme: erstes `<A HREF>` der description; HN: Feld `url`) setzt der Parser.
2. **`canonicalUrl()`** gibt es genau einmal, in `pipeline/lib/url.ts` (Steckbrief). Startwerte der Optionen, beim Bauen per Fixture-Test eingefroren (jede Änderung verschiebt alle `seen`-Keys): `normalizeUrl(u, { stripHash: true, stripWWW: true, removeQueryParameters: [/^utm_/i, 'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'], sortQueryParameters: true, removeTrailingSlash: true })`.
3. **Vorgegebene Schlüssel:** Items mit `RawItem.clusterKey` (Fach-Skills: `sec:…`, `terms:…`, Preis-/Deprecation-Schlüssel, `fristenquelle-…`, Detektor-Slugs; in Phase 1 praktisch keine) bilden je Schlüssel einen Cluster und behalten ihn. Items mit **verschiedenen** vorgegebenen Schlüsseln nie zusammenlegen.
4. **seen-Treffer mit Story** (`RawItem.seenStoryId`, durchgereicht vom Vorfilter): Story nicht (mehr) in der Abgleich-Basis oder `sourceId` schon in deren `sources` → verwerfen (Zähler „seen verworfen"), sonst Cluster mit `existingStoryId = seenStoryId` (ohne Claude). In Phase 1 gibt es keine Abgleich-Basis → solche Items fallen weg.
5. **URL-Gleichheit:** gleiche `canonicalUrl` → gleicher Cluster (Union-Find); ab Phase 2 auch gegen `url` und `sources[].url` der Stories in der Abgleich-Basis → `existingStoryId`.
6. **Titel normalisieren:** Quellen-Suffix weg (` | heise online`, ` - The Decoder`), HTML-Entities dekodieren, Versionstoken schützen (`/[a-z]*-?\d+(?:\.\d+)+[a-z]*/i`, damit `gpt-5.5` ein Token bleibt), NFKD + Diakritika weg, lowercase, Satzzeichen → Leerzeichen, Token < 3 Zeichen und DE/EN-Stoppwörter weg (Liste `STOP` aus `docs/recherche/2026-10-24/prototypen/dryrun.mjs`, genauso normalisiert – sonst bleibt „fur" aus „für" stehen).
7. **Paarvergleich** O(n²) über die Items des Laufs und ab Phase 2 zusätzlich gegen `originalTitle` der Stories in der Abgleich-Basis, nur Paare, deren `publishedAt ?? firstSeen` höchstens 72 h auseinanderliegen: Jaccard der Token-Mengen **≥ 0,5 und ≥ 3 gemeinsame Token** → Union-Find. **Phase 1 nur diese Regel.** Erst wenn Watchlist-Aliasse existieren (Tabelle oben): Teilen beide Titel einen Watchlist-Tag (Alias-Treffer im normalisierten Titel), gilt Schwelle 0,4. Eigene Implementierung, keine MinHash-Pakete.
8. **Erwartung realistisch halten:** im Prototyp nur −11 % (430 → 383 Cluster in 7 Tagen, 10 davon aus mehreren Quellen); DE- und EN-Titel derselben Story clustern nie. Schwelle nicht senken (Fehl-Merges bei „OpenAI …"-Titeln) – den Rest erledigt ab Phase 2 der `clusterKey` aus Stufe 1 (Zusammenführen 1b, SKILL.md).
9. **Primärquelle (`primary`) und `sources`:** Repräsentant = Item mit dem höchsten Quellen-Prior (Register: offizielle Lab-/Behörden-/Gerichtsquelle 3 · Kernpresse `core` 2 · `nice`, Community, Aggregator, Newsletter 1 – dieselben Werte wie Stufe 0b), Originalquelle vor Presse; Gleichstand → frühestes `publishedAt ?? firstSeen`. Bei jedem Merge neu bestimmen: Kommt die offizielle Quelle nach der Presse, rückt sie nach vorn und `Story.url` folgt (`id`, `firstSeen`, Bewertung bleiben). Index-`src` = `sources[0].id`.
10. **Aggregieren:** `firstSeen`, `publishedAt`, `signals` wie im Typ; `clusterKey` vorläufig, falls kein vorgegebener Schlüssel.

## Abgleich-Basis (ab Phase 2)

- = `public/data/latest.json` ∪ Tagesarchive der letzten 72 h (`latest.json` ist größengekürzt, gekürzte Stories stehen nur im Archiv; bei gleicher `id` gilt die Fassung aus `latest.json`).
- Bekannte Story → nur `sources` ergänzen, **nicht erneut an Claude** (schont das Kontingent, verhindert Score-Flackern). Ausnahmen: Stories mit `ratedBy: 'regel'` (Ausfall, Überlauf) gehen im nächsten Lauf mit verfügbarem Backend wieder in die Triage (Rang nach `preScore`; `id`, `firstSeen` bleiben; Eingabe = erneut gesammeltes Item mit Teaser, sonst `originalTitle` ohne Teaser). Security-Story mit gestiegenem Severity-Maximum oder umgesprungenem `exploited` → erneut an Stufe 2 (`sicherheitsluecken`).
- Trockenläufe lesen `public/data/` nur (falls vorhanden), schreiben es nie.

## `state/seen.json`

- Format laut Steckbrief: `{ "<key>": { "firstSeen": "<ISO>", "storyId"?: "<id>" } }`; `key` = `RawItem.key` aus `quellen` (12 Hex von sha1 der kanonischen URL, `hn:<id>`, `gh:<owner>/<name>@<x.y>`, htmldiff-Form), unverändert übernehmen.
- **Lesen:** Vorfilter (`quellen`). Treffer ohne `storyId` → verwerfen; mit `storyId` → als `RawItem.seenStoryId` durchreichen (Ablauf Punkt 4).
- **Schreiben:** `pipeline/output/seen.ts` am Laufende (Schreibreihenfolge → `ausgabe.md`), im vollen Lauf nach `state/`, nur für **bewertete** Meldungen: Items eines von Claude bewerteten Clusters (mit `storyId`), `relevant: false` aus Stufe 1 (ohne `storyId`), an eine bestehende Story angehängte Items (deren `storyId`). Regel-Stories erst, wenn sie aus dem 72-h-Fenster fallen (dann endgültig) – vorher nicht, damit der nächste Lauf sie samt Teaser neu bewerten kann.
- **Schatten-State (Trockenlauf):** `--stage collect` und `--dry-run` lesen und schreiben `.cache/dry/state/seen.json` (beim ersten Mal aus `state/` kopiert, falls vorhanden; `--fresh` startet leer). Dort gilt jeder Cluster aus `candidates.json` als bewertet: alle seine Items mit `storyId = existingStoryId ?? sha1(clusterKey).slice(0, 12)`. Sonst brächte Lauf 2 dieselben Meldungen erneut – in Phase 1 bewertet niemand. `--limit`, `--only` und die übrigen `--stage`-Werte schreiben kein `seen.json`.
- `firstSeen` bestehender Einträge nie ändern; nach dem Verschmelzen zweier Stories (1b) `storyId` auf die überlebende `id` umschreiben.
- TTL 30 Tage nach `firstSeen` (beim Schreiben ausdünnen), Schlüssel sortiert, Einrückung 1 (kleine Git-Diffs), atomar. Erwartet ≈ 3.000 Einträge ≈ 250 KB, Grenze 1 MB.

## Tests (Phase 1, `node --test`, ohne Netz)

- `canonicalUrl()`: Fixture-Tabelle Eingabe → erwartete URL (utm/fbclid, `www`, Hash, Slash am Ende, Query-Reihenfolge) – friert die Optionen ein.
- Titel: `gpt-5.5` bleibt ein Token, „für" fällt als Stoppwort, Suffixe ` | heise online` und ` - The Decoder` verschwinden.
- Jaccard: Paar knapp über und knapp unter 0,5, Paar mit nur 2 gemeinsamen Token (kein Merge), Union-Find transitiv.
- Primärquelle: offizielle Quelle nach der Presse rückt nach vorn; Gleichstand → früheste.
- `seenStoryId` ohne Abgleich-Basis → verworfen; Schatten-`seen.json` nach Lauf 1 enthält alle Items der Cluster, `--fresh` leert sie.
- Fixtures gekürzt (Titel und Links bleiben, Teaser als Platzhalter; Steckbrief).

## Fallen

- Techmeme-`<link>` ist der Permalink → ohne Original-URL kein URL-Match. The Decoder EN übersetzt meist DE → nur per `clusterKey` (Phase 2) zusammen.
- Optionen von `canonicalUrl()` nachträglich geändert → alle `seen`-Keys verschieben sich, alte Meldungen kommen als neu wieder.
- Gekürzte `latest.json` als einzige Abgleich-Basis → Duplikate zu weggekürzten Stories; immer `latest.json` ∪ Archiv 72 h.
- `seen.json` aus einem `--limit`-Lauf → Rest für immer verschluckt; nur der volle Lauf schreibt `state/`, Trockenläufe nur den Schatten-State.
- Stoppwörter nicht genauso normalisiert wie die Titel → „fur", „uber" bleiben als Token und blähen Jaccard-Treffer auf.
- Union-Find verkettet: A ≈ B und B ≈ C landen zusammen, auch wenn A und C wenig teilen → Fehl-Merges im `report.md` prüfen, Schwelle trotzdem nicht senken.
- Lauf 2 direkt nach Lauf 1: viele Feeds antworten 304, kaum neue Items → für die Abnahme ≥ 6 h warten. Gemessen 2026-10-25: Lauf 1 (Basis) 152 Cluster, Lauf 2 nach 6 h am Sonntagnachmittag nur 9 → Abnahmelauf auf einen Werktagmorgen legen (Vorabend + Nacht als Fenster), nicht aufs Wochenende. Gemessen 2026-10-25: Lauf 1 (Basis) 152 Cluster, Lauf 2 nach 6 h am Sonntagnachmittag nur 9 → Abnahmelauf nicht auf Wochenende/Feiertag legen, sondern auf einen Werktagmorgen (Nacht + Vorabend als Fenster).
