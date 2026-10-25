# Presse, Newsletter & Community

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (11)

- **TechCrunch – AI** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T23:05Z
  `https://techcrunch.com/category/artificial-intelligence/feed/`
  Kategorien: Neuigkeiten, Modelle, Funding & Übernahmen, Aufstrebende Unternehmen, Innovative Ideen
  Aus alter Liste, funktioniert unverändert. ~10 Items/Tag, ~75% KI-Titel (auch Robotaxi/Events). RSS mit description + category (gut für Vorfilter). Stark für Funding/Startups/Modelle. Nur 20 Items im Feed, bei 3 Läufen/Tag reicht das. Cloudflare davor (cf-ray), aktuell 200 für Bot-UA, aus Azure-IPs könnte eine Challenge kommen, daher Health-Monitoring.
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare ohne __cf_bm. Nur 20 Items (abgeschnitten), etwa 8 KI-Items pro Tag. Fallback: Techmeme, heise, the-decoder.
- **The Verge – AI** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23T21:11Z
  `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml`
  Kategorien: Neuigkeiten, Modelle, Vertragsänderungen, Innovative Ideen
  Aus alter Liste, OK. Atom, nur 10 Items (~6–10/Tag). ~60% KI-Titel, der Sektionsfeed enthält auch Gadget-Themen, daher trotzdem Keyword-Filter. summary + content vorhanden. Gut für Consumer-KI und ToS/Privacy-Änderungen (z.B. Google-Privacy-Policy).
- **heise online – Thema Künstliche Intelligenz** · atom · geprüft · HTTP 200 · neuestes: 2026-10-24T08:14Z
  `https://www.heise.de/thema/Kuenstliche-Intelligenz.xml`
  Kategorien: Neuigkeiten, Modelle, Gesetze, Sicherheitslücken, Vertragsänderungen, Open Source & Tools
  Beste deutsche KI-Quelle: 100 Items über 9 Tage (~10/Tag), ~70% KI im Titel, summary vorhanden. heise+-Artikel (Paywall) tragen '| heise+' im Titel, kennzeichnen oder abwerten. Weiterer Feed: heise developer https://www.heise.de/developer/feed.xml (Redirect von /developer/rss/news-atom.xml, ~5/Tag, ~30% KI). Gesamtfeed https://www.heise.de/rss/heise-atom.xml: 150 Items, ~23+/Tag, 16% KI.
- **golem.de – Themenfeed KI** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23T13:48Z
  `https://rss.golem.de/rss.php?feed=ATOM1.0&ms=ki`
  Kategorien: Neuigkeiten, Modelle, Open Source & Tools
  URL aus <link rel=alternate> der Seite golem.de/specials/ki/ (der geratene Parameter tp=ki liefert 404). 40 Items über 5 Tage (~8/Tag), ~78% KI, kurze summary. Gesamtfeed rss.php?feed=ATOM1.0: ~23/Tag, nur 15% KI, Anzeigen ('Anzeige:') im Titel.
- **The Decoder (DE)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24T08:40Z
  `https://the-decoder.de/feed/`
  Kategorien: Modelle, Neuigkeiten, Forschung & Benchmarks, Sicherheitslücken
  Reines KI-Medium auf Deutsch: ~6 Items/Tag, ~90–100% KI, kein Keyword-Filter nötig. Nur 10 Items im Feed, daher jeden Lauf abholen und GUIDs speichern. description-Teaser + Kategorien. Sehr schnell bei Modell-Releases und Benchmarks.
- **The Decoder (EN)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T19:00Z
  `https://the-decoder.com/feed/`
  Kategorien: Modelle, Neuigkeiten, Forschung & Benchmarks
  ~9 Items/Tag, 100% KI. Großteils Übersetzungen der DE-Artikel, also Dedupe DE/EN nötig (z.B. nur DE scoren und EN nur für Items ohne DE-Pendant nutzen). Nur 10 Items im Feed.
- **Simon Willison's Weblog** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T21:35Z
  `https://simonwillison.net/atom/everything/`
  Kategorien: Modelle, Preise & API-Änderungen, Open Source & Tools, Sicherheitslücken
  ~2–3 Items/Tag (Links, Quotes, Notes, Entries), inhaltlich >80% LLM/KI-Tools. Titel enthalten oft kein KI-Keyword, also NICHT per Titel filtern, sondern komplett aufnehmen. Sehr früh bei Modell-Releases, Preis/API-Änderungen und Prompt-Injection. /atom/entries/ enthält nur lange Artikel (~1/Woche). Cloudflare.
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare (Cache HIT, ohne __cf_bm), geringes Risiko. Nur etwa 9 von 14 Einträgen pro Woche sind KI-relevant, deshalb Keyword-Filter.
- **Latent Space (inkl. [AINews])** · rss · geprüft, Bot-Schutz · HTTP 200 (Redirect auf latent.space/feed) · neuestes: 2026-10-24T07:18Z
  `https://www.latent.space/feed`
  Kategorien: Modelle, Open Source & Tools, Forschung & Benchmarks, Neuigkeiten
  ~1–2 Items/Tag, enthält die täglichen '[AINews]'-Recaps (früher news.smol.ai, dessen RSS seit 2026-09-09 nicht mehr aktualisiert wird) plus Podcast/Essays. 1,3 MB Volltext, also Conditional GET. Substack/Cloudflare.
