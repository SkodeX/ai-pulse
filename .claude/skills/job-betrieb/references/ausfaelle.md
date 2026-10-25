# Ausfälle und Gegenmaßnahmen

Zielstand Phase 3. Regeln stehen in `../SKILL.md`, Befehle in `server-setup.md`, die Exit-Codes von `run.sh` in `server-dateien.md`. Erst das Journal ansehen (`journalctl -u ai-pulse -n 80 --no-pager`), Ausgaben immer kürzen.

| Fall | Symptom | Verhalten | Was tun |
|---|---|---|---|
| Kein Internet | Exit 10, „git pull fehlgeschlagen" im Journal | nichts geschrieben, nächster Termin holt nach (Fenster ≤ 72 h) | Netz prüfen; nach > 14 h Watchdog-Issue |
| Push abgelehnt | „Push abgelehnt (Versuch n)" | 3× Rebase + Push; danach Exit 30, Commit bleibt lokal | meist erledigt sich das von selbst. Bei „Rebase-Konflikt" (jemand hat `state/`/`public/data/` geändert): als `aipulse` `git fetch && git reset --hard origin/main`. Damit sind die Daten dieses einen Laufs verworfen, der nächste holt das Fenster nach. Ohne Eingriff scheitern alle Folgeläufe mit Exit 10, weil der lokale Commit weiter kollidiert |
| Deploy-Key ungültig | „Permission denied (publickey)", Exit 10/30 | jeder Lauf scheitert am Pull | `sudo -u aipulse -H ssh -T git@github-ai-pulse` muss „successfully authenticated" melden; Key in GitHub prüfen oder neu anlegen |
| Anmeldung kaputt | Warnung `authMethod=…` bzw. `authentication_failed` | Notfall-Backend, sonst Regel-Scores; Hinweis `token` → Watchdog-Issue | `run.sh --auth-check`; Token erneuern; auf fremde `ANTHROPIC_*` prüfen (Grep-Check in `../SKILL.md`, Secrets) |
| Abo-Limit | „You've hit your … limit" (Skill `claude-headless`) | voller Lauf: Rest über das Notfall-Backend (`budget.level: 'api'`), Budget leer → `aus`; Teilläufe nutzen nie das API-Backend → Regel | abwarten (Reset-Zeit in `meta.json`); bei `aus` Watchdog-Issue; eigene Claude-Code-Nutzung zur Laufzeit meiden |
| Platte voll | „No space left on device", Exit 20/30 | alter Stand bleibt | `df -h /opt /home /var`; `journalctl --vacuum-size=200M`, `npm cache clean --force`, `git gc`, alte `.cache/smoke/` und `.cache/dry/<runId>/` löschen |
| Stromausfall | verwaistes `.git/index.lock` oder halber Rebase | `run.sh` räumt unter dem Lock auf; `Persistent=true` holt nach | nichts, nach dem Booten `list-timers` und Journal ansehen |
| Hänger | kein Ende, `systemctl status` zeigt `activating` | Deadline 30 min mit Zeitreserve fürs Briefing, harte Grenze `TimeoutStartSec=45min`, dann Abbruch durch systemd (Ergebnisse verloren, kein Push) | Journal; Claude-Aufrufe mit Timeout prüfen; gemessene Laufdauer gegen die Rechnung in `../SKILL.md` halten |
| Token-Ablauf | Hinweis 30 Tage vorher, Watchdog-Issue „Token erneuern" | ab Ablauf wie „Anmeldung kaputt" | Token-Erneuerung (`server-setup.md`) |
| Build kaputt | Deploy rot, Pages alt → Watchdog „Server meldet sich nicht" | Server pusht weiter | zuerst Actions → Deploy ansehen, dann den Server |
