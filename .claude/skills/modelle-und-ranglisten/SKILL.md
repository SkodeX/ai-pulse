---
name: modelle-und-ranglisten
description: Neue Modelle und Ranglisten für AI Pulse ohne Claude-Aufrufe – OpenRouter-Diff, HF-Autoren, Arena, AA-Index, Epoch, „Neue Nr. 1“, Anbieter-Watchlist mit Aliassen. Laden, bevor du an pipeline/models/ oder watchlist.json arbeitest.
---

# Modelle und Ranglisten

Ziel: neue Modelle, Preis-/Deprecation-Änderungen und Rangwechsel **deterministisch** erkennen (kein Claude-Aufruf im Detektor), daraus Kandidaten für die normale Bewertung erzeugen, Abschaltdaten an die Fristen-Tabelle geben und wöchentlich die Anbieter-Watchlist berechnen. Läuft im normalen Job auf dem Heimserver (private IP). Roadmap Phase 4, Modul 4. Endpunkte, Felder und Zahlen geprüft am 2026-10-24 von einer privaten IP mit dem Projekt-UA (Steckbrief, Konventionen); Rohdaten: `docs/recherche/2026-10-24/katalog/labs-und-modelle.md`, `startups-forschung-tools.md`, `querschnitt.md` (GAP 2, GAP 6). Noch nichts davon ist gebaut.

## Abgrenzung

- Abruf-Schicht (UA, Timeout 20 s, Retry, ETag-Speicher `state/http-cache.json`, Challenge-Erkennung, Circuit-Breaker, Health) sowie Lab-Feeds, -Sitemaps und -Changelogs → Skill `quellen`. Hier nur nutzen, nicht nachbauen.
- Offizielle Preis- und Deprecation-Seiten der Anbieter → `vertragsaenderungen`. Hier nur OpenRouter-Daten; die **gemeinsame Schlüsselregel** für Preis- und Deprecation-Ereignisse (§ 9) gilt für beide Seiten.
- `public/data/fristen.json` schreibt nur `pipeline/law/build-fristen.ts` (Skill `gesetze-und-fristen`); hier werden Abschaltdaten nur übergeben (§ 10).
- Kategorie, Scores, `clusterKey`-Zusammenführung, Kostenbuch → `bewertung`. Lauf-Typ, Timer, Push von `state/` → `job-betrieb`. Anbieter-Radar und Footer im Dashboard → `dashboard-entwickeln`.

## Ablage (geplant; Ordner und State-Dateien wie im Steckbrief)

| Pfad | Inhalt |
|---|---|
| `pipeline/models/openrouter.ts` | Snapshot, Diff (neu, Preis, Deprecation), AA-Werte, Abschaltdaten für § 10 |
| `pipeline/models/keys.ts` | `modelSlug()` und `modelEventKey()` (§ 9) – gemeinsam mit `pipeline/terms/` genutzt |
| `pipeline/models/hf-authors.ts` | HF-Autoren, Trending, Warteliste |
| `pipeline/models/arena.ts` | Parquet HEAD/GET, Normalisierung |
| `pipeline/models/boards.ts` | Epoch, ARC, SWE-bench, generische „Neue #1“-Prüfung |
| `pipeline/models/provider-radar.ts` | Watchlist-Berechnung → `public/data/watchlist.json` |
| `pipeline/config/watchlist.ts` | Alias-Tabelle (Quelle der Wahrheit); Startbestand: [references/aliases.md](references/aliases.md) |
| `state/leaderboards/openrouter.json` | reduzierter Snapshot je `canonical_slug` (~75 KB) + Grabsteine entfernter Slugs |
| `state/leaderboards/hf-authors.json` | gesehene IDs je Autor (max. 30), Warteliste lauter Orgs |
| `state/leaderboards/{arena,aa,epoch,arc,swebench}.json` | Version, Spitzenreiter, Top-N je Brett |
| `state/leaderboards/watchlist-history.json` | Wochenstände (12 Wochen) für `trend`, Aufsteiger, Hysterese |

## Takt (Europe/Berlin)

| Baustein | Wann | Anfragen |
|---|---|---|
| OpenRouter-Modelle | jeder Lauf (07:07, 13:07, 19:07) | 1 (792 KB, brotli ~81 KB) |
| HF-Autoren + Trending | jeder Lauf | ≈ 20–30 + 1 |
| Arena (4 Configs) | täglich im 07-Uhr-Lauf (Commits ~03:00 UTC) | 4 HEAD, GET nur bei Änderung |
| AA-Spitze (aus OpenRouter-Snapshot) | täglich 07 Uhr | 0 |
| ARC Prize | täglich 07 Uhr | 1–3, meist 304 |
| SWE-bench | täglich 07 Uhr: Commit-Atom; JSON nur bei neuem Commit | 1 (+1) |
| Epoch-ZIP | sonntags 07 Uhr | 1 (2,36 MB; ZIP wird täglich neu gebaut → wöchentlich fast immer 200, 304 nur bei Wiederholung) |
| Watchlist | sonntags 07 Uhr, nach Arena und Epoch | 0 |

Fälligkeit über die Register-`cadence` (`3x` / `daily07` / `weekly`, Skill `quellen`), nicht über den Lauf-Typ – so holt der nächste Lauf einen ausgefallenen 07:07-Lauf nach (Server aus, Internet weg). Die Watchlist rechnet erst, wenn Arena und Epoch in diesem Lauf dran waren. Erzwingen beim Testen: `--only <quelle>` für einen Detektor, `--stage watchlist` (Flag laut Steckbrief) für die Watchlist-Berechnung unabhängig vom Sonntag – Arena und Epoch dabei nur holen, wenn ihr Stand nicht von heute ist.

