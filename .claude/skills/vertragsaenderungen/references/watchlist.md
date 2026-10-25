# Dokument-Watchlist (Stand 2026-10-24)

Gehört zum Skill `vertragsaenderungen`. Alle URLs am 2026-10-24 mit dem Bot-UA geprüft, von der privaten IP des Nutzers, über die auch der Heimserver ins Netz geht (vom Server selbst noch nicht gemessen). Nur EU-Fassungen bzw. Fassungen, die in DE gelten. Daten in „Datum" = Stand bei der Prüfung.

Legende:
- **Stufe** = wie direkt abgerufen wird, falls nötig (A Markdown · B HTML direkt · C Cloudflare: ein Versuch → OTA → Wayback · D blockiert: OTA + Wayback).
- **Erkennung** = primärer Detektor → Fallback. `OTA-eu` = `genai-eu-versions`, `OTA-co` = `genai-contrib-versions`, Pfad = Datei im Repo. OTA-Atom läuft jeden Lauf; „Takt" gilt nur für Direktabrufe.
- **Takt**: `1×` = täglich im 07:07-Lauf (`cadence: 'daily07'`) · `3×` = jeder Lauf (`'3x'`) · `Hub` = Link-Menge im 07:07-Lauf · `Kontext` = nur als Claude-Input bei Änderungen.
- **Kat.**: Story-Kategorie (`vertraege` Rechtstexte, `preise` Preis-/Deprecation-Seiten). Deprecation-Seiten liefern zusätzlich Abschaltdaten für `fristen.json` (`kind: 'modell'`, `dateKind: 'abschaltung'`, über `build-fristen.ts`).

## OpenAI

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `openai-eu-terms` | EU Terms of Use | https://openai.com/policies/eu-terms-of-use/ | C | OTA-eu `ChatGPT/Terms of Service.md` (kombiniert mit Service Terms) → Wayback | „These Terms of Use apply if you reside in the European Economic Area" · `main` | `Updated: January 16, 2026` | 1× · vertraege |
| `openai-service-terms` | Service Terms (API-Features) | https://openai.com/policies/service-terms/ | C | steckt in OTA-eu `ChatGPT/Terms of Service.md` → Wayback | `main` | `Updated: October 16, 2026` | 1× · vertraege |
| `openai-usage-policies` | Usage Policies | https://openai.com/policies/usage-policies/ | C | OTA-eu `ChatGPT/Acceptable Use Policy.md` (kombiniert mit 3 weiteren Seiten) → Wayback | Änderungsliste `* JJJJ-MM-TT: We’ve updated our Usage Policies …` | `Effective: November 20, 2026` → Frist | 1× · vertraege |
| `openai-eu-privacy` | EU Privacy Policy | https://openai.com/policies/eu-privacy-policy/ | C | OTA-eu `ChatGPT/Privacy Policy.md` (mit „how your data is used…") → Wayback | `main` | `Updated: August 24, 2026` | 1× · vertraege |
| `openai-services-agreement` | Services Agreement (API/Business) | https://openai.com/policies/services-agreement/ | C | OTA-eu `ChatGPT/Commercial Terms.md` → Wayback | `main` (~87k Zeichen) | 2025-12-01 | 1× · vertraege |
| `openai-policies-hub` | Policies-Übersicht | https://openai.com/policies/ | C | direkt, Link-Menge `/policies/*` (31 Links); bei Challenge auslassen | – | – | Hub |
| `openai-pricing` | API Pricing | https://developers.openai.com/api/docs/pricing.md | A | direkt | Markdown (22 KB) | – | 3× · preise |
| `openai-deprecations` | Deprecations | https://developers.openai.com/api/docs/deprecations.md | A | direkt; Abschnitte `### JJJJ-MM-TT: <Titel>` mit Tabelle `Shutdown date \| Model / system \| Recommended replacement` | Markdown (42 KB) | Abschnittsdatum = Ankündigung, Spalte `Shutdown date` = Frist | 3× · preise |

Kontext: Changelog https://developers.openai.com/api/docs/changelog (HTML). ROW-/US-Fassungen nicht beobachten (für DE gilt EU). Nicht: openai.com/api/pricing (→ business/pricing, Cloudflare), chatgpt.com/pricing (Beträge per JS).

