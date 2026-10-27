---
name: claude-headless
description: Claude Code headless (claude -p) mit dem Max-Abo für AI Pulse – Flags, Abo-Token, Env-Hygiene, Limit-/Login-Fehler, Notfall-API (Haiku 5.5, ≤ 3 €), Test per AIPULSE_SIMULATE_LIMIT. Laden, bevor du pipeline/llm/backends/ baust oder Claude-Fehler untersuchst.
---

# Claude Code headless (Abo statt API)

Grundsatz: Die Pipeline ruft Claude über die **Claude-Code-CLI** mit dem Abo-Token des Nutzers auf (Max 5×) → keine API-Kosten. Das Kontingent teilt sich der Job mit der eigenen Arbeit des Nutzers, deshalb **wenige, gebündelte Aufrufe ohne Tools und mit eigenem System-Prompt**. Die Anthropic-API ist nur das Notfall-Backend. Prompts, Rubriken und Stufen → Skill `bewertung`; Server-Einrichtung, Installation, Updates → Skill `job-betrieb`.

Fakten unten aus der offiziellen Doku, geprüft am 2026-10-24 (code.claude.com/docs: `headless.md`, `cli-reference.md`, `authentication.md`, `errors.md`, `model-config.md`, `setup.md`, `legal-and-compliance.md`; support.claude.com Artikel 11145838). Claude Code ändert sich schnell: Bei Abweichungen erst `claude --help` und die Doku prüfen, dann hier nachtragen.

## Aufrufmuster (Standard-Backend `pipeline/llm/backends/cli.ts`)

```bash
printf '%s' "$PAYLOAD_JSON" | claude -p "Bewerte die Meldungen im Eingabe-JSON nach den Regeln im System-Prompt." \
  --safe-mode --tools "" \
  --system-prompt-file .cache/prompts/triage.txt \
  --model claude-haiku-5-5 --effort low \
  --output-format json --json-schema "$SCHEMA_JSON" \
  --no-session-persistence
```