- **Techmeme** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24T06:35Z
  `https://www.techmeme.com/feed.xml`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Modelle, Sicherheitslücken
  15 Items decken ~12 h ab (~30/Tag), ~40% KI. <link> ist der Techmeme-Permalink, die Original-URL steht im ersten <A HREF> der description, die Quelle als '(Autor/Publikation)' am Titelende. Sehr gutes Wichtigkeitssignal: Story auf Techmeme gibt einen Impact-Boost. Cloudflare.
  Nachprüfung: 200 (Bot- und curl-UA). Cloudflare ohne __cf_bm. 15 Items; nach Keyword-Filter etwa 8 KI-Items pro Tag. Fallback: TechCrunch und HN Algolia.
- **Hacker News via Algolia API** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100,created_at_i%3E<UNIX_NOW_MINUS_36H>&hitsPerPage=200`
  Kategorien: Neuigkeiten, Open Source & Tools, Innovative Ideen, Modelle, Sicherheitslücken
  Keine Auth, CORS *, Google Frontend. Live getestet: points>100 über 7 Tage ergibt 290 Storys (~41/Tag), points>50 über 24 h ergibt 50 Storys, davon ~10 KI. Felder: objectID, title, url, points, num_comments, created_at_i, author. Diskussion: https://news.ycombinator.com/item?id=<objectID>. Empfehlung: OHNE query abrufen und lokal per Regex filtern. query+optionalWords getestet, bringt Fehltreffer (UUIDv7, FP-Artikel). Zweite Abfrage tags=show_hn&points>50 für 'Innovative Ideen'.
- **SCMP Tech RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://www.scmp.com/rss/36/feed`
  Kategorien: Neuigkeiten, Aufstrebende Unternehmen
  Cloudflare, 50 Items, etwa 3 KI-Items pro Tag. Big-Tech-Feed https://www.scmp.com/rss/320663/feed ebenfalls 200 (Stand 23.10.). Beste englische Quelle für Baidu, ByteDance und Tencent, also für Labs mit wenig Open-Weights-Output.
  (aus der Nachprüfung)

## Ergänzend (33)

- **Ars Technica – AI** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T20:19Z
  `https://arstechnica.com/ai/feed/`
  Kategorien: Neuigkeiten, Sicherheitslücken, Forschung & Benchmarks, Vertragsänderungen
  ~3 Items/Tag, ~60% KI-Titel (enthält auch Security/Policy). content:encoded im Feed. Gute Hintergründe und Security. Der Gesamtfeed feeds.arstechnica.com/arstechnica/index bringt ~11/Tag bei fast 0% KI, also nicht nutzen.
- **Wired – AI (Tag-Feed)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22T19:56Z
  `https://www.wired.com/feed/tag/ai/latest/rss`
  Kategorien: Neuigkeiten, Sicherheitslücken, Gesetze
  Die URL der alten Liste (/feed/category/ai/latest/rss) liefert jetzt 404, ersetzt durch diese. 10 Items, ~5–7/Tag, nur ~40% KI-Titel, daher Keyword-Filter. Cloudflare davor, Bot- und Browser-UA beide 200. Teilweise Paywall.
- **MIT Technology Review – AI** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22T21:17Z
  `https://www.technologyreview.com/topic/artificial-intelligence/feed/`
  Kategorien: Forschung & Benchmarks, Neuigkeiten, Gesetze
  Aus alter Liste, OK. 10 Items, ~3/Tag, ~90% KI. Achtung: Sponsored-Beiträge von 'MIT Technology Review Insights' im Feed (z.B. 'The Foundations of Scalable AI'), per Autor/Kategorie ausfiltern. Teilweise Paywall.
- **The Register – alle Headlines** · rss · geprüft · HTTP 200 (Redirect auf api.theregister.com …remapper=rss) · neuestes: 2026-10-23T22:36Z
  `https://www.theregister.com/headlines.atom`
  Kategorien: Sicherheitslücken, Neuigkeiten, Preise & API-Änderungen
  Leitet auf die Register-API (RSS) weiter. 50 Items, ~20/Tag, ~38% KI, daher Keyword-Filter. Der KI-Sektionsfeed /software/ai_ml/headlines.atom liefert nur ~2 Items/Woche (zu enge Tag-Abfrage, Items bis Mai zurück), deshalb lieber diesen Gesamtfeed filtern. Stark bei Security und kritischer Enterprise-KI. ~300 KB.
