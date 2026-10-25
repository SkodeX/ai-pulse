# Startups, Funding, Forschung, Benchmarks & Open Source

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (18)

- **TechCrunch – AI Feed** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T23:05Z
  `https://techcrunch.com/category/artificial-intelligence/feed/`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Aufstrebende Unternehmen, Innovative Ideen
  Echter RSS-Feed mit 20 Items, ca. 15–25 neue pro Tag. Läuft über Cloudflare (cf-ray), von privater IP 200 ohne Challenge, aus Azure noch ungetestet. Sehr AI-lastig, liefert Funding, Launches und Startups. Felder: title, link, pubDate, category, description (gekürzt). Pro Lauf pollen und per URL deduplizieren.
- **TechCrunch – Venture Feed** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T20:57Z
  `https://techcrunch.com/category/venture/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  18 Items, ca. 10 pro Tag. Etwa 30 % der Titel haben AI-Keywords, daher Keyword-Vorfilter (AI|agent|LLM|model|OpenAI…). Der Startups-Feed (/category/startups/feed/) funktioniert auch (200, 19 Items), überschneidet sich aber stark, also weglassen. Cloudflare-CDN.
- **Crunchbase News – AI Section Feed** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T18:51Z
  `https://news.crunchbase.com/sections/ai/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  Nur 10 Items, aber alle mit Tag 'Artificial intelligence'. Kategorien u. a. Seed funding, M&A, unicorn. Enthält den wöchentlichen Artikel 'The Week's 10 Biggest Funding Rounds', ideal für Funding. Ca. 3–5 Items pro Tag. Achtung: /ai/feed/ liefert ein PNG, /category/ai/feed/ liefert 404. Cloudflare-CDN. Die Crunchbase API selbst ist kostenpflichtig, daher nicht nutzen.
- **YC OSS API – changes/latest.json** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24T02:35Z
  `https://yc-oss.github.io/api/changes/latest.json`
  Kategorien: Aufstrebende Unternehmen
  Tägliches Diff aller YC-Firmen aus dem Algolia-Index von YC, aktualisiert täglich per GitHub Action. Felder: summary{added,removed,updated}, added[] mit name, one_liner, batch, tags, industries, website, team_size, launched_at. 34 KB, ideal: 1x täglich lesen und nach AI-Tags oder one_liner filtern. Lizenz nicht angegeben, daher nur Fakten und Links verwenden.
- **Hacker News – Show HN via Algolia** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-23T19:46Z
  `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=points%3E50&hitsPerPage=5`
  Kategorien: Innovative Ideen, Open Source & Tools, Aufstrebende Unternehmen
  Felder: title, url, points, num_comments, created_at, objectID. Mit points>50 kommen ca. 5–10 Treffer pro Tag. Zusätzlich numericFilters=created_at_i>LAST_RUN und Titel-Filter auf AI-Keywords. Story-Link: news.ycombinator.com/item?id=objectID.
- **Product Hunt – Atom Feed** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://www.producthunt.com/feed`
  Kategorien: Innovative Ideen, Aufstrebende Unternehmen
  50 Einträge mit Titel, Tagline (content), Link und published. Keine Votes, daher kein Popularitätssignal. Der undokumentierte Parameter ?category=artificial-intelligence liefert 200 mit 22 von 50 abweichenden Einträgen und wirkt offenbar als Filter, ist aber nicht garantiert. Hoher Anteil an AI-Tools, daher Vorfilter und Dedupe. Cloudflare-CDN.
- **GitHub Search API (Star-Velocity neuer Repos)** · json-api · geprüft · HTTP 200 · neuestes: live
  `https://api.github.com/search/repositories?q=topic:llm+created:%3E2026-10-10&sort=stars&order=desc&per_page=5`
  Kategorien: Open Source & Tools, Aufstrebende Unternehmen
  8230 Treffer für topic:llm in den letzten 14 Tagen. Felder: full_name, stargazers_count, created_at, description, topics. Ersatz für ein Trending-API: täglich die Top-50 neuer Repos (topics llm, ai-agent, mcp…) speichern und die Stern-Differenz pro Tag als Velocity berechnen. In Actions GITHUB_TOKEN nutzen.
- **Hugging Face – Trending Models** · json-api · geprüft · HTTP 200 · neuestes: live (z. B. DeepSeek-V4.1-Flash, created 2026-10-17)
  `https://huggingface.co/api/models?sort=trendingScore&limit=5`
  Kategorien: Open Source & Tools, Modelle, Aufstrebende Unternehmen
  Felder: id, likes, downloads, trendingScore, createdAt, pipeline_tag. Sehr gutes Open-Weight-Signal. Neue Orgs in den Top 20 sind ein Indiz für 'aufstrebend'. Pro Lauf Top 20 laden und nur Modelle mit createdAt < 14 Tage neu melden.
