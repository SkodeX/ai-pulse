# Entscheidungen, Standardwerte und offene Punkte

Ausgelagert aus dem Steckbrief, damit dieser klein bleibt. Hier nachsehen, wenn eine Detailfrage auftaucht, bevor du den Nutzer fragst.

## Mit dem Nutzer geklärt (2026-10-24, 5 Fragerunden)

| Frage | Antwort |
|---|---|
| Wo laufen die Jobs? | erst GitHub Actions + API gewählt, dann **umgestellt auf Heimserver + Claude Code mit Abo** (weniger API-Kosten) |
| Server | Rechner zuhause (Linux, private IP) |
| Abo | Max 5× |
| Abo-Limit erreicht | Notfall über API-Key (Haiku 5.5), Deckel 3 €/Monat |
| Modelle | Haiku 5.5 für die Masse, Opus 5.5 für alle Briefings, Wochenrückblick, AGB-Erklärungen |
| Dashboard | öffentlich auf GitHub Pages, PWA |
| Sprache | Deutsch, Originaltitel + Link bleiben |
| Wichtigkeit | zwei Scores getrennt: Tragweite + persönliche Relevanz |
| Zusatzkategorien | Preise & API, Open Source & Tools, Forschung & Benchmarks, Funding & Übernahmen |
| Recht | EU + DE + USA |
| Vertragsänderungen | Seiten aktiv überwachen |
| Takt | 3× täglich |
| Benachrichtigung | nur Dashboard (Push später) |
| Briefing | Tages- + Wochenbriefing im Dashboard |
| Funktionen | Gelesen/Merken, Suche & Filter, Archiv & Trends, Feedback 👍/👎 |
| Tools des Nutzers | Claude/Claude Code, ChatGPT/Codex, Gemini, Copilot/Cursor; beobachtet werden die größten **und** bestbewerteten Anbieter |
| Rolle | beruflich (Produkt/Strategie) und als Entwickler |
| Name | AI Pulse |
| Alter Tracker | neu bauen, Quellenliste und Bewertungsprompt übernehmen |

## Gesetzte Standardwerte (vom Assistenten, Nutzer kann sie jederzeit ändern)

| Thema | Standard |
|---|---|
| Wochenrückblick | ersetzt sonntags das 19-Uhr-Update – **ab Phase 5**; bis dahin ist Sonntag 19:07 ein normaler `evening`-Lauf |
| HF Daily Papers | ab **30** Upvotes (≈ 5–10/Tag) – schont das Kontingent |
| HN | `points > 100` |
| LawStatus | inkl. `gescheitert`, `leitlinie`, `aufsicht` für Vorgänge ohne Gesetzgebungsverfahren |
| Modell- und API-Funktions-Abschaltungen | in `fristen.json` (`kind: 'modell'`, `dateKind: 'abschaltung'`) |
| AGB-Watchlist | nur EU-Fassungen, die in DE gelten; dazu die Claude-Code-Bedingungen `code.claude.com/docs/en/legal-and-compliance.md`; neue Dokumente in Hub-Listen → Hinweis in `meta.json`, Aufnahme von Hand |
| Security-Watchlist | eigenes Produkt `claude` (claude.ai + Anthropic-API) als Nutzer-Tool |
| Notfall-Erklärungen | AGB-Kurzerklärungen von Haiku werden nicht nachträglich mit Opus neu geschrieben |
| Blockierte Seiten | `xai-sitemap`, `chatgpt-release-notes`: im Register mit `startStatus: 'blockiert'`, einmal täglich (07:07) geprobt, Abdeckung über Fallbacks; zählen im Smoke-Nenner |
| Feedback 👎 | Story bleibt sichtbar, lokal abgeblendet; wirkt nur über das Profil auf `personal` |
| Feedback-Token | je Gerät einmal von Hand in den Einstellungen |
| Gemerkte Stories | höchstens 300 je Gerät, beim 301. ein Hinweis |
| User-Agent | `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`; Kurzform per Smoke-Test vergleichen |
| Tests | `node --test`, kein Vitest |
| Ein Request je Host und Lauf | Reihenfolge nach Register-Priorität; auf `openai.com` hat `openai-news` Vorrang – direkte AGB-Abrufe dort entfallen (Node-fetch 403), AGB kommen über Open Terms Archive |
| HF Daily Papers nachholen | nach Ausfällen jeden verpassten Tag einzeln abfragen, höchstens 3 Tage zurück |
| Trockenlauf ab Phase 2 | schreibt nur die 4 festgelegten Dateien, keine Story-/Briefing-Vorschau |
| Notfall-Live-Test | der eine echte Haiku-Aufruf (`AIPULSE_API_LIVE_TEST=1`) läuft am PC; `AIPULSE_FALLBACK_API_KEY` nur für diesen Aufruf in der Shell setzen, nie dauerhaft |
| Rollen im Register | `role` je Quelle ist ein Ermessenswert (z. B. HF Daily Papers, YC, Product Hunt = `aggregator`), vom Nutzer prüfbar in `quellen/references/kernquellen.md` |
| Fixtures | im öffentlichen Repo nur gekürzt: Struktur, Titel, Links bleiben; Beschreibungen/Inhalte durch Platzhalter ersetzt (Urheberrecht) |

