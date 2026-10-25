---
name: sicherheitsluecken
description: Sicherheitslücken und KI-Vorfälle für AI Pulse – Produkt-Watchlist, GHSA/NVD/KEV/MSRC/Feeds, Gruppierung je Produkt, Severity-Heuristik, persönliche Relevanz. Laden, bevor du Security-Quellen anbindest oder Scores für `sicherheit` berechnest.
---

# Sicherheitslücken & KI-Vorfälle

Roadmap Phase 4, Modul 3. Stand 2026-10-24: **noch nichts gebaut**, alles hier ist Bauplan. Der Abruf läuft im Job auf dem Heimserver (private IP, systemd-Timer 07:07/13:07/19:07 Europe/Berlin). Endpunkte, Felder und Zahlen live geprüft am 2026-10-24 (Privat-IP, Bot-UA aus dem Steckbrief). Rohdaten: `docs/recherche/2026-10-24/katalog/sicherheit.md`, `querschnitt.md` (GAP 7).

**Abgrenzung:** Abruf-Schicht (UA, Timeout, ETag, Challenge-Erkennung, Circuit-Breaker, Health), Feed-Parser, Datums-Parser → `quellen`. Claude-Stufen, Prompts, Kostenbuch, Auswahl der Top 80, allgemeines Clustering → `bewertung`; CLI-/Notfall-Backend → `claude-headless`. Server, Env-Datei `/etc/ai-pulse/env` (`AIPULSE_GITHUB_TOKEN`, optional `NVD_API_KEY`), Push von `state/` → `job-betrieb`. Anbieter-Aliasse → `modelle-und-ranglisten`. Anzeige der Liste „Weitere Advisories“ → `dashboard-entwickeln` (was hineinkommt, regelt dieser Skill, Abschnitt „Übergabe“). Statusregeln für BSI-Meldungen mit Rechtsbezug → `gesetze-und-fristen` (der Registereintrag `bsi-presse` gehört diesem Skill).

## Grundsätze

