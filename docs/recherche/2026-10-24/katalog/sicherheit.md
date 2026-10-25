# Sicherheitslücken & Vorfälle

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (17)

- **NVD CVE API 2.0** · json-api · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24 (Zeitstempel der Antwort)
  `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=prompt%20injection&lastModStartDate=2026-10-01T00:00:00.000Z&lastModEndDate=2026-10-24T23:59:59.999Z&resultsPerPage=3`
  Kategorien: Sicherheitslücken
  Getestet: keywordSearch=langchain (11 Treffer in 85 Tagen), 'prompt injection' (50 in 24 Tagen bei lastMod), LLM + cvssV3Severity=HIGH (1). Datumsformat ISO mit Millisekunden, z. B. 2026-10-01T00:00:00.000Z; pub*- und lastMod*-Fenster höchstens 120 Tage (sonst 404 mit Header 'message: Date range cannot exceed 120 days.' statt JSON). Filter: cvssV3Severity bzw. cvssV4Severity (LOW/MEDIUM/HIGH/CRITICAL), hasKev, noRejected, resultsPerPage bis 2000. Wichtige Felder: cve.id, published, lastModified, vulnStatus, cveTags, descriptions, metrics.cvssMetricV40/V31 (baseScore, baseSeverity), metrics.ssvcV203 (CISA ADP: exploitation none/poc/active, automatable, technicalImpact) – sehr gut für die Heuristik. Liegt jetzt hinter Cloudflare (Server: cloudflare, CF-RAY). Am besten nur für Produkte ohne Paket nutzen (Copilot, ChatGPT, Cursor, Gemini …) und jeden Lauf mit lastModStartDate seit dem letzten Lauf abfragen. Kostenlosen NVD-API-Key als Actions-Secret empfehlen.
- **GitHub Advisory Database – Global Advisories (Watchlist-Abfrage)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://api.github.com/advisories?affects=langchain,langchain-core,llama-index,transformers,vllm,gradio,mlflow,litellm,open-webui,langflow,flowise,n8n,ray,comfyui,crewai,autogen-agentchat,semantic-kernel,openai,anthropic,@modelcontextprotocol/sdk,github.com/ollama/ollama&published=%3E2026-09-01&per_page=100&sort=published&direction=desc`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Kernquelle. Ein einziger Call mit kommagetrennter affects-Liste (bis 1000 Pakete) brachte 77 Advisories seit 2026-09-01 (6 critical, 23 high). Am häufigsten: n8n 44, vllm 20, open-webui 18, langflow 11, litellm 10, MCP-SDK 5. Etwa 1,5 Advisories pro Tag, aber in Schüben. Filter: published/updated/modified (Range-Syntax wie >2026-10-20), severity, ecosystem (pip, npm, go, nuget …), type=reviewed (Standard), unreviewed oder malware, cwes, epss_percentage/percentile, sort=updated|published|epss_*. Felder: ghsa_id, cve_id, summary, severity, cvss_severities (v3/v4), epss{percentage, percentile}, cwes, vulnerabilities[].package{ecosystem, name}, vulnerable_version_range, first_patched_version, published_at, updated_at, withdrawn_at, html_url. Antwort ist groß (637 KB bei 100 Einträgen), deshalb pro Lauf updated=>letzter Lauf. Getestet ist auch @anthropic-ai/claude-code, @openai/codex, @google/gemini-cli, @github/copilot (z. B. 2026-10-15 'Claude Code: Plugin Hash Pin Bypass', high). type=malware mit published-Filter liefert bösartige npm/PyPI-Pakete (z. B. 'agentic-awesome-skills'), dafür Regex auf claude|openai|mcp|llm|agent.
- **GitHub Repository Security Advisories (Apps ohne Paket)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-18 (open-webui), 2026-10-13 (claude-code)
  `https://api.github.com/repos/anthropics/claude-code/security-advisories?per_page=5&sort=published&direction=desc`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Für Tools, die nicht in einer Paket-Registry stehen oder deren Advisories nicht reviewed in der globalen DB landen. Getestete Repos (alle 200): anthropics/claude-code (neuestes 2026-10-13), cursor/cursor (2026-07-14, Sandbox-Escape), open-webui/open-webui (2026-10-18), modelcontextprotocol/servers (2026-02-25), comfyanonymous/ComfyUI (2026-07-15), langgenius/dify (2026-08-19), oobabooga/text-generation-webui (2026-04-03), openai/codex (letztes 2025-09-19). Ohne Einträge: google-gemini/gemini-cli, ollama/ollama, crewAIInc/crewAI, microsoft/autogen; diese laufen über die globale DB bzw. Pakete. Ein Call pro Repo, gleiches Rate-Limit-Budget.
