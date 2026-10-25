# Rechtsquellen – Vorlage fürs Register (Stand 2026-10-24)

Alle URLs am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA geprüft (Katalog `docs/recherche/2026-10-24/katalog/recht.md` + Nachprüfung beim Schreiben dieses Skills). Der Job läuft auf dem Heimserver (ebenfalls Privat-IP, Skill `job-betrieb`); trotzdem erst nach dem ersten `npm run smoke` dort als „erreichbar“ werten. Abruf, ETag, Challenge-Erkennung, Circuit-Breaker und Parser-Mechanik → Skill `quellen`.

- **IDs** sind Vorschläge für `pipeline/config/sources.ts`.
- **Takt** = `cadence` aus `quellen`: `3x` = jeder Lauf (07:07/13:07/19:07), `daily07` = einmal täglich (07:07-Lauf), `weekly` = wöchentlich. Was die Recherche „monatlich“ nennt, läuft hier auf `weekly` (ein GET mit ETag kostet nichts, das Register kennt nur diese drei Werte).
- **Filter** = Titel-Regex der Quelle (Recherche), zusätzlich zum allgemeinen Rechts-Filter aus SKILL.md. „alle“ = reine KI-/Rechtsquelle ohne Filter.
- **Status** = woher `law.status` kommt: Wert = deterministisch aus der Quelle, „Claude“ = Vorschlag aus Fließtext (`statusSource: 'meldung'`).

## EU (`jurisdiction: 'EU'`)

| ID | URL | Filter | Datum / Eigenheit | Takt | Status |
|---|---|---|---|---|---|
| `eu-dsm-rss` | `https://digital-strategy.ec.europa.eu/en/rss.xml` | AI Act\|AI Office\|artificial intelligence\|GPAI\|general-purpose\|code of practice\|AI Board\|Scientific panel\|harmonised standard\|Digital Omnibus | nur 10 Items, `?topic=` wird ignoriert | 3x | Claude |
| `eu-dsm-ai-html` | `https://digital-strategy.ec.europa.eu/en/news?topic=119` | alle (nur KI) | Titel in `.ecl-content-block__title span`; Backfill, falls das 10er-RSS Items verliert | daily07 | Claude |
| `eu-aiact-timeline` | `https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act` | – | Fristenquelle; Datum `02 Aug 2026`; `**` markiert Omnibus-Änderungen | weekly | Fristen-Abgleich |
| `eurlex-oj-l` | `https://eur-lex.europa.eu/EN/display-feed.rss?rssId=222` | artificial intelligence\|2024/1689\|AI Act\|general-purpose AI\|AI system | ~50–100 Akte/Werktag, Titel `CELEX:3…: Akttitel`, `description` leer | 3x | `verkuendet` |
| `cellar-sparql` | `https://publications.europa.eu/webapi/rdf/sparql` (POST) | Rechtsgrundlage CELEX `32024R1689` | Ersatz für die WAF-geschützten EUR-Lex-Seiten | weekly | `verkuendet` |
| `eu-aiact-substack` | `https://artificialintelligenceact.substack.com/feed` | alle | 321 KB Volltext → Teaser ≤ 300 Zeichen; Cloudflare, bei Fehler auslassen | 3x | Claude |
| `ep-press` | `https://www.europarl.europa.eu/rss/doc/press-releases/en.xml` | artificial intelligence\|AI Act\|\bAI\b\|algorithm\|deepfake\|Digital Omnibus\|copyright\|chatbot | 20 Items; Ausschuss-Feeds (IMCO) = Amendment-Rauschen | 3x | Claude |
| `oeil-watch` | `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=<ref>` | Watchlist `pipeline/law/procedures.ts` | Redirect auf `oeil.europarl.europa.eu`; 170 KB; nur Stage + Key events diffen | weekly | strukturiert |
| `council-press` | `https://www.consilium.europa.eu/en/rss/pressreleases.ashx` | artificial intelligence\|AI Act\|Digital Omnibus\|\bAI\b; Blacklist Forward look\|Media advisory | Datum nur in `a10:updated`; Cloudflare | 3x | Claude |
| `ec-presscorner` | `https://ec.europa.eu/commission/presscorner/api/rss?language=en&pagesize=50` | Rechts-Filter; Blacklist Daily News, Reden | ohne `pagesize` nur 10 Items; `search=` wird ignoriert | 3x | Claude |
| `edpb-news` | `https://www.edpb.europa.eu/feed/news_en` | AI\|artificial intelligence\|LLM\|model\|OpenAI\|chatbot\|Meta\|Google | 10 Items; Stellungnahmen, DPA-Bußgelder | 3x | Claude (`aufsicht`/`leitlinie`) |
| `eu-hys` | `https://ec.europa.eu/info/law/better-regulation/brpapi/searchInitiatives?text=artificial%20intelligence&size=100&language=EN` | – | undokumentiert; `sort=` → 406; Relevanz-Sortierung (mit `size=10` fehlen die neuen Initiativen), `size=100` holt alle 20 Treffer (85 KB); Felder in `currentStatuses[]` | weekly | `konsultation` |
| `cjeu-press` | `https://curia.europa.eu/site/jcms/d2_5158/en/press-releases` | artificial intelligence\|C-806/24\|Like Company\|copyright\|data protection\|algorithm\|Bytedance\|Meta\|Google | 934 KB → nur Titelzeilen; kein RSS | daily07 | `urteil`/`anhoerung` |
| `rapporteur-tech` | `https://www.rapporteur.com/sections/tech/feed/` | Rechts-Filter | ex Euractiv (Redirect); 100 Items, teils Paywall; Cloudflare; steht nicht in der Presse-Liste von `quellen` → Eintrag pflegt dieser Skill | 3x | Claude |
| `eu-gpai-code` | `https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai` | – | Diff des Hauptinhalts | weekly | `leitlinie` |
| `eu-ai-framework` | `https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai` | – | Diff des Hauptinhalts | weekly | Claude |
| `aiact-eu-timeline` | `https://artificialintelligenceact.eu/implementation-timeline/` | – | Sekundärquelle, 340 KB, Cloudflare; nur Gegencheck zur Service-Desk-Timeline | weekly | – |