## 1. OpenRouter: neue Modelle, Preise, Deprecations

`GET https://openrouter.ai/api/v1/models` → `{ data, total_count, links }`, 469 Einträge. Felder: `id`, `canonical_slug`, `hugging_face_id`, `name`, `created` (Unix-Sekunden), `pricing` (Strings, USD je Token), `expiration_date` (`"JJJJ-MM-TT"` oder `null`), `benchmarks.artificial_analysis.{intelligence_index,coding_index,agentic_index}`, `benchmarks.design_arena[]`, `links.details`. Kein ETag, `Cache-Control: max-age=120` → jedes Mal voll laden.

- **Vorverarbeitung:** `~…-latest`-Zeiger (`~openai/gpt-sol-latest` u. a., 19 Stück) und `openrouter/*`-Router (6) verwerfen. `:free`/`:batch` (17/75) teilen `canonical_slug` → ein Eintrag mit `ids[]`; Preis vom `id` ohne Doppelpunkt. 6 `:free`-Einträge haben keine Basis-`id` (z. B. `recursive/flint-v1.0:free`, `xingchen-agi/xing4.0-29b-a4b:free`) → die Variante gilt als Basis; Preis 0 nie in den Preis-Diff. Ergebnis: 358 Modelle.
- **Plausibilität:** kein `data`-Array oder < 80 % der vorherigen Anzahl → nicht diffen, Snapshot nicht überschreiben, Fehler `empty` an die Health (Zählung bis `degraded` nach Skill `quellen`). Erster Lauf ohne Snapshot: nur initialisieren, keine Kandidaten.
- **Neu** = `canonical_slug` unbekannt **und** Basis-`id` unbekannt. Basis-`id` bekannt, Slug neu (Datumssuffix wie `-20261023` gewechselt) → „Modell-Update“, nur für Watchlist-Orgs.
- **Re-Listung:** `created` > 14 Tage vor Erstsichtung oder Slug in den Grabsteinen (90 Tage) → kein Kandidat, nur Log. `created` ist das Listungsdatum bei OpenRouter, nie als Lab-Release ausgeben; `publishedAt` lieber aus HF-`createdAt` oder der Lab-Quelle.
- **Massenfall:** > 15 neue Slugs in einem Lauf → Katalogumbau vermuten: ein Sammelkandidat, Health-Warnung.
- **Preis** (`preise`): `pricing.prompt`/`pricing.completion` × 1e6 = USD je 1 M Token; melden ab ± 10 %, nur Watchlist-Orgs und nur Closed-Modelle (`hugging_face_id === null`) – bei Open Weights bestimmt der Provider-Mix den Preis (Rauschen). `clusterKey` nach § 9 (`<org>-<modell>-price-<JJJJMMTT>`).
- **Deprecation** (`preise`): `expiration_date` laut OpenRouter-Doku „Deprecation date for the model endpoint (null if not deprecated)“. Neu gesetzt oder geändert → Kandidat „OpenRouter nimmt <name> am <Datum> aus dem Angebot“ mit `clusterKey` `<org>-<modell>-deprecation` (§ 9) **und** Abschalt-Eintrag für `fristen.json` (§ 10). Stand 2026-10-24: 12 Einträge (z. B. `z-ai/glm-4.5` 2026-12-31, `bytedance-seed/seed-2.0-code` 2026-11-11, `poolside/laguna-s-2.1` 2026-10-31; davon nur `z-ai` eine Watchlist-Org). Nur Watchlist-Orgs, sonst Log. Läuft nur eine `:free`/`:batch`-Variante aus, während die Basis-`id` bleibt → keine Abschaltung, nur Log.
- **Neuer Präfix** (Org-Teil der `id` unbekannt; seit 16.10. z. B. `recursive`, `elorian`, `xingchen-agi`, `reflection`, `inception`) → Eintrag in `newOrgs` von `public/data/watchlist.json` (Firmen-Radar, Phase 5; `state/` wird nicht deployt, das Dashboard sieht nur `public/data/`) und Kandidat `startups`.
- Story-`url`: `https://openrouter.ai/<id ohne Variante>`.

## 2. Hugging Face: Open-Weights-Releases

`GET https://huggingface.co/api/models?author=<hf-org>&sort=createdAt&direction=-1&limit=5` je HF-Org der aktuellen Watchlist plus fest `black-forest-labs` und `Aleph-Alpha`; einmal je Lauf `https://huggingface.co/api/models?sort=trendingScore&limit=20`. Felder: `id`, `createdAt`, `likes`, `downloads`, `pipeline_tag`, `library_name`, `tags`. Unbekannter Autor → `[]`, kein 404. Kontingent laut Recherche 500 Anfragen/5 min.

