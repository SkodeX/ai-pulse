# Parser-Eigenheiten je Quellenart und Quelle

Ausgelagert aus `SKILL.md` § 6/§ 7 (dort Übersicht, Baseline-Regel, `ParsedEntry`, Vorfilter-Reihenfolge). Alles geplant, Befunde vom 2026-10-24 (Katalog + Nachprüfung). Phase 1 baut nur `feed`, `json`, `sitemap`, `htmldiff`, `github`; `parquet` (Arena, `hyparquet@1.31.2`, HEAD + `X-Linked-ETag`, `X-Repo-Commit` ist kein Änderungssignal) kommt in Phase 4 → `modelle-und-ranglisten`.

## feed

- `getExtraEntryFields`: `category` (TechCrunch, OpenAI – CDATA) → `categories`, `dc:creator` → `author`, Roh-`description` (nur Techmeme, für den Original-Link).
- Typ am Body erkennen, nie am Content-Type: mistral.ai/news/rss und raw.githubusercontent.com liefern `text/plain`.
- Entities/CDATA in Titeln (Decoder, TLDR, OpenAI, `&#228;`): `normalization` an, Reste dekodieren, Tags entfernen.
- Datumslos (developers.googleblog.com, bundestag.de, BNetzA): GUID-Menge im Schnappschuss, `publishedAt` leer, `firstSeen` = Laufbeginn.
- Vordatiert (> jetzt + 24 h, z. B. Bundesrat 2026-12-16): `publishedAt` weglassen.
- Gleiche GUID, wachsender Inhalt (Perplexity-API-Changelog, `nice`: ein Item je Monat): Inhalts-Hash je GUID, neuer Abschnitt = neuer Eintrag.
- **Techmeme** (Adapter `techmeme`): `url` = erstes `<A HREF="…">` der description, das nicht auf techmeme.com zeigt; Titelende `(Autor/Publikation)` abschneiden; Permalink → `signals.techmemeUrl` (Boost → `bewertung`).
- **TLDR AI** (`nice`, nicht Phase 1, Adapter `tldr` per `buildUrl`): RSS liefert nur Ausgaben → Ausgabeseite `https://tldr.tech/ai/JJJJ-MM-TT` (~15 Links), h3 mit `(Sponsor)` verwerfen.

## json

