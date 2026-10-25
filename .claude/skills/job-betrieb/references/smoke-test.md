# Smoke-Test auf dem Server (`npm run smoke`)

Die **einzige Spezifikation** des Tests (Auswahl der Quellen, Abruf über `pipeline/collect/` mit Node-`fetch`, Felder je URL, Urteile `ok`/`blockiert`/`fehler`/`unerwartet`, Berichtsformat, Abnahmeregel, optionaler UA-Vergleich) steht in Skill `quellen`, § 11. Hier steht nur, wie er auf dem Heimserver läuft. Noch ist nichts davon gebaut (`pipeline/smoke.ts` ist geplant).

## Warum vom Server

Die Recherche hat am 2026-10-24 vom Windows-PC (Privat-IP) gemessen, und dort unterschieden sich die Clients: Mit curl kamen die Kernquellen durch, mit Node-`fetch` und demselben Steckbrief-UA bekamen `chatgpt-release-notes` (help.openai.com, `cf-mitigated: challenge`) und `xai-sitemap` (x.ai, „Attention Required!") 403 (Details: Skill `quellen`, Fallen). Beide stehen deshalb mit `startStatus: 'blockiert'` im Register und zählen im Nenner mit (Steckbrief, `references/entscheidungen.md`). Der Server kann an einem anderen Anschluss hängen (anderer Provider, CGNAT) und läuft unter Linux. Maßgeblich ist darum seine Messung mit dem Client des Jobs.

## Wann

- **Phase 1 (PC):** `npm run smoke` lokal zur Orientierung.
- **Phase 3 (Server):** nach der Einrichtung (`server-setup.md`, Schritt 6), vor dem ersten Timer-Lauf: drei Durchläufe, etwa 08:30, 14:30 und 20:30 Berliner Zeit, mindestens einer an einem Werktag. **Nie** in den Laufterminen (07, 13, 19 Uhr, jeweils :07 bis etwa :40), sonst teilen sich Smoke und Lauf die Rate-Limits je Host.
- **Später:** nach dem Anbinden einer neuen Quelle (nach dem Deploy, mit `--only <id>`), nach einem Wechsel von Anschluss oder Hardware und wenn Health mehrere Quellen gleichzeitig als `blockiert` meldet.

## Befehle (als `aipulse`, mit Env-Datei)

Die Env-Datei wird geladen, damit api.github.com mit `AIPULSE_GITHUB_TOKEN` läuft (5.000 statt 60 Anfragen/h). Der Test ruft kein Claude auf und schreibt nie nach `state/`; den Lock von `run.sh` braucht er nicht.

```bash
# voller Durchlauf
sudo -u aipulse -H bash -lc 'set -a; . /etc/ai-pulse/env; set +a; cd /opt/ai-pulse && npm run smoke'
# nur einzelne Quellen (kommagetrennte Register-IDs)
sudo -u aipulse -H bash -lc 'set -a; . /etc/ai-pulse/env; set +a; cd /opt/ai-pulse && npm run smoke -- --only xai-sitemap,chatgpt-release-notes'
# optional: UA-Vergleich mit der Kurzform (quellen § 11)
sudo -u aipulse -H bash -lc 'set -a; . /etc/ai-pulse/env; set +a; cd /opt/ai-pulse && npm run smoke -- --ua kurz'
# Kopf des neuesten Berichts ansehen
sudo -u aipulse -H bash -lc 'cd /opt/ai-pulse && d=$(ls -1d .cache/smoke/*/ | tail -n 1) && head -n 60 "${d}report.md"'
```

## Wo der Bericht landet

- `/opt/ai-pulse/.cache/smoke/<JJJJ-MM-TT-HHMM>/` mit `report.md` (erste Zeile: Quote der Kernquellen), `report.json` und `heads/<id>.txt`. Gitignored, nie committen. Form → `quellen` § 11.
- Nur gekürzt ansehen (`head`), nie ganze Antwortkörper ins Terminal oder in den Chat.
- Alte Ordner gelegentlich löschen (Platte voll → `ausfaelle.md`).

## Ergebnisse eintragen

- Abnahme nach `quellen` § 11 (erreichbar = in 2 von 3 Durchläufen `ok`; ≥ 90 % der `core`-Quellen, sonst braucht jede nicht erreichbare Quelle einen greifenden Fallback).
- Je Kernquelle in `quellen/references/kernquellen.md` (Spalte „Server"), in die Fallback-Matrix (`quellen` § 7) und als Startwerte für `state/sources-health.json`.
- In `../SKILL.md`, Abschnitt „Nach dem Bauen": Datum, Quote der drei Durchläufe, ggf. UA-Ergebnis. Einen UA-Unterschied dem Nutzer vorlegen (Steckbrief-Standardwert „User-Agent").
