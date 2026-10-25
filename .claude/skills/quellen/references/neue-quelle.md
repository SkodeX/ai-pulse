# Neue Quelle anbinden

Ausgelagert aus `SKILL.md` (§ 10). Gilt für allgemeine Quellen; Security, Recht, AGB und Modelle haben eigene Listen in ihren Skills, nutzen aber dieselben Schritte 2–3 und 6–9.

1. **Zuständigkeit** prüfen und [nicht-nutzen.md](nicht-nutzen.md) lesen – Reddit, Google News und die Product-Hunt-API sind verboten (Steckbrief), viele Feeds sind tot oder stale.
2. **Abruf prüfen** in Git Bash (vorher `windows-shell-fallen` laden), zweimal direkt hintereinander (Burst) und einmal bedingt (304?):
   ```bash
   UA='Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)'; D="<Scratchpad>"
   curl -sL -m 20 -A "$UA" -D "$D/h.txt" -o "$D/b.bin" -w '%{http_code} %{size_download} %{content_type} %{url_effective}\n' "URL"
   grep -i -E '^(cf-mitigated|x-vercel-mitigated|server|etag|last-modified):' "$D/h.txt"; head -c 300 "$D/b.bin"
   curl -s -m 20 -A "$UA" -H 'If-None-Match: <etag>' -o /dev/null -w '%{http_code}\n' "URL"
   ```
3. **Zusätzlich mit Node-`fetch` prüfen** – curl-200 heißt nicht Node-200 (24.10.: openai.com/policies, x.ai/legal, x.ai/sitemap.xml, help.openai.com → curl 200, Node 403). Sobald gebaut: `npm run smoke -- --only <id>`; vorher ein Skript per `Write` in den Scratchpad legen und `node <pfad> URL` ausführen: `fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) })`, ausgeben nur Status, Bytes, `cf-mitigated`, `server`, Challenge-Treffer (`SKILL.md` § 4), `res.url`. Node 403 → nur mit Fallback und `startStatus: 'blockiert'` aufnehmen; nie den Client wechseln.
4. **Frische:** neuestes Item < 60 Tage alt, sonst nicht aufnehmen. Items/30 Tage und KI-Quote der Titel zählen: reines KI-Medium (≥ ~70 %) → `aiOnly`, sonst Filter.
5. **HTML:** Daten im Roh-HTML (nicht erst per JS)? robots.txt erlaubt den Pfad?
6. **Registereintrag** mit `id` (GitHub: `gh-<name>`, bei Kollision `gh-<owner>-<name>`), `role`, `outlet` (falls das Haus schon vertreten ist), `fallbacks` (Pflicht bei Cloudflare/Akamai-Hosts, nur existierende IDs), `notes` mit Prüfdatum.
7. **Fixture** `pipeline/test/fixtures/<id>.<xml|json|html>` (≤ 50 KB, gekürzt: Struktur, Titel, Links bleiben, Beschreibungen als Platzhalter) + Parser-Test; `npm test`. htmldiff: `container`/`dateRe` an dieser Fixture festlegen.
8. **Trockenlauf** `npm run collect -- --only <id>` – Zeile in `report.md` prüfen (Urteil, roh/gefiltert, Verwerfungsgründe); bei Sitemap, htmldiff und github ist der erste Abruf nur Baseline, also einen zweiten Lauf später ansehen.
9. **Nachtragen:** Zeile in [kernquellen.md](kernquellen.md) (Register und Skill sofort); `npm run smoke` nimmt die Quelle automatisch mit; CC-BY o. Ä. → `credits` in `meta.json`.