- **Hugging Face Daily Papers API** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-23 (50 Papers)
  `https://huggingface.co/api/daily_papers?date=2026-10-23`
  Kategorien: Forschung & Benchmarks
  Wichtig: Immer ?date=YYYY-MM-DD angeben. Ohne Datum kommen ältere Papers mit 2–6 Upvotes, nicht die aktuellen. Am 23.10. 50 Papers, 13 davon mit ≥20 Upvotes (Top: 229, 165, 152). Felder: paper.id (arXiv-ID), title, paper.upvotes, ai_summary, ai_keywords, githubRepo, githubStars, projectPage, numComments. ?week=2026-W43 liefert die Woche nach Upvotes sortiert. Schwelle upvotes ≥ 20–30 ergibt ca. 5–10 pro Tag.
- **Google Research Blog RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T18:51Z
  `https://research.google/blog/rss/`
  Kategorien: Forschung & Benchmarks, Innovative Ideen
  100 Items, ca. 2–4 Posts pro Woche, wenig Rauschen. Direkt an Claude geben.
- **Google DeepMind Blog RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22T14:30Z
  `https://deepmind.google/blog/rss.xml`
  Kategorien: Forschung & Benchmarks, Modelle
  100 Items, ca. 1–3 Posts pro Woche. Es gibt keinen eigenen Feed für die Publikationsseite, der Blog deckt die relevanten Ankündigungen ab. Microsoft Research Feed als Option: https://www.microsoft.com/en-us/research/feed/ (200, 10 Items, neuestes 2026-10-22).
- **Hugging Face Blog Feed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T16:15Z
  `https://huggingface.co/blog/feed.xml`
  Kategorien: Open Source & Tools, Modelle, Forschung & Benchmarks
  Feed mit 890 Items (komplette Historie, 263 KB), also nur Items nach LAST_RUN verarbeiten. Ca. 1–2 pro Tag, oft Open-Model-Releases und Tools.
- **LMArena Leaderboard (HF Dataset via datasets-server)** · dataset · geprüft · HTTP 200 · neuestes: leaderboard_publish_date 2026-10-22 (Dataset lastModified 2026-10-24T03:02Z)
  `https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&where=%22category%22%3D%27overall%27&orderby=%22rank%22&offset=0&length=3`
  Kategorien: Forschung & Benchmarks, Modelle
  Bester maschinenlesbarer Weg, denn lmarena.ai/leaderboard ist per Cloudflare blockiert (403 mit Bot-UA und Browser-UA). Felder: model_name, organization, license, rating, rating_lower/upper, vote_count, rank, category, leaderboard_publish_date. Konfigurationen u. a. text, webdev, vision, search, agent, document, text_to_image, jeweils mit Splits latest und full. Aktuell #1 Gemini 4 Argon (High) 1526, #2 Claude Opus 5.5 (High). Ideal zum Diffen auf 'neue #1': rank=1 je config pro Lauf vergleichen.
- **Artificial Analysis Data API v2** · json-api · geprüft, Key nötig · HTTP 401 (ohne Key) / Doku 200 · neuestes: n/a
  `https://artificialanalysis.ai/api/v2/data/llms/models`
  Kategorien: Forschung & Benchmarks, Modelle, Preise & API-Änderungen
  Ohne Key 401, wie erwartet. Doku: https://artificialanalysis.ai/documentation (200). Kostenloser Key, Attribution zu artificialanalysis.ai ist Pflicht, Key nicht clientseitig ausliefern, Antworten cachen. Weitere Endpunkte unter /data/media/* (text-to-image, text-to-video, text-to-speech, image-editing, image-to-video). Bei 3 Läufen täglich ca. 90 Requests pro Monat. Liefert Intelligence-Index, Preis und Speed, damit lassen sich 'neue #1' und Preisänderungen diffen. Die Web-Leaderboard-Seite antwortet mit 200 (1,9 MB) ohne Cloudflare.
- **Epoch AI Benchmarking Hub – benchmark_data.zip** · dataset · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a (ZIP 2,36 MB)
  `https://epoch.ai/data/benchmark_data.zip`
  Kategorien: Forschung & Benchmarks, Modelle
  Download-Link von https://epoch.ai/benchmarks/use-this-data. ZIP mit CSVs über viele Benchmarks (z. B. FrontierMath, GPQA, SWE-bench Verified), Lizenz CC-BY mit Quellenangabe. 1x täglich oder wöchentlich laden, entpacken und den Top-Score je Benchmark diffen, um 'neuer SOTA' zu erkennen. Cloudflare-CDN (cf-ray), aktuell 200.