- **HN** (Adapter `hn`): URL mit `{since36hUnix}` (`SKILL.md` § 1), `tags=story`, `numericFilters=points%3E100,created_at_i%3E{since36hUnix}` (Komma = UND), `hitsPerPage=200`, **ohne** `query` (Volltext bringt Fehltreffer), lokal per Regex filtern. Das 36-h-Fenster fängt Storys, die später über 100 Punkte steigen. Felder `objectID` → `guid`, `title`, `url`, `points` → `signals.hnPoints`, `num_comments` → `signals.hnComments`, `created_at_i` → `publishedAt`; fehlt `url` → `https://news.ycombinator.com/item?id=<objectID>`. Show HN: `tags=show_hn`, `points%3E50`, `hitsPerPage=50`.
- **HF Daily Papers** (Adapter `hfPapers`): immer `?date={yesterdayUtc}` – ohne Datum kommen alte Papers mit 2–6 Upvotes. `paper.id` (arXiv-ID) → `guid`, URL `https://huggingface.co/papers/<paper.id>`, `title`, `paper.upvotes` → `signals.upvotes`, `paper.ai_summary` → `description`. `publishedAt` = `paper.submittedOnDailyAt` – das arXiv-Datum `paper.publishedAt` lag am 23.10. bei 30 von 50 Papers > 72 h zurück (Altersfenster). Sa/So-Daten liefern `[]` (geprüft 17./18.10.), kein Fehler.
- **YC** (Adapter `yc`, `changes/latest.json`): nur `added[]`; `one_liner` → `description`, `tags` → `categories`; Batch-Regel im Vorfilter (`rule`): nur `batch` wie `Fall 2026` (aktuelles/kommendes Jahr), `other` verwerfen (Monzo, Convoy von 2018 kamen als „added"); `launched_at` (Unix) ist nicht das Batch-Datum.

## sitemap

- `<loc>`/`<lastmod>` per Regex; `<sitemapindex>` → nur Kind-Sitemaps passend zu `pathRe` (max. 3, Zweitabrufe `id:teil` in `http-cache.json`).
- **Set-Diff der `<loc>`** gegen den Schnappschuss. Vor dem Diff `canonicalUrl()` (`pipeline/lib/url.ts`), danach nur für den Diff Locale-Präfixe (`/zh/`, `/ja/` …) entfernen.
- `lastmod` ignorieren bei Anthropic (2026-10-23T20:56Z: Dutzende alte /research/-Posts neu gestempelt), OpenAI und Perplexity (sanity-Sitemap 23 307 URLs, lastmod fast überall aktuell). Plausibel bei x.ai (/news/) und bfl.ai (/blog/); DeepSeek kodiert das Datum in der URL (`/news/news261017` = 2026-10-17) → `publishedAt`.
- Titel: Seite holen (`og:title`, sonst `<title>`, dann `titleStrip`; max. 3 je Host und Lauf, robots beachten; nie auf 1-Request-Hosts wie x.ai), sonst aus dem Slug; den deutschen Titel macht Claude.

## htmldiff (`linkedom`, nur Server-gerenderte Seiten)

- `sections`: `container` wählen, an Überschriften mit `dateRe` teilen, je Abschnitt Datum + normalisierter Text → Hash. Neuer Abschnitt oder neuer Eintrag in bekanntem Abschnitt = Eintrag (Titel = erste Zeile, URL = Seite + `#anker`, falls vorhanden). Weitergeben nur bei geändertem Hash des neuesten Abschnitts.
- `container` und `dateRe` erst nach dem ersten Abruf festlegen (gekürzte Fixture daraus); die Datumsformate in `kernquellen.md` sind Katalogbefunde, keine geprüften Selektoren. `chatgpt-release-notes` bekommt keine Parser-Fixture, solange Node-`fetch` 403 bekommt – Konfiguration bleibt vorläufig, bis die Tagesprobe einmal `ok` liefert.
- `links`: Set-Diff der `href`, die `linkRe` treffen (später: microsoft.ai `/news/<slug>/`, The Batch `/the-batch/issue-N`, kimi.com/blog).
- robots.txt vor jedem Abruf (Regeln `SKILL.md` § 3).

## github

- Abruf-URLs aus `github.repo`: REST `https://api.github.com/repos/<owner>/<name>/releases?per_page=<perPage>`, ohne Token Atom `https://github.com/<owner>/<name>/releases.atom`. `Source.url` = `https://github.com/<owner>/<name>/releases` (Anzeige, Health).
- `draft` verwirft schon der Parser; Prerelease-Flag (nur REST), Tag-Regex, `tagRe` und Minor-Sprung im Vorfilter (`SKILL.md` § 7) – Atom kennt kein Prerelease-Flag, dort zählt nur die Regex.
- Eintrag: `guid` = Tag, `title` = `<Repo-Name> <Tag>`, `url` = Release-Seite, `publishedAt` = `published_at`, Release-Body gekürzt (2–3 KB) → `signals.releaseNotes`, erste 1 000 Zeichen Klartext → `description`.
- `/releases/latest` meiden (hinkt: ollama latest v0.40.10, Atom schon v0.40.11).
- `perPage` klein bei langen Notes: transformers 5, vllm/open-webui 10 (Atom 1,4 MB / 745 KB / 883 KB).
- llama.cpp (`ggml-org/llama.cpp`): b-Builds ohne Semver, > 10/Tag → **nicht in Phase 1**; später höchstens eine Wochen-Sammelmeldung.

## Validatoren (Probe 24.10.)

ETag + Last-Modified bei techcrunch, the-decoder, techmeme; nur Last-Modified bei heise, latent.space; nur ETag bei mistral; **keine** bei openai.com/news/rss.xml (803 KB, `max-age=0`), platform.claude.com-Feed, anthropic.com/sitemap.xml → dort SHA-256-Vergleich (`contentHash`). copilot-changelog: ETag + LM + `max-age=300`; hf-blog: schwaches ETag, trotzdem 304.

## Challenge-Proben (24.10.)

- help.openai.com (curl) lieferte einmal 403 + `cf-mitigated: challenge` mit 9,9 KB Body **ohne** „Just a moment"/„cf-chl", vier Folgeabrufe 200 → Header und Status vor dem Text prüfen; das Verhalten ist nicht deterministisch.
- x.ai (Node-`fetch`, Steckbrief-UA): 403 „Attention Required! … Sorry, you have been blocked" (5,5 KB) **ohne** `cf-mitigated` → greift über den Status.

## Keyword-Regex `AI_RE`: Tests und Beispiele

- Getestet 24.10.: trifft „KI-Agenten …", „künstlicher Intelligenz", „GenAI startup", „EU AI Act", „grok-4.7"; nicht „FBI agent", „Agentur für Arbeit", „Ein Prompt für alles", „Multimodale Mobilität", „moonshot project". Bewusst draußen: `agent` allein, `prompt`, `transformer`, `neural` allein, `reasoning`, `multimodal`, `moonshot`. Restfehler: `cursor` (traf eine Linux-Kernel-CVE), `nvidia` (Gaming), `llama`/`mistral`.
- Jede Änderung mit Fixture-Test: Präzision auf Register/Axios/Semafor, Trefferquote auf Simon Willison.
- `include`-Beispiele: Meta Newsroom `/\b(AI|Llama|Muse|Meta AI|Superintelligence)\b/`; nice: AWS What's New (nur Titel) `/Bedrock|Nova|Amazon Q|SageMaker AI|Kiro/`, Google Developers Blog `/Gemini|Gemma|AI Studio|Agent/`.
- Mengen (Prototyp-Trockenlauf, Samstag): 24 h roh 247 → 86 nach Keyword → 72 nach Clustering; Ø ~29 Kandidaten/Lauf am Wochenende, ~40 werktags, Spitzen ~65. HF Daily Papers am 24.10. für den 23.10.: 8 von 50 ≥ 30 Upvotes (13 ≥ 20), passt zu 5–10/Tag; Upvotes wachsen nach (21.10., am 24.10. gemessen: 15 ≥ 30), gezählt wird beim Abruf des Vortags.

## Fallen je Quelle

- Redirect-URLs der alten Liste: openai.com/blog/rss.xml → /news/rss.xml, blog.google/technology/ai/rss/ → /innovation-and-ai/…, heise /security/rss/news-atom.xml → /security/feed.xml, comfyanonymous/ComfyUI → Comfy-Org/ComfyUI, gemini.google/release-notes/ → /us/release-notes/ (Geo-Pfad, nicht übernehmen), www.latent.space → latent.space; Wired /feed/category/ai/latest/rss ist 404 (neu /feed/tag/ai/latest/rss).
- Kleine Feeds (Decoder DE/EN, Verge, MIT TR, Crunchbase AI, t3n: 10 Items; Techmeme: 15 ≈ 12 h) verlieren Items, wenn Läufe ausfallen – jeden Lauf pollen.
- Gemini Apps liefert ohne `Accept-Language` Deutsch → Datumsparser bricht beim Sprachwechsel.
- Einmalige Timeouts (Azure-Blog-Feed, HF datasets-server beim ersten Aufruf) sind kein „Quelle tot" – Retry, Breaker erst nach 3 Läufen.
- Olshansk-Feeds hinken oder brechen: feed_xainews endet 2026-09-28, obwohl x.ai News vom 2026-10-22 hat; feed_meta_ai baut täglich, neuestes Item 2026-07-27. Nie einzige Quelle.
- 200 mit leeren Daten (OSS Insight `rows=[]`) ist ein Fehler `empty`, kein „nichts Neues".
- Decoder EN übersetzt meist Decoder DE; DE/EN-Titel clustern per Jaccard nicht → nur `decoder-de` als Kern (später Decoder EN mit `outlet: 'the-decoder'`).
- arXiv nur zur Anreicherung einzelner IDs, 3 s Abstand; arXiv-RSS ist am Wochenende leer.

## Große Feeds und Bandbreite

- Groß: openai.com/news/rss.xml 803 KB (1318 Items, keine Validatoren), latent.space 1,3 MB, Axios 1,1 MB, a16z 1,2 MB, normaltech 1,4 MB, Zvi 2,1 MB (Spiegel `https://thezvi.wordpress.com/feed/` 614 KB), SemiAnalysis 3,1 MB, TechNode-Tag 5,4 MB (Hauptfeed 11,9 MB – nie), AWS ML 678 KB, NVIDIA Dev 765 KB, ElevenLabs-Changelog 675 KB; HTML help.openai.com 825 KB, developers.openai.com 553 KB.
- Conditional GET bzw. Hash vor dem Parsen; `maxBytes` nur für bewusst große Quellen anheben; nach dem Parsen nur `ParsedEntry`-Felder behalten, keine Bodies in `state/`.
- **Fixtures** (`pipeline/test/fixtures/<id>.<xml|json|html>`, ≤ 50 KB): gekürzt – Struktur, Titel und Links bleiben, Beschreibungen und Inhalte durch Platzhalter ersetzt (Urheberrecht, öffentliches Repo).