## Deutschland (`jurisdiction: 'DE'`, Länder mit `region`)

| ID | URL | Filter | Datum / Eigenheit | Takt | Status |
|---|---|---|---|---|---|
| `bnetza-pm` | `https://www.bundesnetzagentur.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed_Pressemitteilungen.xml?nn=693926` | KI\|Künstliche Intelligenz\|KI-Verordnung\|KI-MIG\|AI Act\|Data Act | kein `pubDate` → Datum aus Link `…/DE/2026/20261020_….html`; Links `http://`; ohne `?nn=693926` 404 | 3x | Claude |
| `bnetza-aktuelles` | `https://www.bundesnetzagentur.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed_Aktuelles_neu.xml?nn=693926` | wie `bnetza-pm` | 50 Items | 3x | Claude |
| `bnetza-ki-desk` | `https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/start_ki.html` | – | nur Abschnitt „Aktuelles“ diffen (Marktüberwachung, Beschwerdestelle, Leitfäden) | weekly | `leitlinie` |
| `bmds-rss` | `https://bmds.bund.de/feed/rss.xml` | KI\|Künstliche Intelligenz\|KI-Verordnung\|KI-MIG\|Rechenzentr\|Gigafactory\|Deutschland-Stack | 10 Items, ~3/Woche | 3x | Claude |
| `bt-hib-digitales` | `https://www.bundestag.de/static/appdata/includes/rss/digitales.rss` | KI\|Künstliche Intelligenz\|Sprachmodell\|Algorithm | kein `pubDate` → first-seen; 2. `<category>` = Stadium (`Gesetzentwurf`, `KleineAnfrage`, `Antwort`, `Tagesordnung`); PDF-Tagesordnungen verwerfen | 3x | `Gesetzentwurf` → `entwurf`, sonst Claude |
| `dip-vorgang` | `https://search.dip.bundestag.de/api/v1/vorgang` | `f.deskriptor`, `f.aktualisiert.start`, `f.drucksache`, `f.kom` | nur mit `DIP_API_KEY`; Cursor-Paginierung | daily07 | strukturiert |
| `bgbl-1` | `https://www.recht.bund.de/rss/feeds/rss_bgbl-1.xml?nn=211452` | Künstliche Intelligenz\|KI-\|2024/1689\|Marktüberwachung und Innovationsförderung\|Urheber (case-insensitiv, auf `<title>` + `<meta:shortTitle>`) | 500 Items/420 KB; `pubDate` nur `YYYY-MM-DD`; Link = ELI `…/eli/bund/bgbl-1/2026/317` (stabile ID); strukturiert: `<meta:typ>` (`Gesetz`/`Verordnung`/`Sonstiges`), `<meta:fundstelle>`, `<meta:initiant>` | 3x | `verkuendet` / `in_kraft` |
| `bmjv-gesetzgebung` | `https://www.bmjv.de/SiteGlobals/Functions/RSSNewsfeed/DE/RSSNewsfeed/RSSNewsfeedGesetzgebungsverfahren.xml?nn=149890` | KI\|Künstliche Intelligenz\|Urheber\|Deepfake\|digital | 81 Items, Stadien (Referentenentwurf, Regierungsentwurf, Verkündung) im Text | 3x | Claude |
| `bundesrat-vorgaenge` | `https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_Announcement.xml` | KI\|Künstliche Intelligenz\|2024/1689\|Daten\|digital | Titel `Nr/26 \| Titel \| Sitzungsdatum`; Items vordatiert (17.12.2026) → first-seen | 3x | Claude |
| `bundesrat-plenum` | `https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_top_plenumkompakt.xml` | wie oben | Plenarbeschlüsse | 3x | Claude |
| `kimig-gii` | `https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html` | – | Kopf: Ausfertigungsdatum, Vollzitat, Inkrafttreten; Änderungsgesetze | weekly | Fristen-Abgleich |
| `bfdi-pm` | `https://www.bfdi.bund.de/SiteGlobals/Functions/RSSFeed/Allgemein/rssnewsfeed.xml?nn=252136` | KI\|Künstliche Intelligenz\|Sprachmodell\|OpenAI\|Meta\|Training | Datumsangaben unsortiert → selbst sortieren; alter Pfad `/RSSFeed/DE/RSSNewsfeed/…` 404 | 3x | Claude |
| `lfdi-bw` (`DE-BW`) | `https://www.baden-wuerttemberg.datenschutz.de/feed/` | KI-, Anbieter- und Produktnamen | WordPress, 10 Items, `pubDate` ok | 3x | Claude |
| `hmbbfdi-news` (`DE-HH`) | Index `https://datenschutz-hamburg.de/sitemap.xml` → `<loc>` mit `sitemap=news` | KI-Slugs (`ki-`, `openai`, `meta`, `training` …) | kein RSS (`/rss.xml` 404); cHash nicht hart codieren; `&amp;` in `<loc>` dekodieren; neue `<loc>` = neue Meldung | daily07 | Claude |
| `blnbdi-pm` (`DE-BE`) | `https://www.datenschutz-berlin.de/infothek/pressemitteilungen/` | KI\|Künstliche Intelligenz | kein RSS, keine Sitemap; Anker `#c…` als ID; Datum `22. Oktober 2026` | daily07 | Claude |
| `baylda-rss` (`DE-BY`) | `https://www.lda.bayern.de/de/rss.xml` | Rechts-Filter DE | stale seit 12.03.2026, trotzdem mitlaufen (DeepSeek-, Meta-Verfahren) | weekly | Claude |
| `dsk-entschliessungen` | `https://www.datenschutzkonferenz-online.de/entschliessungen.html` | KI\|Künstliche Intelligenz\|LLM\|Large Language | Zeilen `TT.MM.JJJJ - Titel`; Beschlüsse-Seite stale | weekly | `leitlinie` |
| `bsi-presse` | `https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml` | `BSI_INCLUDE_RE` + `BSI_LAW_RE` aus `sicherheitsluecken` (case-sensitiv mit `\b`; ein loser `/i`-Filter traf „Kinder-Smartwatches“) | Registereintrag gehört `sicherheitsluecken` (ein Abruf); hier nur die Items lesen, die `BSI_LAW_RE` nach `gesetze` routet, keinen eigenen Eintrag anlegen | 3x | `leitlinie`/Claude |
| `netzpolitik` | `https://netzpolitik.org/feed/` | Rechts-Filter DE | 446 KB Volltext → Titel + Teaser; Presse-Quelle aus `quellen` | 3x | Claude |

