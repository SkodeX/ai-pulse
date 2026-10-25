# Alias-Tabelle Anbieter (Startbestand für `pipeline/config/watchlist.ts`)

Stand 2026-10-24. Arena-Namen aus `text|webdev|agent|vision` `latest` (category `overall`), OpenRouter-Präfixe aus `GET /api/v1/models`, HF-Orgs per `api/models?author=<org>` (nicht leer), GitHub-Orgs per `https://github.com/<org>` (200). „?“ = nicht bestätigt, „–“ = gibt es nicht. Schlüssel (`org`) = Arena-`organization`; ohne Arena-Eintrag der OpenRouter-Präfix bzw. ein Kurzname. Der Schlüssel steckt auch in `clusterKey`s (`<org>-<modell>-deprecation` …) und Fristen-`id`s (`modell-<org>-<JJJJ-MM-TT>`) → nie umbenennen ohne Migration; OpenRouter-Präfix → `org` immer über diese Tabelle (`x-ai` → `xai`, `z-ai` → `zai`, `qwen` → `alibaba`, `moonshotai` → `moonshot`).

## Haupttabelle

| org (Arena) | Anzeige | OpenRouter-Präfix | HF-Org | GitHub-Org | News-Fallback (Quelle → Skill `quellen`) | Gruppe |
|---|---|---|---|---|---|---|
| `openai` | OpenAI | `openai` | `openai` | `openai` | OpenAI News RSS → Olshansk `feed_openai_main.xml`; API-Changelog developers.openai.com | Basis |
| `anthropic` | Anthropic | `anthropic` | – (keine Open Weights) | `anthropics` | Anthropic-Sitemap → Olshansk `feed_anthropic_news.xml`; Claude-Platform-Release-Notes-RSS | Basis |
| `google` | Google / Google DeepMind | `google` | `google` (laut) | `google-gemini`, `google-deepmind` | DeepMind-RSS, Gemini-Produkt-RSS, Gemini-API-Changelog | Basis |
| `meta` | Meta | `meta`, `meta-llama` | `meta-models` (Muse, aktiv), `facebook` (laut); `meta-llama` stale seit 2025-04 | `meta-llama`, `facebookresearch` | about.fb.com/feed/ mit KI-Filter (ai.meta.com/blog stale seit 2026-07-27) | Basis |
| `microsoft` | Microsoft | `microsoft` | `microsoft` (laut) | `microsoft` | Foundry-Blog (devblogs), microsoft.ai/blog | Basis |
| `amazon` | Amazon | `amazon` | `amazon` (laut) | `amazon-science` | AWS What's New mit Titelfilter `Bedrock\|Nova\|Amazon Q\|SageMaker AI\|Kiro` | Basis |
| `xai` | xAI (SpaceXSI) | `x-ai` | `xai-org` (zuletzt `grok-2`, 2025-08) | `xai-org` | x.ai-Sitemap (Node-`fetch` bekam schon von der Privat-IP 403, curl 200 → als blockiert einplanen, Skill `quellen`; Server-Smoke-Test bestätigt) → OpenRouter `x-ai/` + OTA Grok → Presse | Basis |
| `mistral` | Mistral AI | `mistralai` | `mistralai` | `mistralai` | mistral.ai/news/rss → Olshansk `feed_mistral.xml` | Basis |
| `deepseek` | DeepSeek | `deepseek` | `deepseek-ai` | `deepseek-ai` | api-docs.deepseek.com/sitemap.xml (Datum in der URL) | Basis |
| `alibaba` | Alibaba (Qwen) | `qwen` | `Qwen` | `QwenLM` | Model Studio „newly-released-models“ (HTML-Diff, Filter `qwen`); qwen.ai ist eine SPA | Basis |
| `zai` | Z.ai (Zhipu) | `z-ai` | `zai-org` | `zai-org` | docs.z.ai Release Notes (RSS/HTML) | Rangliste |
| `xiaomi` | Xiaomi MiMo | `xiaomi` | `XiaomiMiMo` | `XiaomiMiMo` | – (nur HF/OpenRouter) + SCMP Tech | Rangliste |
| `moonshot` | Moonshot AI (Kimi) | `moonshotai` | `moonshotai` | `MoonshotAI` | kimi.com/blog (Slug-Diff) | Rangliste |
| `baidu` | Baidu (ERNIE) | – (kein Präfix) | `baidu` (zuletzt 2026-06-19) | `PaddlePaddle` | ERNIE-Blog-RSS (stale seit 2026-05-09) + SCMP Tech | Rangliste |
| `bytedance` | ByteDance Seed | `bytedance-seed`, `bytedance` | `ByteDance-Seed` | `ByteDance-Seed` | SCMP Tech | Rangliste |
| `minimax` | MiniMax | `minimax` | `MiniMaxAI` | `MiniMax-AI` | minimax.io/sitemap.xml (Akamai) | Rangliste |
| `stepfun` | StepFun | `stepfun` | `stepfun-ai` | `stepfun-ai` | – (nur HF/OpenRouter) + Pandaily/TechNode | Rangliste |
| `tencent` | Tencent Hunyuan | `tencent` | `tencent` (laut) | `Tencent-Hunyuan` | SCMP Tech | Rangliste |
| `thinky` | Thinking Machines | `thinkingmachines` | `thinkingmachines` | `thinking-machines-lab` | thinkingmachines.ai/blog/index.xml (stale seit 2026-07-31) | Rangliste |
| `nvidia` | NVIDIA | `nvidia` | `nvidia` (laut) | `NVIDIA` | NVIDIA Blog Generative AI | Rangliste |
| `meituan` | Meituan LongCat | `meituan` | `meituan-longcat` | `meituan-longcat` | – (nur HF/OpenRouter) + Pandaily | beobachtet |
| `ant-group` | Ant Group (inclusionAI: Ling/Ring) | `inclusionai` | `inclusionAI` | `inclusionAI` | – | beobachtet |
| `reflection` | Reflection AI (Beam) | `reflection` | `reflection` | ? (`reflectionai` existiert, Zugehörigkeit offen) | Presse | beobachtet |
| `upstage` | Upstage (Solar) | `upstage` | `upstage` | `UpstageAI` | Presse | beobachtet |
| `ibm` | IBM Granite | `ibm-granite` | `ibm-granite` (laut) | `ibm-granite` | – | beobachtet |
| `cohere` | Cohere | `cohere` | `CohereLabs` (alt `CohereForAI`) | `cohere-ai` | docs.cohere.com/v2/changelog.rss → Olshansk `feed_cohere.xml` | beobachtet |
| `allenai` | Ai2 (Olmo) | – | `allenai` (laut) | `allenai` | – | beobachtet |
| `inception-ai` | Inception (Mercury) | `inception` | – (nicht gefunden) | ? (`inception-ai` existiert, Zugehörigkeit offen) | Presse | beobachtet |
| `poolside` | Poolside (Laguna) | `poolside` | `poolside` | `poolsideai` | – | beobachtet |
| `bfl` (kein Arena-Text) | Black Forest Labs | – | `black-forest-labs` | `black-forest-labs` | bfl.ai/sitemap.xml | fest (DE-Lab) |
| `aleph-alpha` (kein Arena) | Aleph Alpha | – | `Aleph-Alpha` | `Aleph-Alpha` | aleph-alpha.com/news (Link-Diff) | fest (DE-Lab) |
| `perplexity` (kein Arena) | Perplexity | `perplexity` | – | – | docs.perplexity.ai Changelog-RSS | beobachtet |

