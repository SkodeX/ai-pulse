# GitHub-Workflows: `deploy.yml` und `watchdog.yml`

Zielstand Phase 3. Regeln stehen in `../SKILL.md`. Action-Versionen per GitHub-API geprüft am 2026-10-24: checkout v7.0.1, setup-node v7.1.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1 (Doku-Beispiele zeigen teils noch `@v4`, das ist veraltet). `timezone` an `schedule` gibt es seit 2026-03-19 (GitHub-Changelog „late March 2026 updates", Doku „Events that trigger workflows"). Vorlage für den Deploy ist `E:\Coding\Space\.github\workflows\deploy.yml`, ohne dessen Wochen-Cron und Datenschritt.

## `.github/workflows/deploy.yml`

```yaml
# Baut das Dashboard bei jedem Push auf main (Code vom PC, Daten vom Heimserver)
# und veröffentlicht es auf GitHub Pages (Skill job-betrieb)
name: Deploy

on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '.claude/**', 'server/**', 'worker/**', 'state/**', '**/*.md']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false         # laufenden Deploy nie abbrechen (GitHub-Vorlage); ein wartender Lauf wird durch den neuesten ersetzt

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build           # tsc (nur src/ + shared/) + vite build; Vite kopiert public/data/ nach dist/data/
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 10              # länger darf ein Pages-Deploy nicht dauern
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- **Server-Pushes lösen den Workflow aus.** Laut Doku erzeugen nur Ereignisse des `GITHUB_TOKEN` keinen neuen Lauf (außer `workflow_dispatch`/`repository_dispatch`). Ein Push per Deploy-Key ist ein normaler SSH-Push.
- **`paths-ignore`** greift nur, wenn **alle** geänderten Dateien passen. Ein Daten-Push (`public/data/` + `state/`) baut also immer; ein reiner `state/`-Commit (Fehllauf, nur Kostenbuch) baut nicht.
- **Vollständiges Artefakt:** Jeder Deploy ersetzt die ganze Site, das Artefakt muss deshalb alles enthalten.
- **Kein `npm run typecheck` (Pipeline, Worker) und keine Tests hier**, nur die Dashboard-Typprüfung im Build (`build`-Skript → Skill `dashboard-entwickeln`, `references/konfiguration.md`). Ein roter Pipeline-Test würde sonst auch frische Daten blockieren. Beides läuft lokal vor dem Code-Push und auf dem Server nach Updates.
- **Einmalig:** Settings → Pages → Source „GitHub Actions". Settings → Environments → `github-pages` → Deployment branches nur `main`.

## `.github/workflows/watchdog.yml`

```yaml
# Prüft alle 3 Stunden, ob der Heimserver frische Daten liefert, und meldet Probleme als Issue (Skill job-betrieb)
name: Watchdog

on:
  schedule:
    - cron: '23 */3 * * *'
      timezone: "Europe/Berlin"      # seit 2026-03-19; ohne Feld gilt UTC
  workflow_dispatch:
    inputs:
      max_age_h:
        description: 'Alarmgrenze in Stunden (leer = 14; zum Testen 0)'
        type: string
        default: ''

permissions:
  issues: write                      # alles andere ist none

concurrency:
  group: watchdog
  cancel-in-progress: false

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: meta.json prüfen
        shell: bash
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
          OWNER: ${{ github.repository_owner }}
          META_URL: https://skodex.github.io/ai-pulse/data/meta.json
          MAX_AGE_H: ${{ inputs.max_age_h }}
          UA: Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)
        run: |
          MAX_AGE_H=${MAX_AGE_H:-14}
          neu=0

          issue_nr() {   # offenes Issue mit exakt diesem Titel (ohne --search: der Suchindex hinkt nach)
            gh issue list --state open --limit 200 --json number,title \
              | jq -r --arg t "$1" '[.[] | select(.title == $t)][0].number // empty'
          }
          melden() {     # $1 Titel, $2 Text – neu öffnen (mit Erwähnung) oder still aktualisieren
            local nr; nr=$(issue_nr "$1")
            if [ -n "$nr" ]; then
              gh issue edit "$nr" --body "$2" > /dev/null
            else
              gh issue create --title "$1" --body "$2"$'\n\n'"@$OWNER" > /dev/null
              neu=1
            fi
          }
          entwarnen() {  # $1 Titel, $2 Kommentar
            local nr; nr=$(issue_nr "$1")
            if [ -n "$nr" ]; then gh issue close "$nr" --comment "$2" > /dev/null; fi
          }

          jetzt=$(date -u +%s)
          stand="Geprüft $(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M') (Berlin)."
          if meta=$(curl -fsS -m 20 -A "$UA" -H 'Cache-Control: no-cache' "$META_URL?ts=$jetzt") \
             && gen=$(printf '%s' "$meta" | jq -er '.generatedAt'); then
            alter_min=$(( (jetzt - $(date -u -d "$gen" +%s)) / 60 ))
            if [ "$alter_min" -gt $(( MAX_AGE_H * 60 )) ]; then
              melden "Server meldet sich nicht" "Letzter Stand \`$gen\`, vor $(( alter_min / 60 )) h (Grenze $MAX_AGE_H h). Auf dem Server: \`systemctl list-timers ai-pulse.timer\`, \`journalctl -u ai-pulse -n 80 --no-pager\`. Ist Actions → Deploy rot, liegt es am Build. $stand"
            else
              entwarnen "Server meldet sich nicht" "Wieder frisch: \`$gen\`. $stand"
            fi
          else
            meta=""
            melden "Server meldet sich nicht" "meta.json nicht abrufbar oder ohne \`generatedAt\` ($META_URL). Erst Actions → Deploy prüfen, dann den Server. $stand"
          fi

          if [ -n "$meta" ]; then
            stufe=$(printf '%s' "$meta" | jq -r '.budget.level // "?"')
            if [ "$stufe" = aus ]; then
              hinweis=$(printf '%s' "$meta" | jq -r '.budget.resetHint // ""')
              melden "Claude-Bewertung aus" "\`budget.level\` ist \`aus\`: Abo-Limit oder Login-Fehler, Notfall-Budget leer oder kein Key. Die Seite zeigt Rohschlagzeilen mit Regel-Score. $hinweis $stand"
            else
              entwarnen "Claude-Bewertung aus" "Bewertung läuft wieder (\`budget.level\` = \`$stufe\`). $stand"
            fi
            token=$(printf '%s' "$meta" | jq -r '[.notices[]? | select(.kind == "token") | .text] | join(" · ")')
            if [ -n "$token" ]; then
              melden "Token erneuern" "$token – Ablauf: Skill job-betrieb, Abschnitt Wartung (Token-Erneuerung). $stand"
            else
              entwarnen "Token erneuern" "Kein Token-Hinweis mehr. $stand"
            fi
          fi

          if [ "$neu" = 1 ]; then echo "::error::Neuer Alarm – siehe Issues"; exit 1; fi
