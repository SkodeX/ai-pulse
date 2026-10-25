# Server-Dateien (Bauplan für `server/`)

Zielstand Phase 3. Regeln und Begründungen stehen in `../SKILL.md`, die Einrichtung in `server-setup.md`. Unit-Optionen sind gegen die systemd-Manpages (latest) und NEWS geprüft: IANA-Zeitzonen in `OnCalendar=` gibt es seit systemd 235, `RestrictSUIDSGID=` seit 242, `systemctl clean` seit 243. Alle Dateien mit LF-Zeilenenden. `run.sh` mit Ausführbit committen: `git add --chmod=+x server/run.sh`.

## `server/ai-pulse.service`

```ini
# AI Pulse – ein Lauf: sammeln, bewerten, Daten pushen (Skill job-betrieb)
# Installieren: sudo install -m 644 /opt/ai-pulse/server/ai-pulse.service /etc/systemd/system/ && sudo systemctl daemon-reload
[Unit]
Description=AI Pulse – Sammel- und Bewertungslauf
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=aipulse
Group=aipulse
WorkingDirectory=/opt/ai-pulse
EnvironmentFile=/etc/ai-pulse/env
Environment=AIPULSE_CLAUDE_BIN=/home/aipulse/.local/bin/claude
Environment=AIPULSE_DATA_DIR=/home/aipulse/.local/share/ai-pulse
Environment=AIPULSE_DEADLINE_MIN=30
# Wirkt als letzter Schritt, auch auf Werte aus EnvironmentFile= (sonst rechnet claude -p still über die API ab)
UnsetEnvironment=ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
ExecStart=/opt/ai-pulse/server/run.sh
# oneshot hat sonst keinen Start-Timeout; interne Deadline der Pipeline: 30 min inkl. Zeitreserve fürs Briefing
TimeoutStartSec=45min
# 75 = anderer Lauf hält den Lock – kein Fehler
SuccessExitStatus=75
SyslogIdentifier=ai-pulse

# Härtung
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/ai-pulse /home/aipulse
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes
# Bewusst KEIN MemoryDenyWriteExecute=: Node (V8) und Claude Code brauchen JIT
```

- `ReadWritePaths=/home/aipulse` ist nötig für `~/.claude/` und `~/.claude.json` (Claude Code), `~/.npm` (`npm ci`), `~/.ssh/known_hosts` und das private Datenverzeichnis. Andere Home-Verzeichnisse bleiben schreibgeschützt.
- `/run` ist mit `ProtectSystem=strict` schreibgeschützt. Deshalb liegt der Lock in `/opt/ai-pulse/.cache/run.lock`, so finden ihn auch manuelle Läufe außerhalb von systemd.
- Prüfen: `sudo systemd-analyze verify /etc/systemd/system/ai-pulse.service` und `systemd-analyze security ai-pulse.service` (Bewertung nur zur Information).

## `server/ai-pulse.timer`

```ini
# AI Pulse – 3× täglich nach Berliner Zeit, holt verpasste Termine nach (Skill job-betrieb)
# Installieren: sudo install -m 644 /opt/ai-pulse/server/ai-pulse.timer /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now ai-pulse.timer
[Unit]
Description=AI Pulse – Lauf um 07:07, 13:07 und 19:07 (Europe/Berlin)

[Timer]
# IANA-Zone als Suffix (ab systemd 235): unabhängig von der Systemzeitzone, Sommerzeit automatisch
OnCalendar=*-*-* 07,13,19:07:00 Europe/Berlin
# War der Timer inaktiv (Server aus), einmal sofort nachholen; die Lücke deckt das Zeitfenster aus state/runs.json ab
Persistent=true
# Kein RandomizedDelaySec=: ein Rechner, :07 liegt schon neben der vollen Stunde

[Install]
WantedBy=timers.target
```