- Strukturierte Daten zuerst (GHSA, NVD, KEV, MSRC), Presse nur für Vorfälle ohne CVE. Ein Treffer braucht ein Watchlist-Produkt **und** eine Bestätigung (Paketname, CNA-`affected`, exakter KEV-/MSRC-Name). Nackte Keywords zählen nie.
- **Ein Eintrag je Produkt und Lauf**, derselbe Tag schreibt dieselbe Story fort („n8n: 12 neue Sicherheitslücken, 3 kritisch"). Nie eine Story je Advisory.
- `impact` und `personal` für Advisories rechnet der Code (Heuristik unten). Claude schreibt Titel und Text, überschreibt die Scores nicht.
- Dedupe-Schlüssel: CVE-ID → GHSA-ID → GCP-/AWS-Bulletin-ID → kanonische URL.
- NVD ist nicht Pflicht: bei Drosselung, Cloudflare-Sperre oder ungültigem Key greift die Fallback-Kette.

## Watchlist (`pipeline/config/watchlist.ts`, Security-Teil)

Volle Tabelle mit allen Schreibweisen (≈ 30 Produkte): [references/watchlist.md](references/watchlist.md). Skizze:

```ts
export type Tier = 'A' | 'B' | 'C'
export type Relevance = 'userTool' | 'agentInfra' | 'cloud' | 'library' | 'selfHost' | 'other'
export interface SecurityProduct {
  id: string                // stabil, Teil des clusterKey
  name: string              // Anzeige, security.products, tags
  vendor?: string           // Anbieter-Alias (Skill modelle-und-ranglisten)
  tier: Tier                // Heuristik Teil C
  relevance: Relevance      // persönliche Relevanz
  local?: boolean           // lokal installiert → Update = Handlung (+2)
  ghsa?: string[]           // GHSA-Schreibweise: 'pip:vllm', 'npm:n8n', 'go:github.com/ollama/ollama'
  repos?: string[]          // 'owner/repo' für Repo-Advisories
  nvd?: string              // Regex-Kern für subjectRe()
  nvdCase?: boolean         // true = case-sensitiv (vLLM, Cursor, Dify)
  cna?: string[]            // 'n8n-io:n8n' (vendor:product, trim + lower)
  cpe?: string[]            // nur Info, Recall 21 %
  kev?: string[]            // 'langflow|langflow' (vendorProject|product, trim + lower)
  msrc?: string[]           // exakte SUG-Produktnamen
  bulletin?: string         // Regex für AWS-/GCP-/NVIDIA-Titel
}
export const OSV_ECOSYSTEM = { pip: 'PyPI', npm: 'npm', go: 'Go', nuget: 'NuGet' } as const
export const securityWatchlist: SecurityProduct[] = [
  { id: 'claude-code', name: 'Claude Code', vendor: 'anthropic', tier: 'A', relevance: 'userTool', local: true,
    ghsa: ['npm:@anthropic-ai/claude-code'], repos: ['anthropics/claude-code'],
    nvd: 'Claude Code|Claude (?:Desktop|SDK)', cpe: ['anthropic:claude_code'] },
  { id: 'n8n', name: 'n8n', tier: 'B', relevance: 'selfHost', ghsa: ['npm:n8n'], repos: ['n8n-io/n8n'],
    nvd: 'n8n', cna: ['n8n-io:n8n'], cpe: ['n8n:n8n'], kev: ['n8n|n8n'] },
  { id: 'langflow', name: 'Langflow', tier: 'B', relevance: 'selfHost',
    ghsa: ['pip:langflow', 'pip:langflow-base', 'pip:lfx'], nvd: 'Langflow',
    cpe: ['langflow:langflow'], kev: ['langflow|langflow', 'ibm|langflow'] },
  // … Rest aus references/watchlist.md
]
```

- Kein `enum` (Type-Stripping), daher `as const`. Nur die GHSA-Schreibweise speichern, die OSV-Form über `OSV_ECOSYSTEM` ableiten.
- Nutzer-Tools stehen in `pipeline/config/profile.ts` (Feld `tools[].watchlist`, Skill `bewertung`) als Watchlist-IDs (`claude`, `claude-code`, `codex`, `openai`, `gemini-cli`, `gemini`, `github-copilot`, `cursor`); sie müssen `relevance: 'userTool'` tragen.
- Neues Produkt: beide Tabellen in references füllen, GHSA-Namen per Testaufruf `affects=<name>` prüfen (Treffer in `vulnerabilities[].package`), Regex gegen das NVD-Fixture laufen lassen.

## Ablauf je Lauf

(1) Pakete → (2) NVD → (3) Anreicherung und Hersteller → (4) Vorfall-Feeds → Abgleich → Gruppierung → Heuristik.

- **GitHub-Aufrufe** vom Server mit `Authorization: Bearer $AIPULSE_GITHUB_TOKEN` und `Accept: application/vnd.github+json`, seriell. Der Token ist ein fine-grained PAT **ohne** Repo-Rechte (Steckbrief); das reicht: `/advisories` und `/repos/{owner}/{repo}/security-advisories` stehen in der Endpunktliste für fine-grained PATs, Rechte braucht die Doku nur für private Repos und unveröffentlichte Advisories (GitHub-Doku geprüft 2026-10-24). Nie `GITHUB_TOKEN`, nie den Deploy-Key. Variable leer (lokal) → ohne Header, 60/h. Antwort 401 `Bad credentials` (live geprüft) → Token ungültig/abgelaufen: kein anonymer Wiederholversuch, Pakete über OSV, Repo-Advisories auslassen, Hinweis in `meta.json` (`notices`, `kind: 'token'` – gemeinsamer Hinweis aller GitHub-Quellen, einmal je Lauf, löst das Watchdog-Issue „Token erneuern“ aus; Regel in `job-betrieb`).
- **Kontingent je Lauf:** ≈ 15 REST-Aufrufe (GHSA 1–2, Malware 1, 12 Repos, sonntags ATLAS 1) von 5.000/h; 304 mit gültigem Token zählt nicht.
- **Fenster** beginnen 2 h vor dem Ende des letzten erfolgreichen Abrufs **dieser Quelle** (Dedupe fängt die Überlappung); Erstlauf 24 h. Bewusst abweichend von der allgemeinen Nachholregel (Fenster seit `state/runs.json` `lastSuccessAt`, höchstens 72 h): Fällt NVD in einem sonst erfolgreichen Lauf aus, entstünde dort eine Lücke. Nach längerem Ausfall (Server aus, Internet weg) NVD bis 120 Tage zurück.

### 1 Pakete und Repos (GHSA)

- **Global, reviewed – ein Aufruf:** `https://api.github.com/advisories?affects=<alle GHSA-Namen ohne Präfix>&updated=%3E<ISO>&per_page=100&sort=updated&direction=desc`. Datum mit Uhrzeit (`>2026-10-24T05:07:00Z`) wird akzeptiert und auf die Sekunde beachtet (live geprüft 2026-10-24). `affects` nimmt bis 1000 Namen, kennt aber kein Ökosystem → jede Antwort über `vulnerabilities[].package.{ecosystem,name}` gegen die Watchlist prüfen. Über 100 → `Link: rel="next"`. Gemessen: 42 Namen, 7 Tage → 11 Advisories, 57 KB.
- Felder: `ghsa_id`, `cve_id`, `summary`, `severity`, `cvss_severities.{cvss_v4,cvss_v3}.{score,vector_string}`, `epss.percentile`, `cwes[].cwe_id`, `vulnerabilities[].{package,vulnerable_version_range,first_patched_version}`, `published_at`, `updated_at`, `withdrawn_at`, `html_url`.
- Neu = `ghsa_id` und `cve_id` nicht im State **und** `published_at` höchstens 7 Tage alt (Vorschlag). `updated` holt auch alte Advisories: live am 2026-10-24 Langflow `GHSA-v798-mcc6-2m3m`, veröffentlicht 2026-06-30, aktualisiert 2026-10-23. Ohne Altersgrenze meldet der Erstlauf bzw. jeder Lauf nach dem 120-Tage-Kürzen von `seen` alte Lücken als „neu". Bekannt und Severity gestiegen → bestehende Story aktualisieren. Verwerfen: `withdrawn_at` gesetzt oder `summary` beginnt mit `Duplicate Advisory:`.
- **Malware – zweiter Aufruf:** `https://api.github.com/advisories?type=malware&published=%3E<ISO>&per_page=100`. Behalten nur, wenn ein Paketname exakt in der Watchlist steht (echte Supply-Chain-Kompromittierung) oder `/claude|anthropic|openai|codex|gemini|copilot|cursor|mcp|llm|langchain|agent/i` trifft (Typosquat).
- **Repo-Advisories** (Apps ohne Paket, Review-Verzug), je Repo ein Aufruf mit ETag: `https://api.github.com/repos/<owner>/<repo>/security-advisories?per_page=30&sort=published&direction=desc`. Nicht `per_page=10`: n8n veröffentlicht 14–16 Repo-Advisories auf einmal (2026-09-16, -09-30, -10-14). Ist die ganze Seite neu → `Link: rel="next"` folgen. Repos siehe references (umbenannte Repos antworten mit 301 → kanonischen Namen eintragen). Gleiche `ghsa_id` wie in der globalen DB → darüber deduplizieren; `cve_id` oft `null` (n8n: 30 von 30 ohne CVE, live 2026-10-24). Solche Repo-Advisories stehen oft **nicht** in der globalen DB und nicht in OSV: 6 von 6 geprüften n8n-IDs (veröffentlicht 16.09.–14.10., z. B. `GHSA-mgpr-56r4-5c67`) → 404 unter `https://github.com/advisories/<id>` und `https://api.osv.dev/v1/vulns/<id>` (live 2026-10-24) → als Link immer `html_url` des Repo-Advisories nehmen.
- **OSV nur als Fallback** (GHSA 5xx, 401 oder Kontingent leer): `POST https://api.osv.dev/v1/querybatch` mit `{"queries":[{"package":{"ecosystem":"PyPI","name":"vllm"}}]}` → je Query nur `id` + `modified`. Neue IDs einzeln über `https://api.osv.dev/v1/vulns/<id>` (`aliases`, `summary`, `severity[]` als CVSS-Vektor, `database_specific.severity`, `affected[].ranges`). Bei `next_page_token` nachfassen.

### 2 NVD (Produkte ohne Paket, Gegenprobe)

- Ein Fenster je Lauf: `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=<ISO>&pubEndDate=<ISO>&resultsPerPage=2000&noRejected`. ISO mit Millisekunden (`toISOString()` → `2026-10-24T05:07:00.000Z`), Fenster ≤ 120 Tage. ≈ 150 CVEs je Lauf (535 in 36 h) → ein Request. Mehr Seiten über `startIndex`.
- **Key optional:** `NVD_API_KEY` in `/etc/ai-pulse/env` (kostenlos; der Nutzer beantragt ihn unter `https://nvd.nist.gov/developers/request-an-api-key`, Aktivierung per Mail). Gesetzt → Header `apiKey: <key>` (bei API 2.0 nur als Header), Grenze 50 statt 5 Requests je gleitende 30 s; Pause zwischen Requests mit Key 3 s (NVD empfiehlt trotz Key „einige Sekunden“), ohne Key 6,5 s (NVD-Entwicklerseite geprüft 2026-10-24). Variable leer → Header weglassen, nie leer senden. Lohnt sich vor allem nach Ausfällen (Mehrseiten-Nachholen) und für KEV-Einzelabfragen `?cveId=`.
- Nicht `lastModStartDate`: bringt alte CVEs (50 Treffer „prompt injection" im Oktober, fast alle von 2025). Nicht CPE/`virtualMatchString`: Recall 43 von 202 (21 %), neue CVEs stehen auf `Received`/`Deferred` ohne CPE.
- **Subjekt-Regel** auf `descriptions[lang=en].value` (Startpunkt, mit Fixtures schärfen):

```ts
// pipeline/filter/security-match.ts (geplant)
const subjectRe = (core: string, caseSensitive = false) => new RegExp(
  String.raw`^(?:[Tt]he |[Aa]n? )?(?:${core})\b` +              // Satzanfang; Klassen, weil cs-Kerne ohne Flag 'i' laufen
  String.raw`|\b(?:[Ii]n|of|affecting|within) (?:the )?(?:${core})\b(?![- ](?:compatible|API key))` +
  String.raw`|\b(?:${core})(?: \S+)? (?:before|through|prior to|up to|versions?|v?\d)`, // Versionsangabe
  caseSensitive ? '' : 'i')
```

- **Bestätigung:** NVD liefert für neue CVEs `cve.affected[].affectedData[].{vendor,product}` (CNA-Daten; am 2026-10-24 bei 535 von 535). Treffer zählt, wenn ein `vendor:product` (trim + lower) in `cna[]` steht oder – ohne `cna[]` – Vendor oder Produkt den Regex-Kern enthält. Fehlt `affected`: `https://cveawg.mitre.org/api/cve/<CVE>` → `containers.cna.affected[].{vendor,product}`.
- Heuristik-Felder: `metrics.cvssMetricV40[]` / `cvssMetricV31[]` (`type` Primary vor Secondary; neue CVEs haben nur CNA-Secondary), `metrics.ssvcV203[].ssvcData.options` (Array einzelner Objekte: `{exploitation: 'none'|'poc'|'active'}`, `{automatable}`, `{technicalImpact}`; 76 von 535 haben SSVC), `cveTags`, `weaknesses`.

### 3 Anreicherung und Hersteller

- **CISA KEV:** `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (1,8 MB, ETag + Last-Modified; Spiegel `https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json`). Nur bei neuer `catalogVersion` verarbeiten. Abgleich `${vendorProject.trim().toLowerCase()}|${product.trim().toLowerCase()}` exakt gegen `kev[]`. Join über `cveID` mit allen Treffern. Neuer KEV-Eintrag für ein Watchlist-Produkt ist eine eigene Story, auch bei alter CVE (CVSS dann über NVD `?cveId=<CVE>`): clusterKey `sec:<id>:kev:<CVE>`, nicht in der Tagesgruppe (deren Titel sagt „neue Sicherheitslücken"). Steckt dieselbe CVE schon in einer Story, dort nur `exploited: true` setzen und neu rechnen.
- **EPSS:** `https://api.first.org/data/v1/epss?cve=<bis 100 CVEs, kommagetrennt>` → `data[].{cve,epss,percentile,date}`, Werte als Strings. Nur für CVEs ohne GHSA-`epss`.
- **MSRC Security Update Guide v2** (URL-kodieren): `https://api.msrc.microsoft.com/sug/v2.0/en-US/affectedProduct?$filter=releaseDate gt <ISO> and (contains(product,'Copilot') or contains(product,'AI Foundry') or contains(product,'Azure OpenAI') or contains(product,'Azure Machine Learning') or contains(product,'Semantic Kernel') or contains(product,'Prompt Flow') or contains(product,'SRE Agent'))&$orderby=releaseDate desc&$top=200`. `<ISO>` direkt aus `toISOString()` (Millisekunden gehen, live geprüft). Felder `cveNumber`, `product`, `severity` (`Critical`/`Important`/`Moderate`/`Low`), `impact`, `baseScore` (kann fehlen), `vectorString`, `customerActionRequired`, `initialReleaseDate`, `releaseDate` (mit Offset `-07:00`). Neu nur bei `initialReleaseDate` im Fenster; dieselbe CVE kommt je Produkt einmal (z. B. Edge Copilot iOS und Android) → nach `cveNumber` zusammenfassen. Gemessen: 21 Einträge seit 01.07.2026. Link: `https://msrc.microsoft.com/update-guide/vulnerability/<CVE>`.
- **AWS Security Bulletins:** `https://aws.amazon.com/security/security-bulletins/rss/feed/`, Titel-Filter aus `aws-ai`, CVE steht meist im Titel (nicht immer, z. B. „Issue in the Linux kernel …" am 2026-10-24).
- **Google Cloud Bulletins:** `https://docs.cloud.google.com/feeds/google-cloud-security-bulletins.xml` (die Katalog-URL auf `cloud.google.com` leitet per 301 hierher um). Der Titel ist nur die ID (`GCP-2026-071`) → Filter `Vertex AI|Gemini` auf den `<content>` anwenden. Achtung: Sammel-Bulletins listen Vertex AI als eines von 15+ Produkten (GCP-2026-071, CA-Widerruf) → nur zählen, wenn höchstens 3 Produkte genannt sind oder der Treffer in der Beschreibungszeile steht (Vorschlag, mit Fixture prüfen). Datum aus dem Content (`Published: JJJJ-MM-TT`), Severity aus der Tabellenspalte, Dedupe über `GCP-\d{4}-\d{3}` im Titel.
- **NVIDIA PSIRT:** neuer Commit in `https://github.com/nvidia/product-security/commits/main.atom` → `https://raw.githubusercontent.com/nvidia/product-security/main/<JJJJ>/CVE_index.csv` (655 KB, `;`-getrennt: `CVE;CVSS;Severity;Vector;CWE;Bulletin;Affected Product;Affected Version;Fixed In`), Produktfilter aus `nvidia-ai`. Im Januar Vorjahr und neues Jahr lesen.

### 4 Vorfall- und Research-Feeds

Laufen durch Vorfilter und Clustering wie alle Feeds (`quellen`, `bewertung`), dann in Stufe 1. Nennt ein Artikel eine CVE (`/CVE-\d{4}-\d{4,7}/`) aus einer heutigen Gruppe, wird er Quelle dieser Story statt eigener Eintrag.

| Register-id (Vorschlag) | URL | Filter |
|---|---|---|
| `embracethered` | https://embracethered.com/blog/index.xml | keiner; 233 Items → nur neue GUIDs, Erstlauf < 72 h |
| `thehackernews` | https://feeds.feedburner.com/TheHackersNews | EN-Regex; Webinar-/Sponsored-Titel verwerfen |
| `heise-security` | https://www.heise.de/security/feed.xml | DE-Regex; ein Registereintrag (alte Atom-URL leitet hierher um) |
| `securityweek-ai` | https://www.securityweek.com/category/artificial-intelligence/feed/ | keiner (schon KI) |
| `aiid` | https://incidentdatabase.ai/rss.xml | `/security\|leak\|breach\|injection\|jailbreak/i` |
| `openai-news` (geteilt) | https://openai.com/news/rss.xml | ein Abruf für alle Bereiche; `<category>` = `Security` → `sicherheit` |
| nice: `hiddenlayer-sitemap` **oder** `pillar-sitemap` | https://www.hiddenlayer.com/sitemap.xml (ohne `www` 301) · https://www.pillar.security/sitemap.xml | neue `<loc>` unter `/innovation-hub/`, `/research/` bzw. `/blog/`; Titel per Folgeabruf |
| nice: `projectzero` | https://projectzero.google/feed.xml | 11 MB → nur 07:07 mit ETag und Größenlimit; EN-Regex |

Regexe in `pipeline/config/keywords.ts`, im Register als `filter.include` von `thehackernews` bzw. `heise-security` (ersetzt dort `AI_RE`, siehe `quellen`):
- EN: `/\b(?:AI|LLMs?|GPT|MCP|Cursor)\b/` (case-sensitiv) oder `/\b(?:ChatGPT|Claude|Gemini|Copilot|OpenAI|Anthropic|agentic|AI agents?|prompt injection|jailbreak|Hugging Face|Ollama|LangChain)\b/i`. Kein `model` (trifft „threat model").
- DE: `/\b(?:KI|LLM)\b/` (case-sensitiv) oder `/\b(?:Copilot|ChatGPT|Claude|Gemini|KI-Agent\w*|Prompt-Injection|Prompt)\b/i`.

**Registereintrag `bsi-presse`** – gehört diesem Skill; `gesetze-und-fristen` liest ihn nur (dessen Quellentabelle verweist hierher). Ein Abruf, Routing je Item:

```ts
// pipeline/config/sources.ts (geplant); Regexe in pipeline/config/keywords.ts
{ id: 'bsi-presse', name: 'BSI Presse', kind: 'feed', lang: 'de',
  url: 'https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml',
  categoryHint: ['sicherheit', 'gesetze'], priority: 'nice', cadence: '3x', aiOnly: false,
  filter: { include: BSI_INCLUDE_RE }, paywall: false, fallbacks: [],
  jurisdiction: 'DE', jurisdictionFixed: true,      // Zusatzfelder aus gesetze-und-fristen
  notes: '2026-10-24: 40 Items (bis 2026-02-04), 31 KB, kein ETag/Last-Modified, max-age=60' }

export const BSI_INCLUDE_RE = /\b(?:KI|AI|LLMs?)\b|Künstliche[nr]? Intelligenz|Sprachmodell|Chatbot|Deepfake|Cyber Resilience Act|Kriterienkatalog/
export const BSI_LAW_RE = /Cyber Resilience Act|\bCRA\b|Kriterienkatalog|Prüfkatalog|Leitlinie|Richtlinie|Gesetz|Verordnung|AI Act|KI-VO/
```

- Beide Regexe **case-sensitiv** auf Titel + `description`. Routing im Vorfilter: `BSI_LAW_RE` trifft → Item-`categoryHint: ['gesetze', 'sicherheit']`, Status nach `gesetze-und-fristen` (`leitlinie` bzw. Claude); sonst `['sicherheit']`. Claude darf die Kategorie in Stufe 1 korrigieren.
- Probe 2026-10-24 über alle 40 Items: 8 Treffer (5 Recht: CRA-Durchführungsgesetz, CRA-Meldepflicht, Prüfkatalog KI-Systeme A5, G7-SBOM-Richtlinie für AI, AdCo CRA; 3 Sicherheit: KI-gestützte Angriffe, KI-Betrug, IT-Sicherheitskongress), 0 Fehltreffer. Rund ein Treffer im Monat.
- Kein ETag/Last-Modified → Body-Hash (`quellen`). Erstlauf nur Items im Fenster, sonst kommen Meldungen bis Februar als „neu“.
- Änderungen am Rechts-Teil (`BSI_LAW_RE`, `jurisdiction`, Kategorie-Hinweis) mit `gesetze-und-fristen` abstimmen.

## Gruppierung und Story

- Treffer je `product.id` sammeln; clusterKey `sec:<id>:<JJJJ-MM-TT>` (Datum Europe/Berlin), `id` = sha1-Kürzel wie überall. Ein späterer Lauf am selben Tag ergänzt dieselbe Story (Zähler, `cves`, `advisories`, Score neu). Neue Zusammenfassung nur, wenn das Severity-Maximum steigt oder `exploited` umspringt.
- Den `clusterKey` aus Stufe 1 für Advisory-Gruppen verwerfen, der `sec:`-Schlüssel bleibt (die Prüfregex in `bewertung` gilt nur für Claude-Schlüssel). Sonst erzeugt jeder Lauf eine neue `id` und Gelesen/Merken/Feedback gehen verloren.
- Titel deterministisch, gilt auch ohne Claude: `<Name>: <n> neue Sicherheitslücken[, <k> kritisch][ – aktiv ausgenutzt]`; bei einem Eintrag `<Name>: <summary gekürzt>`. Stufe 1 darf einen besseren deutschen Titel setzen, die Zahlen bleiben.
- Story-Felder: `category: 'sicherheit'`; `url` = Link des schwersten Eintrags (GHSA `html_url` → MSRC/AWS/GCP-Bulletin → `https://nvd.nist.gov/vuln/detail/<CVE>`); `originalTitle` = dessen Summary; `sources[]` = beteiligte Register-Quellen; `tags` = Produktname + Anbieter-Alias; `hype: false`; `paywall: false`; `publishedAt` = frühestes Datum; `security`:
  - `severity`: Maximum (CVSS ≥ 9,0 critical, ≥ 7,0 high, ≥ 4,0 medium, sonst low; ohne CVSS GHSA-/MSRC-/NVIDIA-Severity, dabei MSRC `Important` → high, `Moderate` → medium, NVIDIA `CRITICAL` usw. kleinschreiben). Vorfälle ohne CVE aus dem Heuristik-Score (Vorschlag): ≥ 80 critical, ≥ 60 high, ≥ 35 medium, sonst low.
  - `cves`: nur CVE-IDs (`CVE-\d{4}-\d{4,7}`).
  - `advisories`: GHSA-IDs der Einträge **ohne** CVE (meist Repo-Advisories und Malware); ein Eintrag mit CVE steht nur in `cves`. Feld weglassen, wenn leer. So steht jede ID für genau eine Lücke, und `cves.length + advisories.length` ist die Zahl im Titel (solange unter der Grenze).
  - Grenze: `cves` und `advisories` zusammen höchstens 20 (Größe von `latest.json`), schwerste zuerst; der Titel zählt trotzdem alle.
  - `exploited`: KEV-Treffer oder SSVC `exploitation: 'active'` (bei Vorfällen: Triage `incidentKind: 'exploited'`).
  - `products`: Watchlist-Namen.
- Für das Dashboard: CVE-IDs lassen sich auf `https://nvd.nist.gov/vuln/detail/<CVE>` verlinken, GHSA-IDs **nicht** pauschal (Repo-Advisories außerhalb der globalen DB → 404 unter `github.com/advisories/`, siehe Abschnitt 1) → als Text zeigen, der Link steckt in `url`.

### Übergabe an das Dashboard („Weitere Advisories“)

Das Dashboard (`dashboard-entwickeln`) klappt in `#/kategorie/sicherheit` alle Stories mit `category === 'sicherheit' && ratedBy === 'regel' && !summary` unter „Weitere Advisories“ ein. Dieser Skill sorgt dafür, dass das Kriterium genau die gewollten Stories trifft:

- **Hinein:** Advisory-Gruppen (`sec:`-Schlüssel), die nicht an Stufe 1 gingen (`securityScore` < 40 ohne Tier-A-Bezug, oder Überlauf über 12 je Lauf). Sie sind ohne Claude vollständig: deterministischer Titel, `originalTitle`, `url`, `impact`/`personal` aus Heuristik und Regel, `security` vollständig, `summary`/`whyImportant`/`forYou` fehlen, `ratedBy: 'regel'`.
- **Ebenfalls hinein (Folge des Kriteriums):** Feed-Meldungen mit `category: 'sicherheit'`, die `bewertung` ohne Claude bewertet (nicht unter den Top 80), z. B. THN-, heise- oder `bsi-presse`-Items. Soll die Liste nur Advisory-Gruppen zeigen, prüft das Dashboard zusätzlich `clusterKey.startsWith('sec:')`.
- **Nicht hinein:** Gruppen, die an Stufe 1 gingen – `ratedBy` ist dann die Modell-ID, auch wenn Stufe 2 keine `summary` schreibt → Hauptliste. Nie eine Platzhalter-`summary` setzen, sonst rutscht eine Regel-Story aus der Liste.
- **Wechsel:** Überschreitet eine Gruppe im späteren Lauf desselben Tages die Schwelle, geht sie an Stufe 1, `ratedBy` wechselt, die Story verlässt die Liste (gleiche `id`, Gelesen/Merken bleiben).
- **Folge ohne Claude:** Bei `budget.level: 'aus'` oder Ausfall beider Backends tragen alle Security-Stories `ratedBy: 'regel'` und landen dort, auch kritische; die Bewertung wird im nächsten Lauf nachgeholt (Steckbrief).

## Severity-Heuristik → `impact`

Deterministisch in `pipeline/score/security.ts`, vor Claude, je Eintrag; Gruppe = Maximum. `impact = clamp(round(score / 10), 1, 10)`.

Schnittstelle zu `bewertung`: je Story `securityScore` (0–100) und `securityPersonal` (1–10, Abschnitt unten); `preScore` nutzt `securityScore / 25`. Für Advisory-Gruppen (`sec:`-Schlüssel) gilt **Ersetzen** (Claude darf einen DoS nicht hochstufen), für Feed-Vorfälle nur Untergrenze (`max`) – so steht es auch in `bewertung` („Security nach Claude“).

| Teil | Regel | Punkte |
|---|---|---|
| A Basis | CVSS v4 vor v3.1 (`score: 0` heißt fehlt), sonst GHSA-/MSRC-Severity: critical (≥ 9,0) / high (7,0–8,9, MSRC `Important`) / medium (4,0–6,9, MSRC `Moderate`) / low oder unbekannt | 40 / 28 / 15 / 6 |
| B Ausnutzung | **Maximum** von: KEV 35 · SSVC `active` 30 · EPSS-Perzentil ≥ 0,95 15 · ≥ 0,80 8 · SSVC `poc` oder öffentlicher PoC-Link 10 | 0–35 |
| C Verbreitung | Tier A 20 · Tier B 12 (auch: log10 der Wochen-Downloads ≥ 7) · sonst 4 | 4–20 |
| D Angriffsprofil | `AV:N/PR:N/UI:N` +5 · RCE, Sandbox-Escape oder Datenexfiltration aus Agent/Coding-Tool +5 · nur DoS (CWE-400/770/835) −10 · `AV:L` −5 · `cveTags` `unsupported-when-assigned` −10 | −25 … +10 |
| E Untergrenzen | bestätigter Datenabfluss/Kompromittierung bei großem KI-Anbieter ≥ 80 · Supply-Chain-Kompromittierung eines Tier-A/B-Pakets ≥ 75 · aktiv ausgenutzt in Tier A ≥ 85 · Obergrenze 100 | |

- Rechenproben (als Test): Langflow-RCE mit KEV 40 + 35 + 12 + 5 + 5 = 97 → impact 10; vLLM-DoS (medium) 15 + 12 − 10 = 17 → impact 2. B ist ein Maximum, keine Summe – sonst stimmt die Probe nicht (Langflow hat EPSS 0,9999).
- RCE/Exfiltration: CWE-77/78/94/95/502 oder `/remote code execution|\bRCE\b|sandbox (?:escape|bypass)|exfiltrat/i` in Summary/Beschreibung.
- Malware-Advisories sind immer `critical` → nicht über A werten. Typosquat: A = 6, C nach dem imitierten Produkt, gesammelt als eine Story je Lauf. Exakter Watchlist-Paketname: Untergrenze 75.
- Feed-Vorfälle: `impact` aus Stufe 1, danach E als Untergrenze auf der 1–10-Skala anwenden (80 → `impact` ≥ 8). Dafür liefert die Triage für `sicherheit` zusätzlich `incidentKind: 'breach' | 'supply-chain' | 'exploited' | 'research' | 'none'` (Feld im Schema `TriageOut` von `bewertung`).
- Download-Tier sonntags cachen: `https://pypistats.org/api/packages/<pkg>/recent` (`data.last_week`), `https://api.npmjs.org/downloads/point/last-week/<pkg>` (`downloads`).

## Persönliche Relevanz → `personal`

- Nutzer-Tool betroffen (`relevance: 'userTool'`) → **8**; **+2**, wenn Handlung nötig: lokales Tool mit `first_patched_version` (Update), MSRC `customerActionRequired: true`, Vorfall mit Nutzeraktion (Token widerrufen, Passwort ändern).
- `agentInfra` (MCP-SDKs und -Server, die Coding-Agents nutzen) → **6**.
- `selfHost` (vLLM, Ray, Ollama, n8n …) → **3**; bei `impact ≥ 9` → 5 (Auslegung von „außer bei Tier-A-Impact", offen).
- `cloud`, `library` → 4 und `other` → 3: Vorschlag ohne Beleg, mit dem Nutzer abstimmen.
- Feedback (Phase 6) verschiebt die Werte über das Präferenzprofil → `bewertung`, `feedback-worker`.

## Claude und Kontingent

Claude läuft über `claude -p` mit dem Abo; das Kontingent teilt sich der Job mit der eigenen Arbeit des Nutzers (Steckbrief). Security bringt deshalb keine eigenen Aufrufe mit, sondern hängt sich an die Pakete der Stufe 1.

- An Stufe 1 (`claude-haiku-5-5`, im Notfall-Backend dasselbe Modell) nur Advisory-Gruppen mit `securityScore` ≥ 40 (0–100, nicht der `preScore` 0–10 aus `bewertung`) oder Tier-A-Bezug, **höchstens 12 Security-Items je Lauf** (zählen gegen ≤ 80), critical/high zuerst. Der Rest geht ohne Claude in „Weitere Advisories“ (Abschnitt „Übergabe“).
- Feed-Vorfälle kommen über die normale Auswahl von `bewertung` (Top 80 nach `preScore`); ihr Score entsteht erst nach Stufe 1 (Teil E).
- Eingabe je Gruppe kompakt: Produkt, Anzahl, Severity-Maximum, CVSS, KEV, EPSS-Perzentil, gepatchte Version, Handlung, höchstens 3 Summaries à ≤ 300 Zeichen. Keine Volltexte.
- Bei Advisory-Gruppen ersetzt der Code `impact`/`personal` der Triage durch Heuristik und Regel. `forYou` nennt die Handlung („Claude Code auf ≥ x.y aktualisieren"). Prompts → `bewertung`.

## Takt

| Quelle | Wann |
|---|---|
| GHSA global + Malware, Repo-Advisories, NVD-Fenster, MSRC SUG, AWS, GCP, Vorfall-Feeds, `bsi-presse` | jeder Lauf (07:07, 13:07, 19:07 Europe/Berlin; Register-Takt `3x`) |
| KEV | 07:07 voll; 13:07/19:07 nur Conditional GET, Verarbeitung bei neuer `catalogVersion` |
| EPSS | jeder Lauf für neue CVEs ohne GHSA-`epss`; 07:07 Auffrischung offener CVEs der letzten 7 Tage |
| NVIDIA-CSV, Project Zero, Vendor-Sitemap | 07:07, nur bei neuem Commit bzw. geändertem ETag |
| MITRE ATLAS, Download-Zahlen | sonntags 07:07 |
| OSV, cvelistV5, cveawg | nur Fallback bzw. Einzelabfrage |

ATLAS: `https://api.github.com/repos/mitre-atlas/atlas-data/commits?per_page=1` → bei neuem SHA `https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml` (452 KB) auf neue `AML.CS\d{4}` diffen; Technik-IDs (z. B. `AML.T0051` Prompt Injection) nur als Tags.

## Fallback-Kette

- **NVD blockiert** (403, `cf-mitigated`, 3 Fehler → degraded laut `quellen`): Paketprodukte laufen weiter über GHSA (CVSS v3/v4, EPSS, CWE). Produkte ohne Paket über **cvelistV5-Stundenreleases**: für jede volle Stunde seit dem letzten Lauf `https://github.com/CVEProject/cvelistV5/releases/download/cve_<JJJJ-MM-TT>_<HH>00Z/<JJJJ-MM-TT>_delta_CVEs_at_<HH>00Z.zip` (≈ 220 KB, kein REST-Kontingent, 404 = Stunde fehlt), CVE-JSON-5-Records mit derselben Subjekt-Regel und `containers.cna.affected`. Einzel-IDs (KEV-Join) über cveawg.
- **GHSA gestört** → OSV querybatch (siehe oben).
- **Beide gestört** → nur KEV, MSRC, AWS, GCP, Feeds; `meta.json` zeigt die Quellen als gestört.
- Das Zip braucht eine Entpack-Bibliothek, die der Stack noch nicht enthält (vor dem Einbau klären).

## Zustand

`state/security.json` (Eigentümer dieser Skill, steht in der State-Tabelle des Steckbriefs), kompakt, committet und damit öffentlich – nichts Geheimes; ETags weiter in `state/http-cache.json` (`quellen`):

```json
{ "nvd": { "pubEnd": "2026-10-24T05:07:00.000Z" }, "ghsa": { "updated": "…", "malware": "…" },
  "kev": { "catalogVersion": "2026.10.23", "aiCves": ["CVE-2025-3248"] }, "msrc": { "since": "…" },
  "seen": { "GHSA-v798-mcc6-2m3m": { "p": "langflow", "s": "critical", "d": "2026-10-23" } },
  "groups": { "sec:n8n:2026-10-24": ["CVE-…"] }, "downloads": { "pip:vllm": 7.1 } }
```

- Fenster-Zeitpunkte nur nach erfolgreichem Abruf fortschreiben, sonst entsteht eine Lücke. `seen` nach 120 Tagen kürzen, `groups` nach 3 Tagen.

## Tests

- Fixtures unter `pipeline/test/fixtures/security/`: GHSA-Antwort mit `Duplicate Advisory:` und `cvss_v4.score: 0`, n8n-Repo-Advisories ohne CVE, GitHub-401 `Bad credentials`, NVD-Fenster mit Linux-Kernel-CVE (Fehltreffer `cursor`), NVD-404 mit Header `message: Invalid apiKey.`, KEV-Auszug mit `Array Networks `, DrayTek und `IBM|Langflow`, MSRC-JSON mit Revision, GCP-Atom, OSV-Fehlerantwort, BSI-Feed (40 Items vom 2026-10-24).
- Tests: Rechenproben 97/17, Subjekt-Regel (Treffer und Fehltreffer), Gruppentitel, `cves`/`advisories`-Aufteilung samt Grenze 20, Übergabe-Kriterium (Regel-Gruppe drin, an Stufe 1 gegebene Gruppe draußen), BSI-Routing (8 Treffer, 5 → `gesetze`), Fenster-Fortschreibung.
- Einzeln prüfen: `npm run collect -- --dry-run --only ghsa-global` (ebenso `nvd-cves`, `cisa-kev`, `msrc-sug`, `bsi-presse`); Ausgabe kürzen (`sparsam-testen`). Lokal unter Windows ohne `AIPULSE_GITHUB_TOKEN` gilt 60/h je IP → GitHub-Quellen nur einzeln testen; der volle Lauf gehört auf den Server.

## Fallen

- **KEV ohne Regex:** `ray` trifft DrayTek und Array Networks. 19 Einträge haben Leerzeichen am Ende (`'Array Networks '`) → trim + lower, exakt. Langflow steht unter Vendor `Langflow` **und** `IBM`.
- **KEV-Zahl im Katalog zu niedrig:** dort „3 KI-Einträge", tatsächlich 12 seit 2025 (Langflow 6, davon 1 unter `IBM`; LiteLLM 3, MLflow, Ray, n8n; nachgezählt 2026-10-24, catalogVersion 2026.10.23). In den letzten 30 Tagen keiner (letzter 2026-09-02).
- **GHSA liefert per Default nur `reviewed`.** `type=unreviewed` hat **keine Paketdaten** (0 von 30 geprüft) → `affects` findet sie nie. Malware nur über `type=malware`, dort immer `critical` (30 von 30).
- **Review-Verzug:** n8n hatte im September 17 reviewed Advisories, im Oktober 0 – aber am 2026-10-14 binnen einer Minute 15 Repo-Advisories ohne CVE (ebenso 14 am 30.09., 16 am 16.09.; daher `per_page=30`). Deshalb Repo-Advisories für n8n und Open WebUI (erklärt den Katalog-Widerspruch „n8n 44" vs. „ohne reviewed Treffer").
- **GHSA-Felder:** fehlendes `cvss_v4` ist `{vector_string: null, score: 0}`; `epss` fehlt bei rund der Hälfte; `Duplicate Advisory:`-Einträge ohne CVE (2 von 11 in einer Woche, vLLM).
- **Ökosystem-Namen:** GHSA `pip/npm/go/nuget`, OSV `PyPI/npm/Go/NuGet`. Ein falscher Name lässt den **ganzen** querybatch scheitern: `{"code":3,"message":"error in query at index 1: … invalid ecosystem"}`.
- **GitHub-Kontingent:** ohne Token 60/h je IP (in der Recherche nach ~20 Aufrufen bei 3; am 2026-10-24 nach wenigen Prüfaufrufen bei 10 von 60). Mit `AIPULSE_GITHUB_TOKEN` 5.000/h – das ist das **persönliche** Kontingent des Nutzerkontos, geteilt mit allen anderen GitHub-Quellen des Laufs (Releases, OTA-Commits, Org-Abfragen) und mit allem, was der Nutzer selbst per API mit demselben Konto tut. 304 mit gültigem Token zählt nicht. Sekundärgrenzen: höchstens 100 gleichzeitige Requests, 900 Punkte je Minute und Endpunkt → seriell abrufen; bei 403/429 `retry-after` beachten (GitHub-Doku geprüft 2026-10-24).
- **GitHub-API-Version:** ohne Header `X-GitHub-Api-Version` antwortet GitHub mit `2022-11-28` (unterstützt bis 10.03.2028); die Doku zeigt inzwischen `2026-03-10`. Die Live-Prüfungen hier liefen ohne Header. Neue Version erst setzen, wenn die Fixtures damit verglichen sind, und einheitlich für alle GitHub-Quellen (`quellen`).
- **NVD-Fehler:** Parameterfehler = HTTP 404 mit leerem Body, Grund nur im Header `message` (`Date range cannot exceed 120 days.`) → Header loggen. 403 = Drosselung. **Ungültiger oder leerer Key** ebenfalls 404 mit leerem Body, Header `message: Invalid apiKey.` (live geprüft 2026-10-24) – kein stiller Rückfall auf anonym: einmal ohne Key wiederholen, Hinweis in `meta.json` (`notices`, `kind: 'quelle'`, `sourceId: 'nvd-cves'`). Cloudflare davor (`__cf_bm`). `published`/`timestamp` ohne Zone (`2026-10-24T11:31:32.010`) → als UTC lesen.
- **Regex-Fehltreffer:** `cursor` traf Linux-Kernel-CVEs; `claude code`, `anthropic`, `openai` trafen OpenClaw, Decepticon und Flowise, die die Anbieter nur erwähnen → Subjekt-Regel plus CNA-Bestätigung.
- **CNA `n/a:n/a`:** MITRE als CNA trägt kein Produkt ein (am 2026-10-23 drei npm-MCP-Server, z. B. `@rog0x/mcp-git-tools`); cveawg liefert dort dasselbe. Wie fehlendes `affected` behandeln – es entscheidet nur die Subjekt-Regel. Ob das für Tier C reicht, beim Bau mit dem Fixture festlegen.
- **Advisory-Schübe:** n8n 44 seit 01.09., vLLM 4 in drei Tagen, MCP-Server 49 CVEs in 30 Tagen, CERT-Bund 108 Roh-Advisories am Tag → ohne Gruppierung sind die 80 Plätze der Stufe 1 und das Abo-Kontingent weg und die Kategorie geflutet.
- **MSRC-Revisionen:** der RSS postet jede Revision neu (auch reine CVSS-Korrekturen); SUG v2 führt `initialReleaseDate` getrennt von `releaseDate` → neu nur über `initialReleaseDate` werten (eine Revision war dort am 2026-10-24 noch nicht zu beobachten). RSS (2,8 MB, ~5000 Items) und CVRF (28,6 MB je Monat) nicht im 3×-Takt.
- **MSRC-Severity ≠ CVSS:** 18 von 21 KI-Einträgen sind `Critical`, darunter `baseScore` 6,1 und 7,7. Nach der Regel oben zählt CVSS (→ medium bzw. high); MSRC-`severity` nur ohne `baseScore`.
- **GCP-Feed:** alle `<updated>` tragen denselben Regenerierungs-Zeitstempel. Alte URLs `gcp-security-bulletins.xml` und `support-bulletins.xml` → 404.
- **Riesige Feeds:** Project Zero 11,3 MB, GTIG 1,45 MB, Snyk 1,3 MB, Trail of Bits 1 MB, OpenAI-RSS 800 KB → ETag/If-Modified-Since plus Größenlimit, große nur 07:07.
- **Veraltete Feeds mit 200:** alter Google-Security-Blogger-Feed `security.googleblog.com/feeds/posts/default` (neuester Post 2026-04-23) → stattdessen `https://blog.google/security/rss/`. Unit-42-Tag-Feeds `/tag/genai/` und `/tag/prompt-injection/` seit April still, PromptArmor-Substack seit 2025-10-16, Promptfoo seit 2026-03-12. Simon Willisons Tag-Feed `prompt-injection` ist redundant zum Hauptfeed (läuft über `quellen`).
- **Trust-Center nur JS:** trust.anthropic.com (7,5-KB-Shell), trust.openai.com und openai.com/security-and-privacy (Challenge-Skript) – nicht scrapen. Anbieter-Vorfälle kommen über THN, heise und die OpenAI-Kategorie `Security`, Claude-Code-Lücken über GHSA.
- **AIID:** `<link>` zeigt auf den Medienartikel, das AIID-Zitat steckt in `description`; „AI Harms" sind meist keine Security.
- **EPSS** von FIRST kommt als String (`"0.979010000"`) → `Number()`.
- **BSI-Feed mit `/i`:** der Filter `KI|Künstliche Intelligenz|AI|…` ohne Wortgrenze und case-insensitiv traf am 2026-10-24 4 von 40 Items falsch („Kinder-Smartwatches“, „Weltkindertag“, „Kick-off“, „Konzeptskizze“) → `BSI_INCLUDE_RE` case-sensitiv mit `\b`.
- **GHSA-ID ≠ Link:** Repo-Advisories, die nicht in die globale DB übernommen wurden (n8n: 6 von 6 geprüft), haben keine Seite unter `github.com/advisories/` und keinen OSV-Eintrag (404) → nie Links aus der ID bauen, `html_url` speichern.
- **cvelistV5:** `releases.atom` hat nur 10 Einträge (≈ 10 h), die Nacht 19:07 → 07:07 dauert 12 h → Asset-URLs je Stunde selbst bilden. `deltaLog.json` (32,7 MB) nie laden.

## Nicht nutzen

- CERT-Bund WID (108 Roh-Advisories am Tag, ~1 mit KI-Bezug) – höchstens als deutscher Zweitlink zu einer bekannten CVE. huntr Hacktivity (clientseitig, Funde kommen ohnehin als CVE), 0DIN (seit 2026-08-18 still, `/disclosures.rss` → 406), Invariant Labs (kein Feed), MSRC-Blog-Feed (weg), BSI `RSSNewsfeed_WID.xml` (404), Protect-AI-RSS (404).
- Ergänzend, nur mit Keyword-Filter und wenn in Stufe 1 Plätze frei bleiben: GitHub Blog Security, Google Security Blog, Trail of Bits, Wiz, Unit 42 (Hauptfeed), Microsoft Security Blog (Topic AI), GTIG, JFrog, Socket, Adversa, OWASP GenAI, BleepingComputer **oder** Dark Reading (nicht beide), red.anthropic.com (Diff neuer `/research/`-Slugs), AIAAIC (`gid=888071280`). URLs im Katalog `sicherheit.md`. (BSI-Presse ist kein Ergänzungskandidat mehr, sondern der Eintrag `bsi-presse` in Abschnitt 4.)

## Offene Punkte

- **Erledigt (Standard 2026-10-24):** Produkt `claude` (claude.ai + Anthropic-API) steht als Nutzer-Tool in der Watchlist (`references/watchlist.md`); NVD-Regex beim Bau nur mit Produkt als Subjekt, nie das nackte Wort „Anthropic“.

## Nach dem Bauen

- Diesen Skill aktualisieren: echte Dateinamen, gemessene Trefferquoten je Produkt, geschärfte Regexe, neue Fallen; `references/watchlist.md` und `watchlist.ts` synchron halten (geloggte unbekannte MSRC-Namen nachtragen).
- Quellen-IDs ins Register und in den Katalog-Abschnitt von `quellen` eintragen; Ergebnis des ersten `npm run smoke` auf dem Server für NVD, SecurityWeek, openai.com und `bsi-presse` hier festhalten (gemessener GitHub-Verbrauch je Lauf aus `x-ratelimit-used`).
- Im Steckbrief den Phasenstand ergänzen.