## Offene Punkte (Entscheidung des Nutzers)

- ~~Vor Phase 1 Schritt 1~~ **geklärt 2026-10-25:** Repo `SkodeX/ai-pulse` öffentlich angelegt und gepusht, Lizenz **MIT**, `.claude/` und `docs/recherche/` werden **mit veröffentlicht**. Git-Identität `SkodeX <25643926+SkodeX@users.noreply.github.com>`.
- ~~Phase 2: Profil~~ **geklärt 2026-10-25** (2 Fragerunden) → Grundlage für `pipeline/config/profile.ts`:
  - **Hoch** (`personal`): Agenten & Coding-Tools (Claude Code, Codex, Cursor, Copilot, MCP), neue Modelle & Benchmarks, Produkt & Strategie (Markt, Geschäftsmodelle, Funding), Recht & Regulierung (AI Act, DSGVO, AGB).
  - **Niedrig:** Gadgets/Consumer-Hardware, Krypto/Web3, Bild-/Video-/Musik-KI, Hype & Promi-Zitate.
  - **Hype & Zitate als eigener Bereich:** Meldungen mit `hype: true` erscheinen nicht in den Top-Stories, sondern in einem eigenen Chip „Hype & Zitate“ (Anzeige-Bereich über `Story.hype`, keine 12. Kategorie) → `dashboard-entwickeln`, `bewertung`.
  - **Selbst gehostet:** Ollama/lokale Modelle, n8n, Open WebUI, ComfyUI, dazu Meldungen über weitere erfolgreiche und schnell wachsende Self-hosted-/Open-Source-Tools.
  - **Beruf:** Produktmanagement, Softwareentwicklung, Beratung/Strategie, KI-Einführung im Konzern/Mittelstand (Compliance).
  - **Startups hoch:** Dev-Tool-Startups, EU/DE-Startups (Mistral, Aleph Alpha, Black Forest Labs, DeepL …), China-Labs (DeepSeek, Qwen, Kimi, GLM, MiniMax).
  - **Sicherheit:** Lücken in den eigenen Tools, Prompt Injection & Agenten/MCP, Datenschutz-Vorfälle; allgemeine Lücken nur, wenn kritisch oder aktiv ausgenutzt.
  - **Zusammenfassungen:** gemischt – kurz das Wichtigste, bei Dev-Themen mit technischen Details.