- Ohne `Unit=` startet der Timer die gleichnamige `ai-pulse.service`.
- `AccuracySec=` bleibt beim Standard 1 min (Start zwischen :07:00 und :08:00). Kein `RandomizedDelaySec=`: eine Zufallsverzögerung verschöbe auch den Nachhollauf nach dem Booten. Den Sommerzeitwechsel (2026-10-25, 2027-03-28) übernimmt das Zonen-Suffix.
- Sonntag 19:07 ist derselbe Termin; ob der Lauf `evening` oder (ab Phase 5, Stufe `weekly` eingeschaltet) `weekly` ist, entscheidet die Pipeline.
- Kontrolle:
  - `systemd-analyze calendar '*-*-* 07,13,19:07:00 Europe/Berlin'` zeigt den nächsten Termin, lokal und in UTC.
  - `systemctl list-timers ai-pulse.timer` zeigt den letzten und nächsten Lauf.
- Vor dem Deinstallieren `systemctl clean --what=state ai-pulse.timer` ausführen (löscht den Zeitstempel von `Persistent=`, laut Manpage; ab systemd 243).

## `server/run.sh`

```bash
#!/usr/bin/env bash
# AI Pulse – ein Lauf auf dem Heimserver (gestartet von ai-pulse.service, Skill job-betrieb).
# Manuell:  sudo -u aipulse -H /opt/ai-pulse/server/run.sh [--kind morning|midday|evening|weekly] [--limit 5] [--dry-run]
# Prüfen:   sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check
# Exit: 0 ok · 10 git pull · 11 npm ci · 20 Pipeline · 30 Push · 75 anderer Lauf aktiv (kein Fehler)
set -Eeuo pipefail

REPO_DIR=/opt/ai-pulse
ENV_FILE=/etc/ai-pulse/env

log() { printf '[run] %s\n' "$*"; }
trap 'log "FEHLER in Zeile $LINENO (Exit $?)"' ERR

# authMethod aus `claude auth status` – nur Login-Variablen weitergeben, nie ANTHROPIC_*
auth_method() {
  local out
  out=$(env -i HOME="$HOME" PATH="$PATH" LANG=C.UTF-8 \
          CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN:-}" \
          "$AIPULSE_CLAUDE_BIN" auth status 2>/dev/null) || true
  printf '%s' "$out" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try { console.log(JSON.parse(s).authMethod || "none") } catch { console.log("unbekannt") }
    })'
}

push_with_retry() {
  local i
  for i in 1 2 3; do
    if git push -q origin HEAD:main; then return 0; fi
    log "Push abgelehnt (Versuch $i)"
    if [[ $i -eq 3 ]]; then break; fi
    sleep $((i * 15))
    # Der Baum ist hier sauber (Schritt 8) – sonst verweigert der Rebase wegen ungestagter Änderungen
    if ! git pull --rebase -q origin main; then
      git rebase --abort 2>/dev/null || true
      log "FEHLER: Rebase-Konflikt oder Netz – Commit bleibt lokal (Skill job-betrieb, Ausfälle)"
      return 1
    fi
  done
  return 1
}

main() {
  cd "$REPO_DIR"
  umask 027
  mkdir -p .cache

  # 1. Umgebung: Env-Datei bei manuellem Aufruf nachladen; nie über die API abrechnen
  if [[ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" && -r "$ENV_FILE" ]]; then
    set -a; . "$ENV_FILE"; set +a
  fi
  unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
  # HOME aus passwd: sudo ohne -H ließe sonst das Home des Aufrufers stehen
  HOME=$(getent passwd "$(id -un)" | cut -d: -f6); export HOME
  export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
  export AIPULSE_CLAUDE_BIN="${AIPULSE_CLAUDE_BIN:-$HOME/.local/bin/claude}"
  export AIPULSE_DATA_DIR="${AIPULSE_DATA_DIR:-$HOME/.local/share/ai-pulse}"
  export AIPULSE_DEADLINE_MIN="${AIPULSE_DEADLINE_MIN:-30}"

  # --auth-check vor dem Lock: funktioniert auch, während ein Timer-Lauf aktiv ist (z. B. bei der Token-Erneuerung)
  if [[ "${1:-}" == --auth-check ]]; then
    local m; m=$(auth_method)
    log "authMethod=$m ($("$AIPULSE_CLAUDE_BIN" --version 2>/dev/null || echo 'claude nicht gefunden'))"
    if [[ "$m" == oauth_token ]]; then exit 0; else exit 1; fi
  fi

  # 2. Nur ein Lauf gleichzeitig (Timer und manuelle Läufe)
  exec 9>.cache/run.lock
  if ! flock -n 9; then log "anderer Lauf aktiv – übersprungen"; exit 75; fi

  # 3. Reste eines abgebrochenen Laufs (Stromausfall) – sicher, weil wir den Lock halten
  if [[ -e .git/index.lock ]]; then log "entferne verwaistes .git/index.lock"; rm -f .git/index.lock; fi
  if [[ -d .git/rebase-merge || -d .git/rebase-apply ]]; then git rebase --abort || true; fi

  # 4. Code und Daten holen; npm ci nur bei geändertem Lockfile
  local lock_before lock_after
  lock_before=$(git rev-parse -q --verify HEAD:package-lock.json || echo none)
  if ! git pull --rebase --autostash -q origin main; then
    git rebase --abort 2>/dev/null || true
    log "FEHLER: git pull fehlgeschlagen (Netz, Deploy-Key oder Konflikt)"
    exit 10
  fi
  lock_after=$(git rev-parse -q --verify HEAD:package-lock.json || echo none)
  if [[ "$lock_before" != "$lock_after" || ! -d node_modules ]]; then
    log "package-lock.json geändert – npm ci"
    # --ignore-scripts: keine Install-Skripte fremder Pakete als aipulse (der Benutzer kann Deploy-Key und Token lesen);
    # alle Pipeline-Abhängigkeiten sind reines JS – braucht ein neues Paket doch ein Skript, bewusst entscheiden
    npm ci --ignore-scripts --no-audit --no-fund --loglevel=error || { log "FEHLER: npm ci"; exit 11; }
  fi

  # 5. Anmeldung prüfen – das Backend wählt die Pipeline (Skill claude-headless)
  local method; method=$(auth_method)
  export AIPULSE_AUTH_METHOD="$method"
  [[ "$method" == oauth_token ]] || log "WARNUNG: authMethod=$method statt oauth_token – Notfall-Backend oder Regel-Scores"

  # 6. Lauf (Lauf-Typ aus der Berliner Uhrzeit, --kind überschreibt)
  local rc=0
  node pipeline/run.ts "$@" || rc=$?
  log "Pipeline beendet mit $rc"

  # 7. Commit nur bei Änderungen; nach Fehlschlag nur das Kostenbuch (API-Kosten sind angefallen)
  # mkdir: vor dem ersten Datenlauf fehlt state/, dann bräche git add mit "pathspec did not match" ab
  mkdir -p public/data state
  if [[ $rc -eq 0 ]]; then
    git add --all -- public/data state
  else
    git add --all -- state/usage 2>/dev/null || true
  fi
  local pushed=nichts note=""
  if ! git diff --cached --quiet; then
    local kind; kind=$(node -p 'require("./public/data/meta.json").run' 2>/dev/null || echo '?')
    [[ $rc -eq 0 ]] || note=" (Fehlschlag, nur Kostenbuch)"
    git commit -q -m "data: $(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M') ${kind}${note}"
  fi

  # 8. Nicht committete Reste verwerfen – vor dem Push, damit der Rebase im Retry nicht verweigert
  #    und der nächste Pull sauber startet
  git restore --staged --worktree -- public/data state 2>/dev/null || true
  git clean -fdq -- public/data state

  # 9. Pushen, sobald lokale Commits fehlen – auch ein liegengebliebener aus einem früheren Lauf
  if [[ $(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0) -gt 0 ]]; then
    if push_with_retry; then pushed=ok; else pushed=fehler; fi
  fi

  log "fertig: pipeline=$rc push=$pushed commit=$(git rev-parse --short HEAD)"
  if [[ $rc -ne 0 ]]; then exit 20; fi
  if [[ $pushed == fehler ]]; then exit 30; fi
  exit 0
}

main "$@"; exit $?
```

