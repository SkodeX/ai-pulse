# Kernquellen Phase 1 (Presse, Labs, Startups, Forschung/Open Source)

Startliste für `pipeline/config/sources.ts` (geplant, noch kein Register). Stand 2026-10-24, geprüft mit curl von einer deutschen Privat-IP (Katalog `docs/recherche/2026-10-24/katalog/` + Nachprüfung). Node-`fetch`-Probe am selben Tag (Windows-PC, Privat-IP, Steckbrief-UA, je URL 1 Abruf): alle Einträge 200 außer `chatgpt-release-notes` und `xai-sitemap` (403, curl 200 → `startStatus: 'blockiert'`, SKILL § 5); HN-Algolia und Olshansk-Feeds nicht mitgeprüft. Spalte „Server" nach den drei Smoke-Läufen auf dem Heimserver füllen (ok/blockiert + Datum, [smoke-test.md](smoke-test.md)). Quellen für Sicherheitslücken, Gesetze, Vertragsänderungen sowie Modell-Detektoren/Ranglisten stehen in `sicherheitsluecken`, `gesetze-und-fristen`, `vertragsaenderungen`, `modelle-und-ranglisten` (Phase 4).

**Umfang:** 51 Kernquellen (10 Presse & Community, 20 Labs, 5 Startups, 3 Forschung, 13 GitHub-Repos) = Nenner von Smoke-Test und Trockenlauf-Bericht, dazu 4 `fallbackOnly`-Feeds. Für ≥ 90 % `ok` sind ≥ 46 nötig.

Takt: `3x` jeder Lauf · `daily07` einmal täglich (07:07, holt nach) · `weekly` ab Sonntag 07:07. „Filter" = `aiOnly: false` (Keyword-Regex), „aiOnly" = Whitelist. Rolle (`role`): `official` · `press` · `community` · `aggregator` (SKILL § 1). `fallbacks`: Matrix in SKILL § 8, Quellen ohne Zeile dort `[]`. htmldiff-Quellen: `container` und `dateRe` erst nach dem ersten Abruf festlegen – die Datumsformate unten sind Katalogbefunde.

**`outlet`-Gruppen** (gleiche `outlet` = eine Stimme im Mehrfachquellen-Signal; ohne Angabe gilt die `id`):
`openai` openai-news, openai-api-changelog, chatgpt-release-notes, olshansk-openai, gh-codex, gh-openai-python · `anthropic` anthropic-sitemap, claude-platform-notes, claude-apps-notes, olshansk-anthropic-news, olshansk-claude, gh-claude-code · `google` deepmind-blog, google-ai-blog, gemini-blog, gemini-api-changelog, gemini-apps-notes, google-research, gh-gemini-cli · `mistral` mistral-news, olshansk-mistral · `techcrunch` techcrunch-ai, techcrunch-venture · `hn` hn, hn-show · `heise` heise-ki (+ `heise-security` aus `sicherheitsluecken`).

## Presse & Community