- **Axios – Gesamtfeed** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24T09:15Z
  `https://api.axios.com/feed/`
  Kategorien: Neuigkeiten, Gesetze, Funding & Übernahmen
  Kein Ressort- oder AI-Feed gefunden (api.axios.com/feed/technology liefert 404). Der Gesamtfeed hat 100 Items, ~12/Tag, ~20% KI, daher Keyword-Filter Pflicht. 1,1 MB, also Conditional GET nutzen. Cloudflare. Gut für US-Policy (Washington und KI).
- **Semafor – Gesamtfeed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T19:33Z
  `https://www.semafor.com/rss.xml`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Gesetze
  Nur Gesamtfeed: 271 Items über 10 Tage (~16–27/Tag), ~20% KI. /vertical/tech/rss.xml liefert 404. 880 KB, daher Conditional GET und Keyword-Filter. Geringer Mehrwert gegenüber Axios/Techmeme.
- **The Information** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T22:26Z
  `https://www.theinformation.com/feed`
  Kategorien: Funding & Übernahmen, Modelle, Aufstrebende Unternehmen, Neuigkeiten
  In der alten Liste ohne Feed geführt (rss=None), es gibt aber einen öffentlichen Atom-Feed: 20 Items, ~13/Tag, ~55% KI. Titel + Teaser, Links auf /articles (Paywall) und /briefings (Kurzmeldungen). Exklusive Scoops zu Funding, Deals und Modellen (z.B. Kimi K3.1 Pro). Im Dashboard als Paywall kennzeichnen. Cloudflare.
- **The Guardian – Artificial intelligence** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24T08:32Z
  `https://www.theguardian.com/technology/artificialintelligenceai/rss`
  Kategorien: Neuigkeiten, Gesetze
  ~9 Items/Tag, ~60% KI-Titel, Gesellschaft und Regulierung (UK/EU). Keine Paywall. Ergänzung, falls mehr EU-Policy-Perspektive gewünscht.
- **Financial Times – Artificial intelligence** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24T04:00Z
  `https://www.ft.com/artificial-intelligence?format=rss`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Gesetze
  25 Items, ~8/Tag, ~72% KI. Nur Titel + Teaser, Artikel hinter Paywall. Cloudflare. Gut für Markt/Finanz-Kontext (Neoclouds, Bewertungen).
- **heise Security** · atom · geprüft · HTTP 200 (Redirect von /security/rss/news-atom.xml) · neuestes: 2026-10-23T12:03Z
  `https://www.heise.de/security/feed.xml`
  Kategorien: Sicherheitslücken
  ~16 Items/Tag, nur ~20% KI-Bezug. Mit KI-Keyword-Filter (KI, LLM, Copilot, Agent, MCP, Prompt-Injection) für die Kategorie Sicherheitslücken. Deutsche Perspektive (BSI, Behörden).
- **t3n – Tag Künstliche Intelligenz** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24T08:00Z
  `https://t3n.de/tag/kuenstliche-intelligenz/rss.xml`
  Kategorien: Neuigkeiten, Innovative Ideen, Aufstrebende Unternehmen
  Nur 10 Items (~6–10/Tag). Der Tag-Feed ist unsauber, enthält auch Nicht-KI-Themen (z.B. Super Mario 64), Titel-KI-Quote ~50%, daher Keyword-Filter. Zielgruppe Digital/Produkt passt gut zur Persona. Gesamtfeed https://t3n.de/rss.xml ~17/Tag, 25% KI.
- **netzpolitik.org** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24T06:53Z
  `https://netzpolitik.org/feed/`
  Kategorien: Gesetze, Vertragsänderungen, Sicherheitslücken
  ~2 Items/Tag, ~16% KI im Titel, aber zentral für Gesetze (AI Act, Datenschutz, DE-Digitalpolitik, Rechenzentren). Volltext im Feed (446 KB, also Conditional GET). Lizenz CC BY-NC-SA, für Zusammenfassung mit Link unkritisch.
- **Handelsblatt – Technologie** · rss · geprüft, Bot-Schutz · HTTP 200 (Redirect auf feeds.cms.handelsblatt.com/technologie) · neuestes: 2026-10-24T08:34Z
  `https://www.handelsblatt.com/contentexport/feed/technologie`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Gesetze
  ~8 Items/Tag, ~40% KI, daher Keyword-Filter. Viele Artikel hinter Paywall (H+). Cloudflare (2 cf-ray). Einen eigenen KI-Feed gibt es nicht (feeds.cms.handelsblatt.com/technologie-ki liefert 404). Gut für DE-Wirtschaftsperspektive.