- **`git add --all -- <pfade>`** nimmt neue, geänderte und gelöschte Dateien **nur** unter diesen Pfaden auf. Ein `git add -A` ohne Pfad würde `.cache/` oder `dist/` mitnehmen, falls `.gitignore` einmal lückenhaft ist.
- **`--autostash`** ist nur ein Sicherheitsnetz. Schritt 8 hinterlässt einen sauberen Baum.
- **Reihenfolge Commit → Reste verwerfen → Push:** Nach einem Fehlschlag liegen geänderte `state/`-Dateien ungestaged im Baum. `git pull --rebase` im Push-Retry bräche dann mit „You have unstaged changes" ab.
- **Push-Bedingung `origin/main..HEAD`:** So geht ein Commit, dessen Push im letzten Lauf scheiterte, auch dann raus, wenn der aktuelle Lauf nichts Neues committet.
- **Teilläufe (`--dry-run`, `--stage …`, `--only`, `--limit`)** schreiben nur nach `.cache/` (Trockenlauf: Schatten-State `.cache/dry/state/` und Ausgabe `.cache/dry/<runId>/`; `--stage collect` ist immer Trockenlauf; sonst `.cache/run/`), setzen nie `lastSuccessAt` und nutzen nie das API-Backend; der Commit-Schritt findet dann nichts.
- **Lauf-Typ für die Commit-Nachricht:** Den liest das Skript aus `meta.json` → `run`. Fehlt die Datei, steht `?` in der Nachricht. Sonntags 19:07 steht dort bis Phase 5 `evening`, erst mit eingeschalteter Stufe `weekly` dann `weekly`.
- **`.gitignore`:** u. a. `.cache/`, `dist/`, `node_modules/`, `*.tmp-*` (Temp-Dateien heißen `<datei>.tmp-<pid>`, Skill `bewertung`); maßgeblich ist die Vorlage in `pulse-steckbrief/references/projekt-setup.md`.
- **Syntax:** `bash -n server/run.sh` prüft die Syntax ohne Ausführung (läuft auch in Git Bash).