- **ARC Prize Leaderboard JSON** · json-api · geprüft · HTTP 200 · neuestes: generatedAt 2026-10-21T15:42Z
  `https://arcprize.org/media/data/leaderboard/v3.json`
  Kategorien: Forschung & Benchmarks, Modelle
  Stabile JSON-Dateien, gefunden über /scripts/leaderboard/data.js: v3.json mit version, generatedAt, datasets und evaluations[] (modelId, modelDisplayName, score, cost), dazu /media/data/evaluations.json (1264 Einträge: datasetId, modelId, score, costPerTask), models.json, providers.json und datasets.json. Last-Modified-Header vorhanden, damit lassen sich günstige Conditional GETs machen. Ideal für 'neue #1 auf ARC-AGI-2/3'.
- **GitHub Releases Atom – Schlüsselprojekte** · atom · geprüft · HTTP 200 · neuestes: 2026-10-24 (ollama, llama.cpp, gemini-cli)
  `https://github.com/anthropics/claude-code/releases.atom`
  Kategorien: Open Source & Tools
  Muster https://github.com/{owner}/{repo}/releases.atom, alle 14 mit 200 geprüft. Pro Feed nur 10 Einträge, daher gehen bei Vielreleasern Einträge verloren. Frequenz (10 Einträge im Zeitraum): llama.cpp ca. 1 Tag (b-Builds, mehr als 10 pro Tag, keine Semver), n8n 2 Tage, ollama 3 Tage (inkl. rc), openai/codex 3 Tage (viele alpha), cline 3 Tage (SDK- und archive-Tags), gemini-cli 7 Tage (tägliche nightly), claude-code 8 Tage (v2.1.3xx-Patches), ComfyUI 8 Tage, langchain 10 Tage (viele Teilpakete), vllm 12 Tage, transformers ca. 2,3 Monate, open-webui ca. 3,5 Monate. Veraltet: continuedev/continue (zuletzt 2026-06-19), Aider-AI/aider (2026-02-12).
- **GitHub REST API – Releases** · json-api · geprüft · HTTP 200 · neuestes: ollama v0.40.10 (2026-10-23)
  `https://api.github.com/repos/ollama/ollama/releases/latest`
  Kategorien: Open Source & Tools
  Felder: tag_name, name, published_at, prerelease, draft, html_url, body (Release Notes, gut für die Claude-Zusammenfassung). /releases/latest schließt Prereleases aus, zeigte hier aber v0.40.10, während Atom schon v0.40.11 listet (Latest-Flag hinkt). Robuster: /releases?per_page=30, prerelease und draft verwerfen, rc, alpha, beta, nightly und dev per Regex ausschließen, nur Major- und Minor-Sprünge gegenüber dem gespeicherten Stand melden.

## Ergänzend (21)

- **Sifted (EU-Startups/VC)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T10:45Z
  `https://sifted.eu/feed`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  24 Items, ca. 5 pro Tag, EU-Fokus. Etwa 20 % AI-Titel, daher Keyword-Filter. Teilweise Paywall, also nur Titel und Teaser verwenden. Cloudflare-CDN.
- **EU-Startups** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T15:35Z
  `https://www.eu-startups.com/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  10 Items mit Volltext (144 KB). Freitags kommt ein 'Weekly funding round-up' mit allen EU-Runden, als Wochenquelle sehr gut. Etwa 20 % AI. Cloudflare-CDN.
- **deutsche-startups.de** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T11:55Z
  `https://www.deutsche-startups.de/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  15 Items, deutschsprachig, kein Cloudflare. AI-Anteil gering (ca. 5 %), daher streng filtern (KI|AI|LLM|Agent). Gut für DACH-Funding-Meldungen.
- **Gründerszene (Business Insider DE)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T09:17Z
  `https://www.businessinsider.de/gruenderszene/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  20 Items, deutsch. AI-Anteil ca. 5 %, viel DHDL und Boulevard, daher strenger Keyword-Filter. Teilweise BI+-Paywall. Cloudflare-CDN.
- **Tech.eu** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T14:53Z
  `https://tech.eu/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  20 Items mit Volltext, EU-Tech-Funding. Etwa 15 % AI. Überschneidet sich mit Sifted und EU-Startups, daher Deduplizierung über Firmennamen und Betrag. Cloudflare-CDN.
- **YC OSS API – Batches/Tags (meta.json)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://yc-oss.github.io/api/meta.json`
  Kategorien: Aufstrebende Unternehmen
  meta.json listet alle Endpunkte. Geprüft: batches/fall-2026.json (173 Firmen, ca. 100 mit AI, agent oder LLM im one_liner; 295 KB), tags/artificial-intelligence.json (1054 Firmen, 1,8 MB), tags/ai.json (3,1 MB), tags/generative-ai.json (448 KB). Neueste Batches: winter-2027 (5), summer-2027 (1). Gut für einen wöchentlichen Batch-Snapshot. Achtung: launched_at entspricht nicht dem Batch-Datum.