- **FAZ – Künstliche Intelligenz** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22T18:33Z
  `https://www.faz.net/rss/aktuell/wirtschaft/kuenstliche-intelligenz/`
  Kategorien: Neuigkeiten, Gesetze
  Geringes Volumen (~3/Woche, Feed reicht bis 2025 zurück), aber 93% KI. Großteils F+ Paywall. Die Digitec-URL /rss/aktuell/wirtschaft/digitec/ liefert 404. Technik/Digital (/rss/aktuell/technik-motor/digital/) bringt nur ~3/Woche bei ~10% KI, nicht nutzen.
- **Süddeutsche – Digital** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22T10:46Z
  `https://rss.sueddeutsche.de/rss/Digital`
  Kategorien: Neuigkeiten, Gesetze
  ~1 Item/Tag (15 Items über 16 Tage), ~50% KI. Teilweise SZ-Plus-Paywall. Sehr geringes Volumen, eher optional.
- **Import AI (Jack Clark)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-19T12:31Z
  `https://importai.substack.com/feed`
  Kategorien: Forschung & Benchmarks, Gesetze
  Wöchentlich, 100% KI, Schwerpunkt Forschung und Policy. 470 KB Volltext. Substack/Cloudflare. Eher als Kontextquelle, wenig Eilmeldungen.
- **Interconnects (Nathan Lambert)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20T17:04Z
  `https://www.interconnects.ai/feed`
  Kategorien: Open Source & Tools, Modelle, Forschung & Benchmarks
  ~2 Items/Woche. Die Serie 'Latest open artifacts' eignet sich gut für Open-Weights-Releases. 560 KB. Substack/Cloudflare.
- **One Useful Thing (Ethan Mollick)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20T15:57Z
  `https://www.oneusefulthing.org/feed`
  Kategorien: Innovative Ideen, Neuigkeiten
  ~1 Item/Woche oder unregelmäßig, praktische Nutzung von ChatGPT/Claude/Gemini, passt zur Persona. 920 KB Volltext. Substack/Cloudflare.
- **Ben's Bites** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22T13:01Z
  `https://www.bensbites.com/feed`
  Kategorien: Innovative Ideen, Open Source & Tools, Aufstrebende Unternehmen
  ~2 Items/Woche (nicht mehr täglich), Fokus auf Produkte und Tools. 720 KB. Substack-artig/Cloudflare.
- **TLDR AI** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://tldr.tech/api/rss/ai`
  Kategorien: Neuigkeiten, Modelle, Open Source & Tools, Innovative Ideen
  1 Item pro Ausgabe (werktags). Das RSS enthält nur Ausgabentitel + Link auf https://tldr.tech/ai/YYYY-MM-DD. Die Issue-Seite ist serverseitig gerendert (200, ~84 KB) mit ~15 Story-Links (utm_source=tldrai), h3-Überschriften mit '(Sponsor)' verwerfen. Zweistufig: RSS, dann Issue-Seite parsen. Läuft auf Vercel, aktuell kein Checkpoint.
- **The Batch (DeepLearning.AI)** · html-page · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://www.deeplearning.ai/the-batch/`
  Kategorien: Forschung & Benchmarks, Modelle, Neuigkeiten
  Kein offizielles RSS (/the-batch/feed liefert 404, und laut Recherche gibt es auch keins). Die Übersichtsseite ist serverseitig gerendert und enthält Links /the-batch/issue-N (aktuell 376) sowie sichtbare Daten (Oct 23, 2026). Als HTML-Diff auf die höchste Issue-Nummer umsetzen. Wöchentlich. Cloudflare.
- **Stratechery (Ben Thompson)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T17:00Z
  `https://stratechery.com/feed/`
  Kategorien: Neuigkeiten, Funding & Übernahmen
  ~1 Item/Tag, der öffentliche Feed enthält freie Artikel/Teaser, Daily Updates sind paywalled. Nur ~10–30% KI, daher Filter. Strategische Einordnung, keine Eilmeldungen. Niedrige Priorität.
- **Platformer (Casey Newton)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T00:47Z
  `https://www.platformer.news/rss/`
  Kategorien: Gesetze, Vertragsänderungen, Neuigkeiten
  ~2 Items/Woche, teils Paywall. Plattform-Policy, Regulierung (z.B. 'The states come for OpenAI'). Ghost-Feed.
- **Last Week in AI** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-09T05:06Z
  `https://lastweekin.ai/feed`
  Kategorien: Neuigkeiten, Modelle
  Wöchentlich bis unregelmäßig (Newsletter + Podcast), 100% KI. Aktuell >2 Wochen ohne neues Item, also unzuverlässig. Als Wochen-Recap nur zur Absicherung (fehlende Storys finden), nicht als Primärquelle.
- **AI as Normal Technology (ex AI Snake Oil)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-19T20:11Z
  `https://www.normaltech.ai/feed`
  Kategorien: Forschung & Benchmarks, Gesetze
  aisnakeoil.com/feed leitet hierher um. ~1–2 Items/Monat, kritische Analyse (Agent-Evaluation, Safety-Policy). 1,4 MB, also Conditional GET. Geringes Volumen.