## `server/env.example`

```ini
# Vorlage für /etc/ai-pulse/env (Skill job-betrieb). Auf dem Server: Eigentümer root, Gruppe aipulse, Modus 640.
# Format für systemd UND bash: KEY=wert je Zeile, Kommentare nur auf eigenen Zeilen,
# keine Anführungszeichen, kein export, kein $.
# NIE ANTHROPIC_API_KEY oder ANTHROPIC_AUTH_TOKEN eintragen (claude -p würde still über die API abrechnen).

# Pflicht: Abo-Token aus `claude setup-token` (PC mit Browser, 1 Jahr gültig)
CLAUDE_CODE_OAUTH_TOKEN=
# Pflicht: Erstellungsdatum des Tokens, JJJJ-MM-TT (Warnung 30 Tage vor Ablauf)
AIPULSE_TOKEN_CREATED=
# Pflicht: fine-grained PAT ohne Repo-Rechte, nur öffentliche Daten lesen (5.000 statt 60 Anfragen/h)
AIPULSE_GITHUB_TOKEN=

# Optional: Notfall-Backend (Haiku 5.5, gedeckelt auf 3 €/Monat), Monatslimit 5 USD in der Konsole
#AIPULSE_FALLBACK_API_KEY=
# Phase 6: Lese-Token des Feedback-Workers
#FEEDBACK_READ_TOKEN=

# Optional, erst eintragen, wenn die Quelle gebaut ist
#NVD_API_KEY=
#DIP_API_KEY=
#ARTIFICIAL_ANALYSIS_API_KEY=
#API_DATA_GOV_KEY=
#COURTLISTENER_TOKEN=
#OPENSTATES_API_KEY=
```

Nicht geheime Einstellungen (`AIPULSE_CLAUDE_BIN`, `AIPULSE_DATA_DIR`, `AIPULSE_DEADLINE_MIN`) stehen als `Environment=` in der Unit, nicht hier. `run.sh` setzt für manuelle Läufe dieselben Standardwerte.
