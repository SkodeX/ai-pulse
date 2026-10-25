# UI-Texte, Labels und Icons (Plan)

Alle Texte deutsch, du-Form. Bezeichner und Werte englisch wie im Datenvertrag. Die Icon-Namen sind in `lucide-react` 1.61.0 vorhanden (geprüft in Space `node_modules`, 2026-10-24).

## Kategorien (`shared/categories.ts`)

Schlüssel und Anzeige exakt wie im Steckbrief. Der Kurzname steht nur auf Chips und in der BottomNav, die Überschrift nutzt die volle Anzeige.

| Schlüssel | Anzeige (Steckbrief) | Kurzname (Chip) | Icon |
|---|---|---|---|
| `modelle` | Modelle | Modelle | `Cpu` |
| `neuigkeiten` | Neuigkeiten | Neues | `Newspaper` |
| `sicherheit` | Sicherheitslücken | Sicherheit | `ShieldAlert` |
| `gesetze` | Gesetze & Regulierung | Recht | `Scale` |
| `vertraege` | Vertragsänderungen | Verträge | `FileText` |
| `ideen` | Innovative Ideen | Ideen | `Lightbulb` |
| `startups` | Aufstrebende Unternehmen | Startups | `Rocket` |
| `preise` | Preise & API-Änderungen | Preise | `Tag` |
| `opensource` | Open Source & Tools | Open Source | `Code` |
| `forschung` | Forschung & Benchmarks | Forschung | `FlaskConical` |
| `funding` | Funding & Übernahmen | Funding | `Banknote` |

Weitere Icons: Merken `Bookmark` / `BookmarkCheck` · Gelesen `Check` · Feedback `ThumbsUp` / `ThumbsDown` · Paywall `Lock` · Hype `Megaphone` · StaleBanner `TriangleAlert` · Kopfzeile „Update überfällig“ `ClockAlert` · Claude-Backend `Bot` · Hinweise `Info`, Art `token` `KeyRound`, Art `system` `CircleAlert` · Weitere Advisories auf-/zuklappen `ChevronDown` · externer Link `ExternalLink` · Suche `Search` · Filter `SlidersHorizontal` · iPhone-Hinweis `Share` · Heute `Sun` · Fristen `CalendarClock` · Radar `Radar` · Archiv `Archive` · Einstellungen `Settings` · Mehr `Menu`. (`ClockAlert`, `Bot`, `Info`, `KeyRound`, `CircleAlert`, `ChevronDown` in `lucide-react.d.ts` 1.61.0 von Space geprüft, 2026-10-24.)

## Labels für Datenwerte

| Feld / Wert | Text |
|---|---|
| Sortierung `score` / `impact` / `personal` | Gesamt / Tragweite / Für mich |
| Badge `impact`, `personal` | „Tragweite 8“, „Für mich 6“; `aria-label` „Tragweite 8 von 10“, „Für mich 6 von 10“ |
| `forYou` (Details) | „Für mich“ – dasselbe Label wie Sortierung und Badge; der Text selbst bleibt in Du-Form (Prompt im Skill `bewertung`) |
| `score` | „7,5“ (`toLocaleString('de-DE', { maximumFractionDigits: 1 })`) |
| `paywall: true` | „Paywall“, Tooltip „Artikel kostenpflichtig“ |
| `hype: true` | „Hype?“, Tooltip „Wirkt übertrieben – Einschätzung von Claude“ |
| `ratedBy: 'regel'` | „ohne KI bewertet“ |
| `run` `morning` / `midday` / `evening` / `weekly` | Morgenlauf 07:07 / Mittagslauf 13:07 / Abendlauf 19:07 / Wochenlauf So 19:07 (`weekly` erst ab Phase 5) |
| Briefing-Überschrift nach `kind` `morning` / `midday`, `evening` / `weekly` | „Das Wichtigste“ / „Seit heute früh“ / „Wochenrückblick“ |
| `model` `claude-opus-5-5` / `claude-haiku-5-5` | Claude Opus 5.5 / Claude Haiku 5.5 (Haiku beim Briefing = Notfall-Backend) |
| `model: 'regel'` (Regel-Briefing) / unbekannte ID | „ohne KI erstellt“ / ID unverändert anzeigen |
| `notices[].kind` `quelle` / `agb` / `recht` / `token` / `system` / unbekannt | Quelle / AGB / Recht / Abo-Token / System / Hinweis |
| `notices[].since` | „seit 20.10.“ (Vorjahr: „seit 20.10.2025“) |
| `security.severity` `critical` / `high` / `medium` / `low` | kritisch / hoch / mittel / niedrig |
| `security.exploited: true` | „wird aktiv ausgenutzt“ |
| `law.jurisdiction` `EU` / `DE` / `US` / `US-Staat` | EU / Deutschland / USA (Bund) / US-Bundesstaat |
| `law.status` | Label je `LawStatus` laut Tabelle in Skill `gesetze-und-fristen`, als `Record<LawStatus, string>` in `src/texts.ts` (Typ aus `shared/law.ts` erzwingt Vollständigkeit; nicht aus `pipeline/law/status.ts` importieren) |
| `law.statusSource` `'meldung'` oder fehlt | Zusatz „laut Meldung“ (Skill `gesetze-und-fristen`) |
| Frist mit `date: null` | „Datum prüfen“ |
| `terms.effectiveDate` | „gilt ab 20.11.2026“ |
| Quellen-Health `ok` / `degraded` / `blockiert` | ok / gestört / blockiert |
| Quelle `lang: 'en'` | Kürzel „EN“ hinter dem Namen |