- **Gary Marcus – Marcus on AI** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22T15:29Z
  `https://garymarcus.substack.com/feed`
  Kategorien: Neuigkeiten, Forschung & Benchmarks
  ~3–4 Items/Woche, Meinung und Skepsis. Nur als Kontext, im Scoring niedrig gewichten. Substack/Cloudflare.
- **Don't Worry About the Vase (Zvi Mowshowitz)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23T21:13Z
  `https://thezvi.substack.com/feed`
  Kategorien: Neuigkeiten, Gesetze, Modelle
  ~1 Item/Tag, sehr lange Posts, Feed 2,1 MB. Leichterer WordPress-Mirror (verifiziert, 614 KB, 10 Items): https://thezvi.wordpress.com/feed/. Die wöchentlichen 'AI #NNN'-Digests eignen sich als Absicherung gegen verpasste Storys.
- **Lobste.rs – Tag ai** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23T17:25Z
  `https://lobste.rs/t/ai.rss`
  Kategorien: Open Source & Tools, Forschung & Benchmarks
  ~1 Item/Tag (25 Items über ~39 Tage), technisch und KI-kritisch. Zusätzlich https://lobste.rs/t/vibecoding.rss (~1–2/Tag, für Coding-Tools). /t/ml.rss ist kaum KI, nicht nutzen. Kein Score im Feed.
- **Reddit – Multi-Subreddit Top/Tag (RSS)** · atom · geprüft, Bot-Schutz · HTTP 200 (lokal, residential IP) · neuestes: 2026-10-24T05:15Z
  `https://www.reddit.com/r/LocalLLaMA+MachineLearning+OpenAI+ClaudeAI+singularity/top/.rss?t=day&limit=50`
  Kategorien: Open Source & Tools, Modelle, Neuigkeiten
  Ein Request deckt alle Subs ab (50 Top-Posts, ~60% KI, viel Rauschen und Memes, kein Score im RSS). Einzelfeeds direkt danach: 429 bei Bot- und Browser-UA. Der .json-Endpoint liefert schon lokal 403 'blocked by network security', old.reddit leitet auf Login um. Aus GitHub Actions (Azure) wird laut Community-Berichten oft komplett mit 403 geblockt. Offizielle Alternative: OAuth-App über die Reddit Data API (auth_needed, Nutzungsbedingungen prüfen). Nur experimentell.
- **Google News RSS – Suche DE** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24T08:37Z
  `https://news.google.com/rss/search?q=%22K%C3%BCnstliche%20Intelligenz%22%20OR%20KI-Modell%20when:1d&hl=de&gl=DE&ceid=DE:de`
  Kategorien: Neuigkeiten, Gesetze
  33 Items/Tag, ~94% KI. <source url=…> nennt den Publisher (Zeit, Handelsblatt, Focus …). Item-Links sind opake news.google.com/rss/articles/CBMi…-Redirects. Aus EU-IP kommt 302 auf consent.google.com, die Original-URL steht nicht im Feed, also Dedupe über Titel+Source. Kein offizielles API, Google-Bedingungen sehen nur persönliche Nutzung vor. Daher nur als Discovery/Backup und für Quellen ohne RSS (Reuters, VentureBeat via site:).
- **Bluesky – Public AppView API (Autor-Feeds)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=simonwillison.net&limit=5&filter=posts_no_replies`
  Kategorien: Modelle, Neuigkeiten, Open Source & Tools
  Ohne Auth. Felder: post.record.text/createdAt, likeCount, repostCount, embed.external.uri (verlinkter Artikel, ideal für Link-Extraktion). Aktive Handles verifiziert: simonwillison.net, emollick.bsky.social, natolambert.bsky.social (alle 2026-10-23), hardmaru.bsky.social (10-15), garymarcus.bsky.social (09-19). karpathy.bsky.social ist seit 2023 inaktiv, jackclark.bsky.social hat einen leeren Feed. Das Profil-RSS https://bsky.app/profile/<handle>/rss funktioniert (Redirect auf DID), hat aber keine <title>, keine Metriken und ein Nicht-Standard-Datum ('23 Oct 2026 19:45 +0000'), daher lieber die API.
- **TechNode AI Tag Feed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://technode.com/tag/ai/feed/`
  Kategorien: Neuigkeiten, Aufstrebende Unternehmen
  Sehr groß: 5,4 MB mit 610 Items, der Haupt-Feed technode.com/feed/ sogar 11,9 MB mit 2000 Items. ETag und Last-Modified sind vorhanden, deshalb nur Conditional GET. /category/ai/feed/ liefert 404.
  (aus der Nachprüfung)
