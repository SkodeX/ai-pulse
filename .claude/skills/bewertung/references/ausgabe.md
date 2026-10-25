# Ausgabe nach `public/data/`

Bauplan für `pipeline/output/` (Eigentümer laut Steckbrief: Skill `bewertung`), ab Phase 2. Stand 2026-10-24, noch kein Code. Datenvertrag, `Story`, `Briefing`, `Meta` → Steckbrief; hier nur, wie geschrieben wird. `state/seen.json` schreibt `pipeline/output/seen.ts` nach den Regeln in `clustering.md`.

## Module (geplant)

| Datei | Inhalt |
|---|---|
| `pipeline/output/write.ts` | `writeJsonAtomic()` – prüfen, Temp-Datei, `rename` |
| `pipeline/output/schemas.ts` | zod-Schemas `Story`, `Briefing`, `Meta`, `Latest`, `ArchiveDay`, `IndexEntry`, `BriefingIndexEntry`, `SeenFile` |
| `pipeline/output/latest.ts`, `archive.ts`, `briefing.ts`, `meta.ts`, `seen.ts` | je Datei eine Funktion |
| `pipeline/output/credits.ts` | feste Credits-Liste |

## Felder der Typen `Latest`, `ArchiveDay`, `IndexEntry`, `BriefingIndexEntry`

Namen und Ort legt der Steckbrief fest: `shared/types.ts` (das Dashboard importiert sie, Skill `dashboard-entwickeln`). Die Felder:

```ts
interface Latest { generatedAt: string; buildId: string; run: RunKind; stories: Story[] }
interface ArchiveDay { date: string; generatedAt: string; buildId: string; frozen: boolean; stories: Story[] }  // date 'JJJJ-MM-TT' (Berlin)
interface IndexEntry { id: string; date: string; title: string; category: Category
  impact: number; personal: number; tags: string[]; url: string; src: string }
interface BriefingIndexEntry { file: string; kind: RunKind; generatedAt: string; title: string }
```

- `index/JJJJ-MM.json` ist ein `IndexEntry[]`, `briefing/index.json` ein `BriefingIndexEntry[]`, beide neueste zuerst (keine eigenen Alias-Typen).
- `file` relativ zu `data/briefing/`, z. B. `2026/2026-11-02-morning.json`. Das Dashboard prüft vor dem Laden gegen `/^\d{4}\/\d{4}-\d{2}-\d{2}-(morning|midday|evening|weekly)\.json$/`.
- zod-Schemas typgleich halten: Abgleich zur Compile-Zeit (z. B. `const a: Story = {} as z.infer<typeof StorySchema>` und umgekehrt), zod nur in der Pipeline, nie im Dashboard-Bundle.
- `z.object` entfernt unbekannte Felder beim `parse` → interne Felder (`preScore`, Teaser, Signale) landen nie in `public/data/`.

## Schreibreihenfolge (ein Lauf, eine `buildId`)

1. Stories des Laufs final machen (nach 1b, Boosts, Security-Übernahmen, Stufe 2, `terms`, Briefing).
2. `archive/` (heute, offener Vortag) → 3. `index/` der betroffenen Monate → 4. `briefing/JJJJ/…`, `briefing/index.json`, `briefing/latest.json` → 5. `latest.json` → 6. **`meta.json` zuletzt** (Watchdog und Dashboard lesen den Stand daraus) → 7. `state/seen.json`, Lauf-Zeile im Kostenbuch.
- Danach committet und pusht `job-betrieb`. Bricht der Lauf mittendrin ab, bleiben ältere, aber in sich gültige Dateien (jede Datei atomar).
- `buildId` = Lauf-ID `JJJJ-MM-TT-HHmm-<kind>` (Startzeit Europe/Berlin), dieselbe ID im Kostenbuch und in `state/runs.json` (`lastRunId`, Skill `job-betrieb`). `generatedAt` = ein ISO-Zeitstempel (UTC) für alle Dateien des Laufs.

## Atomar schreiben und prüfen

```ts
// pipeline/output/write.ts (Bauplan)
export async function writeJsonAtomic<T>(file: string, data: unknown, schema: z.ZodType<T>, indent = 0) {
  const parsed = schema.parse(data)                 // wirft → Aufrufer entscheidet (fail-soft)
  const tmp = `${file}.tmp-${process.pid}`          // gleicher Ordner → gleiches Dateisystem
  await mkdir(dirname(file), { recursive: true })
  await writeFile(tmp, JSON.stringify(parsed, null, indent) + '\n')
  await rename(tmp, file)                           // ersetzt atomar
}
```