- Kandidat nur, wenn `id` neu im State und `createdAt` ≤ 14 Tage alt ist und kein Ableger: `id` passt nicht auf `/(gguf|awq|gptq|nvfp4|fp8|int4|int8|mlx|bnb|exl2|onnx|tokenizer|fixture|lora|adapter)/i`, `tags` ohne `base_model:quantized:`/`base_model:adapter:`.
- `pipeline_tag` ∈ `text-generation`, `image-text-to-text`, `any-to-any`, `text-to-image`, `image-to-image`, `text-to-video`, `image-to-video`, `text-to-speech`, `automatic-speech-recognition`. Fehlt er → nur bei ruhigen Orgs durchlassen.
- **Laute Orgs** (`google`, `microsoft`, `nvidia`, `facebook`, `tencent`, `amazon`, `allenai`, `ibm-granite`): erst auf die Warteliste; Kandidat, sobald `likes` ≥ 50 oder in Trending-Top-20, sonst nach 7 Tagen verwerfen.
- **Familien bündeln:** IDs ohne Größen-/Varianten-Suffix (`-\d+(\.\d+)?B`, `-A\d+B`, `-Instruct`, `-Base`, `-Thinking`, `-Chat`) gleichsetzen → ein Kandidat „<Org> veröffentlicht <Familie> (n Varianten)“, höchstens 3 je Org und Lauf.
- Abgleich mit OpenRouter über `hugging_face_id` → gleicher `clusterKey`.
- Trending-Org ohne Alias → Eintrag in `newOrgs` (§ 7). Trending-Modelle nur mit `createdAt` ≤ 14 Tage.
- Gegenprobe: bei `sort=createdAt` muss `createdAt` absteigen, sonst wurde `sort` still ignoriert → Fehler `format` an die Health, keine Kandidaten aus dieser Antwort.

## 3. Arena (`lmarena-ai/leaderboard-dataset`, CC-BY-4.0)

Nur das HF-Dataset. `arena.ai`/`lmarena.ai` liefern 403 mit Challenge selbst mit Browser-UA; datasets-server `/filter` läuft in Timeouts (23,6 s, mit `orderby` > 25 s) → nie nutzen.

- Datei je Config: `https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/<config>/latest-00000-of-00001.parquet`. Genutzt: `text` (621 KB, 11 099 Zeilen), `webdev` (31 KB), `agent` (8 KB), `vision` (64 KB). Alle 24 Configs: `siblings` in `https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset`.
- **Änderungsprüfung:** `fetch(url, { method: 'HEAD', redirect: 'manual' })` → 302 mit `X-Linked-ETag` (Dateiinhalt) und `X-Repo-Commit` (ganzes Repo). Vergleich auf `X-Linked-ETag`, beide in `state/leaderboards/arena.json`. GET (Redirect folgen) nur bei Änderung, Magic `PAR1` prüfen.
- **Parsen** mit `hyparquet@1.31.2` (gepinnt, ohne Abhängigkeiten): `parquetReadObjects({ file: arrayBuffer, columns: [...], filter: { category: { $in: ['overall', 'coding'] } } })` – `text` in ~12 ms.
- Spalten `text`/`webdev`/`vision`: `model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date`. `agent`: `score, score_ci_lower, score_ci_upper, observation_count, session_count` statt `rating…`/`vote_count`, nur `overall` (50 Zeilen).
- **Normalisieren:** `rank` ist in `text` eine `number` (float64), in `webdev`/`agent`/`vision` ein `bigint` (int64); `vote_count` ebenso in `webdev`/`vision` → `Number(…)` oder `toJson()` aus hyparquet. `value = rating ?? score`. `organization === ''` → ignorieren. Modellidentität = `model_name` ohne Klammer-Suffix (`Gemini 4 Argon (High)` → `Gemini 4 Argon`).
- **Zählende Bretter:** `text` overall + coding, `webdev` overall, `agent` overall, `vision` overall. Medien-Configs (`text_to_image`, `text_to_video` …) nicht in die Watchlist.
- „Neue #1“ nur prüfen, wenn sich `leaderboard_publish_date` des Bretts geändert hat (Stand: text 2026-10-22, webdev/agent 2026-10-23, vision 2026-10-19). Stand > 21 Tage → `arenaStale`.

## 4. Weitere Ranglisten

- **AA-Index über OpenRouter** (kein Key): `intelligence_index` bei 287 Einträgen (218 nach Varianten-Merge), `coding_index` 164, `agentic_index` 126. Brett „AA Intelligence“ = höchster Index nach Merge (heute `anthropic/claude-opus-5.5` 57,6). Die AA-API liefert ohne Key 401 `{"error":"API key is required"}` → optional später mit `ARTIFICIAL_ANALYSIS_API_KEY` in `/etc/ai-pulse/env` (Steckbrief, offene Punkte), für die Watchlist nicht nötig.
- **Epoch AI** (CC-BY-4.0): `https://epoch.ai/data/benchmark_data.zip` (2,36 MB, ETag, `If-None-Match` → 304). `epoch_capabilities_index/eci_scores.csv` (270 Modelle): `Model, Display name, eci, eci_ci_low, eci_ci_high, date, Organization, Country (of organization), Model accessibility, Accessibility group, model_versions`. Einzel-CSVs `frontiermath.csv`, `gpqa_diamond.csv`, `swe_bench_verified.csv`: `Model version, mean_score, Best score (across scorers), Release date, Organization, …`. Bretter: ECI (max `eci`), FrontierMath, GPQA Diamond (max `mean_score`). Entpacken nach `.cache/`, ZIP nie committen.
- **ARC Prize:** `https://arcprize.org/media/data/leaderboard/v3.json` mit `If-Modified-Since` (304 geprüft) → `{ version, generatedAt, datasets, evaluations[] }`, Datensatz `v3_Semi_Private` (ARC-AGI-3), Felder `modelGroup, modelDisplayName, providerId, score` (0–1), `display`. ARC-AGI-2 optional: `https://arcprize.org/media/data/evaluations.json` (`datasetId` `v2_Semi_Private`) + `https://arcprize.org/media/data/models.json` (`id` → `providerId`, `modelGroup`). Identität = `modelGroup`.
- **SWE-bench:** erst `https://github.com/SWE-bench/swe-bench.github.io/commits/master/data/leaderboards.json.atom` (`<id>` des ersten `<entry>` = `…Grit::Commit/<sha>`; das erste `<id>` im Dokument ist die Feed-ID; zählt nicht gegen das REST-Kontingent); nur bei neuem Commit `https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json` (4,1 MB). Brett `leaderboards[name === 'Verified']`, max `resolved`; Felder `name, model_display, model_org, date, tags`. Einträge sind Agent+Modell-Systeme; letzter Commit 2026-09-01.
- **Nicht im Startumfang:** LiveBench (2.0-Pfad nur im JS-Bundle, v1-CSV Stand 2026-06-25), Scale SEAL (nur HTML-Diff), Open LLM Leaderboard und Aider (eingestellt), `openrouter.ai/rankings` (fragiles RSC), AA-Webseite (nicht scrapen).