- **Pandaily Feed** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://pandaily.com/feed/`
  Kategorien: Neuigkeiten, Aufstrebende Unternehmen
  Cloudflare, 20 Items, etwa 12 KI-Items pro Tag (gemessen) und damit die volumenstärkste China-Quelle. Viel Rauschen, deshalb strenger Org-Filter (Alias-Tabelle). KrASIA /feed liefert 404.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (5)

- **VentureBeat – AI** · rss · NICHT nutzbar, Bot-Schutz · HTTP 429 (Vercel Security Checkpoint) · neuestes: n/a
  `https://venturebeat.com/category/ai/feed/`
  Kategorien: Neuigkeiten, Modelle
  Aus alter Liste, BLOCKIERT: Bot-UA und Browser-UA bekommen beide 429 mit 'Vercel Security Checkpoint' (x-vercel-mitigated: challenge). venturebeat.com/feed/ ebenso. Feedburner-Alternative feeds.feedburner.com/venturebeat/SZYF ist eingefroren (neuestes Item 2026-09-03). Falls überhaupt, nur über Google News mit site:venturebeat.com.
- **Reuters – Technology/AI** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 401 (DataDome) · neuestes: n/a
  `https://www.reuters.com/technology/artificial-intelligence/`
  Kategorien: Neuigkeiten, Funding & Übernahmen, Gesetze
  Kein offizielles RSS mehr (seit 2020 eingestellt). reutersagency.com/feed/... liefert 404 (Cloudflare). Die Website antwortet mit 401 und DataDome-Captcha (captcha-delivery). Workaround verifiziert (200, ~100 Items/Tag, nur ~16% KI-Titel, Filter nötig): https://news.google.com/rss/search?q=site:reuters.com%20(AI%20OR%20OpenAI%20OR%20Anthropic)%20when:1d&hl=en-US&gl=US&ceid=US:en (Redirect-Links, siehe Google-News-Eintrag).
- **AI News (artificialintelligence-news.com)** · rss · NICHT nutzbar, Bot-Schutz · HTTP 403 (Bot-UA) / 301→Startseite (Browser-UA) · neuestes: n/a
  `https://www.artificialintelligence-news.com/feed/`
  Kategorien: Neuigkeiten
  Aus alter Liste. Bot-UA bekommt 403, mit Browser-UA leitet /feed/ auf die Startseite um, der Feed ist also offenbar entfernt. Dazu PR-lastig mit geringem Mehrwert. Streichen.
- **Tagesschau – Wissen/Technologie (und ZDFheute)** · rss · NICHT nutzbar · HTTP 200 (aber veraltet) · neuestes: 2025-05-01
  `https://www.tagesschau.de/wissen/technologie/index~rss2.xml`
  Kategorien: Neuigkeiten
  Der Technologie-Feed antwortet mit 200, ist aber eingefroren (neuestes Item 2025-05-01), also stale. https://www.tagesschau.de/wissen/index~rss2.xml ist aktuell (~2/Tag), hat aber nur ~10% KI. Eine KI-Themen-URL gibt es nicht (404). ZDFheute bietet nur den Gesamtfeed https://www.zdfheute.de/rss/zdf/nachrichten (174 Items, kaum KI, Akamai), /digitales liefert 404. Beide auslassen.
- **hnrss.org (alte HN-Quelle)** · rss · NICHT nutzbar · HTTP 502 (Bot-UA, 2 von 3 Versuchen); 200 mit Browser-UA · neuestes: 2026-10-24T09:12Z
  `https://hnrss.org/newest?q=AI+LLM+GPT+Claude+Gemini+Copilot&count=30`
  Kategorien: Neuigkeiten
  Aus alter Liste. Instabil (502 auch bei /frontpage?points=100). Die alte Abfrage verknüpft alle Wörter per UND (Algolia-Semantik), liefert also kaum Treffer. 'newest' bringt außerdem ungefilterte Neuposts ohne Punkte-Schwelle. Durch die Algolia-API ersetzen.

## Fallen