- **OSV.dev API (query / querybatch)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://api.osv.dev/v1/querybatch`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Schlüsselfreie Alternative bzw. Fallback zu GHSA. Aggregiert GHSA, PYSEC, Go-Vuln-DB usw. Mit querybatch (POST) habe ich 48 Watchlist-Pakete in einem Call geprüft: liefert nur id und modified, Details dann über GET /v1/vulns/{id}. /v1/query für ein Paket liefert Vollobjekte (vllm: 172 Einträge, 885 KB, also groß). Felder: id, aliases (CVE/GHSA), summary, details, severity (CVSS-Vektor), affected[].ranges, published, modified, database_specific.severity. Ecosystem-Namen: 'PyPI', 'npm', 'Go', 'NuGet' (abweichend von GHSA: 'pip'). Bulk-Delta: https://osv-vulnerabilities.storage.googleapis.com/PyPI/modified_id.csv (Range-Request getestet, neueste Zeile 2026-10-24T02:56Z). OSV-Namen mit 0 Treffern: PyPI openai, comfyui, crewai, pyautogen, autogen-agentchat, huggingface-hub, dify, npm openai; die laufen über Repo-Advisories oder NVD.
- **CISA Known Exploited Vulnerabilities (KEV) JSON** · dataset · geprüft · HTTP 200 · neuestes: 2026-10-23 (catalogVersion 2026.10.23, count 1756)
  `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
  Kategorien: Sicherheitslücken
  Signal für Ausnutzung in freier Wildbahn. Felder: cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, dueDate, knownRansomwareCampaignUse, cwes. KI-relevante Einträge bisher: Langflow (CVE-2025-3248, CVE-2026-33017) und n8n (CVE-2025-68613). Es gibt also wenige direkte KI-Einträge, aber jeder ist ein Top-Story-Kandidat. Hauptnutzen: Join auf cveID aus GHSA/NVD/MSRC → +Score. Mirror: https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json (200, identische Größe). Exakte Vendor/Produkt-Liste nutzen, keinen lockeren Regex ('ray' trifft DrayTek und Array Networks).
  Nachprüfung: 200. 1,8 MB, 1756 Einträge, 35 neu in 30 Tagen, davon 0 KI. KI-Einträge insgesamt: Langflow/Langflow (2×), n8n/n8n (1×). vendorProject ist Freitext mit Leerzeichen am Ende ('Array Networks '), deshalb trim+lower und exakt matchen, keine Regex (ein Regex-Test auf 'ray' traf Array/DrayTek). Neues Feld forensicTriage.
- **FIRST EPSS API** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-23 (tägliche Scores)
  `https://api.first.org/data/v1/epss?cve=CVE-2026-33017,CVE-2025-3248`
  Kategorien: Sicherheitslücken
  Wahrscheinlichkeit einer Ausnutzung in den nächsten 30 Tagen. Felder: cve, epss, percentile, date. Beispiel: CVE-2025-3248 (Langflow) epss 0.9999 bzw. Perzentil 0.9999. Nur zum Anreichern bereits gefundener CVEs (Batch bis 100). GHSA liefert epss teils schon mit.
- **Microsoft MSRC Security Update Guide RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://api.msrc.microsoft.com/update-guide/rss`
  Kategorien: Sicherheitslücken
  Hier erscheinen Copilot- und Azure-AI-CVEs, auch Cloud-CVEs ohne Patch-Aktion. Treffer bei Titel-Filter (Copilot|Azure OpenAI|AI Foundry|Azure Machine Learning|Semantic Kernel|Prompt Flow) in den letzten Wochen: 21, z. B. 2026-10-22 'Azure AI Foundry Elevation of Privilege', 2026-10-06 'Microsoft 365 Copilot Business Chat Information Disclosure'. Item-Attribut Revision: Revisionen werden erneut gepostet, deshalb nach guid (CVE) deduplizieren und nur Revision 1.0 als neu werten. Ergänzend gibt es die CVRF-API https://api.msrc.microsoft.com/cvrf/v3.0/updates (200, Felder ID, DocumentTitle, InitialReleaseDate, CurrentReleaseDate, CvrfUrl) für Details mit CVSS und Exploited-Flag pro Monat. Den MSRC-Blog-Feed gibt es nicht mehr (siehe eigener Eintrag).
- **AWS Security Bulletins RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://aws.amazon.com/security/security-bulletins/rss/feed/`
  Kategorien: Sicherheitslücken
  Klein und sehr KI-relevant: Kiro IDE (CVE-2026-89332, Datenexfiltration), Strands Agents SDK, Bedrock AgentCore Starter Toolkit, Amazon Q Business, SageMaker Python SDK. Etwa 34 Items mit wenigen neuen pro Woche, Titel enthalten CVE und Produkt. Filter: Bedrock|SageMaker|Amazon Q|Kiro|Nova|AgentCore|Strands.
- **Google Cloud Security Bulletins (Atom)** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23 (GCP-2026-071)
  `https://cloud.google.com/feeds/google-cloud-security-bulletins.xml`
  Kategorien: Sicherheitslücken
  Deckt Vertex AI und Gemini-Cloud-Produkte ab (im aktuellen Feed 3 Vertex-Erwähnungen). Achtung: Alle <updated> tragen denselben Regenerierungs-Zeitstempel. Das Datum steht im Content als 'Published: YYYY-MM-DD', dedupliziert wird über die GCP-ID im Titel. Link: docs.cloud.google.com/support/bulletins#gcp-2026-xxx. Die alten Feed-URLs gcp-security-bulletins.xml und support-bulletins.xml liefern 404.
- **Embrace The Red (Johann Rehberger / wunderwuzzi)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-13
  `https://embracethered.com/blog/index.xml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Wichtigste Einzelquelle für Prompt Injection und Datenexfiltration in Copilot, Claude Code, ChatGPT und Gemini. Aktuell z. B. 'Visual Studio Copilot and SSMS RCE (CVE-2026-103572)' und 'SQL Copilot (CVE-2026-65669)'. Etwa 2–4 Posts pro Monat, Feed mit 233 Items (312 KB), nur neue GUIDs verarbeiten. Kein Keyword-Filter nötig, für den Nutzer hohe persönliche Relevanz.
- **Simon Willison – Tag prompt-injection (Atom)** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-09-17
  `https://simonwillison.net/tags/prompt-injection.atom`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Kuratierte Einordnung von Prompt-Injection-Funden ('Breaking Claude Code Opus 5 Auto Mode', 'Stealing Reasoning Traces …'). Inzwischen eher wenige Einträge pro Monat (neuester vor 37 Tagen, also noch frisch). Ergänzend gibt es https://simonwillison.net/tags/security.atom (200, neuester 2026-10-22), dort aber Keyword-Filter nötig. CF-RAY im Header, deshalb in Actions auf 403 achten.
- **OpenAI News RSS (Kategorie Security)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://openai.com/news/rss.xml`
  Kategorien: Sicherheitslücken, Neuigkeiten, Vertragsänderungen
  Gemeinsam mit anderen Bereichen genutzter Feed. Eigenes <category>-Feld (CDATA): 31x 'Security', dazu 'Safety'/'Global Affairs'. Security-Posts sind z. B. 'The Hugging Face incident and the road ahead', 'Disrupting a coordinated model-distillation campaign', 'Patch the Planet'. Für den Bereich security nur category=Security bzw. Threat-Intel-Titel. Hinter Cloudflare; die Website-Seiten (security-and-privacy, trust) laden das challenge-platform-Skript, der RSS-Feed kam mit Bot-UA aber durch.