Claude-Backend des letzten Laufs (`meta.budget.level`, Werte laut Steckbrief; Beträge über `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' })`, ergibt „1,20 $“):

| `level` | Text im Footer |
|---|---|
| `abo` | „Bewertet mit Claude (Abo)“; bei `apiUsdMonth > 0` Zusatz „· Notfall-API diesen Monat: 0,42 $ von 3,36 $“ |
| `api` | „Notfall-Modus: Claude Haiku über API · 1,20 $ von 3,36 $ diesen Monat“ |
| `aus` | „KI-Bewertung pausiert – Schlagzeilen mit Regel-Bewertung, Nachholen im nächsten Lauf“; mit `resetHint` Zusatz „· Abo wieder frei: <resetHint>“ |
| fehlt / unbekannt | Zeile weglassen |

Beträge immer aus `apiUsdMonth` und `apiUsdCap`, die Zahlen oben sind nur Beispiele.

## Knöpfe und Hinweise

- Karten: „Gelesen“ · „Als ungelesen markieren“ · „Merken“ / „Gemerkt“ · „Mehr davon“ (👍) · „Weniger davon“ (👎) · „Warum wichtig“ · „Für mich“ · „+3 Quellen“. Abgeblendete Karte nach 👎: kein Zusatztext, der Zustand steckt im gedrückten Knopf (`aria-pressed`, `aria-label` „Weniger davon – markiert“).
- Listen: „Filter“ · „Zurücksetzen“ · „Weitere 20“ · „Alle sichtbaren als gelesen“ · „Neue Meldungen – tippen zum Aktualisieren“ · Trefferzeile „24 Meldungen“.
- Weitere Advisories: Kopf des `<details>` „Weitere Advisories (14)“, Hilfetext „Ohne KI bewertet, nach Schweregrad-Regel. Nur Titel und Eckdaten.“ · Zeile auf Heute „+ 14 weitere Advisories“ · bei `level: 'aus'` über den Security-Karten „KI-Bewertung pausiert – alle Advisories als Karten.“
- Zeit: „vor 3 Std.“ (`Intl.RelativeTimeFormat('de', { numeric: 'auto', style: 'short' })`; ohne `style: 'short'` kommt „vor 3 Stunden“), absolut „Sa., 24.10., 13:07“ (`Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', … })`), Kopfzeile „Stand: Sa., 24.10., 13:07 · Mittagslauf“, ab 14 h „Stand: Sa., 24.10., 07:07 · Update überfällig“.
- StaleBanner (ab 24 h): „Die Daten sind älter als 24 Stunden (Stand: …). Der automatische Lauf ist vermutlich ausgefallen.“
- Leer: „Keine Meldungen für diese Filter.“ + Knopf „Filter zurücksetzen“ · „Noch nichts gemerkt. Tippe bei einer Meldung auf das Lesezeichen.“ · „Für diese Kategorie gibt es in den letzten 72 Stunden nichts.“
- Merken: Zähler „123 von 300 gemerkt“ · beim 301.: „Du hast schon 300 Meldungen gemerkt. Entferne ältere unter Gemerkt, dann klappt es.“
- Fehler: „Daten gerade nicht erreichbar.“ + „Erneut versuchen“ · „Offline · Stand …“ · „Speicher voll – lösche ältere Merkzettel.“
- Footer: Überschrift „Hinweise“ (nur wenn `notices` nicht leer) · Health-Sheet „Gestörte Quellen“, „abgedeckt durch …“, „Lange nichts Neues: …“ · „Quellcode auf GitHub“ · Rechtliches-Zeile „Impressum · Datenschutz“ erst nach Entscheidung des Nutzers (bis dahin keine Zeile, keine Platzhalter).
- Install-Hinweis (Muster aus Space): Überschrift „Als App installieren“. iPhone: „Öffne die Seite in Safari und tippe auf ‚Teilen‘.“ → „Wähle ‚Zum Home-Bildschirm‘.“ → „Tippe auf ‚Hinzufügen‘.“ Andere Browser: „Im Browsermenü findest du ‚App installieren‘ bzw. ‚Zum Startbildschirm hinzufügen‘.“ Installiert: „Läuft als App.“
- Einstellungen, Datenschutz-Zeile: „Gelesen und Gemerkt speichert nur dein Browser. Keine Cookies, kein Tracking, kein Konto.“ Ab Phase 6 zusätzlich: „👍/👎 gehen mit deinem Schlüssel an den Feedback-Dienst auf Cloudflare.“ Knopf „Lokale Daten löschen“ mit Rückfrage. Diese Zeile ersetzt keine Datenschutzerklärung (Entscheidung des Nutzers, siehe Footer in SKILL.md).
- Feedback-Token (Phase 6): Feld „Feedback-Schlüssel“, Hilfetext „Nur nötig, wenn du Meldungen mit 👍/👎 bewerten willst.“ Nach dem Speichern „Gespeichert“ zeigen, das Token nie im Klartext wieder anzeigen.

## Stilregeln

- Kurze Sätze (≤ 15 Wörter), Verben statt Substantivketten, keine Ausrufezeichen, kein Marketington.
- Anglizismen nur, wo sie Teil der Kategorienamen oder fest etabliert sind (Open Source, Funding, Paywall, Startups, Hype).
- Zahlen im deutschen Format (Komma), Datum TT.MM., Uhrzeit HH:MM, Zeitzone Europe/Berlin.
- Claude-Texte (`summary`, `whyImportant`, `forYou`, Briefing) unverändert als Text zeigen, nicht kürzen und nicht umformulieren.