Behörden-Zuständigkeit (für Prompt-Kontext und Tags): BNetzA ist laut KI-MIG (Teil 1) die für die KI-VO zuständige Marktüberwachungsbehörde (PM vom 29.07.2026: auch Anlauf- und Beschwerdestelle), BaFin für KI im regulierten Finanzbereich, HmbBfDI zusätzlich für Hamburgs Behörden.

## USA (`'US'` = Bund, `'US-Staat'` + `region`)

| ID | URL | Filter | Datum / Eigenheit | Takt | Status |
|---|---|---|---|---|---|
| `fedreg-api` | `https://www.federalregister.gov/api/v1/documents.json` (Parameter in SKILL.md) | `type` + Rechts-Filter auf `title`/`abstract` | Volltext-False-Positives; Public Inspection vordatiert | 3x | strukturiert |
| `fedreg-pi` | `https://www.federalregister.gov/api/v1/public-inspection-documents/current.json` | wie oben | 168 KB; Vorschau vor Veröffentlichung, optional | daily07 | `verkuendet` erst ab Veröffentlichung |
| `wh-actions` | `https://www.whitehouse.gov/presidential-actions/feed/` | artificial intelligence\|\bAI\b\|super ?intelligence\|data center\|semiconductor\|chip (Titel + 2.000 Zeichen) | 575 KB, ~0,7 Items/Tag | 3x | `in_kraft` (unterzeichnet) |
| `nist-it` | `https://www.nist.gov/news-events/information%20technology/rss.xml` | Rechts-Filter + CAISS?I | kein eigener KI-Feed; Cloudflare | 3x | Claude |
| `nist-caissi` | `https://www.nist.gov/caissi` | – | ex `/caisi`; Hauptinhalt diffen | weekly | `leitlinie` |
| `copyright-newsnet` | `https://www.copyright.gov/newsnet/` | artificial intelligence\|AI\|generative\|training | RSS seit 2023 tot → HTML; Datum `Month D, YYYY`; Cloudflare | daily07 | Claude |
| `copyright-ai` | `https://www.copyright.gov/ai/` | – | Report-Teile 1–3 | weekly | `leitlinie` |
| `multistate` | `https://www.multistate.ai/updates?format=rss` | alle | ~3/Monat, 19 von 20 relevant | 3x | Claude |
| `gov-ca` (`US-CA`) | `https://www.gov.ca.gov/feed/` | AI\|artificial intelligence\|frontier\|chatbot\|deepfake\|SB \d+\|AB \d+ | 10 Items bei ~5/Tag → GUIDs persistieren; Sep./Okt. Unterzeichnungen und Vetos | 3x | Claude (`verkuendet`/`gescheitert`) |
| `calprivacy` (`US-CA`) | `https://privacy.ca.gov/feed/` | automated decision\|ADMT\|artificial intelligence\|AI\|risk assessment | ex CPPA (Umzug seit 26.01.2026); Cloudflare | 3x | Claude |
| `cppa-regs` (`US-CA`) | `https://cppa.ca.gov/regulations/` | – | Regel-Pakete mit „Effective …“ | weekly | Fristen-Abgleich |
| `coag-ai` (`US-CO`) | `https://coag.gov/ai/` | – | Datum `Month D, YYYY`; Rulemaking-Fristen | weekly | Fristen-Abgleich |
| `ny-assembly-raise` (`US-NY`) | `https://nyassembly.gov/leg/?bn=S06953&term=2025&Actions=Y` | Watchlist-Bills | Ersatz für das gesperrte nysenate.gov; Actions-Zeile `12/19/2025 SIGNED CHAP.699` | weekly | `verkuendet` bei `SIGNED CHAP.` |
| `tx-hb149` (`US-TX`) | `https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149` | – | `Effective on 1/1/26`; nur Fristenquelle, kein Polling nötig | – | `in_kraft` |