## 5. „Neue #1“-Erkennung

Pro Brett ein Eintrag in `state/leaderboards/<quelle>.json`:

```json
{ "text-overall": { "version": "<X-Linked-ETag|ETag|Last-Modified|Commit>", "publishDate": "2026-10-22",
    "leader": { "model": "Gemini 4 Argon", "raw": "Gemini 4 Argon (High)", "org": "google", "value": 1525.7, "since": "2026-10-22" },
    "top": [{ "rank": 1, "model": "Gemini 4 Argon", "org": "google", "value": 1525.7 }] } }
```

- Ereignis „neue #1“: Identität des Spitzenreiters wechselt **und** der neue Wert liegt über dem aktuellen Wert des alten Spitzenreiters. Alter Spitzenreiter verschwunden → nur Log. Reiner Varianten-Wechsel (anderer Klammer-Suffix) → nichts.
- Knapp: Abstand < 0,5 ECI-Punkte (heute 168,83 vs. 168,81) bzw. neuer Wert innerhalb `rating_lower`…`rating_upper` (`agent`: `score_ci_lower`…`score_ci_upper`) des alten → kein eigener Kandidat, nur Wochenrückblick.
- Zusätzlich „neu in Top 3“: Modell, das vorher nicht in den Top 10 stand. Höchstens 1 Ereignis je Brett und Lauf; erster Lauf initialisiert nur.
- Gespeichert werden Top 20 (`text`) bzw. Top 10 (sonst) – genug für die Watchlist-Regeln.

## 6. Dynamische Anbieter-Watchlist (sonntags, 07-Uhr-Lauf)

Watchlist = **Basis ∪ Top-12 ∪ Aufsteiger**; Schlüssel `org` = Arena-`organization` (ohne Arena-Eintrag: OpenRouter-Präfix).

1. **Basis** (Steckbrief): `openai`, `anthropic`, `google`, `meta`, `microsoft`, `amazon`, `xai`, `mistral`, `deepseek`, `alibaba`.
2. **Arena:** je Org bestes `rating` in `text`/`overall` → Orgs absteigend → `arenaRank` (1 = beste Org), `arenaRating`.
3. **AA:** je Org max `intelligence_index` über alle ihre OpenRouter-Präfixe (nach Varianten-Merge) → `aaIndex` und Rang.
4. **Kombination:** je Quelle Perzentil `p = (N − rang) / (N − 1)` (N = Orgs mit Wert, heute 28 Arena / 29 AA; Präfixe ohne Alias zählen als eigene Org); fehlende Quelle zählt `p = 0`; `combined = (pArena + pAA) / 2`; Gleichstand → höheres `arenaRating`. Top-12 nach `combined` → `combinedRank`. Bei `arenaStale` nur AA. Epoch-ECI nur als Korrektiv im Log, nicht in `combined`.
5. **Aufsteiger** (`isClimber`): Org hat jetzt ein Modell in Top 20 `text`-overall oder Top 10 `webdev`/`agent`/`vision` und hatte letzte Woche keins; **oder** ein OpenRouter-Modell mit `created` ≤ 30 Tage und AA-Index ≥ Median der AA-Top-10 nach Merge (heute 52,65 → `moonshotai/kimi-k3.1-pro` 55,1).
6. **Hysterese:** raus erst nach 2 Wochen ohne Qualifikation; Aufsteiger bleiben mindestens 4 Wochen.
7. **`trend`** gegen die Vorwoche: `up`/`down` ab 2 Plätzen `combinedRank`, `new`, sonst `same`.
8. **Diff:** neue Nicht-Basis-Org → Kandidat `startups` („<Org> steigt in die Anbieter-Watchlist auf“), landet auch im Wochenrückblick (Sonntag 19:07, ersetzt das Abend-Update; Stufe `weekly` in `bewertung`).

Plausibilitätsprobe 2026-10-24: Top-12 = anthropic, google, meta, moonshot, xiaomi, openai, alibaba, zai, xai, deepseek, stepfun, nvidia; dazu Basis microsoft, amazon, mistral → 15 Orgs.

## 7. `public/data/watchlist.json`

```ts
interface WatchlistFile {
  generatedAt: string
  week: string                                        // 'JJJJ-Www'
  basis: { arenaPublishDate: string | null; arenaStale: boolean; openrouterFetchedAt: string }
  providers: WatchlistEntry[]                         // nach combinedRank
  newOrgs?: { org: string; via: 'openrouter-prefix' | 'hf-trending'; firstSeen: string; example: string }[]
                                                      // neue Orgs der letzten 28 Tage (Firmen-Radar), bei jedem Fund aktualisiert
}
interface WatchlistEntry {
  org: string                                         // 'alibaba', 'xai', …
  displayName: string                                 // 'Alibaba (Qwen)', 'xAI (SpaceXSI)'
  aliases: { arena: string | null; openrouter: string[]; hf: string[]; github: string[] }
  arenaRank: number | null
  arenaRating: number | null                          // ganzzahlig gerundet
  aaIndex: number | null
  combinedRank: number
  trend: 'up' | 'down' | 'same' | 'new'
  isClimber: boolean
  reason: ('basis' | 'top12' | 'aufsteiger')[]
  sourcesActive: string[]                             // Quellen-IDs (Register + generierte)
  aliasMissing: boolean
  history?: { week: string; combinedRank: number | null; arenaRating: number | null; aaIndex: number | null }[]
                                                      // bis 12 Wochen, älteste zuerst (Rating-Verlauf, Roadmap Phase 5)
}
```