- **Hacker News – Launch HN (YC-Launches) via Algolia** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://hn.algolia.com/api/v1/search_by_date?query=%22Launch%20HN%22&tags=story&hitsPerPage=5`
  Kategorien: Aufstrebende Unternehmen, Innovative Ideen
  Clientseitig auf Titel ^'Launch HN' filtern, da die Volltextsuche auch andere Treffer liefert. Etwa 2–4 pro Woche, meist YC-AI-Startups mit Batch im Titel (z. B. 'YC F26'). Points als Relevanzsignal.
- **Product Hunt API v2 (GraphQL)** · graphql-api · geprüft, Bot-Schutz, Key nötig · HTTP 200 · neuestes: n/a
  `https://api.producthunt.com/v2/docs`
  Kategorien: Innovative Ideen, Aufstrebende Unternehmen
  Nur die Doku geprüft. Endpoint: https://api.producthunt.com/v2/api/graphql. Developer Token aus dem API-Dashboard (läuft nicht ab), als Secret ablegen. Laut Doku 'must not be used for commercial purposes'. Für ein privates, nicht-kommerzielles Dashboard vermutlich ok, sonst hello@producthunt.com fragen. Votes und Topics gibt es nur hier, nicht im RSS.
- **GitHub Trending (HTML)** · html-page · geprüft · HTTP 200 · neuestes: live
  `https://github.com/trending?since=daily`
  Kategorien: Open Source & Tools
  Kein offizielles API. HTML mit article.Box-row und 'N stars today', heute nur 8 Zeilen sichtbar. Scraping ist fragil, nur als Ergänzung zur Search-API, max. 1x täglich. Mit ?spoken_language_code und /trending/python filterbar.
- **Hugging Face – Trending Spaces** · json-api · geprüft · HTTP 200 · neuestes: live
  `https://huggingface.co/api/spaces?sort=trendingScore&limit=20`
  Kategorien: Innovative Ideen, Open Source & Tools
  Felder: id, likes, trendingScore, createdAt. Achtung: viel Müll unter den Top-Treffern (Face-Swap, 'UNCENSORED'-LoRAs). Blocklist nötig und nur Spaces von bekannten Orgs oder mit likes>200 aufnehmen.
- **a16z (Substack-Feed)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T14:20Z
  `https://a16z.substack.com/feed`
  Kategorien: Funding & Übernahmen, Innovative Ideen
  20 Items, ca. 3–5 pro Woche, Thesen und Essays (z. B. 'Why Hardware Specialization is Back'). Feed ist 1,2 MB mit Volltext. a16z.com/feed/ liefert 404. Substack über Cloudflare.
- **Sequoia Capital – Stories Feed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://www.sequoiacap.com/feed/`
  Kategorien: Funding & Übernahmen, Aufstrebende Unternehmen
  50 Items. Beiträge 'Partnering with X' sind direkte Portfolio- und Funding-Signale. Wenige pro Woche. Index Ventures (indexventures.com/perspectives/rss/) liefert 404, kein Feed gefunden.
- **arXiv API (cs.CL/cs.AI/cs.LG)** · atom · geprüft · HTTP 200 · neuestes: 2026-10-22T17:59Z
  `http://export.arxiv.org/api/query?search_query=cat:cs.CL+OR+cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=5`
  Kategorien: Forschung & Benchmarks
  Atom mit totalResults=481.136. Volumen: Mi 21.10. allein 401 Submissions in den 3 Kategorien (submittedDate-Range). Viel zu viel für Claude, daher nur zur Anreicherung (Abstract, Autoren) für Papers verwenden, die über HF Daily Papers vorgefiltert wurden.
- **Papers with Code → HF Trending Papers** · json-api · geprüft · HTTP 302→200 · neuestes: live
  `https://paperswithcode.com/`
  Kategorien: Forschung & Benchmarks
  Bestätigt: paperswithcode.com leitet per 302 auf https://huggingface.co/papers/trending um (Seitentitel 'Trending Papers - Hugging Face'). Das maschinenlesbare Pendant ist https://huggingface.co/api/daily_papers?sort=trending (geprüft, 200). Es mischt ältere Papers mit hohen githubStars, z. B. TradingAgents (2024), daher nach publishedAt filtern.
- **Import AI (Jack Clark) Newsletter** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-19
  `https://importai.substack.com/feed`
  Kategorien: Forschung & Benchmarks
  Wöchentlich, kuratierte Forschungsübersicht. Kann als Popularitätssignal dienen: ein in Import AI erwähntes Paper bekommt einen höheren Score. Volltext 470 KB. Substack über Cloudflare.
- **SWE-bench Leaderboards JSON (GitHub)** · github-repo · geprüft · HTTP 200 · neuestes: letzter Commit 2026-09-01
  `https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json`
  Kategorien: Forschung & Benchmarks, Modelle
  4,1 MB. Struktur: leaderboards[] mit name und results; Verified hat 180 Einträge, Lite 84, Multimodal 22, Multilingual 13, Test 24. Branch ist master, nicht main (main ergibt 404). Selten aktualisiert, daher zuerst den Commit-Feed https://github.com/SWE-bench/swe-bench.github.io/commits/master/data/leaderboards.json.atom (200) prüfen und nur bei neuem Commit herunterladen. Daneben info_for_leaderboard.json.