| id | URL | Art | Rolle | Takt | Hinweise | Server |
|---|---|---|---|---|---|---|
| `heise-ki` | https://www.heise.de/thema/Kuenstliche-Intelligenz.xml | feed | press | 3x | de, aiOnly (~70 % KI); 100 Entries ≈ 9 Tage; Paywall-Marker `heise+` am Titelende; nur Last-Modified | |
| `golem-ki` | https://rss.golem.de/rss.php?feed=ATOM1.0&ms=ki | feed | press | 3x | de, aiOnly (~78 %); `tp=ki` = 404; `Anzeige:`-Titel verwerfen | |
| `decoder-de` | https://the-decoder.de/feed/ | feed | press | 3x | de, aiOnly; nur 10 Items → jeden Lauf; ETag + LM | |
| `techcrunch-ai` | https://techcrunch.com/category/artificial-intelligence/feed/ | feed | press | 3x | Filter (~75 % KI, auch Robotaxi/Events), `categories` mitprüfen; 20 Items; Cloudflare | |
| `verge-ai` | https://www.theverge.com/rss/ai-artificial-intelligence/index.xml | feed | press | 3x | Filter (~60 %); Atom, 10 Items; gut für Consumer-KI und Privacy-Änderungen | |
| `techmeme` | https://www.techmeme.com/feed.xml | feed (`techmeme`) | aggregator | 3x | Filter (~40 %); 15 Items ≈ 12 h; Original-URL aus erstem Nicht-Techmeme-`<A HREF>` | |
| `hn` | https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100,created_at_i%3E{since36hUnix}&hitsPerPage=200 | json (`hn`) | aggregator | 3x | Filter; ~41 Storys/Tag > 100 Punkte, davon grob 1/5 KI | |
| `simonw` | https://simonwillison.net/atom/everything/ | feed | community | 3x | Filter auf Titel + Inhalt (Titel oft ohne KI-Wort; ~9 von 14/Woche KI) | |
| `latent-space` | https://latent.space/feed | feed | community | 3x | aiOnly; tägliche [AINews]-Recaps (Ersatz für news.smol.ai); 1,3 MB, nur Last-Modified; www.latent.space leitet per 301 hierher | |
| `scmp-tech` | https://www.scmp.com/rss/36/feed/ | feed | press | 3x | Filter; ~3 KI-Items/Tag; beste EN-Quelle für Baidu, ByteDance, Tencent; ohne Slash am Ende 301 hierher (geprüft 24.10.) | |

## Labs & Produkte (alle `role: 'official'`)

| id | URL | Art | Takt | Hinweise | Server |
|---|---|---|---|---|---|
| `openai-news` | https://openai.com/news/rss.xml | feed | 3x | aiOnly; 803 KB, 1318 Items, keine Validatoren → Hash; `categoryMap` Security → `sicherheit`; openai.com = 1-Request-Host | |
| `openai-api-changelog` | https://developers.openai.com/api/docs/changelog | htmldiff | 3x | Vercel, kein Cloudflare; Monatsüberschrift „October, 2026", Einträge beginnen mit „Oct 22 …" → Hash je Eintrag (Datum + Text); 553 KB | |
| `chatgpt-release-notes` | https://help.openai.com/en/articles/6825453-chatgpt-release-notes | htmldiff | daily07 | **`startStatus: 'blockiert'`** (Node 403 `cf-mitigated`, curl 200); Überschriften „October 20, 2026"; aktive Challenge-Regel, 1 Request/Lauf; 825 KB; **keine Parser-Fixture**, bis die Tagesprobe einmal `ok` liefert | |
| `anthropic-sitemap` | https://www.anthropic.com/sitemap.xml | sitemap | 3x | `pathRe` /news/, /research/, /engineering/; lastmod ignorieren; keine Validatoren | |
| `claude-platform-notes` | https://platform.claude.com/docs/en/release-notes/feed.xml | feed | 3x | aiOnly; Modelle, API-Features, Deprecations, Preise; keine Validatoren | |
| `claude-apps-notes` | https://support.claude.com/en/articles/12138966-release-notes | htmldiff | daily07 | „October 21, 2026"; claude.ai, Desktop, Mobile, Cowork; `__cf_bm` | |
| `deepmind-blog` | https://deepmind.google/blog/rss.xml | feed | 3x | aiOnly; ~10/Monat; kein Cloudflare | |
| `google-ai-blog` | https://blog.google/innovation-and-ai/technology/ai/rss/ | feed | 3x | aiOnly; 20 Items; alte URL /technology/ai/rss/ leitet um | |
| `gemini-blog` | https://blog.google/products-and-platforms/products/gemini/rss/ | feed | 3x | aiOnly; ~15 Items/30 Tage | |
| `gemini-api-changelog` | https://ai.google.dev/gemini-api/docs/changelog | htmldiff | 3x | Katalog: `<h2 id="10-13-2026" data-text="October 13, 2026">` → Abschnitt je `h2[id]`, Anker-URL; kein Cloudflare | |
| `gemini-apps-notes` | https://gemini.google/release-notes/?hl=en | htmldiff | daily07 | Datum „2026.10.13"; `?hl=en` + `Accept-Language: en` (sonst Deutsch); 301 auf Geo-Pfad /us/release-notes/ – neutrale URL behalten (SKILL § 3); 319 KB | |
| `meta-newsroom` | https://about.fb.com/feed/ | feed | 3x | `include` AI, Llama, Muse, Meta AI, Superintelligence; ~10 Items; ai.meta.com/blog stale | |
| `ms-foundry` | https://devblogs.microsoft.com/foundry/feed/ | feed | 3x | aiOnly; neue Modelle in Foundry, GA-Meldungen | |
| `hf-blog` | https://huggingface.co/blog/feed.xml | feed | 3x | Filter (Community-Posts); 890 Items/263 KB; schwaches ETag → 304 | |
| `mistral-news` | https://mistral.ai/news/rss | feed | 3x | aiOnly; Content-Type `text/plain`; nur ETag | |
| `xai-sitemap` | https://x.ai/sitemap.xml | sitemap | 3x | **`startStatus: 'blockiert'`** (Node 403 „Attention Required", curl 200, 45 KB); `pathRe` /news/, lastmod echt; Seitentitel „SpaceXSI" (Alias → `modelle-und-ranglisten`); aktive Challenge-Regel, 1 Request/Lauf | |
| `deepseek-sitemap` | https://api-docs.deepseek.com/sitemap.xml | sitemap | 3x | ohne lastmod; Datum aus `/news/newsYYMMDD`; kein Cloudflare | |
| `bfl-sitemap` | https://bfl.ai/sitemap.xml | sitemap | daily07 | `pathRe` /blog/, lastmod plausibel; Black Forest Labs (Freiburg) | |
| `copilot-changelog` | https://github.blog/changelog/label/copilot/feed/ | feed | 3x | aiOnly; ~1/Tag; ETag + LM + max-age=300 → 304 | |
| `cursor-changelog` | https://cursor.com/changelog/rss.xml | feed | 3x | aiOnly; cursor.com/rss.xml liefert HTML, /atom.xml stale | |