Neue Felder nur optional ergänzen. Jeder Lauf liest die Datei zu Beginn (Tag-Normalisierung, Watchlist-Treffer im Vor-Score → `bewertung`).

## 8. Aliasse

Volle Tabelle (Arena | OpenRouter | HF | GitHub | Anzeige | News-Fallback), Epoch-/ARC-Namen, `tagNames`, laute Orgs: [references/aliases.md](references/aliases.md).

- Eine Org kann mehrere Präfixe haben (`meta` + `meta-llama`, `bytedance-seed` + `bytedance`); Baidu hat keinen OpenRouter-Präfix.
- **Neue Org ohne Alias**, die in Top 20 `text`-overall oder Top 10 `webdev`/`agent`/`vision` auftaucht → `aliasMissing: true` und automatisch aktivieren:
  - OpenRouter-Präfixfilter, wenn ein Präfix dem Arena-Namen entspricht (ohne `-ai`);
  - HF-Autor aus `hugging_face_id` der OpenRouter-Modelle dieses Präfixes (so gefunden: `meta` → `meta-models`, `recursive` → `RecursiveSI`), sonst den Arena-Namen testen (`[]` = gibt es nicht);
  - GitHub REST `https://api.github.com/orgs/<org>/repos?type=sources&sort=created&direction=desc&per_page=5` vom Server mit `Authorization: Bearer $AIPULSE_GITHUB_TOKEN` (fine-grained PAT ohne Repo-Rechte, 5.000 statt 60 Anfragen/h; nie der Deploy-Key), ETag mitschicken; nur für eine so abgeleitete Org; Kandidat erst ab 100 Sternen. `type=sources` blendet Forks aus (geprüft: ohne den Parameter stehen bei `XiaomiMiMo` drei frische Forks oben, einer mit 736 Sternen); `archived: true` verwerfen.
- Generierte Quellen-IDs: `hf-author-<org>`, `openrouter-prefix-<präfix>`, `github-org-<org>`; Health wie jede Quelle. `aliasMissing` bleibt, bis der Alias in `watchlist.ts` bestätigt ist; die Presse deckt die Org über `tagNames` ab.

## 9. Kandidaten an die Pipeline

Detektoren liefern Kandidaten wie jede Quelle (`RawItem`, Skill `quellen`; Register `aiOnly: true`, kein Keyword-Filter). Titel deutsch und regelbasiert (bleibt stehen, wenn keine Claude-Bewertung möglich ist, `ratedBy: 'regel'`):

| Ereignis | `categoryHint` | Prior-Vorschlag an `bewertung` (Skala 1–3) | `clusterKey` |
|---|---|---|---|
| neues Modell einer Watchlist-Org | `modelle` | 3 | `<org>-<familie>-release` (`moonshot-kimi-k3-1-pro-release`) |
| neues Modell sonst / neuer Präfix | `modelle` / `startups` | 2 | `<org>-<familie>-release` / `<präfix>-openrouter-debut` |
| Preisänderung eines Modells | `preise` | 2 | `<org>-<modell>-price-<JJJJMMTT>` (`anthropic-claude-opus-5-5-price-20261024`) |
| Deprecation eines Modells | `preise` | 2 | `<org>-<modell>-deprecation` (`zai-glm-4-5-deprecation`) |
| neue #1 (Arena, AA, ECI, ARC, SWE-bench) | `forschung` | 3 | `<modell>-<brett>-top1` (`gemini-4-argon-arena-text-top1`) |
| Watchlist-Aufsteiger | `startups` | 2 | `<org>-watchlist-<JJJJ>w<WW>` |

- `clusterKey` im Format von `bewertung` (ASCII-Slug, kebab-case, keine Doppelpunkte, `/^[a-z0-9]+(-[a-z0-9]+){2,7}$/`), `<org>` = Watchlist-Schlüssel aus der Alias-Tabelle (`x-ai` → `xai`, `z-ai` → `zai`, `qwen` → `alibaba`, `moonshotai` → `moonshot`), nie der rohe OpenRouter-Präfix.
- Den vorgegebenen Schlüssel trägt das optionale Feld `RawItem.clusterKey` (Skill `quellen`); die Detektor-Schlüssel zusätzlich in den Kontextblock von Stufe 1 geben (Skill `bewertung`), damit Presse-Meldungen zum selben Release ihn wiederverwenden.
- Neue #1 eines Modells, das in den letzten 14 Tagen als neu gemeldet wurde → dessen `clusterKey` übernehmen (eine Story statt zwei).
- `sources`: Detektor-ID, z. B. `{ id: 'openrouter-models', name: 'OpenRouter', url, lang: 'en' }`. Story-`url` = Modellseite (OpenRouter/HF) bzw. Brettseite: `https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset`, `https://arcprize.org/leaderboard`, `https://www.swebench.com/`.
- Erwartung laut Recherche ≈ 5 Modell-Deltas pro Tag. Deutlich mehr → Filter prüfen, nicht die Grenzen von `bewertung` anheben.

