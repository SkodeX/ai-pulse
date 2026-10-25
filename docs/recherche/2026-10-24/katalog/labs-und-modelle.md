# Labs, Modelle, Preise & Ratings

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (28)

- **OpenAI News RSS (alt in sources.py: openai.com/blog/rss.xml)** · rss · geprüft, Bot-Schutz · HTTP 200 (alte URL /blog/rss.xml -> 301 hierher) · neuestes: 2026-10-23
  `https://openai.com/news/rss.xml`
  Kategorien: Modelle, Neuigkeiten, Preise & API-Änderungen, Forschung & Benchmarks, Vertragsänderungen
  Offizieller Feed. Die alte URL aus sources.py funktioniert nur per Redirect, also neue URL eintragen. ~2 Items/Tag (64 in 30 Tagen), 1319 Items (137 KB), deshalb nur neue GUIDs weiterverarbeiten. cf-ray-Header: von Azure-IPs ist eine Challenge möglich. Fallback: Olshansk feed_openai_main.xml mit gleichem Inhalt (2026-10-23).
  Nachprüfung: 200 (Bot-UA, curl-UA, python-UA und leerer UA). Cloudflare mit __cf_bm-Cookie (Bot Management), Pfad wirkt aber freigeschaltet: auch curl-UA kommt durch. Groß (803 KB, 1318 Items), deshalb mit ETag/If-Modified-Since abrufen. Im Gegensatz dazu liefert openai.com/policies/usage-policies/ mit curl-UA 403 und cf-mitigated: challenge, mit Bot-UA 200: aktive Challenge-Regel, hohes Risiko von Azure aus. Policies deshalb nur über OTA beziehen. Fallback: Olshansk feed_openai_main.xml, das stündlich per requests von ubuntu-latest erzeugt wird (neuestes Item 23.10.).
- **OpenAI API Changelog** · html-diff · geprüft, Bot-Schutz · HTTP 200 (platform.openai.com/docs/changelog -> Redirect hierher) · neuestes: 2026-10-22
  `https://developers.openai.com/api/docs/changelog`
  Kategorien: Preise & API-Änderungen, Modelle
  Server-gerendert. Einträge wie 'Oct 22 Update gpt-6-luna v1/decisions …' stehen unter Monatsüberschriften ('October, 2026'), also Datum+Text hashen. Einen Changelog-Feed gibt es nicht: developers.openai.com/rss.xml existiert zwar, ist aber Dev-Blog/Cookbook und stale (neuester Eintrag 2026-05-05).
  Nachprüfung: 200 (Bot- und curl-UA). Läuft auf Vercel, ohne Cloudflare. Robusteste OpenAI-Primärquelle für API-Änderungen. 553 KB, deshalb Diff auf Abschnittsebene.
- **ChatGPT Release Notes (OpenAI Help Center)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20
  `https://help.openai.com/en/articles/6825453-chatgpt-release-notes`
  Kategorien: Neuigkeiten, Modelle, Innovative Ideen
  Intercom-Seite (163 KB) mit Datumsüberschriften 'October 20, 2026'. Hohe persönliche Relevanz. Ergänzend die Model Release Notes https://help.openai.com/en/articles/9624314-model-release-notes (200, neuester Eintrag 2026-10-14). Beide hinter Cloudflare (cf-ray).
  Nachprüfung: 200 Bot-UA / 403 cf-mitigated: challenge mit curl- und python-UA. Intercom hinter Cloudflare mit aktiver Challenge-Regel (Server-Timing chlray). Aus GitHub Actions wahrscheinlich blockiert. 825 KB HTML. Keinen Browser-UA vortäuschen. Fallbacks: developers.openai.com-Changelog, OpenRouter-Präfix openai/, Presse.
- **Anthropic Sitemap (News/Research/Engineering)** · other · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://www.anthropic.com/sitemap.xml`
  Kategorien: Modelle, Neuigkeiten, Vertragsänderungen, Forschung & Benchmarks, Sicherheitslücken
  Sitemap mit 582 URLs, davon 278 unter /news/. Neue Posts erkennt man an neuen <loc> unter /news/, /research/ und /engineering/. Das lastmod-Feld taugt NICHT als Publikationsdatum: alte Posts bekommen neue lastmod-Werte (z.B. disrupting-AI-espionage am 2026-10-20). Deshalb nur einen Set-Diff der URLs machen, Titel per Seiten-Fetch holen. Newsroom-HTML https://www.anthropic.com/news liefert ebenfalls 200. Cloudflare (cf-ray).