Nur mit Key (optional, Phase 7): `congress-api` `https://api.congress.gov/v3/bill?format=json&limit=2&sort=updateDate+desc` (keine Keyword-Suche, nur Watchlist-Bills sinnvoll), `openstates` `https://v3.openstates.org/bills?q=%22artificial%20intelligence%22&sort=latest_action_desc&per_page=1` (Header `X-API-KEY`).

## Gerichte

| ID | URL | Filter | Datum / Eigenheit | Takt | Status |
|---|---|---|---|---|---|
| `cetw-feed` (`US`) | `https://chatgptiseatingtheworld.com/feed/` | alle | ~2/Tag, US-KI-Urheberrechtsklagen | 3x | Claude |
| `courtlistener-dockets` (`US`) | `https://www.courtlistener.com/api/rest/v4/search/?q=%22OpenAI%22%20AND%20copyright&type=r&order_by=dateFiled%20desc` | eine Query je Firma: OpenAI\|Anthropic\|Stability\|Midjourney\|Meta `AND copyright`; Firma muss in `caseName` stehen | anonym ok; Felder `caseName`, `court`, `court_id`, `dateFiled`, `dateTerminated`, `docketNumber`, `docket_absolute_url`; Cursor | daily07 | `klage` |
| `courtlistener-opinions` (`US`) | `https://www.courtlistener.com/feed/search/?q=%22artificial%20intelligence%22%20AND%20copyright&type=o` | – | Atom, Entscheidungen | daily07 | `urteil` |
| `cjeu-press` (`EU`) | siehe EU | | | daily07 | `urteil`/`anhoerung` |
| `lto` (`DE`) | `https://www.lto.de/rss/feed.xml` | KI\|Künstliche Intelligenz\|OpenAI\|Urheberrecht.*(KI\|Training) | 30 Items; `/rss/feed/` 404; beste Quelle für LG/OLG Hamburg und München | 3x | Claude |
| `bayern-recht-og` (`DE-BY`) | `https://www.gesetze-bayern.de/Api/Feed/OrdentlicheGerichtsbarkeit` | KI\|künstliche Intelligenz\|OpenAI\|Urheberrecht + Training | Myra-WAF; Entscheidungen teils Jahre alt (Veröffentlichung ≠ Entscheidungsdatum) | 3x | `urteil` |
| `bgh-pm` (`DE`) | `https://www.bundesgerichtshof.de/DE/Service/RSSFeed/Function/RSS_PM.xml` | streng: KI\|Künstliche Intelligenz\|LAION\|GEMA\|OpenAI | 100 Items | 3x | Claude (Verhandlungstermin → `anhoerung`) |

