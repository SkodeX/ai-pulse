# Security-Watchlist – volle Tabelle

Inhalt für den Security-Teil von `pipeline/config/watchlist.ts` (Typ `SecurityProduct` im SKILL.md). Stand 2026-10-24, Quelle: Katalog `sicherheit.md` (Empfehlungen), `querschnitt.md` (GAP 7) und Live-Prüfung am 2026-10-24. „neu" = Regex-Kern stammt nicht aus dem Recherche-Prototyp `docs/recherche/2026-10-24/prototypen/nvd_regex30.mjs` und muss vor dem Einbau gegen ein NVD-Fixture laufen.

## 1 Pakete, Repos, Klasse

GHSA-Schreibweise `ecosystem:name` (`pip`, `npm`, `go`, `nuget`). OSV-Form über `OSV_ECOSYSTEM` ableiten (`PyPI`, `npm`, `Go`, `NuGet`).

| id | Name | Tier | relevance | GHSA | Repo-Advisories |
|---|---|---|---|---|---|
| `claude-code` | Claude Code | A | userTool, local | `npm:@anthropic-ai/claude-code` | `anthropics/claude-code` |
| `claude` | claude.ai / Anthropic-API | A | userTool | – (SaaS) | – |
| `codex` | OpenAI Codex CLI | A | userTool, local | `npm:@openai/codex` | `openai/codex` (letztes 2025-09-19) |
| `openai` | ChatGPT / OpenAI | A | userTool | – (SaaS) | – |
| `gemini-cli` | Gemini CLI | A | userTool, local | `npm:@google/gemini-cli` | `google-gemini/gemini-cli` (bisher leer) |
| `gemini` | Gemini / Vertex AI | A | userTool | – (GCP-Bulletins) | – |
| `github-copilot` | GitHub Copilot | A | userTool, local | `npm:@github/copilot` | – |
| `cursor` | Cursor | A | userTool, local | – | `cursor/cursor` |
| `ms-copilot` | Microsoft 365 Copilot / Copilot | A | cloud | – (MSRC) | – |
| `azure-ai` | Azure AI Foundry / Azure ML / SRE Agent | A | cloud | – (MSRC) | – |
| `aws-ai` | Amazon Bedrock / Q / Kiro / SageMaker | A | cloud | – (AWS-Bulletins) | – |
| `mcp` | MCP-SDKs und offizielle MCP-Server | A | agentInfra | `npm:@modelcontextprotocol/sdk`, `npm:@modelcontextprotocol/server`, `npm:@modelcontextprotocol/client`, `npm:@modelcontextprotocol/express`, `npm:@modelcontextprotocol/server-legacy`, `npm:@modelcontextprotocol/server-filesystem`, `npm:@modelcontextprotocol/inspector`, `npm:mcp-remote`, `pip:mcp` | `modelcontextprotocol/servers` |
| `mcp-dritte` | MCP-Server Dritter | C | agentInfra | – (nur NVD) | – |
| `llm-sdks` | Anthropic-/OpenAI-SDKs, Vercel AI SDK | A | library | `pip:anthropic`, `pip:openai`, `npm:@anthropic-ai/sdk`, `npm:openai`, `npm:ai` | – |
| `langchain` | LangChain / LangGraph | A | library | `pip:langchain`, `pip:langchain-core`, `pip:langchain-community`, `pip:langgraph`, `npm:@langchain/core`, `npm:langchain` | – |
| `hf-stack` | transformers / PyTorch / Keras | A | library | `pip:transformers`, `pip:torch`, `pip:keras` | – |
| `vllm` | vLLM | B | selfHost | `pip:vllm` | – |
| `ollama` | Ollama | B | selfHost | `go:github.com/ollama/ollama` | – (keine Repo-Advisories) |
| `open-webui` | Open WebUI | B | selfHost | `pip:open-webui` | `open-webui/open-webui` |
| `n8n` | n8n | B | selfHost | `npm:n8n` | `n8n-io/n8n` |
| `langflow` | Langflow | B | selfHost | `pip:langflow`, `pip:langflow-base`, `pip:lfx` | – |
| `flowise` | Flowise | B | selfHost | `npm:flowise`, `npm:flowise-components` | – |
| `litellm` | LiteLLM | B | selfHost | `pip:litellm` | – |
| `mlflow` | MLflow | B | selfHost | `pip:mlflow` | – |
| `ray` | Ray | B | selfHost | `pip:ray` | – |
| `gradio` | Gradio | B | selfHost | `pip:gradio` | – |
| `comfyui` | ComfyUI | B | selfHost | – (OSV: 0 Treffer) | `Comfy-Org/ComfyUI` (alter Name `comfyanonymous/ComfyUI` → 301) |
| `dify` | Dify | B | selfHost | – (OSV: 0 Treffer) | `langgenius/dify` |
| `llama-cpp` | llama.cpp | B | selfHost | `pip:llama-cpp-python` | – |
| `nvidia-ai` | NVIDIA NeMo / Megatron / Triton / TensorRT-LLM / NIM / Dynamo | C | selfHost | – (NVIDIA-CSV) | – |
| je eigene id | sglang, LlamaIndex, Haystack, JupyterLab, Semantic Kernel, CrewAI, AutoGen, text-generation-webui | C | library / selfHost | `pip:sglang`, `pip:llama-index`, `pip:llama-index-core`, `pip:haystack-ai`, `pip:jupyterlab`, `pip:semantic-kernel`, `nuget:Microsoft.SemanticKernel.Core`, `pip:crewai`, `pip:autogen-agentchat` | `oobabooga/textgen` (umbenannt, alter Name `text-generation-webui` → 301), `crewAIInc/crewAI` (leer), `microsoft/autogen` (leer) |