## Startups & Funding

| id | URL | Art | Rolle | Takt | Hinweise | Server |
|---|---|---|---|---|---|---|
| `techcrunch-venture` | https://techcrunch.com/category/venture/feed/ | feed | press | 3x | Filter (~30 % KI); /category/startups/ weglassen (Überschneidung) | |
| `crunchbase-ai` | https://news.crunchbase.com/sections/ai/feed/ | feed | press | 3x | aiOnly (alle getaggt); nur 10 Items; /ai/feed/ = PNG, /category/ai/feed/ = 404 | |
| `yc-changes` | https://yc-oss.github.io/api/changes/latest.json | json (`yc`) | aggregator | daily07 | `added[]`; Batch-Regel (`Fall 2026`), `other` raus; Keyword-Filter auf `one_liner` + `tags` | |
| `hn-show` | https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=points%3E50,created_at_i%3E{since36hUnix}&hitsPerPage=50 | json (`hn`) | aggregator | 3x | Filter; ~5 Treffer/36 h; `categoryHint` `ideen` | |
| `producthunt` | https://www.producthunt.com/feed | feed | aggregator | daily07 | Filter; 50 Einträge ohne Votes; `?category=` undokumentiert; nur der öffentliche Atom-Feed (Titel + Link, Steckbrief), nie API | |

## Forschung & Open Source

| id | URL | Art | Rolle | Takt | Hinweise | Server |
|---|---|---|---|---|---|---|
| `hf-daily-papers` | https://huggingface.co/api/daily_papers?date={yesterdayUtc} | json (`hfPapers`) | aggregator | daily07 | `upvotes ≥ 30` (Steckbrief; 23.10.: 8 von 50, mit 20 wären es 13); Link https://huggingface.co/papers/{paper.id}; `publishedAt` = `paper.submittedOnDailyAt`; Sa/So-Daten liefern `[]` | |
| `google-research` | https://research.google/blog/rss/ | feed | official | 3x | aiOnly; 2–4 Posts/Woche | |
| `epoch-atom` | https://epoch.ai/atom.xml | feed | community | daily07 | aiOnly; ETag; bei Ausfall auslassen | |