- Stories einzeln prüfen (`StorySchema.safeParse`), ungültige weglassen und loggen (`id`, Fehlerpfad), dann die Hülle prüfen. Ungültige Datei → nicht schreiben, alte bleibt, Hinweis `system` in `meta.notices`.
- `public/data/` kompakt (Einrückung 0, wegen der Größengrenzen), `state/seen.json` mit Einrückung 1 und sortierten Schlüsseln.
- `*.tmp-*` beim Start löschen und in `.gitignore` aufnehmen.
- Größen in Bytes messen: `Buffer.byteLength(json)` (Umlaute sind 2 Bytes).

## Ausgabe-Wurzeln

| Lauf | schreibt | liest |
|---|---|---|
| voll (Timer auf dem Server) | `public/data/`, `state/` | dto. |
| `--stage collect` (immer Trockenlauf), `--dry-run` | `.cache/dry/<runId>/` (`raw-items.json`, `candidates.json`, `health.json`, `report.md` laut Steckbrief) und Schatten-State `.cache/dry/state/` | `public/data/` (nur lesend), `.cache/dry/state/` (beim ersten Mal aus `state/` kopiert, `--fresh` leer) |
| `--limit`, `--only`, übrige `--stage` | `.cache/run/` (gleiche Dateinamen wie `public/data/`), Kostenbuch unter `.cache/` | `public/data/`, `state/` |

Briefing auf dem Server neu erzeugen: Briefing-Datei löschen und einen vollen Lauf starten (`--stage brief` nur als Vorschau nach `.cache/run/`).

## `latest.json` (≤ 150 KB)

- Inhalt: alte `latest.json` ∪ neue und geänderte Stories dieses Laufs, per `id` zusammengeführt (verschmolzene `id`s entfernen), nur `firstSeen` ≥ Laufzeit − 72 h.
- Sortierung `score` ↓, `impact` ↓, `firstSeen` ↓; `run` = Lauf-Typ.
- Über 150 KB: von hinten Stories weglassen, bis es passt – nie eine Story, deren `id` im neuen `briefing/latest.json` steht (sonst toter Link im BriefingPanel). Weggelassene bleiben im Archiv und in der Abgleich-Basis; Anzahl ins Lauf-Log.
- Schätzung: ≈ 1,3 KB je Story mit Zusammenfassung, ≈ 0,65 KB ohne → Platz für ≈ 110–150 Stories. Prototyp-Trockenlauf: 383 Cluster in 7 Tagen ≈ 55/Tag ohne Spezialmodule → die Kürzung greift voraussichtlich regelmäßig. Gewollt; nach den ersten Wochen messen.

## `archive/JJJJ/MM/TT.json` (Ziel ≤ 100 KB)