- **The Hacker News (Feedburner)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://feeds.feedburner.com/TheHackersNews`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Schnellster Aggregator für KI-Vorfälle: 48 Items, davon etwa 6 KI-bezogen ('LiteLLM Suspects GitHub Token Leak … Malicious Package Release', 'OpenCode Flaw Lets Malicious MCP Servers Execute Code', 'x402 SDK Flaw … AI Agents'). Keyword-Vorfilter nötig (AI|LLM|agent|MCP|Copilot|ChatGPT|Claude|Gemini|Cursor|prompt injection), Webinar- und Sponsored-Titel verwerfen.
- **heise Security (Atom)** · atom · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.heise.de/security/rss/news-atom.xml`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Deutsche Quelle mit deutschem Original-Link, gut für die Zielgruppe. Gleicher Inhalt unter https://www.heise.de/security/feed.xml. Im Stichproben-Fenster gab es keine KI-Titel, daher Keyword-Filter (KI|LLM|Copilot|ChatGPT|Claude|Gemini|Agent|Prompt). Nur Teaser, Volltext teils heise+.
- **AI Incident Database (AIID) RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://incidentdatabase.ai/rss.xml`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Neue Berichte und Incidents mit Datum (nur Tagesgenauigkeit, 00:00 GMT). <link> zeigt auf den Original-Artikel (z. B. CBC), die AIID-Zitierung steht in der description '(https://incidentdatabase.ai/cite/1772#8165)'. Breit gefasste 'AI Harms', nicht nur Security (Chatbot-Fehler usw.), deshalb Claude-Vorfilter oder Keyword-Filter auf security/leak/breach/injection/jailbreak. Snapshots (MongoDB-Dumps) gibt es unter /research/snapshots/ (200), für den Tagesbetrieb nicht nötig.
- **MSRC Security Update Guide API v2 (affectedProduct)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://api.msrc.microsoft.com/sug/v2.0/en-US/affectedProduct?%24filter=contains(product,%27Copilot%27)&%24orderby=releaseDate%20desc&%24top=200`
  Kategorien: Sicherheitslücken
  OData-Filter funktioniert. Copilot-Produkte gesamt 48 Einträge, neuester 17.09.2026. KI-Filter über 30 Tage: 2 Treffer (Azure AI Foundry 22.10., Azure SRE Agent 08.10., beide Critical, customerActionRequired=false). Felder: cveNumber, product, impact, severity, cpe, customerActionRequired, baseScore. Das CVRF-Monatsdokument (cvrf/2026-Oct) wiegt 28,6 MB und ist deshalb nicht 3× täglich abrufbar.
  (aus der Nachprüfung)
