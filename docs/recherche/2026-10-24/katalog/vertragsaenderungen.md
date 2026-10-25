# Vertragsänderungen, Preise & Deprecations (Seiten-Monitoring)

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (36)

- **OpenAI EU Terms of Use (+ ROW Terms)** · html-diff · geprüft, Bot-Schutz · HTTP 200 (403 bei parallelem Burst, Browser-UA 200) · neuestes: 2026-01-16 (Updated)
  `https://openai.com/policies/eu-terms-of-use/`
  Kategorien: Vertragsänderungen
  Für DE gilt die EU-Version. Serverseitig gerendert (Next.js), Volltext im HTML (Main-Text ca. 20k Zeichen), Ankersatz 'These Terms of Use apply if you reside in the European Economic Area'. Datum 'Updated: January 16, 2026' per Regex auslesbar. ROW-Version: https://openai.com/policies/row-terms-of-use/ (Effective: January 1, 2026). Cloudflare Bot Management (challenge-platform/jsd). 4 parallele Requests ergaben 403 'Enable JavaScript and cookies', sequenziell lief es. Von GitHub-Actions-IPs riskant, daher Fallback: OTA genai-eu 'ChatGPT/Terms of Service.md' oder Wayback (ca. tägliche Captures).
- **OpenAI Usage Policies** · html-diff · geprüft, Bot-Schutz · HTTP 200 (sofortiger 2. Request: Cloudflare-Challenge) · neuestes: Effective: November 20, 2026 (angekündigt)
  `https://openai.com/policies/usage-policies/`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, ca. 12k Zeichen. Enthält eine eigene Änderungsliste ('Updated with information related to ...'), die als Input für Claude gut taugt. Neue Fassung mit Inkrafttreten am 20.11.2026 ist schon veröffentlicht, daher ein Reminder am Stichtag. Beim Doppel-Fetch-Test lieferte der 2. Request direkt danach eine Challenge-Seite (Text 0 Zeichen). Inhaltsvalidierung ist Pflicht. Fallback: OTA 'ChatGPT/Acceptable Use Policy.md' (OTA-Commits vom Okt. 2026 vorhanden).
- **OpenAI EU Privacy Policy (+ ROW/US)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-08-24 (Updated)
  `https://openai.com/policies/eu-privacy-policy/`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, 'Updated: August 24, 2026'. ROW: https://openai.com/policies/row-privacy-policy/ (Updated: February 6, 2026). Laut Sitemap gibt es auch /policies/us-privacy-policy/. DSGVO-relevant ist nur die EU-Fassung. Fallback: OTA 'ChatGPT/Privacy Policy.md'.
- **OpenAI Services Agreement + Service Terms** · html-diff · geprüft, Bot-Schutz · HTTP 403 im Burst mit Bot-UA, 200 mit Browser-UA und sequenziell mit Bot-UA · neuestes: Services Agreement 2025-12-01; Service Terms 2026-10-16
  `https://openai.com/policies/services-agreement/`
  Kategorien: Vertragsänderungen, Preise & API-Änderungen
  Business-/API-Vertrag (ca. 87k Zeichen). Service Terms: https://openai.com/policies/service-terms/ ('Updated: October 16, 2026', betrifft API-Features). Beide serverseitig gerendert. OTA trackt das Services Agreement als 'ChatGPT/Commercial Terms' (genai-eu/genai-contrib).