## Anthropic

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `anthropic-consumer-terms` | Consumer Terms (Claude Pro/Max) | https://www.anthropic.com/legal/consumer-terms | B | OTA-eu `Claude.ai/Terms of Service.md` → direkt | „Before you access our services" · `main` | `<time dateTime>` bei „Effective": Oct 8, 2025 | 1× · vertraege |
| `anthropic-commercial-terms` | Commercial Terms (API, Claude Code mit Key) | https://www.anthropic.com/legal/commercial-terms | B | OTA-eu `Claude.ai/Commercial Terms.md` → direkt | „These Commercial Terms of Service" · `main` | dto.: Jun 17, 2025 | 1× · vertraege |
| `anthropic-aup` | Usage Policy (AUP) | https://www.anthropic.com/legal/aup | B | OTA-eu `Claude.ai/Acceptable Use Policy.md` (mit 2 Support-Artikeln; in contrib „not tracked") → direkt | „applies to anyone who submits inputs" · `main` | dto.: Nov 12, 2026 → Frist | 1× · vertraege |
| `anthropic-privacy` | Privacy Policy | https://www.anthropic.com/legal/privacy | B | OTA-eu `Claude.ai/Privacy Policy.md` (mit Non-User Privacy Policy) → direkt | „This Privacy Policy explains how we collect" · `main` (HTML 1,2 MB) | dto.: Sep 10, 2026 | 1× · vertraege |
| `anthropic-supported-regions` | Supported Regions | https://www.anthropic.com/legal/supported-regions | B | direkt (nicht in OTA), Länder als Menge | `main` (~3,6k Zeichen) | Effective Nov 12, 2026 → Frist | 1× · vertraege |
| `anthropic-legal-hub` | Legal-Übersicht | https://www.anthropic.com/legal | B | Link-Menge `/legal/*` (15 Slugs) | – | – | Hub |
| `anthropic-pricing` | API Pricing | https://platform.claude.com/docs/en/about-claude/pricing.md | A | direkt | Markdown mit Frontmatter (53 KB) | – | 3× · preise |
| `claude-code-legal` | Claude Code: Legal and compliance (regelt die Abo-Nutzung dieses Jobs per `claude -p`) | https://code.claude.com/docs/en/legal-and-compliance.md | A | direkt (nicht in OTA) | Markdown (≈ 7 KB, geprüft 2026-10-24: 200 text/markdown), Überschrift „# Legal and compliance" | – (kein Datum → Hash-Diff) | 1× · vertraege |
| `anthropic-deprecations` | Model Deprecations | https://platform.claude.com/docs/en/about-claude/model-deprecations.md | A | direkt; Tabelle „Model status", Schlüssel `API model name` | Markdown (15 KB) | Spalten `Deprecated`, `Tentative retirement date` (`Not sooner than …` = kein Abschaltdatum) | 3× · preise |

Kontext: Release Notes https://platform.claude.com/docs/en/release-notes/overview.md – optionale Vorprüfung https://www.anthropic.com/sitemap.xml (`lastmod` nur zusammen mit Hash).

## Google / Gemini

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `gemini-api-terms` | Gemini API Additional Terms | https://ai.google.dev/gemini-api/terms.md.txt | A | **direkt** (fehlt in OTA) | Markdown (22 KB) | Zeile 3 `Effective March 23, 2026` | 1× · vertraege |
| `google-terms` | Google ToS + Generative AI Additional Terms | https://policies.google.com/terms?hl=en · https://policies.google.com/terms/generative-ai?hl=en | B | OTA-eu `Google Generative AI Services/Terms of Service.md` (plus Gemini-Enterprise-Business-Terms) → direkt | Inhaltsblock | `Effective July 30, 2026` / `Last Modified: August 9, 2023` | 1× · vertraege |
| `google-genai-prohibited-use` | Generative AI Prohibited Use Policy | https://policies.google.com/terms/generative-ai/use-policy?hl=en | B | OTA-eu `Google Generative AI Services/Acceptable Use Policy.md` → direkt | `[role="article"]` (546 KB HTML für ~4k Zeichen) | `Last Modified: December 17, 2024` | 1× · vertraege |
| `gemini-apps-privacy-hub` | Gemini Apps Privacy Hub | https://support.google.com/gemini/answer/13594961?hl=en | B | OTA-eu `Google Generative AI Services/Privacy Policy.md` (mit Google Privacy Policy) → direkt | nur Artikel-Body; Ziffernfolgen ≥ 12 löschen | erstes `Last updated:` (October 23, 2026) | 1× · vertraege |
| `gemini-api-pricing` | Gemini API Pricing | https://ai.google.dev/gemini-api/docs/pricing.md.txt | A | direkt; Diff je `###`-Abschnitt | Markdown (80 KB, ändert sich oft) | – | 3× · preise |
| `gemini-api-deprecations` | Gemini API Deprecations | https://ai.google.dev/gemini-api/docs/deprecations.md.txt | A | direkt; Tabellen je Modellfamilie, Spalte `Shutdown date` | Markdown (13 KB) | `No shutdown date announced` / `N/A` = keins | 3× · preise |