| Flag | Warum |
|---|---|
| `-p` | Print-/Headless-Modus, eine Antwort, dann Ende |
| `--safe-mode` | lädt **kein** CLAUDE.md, keine Skills, Plugins, Hooks, MCP-Server, Commands/Agents, keine Auto-Memory – Login, Modellwahl und Rechte funktionieren normal. **Nicht `--bare`**: Bare liest nie OAuth-Zugangsdaten → das Abo geht damit nicht (Bare nur im Notfall mit API-Key sinnvoll, dort nutzen wir aber das SDK) |
| `--tools ""` | alle eingebauten Tools aus → kleinerer Kontext, und **Prompt-Injection aus Artikeltexten kann nichts ausführen** |
| `--system-prompt-file <datei>` | ersetzt den kompletten Standard-System-Prompt von Claude Code (Doku: „drops all of the default prompt, including tool guidance and safety instructions") → spart viel Kontext; unsere Prompt-Dateien müssen deshalb selbst sagen, dass Eingabetexte Daten sind und keine Anweisungen. Die Datei setzt `pipeline/llm/prompts.ts` aus den Bausteinen in `pipeline/llm/prompts/` zusammen (`.cache/prompts/<stufe>.txt`, Skill `bewertung`) |
| `--model claude-haiku-5-5` / `claude-opus-5-5` | volle IDs statt Aliasen (`haiku`/`opus` lösen je nach Version anders auf) |
| `--effort low` (Haiku) / `medium` (Opus: Briefing, `terms`) / `high` (Wochenrückblick, ab Phase 5) – Werte je Stufe → Skill `bewertung` | Thinking lässt sich bei Haiku 5.5 in Claude Code nicht abschalten (`MAX_THINKING_TOKENS=0` wirkt nicht); `--effort` ist der einzige Hebel |
| `--output-format json` + `--json-schema '<schema>'` | strukturierte Ausgabe: das geparste Objekt steht in **`structured_output`**. Fehlt das Feld → kein gültiges Ergebnis (wie Fehler behandeln). Ungültiges Schema → Fehler |
| `--no-session-persistence` | keine Sitzungsdateien auf dem Server ansammeln |

- **Eingabe:** kurze Anweisung als `-p`-Argument, die Daten (Kandidaten-JSON) über **stdin** (Limit 10 MB). So landen keine Artikeltexte in der Prozessliste.
- **Pakete statt Einzelaufrufe:** Stufe 1 in Paketen à 20 Meldungen, Stufe 2 alle Top-Meldungen in 1–2 Aufrufen, Briefing 1 Aufruf. Ziel: ≤ 8 CLI-Aufrufe pro Lauf.
- **Overhead einmal messen:** einen Probeaufruf mit `--output-format stream-json --verbose` machen und im `system/init`-Event prüfen, dass keine Tools und keine MCP-Server geladen sind. Token je Aufruf aus `usage` ins Kostenbuch.
- `--max-turns`: ohne Tools endet der Aufruf nach einer Antwort; ob `--max-turns 1` mit `--json-schema` zusammenspielt, ist **nicht dokumentiert** → erst testen, dann ggf. setzen.
- `--max-budget-usd` ist nur eine clientseitige Schätzbremse (nicht die Abo-Abrechnung) – als Notbremse gegen Endlosschleifen ok (z. B. 0.50).

## JSON-Antwort auswerten

Dokumentiert (headless.md): `result` (Text), `session_id`, `usage`, `total_cost_usd`, Aufschlüsselung je Modell, `structured_output` (bei Schema). Laut Agent-SDK-Referenz zusätzlich `subtype` (`success`, `error_max_turns`, `error_during_execution`, `error_max_budget_usd`, `error_max_structured_output_retries`), `is_error`, `permission_denials` – ob die CLI exakt dieses Schema liefert, ist nicht ausdrücklich belegt. Deshalb defensiv:

1. Exit-Code ≠ 0 → Fehler.
2. JSON nicht parsebar → Fehler (stdout/stderr gekürzt loggen, nie ganze Ausgaben).
3. `is_error === true` oder `subtype` beginnt mit `error_` → Fehler.
4. `structured_output` fehlt → Fehler; Ergebnis zusätzlich mit dem zod-Schema prüfen (Schema-Treue ist kein Ersatz für Validierung).
5. `total_cost_usd` ist laut Doku eine **clientseitige Schätzung**; beim Abo nicht abrechnungsrelevant → im Kostenbuch als `schaetzungUsd` führen, nie gegen die Notfall-Grenze rechnen.

Schemas einmal in zod definieren (`pipeline/llm/schemas.ts`) und daraus das JSON-Schema für `--json-schema` erzeugen (zod 4: `z.toJSONSchema(schema)` – Version beim Einbau prüfen). Dasselbe zod-Schema nutzt das API-Backend mit `zodOutputFormat`.

## Node-Aufruf (Bauregeln)

- `spawn(bin, args, { env, stdio: ['pipe','pipe','pipe'], timeout })` mit `timeout` = Timeout der Stufe aus `pipeline/config/models.ts` (Startwerte laut `bewertung`: 180 s Haiku, 300 s Opus-Briefing/`terms`, 600 s Wochenrückblick) – **Argumente als Array, nie über eine Shell** (Schema-JSON enthält Anführungszeichen). Binärpfad aus `AIPULSE_CLAUDE_BIN` (Server: `~/.local/bin/claude`; unter Windows ggf. `claude.exe`).
- **Env-Hygiene (Pflicht):** `env` explizit bauen: `PATH`, `HOME`, `LANG`, `CLAUDE_CODE_OAUTH_TOKEN`, optional `CLAUDE_CONFIG_DIR`. **Nie** `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, Cloud-Provider-Variablen weitergeben. Doku: „In non-interactive mode (`-p`), the key is always used when present" → ein Key aus Shell-Profil, systemd-Unit oder `.env` würde still über die API abrechnen.
- Ein `apiKeyHelper` in `~/.claude/settings.json` schlägt das OAuth-Token ebenfalls → auf dem Server keine solche Einstellung.
- Vor dem ersten Aufruf je Lauf: `claude auth status` (JSON, Exit 0 = angemeldet) → `authMethod` muss `oauth_token` sein. Bei `api_key`/`api_key_helper`/`none`: Lauf **nicht** über die CLI bewerten, Fehler in `meta.json`, Notfall-Backend.
- Aufrufe nacheinander, nicht parallel (Kontingent, Fenster-Limits).

## Login auf dem Server

- `claude setup-token` auf einem Rechner **mit Browser** ausführen (Nutzer). Es gibt ein OAuth-Token mit **1 Jahr** Gültigkeit aus (wird nicht gespeichert, nur angezeigt), Voraussetzung Pro/Max/Team/Enterprise. Gilt nur für Modellanfragen (nicht für Remote Control/claude.ai-Connectors).
- Auf dem Server als `CLAUDE_CODE_OAUTH_TOKEN` in die Env-Datei des Dienstes (`/etc/ai-pulse/env`, root:aipulse, Modus 640) – Details → Skill `job-betrieb`. Erstellungsdatum als `AIPULSE_TOKEN_CREATED=JJJJ-MM-TT` daneben; die Pipeline warnt in `meta.json` 30 Tage vor Ablauf.
- Rangfolge der Anmeldung laut Doku: Cloud-Provider-Variablen → `ANTHROPIC_AUTH_TOKEN` → `ANTHROPIC_API_KEY` → `apiKeyHelper` → `CLAUDE_CODE_OAUTH_TOKEN` → Profile → `/login`-Abo. Darum die Env-Hygiene oben.
- Eine `/login`-Sitzung kann ablaufen („Login expired") – für unbeaufsichtigte Läufe immer das Jahres-Token nehmen.
- **Zusatzkredite (Usage credits) im Claude-Konto ausgeschaltet lassen:** sie rechnen nach dem Limit zu API-Preisen ab.

## Limits erkennen

- Pro/Max haben ein 5-Stunden-Fenster und ein Wochenlimit, **gemeinsam für Claude und Claude Code** (support.claude.com 11145838) – der Pool gilt fürs Konto, also auch für die Server-Läufe.
- Meldungen laut `errors.md`: `You've hit your session limit · resets 3:45pm`, `You've hit your weekly limit · resets Mon 12:00am`, dazu Opus-/Sonnet-Varianten. Exit-Code und `subtype` dafür sind **nicht dokumentiert** → erkennen über: Exit ≠ 0 **oder** `result` passt auf `/You've hit your (session|weekly|Opus|Sonnet) limit/i`.
- Login-Fehler: laut Doku ein strukturierter Fehlercode `authentication_failed` (Feldname nicht dokumentiert) → zusätzlich auf diesen String im JSON prüfen.
- **Einmal messen (Phase 2):** Aufruf mit absichtlich ungültigem `CLAUDE_CODE_OAUTH_TOKEN` und die echte Fehlerform als Fixture unter `pipeline/test/fixtures/claude-cli/` ablegen. Den Limit-Fall nie echt provozieren (verbraucht das Kontingent des Nutzers), sondern mit `AIPULSE_SIMULATE_LIMIT=1` testen → Abschnitt „Notfallpfad testen“.
- Bei Limit: Backend für den Rest des Laufs als `limit` markieren (keine weiteren CLI-Versuche, auch nicht für Opus), Reset-Zeit aus der Meldung in `meta.json`.

## Notfall-Backend (`pipeline/llm/backends/api.ts`)

- Nur im **vollen** Lauf (Server) und nur, wenn die CLI `limit` oder `auth` meldet **und** `AIPULSE_FALLBACK_API_KEY` gesetzt ist **und** das Monatsbudget (3 € ≈ 3,36 USD, `state/usage/JJJJ-MM.json`) nicht erreicht ist. Test- und Teilläufe → nächster Abschnitt.
- `new Anthropic({ apiKey: process.env.AIPULSE_FALLBACK_API_KEY })` – Key nur an den Konstruktor, nie als `ANTHROPIC_API_KEY` exportieren.
- Modell **`claude-haiku-5-5` für alle Stufen** (auch Briefing, dann kürzer). `client.messages.parse` + `zodOutputFormat` mit denselben zod-Schemas, System-Prompt aus derselben Datei wie bei der CLI. Kein `temperature`/`top_p`/`top_k` (seit 2026-10-21 → 400), kein Prefill, `stop_reason === 'refusal'` vor dem Inhalt prüfen (Haiku 5.5 hat keinen serverseitigen Fallback). Preise: $0,10 / $0,50 je MTok (Prompts ≤ 100K, darüber das 5-Fache → Pakete klein halten). Vor dem Bauen Skill `claude-api` laden.
- Kosten aus `usage` exakt berechnen und ins Kostenbuch (`backend: 'api'`). Budget erreicht → Regel-Scores (`ratedBy: 'regel'`), Bewertung im nächsten Lauf nachholen.
- In der Anthropic-Konsole zusätzlich ein Monatslimit (5 USD) als zweite Sicherung.

## Notfallpfad testen (Abnahme Phase 2)

- **`AIPULSE_SIMULATE_LIMIT=1`:** `backends/cli.ts` startet keinen `claude`-Prozess, sondern gibt eine Limit-Meldung (Form wie in `errors.md`, z. B. `You've hit your session limit · resets 3:45pm`) in dieselbe Erkennung wie oben → Backend `limit` für den Rest des Laufs, `resetHint` gesetzt, die Auswahl springt auf `api`. So wird die echte Erkennung und Umschaltung geprüft, nicht nur ein Schalter.
- **In Test- und Teilläufen** (`--dry-run`, `--stage`, `--only`, `--limit`) antwortet dann statt des SDK eine aufgezeichnete Fixture `pipeline/test/fixtures/llm/api-<stufe>.json` (`<stufe>` = `triage` · `summarize` · `brief` · `terms`, ab Phase 5 `weekly`). Sie läuft durch dieselbe zod-Prüfung und Kostenrechnung (`backend: 'api'`); das Kostenbuch landet **nur in `.cache/`**, nie in `state/usage/`, und zählt nicht gegen die 3-€-Grenze. Kein Key nötig.
- **`AIPULSE_API_LIVE_TEST=1`** (nur zusätzlich zu `AIPULSE_SIMULATE_LIMIT=1`, lokal mit eigenem `AIPULSE_FALLBACK_API_KEY`): genau **ein** echter `claude-haiku-5-5`-Aufruf über das SDK (Cent-Betrag), alle weiteren `api`-Aufrufe des Laufs wieder aus der Fixture. Kosten exakt aus `usage`, Eintrag ebenfalls nur im `.cache/`-Kostenbuch. Einzige Ausnahme von der Regel „Teilläufe nutzen nie das API-Backend“ (Steckbrief).
- Kleinster Live-Test: `AIPULSE_SIMULATE_LIMIT=1 AIPULSE_API_LIVE_TEST=1 npm run pipeline -- --stage triage --limit 5` (ein Triage-Paket; Eingabe `candidates.json` aus einem vorherigen `npm run collect`). Shell-Syntax unter Windows → Skill `windows-shell-fallen`.
- Im vollen Lauf ist `AIPULSE_SIMULATE_LIMIT` nicht vorgesehen (dort ginge die Auswahl auf die echte API mit echtem Kostenbuch) → nie in `/etc/ai-pulse/env` eintragen.

## Kostenbuch-Eintrag (gemeinsam für beide Backends)

```ts
interface UsageEntry {
  ts: string; run: 'morning' | 'midday' | 'evening' | 'weekly'
  stage: 'triage' | 'summarize' | 'brief' | 'weekly' | 'terms'
  backend: 'abo' | 'api'; model: string
  inputTokens: number; outputTokens: number; cacheReadTokens?: number
  usd?: number            // nur backend 'api' – zählt gegen die 3-€-Grenze
  schaetzungUsd?: number  // total_cost_usd der CLI, nur zur Beobachtung
  ok: boolean; error?: 'limit' | 'auth' | 'schema' | 'timeout' | 'refusal' | 'other'
}
```

## Nutzungsbedingungen (Stand 2026-10-24, keine Rechtsberatung)

- Für Skripte dokumentiert: `setup-token` „For CI pipelines, scripts, or other environments"; `CLAUDE_CODE_OAUTH_TOKEN` „for CI pipelines and scripts where browser login isn't available".
- Consumer Terms (gelten für Pro/Max), Abschnitt 3: kein automatisierter Zugriff „except when you are accessing our Services via an Anthropic API Key or where we otherwise explicitly permit it". `legal-and-compliance.md`: OAuth ist für „ordinary use of Claude Code" gedacht; verboten ist, Anfragen „through Free, Pro, or Max plan credentials on behalf of their users" zu leiten oder claude.ai-Login in eigene Produkte einzubauen.
- Einordnung: unveränderte Claude-Code-CLI, eigenes Abo, eigener Rechner, nicht kommerziell; die Seite ist statisch, **Besucher lösen keine Claude-Aufrufe aus**. Ausdrücklich geregelt ist das Veröffentlichen der Ergebnisse nicht → Grauzone, im Steckbrief als offener Punkt. Ausweg jederzeit: `pipeline/config/models.ts` → Standard-Backend `api` (Schätzung: gleiche Aufteilung ≈ 10 USD/Monat, mit Sonnet 5.5 statt Opus für Mittag/Abend ≈ 7 USD – Steckbrief). Dafür reicht der Schalter allein nicht: Der Notfall-Deckel (3,36 USD), das Konsolenlimit (5 USD) und die Regel „Notfall nur Haiku“ gelten für das `api`-Backend und müssten mit umgestellt werden.
- **Niemals** das Abo-Token in ein öffentliches Repo, GitHub-Secrets anderer Leute oder in den Worker legen; nie Besucher-Eingaben an Claude weiterreichen.

## Fallen

- `--bare` (von der Doku für Skripte empfohlen und künftig Standard für `-p`) **schaltet das Abo ab** → immer `--safe-mode` setzen und nach Claude-Code-Updates prüfen, ob sich der Standard für `-p` geändert hat (dann ausdrücklich nicht-bare bleiben bzw. neue Option suchen).
- `-p` läuft im Manual-Modus: Tool-Aufrufe ohne Freigabe werden abgelehnt – mit `--tools ""` irrelevant, aber `permission_denials` im JSON sollte leer sein. (Ab welcher Version das gilt, ist in der Doku nicht belegt.)
- Beim Fixture-Mitschnitt in Phase 2 zusätzlich einmal `--output-format stream-json --verbose` aufzeichnen: `headless.md` dokumentiert ein `error`-Feld an `api_retry`-Events (z. B. `authentication_failed`, `rate_limit`) – weiteres Signal für Login- und Limit-Fehler.
- Test- und Teilläufe (`--limit`, `--only`, `--stage`, `--dry-run`) erreichen die echte API nie – auch mit `AIPULSE_SIMULATE_LIMIT=1` antwortet die Fixture; einzige Ausnahme ist der eine Aufruf mit `AIPULSE_API_LIVE_TEST=1`. Ihr Kostenbuch steht nur in `.cache/`.
- Aliase wie `haiku`, `opus`, `best` lösen je nach Version/Konto auf andere Modelle auf → volle IDs.
- Schema-JSON über eine Shell zu übergeben bricht an Anführungszeichen → `spawn` mit Argument-Array.
- `total_cost_usd` ≠ Rechnung; beim Abo zählt nur das Kontingent.
- Ein Claude-Code-Update kann Flags/JSON-Form ändern → feste Version auf dem Server (Skill `job-betrieb`), nach jedem Update ein `--limit 5`-Lauf und die Fixture-Tests.
- Lokal unter Windows ist Claude Code mit dem normalen Login des Nutzers angemeldet; ein lokaler Testlauf verbraucht dasselbe Kontingent.

## Nach dem Bauen

Gemessene Fehlerformen (Exit-Codes, JSON-Felder bei Limit/Auth), Token pro Aufruf und Aufrufe pro Lauf hier nachtragen; Phasenstand im Steckbrief ergänzen.

## Befund lokal (2026-10-25)

- Kein `claude` im PATH; die Desktop-App bringt eigene Binärdateien mit (`%LOCALAPPDATA%\Claude-Data\<…>\claude-code\<version>\<hash>\claude.exe`, Version 2.1.308). Für Skripte `AIPULSE_CLAUDE_BIN` darauf setzen.
- Dieses Binary ist **standalone nicht angemeldet** (`claude auth status` → `loggedIn: false`, `authMethod: none`): Die Desktop-App reicht ihren Login nur an eigene Sitzungen durch (`ANTHROPIC_BASE_URL`, Host-Auth), und `cleanEnv()` lässt das ohnehin nicht durch. Für lokale Testläufe einmal `claude.exe auth login` (Nutzer, Browser).
- `--help` 2.1.308 bestätigt `--safe-mode`, `--bare`, `--tools`, `--json-schema`, `--effort`, `--no-session-persistence`, `--output-format`; `--system-prompt-file` erscheint nur im Hilfetext von `--safe-mode`/`--bare` („--system-prompt[-file]"), existiert also.

## Gemessen (2026-10-27, Windows, claude-code 2.1.308, Abo-Login `authMethod: "claude.ai"`)

- `claude auth status` vor dem Login: `loggedIn: false`, `authMethod: "none"` → `authStatus()` lehnt ab. Nach `claude.exe auth login` (Desktop-Binary unter `%LOCALAPPDATA%\Claude-Data\…\claude-code\<version>\<hash>\claude.exe`, nicht im PATH → `AIPULSE_CLAUDE_BIN` setzen) läuft `-p` über das Abo.
- Teillauf `--limit 80` (113 neu → 80 an Claude): **8 CLI-Aufrufe**, 363 s. Triage 4× Haiku (zus. 51 k in / 45 k out), Summarize 3× Haiku (33 k / 30 k; Sicherheit als eigenes Paket), Briefing 1× Opus (6,6 k / 3,1 k). Alle ok, `structured_output` immer vorhanden.
- Einzelaufruf Triage mit 5 Kandidaten: 6,6 k in / 3,5 k out, `total_cost_usd` 0,0031 (Schätzung).