- **OpenAI API Pricing (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: Last-Modified HTML 2026-10-24
  `https://developers.openai.com/api/docs/pricing.md`
  Kategorien: Preise & API-Änderungen
  Saubere Markdown-Variante (22 KB), ideal zum Diffen. Die HTML-Seite /api/docs/pricing ist ebenfalls serverseitig gerendert. openai.com/api/pricing leitet auf openai.com/business/pricing/#api um (Cloudflare), meiden. platform.openai.com/docs/* leitet auf developers.openai.com um.
- **OpenAI Deprecations (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: 2026-10-14
  `https://developers.openai.com/api/docs/deprecations.md`
  Kategorien: Modelle, Preise & API-Änderungen
  42 KB Markdown mit datierten Abschnitten (YYYY-MM-DD) wie 'On October 14, 2026, we notified developers ... GPT-4 series'. Neue Abschnitte lassen sich direkt als Einträge parsen, ohne Claude. Changelog als HTML: https://developers.openai.com/api/docs/changelog (serverseitig, Daten wie 2026-04-21).
- **Anthropic Consumer Terms** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: Effective Oct 8, 2025 (Sitemap-lastmod 2026-05-12)
  `https://www.anthropic.com/legal/consumer-terms`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert (Next.js/Sanity), Main ca. 36k Zeichen, Ankersatz 'Before you access our services'. 'Effective Oct 8, 2025' parsebar. Normalisierter Hash war bei zwei Fetches stabil. Vorab günstig über anthropic.com/sitemap.xml prüfen.
- **Anthropic Commercial Terms** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: Effective Jun 17, 2025
  `https://www.anthropic.com/legal/commercial-terms`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, ca. 25k Zeichen, 'These Commercial Terms of Service'. Für API/Claude-Code-Nutzung relevant.
- **Anthropic Usage Policy (AUP)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: Effective Nov 12, 2026 (angekündigt; Sitemap-lastmod 2026-10-08)
  `https://www.anthropic.com/legal/aup`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, ca. 31k Zeichen. Neue Fassung mit Inkrafttreten am 12.11.2026, daher ein Reminder am Stichtag. OTA hat im Okt. 2026 Änderungen erfasst, darunter reines Inhaltsverzeichnis-Rauschen.
- **Anthropic Privacy Policy** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: Effective Sep 10, 2026
  `https://www.anthropic.com/legal/privacy`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, ca. 41k Zeichen, HTML 1,2 MB (viel JSON). Normalisierung über <main> ist nötig.
- **anthropic.com Sitemap (lastmod-Vorprüfung)** · other · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20 (legal/acst-disclosure)
  `https://www.anthropic.com/sitemap.xml`
  Kategorien: Vertragsänderungen
  562 lastmod-Einträge, darunter alle /legal/*-Seiten (aup 2026-10-08, privacy 2026-09-11, consumer-terms 2026-05-12). Ein Request zeigt, welche Legal-Seiten neu geholt werden müssen. lastmod spiegelt CMS-Edits, nicht unbedingt inhaltliche Änderungen. platform.claude.com/sitemap.xml hat kein lastmod.
- **Anthropic API Pricing (Markdown) + claude.com/pricing** · html-diff · geprüft, Bot-Schutz · HTTP 200 text/markdown · neuestes: n/a
  `https://platform.claude.com/docs/en/about-claude/pricing.md`
  Kategorien: Preise & API-Änderungen
  53 KB sauberes Markdown mit Frontmatter. docs.anthropic.com leitet auf platform.claude.com um. Consumer-Pläne: https://www.anthropic.com/pricing -> claude.com/pricing (serverseitig, Preise wie $17/$20/$100/$200 im HTML). Release Notes als Markdown: https://platform.claude.com/docs/en/release-notes/overview.md (neuester Eintrag October 22, 2026).
  Nachprüfung: 200. Grundlage der Budgetrechnung. Haiku 5.5 (Prompts ≤100K): $0.10 Input, $0.125 Cache-Write (5 min), $0.01 Cache-Read, $0.50 Output; Batch $0.05/$0.25. Sonnet 5.5: $2 / $2.50 / $0.10 (0,05×) / $10; Batch $1/$5. Haiku 4.5: $1/$5. Batch-Rabatt 50 %, kombinierbar mit Caching. Minimale cachebare Prefix-Länge bei Haiku 5.5 und Sonnet 5.5: 512 Token.
- **Anthropic Model Deprecations (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: n/a
  `https://platform.claude.com/docs/en/about-claude/model-deprecations.md`
  Kategorien: Modelle, Preise & API-Änderungen
  14,6 KB Markdown mit Tabellen (aktiv/abgekündigt/abgeschaltet, Daten, Nachfolger). Tabellenzeilen lassen sich per Diff als Einträge erkennen.
- **Gemini API Additional Terms (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: Effective March 23, 2026 (HTML: Last updated 2026-04-28)
  `https://ai.google.dev/gemini-api/terms.md.txt`
  Kategorien: Vertragsänderungen
  Google-devsite liefert für jede Seite eine .md.txt-Variante (22 KB), ohne den dynamischen 'Last updated'-Footer. HTML: https://ai.google.dev/gemini-api/terms (serverseitig, Last-Modified-Header vorhanden, aber kein 304 auf If-Modified-Since).
  Nachprüfung: 200. Fehlt in OTA: Google Generative AI Services trackt nur policies.google.com (ToS, Privacy, GenAI-AUP). text/markdown, 22 KB, 'Effective March 23, 2026'. Direkt abrufen und den Effective-Header diffen.
- **Google Generative AI Prohibited Use Policy** · html-diff · geprüft · HTTP 200 · neuestes: Last Modified: December 17, 2024
  `https://policies.google.com/terms/generative-ai/use-policy`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, aber 546 KB HTML für nur ca. 4k Zeichen Text, also Inhaltsblock extrahieren. Gleiche Domain: Google ToS https://policies.google.com/terms?hl=en (Effective July 30, 2026) und https://policies.google.com/terms/generative-ai?hl=en (Last Modified: August 9, 2023). Immer ?hl=en setzen, sonst Sprache je nach IP. OTA genai-eu trackt das als 'Google Generative AI Services'.
- **Gemini Apps Privacy Hub** · html-diff · geprüft · HTTP 200 · neuestes: Last updated: October 23, 2026
  `https://support.google.com/gemini/answer/13594961?hl=en`
  Kategorien: Vertragsänderungen
  1,7 MB HTML, ca. 58k Zeichen Text, mehrere 'Last updated'-Daten (das erste gehört zum Hub). Zufällige Zahlen-IDs im Header führen zu Hash-Änderung bei jedem Fetch, daher nur den Artikel-Body nehmen und lange Ziffernfolgen entfernen. Enthält reCAPTCHA-Skript, aber keine Sperre.
- **Gemini API Pricing (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: HTML: Last updated 2026-10-22
  `https://ai.google.dev/gemini-api/docs/pricing.md.txt`
  Kategorien: Preise & API-Änderungen
  80 KB Markdown, hohe Änderungsfrequenz. Diff pro Modell-Abschnitt (Überschrift ###) gruppieren, bevor es an Claude geht.
- **Gemini API Deprecations + Changelog (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: HTML: Last updated 2026-10-22; Changelog: October 13, 2026
  `https://ai.google.dev/gemini-api/docs/deprecations.md.txt`
  Kategorien: Modelle, Preise & API-Änderungen
  12,5 KB Tabelle mit Shutdown-Daten. Changelog: https://ai.google.dev/gemini-api/docs/changelog.md.txt (Abschnitte '## October 13, 2026', neue Abschnitte ohne Claude parsebar). Vertex: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions leitet auf docs.cloud.google.com/gemini-enterprise-agent-platform/... um (Umbenennung).
- **Microsoft Services Agreement (+ Summary of Changes)** · html-diff · geprüft · HTTP 200 · neuestes: Effective: September 30, 2026
  `https://www.microsoft.com/en-us/servicesagreement`
  Kategorien: Vertragsänderungen
  Serverseitig gerendert, ca. 114k Zeichen, normalisierter Hash stabil. Deutsch unter /de-de/servicesagreement. Sehr nützlich: https://www.microsoft.com/en-us/servicesagreement/upcoming-updates -> /servicesagreement/updates mit offizieller 'Summary of Changes ... September 30, 2026'. Die Zusammenfassung lieber Claude geben als den Volltext-Diff (spart Tokens).
- **Microsoft Copilot (Consumer) Terms + Privacy FAQ** · html-diff · geprüft · HTTP 200 · neuestes: Effective: August 18, 2026
  `https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/termsofuse`
  Kategorien: Vertragsänderungen
  Terms serverseitig, ca. 18k Zeichen. Privacy FAQ (Training mit Nutzerdaten, Opt-out): https://support.microsoft.com/en-us/topic/privacy-faq-for-microsoft-copilot-27b3a435-8dc9-4b55-9a4b-58eeb9647a7f -> /microsoft-copilot/privacy-faq-for-microsoft-copilot (200, ca. 35k Zeichen, kein Datum, also Hash-Diff). Microsoft Privacy Statement: https://www.microsoft.com/en-us/privacy/privacystatement (214k Zeichen, 'Last Updated: September 2026'), optional.
- **GitHub Terms for Additional Products and Features (Copilot) via Docs-API** · json-api · geprüft · HTTP 200 text/markdown · neuestes: Version Effective Date: August 27, 2026
  `https://docs.github.com/api/article/body?pathname=/en/site-policy/github-terms/github-terms-for-additional-products-and-features`
  Kategorien: Vertragsänderungen
  Liefert sauberes Markdown (17,6 KB) einer beliebigen docs.github.com-Seite (pathname-Parameter). Gilt genauso für Privacy Statement und Copilot-Modellseiten, z. B. /en/copilot/reference/ai-models/supported-models (Modell-Retirements). HTML-Seite: https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features.
- **github/docs Commits-Atom (content/site-policy)** · atom · geprüft · HTTP 200 application/atom+xml · neuestes: 2026-10-06
  `https://github.com/github/docs/commits/main/content/site-policy.atom`
  Kategorien: Vertragsänderungen
  Pfadgefilterter Commits-Feed: Jede Policy-Änderung ist ein Commit, z. B. 2026-09-16 'Update github-terms-for-additional-products-and-features.md'. Den Diff über die GitHub-API holen (commits/{sha} -> files[].patch). Achtung: Das im Auftrag genannte github/site-policy (https://github.com/github/site-policy/commits/main.atom) ist veraltet. Letzter main-Commit dort ist vom 29.05.2026, die Datei steht auf 'April 27, 2026', die Docs zeigen 'August 27, 2026'. Nicht verwenden.
- **Meta Llama 4 Community License + Acceptable Use Policy** · html-diff · geprüft · HTTP 200 (Redirect -> dev.meta.ai/llama/llama4/license) · neuestes: License Effective Date: April 5, 2025
  `https://www.llama.com/llama4/license/`
  Kategorien: Vertragsänderungen, Open Source & Tools
  Serverseitig gerendert, ca. 9k Zeichen. AUP: https://www.llama.com/llama4/use-policy/ -> dev.meta.ai/llama/llama4/use-policy (ca. 7k Zeichen, kein Datum). llama.com leitet auf dev.meta.ai um, also Ziel-URL speichern und Redirect-Wechsel melden. Neue Llama-Versionen bringen neue Lizenz-URLs (llamaN/license), Link-Set auf der Seite beobachten.
- **Meta AI Terms (EU) – direkt blockiert** · html-diff · NICHT nutzbar, Bot-Schutz · HTTP Bot-UA 200 nur JS-Shell (sichtbarer Text ~0); Browser-UA 400 · neuestes: Effective May 13, 2026 (über OTA/Wayback)
  `https://www.facebook.com/legal/eu-ai-terms`
  Kategorien: Vertragsänderungen
  Direkt nicht nutzbar, https://www.meta.ai/legal/terms gibt 401 'Authentication required'. Lösung: OTA genai-eu 'Meta AI/Terms of Service.md' (raw.githubusercontent, letzter Commit 2026-05-13, passt zu 'Effective May 13, 2026') als Primärquelle. Zweite Quelle: Wayback-CDX und Snapshot mit id_ (enthält serverseitigen Text, braucht curl --compressed).
- **Mistral Legal (EU Consumer Terms, Commercial, Privacy, Usage Policy)** · html-diff · geprüft · HTTP 200 · neuestes: EU Consumer Terms Effective: October 8, 2026
  `https://legal.mistral.ai/terms/eu-consumers-terms-of-service`
  Kategorien: Vertragsänderungen
  Alle serverseitig, Datum 'Effective: ...' parsebar. Weitere Seiten: /terms/commercial-terms-of-service (September 25, 2026), /terms/privacy-policy (September 3, 2026), /terms/usage-policy (June 11, 2026). mistral.ai/terms leitet auf /terms/get-started um, eine Übersicht mit nur ca. 1,8k Zeichen. Nicht diffen, nur deren Link-Liste für neue Dokumente nutzen. OTA-Tracking für Le Chat ist kaputt (Issues 'not tracked anymore' vom 28.09.2026), daher direkt holen.
- **Mistral Pricing** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://mistral.ai/pricing`
  Kategorien: Preise & API-Änderungen
  Serverseitig, Preise im HTML ($14.99, $24.99, API $0.5/$1.5 ...). Le-Chat-Pläne und API-Preise auf einer Seite.
- **xAI Legal (Terms, AUP, Privacy, Enterprise Terms)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: ToS Last Updated: October 12, 2026
  `https://x.ai/legal/terms-of-service`
  Kategorien: Vertragsänderungen
  Serverseitig, ca. 49k Zeichen, normalisierter Hash stabil. Weitere Seiten: /legal/acceptable-use-policy (Effective: August 14, 2026), /legal/privacy-policy (Last Updated: October 11, 2026), /legal/terms-of-service-enterprise (August 14, 2026). OTA Grok läuft teilweise nicht mehr ('not tracked anymore'), daher direkt holen und OTA nur als Fallback.
- **xAI API Pricing (Markdown) + Release Notes** · html-diff · geprüft, Bot-Schutz · HTTP 200 text/markdown · neuestes: Models-Seite: Last updated September 21, 2026
  `https://docs.x.ai/developers/pricing.md`
  Kategorien: Preise & API-Änderungen, Modelle
  11 KB Markdown-Tabellen. https://docs.x.ai/llms.txt listet alle Seiten als .md, z. B. release-notes.md und Migrations-/Retirement-Guides ('Model Retirement (May 15, 2026)'). Die Docs laufen unter der Marke 'SpaceXSI (xAI)'.
- **Cursor Terms of Service + Privacy** · html-diff · geprüft · HTTP 200 · neuestes: Terms Last updated September 3, 2026; Privacy October 11, 2026
  `https://cursor.com/terms-of-service`
  Kategorien: Vertragsänderungen
  Serverseitig. Der Text ist doppelt im HTML (63k sichtbar, 31k in <main>), daher nur <main> nehmen. Hash stabil. Privacy: https://cursor.com/privacy. OTA Cursor ist veraltet (letzter Commit 2025-09-18 trotz Update im Sept. 2026), daher direkt holen.
  Nachprüfung: 200. Vercel. 'Last updated September 3, 2026'; die letzte OTA-Version stammt vom 18.09.2025, OTA trackt hier nicht mehr. Direkt abrufen und 'Last updated' sowie den Text diffen. www.cursor.com leitet auf cursor.com weiter.
- **Cursor Pricing + Models & Pricing (Markdown)** · html-diff · geprüft · HTTP 200 text/markdown · neuestes: n/a
  `https://cursor.com/docs/models-and-pricing.md`
  Kategorien: Preise & API-Änderungen
  54 KB Markdown (Modelle und Preise je Anbieter). Plan-Preise: https://cursor.com/pricing (serverseitig, $0/$8/$30/$100/$200 im HTML). robots.txt sperrt nur /pricing-history.
- **Perplexity Terms of Service + Privacy Notice** · html-diff · geprüft, Bot-Schutz · HTTP 200 beim 1. Request; sofortiger 2. Request: Cloudflare 'Just a moment...'; Browser-UA nach Pause 200 · neuestes: Privacy Last updated: October 23, 2026; ToS 'Last updated: January 23rd, 2026' (in Sanity-JSON)
  `https://www.perplexity.ai/hub/legal/terms-of-service`
  Kategorien: Vertragsänderungen
  Serverseitig, ca. 56k Zeichen. Privacy: /hub/legal/privacy-policy -> /hub/legal/privacy-notice. Von Azure-IPs ist hohes Sperr-Risiko zu erwarten. Primär OTA genai-eu 'Perplexity/*' nutzen (Privacy-Commit 2026-10-23 vorhanden; AUP/DPA laut OTA-Issues nicht mehr getrackt), Wayback als Fallback.
- **DeepSeek Terms of Use + Privacy + Open Platform Terms** · html-diff · geprüft · HTTP 200; 304 bei If-None-Match · neuestes: Last-Modified 2026-07-15; Open Platform Effective date: April 29, 2026
  `https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html`
  Kategorien: Vertragsänderungen, Gesetze
  Statisches HTML auf CDN mit ETag und Last-Modified. Bedingter GET liefert 304, die günstigste Prüfung im ganzen Set. Weitere Seiten: /policies/en-US/deepseek-terms-of-use.html, /policies/en-US/deepseek-open-platform-terms-of-service.html. Die Privacy Policy ist DSGVO-relevant (Datenübermittlung nach China, Aufsichtsverfahren in der EU). OTA-Commit vom 15.07.2026 passt zu Last-Modified.
- **Open Terms Archive – genai-eu-versions (Commits-Atom + Repo)** · atom · geprüft · HTTP 200 application/atom+xml · neuestes: 2026-10-23
  `https://github.com/OpenTermsArchive/genai-eu-versions/commits/main.atom`
  Kategorien: Vertragsänderungen
  Sammlung 'GenAI Governance Archive' (Uni Bremen/ZeMKI), 16 Dienste: ChatGPT, Claude.ai, DeepSeek, Google Generative AI Services, Grok, Le Chat, Meta AI, Microsoft Copilot, Perplexity, Qwen Chat, Llama API, Vibe. Läuft alle 12h (Cron '30 */12'). Commit-Titel 'Record new changes of <Service> <Dokument>' sind direkt parsebar. Diff über https://api.github.com/repos/OpenTermsArchive/genai-eu-versions/commits/{sha} (files[].patch). Volltext als Markdown über raw.githubusercontent.com/OpenTermsArchive/genai-eu-versions/main/<Service>/<Typ>.md. Zustand der Erfassung: offene Issues in genai-eu-declarations ('not tracked anymore'). Lizenz ODC-By, Quellenangabe Pflicht. Diffs enthalten Navigations-/Inhaltsverzeichnis-Rauschen.
  Nachprüfung: 200 (Atom, .diff, .patch, raw@sha). Format: <Dienst>/<Dokumenttyp>.md (z. B. ChatGPT/Acceptable Use Policy.md, Claude.ai/Commercial Terms.md); Commit-Titel 'Record new changes of <Dienst> <Typ>'. Diff ohne API: github.com/OpenTermsArchive/genai-eu-versions/commit/<sha>.diff (text/plain), Version zum Zeitpunkt: raw.githubusercontent.com/…/<sha>/<Pfad>. Aufnahme etwa 10:30 und 22:30 UTC. Dienste: ChatGPT, Claude.ai, DeepSeek, Google Generative AI Services, Grok, Le Chat, Llama API, Meta AI, Microsoft Copilot, Perplexity, Qwen Chat, Vibe. Offene not-tracked-Issues nur für Llama API.
- **Open Terms Archive – genai-contrib-versions (Commits-Atom)** · atom · geprüft · HTTP 200 application/atom+xml · neuestes: 2026-10-24
  `https://github.com/OpenTermsArchive/genai-contrib-versions/commits/main.atom`
  Kategorien: Vertragsänderungen
  58 Dienste, darunter GitHub Copilot (letzter Commit 2026-10-06), Cursor (veraltet seit 2025-09-18), ChatGPT (inkl. Business Privacy, Commercial Terms), Claude.ai, DALL·E, Midjourney, Replit, Lovable, OpenRouter, Together AI, Stability AI und Kimi. Gut für 'Aufstrebende Unternehmen' mit Terms-Bezug. Sehr viele 'not tracked anymore'-Issues (100 offen), daher pro Dokument ein Frische-Check.
  Nachprüfung: 200. Etwa 50 Dienste (u. a. OpenAI-Plattform, GitHub Copilot, Cursor, Mistral AI, xAI, OpenRouter), Aufnahme etwa 07:00 und 19:00 UTC. Hohe Rauschquote: in 20 Commits 13-mal '+1/−1' Footer-Navigation. Offene Issues 'not tracked anymore' u. a. für Cursor ToS und Privacy, Perplexity AUP und DPA, OpenRouter, Le Chat, Qwen Chat, Replit, Wenxinyiyan (github.com/OpenTermsArchive/genai-contrib-declarations/issues). Nur für Dienste nutzen, die genai-eu nicht abdeckt.
- **LfDI Baden-Württemberg Feed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.baden-wuerttemberg.datenschutz.de/feed/`
  Kategorien: Gesetze, Vertragsänderungen
  WordPress-Feed mit 10 Items, frisch. Filter auf KI-, Anbieter- und Produktnamen.
  (aus der Nachprüfung)
- **HmbBfDI News-Sitemap** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-20
  `https://datenschutz-hamburg.de/sitemap.xml?sitemap=news&cHash=f90726a3994de3d2f4627223911c1536`
  Kategorien: Gesetze, Vertragsänderungen
  Kein RSS (/rss.xml liefert 404). 107 /news/-URLs mit lastmod, KI-Slugs vorhanden (z. B. ki-training-…-instagram-und-facebook; die HmbBfDI wird Marktüberwachungsbehörde). Den cHash nicht hart codieren, sondern über den Index https://datenschutz-hamburg.de/sitemap.xml auflösen.
  (aus der Nachprüfung)

## Ergänzend (11)

- **OpenAI Policies-Hub (neue Dokumente erkennen)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://openai.com/policies/`
  Kategorien: Vertragsänderungen
  31 Links auf /policies/*. Diff der sortierten Link-Liste zeigt neue oder entfernte Policies. Die Sitemap https://openai.com/sitemap.xml/page/ ist unbrauchbar: alle lastmod stehen auf 'heute', vermutlich Build-Zeit.
- **ChatGPT Pricing (Consumer-Pläne)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://chatgpt.com/pricing`
  Kategorien: Preise & API-Änderungen
  Leitet auf /pricing/ um. Plan- und Feature-Text ist serverseitig gerendert (ca. 18k Zeichen), Preisbeträge fehlen aber im Roh-HTML (JS/geo). Nur Feature-Änderungen diffbar.
- **Anthropic Supported Regions** · html-diff · geprüft, Bot-Schutz · HTTP 200 (Redirect -> /legal/supported-regions) · neuestes: Effective Nov 12, 2026 (Sitemap-lastmod 2026-10-19)
  `https://www.anthropic.com/supported-countries`
  Kategorien: Vertragsänderungen, Neuigkeiten
  Klein (ca. 3,6k Zeichen) mit Länderliste. Als Länder-Set diffen, damit Reihenfolge-Änderungen nicht zählen. Als Ziel-URL direkt /legal/supported-regions verwenden.
- **Google AI Plans (Google One)** · html-diff · geprüft · HTTP 200 (Redirect -> /about/google-ai-plans/) · neuestes: Last-Modified 2026-10-23
  `https://one.google.com/about/ai-premium`
  Kategorien: Preise & API-Änderungen
  Feature-Text serverseitig (ca. 33k Zeichen), die Preisbeträge setzt aber erst JS ein ('Google AI Plus /Monat' ohne Zahl). Sprache und Inhalt hängen von der IP ab: von meiner deutschen IP kam die deutsche Seite, ein US-Runner bekommt EN/USD. Nur Plan- und Feature-Änderungen erkennbar.
- **Microsoft Product Terms Change Log (Azure/Foundry Models)** · html-diff · geprüft · HTTP 200 · neuestes: September 15, 2026
  `https://www.microsoft.com/licensing/terms/en-US/product/changes/Microsoft%20Azure`
  Kategorien: Vertragsänderungen, Preise & API-Änderungen
  Serverseitig gerendertes Änderungsprotokoll der Product Terms, u. a. 'Renamed Azure Direct Models to Foundry Models sold by Azure'. Die Seite scheint produktübergreifend zu sein (Variante 'Microsoft 365' gleich groß). Der eigentliche Terms-Text (/licensing/terms/productoffering/MicrosoftAzure/MCA) hat 1,3 MB mit Tooltip-Duplikaten, daher lieber nur das Change Log diffen.
- **Azure OpenAI / Foundry Model Retirements** · html-diff · geprüft · HTTP 200 (Redirect -> /azure/foundry/openai/concepts/model-retirements) · neuestes: ms.date 2026-07-24
  `https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements`
  Kategorien: Modelle, Preise & API-Änderungen
  Meta-Tags ms.date/updated_at als günstige Vorprüfung. Quell-Repo MicrosoftDocs/azure-ai-docs-pr ist privat, öffentliches azure-ai-docs gibt 404, also kein Atom-Feed. Direkt per HTML diffen.
- **GitHub Generative AI Services Terms (Customer Terms)** · html-diff · geprüft · HTTP 500 mit Standard-Accept */* (auch Browser-UA); 200 mit 'Accept: text/html' · neuestes: Version 'March 2026'
  `https://github.com/customer-terms/github-generative-ai-services-terms`
  Kategorien: Vertragsänderungen
  Nachfolger der Copilot Product Specific Terms, die laut github.com/customer-terms-Archivhinweis seit 5. März 2026 für Neuverträge entfallen. Header 'Accept: text/html' muss gesetzt sein, sonst HTTP 500 mit Content-Type application/pdf. Gilt auch für /customer-terms/github-copilot-product-specific-terms. Text serverseitig, ca. 6k Zeichen. Index: https://github.com/customer-terms.
- **Mistral Models (Tabelle 'Deprecated & retired models')** · html-diff · geprüft · HTTP 200 (Redirect -> docs.mistral.ai/models) · neuestes: Retirement 10/31/2026 (zai-glm-5-2)
  `https://docs.mistral.ai/getting-started/models/models_overview/`
  Kategorien: Modelle, Preise & API-Änderungen
  Tabelle Model/Version/API/Deprecation/Retirement/Alternative ist serverseitig (Datumsformat M/D/YYYY). HTML 1,4 MB, daher den Tabellenabschnitt extrahieren. Changelog: https://docs.mistral.ai/getting-started/changelog/ -> /resources/changelogs.
- **DeepSeek API Pricing + Updates** · html-diff · geprüft · HTTP 200 · neuestes: Updates: 2026-10-17
  `https://api-docs.deepseek.com/quick_start/pricing`
  Kategorien: Preise & API-Änderungen, Modelle
  Serverseitig, kleine Seite (ca. 3,8k Zeichen). Updates/News: https://api-docs.deepseek.com/updates (Einträge mit 'Date: 2026-10-17').
- **Wayback Machine CDX API (Fallback für blockierte Seiten)** · json-api · geprüft · HTTP 200 application/json · neuestes: 20261010 (Meta EU AI Terms); OpenAI Usage Policies 26 Captures seit 01.10.2026
  `https://web.archive.org/cdx/search/cdx?url=www.facebook.com/legal/eu-ai-terms&output=json&limit=-5&fl=timestamp,statuscode,digest,length&collapse=digest`
  Kategorien: Vertragsänderungen
  Die Availability-API (https://archive.org/wayback/available?url=...) gab bei 3 Versuchen (http/https, Bot- und Browser-UA) jedes Mal 429. Stattdessen CDX nutzen (neuester Capture mit statuscode 200), dann Roh-Snapshot über https://web.archive.org/web/<ts>id_/<url> holen. curl --compressed ist nötig, id_ liefert gzip. Der CDX-digest bezieht sich auf das Roh-HTML und eignet sich nicht als Änderungssignal.
- **Perplexity Acceptable Use Policy** · html-diff · geprüft, Bot-Schutz · HTTP 200 (Bot- und Browser-UA) · neuestes: n/a
  `https://www.perplexity.ai/hub/legal/aup`
  Kategorien: Vertragsänderungen
  Cloudflare mit JSD-Bot-Script; der Inhalt wird trotzdem geliefert. genai-eu trackt die Perplexity-AUP noch (letzte Änderung 15.08.2026), contrib nicht mehr. Deshalb primär OTA-eu, direkt nur als Fallback.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (2)

- **ToS;DR API** · json-api · geprüft · HTTP 200 application/json · neuestes: Service updated_at 2026-09-15 (OpenAI)
  `https://api.tosdr.org/search/v4/?query=openai`
  Kategorien: Vertragsänderungen
  Kuratierte Bewertungen (OpenAI Rating 'C', Punkte). Service-Detail: https://api.tosdr.org/service/v3/?id=7108. Die Dokument-updated_at sind veraltet (2024), daher kein Änderungsdetektor. Höchstens als Kontext-Badge im Dashboard.
- **ConductAtlas (kommerzieller Policy-Tracker)** · json-api · geprüft, Key nötig · HTTP 200 (Doku-Seite); API erfordert Token · neuestes: n/a
  `https://conductatlas.com/api/`
  Kategorien: Vertragsänderungen
  343 Plattformen, REST-API /api/v1/entities|documents|changes, nur mit Token. Öffentliche HTML-Seiten (z. B. /platform/github/github-copilot-product-terms/) sind serverseitig, aber ohne Feed. /changes/ leitet auf /provisions/ um. Für das 10-EUR-Budget nicht nötig.

## Fallen

- Cloudflare-Ratenlimit bei openai.com und perplexity.ai: 4 parallele OpenAI-Requests ergaben 403. Schon ein sofortiger 2. Request auf dieselbe Seite lieferte eine Challenge ('Enable JavaScript and cookies to continue' bzw. 'Just a moment...'). Nach kurzer Pause ging es wieder. Von GitHub-Actions-IPs (Azure) ist mehr Sperrung zu erwarten. Requests pro Host serialisieren, nie parallel.
- Challenge-Seiten kommen teils mit HTTP 200 oder 403 und kleinem Body. Ohne Inhaltsprüfung erzeugen sie eine falsche 'Änderung' (Text schrumpft auf 0) und danach eine zweite falsche Änderung zurück.
- Zukünftige Inkrafttreten sind schon veröffentlicht: OpenAI Usage Policies ab 20.11.2026, Anthropic AUP und Supported Regions ab 12.11.2026. Melden, wenn die neue Fassung erscheint, und am Stichtag erinnern, nicht doppelt als neue Änderung zählen.
- github/site-policy ist veraltet: letzter main-Commit 29.05.2026, die Copilot-relevante Datei steht auf 'April 27, 2026', docs.github.com zeigt 'August 27, 2026'. Maßgeblich ist github/docs (content/site-policy) bzw. die Docs-Artikel-API.
- github.com/customer-terms/* antwortet mit HTTP 500 (Content-Type application/pdf), wenn kein 'Accept: text/html' gesetzt ist. Das gilt auch mit Browser-UA.
- Open-Terms-Archive-Lücken: Cursor seit 2025-09 veraltet; Le Chat/Mistral, Llama API, Perplexity AUP/DPA und Grok teilweise mit 'not tracked anymore'-Issues. OTA-Diffs enthalten auch kosmetische Änderungen (z. B. Inhaltsverzeichnis in Claude AUP). Erfassung nur alle 12h.
- Sitemap-lastmod von OpenAI ist unbrauchbar (alle Einträge auf heute gestempelt). Anthropic-lastmod funktioniert, zeigt aber auch reine CMS-Edits.
- Dynamische Inhalte brechen naive Hashes: Google Help Center (Gemini Privacy Hub) hat zufällige Zahlen-IDs im Header. Google-devsite hat einen 'Last updated'-Footer. Next.js-Seiten enthalten Build-IDs/Nonces im Roh-HTML. Roh-HTML-Hashes unterschieden sich bei fast allen Seiten zwischen zwei Fetches, normalisierte Texte meist nicht.
- Preise teils nur per JS bzw. abhängig vom Standort: ChatGPT Pricing und Google AI Plans haben keine Beträge im Roh-HTML. Google liefert je nach IP Sprache/Währung (deutsch von residentieller DE-IP, Runner in US eher EN/USD). Deshalb immer hl=en o. ä. erzwingen.
- Viele Redirects: docs.anthropic.com -> platform.claude.com, llama.com -> dev.meta.ai, openai.com/api/pricing -> business/pricing, platform.openai.com/docs -> developers.openai.com, mistral.ai/terms -> legal.mistral.ai/terms/get-started (Übersichtsseite!), one.google.com/about/ai-premium -> google-ai-plans, Vertex -> docs.cloud.google.com/gemini-enterprise-agent-platform. Ändert sich die Ziel-URL, ist das selbst ein Signal oder ein Bruch.
- Meta AI Terms direkt nicht abrufbar (facebook.com: JS-Shell bzw. 400; meta.ai: 401). Nur über OTA oder Wayback.
- Wayback-Availability-API gab sofort 429. Snapshots mit id_ kommen gzip-komprimiert (ohne --compressed nur Binärmüll).
- GitHub-API ohne Token: 60 Requests/h, schon in der Recherche auf 37 verbleibende gefallen. In Actions immer GITHUB_TOKEN nutzen (1000/h). Atom-Feeds kosten kein API-Kontingent.
- Urheberrecht/Lizenz: Volltexte von AGB auf einer öffentlichen GitHub-Pages-Seite bzw. in einem öffentlichen Repo zu spiegeln heißt, sie neu zu veröffentlichen. OTA-Daten sind ODC-By (Quellenangabe nötig).
- Sehr große HTML-Seiten (MS Product Terms 1,3 MB, Google Help 1,7 MB, Anthropic Privacy 1,2 MB, Mistral docs 1,4 MB): kein Roh-HTML ins Repo, nur normalisierten Text speichern.

## Empfehlungen der Recherche

- Abruf in Stufen. Stufe A, saubere Markdown-Endpunkte ohne Bot-Schutz: developers.openai.com/*.md (Pricing, Deprecations), platform.claude.com/docs/*.md (Pricing, Deprecations, Release Notes), ai.google.dev/*.md.txt (Terms, Pricing, Deprecations, Changelog), docs.x.ai/*.md, cursor.com/docs/*.md, docs.github.com/api/article/body?pathname=... Diese immer direkt abrufen, 3x täglich.
- Stufe B, serverseitiges HTML ohne Sperren, direkt holen und normalisieren: anthropic.com/legal/*, legal.mistral.ai/terms/*, microsoft.com (MSA, Copilot, Product Terms Changes), learn.microsoft.com, cursor.com, x.ai/legal/*, policies.google.com, support.google.com, dev.meta.ai/llama, cdn.deepseek.com (mit If-None-Match/ETag -> 304).
- Stufe C, Cloudflare-lastig (openai.com/policies/*, perplexity.ai/hub/legal/*, chatgpt.com): pro Lauf genau ein Versuch je Seite, streng nacheinander mit 10–20 s Jitter. Bei Challenge oder 403 kein Retry-Sturm, sondern Fallback auf die OTA-Datei (genai-eu bzw. genai-contrib raw .md), danach auf Wayback (CDX: neuester 200-Capture, Snapshot mit id_). Als Quelle im Snapshot-Index vermerken (source=direct|ota|wayback).
- Stufe D, dauerhaft blockiert (Meta AI Terms): OTA als Primärquelle, Wayback als Gegenprobe. Die OTA-Atom-Feeds (genai-eu, genai-contrib) zusätzlich als zweiten Detektor für alle Anbieter auswerten. Ein OTA-Commit 'Record new changes of X' ohne eigenen Treffer stößt einen Neu-Fetch an.
- Günstige Vorprüfungen vor dem Volltext-Abruf: anthropic.com/sitemap.xml (lastmod je Legal-Seite), DeepSeek-ETag (304), Last-Modified bei ai.google.dev, ms.date-Meta bei learn.microsoft.com, Atom-Feeds github/docs (content/site-policy) und OTA. Legal-Seiten reichen 1x täglich (07:00-Lauf), Pricing und Deprecations 3x täglich. Das senkt Last und Sperr-Risiko.
- Neue Dokumente über die Link-Listen der Hub-Seiten erkennen: openai.com/policies/, anthropic.com/legal, legal.mistral.ai/terms/get-started, github.com/customer-terms. Links sortieren und als Menge diffen.
- Normalisierung HTML -> Text: (1) Inhaltsblock je Seite per Selektor-Konfiguration (Standard <main>/<article>, Fallback body). (2) script, style, noscript, svg, template, nav, header, footer, Cookie-Banner entfernen. (3) In Markdown umwandeln (Überschriften, Listen, Tabellen erhalten, z. B. turndown). (4) Unicode normalisieren (NFKC, NBSP -> Leerzeichen, typografische Anführungszeichen vereinheitlichen), Whitespace zusammenfassen. (5) Wechselnde Tokens entfernen: Ziffernfolgen mit 12+ Stellen, Build-IDs, Nonces, devsite-Footer 'Last updated'. (6) Effective/Updated-Datum per Regex separat als Metadatum ablegen. (7) Doppelte Blöcke entfernen (Cursor rendert den Text doppelt).
- Validierung vor dem Hash: Mindestlänge je Dokument und ein Ankersatz je Seite in der Konfiguration (z. B. 'These Terms of Use apply'). Challenge-Signaturen ablehnen ('Just a moment', 'Enable JavaScript and cookies', 'cf-chl', 'Authentication required'). Schrumpft der Text um mehr als 40 % oder fehlt der Anker, gilt das als Fetch-Fehler (Status 'stale', alter Snapshot bleibt), nicht als Änderung.
- Hash und Speicherung: sha256 über den normalisierten Markdown-Text. Snapshot als snapshots/<anbieter>/<dokument>.md, dazu snapshots/index.json mit hash, fetched_at, effective_date, url_effective, source, last_ok. Commit nur bei Hash-Änderung, die Git-Historie ist das Versionsarchiv. Volltext-Snapshots wegen Urheberrecht in ein privates Daten-Repo (Actions-Minuten reichen locker). Das öffentliche Pages-Repo bekommt nur Metadaten, deutsche Zusammenfassung, Diff-Statistik und Links zu Original und OTA-Commit.
- Was an Claude geht: Diff auf Absatz-/Wortebene der normalisierten Markdown-Fassung. Vorab ohne LLM verwerfen, wenn sich nur Whitespace, Datum, Links/Navigation oder unter ca. 40 Zeichen ohne Schlüsselwort ändern (Schlüsselwörter z. B. train, data, retention, liability, arbitration, price, deprecat, prohibited, EU, age). Sonst die Hunks mit 2 Zeilen Kontext schicken, gedeckelt auf ca. 6k Input-Tokens, bei Komplett-Neufassungen die ersten Hunks plus Statistik. Haiku-Klasse mit gecachtem System-Prompt. Ausgabe: deutsche Klartext-Erklärung (Was ändert sich? Wen betrifft es? Ab wann? Muss ich etwas tun, z. B. Opt-out?), dazu Kategorie und Impact-/Relevanz-Score. Erwartet werden ca. 10–30 relevante Änderungen pro Monat, also nur Cent-Beträge.
- Offizielle Zusammenfassungen bevorzugt als Claude-Input nutzen, das spart Tokens und verringert Fehlinterpretationen: Microsoft /servicesagreement/updates ('Summary of Changes'), Änderungsliste in den OpenAI Usage Policies, Anthropic Release Notes (.md), Gemini-Changelog (.md.txt), Microsoft Product Terms Change Log. Neue datierte Abschnitte in OpenAI/Gemini-Deprecations und Changelogs ohne Claude als strukturierte Einträge parsen ('Modelle'/'Preise & API-Änderungen').
- Zustand der Quellen überwachen: pro Quelle last_ok und Fehlerzähler. Nach 3 Fehlschlägen in Folge auf OTA/Wayback umschalten und im Dashboard 'Quelle gestört' anzeigen. Offene OTA-Issues ('not tracked anymore') wöchentlich abfragen, um OTA-Lücken zu erkennen. Ehrlicher User-Agent mit Repo-URL, robots.txt geprüft: keine Disallows auf den Legal-Seiten (Cursor sperrt nur /pricing-history).