### GitHub-Releases (`kind: 'github'`, `role: 'official'`, Takt `3x`)

ID-Regel `gh-<name>` (klein; bei Kollision `gh-<owner>-<name>`), `seen`-Key `gh:<owner>/<name>@<x.y>`. Mit `AIPULSE_GITHUB_TOKEN` REST (5 000/h), ohne Token Atom (10 Einträge) – lokal der Normalfall, nie `gh auth token`. Prerelease-Filter, nur Major/Minor (SKILL § 7).

| id | `github.repo` | `perPage` | Regel | Server |
|---|---|---|---|---|
| `gh-claude-code` | anthropics/claude-code | 30 | viele v2.1.3xx-Patches → nur Minor-Sprung | |
| `gh-codex` | openai/codex | 30 | viele alpha (Tags `rust-v…`) | |
| `gh-gemini-cli` | google-gemini/gemini-cli | 30 | tägliche nightly/preview | |
| `gh-openai-python` | openai/openai-python | 30 | – | |
| `gh-ollama` | ollama/ollama | 30 | rc verwerfen; `/releases/latest` hinkt | |
| `gh-vllm` | vllm-project/vllm | 10 | Atom 745 KB (lange Notes) | |
| `gh-n8n` | n8n-io/n8n | 30 | nur Linie `n8n@2.x` (`tagRe`) | |
| `gh-langchain` | langchain-ai/langchain | 30 | nur `langchain-core==X.Y.0` bzw. `langchain==X.Y.0` (`tagRe`) | |
| `gh-comfyui` | Comfy-Org/ComfyUI | 30 | alter Pfad comfyanonymous/ComfyUI leitet um | |
| `gh-cline` | cline/cline | 30 | SDK- und archive-Tags per `tagRe` ausschließen | |
| `gh-transformers` | huggingface/transformers | 5 | Atom 1,4 MB; ~alle 2,3 Monate | |
| `gh-open-webui` | open-webui/open-webui | 10 | Atom 883 KB; ~alle 3,5 Monate | |
| `gh-qwen-code` | QwenLM/qwen-code | 30 | ~1,7 Releases/Tag, 4 von 10 nightly/preview | |

Nicht in Phase 1: ggml-org/llama.cpp (b-Builds ohne Semver, > 10/Tag; später höchstens eine Wochen-Sammelmeldung). Nicht aufnehmen: continuedev/continue (zuletzt 2026-06-19), Aider-AI/aider (2026-02-12), Modell-Repos (QwenLM/Qwen3 ohne Releases, jedes neue Modell bekommt ein neues Repo).

## Nur als Fallback (`fallbackOnly: true`, `role: 'official'`, nicht im Nenner)

Community-Feeds von Olshansk/rss-feeds, stündlich per GitHub Action gebaut; die Links zeigen auf die Lab-Seiten. Content-Type `text/plain`, Drittanbieter, kann jederzeit ausfallen. Laufen über raw.githubusercontent.com – erreichbar, auch wenn die Quellseite den Job blockiert.

| id | URL | Hinweise |
|---|---|---|
| `olshansk-openai` | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_openai_main.xml | 732 KB, gleicher Inhalt wie openai.com/news (requests) |
| `olshansk-anthropic-news` | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml | Selenium, 282 Items, neuestes 2026-10-22 |
| `olshansk-claude` | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_claude.xml | claude.com/blog, neuestes 2026-10-23 |
| `olshansk-mistral` | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml | neuestes 2026-10-21 |

Stale, nicht nutzen: feed_xainews.xml (2026-09-28), feed_meta_ai.xml (2026-07-27). feed_perplexity_hub.xml (2026-10-07) nur, falls Perplexity-News gebraucht werden.

## Ergänzend (`priority: 'nice'`, nach Phase 1, alle hinter Filter)