- **Olshansk/rss-feeds (Community-Feeds für Labs ohne RSS)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml`
  Kategorien: Neuigkeiten, Modelle, Forschung & Benchmarks
  Inoffizielle Feeds, die per GitHub Action gescrapt werden. raw.githubusercontent.com ist von Actions aus immer erreichbar, daher ein guter Fallback für Labs hinter Cloudflare. Aktuell: feed_claude.xml (claude.com/blog, 2026-10-23), feed_anthropic_research.xml (2026-10-23), feed_anthropic_engineering.xml (2026-10-13), feed_cohere.xml (2026-10-22), feed_openai_main.xml (2026-10-23), feed_perplexity_hub.xml (2026-10-07). Hinken hinterher: feed_xainews.xml (2026-09-28, obwohl x.ai neuere News hat), feed_meta_ai.xml (2026-07-27, weil die Quelle selbst stale ist). Content-Type ist text/plain. Drittanbieter, kann jederzeit ausfallen.
  Nachprüfung: 200. Stündlich per GitHub-Actions-Cron (ubuntu-latest) erzeugt, deshalb zugleich der Beweis, dass diese Seiten aus Azure abrufbar sind. Frisch: anthropic_news (22.10., Selenium), openai_main (23.10., requests), claude (23.10.), mistral (21.10.). Stale: xainews (28.09.), meta_ai (Build täglich, neuestes Item 27.07.), perplexity_hub (07.10.). Konfiguration in feeds.yaml. Freshness immer am neuesten Item messen, nicht an lastBuildDate.
- **Claude Platform Release Notes (RSS)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22
  `https://platform.claude.com/docs/en/release-notes/feed.xml`
  Kategorien: Preise & API-Änderungen, Modelle
  Offizieller Feed. Gefunden über <link rel=alternate> auf platform.claude.com/docs/en/release-notes/overview, wohin die alte URL docs.claude.com/en/release-notes/api umleitet. 158 Items, davon 14 in den letzten 30 Tagen. Inhalt: neue Modelle, API-Features, Deprecations, Preise.
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare mit __cf_bm. support.claude.com/en/articles/12138966-release-notes zeigt dasselbe Muster (200, __cf_bm, 361 KB). Fallback: GitHub-Releases anthropics/* (Atom), OpenRouter-Präfix anthropic/, Olshansk feed_claude.xml (claude.com/resources/articles, neuestes Item 23.10.).
- **Claude Apps Release Notes (Help Center)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-21
  `https://support.claude.com/en/articles/12138966-release-notes`
  Kategorien: Neuigkeiten, Innovative Ideen, Modelle
  Produkt-Updates für claude.ai, Desktop, Mobile und Cowork. Datumsüberschriften 'October 21, 2026'. Kein Feed. Hohe persönliche Relevanz.
- **Google DeepMind Blog RSS (sources.py)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://deepmind.google/blog/rss.xml`
  Kategorien: Modelle, Forschung & Benchmarks, Neuigkeiten
  URL aus sources.py funktioniert. 100 Items, ~10 pro Monat, kein Cloudflare. Für den Bereich Forschung ergänzend Google Research https://research.google/blog/rss/ (200, 2026-10-23, ~12 pro Monat).
- **Google Blog – AI (sources.py)** · rss · geprüft · HTTP 200 (alte URL blog.google/technology/ai/rss/ -> Redirect) · neuestes: 2026-10-21
  `https://blog.google/innovation-and-ai/technology/ai/rss/`
  Kategorien: Neuigkeiten, Modelle, Innovative Ideen
  Die alte URL leitet auf einen neuen Pfad um, also neue URL eintragen. Der Feed enthält nur 20 Items (~5 pro Monat).
- **Google Blog – Gemini (Produkt)** · rss · geprüft · HTTP 200 (blog.google/products/gemini/rss/ -> Redirect) · neuestes: 2026-10-23
  `https://blog.google/products-and-platforms/products/gemini/rss/`
  Kategorien: Modelle, Neuigkeiten, Innovative Ideen
  15 Items in 30 Tagen, z.B. zu Gemini 4 Argon. Hohe persönliche Relevanz (Gemini-Nutzer).
- **Gemini API Release Notes** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-13
  `https://ai.google.dev/gemini-api/docs/changelog`
  Kategorien: Preise & API-Änderungen, Modelle
  Server-gerendert und sehr leicht zu parsen: <h2 id="10-13-2026" data-text="October 13, 2026">. Kein Feed. Der Vertex-AI-Release-Notes-Feed (cloud.google.com/feeds/vertex-ai-release-notes.xml -> docs.cloud.google.com) ist STALE (neuester Eintrag 2026-03-16), also nicht nutzen.
- **Gemini Apps Release Notes** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-13
  `https://gemini.google/release-notes/`
  Kategorien: Neuigkeiten, Innovative Ideen, Modelle
  Datumsformat '2026.10.13'. Die Sprache folgt Accept-Language (ohne Header kommt Deutsch, mit ?hl=en Englisch). Für einen stabilen Parser Sprache fixieren; ?hl=en liefert 319 KB.
- **Meta Newsroom RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://about.fb.com/feed/`
  Kategorien: Neuigkeiten, Modelle, Vertragsänderungen
  Offizieller WordPress-Feed mit ~10 Items zu allen Meta-Themen, daher ein Keyword-Filter nötig (AI|Llama|Muse|Meta AI|Superintelligence). Auf HF ist die Org facebook aktiv (2026-09-30), meta-llama stale (2025-04).
- **Microsoft Foundry Blog (devblogs)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-19
  `https://devblogs.microsoft.com/foundry/feed/`
  Kategorien: Modelle, Preise & API-Änderungen, Neuigkeiten
  Ersatz für 'Azure OpenAI What's new': learn.microsoft.com/en-us/azure/ai-foundry/openai/whats-new leitet auf foundry-classic um, dort ist die neueste Sektion von Mai 2026, also stale. Dieser Feed (8 Items in 30 Tagen) bringt neue Modelle in Foundry und GA-Meldungen. Zusätzlich möglich: Azure Updates RSS https://www.microsoft.com/releasecommunications/api/v2/azure/rss (200, 200 Items, ~2,6 pro Tag zu allen Azure-Diensten, Filter 'OpenAI|Foundry|AI' nötig).
- **Hugging Face Blog (sources.py)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://huggingface.co/blog/feed.xml`
  Kategorien: Open Source & Tools, Modelle, Forschung & Benchmarks
  URL aus sources.py funktioniert. ~25 Items pro Monat inkl. Community-Posts, daher Filter. Kein Cloudflare.
- **Mistral AI News RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-21
  `https://mistral.ai/news/rss`
  Kategorien: Modelle, Neuigkeiten, Preise & API-Änderungen
  Offizieller Feed, gefunden über <link rel=alternate> auf mistral.ai/news. Achtung: Content-Type text/plain. 92 Items, 5 in 30 Tagen. Der Docs-Changelog https://docs.mistral.ai/resources/changelogs (HTML, 200, Datumszeilen 'September 30, 2026') deckt API, Modelle und Deprecations ab. HF-Org mistralai aktiv (2026-10-14).
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare mit __cf_bm, Content-Type text/plain (Parser muss das tolerieren). Fallback: Olshansk feed_mistral.xml (requests auf ubuntu-latest, neuestes Item 21.10.), HF author=mistralai, OpenRouter-Präfix mistralai/.
- **xAI News (Sitemap)** · other · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22
  `https://x.ai/sitemap.xml`
  Kategorien: Modelle, Neuigkeiten, Preise & API-Änderungen
  Kein RSS. Die Sitemap trägt echte Publikationsdaten als lastmod für /news/ (89 URLs; 4 im Oktober, 9 im September, z.B. grok-voice-3 am 2026-10-14). Alternativ x.ai/news als HTML (200, 87 Links). Die Seitentitel lauten jetzt 'SpaceXSI' (Rebranding), daher Alias xai/x-ai/SpaceXSI. Docs-Release-Notes docs.x.ai/developers/release-notes: neueste Monatsüberschrift Dez 2025, also stale. Cloudflare (cf-ray).
  Nachprüfung: 200 Bot-UA / 403 mit curl-UA. Cloudflare mit __cf_bm und Challenge-Regel. Beleg für Probleme von GitHub Actions aus: Olshansk PR #67 (x.ai-Bot-Schutz, Feed seit 09/2025 tot), danach Selenium-Rewrite in PR #72. feed_xainews.xml ist trotzdem wieder stale: neuestes Item 28.09.2026, letzter Build 10.10. Für Azure als blockiert einplanen. Fallback: OpenRouter-Präfix x-ai/, OTA Grok/*, Presse.
- **DeepSeek API Docs (News-Sitemap + Change Log)** · other · geprüft · HTTP 200 · neuestes: 2026-10-17
  `https://api-docs.deepseek.com/sitemap.xml`
  Kategorien: Modelle, Preise & API-Änderungen, Open Source & Tools
  Sitemap ohne lastmod, aber die News-URLs kodieren das Datum (/news/news261017 = 2026-10-17). Eine neue <loc> bedeutet ein neues Release. Change Log https://api-docs.deepseek.com/updates ('Date: 2026-10-17'). HF deepseek-ai: V4.1-Flash-1017 vom 2026-10-17. Kein Cloudflare.
- **Black Forest Labs (Sitemap)** · other · geprüft · HTTP 200 · neuestes: 2026-10-16
  `https://bfl.ai/sitemap.xml`
  Kategorien: Modelle, Aufstrebende Unternehmen, Open Source & Tools
  Deutsches Lab (Freiburg). Kein RSS. Die Sitemap hat lastmod für /blog/* (29 Posts; flux-3-image-klein 2026-10-16, flux-video-upscale 2026-09-28). Blog-HTML https://bfl.ai/blog liefert 200 (10 Links). Auf HF ist black-forest-labs sehr aktiv (Platz 3 bei Trending).
- **GitHub Changelog – Copilot** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://github.blog/changelog/label/copilot/feed/`
  Kategorien: Neuigkeiten, Preise & API-Änderungen, Open Source & Tools
  Feed für das Label copilot (10 Items, ~1 pro Tag). Hohe persönliche Relevanz. Der Gesamtfeed https://github.blog/changelog/feed/ liefert ebenfalls 200.
- **Cursor Changelog RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-16
  `https://cursor.com/changelog/rss.xml`
  Kategorien: Neuigkeiten, Preise & API-Änderungen, Open Source & Tools
  Offizieller Feed, 50 Items, 3 in 30 Tagen. Der Blog-Feed https://cursor.com/atom.xml ist stale (2024-11-11); cursor.com/rss.xml liefert HTML. Hohe persönliche Relevanz.
- **OpenRouter Models API (Neu-Modell-Detektor + AA-Index gratis)** · json-api · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://openrouter.ai/api/v1/models`
  Kategorien: Modelle, Preise & API-Änderungen, Aufstrebende Unternehmen, Forschung & Benchmarks
  469 Modelle, 36 davon neu in 30 Tagen, 3 in 7 Tagen (81 KB, brotli). Felder: id, canonical_slug, hugging_face_id, name, created (Unix), description, context_length, architecture, pricing, top_provider, knowledge_cutoff, expiration_date, benchmarks.artificial_analysis.intelligence_index (bei 287 Modellen!), benchmarks.design_arena (180), reasoning. Neue Modelle über einen Diff auf canonical_slug finden; Varianten wie :free und :batch zusammenfassen. Preisänderungen über einen Diff von pricing. Achtung: created ist das Listungsdatum bei OpenRouter. Der Detailpfad /api/v1/models/<author>/<slug>/endpoints liefert ebenfalls 200. Hinter Cloudflare (cf-ray), bisher immer 200.
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare (CF-Cache HIT) mit __cf_bm, 792 KB. Felder: id (Präfix = Organisation), created, pricing, context_length. Gezählte Präfixe: qwen/ 43, z-ai/ 18, moonshotai/ 9, minimax/ 9, tencent/ 7, bytedance-seed/ 6, xiaomi/ 5, thinkingmachines/ 4, stepfun/ 3, meituan/ 1. Kein baidu/-Präfix vorhanden.
- **Hugging Face Hub Models API** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://huggingface.co/api/models?sort=trendingScore&limit=20`
  Kategorien: Modelle, Open Source & Tools, Aufstrebende Unternehmen
  Funktionierende sort-Werte: trendingScore, createdAt, lastModified, downloads, likes (mit direction=-1). likes7d wird STILL ignoriert und liefert die Trending-Reihenfolge. Felder: id, createdAt, trendingScore (nur bei sort=trendingScore), likes, downloads, pipeline_tag, library_name, tags; lastModified nur bei entsprechendem sort. Pro Lab z.B. ?author=Qwen&sort=createdAt&direction=-1&limit=5. Aktiv laut Prüfung: Qwen (Qwen-Image-2.1-Turbo 2026-10-09), deepseek-ai, mistralai, moonshotai (Kimi-K3 06/2026), zai-org, black-forest-labs, facebook, google, microsoft, nvidia, openai, CohereLabs, Aleph-Alpha, MiniMaxAI, XiaomiMiMo, ibm-granite, allenai. Für Qwen und Kimi die einzige maschinenlesbare Quelle: qwen.ai/blog und platform.kimi.ai/blog sind reine JS-Apps, der alte Qwen-Blog-RSS qwenlm.github.io/blog/index.xml ist seit 2025-09-22 stale. Closed/API-only-Releases fehlen (Kimi K3.1 Pro gibt es nur auf OpenRouter).
- **Arena (ehem. LMArena) Leaderboard-Dataset via HF datasets-server** · dataset · geprüft · HTTP 200 · neuestes: 2026-10-22 (leaderboard_publish_date; Dataset lastModified 2026-10-24)
  `https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&offset=0&length=5`
  Kategorien: Forschung & Benchmarks, Modelle, Aufstrebende Unternehmen
  Offizieller Datensatz, CC-BY-4.0, nicht gated. Configs u.a.: text, text_style_control, webdev, vision, search, document, text_to_image, image_edit, text_to_video, agent; Splits latest und full. Felder: model_name, organization, license, rating, rating_lower/upper, variance, vote_count, rank, category, leaderboard_publish_date. Der Filter-Endpoint funktioniert: /filter?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&where="category"='overall'&orderby="rank"&length=20 (418 Zeilen für overall; 1. Aufruf Timeout nach 20 s, 2. Aufruf 1 s, also Retry einbauen). Top 3 text: Gemini 4 Argon (google), Claude Opus 5.5 (anthropic), Claude Fable 5.1 (anthropic). Die Seite arena.ai/leaderboard (lmarena.ai leitet dorthin) liefert 403 mit Cloudflare-Challenge bei Bot- UND Browser-UA, also nie scrapen.
- **Epoch AI Benchmarking Hub (ZIP inkl. ECI)** · dataset · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24 (Dateidatum im ZIP)
  `https://epoch.ai/data/benchmark_data.zip`
  Kategorien: Forschung & Benchmarks, Modelle
  2,36 MB ZIP, täglich neu gebaut, 92 CSVs. Darin epoch_capabilities_index/eci_scores.csv (270 Modelle; Spalten Model, Display name, eci, eci_ci_low, eci_ci_high, date, Organization, Country, Model accessibility, Accessibility group) und Einzel-Benchmarks (gpqa_diamond, swe_bench_verified, frontiermath …), jeweils mit Release date und Organization. Lizenz CC-BY 4.0 mit Zitierpflicht. Zusätzlich https://epoch.ai/data/ai_models.zip (200) als Notable-Models-DB. unzip ist im Runner vorhanden. Hinter Cloudflare (cf-ray), lieferte aber 200.
- **Anthropic News (HTML) + Sitemap** · html-diff · geprüft, Bot-Schutz · HTTP 200 (Bot- und curl-UA) · neuestes: n/a
  `https://www.anthropic.com/news`
  Kategorien: Modelle, Neuigkeiten
  Cloudflare ohne __cf_bm, CF-Cache DYNAMIC. https://www.anthropic.com/sitemap.xml ebenfalls 200. Fallback: Olshansk feed_anthropic_news.xml (Selenium auf ubuntu-latest, neuestes Item 22.10., 282 Items).
  (aus der Nachprüfung)
- **Hugging Face Models API (author)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://huggingface.co/api/models?author=Qwen&sort=createdAt&direction=-1&limit=3`
  Kategorien: Modelle, Open Source & Tools, Aufstrebende Unternehmen
  Primärquelle für Open-Weights-Labs, je Org etwa 1 KB. Neuestes createdAt je Org: Qwen 09.10., zai-org 25.08., XiaomiMiMo 27.09., baidu 19.06., moonshotai 13.06. (Kimi-K3), ByteDance-Seed 03.07., MiniMaxAI 17.10., stepfun-ai 14.10., tencent 24.10., thinkingmachines 27.07., deepseek-ai 17.10., inclusionAI 21.10., meituan-longcat 31.07. Felder: id, createdAt, likes, downloads. Neue IDs gegen den State diffen.
  (aus der Nachprüfung)
- **LMArena Leaderboard Parquet (HF)** · dataset · geprüft · HTTP 200 (PAR1, 0,9 s) · neuestes: 2026-10-22
  `https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/text/latest-00000-of-00001.parquet`
  Kategorien: Forschung & Benchmarks, Modelle
  text/latest: 621 KB, 11.099 Zeilen (418 davon category=overall). Spalten: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date. Commits täglich gegen 03:00 UTC, publish_date text = 22.10. ETag und X-Repo-Commit per HEAD prüfen. Liste aller Configs: huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset/parquet (24 Configs). Weitere Größen: webdev 647 Zeilen/31 KB, vision 1142/64 KB, agent 50/8 KB (Spalten score/score_ci_*, nicht rating), search 42.
  (aus der Nachprüfung)

## Ergänzend (18)

- **Google Developers Blog** · rss · geprüft · HTTP 200 · neuestes: n/a (Items ohne pubDate; lastBuildDate 2026-10-24)
  `https://developers.googleblog.com/rss/`
  Kategorien: Preise & API-Änderungen, Open Source & Tools, Modelle
  Die Items haben KEIN pubDate. Daher die Erstsichtungszeit speichern und einen Link-/GUID-Set führen. 20 Items. Filter auf Gemini|Gemma|AI Studio|Agent. /feeds/posts/default liefert denselben Feed.
- **Microsoft Official Blog** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20
  `https://blogs.microsoft.com/feed/`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Gesetze
  Allgemeiner Konzernblog mit 6 Items in 30 Tagen, Keyword-Filter nötig. Microsoft Research https://www.microsoft.com/en-us/research/feed/ liefert 200 (2026-10-22, 10 Items, 306 KB). Der Azure-Blog-Feed azure.microsoft.com/en-us/blog/feed/ enthält dieselben Items; der 1. Versuch lief in einen Timeout (000), der 2. lieferte 200.
- **Microsoft AI (MAI) Blog** · html-diff · geprüft, Bot-Schutz · HTTP 200 (microsoft.ai/news/ -> Redirect) · neuestes: n/a (keine Daten im HTML)
  `https://microsoft.ai/blog/`
  Kategorien: Modelle, Neuigkeiten
  MAI-Modelle und Copilot (Consumer). Der WordPress-Feed https://microsoft.ai/feed/ ist LEER (0 Items), /news/feed/ liefert 404, die WP-REST-API 401. Deshalb Link-Diff über die 34 /news/<slug>/-Links der Blogseite.
- **AWS Machine Learning Blog (sources.py)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://aws.amazon.com/blogs/machine-learning/feed/`
  Kategorien: Open Source & Tools, Modelle
  URL aus sources.py funktioniert. ~1 Item pro Tag, stark tutoriallastig. 678 KB Full-Content, daher ETag/If-Modified-Since nutzen. Amazon Science https://www.amazon.science/index.rss (200, 2026-10-23, ~6 pro Monat) deckt Forschung und Nova ab.
- **AWS What's New** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://aws.amazon.com/about-aws/whats-new/recent/feed/`
  Kategorien: Modelle, Preise & API-Änderungen
  101 Items, alle jünger als 30 Tage (Dutzende pro Tag). Nur ein Titel-Filter auf 'Bedrock|Nova|Amazon Q|SageMaker AI|Kiro' kostet nichts. Erkennt neue Modelle und Features auf Bedrock.
- **Apple Machine Learning Research** · rss · geprüft · HTTP 200 · neuestes: 2026-10-15
  `https://machinelearning.apple.com/rss.xml`
  Kategorien: Forschung & Benchmarks, Modelle
  10 Items, ~2 pro Woche, überwiegend Paper/Forschung (MLX, Foundation Models).
- **NVIDIA Blog – Generative AI (sources.py)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://blogs.nvidia.com/blog/category/generative-ai/feed/`
  Kategorien: Neuigkeiten, Open Source & Tools, Modelle
  URL aus sources.py funktioniert. 18 Items, alle jünger als 30 Tage. Akamai-Header vorhanden, aktuell aber kein Block. Developer-Blog https://developer.nvidia.com/blog/feed/ (Atom, 200, 2026-10-23, ~3 pro Tag) ist 765 KB groß und eher für Open Source & Tools relevant.
- **Z.ai (Zhipu) Release Notes** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-10
  `https://docs.z.ai/release-notes/new-released`
  Kategorien: Modelle, Preise & API-Änderungen
  Datumszeilen im Format YYYY-MM-DD. z.ai/blog liefert 404. Auf HF ist zai-org aktiv (GLM-5.3-Flash, 2026-08-25). Auf OpenRouter heißt der Anbieter z-ai (GLM-5.3).
- **Cohere Changelog RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-21
  `https://docs.cohere.com/v2/changelog.rss`
  Kategorien: Modelle, Preise & API-Änderungen
  Feed der Fern-Docs (121 KB), z.B. Rerank 5. Der Blog https://cohere.com/blog ist nur HTML (200, 28 /blog/-Links, Datum 'Oct 22, 2026'); cohere.com/blog/rss.xml leitet auf die Blogseite um. Feed-Alternative: Olshansk feed_cohere.xml.
- **Aleph Alpha Newsroom** · html-diff · geprüft · HTTP 200 · neuestes: 2026-09-28
  `https://aleph-alpha.com/news/`
  Kategorien: Neuigkeiten, Aufstrebende Unternehmen, Modelle
  Deutsches Lab. Kein Feed (/feed/ und sitemap.xml liefern 404). Link-Diff über /en/news/<slug>/ (6 Links), Datum im Format dd.mm.yyyy. Niedrige Frequenz. Auf HF ist Aleph-Alpha aktiv (Kolibri-1, 2026-10-02).
- **Perplexity API Changelog RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22
  `https://docs.perplexity.ai/docs/resources/changelog/rss.xml`
  Kategorien: Preise & API-Änderungen, Modelle
  Offizieller Feed (gefunden über <link rel=alternate> auf docs.perplexity.ai/changelog). Ein Item pro Monat ('October 2026'), das laufend wächst, also Inhalt diffen statt nur GUID prüfen.
- **Runway Changelog** · html-diff · geprüft · HTTP 200 (runwayml.com -> runway.com) · neuestes: 2026-10-15
  `https://runway.com/changelog`
  Kategorien: Innovative Ideen, Modelle
  Datumszeilen 'Oct 15, 2026'. Kein Feed. News/Research unter https://runway.com/news (200) mit Links /news/research/<slug>, aber kaum Datumsangaben.
- **ElevenLabs Blog RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://elevenlabs.io/blog/rss.xml`
  Kategorien: Modelle, Innovative Ideen, Aufstrebende Unternehmen
  48 Items in 30 Tagen, viele davon Kundenstories, also Filter auf Modell/Launch/Funding. Der API-Changelog https://elevenlabs.io/docs/changelog.rss (200, 2026-10-19, hinter Cloudflare) ist 675 KB groß; nur für Preise/API mit ETag nutzen.
- **GitHub Releases Atom (Lab-CLIs/SDKs)** · github-repo · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://github.com/anthropics/claude-code/releases.atom`
  Kategorien: Open Source & Tools, Preise & API-Änderungen
  Ebenfalls geprüft und aktiv: https://github.com/openai/codex/releases.atom, https://github.com/google-gemini/gemini-cli/releases.atom, https://github.com/openai/openai-python/releases.atom (2026-10-22 bis 10-24). Sehr viele alpha/nightly-Releases pro Tag, deshalb Pre-Releases verwerfen und nur Minor-Sprünge berichten. Modell-Repos bringen nichts: QwenLM/Qwen3 hat 0 Releases, mistralai/mistral-inference zuletzt 2025-03, meta-llama/llama-models zuletzt 2025-04.
- **Kimi Research Blog** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://www.kimi.com/blog`
  Kategorien: Modelle
  Cloudflare. Statische Slug-Links im HTML (/blog/kimi-k3, /blog/kimi-k3-1-pro, /en/blog/...), deshalb neue Slugs diffen. www.moonshot.ai/sitemap.xml liefert 404.
  (aus der Nachprüfung)
- **MiniMax Sitemap** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://www.minimax.io/sitemap.xml`
  Kategorien: Modelle
  Akamai-Header. Enthält /news/- und /blog/-URLs mit lastmod, deshalb neue loc-Einträge diffen. Ergänzend HF author=MiniMaxAI und OpenRouter-Präfix minimax/.
  (aus der Nachprüfung)
- **Z.ai Docs Release Notes RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-08-26
  `https://docs.z.ai/release-notes/new-released/rss.xml`
  Kategorien: Modelle, Preise & API-Änderungen
  Mintlify auf Vercel mit cf-ray, 8 Items. Neuestes Item ist 59 Tage alt, also knapp an der Stale-Grenze; das passt aber zu GLM-5.3 (HF 25.08.). z.ai/blog liefert 404, die z.ai-Sitemap enthält keinen Blog. Primär HF zai-org und OpenRouter z-ai/.
  (aus der Nachprüfung)
- **Alibaba Model Studio: Model lifecycle and updates** · html-diff · geprüft · HTTP 200 (Bot- und Browser-UA) · neuestes: 2026-10-22
  `https://www.alibabacloud.com/help/en/model-studio/newly-released-models`
  Kategorien: Modelle, Preise & API-Änderungen
  Tengine, 536 KB. Tabelle mit Datum und Region je Modell (enthält auch Drittmodelle wie pixverse), deshalb Zeilen-Diff mit Filter auf qwen. Deckt Qwen-API-Releases ab, die nicht auf HF erscheinen.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (9)

- **Anthropic RSS (alt in sources.py)** · rss · NICHT nutzbar, Bot-Schutz · HTTP 404 · neuestes: n/a
  `https://www.anthropic.com/rss.xml`
  Kategorien: Neuigkeiten
  TOT (404 'Not Found'). Anthropic bietet keinen offiziellen News-Feed. Ersatz: Sitemap (siehe unten) und Olshansk-Community-Feed.
- **Meta AI Blog RSS (alt in sources.py)** · rss · NICHT nutzbar · HTTP 404 · neuestes: 2026-07-27 (HTML-Seite)
  `https://ai.meta.com/blog/rss/`
  Kategorien: Modelle, Forschung & Benchmarks
  TOT (404). ai.meta.com/sitemap.xml liefert ebenfalls 404. Die HTML-Seite https://ai.meta.com/blog/ (200, server-gerendert, 10 Post-Links) ist STALE: neuester Post 2026-07-27, ebenso im Olshansk-Feed. KI-News von Meta laufen inzwischen über den Newsroom (about.fb.com) und tauchen auf OpenRouter/Arena auf (Muse-Modelle).
- **Microsoft AI Blog Feed (alt in sources.py)** · rss · NICHT nutzbar, Bot-Schutz · HTTP 410 · neuestes: n/a
  `https://blogs.microsoft.com/ai/feed/`
  Kategorien: Neuigkeiten
  TOT (410 Gone, WordPress-Fehlerseite). Ersatz: blogs.microsoft.com/feed/ und der Foundry-Blog.
- **Microsoft Tech Community – Azure AI Services (alt in sources.py)** · rss · NICHT nutzbar · HTTP 404 · neuestes: n/a
  `https://techcommunity.microsoft.com/gxcuf89792/rss/board?board.id=azure-ai-services`
  Kategorien: Preise & API-Änderungen
  TOT (404). Die Azure-AI-Blogs sind nach devblogs.microsoft.com/foundry umgezogen.
- **Stability AI News RSS** · rss · NICHT nutzbar · HTTP 200 · neuestes: 2026-08-25
  `https://stability.ai/news-updates?format=rss`
  Kategorien: Modelle, Funding & Übernahmen
  Technisch funktionierender Squarespace-Feed (stability.ai/news leitet auf /news-updates um). Der neueste Eintrag ist aber vom 2026-08-25, also genau 60 Tage alt und damit an der Stale-Grenze; daher verified=false. 225 KB. HF stabilityai zuletzt 2026-05-18. Optional behalten, selten neu.
- **Perplexity Blog (Hub)** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 403 mit Bot-UA (Cloudflare 'Just a moment...'), 200 mit Browser-UA · neuestes: n/a
  `https://www.perplexity.ai/hub/blog`
  Kategorien: Neuigkeiten, Innovative Ideen
  Cloudflare-Challenge schon bei residential IP mit Bot-UA, von Actions aus also nicht zuverlässig erreichbar. Alternativen: die sanity-Sitemap https://www.perplexity.ai/marketing/sitemap/sanity.xml (200 mit Bot-UA, aber 23.307 URLs und lastmod fast überall aktuell; nur loc-Diff auf /hub/blog/ ohne Locale-Präfix, z.B. ai-agent-evaluation 2026-10-22) oder Olshansk feed_perplexity_hub.xml (2026-10-07).
- **Artificial Analysis Data API** · json-api · NICHT nutzbar, Key nötig · HTTP 401 ohne Key ({"error":"API key is required"}) · neuestes: n/a
  `https://artificialanalysis.ai/api/v2/language/models`
  Kategorien: Forschung & Benchmarks, Preise & API-Änderungen, Modelle
  Laut Docs https://artificialanalysis.ai/data-api/docs gibt es einen Free-Tier: Modellliste mit Headline-Indizes (Intelligence/Coding/Agentic), Median-Speed und Preisen, plus freie Media-Endpoints. Header x-api-key. Attribution ist in allen Tiers Pflicht (sichtbarer Link). Auch /language/models/free verlangt einen Key (401). Der Key ist kostenlos per Account, als GitHub Secret ablegen; 1 Call pro Woche genügt. Daten wegen fehlendem Key nicht geprüft. Hinweis: OpenRouter liefert den AA-Intelligence-Index ohnehin gratis mit. Die Leaderboard-Seite https://artificialanalysis.ai/leaderboards/models liefert 200 ohne Cloudflare; nicht scrapen, API nutzen.
- **OpenRouter Rankings (Nutzungsanteile)** · html-page · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://openrouter.ai/rankings`
  Kategorien: Aufstrebende Unternehmen, Modelle
  Token-Anteile je Modell und Autor stecken nur im eingebetteten Next.js-RSC-JSON (z.B. \"author\":\"deepseek\"). Es gibt keine offizielle API, das Scraping ist fragil (275 KB). Höchstens als optionales Popularitätssignal verwenden; als Rating-Quelle die Models API und das Arena-Dataset nehmen.
- **ERNIE Blog RSS (Baidu)** · rss · NICHT nutzbar · HTTP 200 · neuestes: 2026-05-09
  `https://ernie.baidu.com/blog/index.xml`
  Kategorien: Modelle
  Echter Hugo-Feed mit 18 Items, aber stale (letztes Item 09.05.2026, mehr als 60 Tage). Trotzdem behalten, weil Baidu kein OpenRouter-Präfix hat und HF baidu zuletzt am 19.06. veröffentlicht hat. Baidu sonst über Arena (org baidu) und SCMP abdecken. Ebenfalls stale: Thinking Machines https://thinkingmachines.ai/blog/index.xml (31.07.) und qwenlm.github.io/blog/index.xml (09/2025; Blog ist auf die SPA qwen.ai umgezogen).
  (aus der Nachprüfung)

## Fallen

- 4 Lab-Feeds aus sources.py sind tot: anthropic.com/rss.xml (404), ai.meta.com/blog/rss/ (404), blogs.microsoft.com/ai/feed/ (410), techcommunity…board.id=azure-ai-services (404). Zwei weitere funktionieren nur per Redirect: openai.com/blog/rss.xml -> /news/rss.xml und blog.google/technology/ai/rss/ -> /innovation-and-ai/…. Daher curl -L verwenden und die URLs im Code aktualisieren.
- Content-Type ist kein verlässliches Kriterium: mistral.ai/news/rss und raw.githubusercontent liefern text/plain. Den Feed-Typ am Body erkennen (<rss/<feed/<urlset).
- Google Developers Blog hat keine pubDate-Felder. Dort die Erstsichtungszeit speichern und einen GUID-Set führen, sonst wird jedes Item als neu gewertet.
- Sitemap-lastmod ist oft kein Publikationsdatum: Anthropic setzt bei alten Posts neue lastmod-Werte (2026-10-20), die Perplexity-sanity-Sitemap hat 23k URLs mit fast nur aktuellem lastmod. Deshalb nur neue <loc> erkennen und Locale-Präfixe (/zh/, /ja/ …) herausfiltern. Bei xAI und BFL ist lastmod plausibel, bei DeepSeek steckt das Datum in der URL.
- Cloudflare: perplexity.ai/hub/blog liefert schon mit Bot-UA 403 und Challenge (mit Browser-UA 200); arena.ai/leaderboard liefert 403 sogar mit Browser-UA. cf-ray, aktuell mit 200, zeigen openai.com, help.openai.com, anthropic.com, platform.claude.com, support.claude.com, claude.com, x.ai, mistral.ai, openrouter.ai, epoch.ai, docs.cohere.com, docs.z.ai, docs.perplexity.ai, elevenlabs.io/docs, microsoft.ai und blogs.microsoft.com. Von Azure-IPs (GitHub Actions) sind dort 403/503 und Challenges zu erwarten. Deshalb pro Quelle Health-Status loggen, und bei 'Just a moment' oder 403 nicht als 'keine News' werten, sondern auf den Fallback wechseln.
- Community-Feeds (Olshansk) hinken oder brechen: feed_xainews endet am 2026-09-28, obwohl die xAI-Sitemap News vom 2026-10-22 hat. Nur als Fallback nutzen, nie als einzige Quelle.
- Meta AI Blog (ai.meta.com/blog) ist seit 2026-07-27 stale. Meta-Modellnews (Muse-Serie) kommen über about.fb.com, OpenRouter und Arena; HF meta-llama ist seit 2025-04 inaktiv.
- Qwen (qwen.ai) und Moonshot/Kimi (platform.kimi.ai/blog) sind reine JS-Apps ohne Feed oder Sitemap-Inhalt, der alte Qwen-Blog-RSS ist seit 2025-09 stale. Für beide nur HF-API plus OpenRouter. Closed-Releases fehlen auf HF (Kimi K3.1 Pro gibt es nur auf OpenRouter).
- HF API: ungültige sort-Werte wie likes7d werden still ignoriert. trendingScore ist nur bei sort=trendingScore im Response enthalten. Orgs wie microsoft, nvidia und google laden täglich viele Nischenmodelle hoch, daher mit Schwelle filtern (likes, pipeline_tag) oder nur trending-Top-N nehmen.
- OpenRouter: Varianten (:free, :batch) teilen sich canonical_slug und Zeitstempel; 'created' ist das Listungsdatum, nicht das Lab-Release. Ein neues Modell kann also auch eine Re-Listung sein.
- GitHub-Release-Feeds der CLIs (claude-code v2.1.310, codex alpha, gemini-cli nightly) erzeugen mehrere Releases pro Tag. Pre-Releases und nightly verwerfen, sonst explodieren die Claude-Kosten.
- Stale bzw. irreführend: developers.openai.com/rss.xml (Dev-Blog, zuletzt 2026-05-05, nicht der API-Changelog), Vertex-AI-Release-Notes-Feed (2026-03-16), Azure-OpenAI-'What's new' (foundry-classic, neueste Sektion Mai 2026), docs.x.ai-Release-Notes (Dez 2025), cursor.com/atom.xml (2024-11), stability.ai (2026-08-25, 60 Tage).
- Große Feeds (NVIDIA Dev 765 KB, AWS ML 678 KB, ElevenLabs Changelog 675 KB, Stability 225 KB) verschwenden bei 3 Läufen pro Tag Bandbreite und Zeit. Deshalb If-None-Match/If-Modified-Since senden und nur Titel und Link plus ~300 Zeichen an Claude geben.
- Sprachabhängige Seiten: gemini.google/release-notes liefert ohne Accept-Language Deutsch. Den Header fix setzen, sonst brechen Datums-Parser beim Sprachwechsel.
- Timeouts kommen vor (azure.microsoft.com Blog-Feed, HF datasets-server /filter beim ersten Aufruf). Einen Retry mit Backoff einbauen und kurzfristige Fehler nicht als 'Quelle tot' markieren.
- Lizenzen und Attribution: Arena-Dataset und Epoch AI stehen unter CC-BY-4.0, Artificial Analysis verlangt eine sichtbare Quellenangabe. Das Dashboard braucht deshalb einen Footer mit Quellen-Credits.
- Name-Aliase für den Watchlist-Join nötig: OpenRouter-Präfix (x-ai, z-ai, qwen, mistralai, moonshotai) vs. Arena organization (alibaba, xai …) vs. Epoch Organization ('Z.ai (Zhipu AI)') vs. Rebranding (xAI-Seiten heißen jetzt 'SpaceXSI').

## Empfehlungen der Recherche

- Neue Modelle 3x täglich ohne Claude-Kosten erkennen: (1) OpenRouter GET /api/v1/models als Snapshot speichern und auf canonical_slug diffen (Varianten :free/:batch zusammenfassen). Liefert neue Modelle, Preisänderungen (pricing-Diff) und Deprecations (expiration_date). (2) HF API pro Lab-Autor (~20 Autoren: Qwen, deepseek-ai, mistralai, moonshotai, zai-org, black-forest-labs, Aleph-Alpha, facebook, google, openai, MiniMaxAI, XiaomiMiMo, CohereLabs, stabilityai, allenai, ibm-granite …) mit ?author=X&sort=createdAt&direction=-1&limit=5 abfragen, dazu einmal sort=trendingScore&limit=20. Das sind ~21 Requests pro Lauf, weit unter 500/5 min. Erst bei einem Treffer die offizielle Lab-Quelle bzw. Claude bemühen.
- Für Labs ohne RSS diese Reihenfolge nehmen: offizieller Feed, sonst Sitemap-loc-Diff (Anthropic, xAI, BFL, DeepSeek), sonst HTML-Link-Diff (Meta Newsroom ist ok, microsoft.ai, Aleph Alpha), sonst Changelog-HTML mit Datums-Überschriften (Gemini API, OpenAI API, ChatGPT, Claude Apps, Gemini Apps, Runway, Z.ai, Mistral). Alles deterministisch parsen und nur neue Einträge (Titel, Link, ≤300 Zeichen) an Claude senden.
- Core-Set für den Start (22 Quellen): OpenAI News RSS, OpenAI API Changelog, ChatGPT Release Notes, Anthropic Sitemap, Claude Platform Release Notes RSS, Claude Apps Release Notes, DeepMind RSS, Google AI RSS, Gemini-Produkt-RSS, Gemini API Changelog, Gemini Apps Release Notes, Meta Newsroom RSS, Microsoft Foundry Blog, HF Blog, Mistral RSS, xAI Sitemap, DeepSeek Sitemap, BFL Sitemap, GitHub Copilot Changelog, Cursor Changelog RSS, OpenRouter Models API, HF Hub API. Die nice-Quellen hinter einen Keyword-Prefilter stellen.
- Robustheit gegen Bot-Schutz: (a) einen ehrlichen UA mit Kontakt-URL setzen und pro Host höchstens 1 Request pro Lauf, mit ETag/Last-Modified; (b) pro Quelle health.json mit HTTP-Code, Challenge-Erkennung ('Just a moment', cf-chl) und letztem Erfolg führen; (c) Fallback-Kette für CF-Hosts: openai.com auf Olshansk feed_openai_main.xml, anthropic.com auf feed_anthropic_news.xml/feed_claude.xml, perplexity auf feed_perplexity_hub.xml oder den docs-Changelog-RSS. raw.githubusercontent.com und huggingface.co sind aus Actions stabil erreichbar; (d) nach dem ersten echten Actions-Lauf die Quellen mit 403/503 auf 'degraded' setzen und im Dashboard-Footer anzeigen.
- Dynamische Provider-Watchlist wöchentlich (z.B. sonntags 07:00) bauen, ohne Key: (1) Arena-Dataset über https://datasets-server.huggingface.co/filter mit config=text (optional webdev und vision), split=latest, where "category"='overall', orderby "rank", length=100 abfragen. Pro organization den besten rating-Wert nehmen und prüfen, dass leaderboard_publish_date höchstens 21 Tage alt ist. (2) OpenRouter /api/v1/models: pro Präfix das Maximum von benchmarks.artificial_analysis.intelligence_index (287 Modelle), zusätzlich die Zahl neuer Modelle in 30 Tagen als Momentum. (3) Epoch benchmark_data.zip: eci_scores.csv, pro Organization das Maximum von eci. Jede Quelle in Ränge umwandeln und per Borda-Count bzw. mittlerem Perzentil kombinieren, fehlende Quellen ignorieren.
- Watchlist-Regel: statische Basis 'größte Anbieter' (OpenAI, Anthropic, Google, Meta, Microsoft, Amazon, xAI, Mistral, DeepSeek, Alibaba/Qwen) ∪ Top-12 aus dem kombinierten Rating ∪ 'Aufsteiger', d.h. Anbieter, die neu in den Top-25 von Arena oder AA-Index sind oder in den letzten 30 Tagen ein Modell mit AA-Index ≥ Median der Top-10 veröffentlicht haben (aktuelles Beispiel: moonshotai 55,1, xiaomi 46,3, stepfun). Ergebnis als data/watchlist.json mit Historie ins Repo committen. Ein Diff der Watchlist erzeugt automatisch einen Kandidaten für 'Aufstrebende Unternehmen'. Alias-Tabelle pflegen (x-ai/xai/SpaceXSI, z-ai/zai-org/'Z.ai (Zhipu AI)', qwen/alibaba, moonshotai/Kimi, mistralai/Mistral).
- Robusteste Rating-Quelle ist die OpenRouter Models API (JSON, kein Key, täglich frisch, enthält bereits den AA-Index). Zweitbeste ist das Arena-HF-Dataset (offiziell, CC-BY, kein Cloudflare, Infrastruktur von HF). Epoch als drittes, langsameres Korrektiv. Artificial Analysis API nur optional mit kostenlosem Free-Key (100 Requests/Tag) als GitHub Secret, für Coding/Agentic-Indizes. Nicht scrapen: arena.ai (CF 403), openrouter.ai/rankings (fragiles RSC), artificialanalysis.ai-HTML (ToS).
- Budget-Schutz: Lab-Items vorab per Regex klassifizieren (Modellnamen aus der OpenRouter-Liste, Schlüsselwörter wie 'introducing|launch|release|pricing|deprecat|usage policy|terms|privacy|vulnerability|incident'). Nur Treffer plus offizielle Lab-Feeds gehen an Claude, gebündelt in einem Batch-Call pro Lauf, Kundenstories und Tutorials (AWS ML, ElevenLabs, NVIDIA) werden verworfen. Changelog-Seiten nur bei geändertem Hash des neuesten Datumsabschnitts senden.
- Im Dashboard-Footer Quellen-Credits zeigen: 'Ratings: Arena (lmarena-ai/leaderboard-dataset, CC-BY-4.0), Epoch AI (CC-BY-4.0), Artificial Analysis via OpenRouter', damit die Attributionspflichten erfüllt sind.