- **LiveBench Tabellen (CSV)** · dataset · geprüft · HTTP 200 · neuestes: v1-Release 2026-06-25
  `https://livebench.ai/v1/table_2026_06_25.csv`
  Kategorien: Forschung & Benchmarks
  livebench.ai ist eine JS-SPA. Das v1-CSV (model plus Spalten je Task) ist stabil abrufbar. LiveBench 2.0 lädt aus ./data/<release>/table.csv, categories.json und breakdown.json. Die Release-ID steht nur im JS-Bundle (static/js/main.*.js) und war nicht zuverlässig ermittelbar. Also wöchentlich prüfen, ob sich der Bundle-Hash ändert, oder v1 nur als Fallback nutzen.
- **Scale Labs SEAL Leaderboards** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: live
  `https://scale.com/leaderboard/hle-diamond`
  Kategorien: Forschung & Benchmarks
  Kein JSON-API. Die Seiten sind serverseitig gerendert und enthalten eine Markdown-artige Tabelle (z. B. 'Gemini 3.8 Flash | 34.3%'), damit ist ein HTML-Diff machbar. Übersicht https://scale.com/leaderboard listet die Unterseiten (hle-diamond, fortress, audiomc …). Cloudflare-CDN. Nur 1x täglich die wichtigsten 2–3 Boards diffen.
- **Epoch AI Atom** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-16
  `https://epoch.ai/atom.xml`
  Kategorien: Forschung & Benchmarks
  Cloudflare, 50 Einträge, ETag vorhanden. Daten-CSV https://epoch.ai/data/notable_ai_models.csv ebenfalls 200 (2,3 MB), wöchentlicher Abruf reicht. Unkritisch und kein Fallback nötig.
  (aus der Nachprüfung)
- **GitHub Releases Qwen Code** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://github.com/QwenLM/qwen-code/releases.atom`
  Kategorien: Open Source & Tools
  Etwa 1,7 Releases pro Tag, davon 4 von 10 Nightly oder Preview, deshalb Nightly-Filter. Org-Atom github.com/QwenLM.atom ist leer. Modell-Repos gehen schnell stale (MoonshotAI/Kimi-K2 seit 10/2025, XiaomiMiMo/MiMo seit 06/2025, stepfun-ai/Step3 seit 08/2025), weil jedes neue Modell ein neues Repo bekommt. Commits-Atoms von Modell-Repos deshalb nicht verwenden.
  (aus der Nachprüfung)
- **GitHub Releases Kimi CLI** · atom · geprüft · HTTP 200 · neuestes: 2026-09-22
  `https://github.com/MoonshotAI/kimi-cli/releases.atom`
  Kategorien: Open Source & Tools
  Tool-Releases von Moonshot. Für Modell-Releases besser HF author=moonshotai plus kimi.com/blog.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (12)

- **VentureBeat – AI Feed** · rss · NICHT nutzbar, Bot-Schutz · HTTP 429 · neuestes: n/a
  `https://venturebeat.com/category/ai/feed/`
  Kategorien: Neuigkeiten, Innovative Ideen
  Blockiert durch 'Vercel Security Checkpoint' (X-Vercel-Mitigated: challenge, HTTP 429), mit Bot-UA und mit Browser-UA. /feed/ verhält sich genauso. Der alte FeedBurner-Feed https://feeds.feedburner.com/venturebeat/SZYF antwortet zwar mit 200, das neueste Item ist aber vom 2026-09-03, also veraltet. Nicht einplanen.
- **Finsmes (Funding-Meldungen)** · rss · NICHT nutzbar, Bot-Schutz · HTTP 403 · neuestes: n/a
  `https://www.finsmes.com/feed`
  Kategorien: Funding & Übernahmen
  Cloudflare 'Just a moment…' (cf-mitigated: challenge, HTTP 403), mit Bot-UA und mit Browser-UA. Aus GitHub Actions ist das nicht nutzbar.
- **Axios Pro Rata (Newsletter)** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://www.axios.com/newsletters/axios-pro-rata`
  Kategorien: Funding & Übernahmen
  Nur eine Newsletter-Landingpage (670 KB HTML), kein Pro-Rata-Feed gefunden. Der allgemeine Axios-Feed https://api.axios.com/feed/top/ antwortet mit 200, enthält aber nur 4 Items, 1 MB und Politik. Ungeeignet.