- Gruppe: **Basis** = statische Basis aus dem Steckbrief; **Rangliste** = am 2026-10-24 in Arena-Top-100 bzw. OpenRouter-AA-Top-40; **beobachtet** = Alias vorhanden, kommt nur bei Qualifikation in die Watchlist; **fest** = HF-Autor immer abfragen (Persona DE), unabhängig von der Watchlist.
- Arena-Org `""` (leer: INTELLECT-3, Trinity Large, Yi Lightning) nie zuordnen. `synlan` (webdev #70) hat keinen Alias und liegt unter der Schwelle.
- Neue OpenRouter-Präfixe seit 2026-10-16 (Startup-Signal): `recursive` (HF `RecursiveSI`), `elorian`, `xingchen-agi` (HF `XingChen-AGI`), `reflection`, `inception`. Abgeleitet über `hugging_face_id`.

## Namen in anderen Ranglisten

| org | Epoch `Organization` (eci_scores.csv) | ARC `providerId` (`models.json`, v3.json) |
|---|---|---|
| `anthropic` | Anthropic | Anthropic |
| `openai` | OpenAI | OpenAI |
| `google` | Google DeepMind, Google (auch `"Google DeepMind,Google"`) | Google |
| `meta` | Meta AI | Meta, Meta AI |
| `moonshot` | Moonshot | Moonshot AI |
| `alibaba` | Alibaba | Alibaba |
| `xai` | xAI | xAI |
| `zai` | Z.ai (Zhipu AI) | Z.ai |
| `deepseek` | DeepSeek (auch `"DeepSeek,Peking University"`) | DeepSeek |
| `thinky` | Thinking Machines | Thinking Machines |
| `mistral` | Mistral AI | Mistral |
| `minimax` | MiniMax | Minimax |
| `nvidia` | Nvidia | NVIDIA |
| `reflection` | – | Reflection |
| `microsoft` | Microsoft Research, Microsoft | – |
| `cohere` | `"Cohere,Cohere Labs (formerly Cohere for AI)"` | – |

ARC: `providerId` `Human` immer verwerfen; Wettbewerbs- und Community-Einträge (`ARC Prize 2024`, `ARC Prize 2025`, `bespoke`, `e_pang`, `j_berman`, `johan_land`, `poetiq`) und `Dots Studio` keiner Watchlist-Org zuordnen. Unbekannte Namen → Log „Alias fehlt (Epoch/ARC)“, kein Abbruch.

## Tag-Namen (`tagNames`) für Story-Tags und Presse-Treffer

| org | Namen |
|---|---|
| `xai` | xAI, SpaceXSI, x.ai, Grok |
| `zai` | Z.ai, Zhipu, GLM |
| `moonshot` | Moonshot, Kimi |
| `alibaba` | Alibaba, Qwen |
| `xiaomi` | Xiaomi, MiMo |
| `baidu` | Baidu, ERNIE |
| `bytedance` | ByteDance, Seed, Doubao |
| `tencent` | Tencent, Hunyuan |
| `meituan` | Meituan, LongCat |
| `ant-group` | Ant Group, inclusionAI, Ling, Ring |
| `meta` | Meta, Llama, Muse |
| `google` | Google, DeepMind, Gemini, Gemma |
| `anthropic` | Anthropic, Claude |
| `openai` | OpenAI, ChatGPT, GPT, Codex |
| `nvidia` | NVIDIA, Nemotron |
| `ibm` | IBM, Granite |
| `allenai` | Ai2, Allen Institute, Olmo, Molmo |
| `microsoft` | Microsoft, Phi |
| `amazon` | Amazon, Nova, Bedrock |
| `cohere` | Cohere, Command, Aya |
| `upstage` | Upstage, Solar |
| `reflection` | Reflection AI, Beam |
| `inception-ai` | Inception, Mercury |
| `bfl` | Black Forest Labs, FLUX |

Allgemeine Wörter (Seed, Ring, Ling, Phi, Nova, Command, Solar, Beam, Mercury, Muse, Spark) nur als Modellname mit Versionsmuster werten, z. B. `/\bPhi-\d/`, `/\bSolar Pro \d/`, `/\bMercury \d/` – sonst Fehltreffer in normalen Texten.

## Laute HF-Orgs (Warteliste statt Sofort-Kandidat)

`google`, `microsoft`, `nvidia`, `facebook`, `tencent`, `amazon`, `allenai`, `ibm-granite`. Belege vom 2026-10-24: `microsoft/Sentiment-Analysis-7B`, `nvidia/InternVideo2-CLIP-anomaly-detection`, `tencent/Hy-Nomas-Diffusers`, `ibm-granite/granite-switch-4.1-8b-GGUF`. Auch ruhige Orgs laden Ableger hoch (`upstage/solar-pro4-tokenizer`, `poolside/spec-decoding-subfolder-fixture`, `meta-models/Muse-Spark-Open-816B-A42B-NVFP4`) → der Ableger-Regex gilt für alle.