**Gemeinsame Schlüsselregel für Preis- und Deprecation-Ereignisse** (gilt gleich für den OpenRouter-Detektor hier und den Preis-/Deprecation-Seiten-Monitor in `vertragsaenderungen`, damit beide **eine** Story ergeben):

- Lässt sich die Änderung einem bestimmten Modell zuordnen → `<org>-<modell>-price-<JJJJMMTT>` bzw. `<org>-<modell>-deprecation`. `JJJJMMTT` = Berliner Datum der Erkennung.
- Änderung auf Seiten- oder Tarif-Ebene ohne einzelnes Modell (neue Tarifstufe, Batch-Rabatt für alle) → `price-<doc-id>-<JJJJMMTT>` (`<doc-id>` = Dokument-`id` aus der Watchlist von `vertragsaenderungen`). Kommt im OpenRouter-Detektor nicht vor.
- **`<modell>` = `modelSlug(apiName)`**, eine Funktion in `pipeline/models/keys.ts`, von beiden Seiten importiert: API-Modellname (OpenRouter: `id` ohne `<präfix>/` und ohne `:variante`, **nie** `canonical_slug`; Anbieterseite: der API-Name der Tabelle bzw. Überschrift) → klein → ein 8-stelliges Datumssuffix `-\d{8}` am Ende abschneiden → jedes Zeichen außer `[a-z0-9]` → `-` → Mehrfach-`-` zusammenziehen, Rand-`-` weg. ISO-Datumssuffixe (`gpt-4o-2024-11-20`) bleiben – OpenAI führt sie auf beiden Seiten als eigene Snapshots. Geprüft am 2026-10-24: Anthropic `claude-sonnet-4-5-20250929` und OpenRouter `anthropic/claude-sonnet-4.5` → beide `claude-sonnet-4-5`; `canonical_slug` wäre `claude-4.5-sonnet-20250929` (Reihenfolge vertauscht). Unter den 469 OpenRouter-IDs ergibt das keine Kollision.
- `modelEventKey(org, apiName, 'price' | 'deprecation', datum?)` setzt zusammen. Mehr als 8 Teile → `<modell>` auf die ersten (frei − 1) Teile kürzen und als letzten Modell-Teil die ersten 6 Hex-Zeichen von `sha1(modelSlug)` anhängen (Org und Suffix bleiben). Preis lässt 5 Modell-Teile, Deprecation 6. Ohne Hash kollidierten am 2026-10-24 beim Preis `google/gemini-3.1-flash-lite`, `…-flash-lite-preview` und `…-flash-lite-image` (alle `gemini-3-1-flash-lite`).
- **Preis an verschiedenen Tagen erkannt** (z. B. wenn OpenRouter erst nach Mitternacht nachzieht; Verzögerung nicht gemessen): vor dem Ausgeben in `latest.json` (72 h) nach einem Schlüssel `<org>-<modell>-price-*` suchen; Treffer → diesen Schlüssel übernehmen statt des heutigen Datums. Beide Seiten machen das gleich.
- Deprecation-Schlüssel tragen kein Datum: Ein verschobenes Abschaltdatum landet in derselben Story (nur `sources` wachsen, Bewertung bleibt – Regel aus `bewertung`); das neue Datum zeigt `fristen.json` (§ 10).

## 10. Abschaltdaten → `public/data/fristen.json`

Entschiedener Standard (Steckbrief): Abschaltdaten von Modellen stehen auch in der Fristen-Tabelle. Quellen: Deprecation-Seiten der Anbieter (liefert `vertragsaenderungen`) und OpenRouter-`expiration_date` (liefert `openrouter.ts`). Beide übergeben nur; Schreiben, Gruppieren und `id`-Vergabe macht allein `build-fristen.ts` (Schema `Frist` und Regeln → `gesetze-und-fristen`, Abschnitt „Übergaben“).

- **Übergabe** je erfolgreichem OpenRouter-Abruf: die **vollständige** Liste künftiger `expiration_date`-Werte der Watchlist-Orgs (wie der Deprecation-Kandidat in § 1), nicht nur Neues – Form `{ sourceUrl: 'https://openrouter.ai/', items: { provider, org, model, date, itemUrl, storyId? }[] }` (Regel in `gesetze-und-fristen`, Abschnitt „Übergaben“): `provider` = Anzeige-Name aus der Alias-Tabelle, `org` = Watchlist-Schlüssel, `model` = OpenRouter-`id` ohne `:free`/`:batch`, `date` = `expiration_date`, `itemUrl` = `https://openrouter.ai/<id ohne Variante>` (Modellseite; wird `sourceUrl` des Fristen-Eintrags), `storyId` = `id` der Story mit dem Deprecation-Schlüssel aus § 9, falls nach dem Clustern bekannt. Feldnamen `sourceUrl`/`itemUrl`, nie `url`.
- **`id` und Titel** bildet `build-fristen.ts`: ein Eintrag je Org und Abschalttag, `id` `modell-<org>-<JJJJ-MM-TT>` (z. B. `modell-zai-2026-12-31`), `models` vereinigt, Titel „OpenRouter nimmt <Modell> aus dem Angebot“, `kind: 'modell'`, `dateKind: 'abschaltung'`, `status: 'verkuendet'`, `origin: 'automatisch'`.
- **Vorrang:** Die Anbieterseite ist maßgeblich (OpenRouter kann früher auslisten, als der Anbieter abschaltet). Für Orgs mit eigener Deprecation-Seite in `vertragsaenderungen` (OpenAI, Anthropic, Google, Mistral) verwirft `build-fristen.ts` die OpenRouter-Übergaben. OpenRouter füllt nur Lücken (z. B. Z.ai, Moonshot, xAI, DeepSeek).
- **Rücknahme und Verschiebung** ohne eigenes Signal: `build-fristen.ts` baut die automatischen `modell`-Einträge dieser Quelle mit `date ≥ heute` bei jeder Übergabe neu – `expiration_date` wieder `null` oder ein neues Datum ist damit im nächsten Lauf erledigt. Läuft nur eine `:free`/`:batch`-Variante aus, entsteht kein Item. Abruf gescheitert → keine Übergabe → bestehende Einträge bleiben; automatische Einträge entfernt `build-fristen.ts` 30 Tage nach `date`.