- **OSS Insight – Trending Repos API** · json-api · NICHT nutzbar · HTTP 200 · neuestes: unavailable since 2026-03-01
  `https://api.ossinsight.io/v1/trends/repos/?period=past_24_hours&language=Python`
  Kategorien: Open Source & Tools
  Antwortet mit 200, liefert aber rows=[] und data_quality.status='unavailable' seit 2026-03-01: der GitHub-Event-Firehose ist auf ca. 0,3 % eingebrochen. Totgelegt, nicht nutzen. Der erste Versuch endete im Timeout (000).
- **CB Insights AI 100 (2026)** · html-page · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026 (jährlich)
  `https://www.cbinsights.com/research/report/artificial-intelligence-top-startups-2026/`
  Kategorien: Aufstrebende Unternehmen
  Statische Jahresliste mit reCAPTCHA-Elementen auf der Seite. Nicht pollen, höchstens einmalig manuell als Seed-Liste für die Watchlist aufstrebender Firmen übernehmen.
- **arXiv RSS (cs.AI+cs.CL+cs.LG)** · rss · geprüft · HTTP 200 · neuestes: leer (Samstag; lastBuildDate 2026-10-24)
  `https://rss.arxiv.org/rss/cs.AI+cs.CL+cs.LG`
  Kategorien: Forschung & Benchmarks
  Gültiger Feed, an Wochenenden aber leer (skipDays Sa/So). Werktags mehrere hundert Einträge, ohne Popularitätsfilter. HF Daily Papers vorziehen.
- **alphaXiv Explore** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://www.alphaxiv.org/`
  Kategorien: Forschung & Benchmarks
  HTML mit 832 KB, nur 18 arXiv-IDs serverseitig gerendert, Rest per JS. Kein offizielles öffentliches Trending-API gefunden (WebSearch: nur inoffizielle Wrapper). Cloudflare. HF Daily Papers deckt das ab.
- **Semantic Scholar Graph API** · json-api · NICHT nutzbar, Key nötig · HTTP 429 · neuestes: n/a
  `https://api.semanticscholar.org/graph/v1/paper/search?query=large+language+model&fields=title,citationCount,publicationDate&limit=3`
  Kategorien: Forschung & Benchmarks
  Zweimal 429 'Too Many Requests … apply for a key'. Gilt auch für /paper/arXiv:{id}. Ohne Key aus Actions unzuverlässig. Nur sinnvoll mit Key für citationCount und influentialCitationCount von Top-Papers. Doku: https://api.semanticscholar.org/api-docs/ (200).
- **OpenAlex Works API** · json-api · geprüft, Bot-Schutz, Key nötig · HTTP 200 · neuestes: n/a
  `https://api.openalex.org/works?filter=doi:10.48550/arxiv.2610.31329&select=id,cited_by_count,publication_date`
  Kategorien: Forschung & Benchmarks
  Funktioniert, meldet aber 'No API key, so this request shares one free daily budget … with everyone on your network's IP'. Auf geteilten Actions-IPs schnell erschöpft, also nur mit kostenlosem Key. Zitationen sind für frische Papers ohnehin ~0, für das Dashboard verzichtbar. Die Antwort enthält Text, der sich an KI-Agenten richtet. Er wurde ignoriert und ist als Daten zu behandeln.
- **Open LLM Leaderboard (HF)** · dataset · NICHT nutzbar · HTTP 200 · neuestes: 2025-03-20
  `https://huggingface.co/api/datasets/open-llm-leaderboard/contents`
  Kategorien: Forschung & Benchmarks
  Archiviert, letzte Änderung 2025-03-20. Nicht mehr nutzen.
- **Aider Polyglot Leaderboard (YAML)** · github-repo · NICHT nutzbar · HTTP 200 · neuestes: 2025-10-03
  `https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml`
  Kategorien: Forschung & Benchmarks
  YAML funktioniert (69 Einträge mit pass_rate_2, model, date), letzter Eintrag aber 2025-10-03, Commit-Feed ebenso (2025-10-04). Veraltet, auch die Aider-Releases ruhen seit 2026-02.
- **Awesome-Lists Commit-Feeds** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://github.com/punkpeye/awesome-mcp-servers/commits/main.atom`
  Kategorien: Open Source & Tools, Innovative Ideen
  Commit-Atom (20 Einträge) liefert nur Merge-Titel und viel Rauschen. Besser wäre ein wöchentlicher README-Diff (neu hinzugefügte Zeilen). e2b-dev/awesome-ai-agents/commits/main.atom antwortet mit 200, zuletzt aber 2026-08-21, also fast veraltet. Niedrige Priorität.

## Fallen