- **`claude`** (claude.ai + Anthropic-API) ist seit 2026-10-24 Standard (Steckbrief, „Gesetzte Standardwerte“). Beim Bau Tabelle 2 ergänzen: NVD-Regex nur mit Produkt als Subjekt (`claude.ai`, `Anthropic API`) – das nackte Wort „Anthropic“ bleibt draußen (False Positives: OpenClaw, Decepticon, Flowise erwähnen den Anbieter nur); Vorfälle kommen vor allem über Presse- und Vorfall-Feeds.
- Repo-Advisories: 12 Repos → 12 REST-Aufrufe je Lauf mit ETag (Kontingent `AIPULSE_GITHUB_TOKEN`, siehe SKILL.md).
- `affects`-Liste = alle GHSA-Namen ohne Präfix, kommagetrennt (gemessen mit 42 Namen: 200, 57 KB für 7 Tage).
- Mehrdeutige Namen (`ai`, `openai`, `langchain`, `ray`) nach der Antwort über `vulnerabilities[].package.ecosystem` filtern.
- Die vier MCP-Namen `server`, `client`, `express`, `server-legacy` tauchten am 2026-10-24 in Advisories zum TypeScript-SDK auf – mit aufnehmen, sonst fehlen Advisories, die nur diese Pakete nennen.
- OSV mit 0 Treffern (nicht als OSV-Query senden): PyPI `openai`, `comfyui`, `crewai`, `pyautogen`, `autogen-agentchat`, `huggingface-hub`, `dify`; npm `openai`.

## 2 CVE-Abgleich (NVD, CNA, KEV, MSRC, Bulletins)

NVD-Kern = Alternation für `subjectRe()`; „cs" = case-sensitiv. CNA/KEV-Werte getrimmt und klein vergleichen. CPE nur zur Info (Recall 21 %, für Fallback-Abfragen per `virtualMatchString`).