## Credits (Pflicht, über `meta.credits` in den Footer)

`Ratings: Arena (lmarena-ai/leaderboard-dataset, CC-BY-4.0) · Epoch AI (CC-BY-4.0) · Artificial Analysis via OpenRouter` – als Einträge `{ name, url, license? }` in `meta.json` (`credits`, Datenvertrag im Steckbrief), verlinkt auf `https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset`, `https://epoch.ai/benchmarks/use-this-data`, `https://artificialanalysis.ai/` und `https://openrouter.ai/`. Artificial Analysis verlangt eine sichtbare Quellenangabe mit Link. ARC Prize und SWE-bench zusätzlich nennen, sobald deren Bretter Stories liefern.

## Fallen

- **HF `sort`:** ungültige Werte (z. B. `likes7d`) werden still ignoriert → Trending-Reihenfolge, sieht plausibel aus. Gültig: `trendingScore`, `createdAt`, `lastModified`, `downloads`, `likes` (mit `direction=-1`). `trendingScore` steht nur bei `sort=trendingScore` im Response.
- **Nischen-Uploads:** `microsoft/Sentiment-Analysis-7B`, `nvidia/InternVideo2-CLIP-anomaly-detection`, `upstage/solar-pro4-tokenizer`, `poolside/spec-decoding-subfolder-fixture`, `meta-models/…-NVFP4` – ohne Ableger-Regex und Warteliste flutet `modelle`.
- **Meta auf HF:** `meta-llama` seit 2025-04 stale, `facebook` gemischt; Muse-Open-Weights liegen unter `meta-models` (2026-09-15). xAI zuletzt `xai-org/grok-2` (2025-08).
- **OpenRouter:** `created` = Listungsdatum, Re-Listungen sehen neu aus; `~`-Zeiger wirken wie neue Modelle. `:batch`-Dubletten verfälschen die AA-Top-10: Median roh 54,25 statt 52,65.
- **Lücken je Detektor:** Closed-Releases fehlen auf HF (Kimi K3.1 Pro nur auf OpenRouter, `hugging_face_id: null`), Baidu fehlt auf OpenRouter → beide Detektoren nötig.
- **Rebranding xAI → SpaceXSI:** x.ai-Seiten heißen „SpaceXSI“, Arena bleibt `xai`, OpenRouter `x-ai`, Epoch `xAI` → nur über die Alias-Tabelle joinen.
- **Arena-BigInt:** `JSON.stringify` auf `webdev`/`agent`/`vision`-Zeilen wirft `TypeError: Do not know how to serialize a BigInt`.
- **Arena-HEAD:** mit Redirect-Folgen landet man auf einer signierten CDN-URL (`us.aws.cdn.hf.co…?Expires=…`); verlässlich sind nur die Header der 302-Antwort. `X-Repo-Commit` ändert sich täglich, auch ohne neue Rangliste – kein Änderungssignal für ein Brett.
- **Arena-Org leer:** `organization: ''` mischt INTELLECT-3, Trinity, Yi Lightning – nie einer Firma zuordnen.
- **Epoch-CSV:** `Organization` kann mehrere Orgs in Anführungszeichen enthalten (`"Google DeepMind,Google"`) → echter CSV-Parser, erste zuordenbare Org; Spaltennamen mit Leerzeichen und Klammern.
- **ARC:** `evaluations.json` enthält `modelId: '2025_human_panel'` (Score bis 1,0; `providerId: 'Human'` steht nur in `models.json`, `evaluations.json` hat kein `providerId`) → ohne Join und Filter wird „Human Panel“ #1. Namen mit „Provider Adapter“ und Effort-Varianten → über `modelGroup` gruppieren.
- **SWE-bench:** `raw/…/main/…` → 404 (Branch `master`). 4,1 MB nie ohne neuen Commit laden.
- **AA-API:** ohne Key 401 → optional; AA-HTML nicht scrapen (ToS).
- **Cloudflare:** openrouter.ai (setzt `__cf_bm`) und epoch.ai liefern von einer privaten IP mit dem Projekt-UA 200 (zuletzt 2026-10-24, ebenso arcprize.org und der HF-HEAD mit 302). Der Heimserver hat eine private IP, Cloudflare kann trotzdem jederzeit eine Challenge schalten → Fallbacks bleiben: Fällt OpenRouter aus, HF-API + Arena-Parquet (GAP 1); die Watchlist rechnet dann nur mit Arena, `basis.openrouterFetchedAt` bleibt alt, keine Preis-/Deprecation-Kandidaten und keine Fristen-Rücknahmen aus diesem Lauf.
- **Zwei Stories statt einer bei Preis/Deprecation:** Schlüssel aus `canonical_slug` (Reihenfolge vertauscht) oder ohne Abschneiden von `-\d{8}` (Anthropic führt ältere Modelle mit Datum, OpenRouter ohne) → OpenRouter- und Anbieter-Treffer fallen nie zusammen. Immer `clusterKey` über `modelSlug()`/`modelEventKey()`.
- **Gekürzte Schlüssel ohne Hash kollidieren:** Versionsnummern kosten Teile (`3.1` → `3-1`), Google-Namen sind lang → reines Abschneiden auf 8 Teile legt Preis-Storys von Basis-, Preview- und Image-Modell zusammen (am 2026-10-24 brauchten 11 OpenRouter-IDs eine Kürzung, darunter 4 von Google und `openai/gpt-4o-mini-2024-07-18`). Immer `modelEventKey()` mit Hash-Teil, nie pro Seite eigene Kürzung.
- **`<org>` umbenannt:** Der Watchlist-Schlüssel steckt in `clusterKey`s und Fristen-`id`s (`modell-<org>-<JJJJ-MM-TT>`) → eine Umbenennung in der Alias-Tabelle erzeugt neue Stories und doppelte Fristen.
- **GitHub-Org-Repos ohne `type=sources`:** Forks stehen oben und haben eigene Sterne → falscher „neues Repo“-Kandidat.