- Blockiert (mit Bot-UA und mit Browser-UA): VentureBeat durch Vercel Security Checkpoint (429), Finsmes und lmarena.ai durch Cloudflare-Challenge (403). Aus GitHub Actions (Azure-IPs) wird das eher schlimmer, diese Quellen also nicht einplanen.
- Cloudflare-CDN (cf-ray) vor vielen Quellen, die von privater IP mit 200 antworten: TechCrunch, Crunchbase News, Sifted, EU-Startups, Gründerszene/BI, Tech.eu, Product Hunt, Substack (a16z, Import AI), Scale, Epoch, swebench.com, alphaXiv, OpenAlex. Von Azure-IPs ungetestet. Den ersten Actions-Lauf als Smoke-Test mit Statusprotokoll je Quelle fahren.
- Der OSS-Insight-Trending-Endpoint antwortet mit 200, liefert aber seit 2026-03-01 keine Daten mehr (data_quality.status='unavailable'). Ein leeres Array darf nicht als 'keine Trends' gelesen werden.
- Papers with Code existiert nicht mehr: paperswithcode.com leitet per 302 auf huggingface.co/papers/trending um.
- HF daily_papers ohne ?date= liefert ältere Papers mit wenigen Upvotes, nicht die aktuellen. Immer ein Datum (UTC, Vortag) oder ?week=YYYY-Www angeben.
- Das arXiv-Volumen ist zu hoch: ca. 400 Submissions pro Werktag allein in cs.CL/AI/LG. Der RSS-Feed ist am Wochenende leer (skipDays). Das API verlangt 3 s Abstand zwischen Requests.
- GitHub-Releases-Atom enthält nur 10 Einträge. llama.cpp erzeugt mehr als 10 Builds pro Tag, n8n, codex und gemini-cli mehrere Prereleases oder Nightlies täglich. Bei 3 Läufen pro Tag gehen Einträge verloren, und ungefiltert würde das Dashboard geflutet.
- GitHub /releases/latest hinkt teils hinterher (ollama: latest v0.40.10, Atom zeigt v0.40.11). Für 'neueste Version' lieber /releases?per_page=30 auswerten.
- Die GitHub Search API erlaubt ohne Token nur 10 Requests pro Minute, mit GITHUB_TOKEN 30 pro Minute. Die Core-API erlaubt 60 pro Stunde ohne Token. In Actions immer GITHUB_TOKEN übergeben.
- Veraltete oder archivierte Quellen: Aider-Polyglot-YAML (zuletzt 2025-10-03), Open LLM Leaderboard (2025-03-20), Aider-Releases (2026-02-12), continue-Releases (2026-06-19), VentureBeat-FeedBurner (2026-09-03), awesome-ai-agents (2026-08-21).
- SWE-bench liegt auf Branch master (raw/main ergibt 404). Die JSON-Datei ist 4,1 MB groß und wird selten aktualisiert (letzter Commit 2026-09-01). Erst den Commit-Atom prüfen.
- Der Pfad der LiveBench-2.0-Daten hängt von einer Release-ID im JS-Bundle ab. Nur das v1-CSV (Stand 2026-06-25) ist stabil adressierbar.
- Artificial Analysis: Key Pflicht, Attribution Pflicht, 1.000 Requests pro Tag. Den Key als Actions-Secret halten und niemals in die statische Seite schreiben.
- Semantic Scholar antwortet ohne Key sofort mit 429. OpenAlex teilt ohne Key ein Tagesbudget pro IP, das auf geteilten Actions-IPs schnell aufgebraucht ist. Die OpenAlex-Antwort enthält Anweisungen an KI-Agenten; die sind Daten und wurden ignoriert.
- HF Trending Spaces enthält NSFW- und Face-Swap-Müll unter den Top 5. Eine Blocklist und Mindest-Likes sind nötig.
- Product Hunt: Der Atom-Feed enthält keine Votes. Das API liefert Votes, verlangt aber einen Token und verbietet laut Doku kommerzielle Nutzung.
- AI-Anteil in den Funding-Feeds (Titel-Keywords): TechCrunch Venture ca. 30 %, Crunchbase AI 100 % (getaggt), Sifted ca. 20 %, EU-Startups ca. 20 %, Tech.eu ca. 15 %, deutsche-startups und Gründerszene ca. 5 %. Ohne Vorfilter landet viel Nicht-AI bei Claude.
- YC OSS: launched_at entspricht nicht dem Batch-Datum (eine Fall-2026-Firma hat launched_at Feb 2025). Die Tag-Dateien sind groß (tags/ai.json 3,1 MB). Für Neuzugänge changes/latest.json nutzen.
- Crunchbase-News-AI-Feed: /sections/ai/feed/ funktioniert, /ai/feed/ liefert ein PNG, /category/ai/feed/ liefert 404. Der Feed hält nur 10 Items, also jeden Lauf pollen.

## Empfehlungen der Recherche