- **Neue Ansicht „Modelle & Tools" (Wunsch 2026-10-25, Phase 4/5)** – laufende Anbieter-/Modell-Bewertungsseite statt nur Anbieter-Radar:
  - **Fest beobachtet:** alle vier Gruppen – Große 10 (OpenAI, Anthropic, Google, Meta, Microsoft, Amazon, xAI, Mistral, DeepSeek, Alibaba/Qwen), China-Labs (Moonshot/Kimi, Z.ai/GLM, MiniMax, ByteDance Seed, Xiaomi MiMo, StepFun, Tencent), EU/DE (Mistral, Aleph Alpha, Black Forest Labs, DeepL), Spezialisten (NVIDIA, Cohere, Perplexity, Thinking Machines, Reflection, Poolside, IBM Granite, Ai2) – plus automatisch Top 12 + Aufsteiger (`modelle-und-ranglisten`). Alias-Tabelle um DeepL ergänzen.
  - **Bestenliste je Einsatzzweck** („welches Modell ist gerade das beste"): Coding & Agenten, Text & Chat, Web-/App-Entwicklung, Bild-Verstehen, Preis-Leistung/Kosten, **Film/Video**, **Design/Bild**, **Game-Dev**, **Automatisierung** – offen für weitere. Quellen: Arena-Bretter (`text` overall/coding, `webdev`, `agent`, `vision`, zusätzlich Medien-Configs `text_to_image`, `image_edit`, `text_to_video` nur für diese Liste, nicht für die Watchlist), AA-Index und Preise (OpenRouter); Zwecke ohne eigenes Brett (Game-Dev, Automatisierung) über das Claude-Urteil.
  - **Tool-Vergleiche:** Coding-Assistenten (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Cline, Qwen Code, Windsurf), Chat-Apps (ChatGPT, Claude, Gemini, Le Chat, Perplexity, Copilot, Grok), lokale Modelle (Ollama-tauglich), Automatisierung & UIs (n8n, Open WebUI, ComfyUI + Aufsteiger).
  - **Modellerweiterungen** (neue Versionen, Kontext, Features, Preise, Abschaltungen) erscheinen als Verlauf je Anbieter.
  - **Aktualisierung 3× pro Woche** (Mo, Mi, Fr im 07:07-Lauf; Wunsch 2026-10-25): Ranglisten, Preise und je ein Opus-Aufruf mit 2–3 Sätzen „Empfehlung für dich" je Einsatzzweck/Tool-Gruppe (Profil oben) → 3 Opus-Aufrufe pro Woche. Bisheriger Wochentakt der Watchlist (`modelle-und-ranglisten`) auf diesen Takt anpassen.
- **Phase 3:** Server-Hardware (Mini-PC, Pi 5 oder NAS – NAS ohne systemd → Docker-Variante in `job-betrieb`); Backup-Ziel für `~aipulse/.local/share/ai-pulse/` (AGB-Snapshots, nicht wiederbeschaffbar); automatischer Neustart nach Sicherheitsupdates ja/nein; **Impressum/Datenschutzerklärung** vor dem Livegang.
- **Phase 6:** KV-Jurisdiktion (`--jurisdiction eu` oder keine) – einmalig vor `kv namespace create`.
- Optionale kostenlose Keys (später): `DIP_API_KEY` (Mail an parlamentsdokumentation@bundestag.de), `NVD_API_KEY`, `ARTIFICIAL_ANALYSIS_API_KEY`, `API_DATA_GOV_KEY`, `COURTLISTENER_TOKEN`, `OPENSTATES_API_KEY`.

## Abo-Betrieb: Pflichten und Grauzone

- **Abo-Token:** `claude setup-token` auf einem Rechner mit Browser (1 Jahr gültig ab Erstellung) → `CLAUDE_CODE_OAUTH_TOKEN` in `/etc/ai-pulse/env`, Datum als `AIPULSE_TOKEN_CREATED`; `meta.json` warnt 30 Tage vor Ablauf.
- **Zusatzkredite (Usage credits) im Claude-Konto aus lassen** – sonst rechnet Überlauf zu API-Preisen ab.
- **Notfall-Key** optional: `AIPULSE_FALLBACK_API_KEY`, in der Anthropic-Konsole Monatslimit 5 USD.
- **Nutzungsbedingungen (Stand 2026-10-24, keine Rechtsberatung):** Die Claude-Code-Doku empfiehlt `setup-token` ausdrücklich für Skripte und CI; die Consumer Terms verbieten automatisierten Zugriff nur „except … where we otherwise explicitly permit it". Nicht ausdrücklich geregelt: Ergebnisse auf einer öffentlichen Seite zu zeigen. Besucher lösen keine Claude-Aufrufe aus (statische Seite) – kein „Routing für Dritte". Die Claude-Code-Bedingungen werden selbst überwacht (AGB-Watchlist).
- **Ausweg API-Betrieb:** In `pipeline/config/models.ts` das Standard-Backend auf `api` stellen **und** dort Deckel (`apiUsdCap`) und Modellwahl je Stufe anpassen (Opus fürs Briefing) sowie das Konsolenlimit erhöhen – der Schalter allein brächte wegen des 3-€-Deckels fast jeden Lauf auf `aus`. Kosten (API-Preise 2026-10-24): gleiche Aufteilung ≈ 10 USD/Monat (Haiku ≈ 1,3 · Opus-Briefings ≈ 8,3 · AGB ≈ 0,6); mit Sonnet 5.5 statt Opus mittags/abends ≈ 7 USD.
