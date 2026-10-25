---
name: sparsam-testen
description: Token- und kontingentsparend prüfen, ob eine Änderung an AI Pulse funktioniert – Trockenlauf, Fixtures, Typprüfung → Build → Vorschau, Browser-Pane per DOM/JS. Laden, bevor du den Job lokal startest oder die App im Browser-Pane testest.
---

# Sparsam testen

Ziel: dieselbe Gewissheit mit möglichst wenig Kontext und ohne unnötigen Claude-Verbrauch. Screenshots sind teuer, Text ist billig – und jeder echte Claude-Aufruf verbraucht Abo-Kontingent, das sich der Job mit dem Nutzer teilt. Das Notfall-Backend (API, kostet Geld) nutzen Test- und Teilläufe nie (Steckbrief).

## Sammeljob (pipeline/)

1. `npm run typecheck` – fängt die meisten Fehler. Ausgabe mit `| tail -30` kürzen.
2. **Trockenlauf ohne Claude:** `npm run collect -- --dry-run` (sammelt, filtert, clustert, schreibt nach `.cache/dry/` statt `public/data/` und `state/`, ruft keine API). Ausgabe ist eine Zusammenfassung (Anzahl je Quelle/Kategorie, Fehlerliste), nie die Meldungen selbst.
3. **Einzelne Quelle prüfen:** `--only <quellen-id>` statt alle Quellen abzurufen.
4. **Bewertung testen:** `--limit 5` (nur fünf Meldungen an Claude, über die lokal angemeldete Claude-Code-CLI) – erst danach einen vollen Lauf. Volle Läufe nur auf dem Server (Skill `job-betrieb`); lokale Testläufe schreiben nach `.cache/` und committen nichts. Den Notfall-Backend-Pfad mit `AIPULSE_SIMULATE_LIMIT=1` testen, nicht mit echtem Limit (Skill `claude-headless`).
5. **Fixtures statt Netz:** gespeicherte Antworten unter `pipeline/test/fixtures/` für Parser-, Filter- und Clustering-Tests (`npm test`), damit Tests weder Netz noch API brauchen.

## Web-App

1. `npm run typecheck` zuerst.
2. Nur wenn die Änderung sichtbar ist: Dev-Server über `preview_start` (Name aus `.claude/launch.json`), nie per Bash starten.
3. Vor dem Abschluss einer Phase einmal `npm run build` + die Vorschau-Konfiguration aus `.claude/launch.json` – der Dev-Server kann veraltete Module liefern.
4. Die App liest `public/data/*.json`. Für UI-Tests reichen die dort committeten Stände (der Trockenlauf schreibt nur nach `.cache/dry/`) – keinen echten Lauf nur fürs Aussehen starten.

## Im Browser-Pane

- **Zuerst Text:** `get_page_text` oder `find` für gezielte Elemente. `read_page` nur mit `ref_id`/`depth`, nie den ganzen Baum.
- **Zustand per JS abfragen** statt hinzusehen, z. B. `document.querySelectorAll('[data-story]').length`, aktiver Filter, Fehler in `window.__lastError`. Ergebnisse knapp zurückgeben (Zahlen, kurze Arrays), nie ganze Objekte.
- **Debug-Variablen am `window`** (z. B. `window.__pulse`) einmal anlegen: geladene Datenversion, Anzahl Meldungen, aktive Filter.
- **Konsole:** `read_console_messages` mit `onlyErrors: true`. Server-Logs (`preview_logs`) nur mit `search` und `lines: 3`.
- **Netz:** `read_network_requests` mit `urlPattern: "data/"`, Antworttexte nur bei Bedarf.
- **Screenshots** nur für Optik und dann mit `scale: 0.5`. Mehrere Schritte in einem `browser_batch` bündeln.
- Handy-Ansicht: `resize_window` mit `preset: "mobile"`, danach wieder `"desktop"`.

## Fallen

- **Service Worker** liefert alte Builds oder alte Daten: vor dem Neuladen der Vorschau `navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))` und `caches.keys().then(k => k.forEach(c => caches.delete(c)))`. Daten-JSON muss im Service Worker „NetworkFirst“ sein, nie im Precache.
- Zustand, der nur beim Laden gelesen wird (Filter aus der URL): `navigate` **plus** `location.reload()` per JS – ein reiner Hash-Wechsel lädt nicht neu.
- Versteckter Browser-Pane drosselt Timer und `requestAnimationFrame` → Screenshots hinken hinterher, Zustand per JS prüfen.

## Was du NICHT tun musst

- Dateien nach `Edit`/`Write` nicht zur Kontrolle neu lesen – das Werkzeug meldet Fehler selbst.
- Nicht jede Kleinigkeit im Browser prüfen; bei reiner Logik reicht die Typprüfung oder ein Test mit Fixtures.