Hamburger Gerichte haben keinen Feed → LTO und heise (Presse aus `quellen`).

## Nicht nutzen

| Quelle | Grund | Ersatz |
|---|---|---|
| `https://artificialintelligenceact.eu/feed/` | stale seit 07.08.2026, 757 KB | `eu-aiact-substack` |
| `https://www.copyright.gov/rss/newsnet.xml` | letztes Item 2023-07 | `copyright-newsnet` (HTML) |
| `https://www.ftc.gov/feeds/press-release.xml` | Akamai: Bot-UA 403 „abusive automated request“, Browser-UA maskierte 404 | FTC-Regeln über `fedreg-api` (Behörde FTC), Fälle über Presse/Rapporteur |
| `https://www.nysenate.gov/legislation/bills/2025/S6953/amendment/B` | Cloudflare „Just a moment…“ für jeden UA | `ny-assembly-raise`, MultiState |
| `https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB53` | Katalog: 200; Nachprüfung 2026-10-24: 403 `cf-mitigated: challenge` | `gov-ca`, MultiState; leginfo nur als Link |
| LegiScan-API | Redirect auf Cloudflare-Challenge (403) | MultiState, Open States (Key) |
| IAPP State Tracker, BakerHostetler Case Tracker, GWU DAIL | stale bzw. ohne Datum | `cetw-feed`, CourtListener |
| openJur | Mensch-Prüfung (Bild drehen) – nie umgehen | LTO, Bayern.Recht |
| EDPS-Feed | kaum KI-Bezug | `edpb-news` |
| Regulations.gov API | dupliziert Federal Register, Key nötig | `fedreg-api` (`comments_close_on`) |