| id | NVD-Kern | CNA `vendor:product` | NVD-CPE | KEV `vendorproject\|product` | MSRC-Produkt / Bulletin-Filter |
|---|---|---|---|---|---|
| `claude-code` | `Claude Code\|Claude (?:Desktop\|SDK)` | beim Bau prüfen | `anthropic:claude_code`, `anthropic:claude_sdk_for_python` | – | – |
| `codex` | `Codex CLI\|OpenAI Codex` (`OpenAI Codex` neu) | – | – | – | – |
| `openai` | `ChatGPT\|OpenAI(?![- ]?(?:compatible\|API key))` | – | keine CPEs | – | – |
| `gemini-cli` | `Gemini CLI\|gemini-cli` | – | – | – | – |
| `gemini` | `Vertex AI\|Google Gemini\|Gemini (?:API\|app\|Code Assist)` (neu) | – | – | – | GCP: `Vertex AI\|Gemini` |
| `github-copilot` | `GitHub Copilot\|Copilot CLI` | – | `microsoft:github_copilot`, `microsoft:github_copilot_chat`, `github:copilot-cli` | – | `GitHub Copilot Chat`, `GitHub Copilot Plugin for JetBrains IDEs` |
| `cursor` | `Cursor(?= (?:IDE\|editor\|AI\|code editor\|is an))\|Anysphere` (cs) | – | `anysphere:cursor` | – | – |
| `ms-copilot` | `(?:Microsoft\|M365\|365) Copilot\|Copilot Studio` | – | `microsoft:365_copilot`, `microsoft:365_copilot_chat`, `microsoft:365_word_copilot` | – | `Microsoft 365 Copilot`, `Microsoft 365 Copilot's Business Chat`, `Microsoft Copilot`, `Microsoft Copilot Studio`, `Microsoft Copilot in Azure`, `Copilot Web`, `Copilot Cowork`, `Microsoft 365 Copilot for iOS`, `Microsoft Edge Copilot for IOS`, `Microsoft Edge Copilot for Android` |
| `azure-ai` | `Azure AI Foundry\|Azure OpenAI` (neu) | – | – | – | `Azure AI Foundry`, `Azure SRE Agent`, `Azure Machine Learning` |
| `aws-ai` | – | – | – | – | AWS-Titel: `Bedrock\|SageMaker\|Amazon Q\|Kiro\|Nova\|AgentCore\|Strands` |
| `mcp` | `Model Context Protocol (?:TypeScript \|Python )?SDK\|MCP (?:TypeScript \|Python )?SDK` (neu) | `lfprojects:*` beim Bau prüfen | `lfprojects:model_context_protocol_servers`, `lfprojects:mcp_python_sdk` | – | – |
| `mcp-dritte` | `MCP server\|Model Context Protocol` (Rest, der nicht `mcp` ist) | CNA-Produkt trifft `/(?:^\|[-_ ])mcp(?:$\|[-_ ])/i` (z. B. `agentfront:mcp-from-openapi`) | – | – | – |
| `langchain` | `LangChain\|LangGraph` | – | `langchain:langchain`, `langchain:langchain.js` | – | – |
| `vllm` | `vLLM` (cs) | – | `vllm:vllm` | – | – |
| `ollama` | `Ollama` | – | `ollama:ollama` | – | – |
| `open-webui` | `Open[- ]?WebUI` | `open-webui:open-webui` | `openwebui:open_webui` | – | – |
| `n8n` | `n8n` | `n8n-io:n8n` | `n8n:n8n` | `n8n\|n8n` | – |
| `langflow` | `Langflow` | laut Beschreibung `langflow-ai`, prüfen | `langflow:langflow` | `langflow\|langflow`, `ibm\|langflow` | – |
| `flowise` | `Flowise` (neu) | – | – | – | – |
| `litellm` | `LiteLLM` | – | `litellm:litellm` | `berriai\|litellm` | – |
| `mlflow` | `MLflow` (neu) | – | – | `mlflow\|mlflow` | – |
| `ray` | – (zu mehrdeutig, nur GHSA + KEV) | – | – | `ray-project\|ray` | – |
| `gradio` | `Gradio` (neu) | – | – | – | – |
| `comfyui` | `ComfyUI` | – | `comfy:comfyui`, `comfy:comfyui-manager` | – | – |
| `dify` | `Dify` (cs, neu) | – | – | – | – |
| `llama-cpp` | `llama\.cpp\|llama-cpp-python` (neu) | – | – | – | – |
| `nvidia-ai` | – | – | – | – | NVIDIA-CSV `Affected Product`: `NeMo\|Megatron\|Triton\|TensorRT-LLM\|NIM\|Dynamo` |

- KEV-Paare live geprüft am 2026-10-24 (catalogVersion 2026.10.23): Langflow 6× (5× Vendor `Langflow`, 1× `IBM`), LiteLLM 3× (`BerriAI`), MLflow 1×, Ray 1× (`Ray-Project`), n8n 1× – zusammen 12, letzter am 2026-09-02.
- MSRC-Namen live über SUG v2 geprüft (21 Einträge seit 01.07.2026). Unbekannter Name mit `Copilot`/`AI Foundry` im Produkt → trotzdem übernehmen, loggen, hier nachtragen.
- Gemessene Trefferquoten über 30 Tage (Recherche): „strikte" NVD-Regex 196 bei 16.935 CVEs – das waren einfache Wortgrenzen-Regexe des Prototyps (mit `Anthropic`, ohne Subjekt-Regel und ohne CNA-Bestätigung), also Obergrenze inklusive Fehltreffern (MCP 49, Langflow 33, n8n 30, vLLM 28, Open WebUI 19, Claude 9, LangChain 8, Ollama 7, LiteLLM 7, OpenAI 6), NVD-CPE 43, GHSA reviewed 31, MSRC 2.