- **Presse EN:** The Decoder EN https://the-decoder.com/feed/ (meist Übersetzung von DE, `outlet: 'the-decoder'` wie `decoder-de`) · Ars Technica AI https://arstechnica.com/ai/feed/ · Wired AI https://www.wired.com/feed/tag/ai/latest/rss · MIT TR AI https://www.technologyreview.com/topic/artificial-intelligence/feed/ (Insights-Sponsoring raus) · The Register https://www.theregister.com/headlines.atom (Gesamtfeed filtern, Sektionsfeed zu eng) · The Information https://www.theinformation.com/feed (`paywall: true`) · Guardian AI https://www.theguardian.com/technology/artificialintelligenceai/rss · FT AI https://www.ft.com/artificial-intelligence?format=rss (`paywall: true`) · Axios https://api.axios.com/feed/ (1,1 MB, ~20 % KI).
- **Presse DE:** t3n KI https://t3n.de/tag/kuenstliche-intelligenz/rss.xml (~50 % KI) · netzpolitik.org https://netzpolitik.org/feed/ (Volltext 446 KB, CC BY-NC-SA) · heise developer https://www.heise.de/developer/feed.xml (`outlet: 'heise'`) · Handelsblatt Technologie https://www.handelsblatt.com/contentexport/feed/technologie (H+, Marker unbekannt → `paywall: true`).
- **Newsletter/Blogs (weekly, `staleDays` 30):** Import AI https://importai.substack.com/feed · Interconnects https://www.interconnects.ai/feed · One Useful Thing https://www.oneusefulthing.org/feed · Zvi https://thezvi.wordpress.com/feed/ · The Batch https://www.deeplearning.ai/the-batch/ (htmldiff `links`, höchste issue-N) · TLDR AI https://tldr.tech/api/rss/ai (zweistufig per `buildUrl`, daily07).
- **Labs:** Google Developers Blog https://developers.googleblog.com/rss/ (kein pubDate) · Microsoft AI https://microsoft.ai/blog/ (htmldiff `links`, Datum steht im HTML) · Cohere https://docs.cohere.com/v2/changelog.rss · Perplexity API https://docs.perplexity.ai/docs/resources/changelog/rss.xml (Monats-Sammelitem) · Mistral Docs https://docs.mistral.ai/resources/changelogs · AWS What's New https://aws.amazon.com/about-aws/whats-new/recent/feed/ (Titel-`include`) · Apple ML https://machinelearning.apple.com/rss.xml · NVIDIA GenAI https://blogs.nvidia.com/blog/category/generative-ai/feed/ · Aleph Alpha https://aleph-alpha.com/news/ (htmldiff, dd.mm.yyyy) · Runway https://runway.com/changelog · ElevenLabs https://elevenlabs.io/blog/rss.xml (viele Kundenstories).
- **China-Labs (Watchlist-Lücke):** Z.ai https://docs.z.ai/release-notes/new-released (YYYY-MM-DD) · MiniMax https://www.minimax.io/sitemap.xml (Akamai) · Kimi https://www.kimi.com/blog (Slug-Diff) · Alibaba Model Studio https://www.alibabacloud.com/help/en/model-studio/newly-released-models (Zeilen-Diff, Filter qwen) · Pandaily https://pandaily.com/feed/ (strenger Org-Filter) · TechNode https://technode.com/tag/ai/feed/ (5,4 MB, nur Conditional GET).
- **Startups EU/DE:** Sifted https://sifted.eu/feed · EU-Startups https://www.eu-startups.com/feed/ (freitags Funding-Round-up) · Tech.eu https://tech.eu/feed/ · deutsche-startups.de https://www.deutsche-startups.de/feed/ (~5 % KI) · Gründerszene https://www.businessinsider.de/gruenderszene/feed/ (~5 % KI) · Sequoia https://www.sequoiacap.com/feed/ („Partnering with").
- **Community:** Lobste.rs https://lobste.rs/t/ai.rss · Bluesky `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=<handle>&limit=5&filter=posts_no_replies` (simonwillison.net, emollick.bsky.social, natolambert.bsky.social; nur Posts mit `embed.external.uri` und `likeCount` ≥ 100 als Link-Signal).