Kontext: Changelog https://ai.google.dev/gemini-api/docs/changelog.md.txt (Abschnitte `## October 13, 2026`). Nicht: one.google.com Google AI Plans (Beträge per JS, Sprache per IP).

## Microsoft / Copilot

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `microsoft-services-agreement` | Microsoft Services Agreement | https://www.microsoft.com/en-us/servicesagreement | B | OTA-eu `Microsoft Copilot/Acceptable Use Policy.md` (trackt die en-gb-Fassung) → direkt | `main` (~114k Zeichen) | `Effective: September 30, 2026` (nicht `Published:`) | 1× · vertraege |
| `microsoft-msa-updates` | MSA „Summary of Changes" | https://www.microsoft.com/en-us/servicesagreement/upcoming-updates (→ `/servicesagreement/updates`) | B | direkt | `main` | Datum in der Überschrift | Kontext |
| `microsoft-copilot-terms` | Copilot Supplemental Terms of Use | https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/termsofuse | B | OTA-eu `Microsoft Copilot/Terms of Service.md` → direkt | `#mainContent`; Block „Summary of Changes" am Anfang | `Effective: August 18, 2026` | 1× · vertraege |
| `microsoft-copilot-privacy-faq` | Privacy FAQ Copilot (Training, Opt-out) | https://support.microsoft.com/en-us/topic/privacy-faq-for-microsoft-copilot-27b3a435-8dc9-4b55-9a4b-58eeb9647a7f | B | direkt (nicht in OTA), Hash-Diff | Artikel-Body (~35k Zeichen) | kein Datum | 1× · vertraege |
| `azure-product-terms-changes` | Product Terms Change Log (optional) | https://www.microsoft.com/licensing/terms/en-US/product/changes/Microsoft%20Azure | B | direkt; nur das Change Log, nie den 1,3-MB-Terms-Text | `main` | Eintragsdatum | 1× · vertraege |
| `azure-foundry-retirements` | Foundry/Azure OpenAI Model Retirements (optional) | https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements | B | direkt; Vorprüfung Meta `ms.date` | `main` | `ms.date` (2026-07-24) | 3× · preise |

Microsoft Privacy Statement (214k Zeichen): OTA-eu `Microsoft Copilot/Privacy Policy.md` trackt `https://privacy.microsoft.com/en-ie/privacystatement` (Declaration geprüft 2026-10-24) → nur über OTA beobachten, nie direkt abrufen.

## GitHub Copilot

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `github-additional-products-terms` | Terms for Additional Products and Features (Copilot) | https://docs.github.com/api/article/body?pathname=/en/site-policy/github-terms/github-terms-for-additional-products-and-features | A | direkt, Auslöser Atom `github/docs` (unten); OTA-co `GitHub Copilot/Terms of Service.md` als Zweitdetektor | Markdown (17,6 KB) | `Version Effective Date: August 27, 2026` | Atom 3×, Abruf bei Commit, sonst 1× · vertraege |
| `github-privacy-statement` | GitHub General Privacy Statement | https://docs.github.com/api/article/body?pathname=/en/site-policy/privacy-policies/github-general-privacy-statement | A | dto.; OTA-co `GitHub Copilot/Privacy Policy.md` | Markdown | `Effective date: April 27, 2026` (geprüft 2026-10-24) | dto. · vertraege |
| `github-genai-services-terms` | Generative AI Services Terms (ersetzen für Neuverträge seit 5. März 2026 die Copilot Product Specific Terms) | https://github.com/customer-terms/github-generative-ai-services-terms | B + `Accept: text/html` | direkt | `main` (~6k Zeichen) | Version „March 2026" | 1× · vertraege |
| `github-customer-terms-hub` | Customer-Terms-Index | https://github.com/customer-terms | B + `Accept: text/html` | Link-Menge `/customer-terms/*` (10) | – | – | Hub |

