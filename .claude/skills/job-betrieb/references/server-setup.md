# Heimserver einrichten und warten

Zielstand Phase 3. Regeln stehen in `../SKILL.md`, Unit-Dateien, `run.sh` und `env.example` im Volltext in `server-dateien.md`. Daraus entsteht beim Bauen `server/setup.md` im Repo (für den Nutzer, mit einer Tabelle „Installierte Versionen").

Konventionen: Alle Befehle laufen auf dem Server per SSH. `sudo -u aipulse -H bash -lc '…'` führt etwas als Dienstbenutzer aus (dessen Shell ist `nologin`, darum `bash` ausdrücklich). Secrets tippt der Nutzer selbst ein, nie über den Chat.

## 0. Voraussetzungen prüfen

```bash
uname -m                        # x86_64 oder aarch64
systemctl --version | head -1   # systemd ≥ 243 (Zeitzone in OnCalendar ab 235, RestrictSUIDSGID= ab 242, systemctl clean ab 243; ältere ignorieren unbekannte Optionen nur mit Warnung, Debian 10 hat 241)
timedatectl | grep -i synchronized   # muss "yes" zeigen (Timer, TLS)
free -h                         # ≥ 4 GB RAM laut Claude-Code-Doku; Installer braucht ~512 MB frei
df -h /opt /home                # einige GB frei
```

Claude Code unterstützt laut Doku Ubuntu 20.04+, Debian 10+ und Alpine 3.19+, Alpine nur mit Zusatzpaketen. Für eine Neueinrichtung ein aktuelles Ubuntu LTS oder Debian stable wählen, ältere Versionen bekommen keine regulären Sicherheitsupdates mehr.

## 1. Pakete und Node 24

```bash
sudo apt-get update && sudo apt-get install -y git curl ca-certificates gnupg util-linux openssh-client
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
less /tmp/nodesource_setup.sh   # ansehen: legt Repo "nodistro" + Signaturschlüssel an
sudo bash /tmp/nodesource_setup.sh && sudo apt-get install -y nodejs
node --version                  # v24.x
```

`flock` kommt aus `util-linux`. Alternativ das offizielle Linux-Tarball von nodejs.org nach `/usr/local` entpacken. Dann gibt es aber keine Updates per `apt`.

## 2. Benutzer und Verzeichnisse

```bash
sudo useradd --system --create-home --home-dir /home/aipulse --shell /usr/sbin/nologin aipulse
sudo install -d -o aipulse -g aipulse -m 750 /opt/ai-pulse
sudo -u aipulse -H bash -lc 'mkdir -p ~/.local/share/ai-pulse/snapshots ~/.local/share/ai-pulse/logs'
```

## 3. Claude Code in fester Version

```bash
curl -fsSL https://downloads.claude.ai/claude-code-releases/stable; echo   # aktuelle stable-Version, 2026-10-24: 2.1.308
sudo -u aipulse -H bash -lc 'curl -fsSL https://claude.ai/install.sh | bash -s 2.1.308'
sudo -u aipulse -H /home/aipulse/.local/bin/claude --version
```

- Der Installer legt den Launcher `~/.local/bin/claude` an, einen Symlink nach `~/.local/share/claude/versions/`. Den Launcher **nicht** durch ein eigenes Skript ersetzen, sonst bleiben alle Versionen liegen, und `claude doctor` meldet einen fremden Launcher.
- Der Installer verweigert den Lauf als root unter `sudo` (er installiert ins Home). Deshalb als `aipulse`.

Danach Updates sperren, und zwar für jeden Aufruf. Managed Settings gelten auch mit `--safe-mode` und unabhängig von der Prozessumgebung:

```bash
sudo install -d -m 755 /etc/claude-code
printf '%s\n' '{ "env": { "DISABLE_UPDATES": "1" } }' | sudo tee /etc/claude-code/managed-settings.json > /dev/null
sudo chmod 644 /etc/claude-code/managed-settings.json
sudo -u aipulse -H /home/aipulse/.local/bin/claude doctor   # Zeile Auto-updates: disabled
```

- **Kein** `~aipulse/.claude/settings.json` mit `apiKeyHelper` oder `ANTHROPIC_*` im `env`-Block.
- Ungültiges JSON in Managed Settings lässt Claude Code gar nicht starten (Doku). Nach jeder Änderung `claude doctor` ausführen.

## 4. Env-Datei mit den Secrets

```bash
sudo install -d -m 755 /etc/ai-pulse
sudo install -m 640 -o root -g aipulse /dev/null /etc/ai-pulse/env
sudoedit /etc/ai-pulse/env      # Inhalt nach server/env.example; sudoedit behält Eigentümer und Modus
```

- **root:aipulse 640:** `aipulse` kann die Datei lesen (manuelle `run.sh`-Aufrufe laden sie), aber nicht verändern – auch ein unsandboxter manueller Lauf kann seine eigenen Secrets nicht umschreiben. systemd liest sie als root.

- **Abo-Token:** Der Nutzer führt auf seinem PC (mit Browser, Max-Konto) `claude setup-token` aus. Das Token wird nur einmal angezeigt und ist 1 Jahr gültig. Es kommt als `CLAUDE_CODE_OAUTH_TOKEN=` in die Datei, das heutige Datum als `AIPULSE_TOKEN_CREATED=`. Das Token zusätzlich im Passwortmanager ablegen.
- **GitHub-Token:**
  1. GitHub → Settings → Developer settings → Fine-grained tokens.
  2. Repository access „Public repositories" wählen, keine Berechtigungen. Lesezugriff auf öffentliche Repos ist immer enthalten.
  3. Ablauf 1 Jahr, möglichst am selben Tag wie das Abo-Token.
  4. Als `AIPULSE_GITHUB_TOKEN=` eintragen.
- **Gegenprobe:** Keine `ANTHROPIC_*`-Zuweisung irgendwo. Die Ausgabe muss leer sein (das Muster übergeht den Warnkommentar aus `env.example`, `-l` zeigt nur Dateinamen statt Werten):

```bash
sudo grep -rl 'ANTHROPIC_[A-Z_]*\(=\|"[[:space:]]*:\)\|apiKeyHelper' /etc/ai-pulse /etc/environment /etc/claude-code \
  /home/aipulse/.profile /home/aipulse/.bashrc /home/aipulse/.claude/settings.json 2>/dev/null
```

## 5. Deploy-Key und Checkout

```bash
sudo -u aipulse -H bash -lc 'install -d -m 700 ~/.ssh && ssh-keygen -t ed25519 -N "" -C "ai-pulse-server" -f ~/.ssh/ai-pulse-deploy && cat ~/.ssh/ai-pulse-deploy.pub'
```

1. GitHub → `SkodeX/ai-pulse` → Settings → Deploy keys → Add deploy key. Titel „Heimserver", den öffentlichen Schlüssel einfügen, **„Allow write access"** anhaken.
2. Der Key gilt nur für dieses Repo. Dort darf er aber pushen wie ein Collaborator, auch nach `.github/workflows/`. Ist der Server kompromittiert, den Key sofort in GitHub löschen.
3. `~/.ssh/config` von `aipulse` (Modus 600) anlegen:

```
Host github-ai-pulse
    HostName github.com
    User git
    IdentityFile ~/.ssh/ai-pulse-deploy
    IdentitiesOnly yes
```

4. Host-Schlüssel eintragen und gegen die Doku prüfen:

```bash
sudo -u aipulse -H bash -lc 'ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts && ssh-keygen -lf ~/.ssh/known_hosts'
# muss SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU zeigen (GitHub-Doku "GitHub's SSH key fingerprints", Ed25519)
sudo -u aipulse -H ssh -T git@github-ai-pulse          # "... successfully authenticated ..."
```

5. Klonen, Git-Identität für Bot-Commits setzen, Abhängigkeiten installieren:

```bash
sudo -u aipulse -H git clone git@github-ai-pulse:SkodeX/ai-pulse.git /opt/ai-pulse
sudo -u aipulse -H git -C /opt/ai-pulse config user.name "AI Pulse Bot"
sudo -u aipulse -H git -C /opt/ai-pulse config user.email "<ID>+SkodeX@users.noreply.github.com"   # Platzhalter: GitHub → Settings → Emails
sudo -u aipulse -H bash -lc 'cd /opt/ai-pulse && npm ci --ignore-scripts --no-audit --no-fund'
```

Die noreply-Adresse ordnet die Commits dem GitHub-Konto des Nutzers zu, ohne seine E-Mail zu veröffentlichen.

6. GitHub → `SkodeX/ai-pulse` → Settings → Actions → General → **Workflow permissions: „Read repository contents"** als Standard; `deploy.yml` und `watchdog.yml` erhöhen ihre Rechte selbst per `permissions:`.

## 6. Erste Prüfungen ohne Timer

```bash
sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check     # [run] authMethod=oauth_token (2.1.308 …); sonst laut Doku none, claude.ai, api_key, api_key_helper, third_party
sudo -u aipulse -H /opt/ai-pulse/server/run.sh --dry-run --fresh   # ohne Claude, Schatten-State .cache/dry/state/ leer, Ausgabe .cache/dry/<runId>/
sudo -u aipulse -H bash -lc 'set -a; . /etc/ai-pulse/env; set +a; cd /opt/ai-pulse && npm run smoke'   # → smoke-test.md
sudo -u aipulse -H /opt/ai-pulse/server/run.sh --limit 5        # 5 Meldungen an Claude (Abo), Ausgabe nach .cache/run/
```

Trockenlauf und `--limit`-Lauf sind Teilläufe: Sie schreiben nur nach `.cache/`, nie nach `state/` oder `public/data/`, und nutzen nie das API-Backend – auch wenn `AIPULSE_FALLBACK_API_KEY` in der Env-Datei steht. Der Smoke-Test schreibt nur nach `.cache/smoke/`.

## 7. GitHub-Seite (vor dem ersten vollen Lauf, sonst baut den ersten Daten-Push niemand)

1. Settings → Pages → Source „GitHub Actions".
2. `deploy.yml` vom PC nach `main` pushen. `watchdog.yml` erst nach dem ersten vollen Lauf (Schritt 8), sonst meldet er sofort „Server meldet sich nicht".
3. Im GitHub-Konto Actions-Benachrichtigungen einschalten.

## 8. systemd-Units

```bash
sudo install -m 644 /opt/ai-pulse/server/ai-pulse.service /opt/ai-pulse/server/ai-pulse.timer /etc/systemd/system/   # /opt/ai-pulse ist 750, darum absolute Pfade unter sudo
sudo systemd-analyze verify /etc/systemd/system/ai-pulse.service /etc/systemd/system/ai-pulse.timer
sudo systemctl daemon-reload
systemctl is-enabled systemd-networkd-wait-online.service NetworkManager-wait-online.service   # einer muss "enabled" sein
sudo systemctl start ai-pulse.service          # erster voller Lauf, blockiert bis zum Ende
journalctl -u ai-pulse -n 80 --no-pager        # Zusammenfassung, "fertig: pipeline=0 push=ok"
sudo systemctl enable --now ai-pulse.timer
systemctl list-timers ai-pulse.timer
systemd-analyze calendar '*-*-* 07,13,19:07:00 Europe/Berlin'
```

Nach dem ersten vollen Lauf: Auf GitHub gibt es einen `data:`-Commit, `deploy.yml` lief grün, die Seite zeigt den neuen Stand. Danach `watchdog.yml` pushen und testen (`workflows.md`).

Rechner ohne gepufferte Echtzeituhr (z. B. Raspberry Pi ohne RTC-Batterie): zusätzlich `sudo systemctl enable systemd-time-wait-sync.service`, damit der Nachhollauf nach dem Booten erst mit NTP-Zeit startet.

## Claude-Code-Update (bewusst)

```bash
sudo systemctl stop ai-pulse.timer
systemctl is-active ai-pulse.service                     # muss "inactive" sein, sonst Laufende abwarten
# Changelog lesen: Änderungen an -p, --safe-mode, --bare-Standard, JSON-Ausgabe (Skill claude-headless)
sudo mv /etc/claude-code/managed-settings.json /etc/claude-code/managed-settings.json.off
sudo -u aipulse -H bash -lc 'curl -fsSL https://claude.ai/install.sh | bash -s <neue-version>'
sudo mv /etc/claude-code/managed-settings.json.off /etc/claude-code/managed-settings.json
sudo -u aipulse -H /home/aipulse/.local/bin/claude --version
sudo -u aipulse -H /home/aipulse/.local/bin/claude doctor   # Version, Auto-updates disabled, keine Fehler
sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check
sudo -u aipulse -H bash -lc 'cd /opt/ai-pulse && npm test'  # Fixtures inkl. pipeline/test/fixtures/claude-cli/
sudo -u aipulse -H /opt/ai-pulse/server/run.sh --limit 5       # echter Kleinlauf, schreibt nach .cache/
sudo systemctl start ai-pulse.timer
```

- **Warum Beiseitelegen:** Der Installer lädt immer die neueste Binärdatei und ruft dann `claude install <version>` auf. `DISABLE_UPDATES` blockiert laut Doku auch `claude install`.
- **Danach:** Version und Datum in `server/setup.md` („Installierte Versionen") vom PC aus eintragen und committen.
- **Rückweg:** derselbe Ablauf mit der alten Versionsnummer.
- **Wann:** nicht öfter als nötig, etwa wenn ein neues Modell eine neuere Version verlangt, eine Sicherheitskorrektur erscheint oder ein Fehler behoben wird. Neue Modelle können eine Version jenseits von `stable` brauchen (Doku).

## Token-Erneuerung (jährlich)

Termin vormerken ≈ 11 Monate nach `AIPULSE_TOKEN_CREATED`. Spätestens löst der Hinweis `token` in `meta.json` (30 Tage vor Ablauf) Dashboard-Hinweis und Watchdog-Issue „Token erneuern" aus.

1. Auf dem PC mit Browser `claude setup-token` ausführen und das Token kopieren.
2. Auf dem Server `sudoedit /etc/ai-pulse/env`: `CLAUDE_CODE_OAUTH_TOKEN` ersetzen, `AIPULSE_TOKEN_CREATED` auf heute setzen.
3. `sudo -u aipulse -H /opt/ai-pulse/server/run.sh --auth-check` muss `oauth_token` melden.
4. Im selben Termin `AIPULSE_GITHUB_TOKEN` neu erzeugen (1 Jahr) und ersetzen.
5. Den Passwortmanager aktualisieren. Das Issue schließt sich nach dem nächsten Lauf von selbst.

## OS-Updates

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades       # Sicherheitsupdates automatisch
```

- In `/etc/apt/apt.conf.d/50unattended-upgrades` `Unattended-Upgrade::Automatic-Reboot "true";` und `Unattended-Upgrade::Automatic-Reboot-Time "03:30";` setzen. 03:30 liegt außerhalb der Läufe.
- Fiele ein Neustart doch in einen Termin, holt `Persistent=true` ihn nach.
- **Monatlich von Hand:** `sudo apt-get update && sudo apt-get upgrade` (enthält Node-24-Minor-Updates von NodeSource), danach `npm test` als `aipulse`, Journal des nächsten Laufs ansehen.
- **Unit-Änderungen aus dem Repo:** erneut kopieren, `daemon-reload`.

## Backups

| Was | Wie |
|---|---|
| `/home/aipulse/.local/share/ai-pulse/` | AGB-Snapshots, nicht wiederbeschaffbar: täglich sichern, z. B. restic/borg auf NAS oder Cloud, verschlüsselt |
| `/etc/ai-pulse/env` | Werte im Passwortmanager reichen; die Datei lässt sich aus `server/env.example` neu bauen |
| Deploy-Key | nicht sichern: neu erzeugen, alten Key in GitHub löschen, neuen eintragen |
| Units, `run.sh`, `managed-settings.json` | stehen im Repo bzw. in diesem Skill |
| `state/`, `public/data/` | liegen in Git auf GitHub |

Wiederherstellung auf neuer Hardware: Schritte 0–8, danach die Snapshots zurückspielen. Der erste Lauf holt bis 72 h nach.

## Docker-Variante (NAS)

Nur, wenn der Server ein NAS ohne systemd-Zugang ist.

- **Image:** Basis `node:24-bookworm-slim` (Debian/glibc, **nicht** Alpine – das braucht laut Doku zusätzlich bash, curl, libgcc, libstdc++ und ripgrep). Dazu `git`, `openssh-client`, `curl`, `ca-certificates`, `util-linux` und ein Benutzer `aipulse`, dessen UID zum Eigentümer der gemounteten Ordner passt.
- **Claude Code** beim Bauen als `aipulse` mit fester Version installieren (`bash -s <version>`). Danach `/etc/claude-code/managed-settings.json` mit `DISABLE_UPDATES` ins Image legen. Ein Update heißt: neues Image mit neuer Version bauen und dieselben Tests laufen lassen.
- **Mounts:** `/opt/ai-pulse` (Checkout), `/home/aipulse/.ssh` (nur lesend, `known_hosts` vorbefüllt), `/home/aipulse/.claude`, `/home/aipulse/.local/share/ai-pulse`. Secrets per `--env-file /pfad/zur/env` (gleiches `KEY=wert`-Format, ohne Anführungszeichen).
- **Takt:** Der Aufgabenplaner bzw. systemd-Timer des NAS startet zu denselben Zeiten `docker run --rm --name ai-pulse … /opt/ai-pulse/server/run.sh`. `--name` verhindert einen zweiten parallelen Container, der `flock` in `run.sh` bleibt zusätzlich.
- Ohne `Persistent=` deckt das Zeitfenster aus `state/runs.json` verpasste Termine ab.
- Die systemd-Härtung entfällt, die Isolation übernimmt der Container.