- **GitHub Advisory Database API** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://api.github.com/advisories?affects=langflow,n8n,open-webui,vllm,litellm,comfyui,ollama,langchain,langchain-core,@anthropic-ai/claude-code,@openai/codex,@google/gemini-cli,mcp,@modelcontextprotocol/sdk,github.com/ollama/ollama&published=%3E2026-09-24&per_page=100`
  Kategorien: Sicherheitslücken, Open Source & Tools
  30 Tage: 31 reviewed Advisories (vllm 12, langflow und langflow-base und lfx 16, litellm 9, @modelcontextprotocol/* 11, mcp 2, @anthropic-ai/claude-code 1; Mehrfachpakete je Advisory). Severity: critical 4, high 12, medium 14, low 1; 27 mit CVE-ID. n8n und open-webui ohne reviewed Treffer, obwohl NVD 30 bzw. 19 CVEs zeigt; für diese type=unreviewed ergänzen.
  (aus der Nachprüfung)

## Ergänzend (24)

- **GitHub Blog – Security** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://github.blog/security/feed/`
  Kategorien: Sicherheitslücken, Open Source & Tools
  GitHub Security Lab und Copilot-Security sowie Supply-Chain-Themen (npm/Actions). Etwa 1 Post pro Woche, Keyword-Filter auf AI/Copilot/agent/MCP. Die Changelog-Label-Feed-URL /changelog/label/security/feed/ liefert 404.
- **Google Security Blog (neu auf blog.google)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://blog.google/security/rss/`
  Kategorien: Sicherheitslücken
  security.googleblog.com leitet jetzt auf blog.google/security/ um. Der alte Blogger-Feed (security.googleblog.com/feeds/posts/default) liefert zwar noch 200, der neueste Post ist aber vom 2026-04-23, also veraltet: nicht verwenden. Inhalte: Chrome/Android/Gemini-Security, AI VRP, SAIF. Keyword-Filter auf Gemini/AI.
- **Google Project Zero** · atom · geprüft · HTTP 200 · neuestes: 2026-10-06
  `https://projectzero.google/feed.xml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  googleprojectzero.blogspot.com leitet hierher um. KI-Bezug über Big Sleep und LLM-gestützte Bugsuche, sonst Low-Level-Exploits. Feed ist mit 11 MB riesig, deshalb nur mit If-Modified-Since/ETag und Größenlimit abrufen, z. B. 1x täglich. Etwa 1–2 Posts pro Monat.
- **Trail of Bits Blog** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-21
  `https://blog.trailofbits.com/feed/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks, Open Source & Tools
  Regelmäßig KI- und Agent-Security ('Your AI agent fixed the bug, but what else did it change?') sowie ML-Supply-Chain (Pickle, Modelle). Keine <category>-Tags, daher Titel/Description-Keywords. Gleicher Inhalt unter /index.xml. Etwa 1 Post pro Woche.
- **Wiz Blog/Research** · rss · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://www.wiz.io/feed/rss.xml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Wiz Research findet häufig KI-Infrastruktur-Leaks und -Lücken (Ollama, NVIDIA, KI-Startups mit offenen DBs). Feed enthält den ganzen Blog inklusive Marketing und keine Kategorien, deshalb streng filtern (Research|vulnerability|exposed|AI|LLM|model). Identisch unter /blog/rss.xml.
- **Palo Alto Unit 42** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://unit42.paloaltonetworks.com/feed/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Hauptfeed klein, deshalb Keyword-Filter. Tag-Feeds existieren (WordPress /tag/<slug>/feed/), sind aber träge: /tag/llm/feed/ (neuester 2026-10-15), /tag/agentic-ai/feed/ (2026-09-18), /tag/genai/feed/ (2026-04-30, veraltet), /tag/prompt-injection/feed/ (2026-04-03, veraltet). /category/artificial-intelligence/feed/ liefert 404. Empfehlung: Hauptfeed plus Filter.
- **Microsoft Security Blog – Topic AI and agents** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.microsoft.com/en-us/security/blog/topic/ai-and-machine-learning/feed/`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Eigenständiger Topic-Feed (Titel 'AI and agents Insights'), der sich vom Hauptfeed /security/blog/feed/ unterscheidet. Microsoft Threat Intelligence zu KI-Missbrauch, AI Red Team, Copilot-Security. Teils Produktmarketing (Security Copilot), Claude-Ranking filtert.
- **Google Threat Intelligence Group (GTIG/Mandiant)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-15
  `https://cloudblog.withgoogle.com/topics/threat-intelligence/rss/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  GTIG veröffentlicht Reports zu staatlichem und kriminellem Missbrauch von Gemini und anderen LLMs. Die URL unter cloud.google.com/blog/... liefert HTML statt Feed, korrekt ist cloudblog.withgoogle.com. Keyword-Filter auf AI/Gemini/LLM, Rest ist klassische Threat Intel. Conditional GET, weil der Feed groß ist.
- **JFrog Blog (Security Research)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://jfrog.com/blog/feed/`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Findet regelmäßig bösartige Modelle auf Hugging Face, Lücken in ML-Tools (MLflow, Ray …) und Supply-Chain-Angriffe auf KI-Pakete. Mit Produktmarketing gemischt, deshalb Keyword-Filter.
- **Socket.dev Blog (Atom)** · atom · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://socket.dev/api/blog/feed.atom`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Supply-Chain-Angriffe auf npm/PyPI inklusive KI-Pakete und MCP-Server, aktuell z. B. 'LiteLLM Secret-Stealing Workflows Ran 11 Days Before Supply Chain Attack'. Mischung mit Nicht-Security-News (TypeScript-Compiler usw.), daher Filter. Ein Tag-Feed /blog/tag/ai/feed.atom existiert nicht (404).
- **Adversa AI Blog** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-22
  `https://adversa.ai/feed/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Monatliche kuratierte Digests 'Top GenAI security resources' und 'Top MCP security resources' (Oktober 2026), außerdem 'Is Claude Code safe for the enterprise?'. Gut als Seed für Links, die man sonst verpasst. Wenig Volumen.
- **OWASP GenAI Security Project News** · rss · geprüft · HTTP 200 · neuestes: 2026-10-08
  `https://genai.owasp.org/feed/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Quartalsweise 'GenAI and Agentic AI Exploit Roundup' (Q3 2026 am 2026-10-08) und Ankündigungen (Top 10 for LLM Apps 2026, Agent-Standards). Niedrige Frequenz, hohe Signalqualität. Der Exploit-Roundup ist eine Fundgrube für Einzelvorfälle.
- **MITRE ATLAS Data (GitHub)** · github-repo · geprüft · HTTP 200 · neuestes: 2026-09-10 (letzter Commit), Case Studies bis AML.CS0056
  `https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  452-KB-YAML mit Taktiken, Techniken und Case Studies (IDs AML.CS00xx). Für Tagesnews ungeeignet. Nutzen: Diff neuer Case-Study-IDs (selten) und Taxonomie für das Tagging von Vorfällen (z. B. AML.T0051 Prompt Injection). Commit-Check über https://api.github.com/repos/mitre-atlas/atlas-data/commits?per_page=1, 1x pro Woche.
- **AIAAIC Repository (Google Sheet CSV-Export, Tab Incidents)** · dataset · geprüft · HTTP 200 · neuestes: AIAAIC2276 (nur Jahresangabe, kein Datum)
  `https://docs.google.com/spreadsheets/d/1Bn55B4xz21-_Rgdr8BBb2lt0n_4rzLGxFADMlVW0PYI/export?format=csv&gid=888071280`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Der erste Tab (gid 0) ist nur eine Welcome-Seite, die Incidents liegen auf gid=888071280 (gefunden über /htmlview). Drei Header-Zeilen. Spalten: AIAAIC ID#, Incident headline, Occurred (nur Jahr), Deployer, Developer, System name, Technology, Purpose, News trigger, Ethical issue, Harm, Summary/links. Neue Einträge über ID-Diff erkennen (z. B. 'OpenAI agents hijack German wiki for two months' – DE-Bezug!). Lizenz CC BY-SA 4.0 laut Website: Attribution und Share-Alike beachten, besser nur verlinken und selbst zusammenfassen.
- **NVIDIA PSIRT Security Bulletins (GitHub CSV)** · github-repo · geprüft · HTTP 200 · neuestes: 2026-10-13 (letzter Commit)
  `https://raw.githubusercontent.com/nvidia/product-security/main/2026/CVE_index.csv`
  Kategorien: Sicherheitslücken
  NVIDIA hat keinen RSS-Feed (nur E-Mail), veröffentlicht aber seit Okt. 2025 auf GitHub. CSV mit ';' als Trenner: CVE;CVSS;Severity;Vector;CWE;Bulletin;Affected Product;Affected Version;Fixed In. KI-relevant: NeMo, Megatron-LM, Triton, TensorRT-LLM, NIM, Dynamo (z. B. CVE-2026-65179 NeMo Speech 8.8, Deserialisierung). Änderungen erkennt man über https://github.com/nvidia/product-security/commits/main.atom (200, Atom). 655 KB, nur bei neuem Commit laden. Produktfilter, weil auch GPU-Treiber und BlueField enthalten sind.
- **BSI Presse & Veranstaltungen RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml`
  Kategorien: Sicherheitslücken, Gesetze, Neuigkeiten
  Deutscher Behörden-Blick auf KI-Sicherheit, z. B. 'Prüfkatalog vertrauenswürdige KI-Systeme … Community Draft', 'Nur jedes zehnte Unternehmen gegen KI-gestützte Angriffe gerüstet'. Filter auf KI|Künstliche Intelligenz|LLM. Titel sind HTML-Entity-kodiert (&#252;). Daneben gibt es die BSI-IT-Sicherheitsmitteilungen (BITS) https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_CSW.xml (200, neuester 2026-10-22): nur kritische Zero-Days, bisher ohne KI-Bezug, als Option bei aktiver Ausnutzung. Die alte URL RSSNewsfeed_WID.xml liefert 404.
- **SecurityWeek – Kategorie Artificial Intelligence** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://www.securityweek.com/category/artificial-intelligence/feed/`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Bereits nach KI-Security vorgefiltert, was Claude-Tokens spart. Etwa 1–3 Items pro Tag. Gute Ergänzung zu THN mit weniger Duplikaten in den Nischen. Cloudflare-fronted.
- **BleepingComputer (Hauptfeed)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://www.bleepingcomputer.com/feed/`
  Kategorien: Sicherheitslücken, Neuigkeiten
  Schnelle Meldungen zu Vorfällen (Leaks, bösartige Extensions, Account-Übernahmen bei KI-Diensten). Keyword-Filter nötig. Alternativ Dark Reading https://www.darkreading.com/rss.xml (200, 50 Items, neuester 2026-10-23, Cloudflare): nur eine der beiden nehmen, weil sie sich stark überschneiden.
- **Anthropic Frontier Red Team (red.anthropic.com)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20
  `https://red.anthropic.com/`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Kein RSS (/rss.xml liefert auf anthropic.com 404). Die Seite ist serverseitig gerendert (Next.js) und enthält Links /research/<slug> sowie eingebettetes JSON mit Datum und 'category':'Frontier Red Team'. Diff über neue /research/-Slugs. Inhalte: KI-Cyberfähigkeiten, Exploit-Evals, Verbreitung offensiver Fähigkeiten (z. B. GLM-5.3). Für die Nutzer-Tools (Claude) relevant. Anthropic-Sicherheitslücken selbst (Claude Code) kommen über GHSA.
- **HiddenLayer (Sitemap-Diff)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-15 (lastmod)
  `https://hiddenlayer.com/sitemap.xml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Kein RSS (/feed/, /innovation-hub/feed/ und /rss.xml liefern 404, hinter Cloudflare). Die Sitemap hat 371 URLs, davon 72 Blog/Research, mit lastmod. Neue <loc> unter /innovation-hub/ bzw. /research/ diffen. Gleiches Muster verifiziert: noma.security/sitemap.xml (lastmod 2026-10-23), zenity.io/sitemap.xml (2026-10-21), www.legitsecurity.com/sitemap.xml (2026-10-22), www.lakera.ai/sitemap.xml (200, ohne lastmod, daher nur Diff neuer URLs möglich). Alle stark vertriebsgetrieben, deshalb niedriges Gewicht, aber Erstveröffentlichung vieler Agent- und MCP-Exploits.
- **Pillar Security (Sitemap-Diff)** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-20 (lastmod)
  `https://www.pillar.security/sitemap.xml`
  Kategorien: Sicherheitslücken, Forschung & Benchmarks
  Kein RSS (/blog/rss.xml liefert 404). Die Sitemap hat 368 URLs, davon 138 Blog, mit lastmod. Pillar veröffentlicht Agent- und Copilot-Exploits (z. B. Rules-File-Backdoor). Wenn nur ein Sitemap-Diff aus dem Vendor-Cluster gebaut wird: HiddenLayer oder Pillar.
- **Popularitäts-APIs (pypistats / npm downloads)** · json-api · geprüft · HTTP 200 · neuestes: tagesaktuell
  `https://pypistats.org/api/packages/langchain-core/recent`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Keine News-Quelle, sondern Eingabe für die Severity-Heuristik (Faktor 'Verbreitung'). pypistats: data.last_day/last_week/last_month (langchain-core 36,6 Mio. pro Woche). npm: https://api.npmjs.org/downloads/point/last-week/@modelcontextprotocol/sdk (200, 42 Mio. pro Woche). Ergänzend https://api.deps.dev/v3/systems/pypi/packages/vllm (200, Versionen und Metadaten). Wöchentlich für die Watchlist cachen, log10(Downloads) in Tier übersetzen.
- **NVD CVE API 2.0** · json-api · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1`
  Kategorien: Sicherheitslücken
  Cloudflare mit __cf_bm. Volumen: 450 CVEs in 24 h, 16.935 in 30 Tagen, also etwa 150 pro Lauf, mit resultsPerPage=2000 in einem Request. CPE-Matching (virtualMatchString) trifft in 30 Tagen nur 43 CVEs (Langflow 24, vLLM 19); die Keyword-Suche über dieselben Produkte findet 202. Neue CVEs stehen meist auf Deferred, Awaiting Analysis oder Received und haben keine CPE-Daten. Empfehlung: pubStartDate-Fenster je Lauf plus strikte Regex auf die Beschreibung.
  (aus der Nachprüfung)
- **CVE Services API (cveawg, CNA-Daten)** · json-api · geprüft · HTTP 200 · neuestes: n/a
  `https://cveawg.mitre.org/api/cve/CVE-2026-103245`
  Kategorien: Sicherheitslücken
  Liefert CNA-affected vendor:product sofort nach Veröffentlichung, ohne auf die NVD-Analyse zu warten. Beispiele: n8n-io:n8n, open-webui:open-webui (CNA VulnCheck). Die CNA-Namen weichen von der NVD-CPE ab (n8n:n8n, openwebui:open_webui). Nur für Regex-Kandidaten abfragen, um False Positives zu verwerfen. Massendaten über cvelistV5 sind unpraktisch: deltaLog.json wiegt 32,7 MB.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (8)

- **CERT-Bund WID Sicherheitshinweise RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://wid.cert-bund.de/content/public/securityAdvisory/rss`
  Kategorien: Sicherheitslücken
  Funktioniert, ist aber fast nur Linux-Distros, Browser und Netzwerkgeräte mit deutschen Schweregraden ([mittel]/[hoch]). Für KI praktisch nur NVIDIA-Treiber. Hohes Volumen, geringe KI-Relevanz. Allenfalls als deutscher Zweitlink, wenn eine CVE schon aus GHSA/NVD bekannt ist.
- **Anthropic Trust Center** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://trust.anthropic.com/`
  Kategorien: Sicherheitslücken, Vertragsänderungen
  Nur JavaScript (7,5 KB-Shell, Cloudflare), kein Feed, keine maschinenlesbaren Inhalte. Die Responsible-Disclosure-Seite https://www.anthropic.com/responsible-disclosure-policy (200) ist statisch, also kein Newsfeed. Claude-Code-Lücken erscheinen zuverlässig als GHSA (npm @anthropic-ai/claude-code, 29 OSV-Einträge).
- **OpenAI Trust Portal / Security-Seite** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://trust.openai.com/`
  Kategorien: Sicherheitslücken, Vertragsänderungen
  Antwortet mit 200, enthält aber das Cloudflare-challenge-platform-Skript. Ebenso https://openai.com/security-and-privacy/. Von Azure-IPs sind Challenges wahrscheinlich, Inhalt per JS. Security-Meldungen besser über den OpenAI News RSS (category Security) und GHSA (@openai/codex).
- **huntr (Protect AI / Palo Alto) Hacktivity** · html-page · NICHT nutzbar · HTTP 200 · neuestes: n/a
  `https://huntr.com/bounties/hacktivity`
  Kategorien: Sicherheitslücken, Open Source & Tools
  Clientseitig gerendert, das HTML enthält keine Bounty-IDs oder CVEs. Kein Feed. huntr ist CNA, die Funde landen ohnehin als CVE in NVD/GHSA/OSV (z. B. Ollama, Gradio, MLflow, Open WebUI). Protect-AI-Blog-RSS (protectai.com/blog/rss.xml) liefert 404.
- **0DIN (Mozilla GenAI Bug Bounty) Disclosures** · html-diff · NICHT nutzbar · HTTP 200 · neuestes: 2026-08-18
  `https://0din.ai/disclosures`
  Kategorien: Sicherheitslücken
  Serverseitig gerendert (10 Links /disclosures/<uuid>), neuester sichtbarer Eintrag 2026-08-18, also über 60 Tage alt und als veraltet eingestuft. /disclosures.rss liefert 406. Ein 'Threat Feed' ist laut Docs ein eigenes (vermutlich kommerzielles) Produkt.
- **PromptArmor (Substack)** · rss · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: 2025-10-16
  `https://promptarmor.substack.com/feed`
  Kategorien: Sicherheitslücken
  Feed funktioniert, ist aber seit einem Jahr veraltet (letzter Post 2025-10-16). Die Website-Variante promptarmor.com/resources/rss.xml liefert 404. Neue PromptArmor-Funde tauchen über Simon Willison und THN auf. Ebenfalls veraltet: Promptfoo-Blog https://www.promptfoo.dev/blog/rss.xml (200, letzter Post 2026-03-12).
- **Invariant Labs Blog (jetzt Snyk)** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: n/a
  `https://invariantlabs.ai/blog`
  Kategorien: Sicherheitslücken
  Kein Feed (/blog/rss.xml und /feed.xml geben die HTML-Seite zurück), keine Datumsangaben im HTML. MCP-Tool-Poisoning-Forschung lief früher hier, seit der Übernahme durch Snyk kaum noch aktiv. Der Snyk-Blog-Feed https://snyk.io/blog/feed/ (200, 1,3 MB, 1677 Items) ist überwiegend Marketing, daher kein Ersatz.
- **MSRC Blog Feed (veraltet)** · rss · NICHT nutzbar · HTTP 200 (HTML nach Redirect auf microsoft.com/en-us/msrc/blog, kein Feed) · neuestes: n/a
  `https://msrc.microsoft.com/blog/feed`
  Kategorien: Sicherheitslücken
  Leitet auf die HTML-Seite www.microsoft.com/en-us/msrc/blog um. /msrc/blog/feed, /feed/ und /rss liefern 404. Ersatz: MSRC-Update-Guide-RSS (CVEs) und der Topic-Feed des Microsoft Security Blog (AI).

## Fallen

- NVD liegt inzwischen hinter Cloudflare (Server: cloudflare, CF-RAY). Ohne Key gilt ein Limit von 5 Requests pro 30 s, und 403 bedeutet Throttling. Bei Parameterfehlern kommt HTTP 404 mit leerem Body, die Fehlermeldung steht im Response-Header 'message' (z. B. 'Date range cannot exceed 120 days.'), deshalb Header loggen. keywordSearch matcht Freitext und produziert viele Fehltreffer ('LLM', 'agent', 'ray').
- Das GitHub-REST-Limit ohne Token (60/h) war im Test nach ca. 20 Calls auf 5 gesunken. Im Workflow muss GITHUB_TOKEN gesetzt sein (1000/h pro Repo). Repo-Advisories, globale Advisories und Commit-Checks teilen sich dasselbe Kontingent.
- Die Ecosystem-Namen unterscheiden sich: GHSA nutzt 'pip', 'npm', 'go', 'nuget', OSV dagegen 'PyPI', 'npm', 'Go', 'NuGet'. Die Watchlist muss beide Schreibweisen führen. Go-Pakete laufen über den Modulpfad (github.com/ollama/ollama).
- GHSA liefert standardmäßig nur type=reviewed. Apps ohne Paket (ComfyUI, Dify, text-generation-webui, Cursor) erscheinen oft nur als Repository-Advisory oder unreviewed. Malware-Pakete kommen ausschließlich über type=malware.
- Advisories kommen in Schüben: vLLM, n8n und open-webui veröffentlichen 10–20 Advisories auf einmal (n8n: 44 seit dem 1.9.). Ohne Clustering nach Paket und Tag würde das Claude-Budget verbrannt, und das Dashboard wäre mit Einträgen derselben Lücke überflutet.
- Der MSRC-RSS ist 2,8 MB groß und enthält etwa 5000 Items. Revisionen derselben CVE werden mit neuem Revision-Attribut erneut gepostet (auch reine CVSS-Korrekturen), deshalb nach CVE deduplizieren und nur Revision 1.0 als neu werten.
- Im Google-Cloud-Bulletin-Feed tragen alle <updated> denselben Regenerierungs-Zeitstempel. Das echte Datum steht nur im Content ('Published: YYYY-MM-DD'), Dedupe-Key ist die GCP-ID. Die alten Feed-URLs (gcp-security-bulletins.xml) liefern 404.
- Für den KEV-Filter keinen Substring-Regex verwenden: 'ray' trifft DrayTek und Array Networks. Stattdessen eine exakte vendorProject/product-Liste pflegen. Direkte KI-Einträge sind selten (Langflow 2x, n8n 1x).
- Einige Feeds sind sehr groß: Project Zero 11,3 MB, GTIG 1,45 MB, Snyk 1,3 MB, Trail of Bits 1 MB, OpenAI RSS 800 KB mit 1318 Items. Ohne ETag/If-Modified-Since und Größenlimit wird jeder Lauf langsam.
- Umgezogene oder tote Quellen: security.googleblog.com leitet auf blog.google/security um (der alte Blogger-Feed liefert noch 200, ist aber seit April 2026 veraltet – Falle). googleprojectzero.blogspot.com wird zu projectzero.google. Den MSRC-Blog-Feed gibt es nicht mehr. Koi Security leitet auf paloaltonetworks.com um. Die BSI-WID-URL RSSNewsfeed_WID.xml liefert 404.
- Bot-Schutz: Viele Quellen liefern von der privaten IP mit Bot-UA zwar 200, sind aber Cloudflare-fronted (CF-RAY) und könnten von GitHub-Actions-IPs (Azure) blockiert werden: NVD API, openai.com (RSS ok; Seiten mit challenge-platform), simonwillison.net, blog.trailofbits.com, red.anthropic.com, securityweek.com, bleepingcomputer.com, darkreading.com, socket.dev, adversa.ai, api.npmjs.org, hiddenlayer.com. Im Test gab es keinen 403 und keine Challenge-Seite, aber Health-Monitoring pro Quelle ist Pflicht.
- Viele AI-Security-Startups (HiddenLayer, Lakera, Pillar, Zenity, Noma, Legit) haben keinen RSS. Es bleibt nur ein Sitemap-Diff (funktioniert, aber ohne Titel und Datum pro Post, also ist eine Folgeanfrage für den Titel nötig). Die Inhalte sind stark vertriebsgetrieben.
- Trust-Center von Anthropic und OpenAI sind JS-only bzw. stehen hinter einer Cloudflare-Challenge und lassen sich nicht automatisieren. Vorfälle bei Anbietern (Datenlecks, Account-Kompromittierung) kommen faktisch über News-Feeds (THN, BleepingComputer, heise) und den OpenAI-Security-Kategorie-Feed.
- AIAAIC: Der erste Sheet-Tab ist nur eine Welcome-Seite (Incidents liegen auf gid=888071280). Es gibt drei Header-Zeilen, nur Jahresangaben und Lizenz CC BY-SA 4.0. Die gid kann sich ändern, deshalb bei 0 Datenzeilen die gid über /htmlview neu ermitteln.
- Im AIID-RSS zeigt <link> auf den Medienartikel, nicht auf AIID. Die AIID-Zitierung steckt in der description. Die Inhalte sind breite 'AI Harms' und nicht nur Security, deshalb vorfiltern.
- Datumsformate sind heterogen: CISA-RSS nutzt zweistellige Jahre ('Fri, 23 Oct 26'), AIID 00:00 GMT, NVD Millisekunden ohne Zeitzone in den Antworten. Einen robusten Parser verwenden (z. B. dateutil / feedparser) und alles nach UTC normalisieren.
- In NVD sind Einträge mit vulnStatus 'Awaiting Analysis' häufig, dann fehlt der NVD-eigene CVSS. Ersatzweise CNA-Metriken (Secondary) bzw. CISA-ADP-SSVC nutzen. Einträge mit cveTags 'unsupported-when-assigned' (EOL-Software) abwerten. Rejected-CVEs mit noRejected ausschließen.

## Empfehlungen der Recherche

- Architektur in drei Stufen, jeweils deduplizieren über CVE/GHSA-ID bzw. URL-Hash in einer state.json im Repo. (1) Strukturierte Schwachstellen pro Lauf: GHSA-Watchlist in einem Call (affects=Liste, updated=>letzter Lauf, per_page=100) mit OSV querybatch als Fallback; Repo-Advisories für Apps ohne Paket; NVD lastMod-Fenster mit Produkt-Keywords für SaaS ohne Paket; MSRC-, AWS-, GCP- und NVIDIA-Bulletins. (2) Anreicherung: KEV (1x täglich), EPSS (Batch bis 100 CVEs), NVD-SSVC. (3) Research- und News-Feeds für Vorfälle (Embrace The Red, Simon Willison, OpenAI Security, THN, SecurityWeek AI, heise, AIID).
- Konkrete GHSA/OSV-Watchlist. pip/PyPI: langchain, langchain-core, langchain-community, langgraph, llama-index, llama-index-core, transformers, torch, keras, vllm, sglang, open-webui, gradio, mlflow, ray, litellm, anthropic, openai, mcp, semantic-kernel, langflow, langflow-base, llama-cpp-python, jupyterlab, haystack-ai. npm: @modelcontextprotocol/sdk, @modelcontextprotocol/server-filesystem, @modelcontextprotocol/inspector, mcp-remote, flowise, flowise-components, n8n, @anthropic-ai/claude-code, @anthropic-ai/sdk, @openai/codex, @google/gemini-cli, @github/copilot, ai, @langchain/core, langchain. go: github.com/ollama/ollama. nuget: Microsoft.SemanticKernel.Core. Repo-Advisories: anthropics/claude-code, cursor/cursor, open-webui/open-webui, comfyanonymous/ComfyUI, langgenius/dify, oobabooga/text-generation-webui, modelcontextprotocol/servers, google-gemini/gemini-cli, crewAIInc/crewAI, microsoft/autogen. NVD-Keywords für Produkte ohne Paket: Copilot, ChatGPT, Gemini, Cursor, Windsurf, 'prompt injection', 'Model Context Protocol', Hugging Face, Bedrock, Vertex AI.
- Severity-Heuristik für den Security-Impact (0–100, durch 10 geteilt ergibt das den Impact-Score 1–10), deterministisch vor dem Claude-Aufruf berechnet. A) Basis-CVSS (v4 vor v3.1; sonst GHSA-severity): critical (≥9.0) 40, high (7.0–8.9) 28, medium (4.0–6.9) 15, low/unbekannt 6. B) Ausnutzung: CISA-KEV +35 | NVD-SSVC exploitation=active +30 (nicht kumulativ mit KEV, Maximum nehmen) | exploitation=poc oder öffentlicher PoC-Link +10 | EPSS-Perzentil ≥0,95 +15, ≥0,80 +8. C) Verbreitung (Tier): Tier A (Produkte großer Anbieter und Massen-Bibliotheken: ChatGPT, Claude/Claude Code, Gemini, M365/GitHub Copilot, Cursor, Azure OpenAI/AI Foundry, Bedrock, Vertex AI, Hugging Face Hub, transformers, torch, langchain-core, openai/anthropic SDKs, MCP SDK) +20 | Tier B (weit verbreitetes Self-Hosting: Ollama, Open WebUI, vLLM, n8n, Langflow, Flowise, LiteLLM, MLflow, Ray, Gradio, ComfyUI, Dify, llama.cpp; alternativ log10 der wöchentlichen Downloads ≥7) +12 | sonst +4. D) Angriffsprofil: AV:N/PR:N/UI:N +5; Folge ist RCE, Sandbox-Escape oder Datenexfiltration aus einem Agenten/Coding-Tool +5; nur DoS (CWE-400/770/835) −10; AV:L −5; 'unsupported-when-assigned' −10. E) Untergrenzen für Vorfälle: bestätigter Datenabfluss oder Kompromittierung bei einem großen KI-Anbieter mindestens 80; Supply-Chain-Kompromittierung eines Tier-A/B-Pakets (z. B. bösartiges LiteLLM-Release) mindestens 75; aktiv ausgenutzte Lücke in Tier A mindestens 85. Obergrenze 100. Ein Langflow-RCE mit KEV-Eintrag ergibt z. B. 40+35+12+5+5 = 97, ein vLLM-DoS (medium) 15+12−10 = 17.
- Persönliche Relevanz getrennt berechnen: Betrifft der Eintrag direkt die Nutzer-Tools (Claude/Claude Code, ChatGPT/Codex, Gemini/Gemini CLI, GitHub Copilot, Cursor), gibt es eine Basis von 8/10, +2 wenn eine Handlungsempfehlung existiert (Update, Setting ändern). Ein MCP-SDK/-Server, den Coding-Agents nutzen, gibt 6/10. Reine Self-Hosting-Infrastruktur (vLLM, Ray) 3/10, außer bei Tier-A-Impact.
- Token-Budget sparen: (a) Advisories pro Paket und Tag zu einem Cluster zusammenfassen ('vLLM: 7 neue Advisories, höchste: …') und nur einen Claude-Call pro Cluster machen. (b) Nur Cluster und Artikel mit Pre-Score ≥40 oder Tier-A-Bezug an Claude schicken, alles darunter erscheint ohne KI-Zusammenfassung in einer Liste 'Weitere Advisories' mit Originaltitel. (c) Feed-Artikel zuerst per Regex filtern (AI|KI|LLM|GPT|Claude|Gemini|Copilot|Cursor|agent|MCP|prompt injection|jailbreak|model|Hugging Face|Ollama|LangChain) und per URL/Titel-Ähnlichkeit gegen bereits erfasste CVEs deduplizieren, weil THN, BleepingComputer, SecurityWeek und heise dieselbe Story bringen. (d) Höchstens ca. 10–12 Security-Items pro Lauf an Claude; bei 3 Läufen täglich und kurzen Prompts mit Haiku-Klasse fürs Vorranking bleibt das im 10-EUR-Rahmen.
- Abruf-Hygiene: Alle Requests mit ETag/If-Modified-Since cachen (Actions-Cache oder state.json). Große Quellen (KEV, NVIDIA-CSV, ATLAS, AIAAIC, Project Zero) nur 1x täglich im 07-Uhr-Lauf laden. NVD seriell mit 6 s Pause ohne Key bzw. kostenlosen NVD_API_KEY als Secret hinterlegen. GitHub-Calls immer mit GITHUB_TOKEN. Pro Quelle Status, Größe und Itemzahl loggen und nach 3 Fehlschlägen in Folge auf dem Dashboard als 'Quelle gestört' markieren, insbesondere bei den Cloudflare-fronted Quellen.
- Fallback-Kette für CVE-Daten bei NVD-Blockade aus Azure-IPs: GHSA (enthält CVSS v3/v4, EPSS, CWE), dann OSV (aliases und severity), dann CVEProject/cvelistV5-Releases auf GitHub (stündliche Delta-Releases, getestet: Release 'CVE 2026-10-24_0800Z'). Damit ist die Pipeline nicht von NVD abhängig.
- Bei den deutschen Quellen auf Qualität statt Menge setzen: heise Security (Keyword-Filter) als deutscher Originallink zu großen Fällen, BSI-Presse-Feed für KI-Prüfkataloge und Behördenwarnungen. CERT-Bund WID nur als Zusatzlink, wenn die CVE bereits aus GHSA/NVD bekannt ist.