Atom: https://github.com/github/docs/commits/main/content/site-policy.atom – **nicht** github/site-policy (veraltet).

## Meta / Llama

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `meta-ai-terms-eu` | Meta AI Terms (EU) | https://www.facebook.com/legal/eu-ai-terms | D | OTA-eu `Meta AI/Terms of Service.md` → Wayback-CDX (Sonntag) | – | `Effective May 13, 2026` | Atom 3× · vertraege |
| `llama4-license` | Llama 4 Community License | https://www.llama.com/llama4/license/ (→ dev.meta.ai/llama/llama4/license) | B | direkt | kein `<main>`/`<article>` → Selektor beim Bau festlegen; Promo-Banner entfernen | `Version Effective Date: April 5, 2025` | 1× · vertraege |
| `llama4-use-policy` | Llama 4 Acceptable Use Policy | https://www.llama.com/llama4/use-policy/ | B | direkt, Hash-Diff | dto. (~7k Zeichen) | kein Datum | 1× · vertraege |

Neue Llama-Version = neue URL `llamaN/license` → Link-Menge der Lizenzseite beobachten. `Llama API` in OTA-eu hat „not tracked anymore"-Issues → nicht nutzen.

## Mistral

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `mistral-eu-consumer-terms` | EU Consumer Terms (Le Chat) | https://legal.mistral.ai/terms/eu-consumers-terms-of-service | B | **direkt** (OTA Le Chat kaputt) | „Welcome to Mistral AI!" · `main` | `Effective: October 8, 2026` | 1× · vertraege |
| `mistral-commercial-terms` | Commercial Terms | https://legal.mistral.ai/terms/commercial-terms-of-service | B | direkt | `main` | `Effective: September 25, 2026` | 1× · vertraege |
| `mistral-privacy` | Privacy Policy | https://legal.mistral.ai/terms/privacy-policy | B | direkt | `main` (HTML 1,4 MB) | `Effective: September 3, 2026` | 1× · vertraege |
| `mistral-usage-policy` | Usage Policy | https://legal.mistral.ai/terms/usage-policy | B | direkt | `main` | `Effective: June 11, 2026` | 1× · vertraege |
| `mistral-terms-hub` | Terms-Übersicht | https://legal.mistral.ai/terms/get-started | B | Link-Menge `/terms/*` (13 Slugs); nie als Dokument diffen | – | – | Hub |
| `mistral-pricing` | Pricing (Le Chat + API) | https://mistral.ai/pricing | B | direkt | `main` | – | 3× · preise |
| `mistral-deprecations` | Models Overview, Abschnitt „Deprecated and retired models" | https://docs.mistral.ai/models.md | A | direkt, nur dieser Abschnitt (alte URL `/getting-started/models/models_overview/` → HTML `/models`, 1,4 MB – nicht nutzen) | Markdown (16,5 KB), Spalten `Deprecation \| Retirement \| Replacement` | ISO oder `April 30, 2026` gemischt | 3× · preise |

## xAI

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `xai-terms` | Terms of Service – Consumer | https://x.ai/legal/terms-of-service | C | OTA-eu `Grok/Terms of Service.md` → Wayback | `.prose` | `Last Updated: October 12, 2026` | Atom 3× · vertraege |
| `xai-aup` | Acceptable Use Policy | https://x.ai/legal/acceptable-use-policy | C | OTA-eu `Grok/Acceptable Use Policy.md` → Wayback | `.prose` | `Effective: August 14, 2026` | Atom 3× · vertraege |
| `xai-privacy` | Privacy Policy | https://x.ai/legal/privacy-policy | C | OTA-eu `Grok/Privacy Policy.md` (mit EU-Addendum) → Wayback | `.prose` | `Last Updated: October 11, 2026` | Atom 3× · vertraege |
| `xai-enterprise-terms` | Enterprise Terms | https://x.ai/legal/terms-of-service-enterprise | C | OTA-eu `Grok/Commercial Terms.md` → Wayback | `.prose` | August 14, 2026 | Atom 3× · vertraege |
| `xai-pricing` | API Pricing | https://docs.x.ai/developers/pricing.md | A | direkt | Markdown (11 KB) | – | 3× · preise |