- Tag = Berliner Datum von `firstSeen`. Inhalt: alle Stories dieses Tages in der neuesten Fassung, Sortierung wie `latest.json`, **keine** Kürzung (Archiv = vollständig).
- Ein Lauf schreibt die Datei von heute und – solange `frozen: false` – die von gestern, dann mit `frozen: true` („am Folgetag eingefroren"; so landen Nachträge des 07:07-Laufs zu Stories vom Vorabend noch im Archiv). Ältere Dateien nie anfassen, auch nicht, wenn der Vortag wegen eines Serverausfalls nie eingefroren wurde.
- Über 100 KB: nichts weglassen, Warnung ins Lauf-Log; 3 Tage in Folge → Hinweis `system` (Grenze oder Story-Menge mit dem Nutzer klären). Schätzung ~55 Stories × 1,3 KB ≈ 72 KB.
- Folge des Einfrierens: Änderungen an Stories, die älter als gestern sind **und** aus `latest.json` gekürzt wurden, werden nirgends mehr gespeichert (niedrige Scores, akzeptiert).

## `index/JJJJ-MM.json` (≤ 300 KB)

- Für jede geschriebene Tagesdatei deren Stories per `id` im Monatsindex ersetzen (Monat des Tages); Einträge dieses Tages ohne Story mehr (verschmolzen) entfernen.
- Felder: `date` = Tag der Archivdatei, `title`, `category`, `impact`, `personal`, `tags`, `url` aus der Story, `src` = `sources[0].id` (Primärquelle). Sortierung `date` ↓, dann `(impact + personal)` ↓.
- Über 300 KB, in dieser Reihenfolge: 1. `tags` im Index auf 3 kürzen, 2. Einträge mit `score` < 4 weglassen (bleiben im Archiv), 3. Warnung ins Lauf-Log. Schätzung ≈ 200 B je Eintrag → ≈ 1.500 Einträge; bei ~55 Stories/Tag ≈ 1.700/Monat greift Schritt 1 voraussichtlich.
- `firstMonth` in `meta.json` sagt dem Dashboard, ab wann es Monatsdateien gibt.

## Briefing-Dateien

- Pfad `briefing/JJJJ/JJJJ-MM-TT-<kind>.json`, Datum = Berliner Datum des Laufs. **Bis Phase 5** ist die Sonntag-19:07-Datei `…-evening.json` wie an jedem Tag. **Ab Phase 5** gibt es sonntags `…-weekly.json` statt `…-evening.json`, mit dem Sonntagsdatum (auch beim Nachholen am Montag).
- Existiert die Datei schon → Briefing-Stufe überspringen, kein Claude-Aufruf (Wiederholungslauf am selben Tag).
- `briefing/latest.json` = das Briefing dieses Laufs (auch Regel-Briefing); ab Phase 5 Sonntag ab 19:07 der Wochenrückblick, Montag 07:07 wieder das Morgen-Briefing.
- `briefing/index.json`: Eintrag je Datei per `file` upserten, neueste zuerst, Regel-Briefings eingeschlossen. ≈ 120 B × 3 je Tag ≈ 130 KB im Jahr; über 300 KB nach Jahren aufteilen (dann Datenvertrag erweitern).

## `meta.json` (Typ `Meta` im Steckbrief)

| Feld | Herkunft |
|---|---|
| `generatedAt`, `buildId`, `run` | Lauf |
| `firstMonth` | aus der alten `meta.json` übernehmen; fehlt sie: ältester Monatsordner unter `archive/`, sonst aktueller Berliner Monat. Danach nie ändern |
| `health` | fertig aus `quellen` (verdichtet aus `state/sources-health.json`) |
| `budget` | `pipeline/llm/budget.ts` (Abschnitt Backends in SKILL.md) |
| `notices` | Sammelliste aller Module dieses Laufs, siehe unten |
| `credits` | `pipeline/output/credits.ts` |

**`notices`:** Module melden über eine gemeinsame Funktion `notice(kind, text, sourceId?)`:

- `quelle` – Quellen-Hinweise aus `quellen` und den Fach-Skills.
- `agb` – `vertragsaenderungen` (neues Dokument im Hub, OTA-Lücke).
- `recht` – `gesetze-und-fristen` (offene `fristenquelle`-Checks in `fristen.json`: „Fristenquelle geändert: <Name> – Stichtage prüfen"; `verfahren`-Checks wie „Verfahren beobachten?" bleiben ohne Hinweis).
- `token` – Abo-Token läuft ab: ab `AIPULSE_TOKEN_CREATED` + 1 Jahr − 30 Tage (Regel aus `claude-headless`); Login-Fehler der CLI; `AIPULSE_GITHUB_TOKEN` antwortet mit 401 (einmal je Lauf, auch wenn mehrere GitHub-Quellen es melden; Regeln in `job-betrieb`, Abschnitt GitHub-Workflows). Löst das Watchdog-Issue „Token erneuern“ aus.
- `system` – Claude-Backend auf `api`/`aus`, Schema-Fehler, Deadline, ungültige Ausgabedatei, Archiv-/Indexgröße.
- `since` aus der alten `meta.json` übernehmen, wenn `kind` und (`sourceId` ?? `text`) gleich sind; nicht mehr gemeldete Hinweise entfallen. Höchstens 20, `system` und `token` zuerst. Texte deutsch, ein Satz, ohne Geheimnisse (kein Token, keine Pfade aus `/etc/ai-pulse/`).

**`credits`:** feste Liste, nie leer – Arena (`lmarena-ai/leaderboard-dataset`, CC-BY-4.0), Epoch AI (CC-BY-4.0), Artificial Analysis über OpenRouter, Open Terms Archive (ODC-By). Namen, URLs und Lizenzen geben die Fach-Skills vor (`modelle-und-ranglisten`, `vertragsaenderungen`); neue lizenzpflichtige Quellen dort und hier nachtragen. Das Dashboard hat zusätzlich einen festen Fallback.

## Fallen

- `rename` über Dateisystemgrenzen (Temp-Datei in `/tmp`) ist nicht atomar und scheitert mit `EXDEV` → Temp-Datei immer im Zielordner.
- UTC-Datum statt Berliner Datum → Stories zwischen 00:00 und 02:00 landen im falschen Tag oder Monat.
- Zeichen statt Bytes gezählt → Größengrenzen werden mit Umlauten überschritten.
- Briefing nennt eine Story, die `latest.json` weggekürzt hat → toter Link; Briefing-Stories vor dem Kürzen schützen.
- `firstMonth` jedes Mal neu berechnen → springt, wenn alte Archivmonate fehlen; nur übernehmen.
- Ältere Tagesdateien nachschreiben → eingefrorene Inhalte ändern sich, große Diffs im öffentlichen Repo.
- `meta.json` vor den anderen Dateien schreiben → Watchdog meldet „frisch", obwohl der Lauf danach abbrach.