## Testen

- Fixtures unter `pipeline/test/fixtures/models/`: gekürztes `openrouter-models.json` (~25 Einträge inkl. `~`, `openrouter/`, `:free`, `:batch`, `expiration_date`), `arena-webdev.parquet` (31 KB, BigInt) und `arena-agent.parquet` (8 KB, `score`-Spalten) – nicht das 621-KB-`text`; gekürztes `arc-v3.json`, `eci_scores.csv` mit Mehrfach-Org-Zeile, je eine HF-Antwort einer lauten und einer ruhigen Org.
- Pflichtfälle: erster Lauf ohne Kandidaten, Varianten-Merge, Re-Listung, 80-%-Grenze, BigInt, Human Panel, Median nach Merge, Hysterese, `aliasMissing`-Pfad.
- `modelSlug()`/`modelEventKey()`: `anthropic/claude-sonnet-4.5` und `claude-sonnet-4-5-20250929` → gleicher Schlüssel; `openai/gpt-4o-2024-11-20` behält das ISO-Datum; `x-ai/…` → `xai-…`; `google/gemini-3.1-flash-lite` und `…-flash-lite-preview` → verschiedene Preis-Schlüssel (Hash-Teil); Ergebnis passt auf die Regex von `bewertung`. Preis-Wiederverwendung aus `latest.json`. Fristen-Übergabe: vollständige Liste nur der Watchlist-Orgs, Item-Felder, `:free`-Ablauf ohne Item, `expiration_date: null` fehlt in der nächsten Übergabe (Gruppierung und Vorrang testet `gesetze-und-fristen` an `build-fristen.ts`).
- Live einzeln: `npm run collect -- --dry-run --only openrouter-models` (bzw. `arena-parquet`), Ausgabe nur als Zählwerte. Mehr in `sparsam-testen`.

## Nach dem Bauen

- Diesen Skill auf echte Dateinamen, State-Größen und gemessene Kandidatenzahlen bringen; Alias-Änderungen gleichzeitig in `pipeline/config/watchlist.ts` und `references/aliases.md`.
- Steckbrief: Phasenstand nachtragen (`keys.ts` steht dort schon in der Zeile `pipeline/models/`).
- Prüfen, dass `pipeline/terms/` dieselbe `modelEventKey()` importiert (keine Kopie) und `build-fristen.ts` die Vorrangregel aus § 10 umsetzt.
- Detektor-IDs (`openrouter-models`, `hf-authors`, `hf-trending`, `arena-parquet`, `epoch-benchmarks`, `arc-prize`, `swebench`) ins Register und in den Katalog-Abschnitt von `quellen`.
- Nach dem ersten `npm run smoke` auf dem Heimserver: Erreichbarkeit von openrouter.ai, epoch.ai, arcprize.org und huggingface.co festhalten; Credits im Footer sichtbar prüfen.

## Ist-Stand (2026-10-25, Teil gebaut)

- Gebaut: `pipeline/models/{keys,openrouter,arena,build,detect}.ts`, Alias-Tabelle `ORG_ALIASES` in `pipeline/config/watchlist.ts`, Register-Einträge `openrouter-models`, `arena-parquet` (`kind: 'detector'`, nicht in collect), `--stage watchlist`.
- **Abweichung (Nutzerwunsch):** Bestenlisten und Watchlist werden **Mo/Mi/Fr** gebaut (nicht nur sonntags), Nachholen nach 3 Tagen; zusätzlich Arena-Configs `text_to_image` und `text_to_video` für die Bestenlisten „Design & Bild" und „Film & Video" (nicht für die Watchlist). Ausgabe `public/data/models.json` (Typ `ModelsFile`).
- Gemessen 2026-10-25: 358 Modelle nach Reduktion; Watchlist-Top-12 = anthropic, google, meta, moonshot, xiaomi, openai, alibaba, zai, xai, deepseek, stepfun, nvidia (deckt sich mit der Probe vom 24.10.).
- Falle: Org-Wertung nur aus den Top 20 der Arena ließ OpenAI weg (bestes Modell auf Platz > 20) → `orgBest` aus allen Zeilen.
- Abschaltdaten nur für Orgs der letzten Watchlist (Rückfall: Basis + Ranglisten-Orgs); Poolside u. a. „beobachtet" fallen raus.
- Offen: HF-Autoren/Trending-Detektor, Epoch, ARC, SWE-bench, „Neue #1"-Ereignisse, Aufsteiger-Regel, `newOrgs`, Opus-Empfehlungen in `models.json.recommendations`.
