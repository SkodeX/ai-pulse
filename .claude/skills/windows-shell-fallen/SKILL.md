---
name: windows-shell-fallen
description: Fallen der Bash- und PowerShell-Werkzeuge auf diesem Windows-PC – Heredocs, cat, Pfade, Arbeitsverzeichnis, Ausgabelänge, curl-Timeouts, Git. Laden, bevor du mehrzeilige Shell-Befehle, node-Einzeiler oder curl-Abfragen schreibst.
---

# Windows-Shell-Fallen

Jeder fehlgeschlagene Befehl kostet eine Runde. Diese Regeln vermeiden die bekannten.

## Bash-Werkzeug (Git Bash)

- **Arbeitsverzeichnis wird nach jedem Aufruf zurückgesetzt.** `cd` gilt nur innerhalb desselben Befehls; besser absolute Pfade. Beobachtet am 2026-10-24: ein `cd` in einen Unterordner kann auch das Arbeitsverzeichnis der Sitzung verschieben (relative Dateilinks zeigen dann ins Leere) → kein `cd`, sondern Pfade wie `/e/Coding/Newsletter_AI/...` direkt angeben.
- **Pfade:** in Bash `/e/Coding/Newsletter_AI/...`, in Datei-Werkzeugen (`Read`, `Write`, `Edit`) `E:\Coding\Newsletter_AI\...`. Pfade mit Leerzeichen immer in Anführungszeichen.
- **Nie mit einem nackten `cat > datei` beginnen** – ohne Heredoc wartet es auf stdin und hängt bis zum Timeout. Dateien mit `Write` erzeugen.
- **Mehrzeilige `node -e`/Heredocs mit Backslashes oder gemischten Anführungszeichen brechen.** Stattdessen das Skript mit `Write` in den Scratchpad legen und `node <pfad>` ausführen.
- **Ausgaben kürzen:** `| head -40`, `| tail -30`, `curl -s -o datei` + `head -c 500 datei`. Nie große JSON- oder Feed-Antworten ungefiltert ausgeben.
- `curl` immer mit `-m 20` (Timeout) und `-L` (Weiterleitungen), sonst hängt ein toter Server den Aufruf auf. Statuscode separat: `-w "%{http_code}\n" -o datei`.
- Lange Läufe (Sammeljob lokal, `npm install`) mit `run_in_background` starten, nicht pollen.
- **TypeScript direkt mit Node** (`node datei.ts`, Node 24.20 auf diesem PC) geht nur mit „löschbarer“ Syntax: keine Parameter-Properties (`constructor(private x)`), keine Enums/Namespaces, Typ-Importe als `import type`. Die Job-Skripte in `pipeline/` entsprechend schreiben.
- `sed -i` mit `\n` im Ersetzungstext funktioniert (GNU sed), mehrzeilige *Suchmuster* aber nicht – dafür `Edit` nutzen.
- Node liegt unter `C:\Program Files\nodejs` (in Bash `/c/Program Files/nodejs`). `gh` ist installiert und als `SkodeX` angemeldet.

## PowerShell-Werkzeug (Windows PowerShell 5.1)

- Kein `&&`/`||` → `A; if ($?) { B }`.
- Kein `2>&1` bei nativen Programmen (macht aus stderr Fehler-Objekte).
- `Set-Content` schreibt ANSI → für Dateien `-Encoding utf8` oder gleich `Write` nutzen.
- Für git, npm, curl und Dateisuche lieber das Bash-Werkzeug; PowerShell nur für Windows-Spezifisches.

## Git

- Zeilenenden über `.gitattributes` (`* text=auto eol=lf`) festlegen, sonst entstehen CRLF-Diffs – wichtig, weil der Job auf dem Linux-Heimserver dieselben Datendateien schreibt.
- Commit-Nachrichten mit mehreren Zeilen: `git commit -F <datei im scratchpad>` statt verschachtelter Anführungszeichen.
- Der Sammeljob committet selbst nach `public/data/` und `state/`. Vor eigenem Push immer `git pull --rebase`, sonst gibt es Konflikte mit Job-Commits.