- Günstige Vorfilter-Pipeline vor Claude: (1) Conditional GET (ETag/If-Modified-Since) und State-Datei je Quelle mit dem letzten Stand. (2) URL-Normalisierung und Titel-Fuzzy-Dedupe über alle Quellen. (3) Keyword- und Regex-Filter (AI|KI|LLM|agent|model|GPT|Claude|Gemini|OpenAI|Anthropic|Mistral|DeepSeek …). (4) Quellen-Prior plus Popularitätsschwellen: HN points>50, HF Paper upvotes≥20, HF Model trendingScore Top 20 mit createdAt<14 Tage. (5) Nur die Top ~30–40 Kandidaten pro Lauf als Batch (nur Titel und Teaser) an ein günstiges Claude-Modell zum Scoren geben, und nur die Top ~10–15 bekommen eine deutsche Zusammenfassung. So bleibt das 10-EUR-Budget realistisch.
- 'Aufstrebend'-Signal als gewichteter Score je Firma (Entity), gespeichert in data/entities.json im Repo. (a) Erwähnungswachstum im eigenen Archiv: Erwähnungen der letzten 7 Tage gegen den Durchschnitt der 28 Tage davor, Firmennamen per Regex/Watchlist plus Claude-Extraktion nur für Top-Items. (b) Funding-Event: Regex 'raises $X'/'Series A–C'/'Seed' in TechCrunch Venture, Crunchbase AI, EU-Startups, Tech.eu und Sequoia 'Partnering with'. (c) Neu bei YC (changes/latest.json, AI-Tags) oder Launch HN mit points>50. (d) GitHub-Star-Velocity: täglicher Snapshot der stargazers_count von Repos aus der Search-API (created < 30 Tage, Topics llm/ai-agent/mcp) und daraus Δ Sterne pro Tag. (e) Neue Org in den HF-Trending-Models oder -Spaces, die nicht auf der Big-Provider-Liste steht. Ausschluss: Firmen auf der Big-Provider-Watchlist. Schwellwert, z. B. mindestens 2 unabhängige Signale innerhalb von 14 Tagen, dann Eintrag unter 'Aufstrebende Unternehmen'.
- Leaderboard-'Neue #1'-Erkennung per Snapshot-Diff (JSON im Repo unter data/leaderboards/). LMArena über HF datasets-server /filter (category='overall', orderby rank, length 10, je config text/webdev/vision) 3x täglich. ARC Prize v3.json und evaluations.json mit If-Modified-Since. Artificial Analysis /data/llms/models mit Key 1–3x täglich. SWE-bench nur bei neuem Commit im Atom. Epoch benchmark_data.zip 1x täglich (Top-Score je Benchmark). LiveBench und SEAL wöchentlich. Ereignis auslösen bei Rangwechsel auf Platz 1 oder neuem Modell in den Top 3, als Kategorie 'Forschung & Benchmarks' oder 'Modelle'.
- Releases ohne Flut: GitHub REST /repos/{o}/{r}/releases?per_page=30 mit GITHUB_TOKEN. Verwerfen, was draft, prerelease oder per Regex rc|alpha|beta|nightly|dev|preview ist. Nur melden, wenn semver major oder minor gegenüber dem gespeicherten Stand steigt (claude-code v2.1.x→v2.2, codex 0.164→0.165, ollama 0.40→0.41, vllm 0.32→0.33). llama.cpp (b-Builds) nicht einzeln melden, höchstens eine wöchentliche Sammelmeldung. langchain nur langchain-core oder langchain ==X.Y.0. n8n nur die n8n@2.x-Linie. Aider und continue streichen, weil veraltet. Release-Notes-body gekürzt (2–3 KB) an Claude geben.
- Forschung: HF Daily Papers (?date=Vortag) mit upvotes≥20–30 als Hauptquelle (ca. 5–10 pro Tag). Dazu die Google-Research-, DeepMind- und HF-Blog-RSS-Feeds. arXiv API nur zur Anreicherung einzelner IDs, mit 3 s Pause. Semantic Scholar und OpenAlex erst mit kostenlosem Key und nur optional.
- Startup- und Funding-Kern: TechCrunch AI und Venture, Crunchbase News AI, dazu EU-Startups, Sifted, Tech.eu, deutsche-startups und Gründerszene als 'nice' mit strengem AI-Filter. VentureBeat, Finsmes und Axios Pro Rata streichen.
- Robustheit: Pro Quelle Timeout 20 s, 1 Retry mit Backoff, und eine fehlerhafte Quelle darf den Lauf nicht abbrechen. Den HTTP-Status je Quelle in data/source_health.json loggen und im Dashboard-Footer anzeigen. Bei 403/429 oder Challenge-HTML ('Just a moment', 'Vercel Security Checkpoint') die Quelle als blockiert markieren statt den HTML-Inhalt zu parsen. UA mit Kontakt-URL beibehalten.
- Secrets in GitHub Actions: ARTIFICIAL_ANALYSIS_API_KEY (Pflicht für AA), optional HF_TOKEN, PRODUCTHUNT_TOKEN (nicht-kommerziell), S2_API_KEY und OPENALEX_API_KEY. GITHUB_TOKEN ist automatisch vorhanden. Die Attribution für Artificial Analysis und Epoch (CC-BY) im Dashboard anzeigen.