Release Notes auf docs.x.ai sind veraltet → nicht nutzen. OTA-co `xAI/*` seit 2025-02 still. Marke im Text: „SpaceXSI".

## Cursor

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `cursor-terms` | Terms of Service | https://cursor.com/terms-of-service | B | **direkt** (OTA-co seit 2025-09-18 still, Issue „not tracked anymore") | nur `main` (Text sonst doppelt) | `<time dateTime>` nach „Last updated": September 3, 2026 | 1× · vertraege |
| `cursor-privacy` | Privacy Policy | https://cursor.com/privacy | B | direkt | `main` | `Last updated October 11, 2026` | 1× · vertraege |
| `cursor-models-pricing` | Models & Pricing | https://cursor.com/docs/models-and-pricing.md | A | direkt | Markdown (54 KB) | – | 3× · preise |
| `cursor-pricing` | Plan-Preise | https://cursor.com/pricing | B | direkt (robots.txt sperrt nur `/pricing-history`) | `main` | – | 3× · preise |

## Perplexity

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `perplexity-terms` | Terms of Service | https://www.perplexity.ai/hub/legal/terms-of-service | C | OTA-eu `Perplexity/Terms of Service.md` → Wayback | `main` | `Last updated: January 23rd, 2026` (nur im Sanity-JSON) | Atom 3× · vertraege |
| `perplexity-privacy` | Privacy Notice | https://www.perplexity.ai/hub/legal/privacy-notice | C | OTA-eu `Perplexity/Privacy Policy.md` → Wayback | `main` | `Last updated: October 23, 2026` | Atom 3× · vertraege |
| `perplexity-aup` | Acceptable Use Policy | https://www.perplexity.ai/hub/legal/aup | C | OTA-eu `Perplexity/Acceptable Use Policy.md` (contrib: „not tracked") → Wayback | `main` | – | Atom 3× · vertraege |

Nachmessung 2026-10-24 (Steckbrief-UA): Node-`fetch` auf die ToS → 200 (233 KB), früher Challenge. Stufe C bleibt, bis der Server-Smoke-Test eine Woche lang stabil 200 liefert.

## DeepSeek

| id | Dokument | URL | Stufe | Erkennung | Anker / Selektor | Datum | Takt · Kat. |
|---|---|---|---|---|---|---|---|
| `deepseek-privacy` | Privacy Policy (DSGVO-relevant) | https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html | B (ETag → 304) | OTA-eu `DeepSeek/Privacy Policy.md` → direkt | `#write` | Label `Last Update: Feb 10, 2026`; `Last-Modified` 2026-07-15 | 1× · vertraege |
| `deepseek-terms` | Terms of Use | https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html | B | OTA-eu `DeepSeek/Terms of Service.md` → direkt | `#write` | – | 1× · vertraege |
| `deepseek-platform-terms` | Open Platform Terms | https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html | B | OTA-eu `DeepSeek/Developer Terms.md` → direkt | `#write` | `Effective date: April 29, 2026` | 1× · vertraege |
| `deepseek-pricing` | API Pricing | https://api-docs.deepseek.com/quick_start/pricing | B | direkt | `main` (~3,8k Zeichen) | – | 3× · preise |

Kontext: https://api-docs.deepseek.com/updates (Einträge `Date: 2026-10-17`).

## Nicht nutzen

- ToS;DR-API (Dokument-`updated_at` von 2024, kein Änderungsdetektor), ConductAtlas (nur mit Token).
- github/site-policy, OTA-co `OpenAI/*`, `xAI/*`, `Mistral AI/*`, `Cursor/*` (still), Sitemap-`lastmod` von openai.com.
- Datenschutzbehörden-Feeds (LfDI BW, HmbBfDI) stehen im Terms-Katalog, gehören aber zu `gesetze-und-fristen`.