- VentureBeat (alte Liste) ist hinter dem Vercel Security Checkpoint: 429 bei Bot- UND Browser-UA. Der Feedburner-Feed ist seit 2026-09-03 eingefroren. Ohne Workaround nicht nutzbar.
- Reuters hat kein RSS (seit 2020) und blockt die Website per DataDome (401, captcha-delivery). Nur über Google News mit site:reuters.com erreichbar.
- Reddit: der .json-Endpoint liefert schon von residential IP 403 'blocked by network security'. Für .rss gilt faktisch 1 Request/Minute (x-ratelimit-remaining 0.0), danach 429. Von GitHub-Actions-/Azure-IPs ist ein kompletter 403-Block wahrscheinlich. Browser-UA-Spoofing hilft nicht.
- hnrss.org ist instabil (502). Die alte Abfrage 'q=AI LLM GPT …' verknüpft alle Begriffe per UND und findet fast nichts.
- Google-News-Links sind opake Redirects (news.google.com/rss/articles/CBMi…); aus EU-IPs kommt ein 302 auf consent.google.com. Die Original-URL fehlt im Feed, Google-Bedingungen sehen nur persönliche Nutzung vor, und es gibt viele Duplikate mit den Direktfeeds.
- Geänderte oder umgeleitete URLs der alten Liste: Wired /feed/category/ai/latest/rss ist jetzt 404, neu /feed/tag/ai/latest/rss. Weiterleitungen: heise developer/security auf /developer/feed.xml bzw. /security/feed.xml, The Register auf api.theregister.com, Handelsblatt auf feeds.cms.handelsblatt.com, aisnakeoil.com auf normaltech.ai, latent.space ohne www. Der Collector muss Redirects folgen (curl -L) und finale URLs loggen.
- Tote oder veraltete Quellen, die trotzdem HTTP 200 liefern: Tagesschau Wissen/Technologie (neuestes Item 2025-05-01), mixed.de (eingestellt 2025-08, in heise aufgegangen), news.smol.ai RSS (seit 2026-09-09, AINews läuft jetzt über Latent Space), VentureBeat Feedburner. Daher Freshness-Check pro Quelle (neuestes Item älter als X Tage, dann Warnung) statt nur Statuscode prüfen.
- artificialintelligence-news.com (alte Liste): Bot-UA bekommt 403, Browser-UA wird auf die Startseite umgeleitet, der Feed ist entfernt.
- Sektions- und Tag-Feeds sind nicht rein KI: Verge AI, Wired AI-Tag, Ars AI und t3n KI-Tag enthalten Gadget-, Security- und Gaming-Artikel (Titel-KI-Quote 40–60%). Der Keyword-Vorfilter muss auch für 'KI-Feeds' laufen; Ausnahme sind reine KI-Medien (The Decoder, heise KI ~70%, golem KI ~78%).
- Keyword-Filter nur auf Titel versagt bei Blogs wie Simon Willison oder Zvi (Titel ohne KI-Wort, Inhalt fast 100% KI). Solche Quellen auf eine Whitelist ohne Filter setzen oder summary/content mitprüfen.
- MIT Technology Review AI enthält Sponsored-Content ('MIT Technology Review Insights'). Golem-Gesamtfeed enthält 'Anzeige:'-Titel, TLDR-Issues enthalten '(Sponsor)'-Blöcke. Alle drei vorab verwerfen.
- Paywalls: The Information, FT, Handelsblatt (H+), FAZ (F+), SZ Plus, heise+ (Titel endet auf '| heise+'), Stratechery, Platformer teilweise. Im Dashboard kennzeichnen und beim Scoring ggf. abwerten, weil der Nutzer den Link nicht lesen kann.
- Kleine Feeds (The Decoder DE/EN, Verge, MIT TR: je 10 Items; t3n KI: 10) laufen bei Ausfall mehrerer Läufe über. GUID-State muss persistent sein (z.B. JSON im Repo/Branch).
- Große Volltext-Feeds: SemiAnalysis 3,1 MB, Zvi 2,1 MB, normaltech 1,4 MB, Latent Space 1,3 MB, Axios 1,1 MB, Semafor 880 KB, KI-Update-Podcast 2 MB. Conditional GET (ETag/If-Modified-Since) nutzen und Body-Größe begrenzen.
- Viele Feeds liegen hinter Cloudflare (TechCrunch, Wired, Techmeme, The Information, FT, Handelsblatt, Axios, alle Substack-Feeds, Simon Willison, beehiiv). Von residential IP kommt aktuell 200 für den Bot-UA, aus Azure-IPs der GitHub Actions sind Challenges möglich. Per-Source-Health-Status ins Output-JSON schreiben und bei Fehlerserien alarmieren.
- Encoding und Datumsformate: HTML-Entities in Titeln (ZDF &#228;, BI &#39;, CDATA bei Decoder/TLDR). Bluesky-RSS-Datum '23 Oct 2026 19:45 +0000' ist nicht RFC-822-konform. Für die Zeit-Zuordnung nur robuste Datumsparser nutzen (feedparser/dateutil).
- The Decoder EN ist überwiegend eine Übersetzung von DE, ebenso tauchen Google-News-Items als Duplikate von heise/Zeit/Handelsblatt auf. Ohne URL- und Titel-Clustering vor dem Claude-Call wird das Budget verschwendet.

## Empfehlungen der Recherche

- Core-Set Presse (alle live 200, aktuell): heise Thema KI, The Decoder DE (+EN nur zum Dedupe), golem KI-Themenfeed, TechCrunch AI, The Verge AI, Simon Willison, Latent Space, Techmeme und HN-Algolia. Das sind zusammen ~130 Roh-Items/Tag mit hoher KI-Quote.
- HN-Abfrage konkret: GET https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100,created_at_i%3E{now-36h}&hitsPerPage=200 (ca. 40 Treffer/Tag), dann lokal mit DE/EN-Regex filtern (ai|llm|gpt|openai|anthropic|claude|gemini|copilot|cursor|mistral|llama|deepseek|qwen|kimi|agent(ic)?|mcp|inference|model …). Das 36-h-Fenster plus Punkte-Schwelle fängt Storys, die erst später über 100 Punkte steigen. Dedupe per objectID. Punkte und Kommentare als Social-Signal ins Impact-Scoring geben. Optional ein zweiter Call mit tags=show_hn&numericFilters=points%3E50,… für 'Innovative Ideen'.
- Techmeme als Wichtigkeitssignal nutzen: Original-URL aus dem ersten <A HREF> der description extrahieren und normalisieren. Taucht die Story auch auf Techmeme oder HN (>100 Punkte) auf, gibt es einen Impact-Boost, ohne dafür Claude-Tokens auszugeben.
- Günstige Vorfilter-Pipeline vor Claude: (1) GUID/URL-Dedupe gegen den State, (2) Sponsor/Anzeige/Paywall-Marker erkennen, (3) Keyword-Regex nur für gemischte Feeds (Register, Axios, Semafor, Handelsblatt, netzpolitik, heise Security, Spiegel/Zeit), Whitelist für reine KI-Feeds, (4) Clustering nach normalisierter URL und Titel-Trigrammen (DE/EN), (5) nur Titel + ~200 Zeichen Teaser in Batches an ein kleines Claude-Modell. So bleiben vermutlich 100–180 Kandidaten/Tag, und die ~10 EUR/Monat reichen.
- Ausfallsicherheit für GitHub Actions: User-Agent 'AIPulseBot/1.0 (+repo-URL)', Timeout 20 s, 1 Retry mit Backoff, Conditional GET, Freshness-Check (Warnung, wenn das neueste Item älter als 14 Tage ist bzw. bei Wochen-Newslettern älter als 30 Tage). Per-Source-Status (http_status, items, newest) als sources_health.json mitveröffentlichen, damit Cloudflare-Blocks aus Azure sofort sichtbar werden.
- Reddit nur experimentell: maximal 1 Multi-Sub-.rss-Request pro Lauf. Kommt aus Actions 403, Reddit streichen oder eine OAuth-Script-App über die Reddit Data API registrieren (Bedingungen für öffentliche Dashboards prüfen). Den .json-Endpoint ohne OAuth gar nicht nutzen.
- Google News RSS nur als Backup/Discovery: einmal DE-Query ("Künstliche Intelligenz" OR KI-Modell when:1d) und gezielte site:-Queries für Quellen ohne RSS (reuters.com, venturebeat.com). Für die Anzeige möglichst die Originalquelle aus den Direktfeeds verlinken; Google-Redirect-Links nur verwenden, wenn kein Direkt-Treffer existiert.
- Zweistufige Quellen: TLDR AI (RSS, dann Issue-Seite tldr.tech/ai/YYYY-MM-DD, ~15 Links, Sponsor-h3 verwerfen) und The Batch (HTML-Diff auf die höchste /the-batch/issue-N). Beide maximal 1x/Tag abrufen.
- Bluesky über public.api.bsky.app (getAuthorFeed, filter=posts_no_replies) für eine kleine Handle-Liste (simonwillison.net, emollick.bsky.social, natolambert.bsky.social, hardmaru.bsky.social, garymarcus.bsky.social). Nur Posts mit embed.external.uri und likeCount über einer Schwelle (z.B. 100) als Link-Signal übernehmen, nicht als eigene Story.
- Zusätzlich live verifiziert (200, aktuell), falls Kapazität frei ist: Crunchbase News https://news.crunchbase.com/feed/ (~3/Tag, Funding), Sifted https://sifted.eu/feed (~6/Tag, EU-Startups), The Rundown AI https://www.therundown.ai/feed (täglich), SemiAnalysis https://newsletter.semianalysis.com/feed (Compute/Chips, 3 MB), Exponential View https://www.exponentialview.co/feed, Zeit Digital https://newsfeed.zeit.de/digital/index (~8/Tag, 33% KI), Spiegel Netzwelt https://www.spiegel.de/netzwelt/index.rss (~3/Tag, 20% KI), CNBC Tech https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910 (~12/Tag, 43% KI), heise KI-Update-Podcast https://kiupdate.podigee.io/feed/mp3 (täglich, Titel listen die Themen, Feed 2 MB), deutsche-startups.de https://www.deutsche-startups.de/feed/ (13% KI).
- Aus der alten Liste streichen: VentureBeat (blockiert), artificialintelligence-news.com (Feed entfernt), hnrss (durch Algolia ersetzen). Korrigieren: Wired-URL. The Information neu mit Atom-Feed aufnehmen, Paywall kennzeichnen.