```

- **Takt:** `23 */3 * * *` Berliner Zeit ergibt 00:23, 03:23 … 21:23. Ein ausgefallener Morgenlauf (Stand vom Vorabend ≈ 19:20) fällt um 09:23 auf (14,05 h). Ein ausgefallener Mittagslauf fällt nur auf, wenn auch der Abendlauf fehlt. Das ist gewollt, ein einzelner Aussetzer heilt sich durch das Nachholen.
- **Benachrichtigung:** Ein neues Issue erwähnt `@SkodeX` und macht den Lauf rot (Fehler-Mail an die Person, die die Cron-Zeile zuletzt geändert hat). Solange der Fehler besteht, ändert der Watchdog den Text nur still, es gibt keine Mail-Serie. Entwarnung: Kommentar und Schließen.
- **`MAX_AGE_H` als String-Input:** Bei `schedule` ist er leer, dann gilt der Standard 14 in bash. Ein `number`-Input mit `${{ inputs.x || 14 }}` würde den Testwert 0 verschlucken.
- **`GH_REPO`:** Damit arbeitet `gh` ohne Checkout. `gh` und `jq` sind auf `ubuntu-latest` vorinstalliert.
- **`?ts=`** umgeht den CDN-Cache von Pages (`max-age=600`).
- **60-Tage-Regel:** Der Watchdog ist der einzige geplante Workflow. Die Daten-Pushes des Servers halten das Repo aktiv.

## Was löst was aus

| Ereignis | `deploy.yml` | `watchdog.yml` |
|---|---|---|
| Daten-Push vom Server (3× täglich) | Build + Deploy | – |
| Code-Push vom PC | Build + Deploy (außer nur Doku/Skills/`server/`/`worker/`) | – |
| `workflow_dispatch` | Build + Deploy | Prüfung (optional mit `max_age_h`) |
| `schedule` alle 3 h | – | Prüfung |

## Grenzen von GitHub Pages

- Die Site darf höchstens 1 GB groß sein, das weiche Bandbreitenlimit liegt bei 100 GB pro Monat (bei Überschreitung 429). Keine kommerzielle Nutzung.
- Ein Deploy darf höchstens 10 min dauern. Das Limit von 10 Builds pro Stunde gilt nicht für eigene Actions-Workflows; 3 Daten-Deploys pro Tag plus Code-Pushes sind unkritisch.
- JSON kommt mit `Cache-Control: max-age=600`. Ohne `cache: 'no-cache'` im Dashboard können Daten bis zu 10 min alt sein → Skill `dashboard-entwickeln`.

## Testen nach dem Einrichten

1. `deploy.yml` per Dispatch starten: grün, die Pages-URL zeigt die Seite.
2. Watchdog per Dispatch mit `max_age_h=0` starten: Issue „Server meldet sich nicht" mit Erwähnung, Lauf rot, Mail kommt an.
3. Watchdog per Dispatch ohne Input: Das Issue wird mit Kommentar geschlossen, der Lauf ist grün.
4. Lokal (falls `gh` angemeldet): `gh run list --workflow watchdog.yml -L 3`, `gh run view <id> --log-failed | tail -40`. Ausgaben immer kürzen.
