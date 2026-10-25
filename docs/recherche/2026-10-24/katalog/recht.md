# Gesetze & Regulierung (EU, DE, USA, Gerichte)

Live geprüft am 2026-10-24 von einer deutschen Privat-IP mit dem Bot-UA `Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)`. Aus GitHub Actions (Azure-IPs) kann Bot-Schutz strenger sein – vor dem Einbau den Smoke-Test aus Phase 1 laufen lassen. Quelle: `docs/recherche/2026-10-24/quellen-recherche.json`.

## Kernquellen (14)

- **EU Kommission – Digital Strategy News RSS (DG CNECT / AI Office)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://digital-strategy.ec.europa.eu/en/rss.xml`
  Kategorien: Gesetze
  Hauptquelle für AI Act, AI Office, GPAI-Guidelines, Codes of Practice und harmonisierte Normen (z. B. 'First harmonised standard supporting the AI Act published in the OJ'). Nur 10 Items, ca. 1–3 pro Tag; ?topic=119 wird im RSS ignoriert. Filter auf den Titel: AI Act|AI Office|artificial intelligence|GPAI|general-purpose|code of practice|AI Board|Scientific panel|harmonised standard|Digital Omnibus. Aktuell 4 von 10 Treffern. Den Status (published in OJ, enters into application, consultation, guidelines) muss Claude aus Titel/Teaser extrahieren. Läuft über CloudFront, Schutz nicht beobachtet; gleiche Infrastruktur wie EUR-Lex, deshalb beobachten.
  Nachprüfung: 200 (Bot- und curl-UA). CloudFront (AMS), kein Cloudflare, keine Challenge. Nur 10 Items, etwa ein KI-Item pro Woche.
- **AI Act Service Desk – offizielle Umsetzungs-Timeline** · html-diff · geprüft · HTTP 200 · neuestes: n/a (Referenzseite, berücksichtigt Digital-Omnibus-Änderungen)
  `https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act`
  Kategorien: Gesetze
  Offizielle Kommissionsseite mit allen 'Gilt ab'-Daten, serverseitig gerendert: 02.08.2026 Art. 50, 02.08.2027 Sandboxes, Annex-III-Hochrisiko, 02.08.2028 Annex I. Beste Quelle für eine statische Fristen-/Status-Tabelle im Dashboard. Wöchentlich diffen; bei Änderung bewertet Claude den Unterschied. Startseite https://ai-act-service-desk.ec.europa.eu/en ebenfalls 200.
- **EUR-Lex – Amtsblatt L Serie (Rechtsakte) RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://eur-lex.europa.eu/EN/display-feed.rss?rssId=222`
  Kategorien: Gesetze
  100 Items, also ungefiltert ca. 50–100 Rechtsakte pro Werktag. Titel = 'CELEX:32026Dxxxx: vollständiger Akttitel', description ist leer, dc:creator = Organ. Filter: artificial intelligence|2024/1689|AI Act|general-purpose AI|AI system. Heute 0 Treffer, was normal ist (nur wenige pro Monat). Status: Veröffentlichung im ABl. bedeutet angenommen/verkündet, Inkrafttreten meist nach +20 Tagen (steht im Text). Wichtig: Die verlinkten EUR-Lex-HTML-Seiten (z. B. https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng) liefern 202 mit leerem Body und x-amzn-waf-action: challenge (AWS WAF), bei Bot- und Browser-UA. Volltext deshalb über CELLAR holen. Das RSS selbst war ohne Challenge erreichbar.
- **The EU AI Act Newsletter (Future of Life Institute, Substack)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-20 (#113)
  `https://artificialintelligenceact.substack.com/feed`
  Kategorien: Gesetze
  Kuratierter, etwa zweiwöchentlicher Newsletter plus Podcast-Folgen zur AI-Act-Umsetzung (AI Office, nationale Behörden, Codes of Practice, Omnibus). 20 Items von Feb. bis Okt. 2026, also ca. 2–4 pro Monat. Kein Keyword-Filter nötig (100 % relevant). Volltext in content:encoded, Feed 321 KB: nur Titel und die ersten ~1.500 Zeichen an Claude geben. Substack/Cloudflare (cf-ray); von Azure-IPs gelegentlich Challenge möglich. Ersetzt den veralteten Feed von artificialintelligenceact.eu.
  Nachprüfung: 200 (Bot- und curl-UA). Substack über Cloudflare mit __cf_bm, 321 KB; latent.space/feed zeigt dasselbe Muster (1,3 MB). Ausfälle aus Azure sind möglich. Nice-Quelle, bei Fehler einfach auslassen.
- **Bundesnetzagentur – Pressemitteilungen RSS (KI-Marktüberwachung)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-20 (aus Link-URL)
  `https://www.bundesnetzagentur.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed_Pressemitteilungen.xml?nn=693926`
  Kategorien: Gesetze
  Die BNetzA ist laut eigener PM vom 29.07.2026 per KI-MIG Marktüberwachungsbehörde, Anlauf- und Beschwerdestelle für die KI-VO. Feed ohne pubDate: Datum aus der URL (/2026/20261020_…) oder first-seen nehmen. Ohne ?nn=… liefert der Feed 404. 10 Items, ca. 2–3 pro Woche, überwiegend Energie/Post. Filter: KI|Künstliche Intelligenz|KI-Verordnung|KI-MIG|AI Act|Data Act. Zusätzlich gibt es einen Aktuelles-Feed (50 Items) …/RSSNewsfeed_Aktuelles_neu.xml?nn=693926.
- **BMDS (Bundesministerium für Digitales und Staatsmodernisierung) RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-16
  `https://bmds.bund.de/feed/rss.xml`
  Kategorien: Gesetze
  Erreichbar über https://bmds.bund.de/feed (Redirect). 10 Items, ca. 3 pro Woche. Federführend für KI-Strategie, KI-MIG-Umsetzung und Deutschland-Stack. Filter: KI|Künstliche Intelligenz|KI-Verordnung|KI-MIG|Rechenzentr|Gigafactory|Deutschland-Stack. Aktuell 0 von 10 KI-Titeln. Status steckt in PM-Texten (Kabinettsbeschluss, Referentenentwurf).
- **Deutscher Bundestag – hib-Feed Digitales und Staatsmodernisierung** · rss · geprüft · HTTP 200 · neuestes: kein pubDate im Feed (Items vom 23.10.2026)
  `https://www.bundestag.de/static/appdata/includes/rss/digitales.rss`
  Kategorien: Gesetze
  15 Items ohne pubDate, daher first-seen und GUID-Dedupe. Das category-Feld zeigt das Verfahrensstadium (KleineAnfrage, Antwort, Gesetzentwurf, Tagesordnung). Filter: KI|Künstliche Intelligenz|Sprachmodell|Algorithm (z. B. 'AfD fragt nach Risiken großer KI-Sprachmodelle'). Weitere Feeds siehe https://www.bundestag.de/services/rss: hib.rss (alle Ausschüsse, mit pubDate), recht.rss, wirtschaft.rss, drucksachen.rss.
- **Bundestag DIP-API (Vorgänge/Drucksachen)** · json-api · geprüft, Key nötig · HTTP 401 ohne Key (erwartet) · neuestes: n/a (Key nötig)
  `https://search.dip.bundestag.de/api/v1/vorgang?f.titel=K%C3%BCnstliche%20Intelligenz`
  Kategorien: Gesetze
  Ohne Key: 401 'An API key is required'. OpenAPI 1.5 unter https://search.dip.bundestag.de/api/v1/openapi.yaml (verifiziert). Strukturierte Statusfelder: beratungsstand, verkuendung, inkrafttreten; Filter f.titel, f.deskriptor, f.sachgebiet, f.vorgangstyp, f.beratungsstand, f.aktualisiert.start. Key als Header 'Authorization: ApiKey …' oder ?apikey=. Der öffentliche, befristete Key steht auf einer JS-only-Hilfeseite und rotiert. Für die Produktion einen persönlichen Dauer-Key per formloser Mail an parlamentsdokumentation@bundestag.de beantragen (laut Nutzungsbedingungen) und als GitHub Secret ablegen. Den Key aus der Portal-JS-Config nicht verwenden.
- **Federal Register API (US-Bundesregister)** · json-api · geprüft · HTTP 200 · neuestes: 2026-10-26 (Public Inspection, vordatiert)
  `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=%22artificial+intelligence%22&conditions%5Btype%5D%5B%5D=RULE&conditions%5Btype%5D%5B%5D=PRORULE&conditions%5Btype%5D%5B%5D=PRESDOCU&order=newest&per_page=5&fields%5B%5D=title&fields%5B%5D=type&fields%5B%5D=publication_date&fields%5B%5D=effective_on`
  Kategorien: Gesetze
  Beste strukturierte US-Quelle. Status direkt aus type (Rule, Proposed Rule, Presidential Document, Notice), effective_on, comments_close_on, action, agencies, html_url, abstract. Volumen: ca. 10 KI-Volltexttreffer pro Woche, davon ca. 3 vom Typ RULE/PRORULE/PRESDOCU. Volltextsuche liefert False Positives (z. B. SNAP-EBT-Karten), deshalb zweiter Keyword-Filter auf title und abstract. Inkrementell mit conditions[publication_date][gte]=<letzter Lauf>. Eigener Endpoint für Public Inspection: /api/v1/public-inspection-documents/current.json.
- **White House – Presidential Actions RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.whitehouse.gov/presidential-actions/feed/`
  Kategorien: Gesetze
  Executive Orders, Memoranda, Proklamationen. 30 Items über ~6 Wochen (ca. 0,7 pro Tag), 575 KB Volltext. Filter auf Titel und die ersten 2.000 Zeichen: artificial intelligence|\bAI\b|super ?intelligence|data center|semiconductor|chip. Aktuell 1 von 30. Status 'signed'; die Federal-Register-Veröffentlichung (PRESDOCU) folgt später. Hinweis: ai.gov leitet inzwischen auf si.gov ('America's Super Intelligence Initiatives') weiter, deshalb 'super intelligence' als Keyword aufnehmen.
- **MultiState – AI-Policy-Updates RSS (US-Bundesstaaten)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-16
  `https://www.multistate.ai/updates?format=rss`
  Kategorien: Gesetze
  Beste frei zugängliche Quelle für KI-Gesetze der US-Bundesstaaten (CA, CO, NY, TX, Frontier-Model-Auditing, AI-Ad-Disclosure). 20 Items April–Okt. 2026, ca. 3 pro Monat, 19 von 20 relevant. Squarespace. Tracker-Seite https://www.multistate.ai/artificial-intelligence-ai-legislation (200, Stand-Angaben 'as of March 2026') eher nicht nutzen.
- **ChatGPT Is Eating the World – KI-Urheberrechtsklagen (Feed)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://chatgptiseatingtheworld.com/feed/`
  Kategorien: Gesetze
  Bester Tracker für US-KI-Copyright-Verfahren (NYT v. OpenAI, Concord v. Anthropic, Suno usw.). Liefert Status wie Klage, Hearing, Summary Judgment, Urteil. 10 Items über 5 Tage, ca. 2 pro Tag, nahezu alle relevant, kein Filter nötig. Feed 68 KB.
- **DIP Bundestag API (OpenAPI)** · json-api · geprüft, Key nötig · HTTP 200 (Spec); /vorgang ohne Key 401 · neuestes: n/a
  `https://search.dip.bundestag.de/api/v1/openapi.yaml`
  Kategorien: Gesetze
  Key als Header 'Authorization: ApiKey …' oder Parameter apikey. Filter laut Spec: f.titel, f.deskriptor, f.sachgebiet, f.drucksache, f.dokumentnummer, f.vorgangstyp, f.aktualisiert.start/end, f.verkuendung_fundstelle, f.kom, f.ratsdok, f.wahlperiode. Endpunkte: /vorgang, /vorgangsposition, /drucksache, /drucksache-text, /plenarprotokoll, /aktivitaet, /person. Cursor-Paginierung. Die Hilfeseite mit dem öffentlichen Key ist nur per JavaScript lesbar.
  (aus der Nachprüfung)
- **LTO (Legal Tribune Online) Feed** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://www.lto.de/rss/feed.xml`
  Kategorien: Gesetze
  30 Items. Beste Sammelquelle für deutsche KI-Urteile (LG und OLG Hamburg und München), weil Hamburg keine Entscheidungs-Feeds anbietet. openJur ist unbrauchbar: Mensch-Prüfung mit Bildrotation (verified=false, auch mit Browser-UA). /rss/feed/ liefert 404.
  (aus der Nachprüfung)

## Ergänzend (30)

- **EU Digital Strategy – News gefiltert auf KI (HTML)** · html-page · geprüft · HTTP 200 · neuestes: 2026-10 (Scientific panel on frontier AI safety)
  `https://digital-strategy.ec.europa.eu/en/news?topic=119`
  Kategorien: Gesetze
  Serverseitig gerenderte Liste, nur KI-Themen. Parsen über span in .ecl-content-block__title. Nützlich als Backfill, falls das 10er-RSS Items verpasst. Die GPAI-Code-Seite https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai und die Policy-Seite /en/policies/regulatory-framework-ai liefern ebenfalls 200 und eignen sich für einen monatlichen Diff.
- **CELLAR SPARQL (Publications Office) – Rechtsakte auf Basis des AI Act** · other · geprüft · HTTP 200 · neuestes: 2026-07-20 (CELEX 32026R1755)
  `https://publications.europa.eu/webapi/rdf/sparql`
  Kategorien: Gesetze
  POST mit query=… und Accept: application/sparql-results+json. Getestetes Muster: ?work cdm:resource_legal_based_on_resource_legal ?ai . ?ai cdm:resource_legal_id_celex "32024R1689"^^xsd:string ; dazu cdm:resource_legal_id_celex und cdm:work_date_document. Liefert delegierte und Durchführungsrechtsakte, COM-Dokumente und EP-Entschließungen zum AI Act. Strukturiert (Typ über CELEX-Sektor, Datum), eignet sich für den Status. Wöchentlich abfragen; Workaround für die WAF-geschützten EUR-Lex-Seiten.
- **artificialintelligenceact.eu – Implementation Timeline** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: Last updated: 31 August 2026
  `https://artificialintelligenceact.eu/implementation-timeline/`
  Kategorien: Gesetze
  Sekundärquelle mit detaillierten Fristen inkl. Pflichten der Mitgliedstaaten. 340 KB, Cloudflare. Nur monatlich diffen und als Gegencheck zur offiziellen Service-Desk-Timeline nutzen.
- **Europäisches Parlament – Pressemitteilungen RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://www.europarl.europa.eu/rss/doc/press-releases/en.xml`
  Kategorien: Gesetze
  20 Items, ca. 5–10 pro Tag; dreimal täglich abrufen reicht. Filter: artificial intelligence|AI Act|\bAI\b|algorithm|deepfake|Digital Omnibus|copyright|chatbot. Aktuell 0 von 20. Status steckt im Text (plenary adopted, provisional agreement, committee vote). Verzeichnis: https://www.europarl.europa.eu/at-your-service/en/stay-informed/rss-feeds (Ausschuss-Feeds /rss/committee/{imco,libe,juri,itre}/en.xml, Themen-Feeds /rss/topic/909/en.xml). Getestet: IMCO-Feed liefert 200, aber vor allem Amendment-Dokumente, also zu viel Rauschen.
- **EP Legislative Observatory (OEIL) – Verfahrensakte (Watchlist)** · html-diff · geprüft · HTTP 200 · neuestes: Digital Omnibus on AI: 'Stage reached in procedure: Procedure completed', Final act Regulation
  `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0359(COD)`
  Kategorien: Gesetze
  Leitet auf oeil.europarl.europa.eu weiter. Das Feld 'Stage reached in procedure' ist ideal für den Status (Commission proposal, Committee, Trilog, Awaiting signature, Procedure completed). Eine Watchlist von Verfahrensnummern pflegen (AI-Omnibus 2025/0359(COD), künftige KI-Haftung/Urheberrecht usw.) und wöchentlich nur den Status-String diffen. Seite 170 KB.
- **Rat der EU – Pressemitteilungen RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-23
  `https://www.consilium.europa.eu/en/rss/pressreleases.ashx`
  Kategorien: Gesetze
  20 Items. Datum steht in a10:updated (kein pubDate). Filter: artificial intelligence|AI Act|Digital Omnibus|AI. Statussignale: 'general approach', 'provisional agreement', 'Council adopts'. Aktuell 0 KI-Treffer, viel Kalender-Rauschen (Forward look, Media advisory) per Titel-Blacklist entfernen. Cloudflare-Server.
- **EU-Kommission Press Corner RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://ec.europa.eu/commission/presscorner/api/rss?language=en&pagesize=50`
  Kategorien: Gesetze
  Standardmäßig nur 10 Items; pagesize=50 funktioniert (getestet), der Parameter search= wird ignoriert. Ca. 20–40 Items pro Tag. 'Daily News' und Reden per Blacklist entfernen, danach KI-Keywords. Ergänzt das DSM-RSS bei Kollegiumsbeschlüssen (Vorschläge = Status 'proposed').
- **EDPB News RSS (Europäischer Datenschutzausschuss)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-16
  `https://www.edpb.europa.eu/feed/news_en`
  Kategorien: Gesetze, Vertragsänderungen
  10 Items, ca. 2 pro Woche: Stellungnahmen (z. B. zu KI-Modellen und Smart Glasses) und DPA-Bußgelder (relevant, wenn sie KI-Anbieter treffen, auch für Vertragsänderungen). Filter: AI|artificial intelligence|LLM|model|OpenAI|chatbot|Meta|Google. Aktuell 0 von 10. Geprüft: EDPS-Feed https://www.edps.europa.eu/feed/news_en (200, 2026-10-22) bringt kaum KI-Bezug und kann wegfallen.
- **EU 'Have Your Say' – Better-Regulation-API (Konsultationen/Initiativen)** · json-api · geprüft · HTTP 200 · neuestes: n/a (Suche ohne Datumssortierung)
  `https://ec.europa.eu/info/law/better-regulation/brpapi/searchInitiatives?text=artificial%20intelligence&size=5&language=EN`
  Kategorien: Gesetze
  Undokumentierte, interne API. Felder: initiativeStatus, frontEndStage, feedbackStartDate/feedbackEndDate, foreseenActType, receivingFeedbackStatus, topics. sort=modifiedDate,DESC liefert 406, also clientseitig nach feedbackStartDate sortieren. Gut für Status 'Call for evidence', 'Draft act' und Konsultationsfristen. Wöchentlich abrufen; kann sich ohne Ankündigung ändern.
- **EuGH (CJEU) – Pressemitteilungen (HTML)** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://curia.europa.eu/site/jcms/d2_5158/en/press-releases`
  Kategorien: Gesetze
  Kein RSS gefunden. Seite 934 KB groß, daher nur Zeilen 'TT Mon JJJJ …' extrahieren. Filter: artificial intelligence|C-806/24|Like Company|copyright|data protection|algorithm|Bytedance|Meta|Google. Liefert Urteile und Schlussanträge (Status: Opinion AG vs. Judgment). Täglich einmal reicht.
- **Rapporteur (ehem. Euractiv) – Tech-Sektion RSS** · rss · geprüft, Bot-Schutz · HTTP 200 (Redirect auf https://www.rapporteur.com/sections/tech/feed/) · neuestes: 2026-10-23
  `https://www.euractiv.com/sections/tech/feed/`
  Kategorien: Gesetze, Neuigkeiten
  Euractiv leitet auf rapporteur.com weiter, die Feed-URL am besten direkt auf rapporteur.com setzen. 100 Items, 25 mit KI im Titel. EU-Policy-Journalismus, oft früher als offizielle Quellen (Trilog, Leaks, z. B. 'Meta delays AI business terms'). Teilweise Paywall. Cloudflare.
- **Bundesnetzagentur – KI-Service-Desk (HTML)** · html-diff · geprüft · HTTP 200 · neuestes: Aktuelles: Standardisierungskonferenz 15.12.2026
  `https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/KI/start_ki.html`
  Kategorien: Gesetze
  Einstieg des KI-Service-Desks mit 'Aktuelles'-Block und Unterseiten (14_Marktueberwachung, 18_Beschwerdestelle, 13_Notifizierung, GPAI, Hochrisiko, KI-Compliance-Kompass). Wöchentlich nur den Aktuelles-Abschnitt diffen. Leitfäden und Fristen für deutsche Unternehmen.
- **BfDI Pressemitteilungen RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-06
  `https://www.bfdi.bund.de/SiteGlobals/Functions/RSSFeed/Allgemein/rssnewsfeed.xml?nn=252136`
  Kategorien: Gesetze, Vertragsänderungen
  30 Items, ca. 1 pro Woche, 2 von 30 mit KI-Bezug. Neuer BfDI Moritz Hennemann (seit Okt. 2026). Filter: KI|Künstliche Intelligenz|Sprachmodell|OpenAI|Meta|Training. Relevant für datenschutzrechtliche Bewertung von KI-Diensten.
  Nachprüfung: 200. 30 Items, Datumsangaben unsortiert, deshalb selbst sortieren. Der alte Pfad /RSSFeed/DE/RSSNewsfeed/… liefert 404.
- **BSI – Presse & Veranstaltungen RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml`
  Kategorien: Gesetze, Sicherheitslücken
  40 Items, 4 von 40 mit KI (Leitfäden, Kriterienkataloge, Warnungen). Für den Rechtsbereich nur Filter KI|Künstliche Intelligenz|AI|Kriterienkatalog|Cyber Resilience Act. Weitere Feeds wie CERT-Bund-Advisories auf https://www.bsi.bund.de/DE/Service-Navi/Abonnements/RSS/rss_node.html gehören in den Security-Bereich.
- **Datenschutzkonferenz (DSK) – Entschließungen/Beschlüsse** · html-diff · geprüft · HTTP 200 · neuestes: 2026-09-23
  `https://www.datenschutzkonferenz-online.de/entschliessungen.html`
  Kategorien: Gesetze
  Kein RSS. Zeilenformat 'TT.MM.JJJJ - Titel', einfach parsebar. Ca. 1 pro Monat. Zusätzlich https://www.datenschutzkonferenz-online.de/beschluesse-dsk.html (neuestes 17.06.2026, also über 60 Tage alt) sowie orientierungshilfen.html und pressemitteilungen.html. Filter: KI|Künstliche Intelligenz|LLM|Large Language. Wöchentlich diffen.
- **Bundesrat – Beratungsvorgänge RSS (inkl. EU-Vorlagen)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_Announcement.xml`
  Kategorien: Gesetze
  50 Items. Titel 'Nr/26 | Titel | Sitzungsdatum', enthält auch COM-Vorschläge der EU. Ein Item ist auf 17.12.2026 vordatiert, also nicht nach pubDate sortieren, sondern first-seen nutzen. Filter: KI|Künstliche Intelligenz|2024/1689|Daten|digital. Beschlüsse und Status über https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_top_plenumkompakt.xml (verifiziert, 16.10.2026).
- **Bundesgesetzblatt Teil I RSS (recht.bund.de)** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.recht.bund.de/rss/feeds/rss_bgbl-1.xml?nn=211452`
  Kategorien: Gesetze
  Amtliche Verkündung (Status 'verkündet' und Bekanntmachungen über Inkrafttreten). 500 Items, 420 KB; pubDate nur YYYY-MM-DD. Filter: Künstliche Intelligenz|KI-|Marktüberwachung und Innovationsförderung|Urheber. 1 von 500 Treffern. Liefert die belastbare Bestätigung für Gesetze wie das KI-MIG.
- **BMJV – Gesetzgebungsverfahren RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-21
  `https://www.bmjv.de/SiteGlobals/Functions/RSSNewsfeed/DE/RSSNewsfeed/RSSNewsfeedGesetzgebungsverfahren.xml?nn=149890`
  Kategorien: Gesetze
  81 Items: Vorhaben des Justizministeriums mit Stadien (Referentenentwurf, Regierungsentwurf, Verkündung). Relevant für Urheberrecht/TDM, KI-Haftung, Deepfake-Strafrecht. Filter: KI|Künstliche Intelligenz|Urheber|Deepfake|digital. Daneben gibt es den PM-Feed …/RSSNewsfeedPressemitteilungen.xml?nn=149890.
- **netzpolitik.org RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-24
  `https://netzpolitik.org/feed/`
  Kategorien: Gesetze, Neuigkeiten
  Deutsche Perspektive auf KI-VO, Chatkontrolle, Datenschutz und Behörden. 27 Items mit Volltext (446 KB), 4 davon mit KI im Titel. Nur Titel und Teaser an Claude. Liefert oft Einordnung und frühe Hinweise auf Referentenentwürfe.
- **Congress.gov API (US-Kongress, Bills)** · json-api · geprüft, Bot-Schutz, Key nötig · HTTP 403 ohne Key; 200 mit dem dokumentierten api.data.gov-DEMO_KEY · neuestes: 2026-10-24 (updateDate)
  `https://api.congress.gov/v3/bill?format=json&limit=2&sort=updateDate+desc`
  Kategorien: Gesetze
  Felder: title, latestAction.text/actionDate (Status: Referred to Committee, Passed, Became Law), introducedDate, updateDate. /bill bietet keine Keyword-Suche, also updateDate-sortierte Liste seitenweise ziehen und Titel lokal filtern (hunderte Updates pro Tag, viele Requests). Sinnvoller: nur Watchlist-Bills abfragen oder über Federal Register und News arbeiten. Cf-Ray-Header vorhanden (Cloudflare). Key als GitHub Secret.
- **NIST – News 'Information Technology' RSS (inkl. CAISSI)** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-08
  `https://www.nist.gov/news-events/information%20technology/rss.xml`
  Kategorien: Gesetze, Forschung & Benchmarks
  40 Items, 8 mit KI-Bezug (z. B. Agentic-AI-Identity-Konzeptpapier, NCCoE). Es gibt keinen eigenen KI-Feed. Umbenennungen: /artificial-intelligence leitet auf /super-intelligence weiter, /caisi auf /caissi ('Center for Advancing Innovation and Standards for Super Intelligence'). CAISSI-Seite https://www.nist.gov/caissi (200) für monatlichen Diff. Allgemeiner Feed: https://www.nist.gov/news-events/news/rss.xml. Cloudflare.
- **US Copyright Office – NewsNet (HTML)** · html-diff · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-07
  `https://www.copyright.gov/newsnet/`
  Kategorien: Gesetze
  Das RSS https://www.copyright.gov/rss/newsnet.xml ist veraltet (letztes Item 2023-07), deshalb die HTML-Liste parsen (Datum 'Month D, YYYY'). Filter: artificial intelligence|AI|generative|training. KI-Seite https://www.copyright.gov/ai/ (Report-Teile 1–3, letzte Einträge 2025) monatlich diffen. Cloudflare.
- **CalPrivacy (ehem. CPPA) – Newsroom RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-12
  `https://privacy.ca.gov/feed/`
  Kategorien: Gesetze, Vertragsänderungen
  cppa.ca.gov/announcements meldet den Umzug zu privacy.ca.gov seit 26.01.2026. 10 Items, ca. 1 pro Woche. ADMT-/Risk-Assessment-Regeln, Enforcement Advisories. Filter: automated decision|ADMT|artificial intelligence|AI|risk assessment. Aktuell 0 von 10. Cloudflare. Regeln-Seite https://cppa.ca.gov/regulations/ (200) für Status-Diff.
- **Gouverneur Kalifornien – Newsroom RSS** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://www.gov.ca.gov/feed/`
  Kategorien: Gesetze
  10 Items bei ca. 5 pro Tag; dreimal täglich ist knapp, deshalb seen-GUIDs persistieren. Im Sep./Okt. kommen die Unterzeichnungen von KI-Gesetzen (Status 'signed' = enacted). Filter: AI|artificial intelligence|frontier|chatbot|deepfake|SB \d+|AB \d+. Bill-Status direkt über leginfo, z. B. https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB53 (200, zeigt 'Chaptered'). Cloudflare.
- **Colorado Attorney General – AI-Seite (CAIA-Rulemaking)** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-06 (Interim Draft der Regeln)
  `https://coag.gov/ai/`
  Kategorien: Gesetze
  Status zu Colorado AI Act, ADMT- und Conversational-AI-Regeln sowie Chatbot Safety Law (Inkrafttreten 01.01.2027). Datumsangaben 'Month D, YYYY' im Text. Wöchentlich diffen. Bill-Seiten unter leg.colorado.gov (z. B. /bills/sb24-205) liefern ohne Header 406 (auch mit Browser-UA), mit 'Accept: text/html' dagegen 200.
- **Open States API v3 (Bills der US-Bundesstaaten)** · json-api · geprüft, Key nötig · HTTP 403 ohne Key (erwartet) · neuestes: n/a (Key nötig)
  `https://v3.openstates.org/bills?q=%22artificial%20intelligence%22&sort=latest_action_desc&per_page=1`
  Kategorien: Gesetze
  Antwort ohne Key: 'Must provide API Key as ?apikey or X-API-KEY'. Volltextsuche mit latest_action (Status) über alle 50 Staaten, damit strukturierte Alternative zu MultiState. Getestet: LegiScan (https://api.legiscan.com/?op=getSearch…) leitet ohne Key auf legiscan.com mit Cloudflare-Challenge (403) weiter.
- **CourtListener Search API v4 (RECAP-Dockets)** · json-api · geprüft · HTTP 200 (anonym) · neuestes: 2026-10-21 (Reservoir Media v. Anthropic, N.D. Cal.)
  `https://www.courtlistener.com/api/rest/v4/search/?q=%22OpenAI%22%20AND%20copyright&type=r&order_by=dateFiled%20desc`
  Kategorien: Gesetze
  Die Suche funktioniert ohne Token. Felder caseName, court, dateFiled, docket_absolute_url; Cursor-Paginierung. Der /dockets/-Endpoint gibt ohne Token 401. Queries pro Firma: OpenAI|Anthropic|Stability|Midjourney|Meta AND copyright. Atom-Feed für Gerichtsentscheidungen: https://www.courtlistener.com/feed/search/?q=%22artificial%20intelligence%22%20AND%20copyright&type=o (verifiziert, neuestes 2026-09-30). Täglich einmal abfragen.
- **BlnBDI Pressemitteilungen** · html-diff · geprüft · HTTP 200 · neuestes: 2026-10-22
  `https://www.datenschutz-berlin.de/infothek/pressemitteilungen/`
  Kategorien: Gesetze
  Kein RSS und keine Sitemap (beides 404). HTML 154 KB mit deutschen Datumsangaben (22. Oktober 2026 …), deshalb Anker-Diff (#c…).
  (aus der Nachprüfung)
- **Bayern.Recht: Entscheidungen ordentliche Gerichtsbarkeit** · rss · geprüft, Bot-Schutz · HTTP 200 · neuestes: 2026-10-24
  `https://www.gesetze-bayern.de/Api/Feed/OrdentlicheGerichtsbarkeit`
  Kategorien: Gesetze
  WAF myracloud (Myra Security), auf Azure-Blockaden achten. 35 Items. Enthält LG und OLG München, also das Gericht im Verfahren GEMA gegen OpenAI (LG München I). Entscheidungen erscheinen teils mit Jahren Verzug (z. B. OLG München 2023, jetzt veröffentlicht). Keyword-Filter: KI, künstliche Intelligenz, OpenAI, Urheberrecht + Training.
  (aus der Nachprüfung)
- **BGH Pressemitteilungen RSS** · rss · geprüft · HTTP 200 · neuestes: 2026-10-23
  `https://www.bundesgerichtshof.de/DE/Service/RSSFeed/Function/RSS_PM.xml`
  Kategorien: Gesetze
  100 Items. Relevant, sobald KI-Urheberrechtsfälle (LAION, GEMA) in die Revision gehen. Strenger Keyword-Filter.
  (aus der Nachprüfung)

## Nicht nutzen / tot / nur mit Key (7)

- **artificialintelligenceact.eu – WordPress-Feed** · rss · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: 2026-08-07
  `https://artificialintelligenceact.eu/feed/`
  Kategorien: Gesetze
  Veraltet: neuestes Item 07.08.2026 (78 Tage), lastBuildDate 01.09.2026. 757 KB für 27 Items, Cloudflare. Stattdessen den Substack-Feed nutzen.
- **Regulations.gov API v4** · json-api · geprüft, Key nötig · HTTP 403 API_KEY_MISSING; 200 mit DEMO_KEY · neuestes: 2026-10-23
  `https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&sort=-postedDate&page%5Bsize%5D=5`
  Kategorien: Gesetze
  Felder documentType, commentStartDate/commentEndDate, openForComment, frDocNum, docketId. Dupliziert weitgehend die Federal Register API und hat dieselben Volltext-False-Positives. Nur nützlich, um Kommentarfristen und Dockets zu verfolgen.
- **FTC Pressemitteilungen RSS** · rss · NICHT nutzbar, Bot-Schutz · HTTP 403 (Bot-UA) / 404 (Browser-UA) · neuestes: n/a
  `https://www.ftc.gov/feeds/press-release.xml`
  Kategorien: Gesetze, Vertragsänderungen
  Akamai blockt: Mit Bot-UA kommt 403 'The request resembles an abusive automated request'. Mit Browser-UA kommt eine maskierte 404-Seite, auch für die Startseite https://www.ftc.gov/. Von GitHub Actions nicht nutzbar. FTC-Regeln erscheinen ersatzweise in der Federal Register API, Enforcement-Fälle über News und Rapporteur.
- **NY Senate – Bill-Seite RAISE Act** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 403 · neuestes: n/a
  `https://www.nysenate.gov/legislation/bills/2025/S6953/amendment/B`
  Kategorien: Gesetze
  Cloudflare-Challenge 'Just a moment...' mit Bot-UA und mit Browser-UA. Die Open-Legislation-API (legislation.nysenate.gov/api/3) braucht einen Key und war im Test nicht erreichbar (Verbindungsfehler). NY-Status über MultiState und News abdecken.
- **IAPP US State AI Governance Legislation Tracker** · html-page · NICHT nutzbar · HTTP 200 · neuestes: Last updated 28 April 2026
  `https://iapp.org/resources/article/us-state-ai-governance-legislation-tracker/`
  Kategorien: Gesetze
  Erreichbar, aber veraltet (fast 6 Monate seit dem letzten Update). Seite 325 KB, Chart und Map nur per JS. Kein Feed gefunden.
- **BakerHostetler – AI Case Tracker** · html-page · NICHT nutzbar, Bot-Schutz · HTTP 200 · neuestes: dateModified 2026-07-23
  `https://www.bakerlaw.com/services/artificial-intelligence-ai/case-tracker-artificial-intelligence-copyrights-and-class-actions/`
  Kategorien: Gesetze
  Veraltet (über 90 Tage ohne Änderung), kein Feed, 206 KB, Cloudflare. Durch ChatGPT Is Eating the World und CourtListener ersetzen. Geprüft: GWU DAIL (https://blogs.gwu.edu/law-eti/ai-litigation-database/) ist nur eine Landing-Page ohne Datumsangaben.
- **BayLDA RSS** · rss · NICHT nutzbar · HTTP 200 · neuestes: 2026-03-12
  `https://www.lda.bayern.de/de/rss.xml`
  Kategorien: Gesetze
  Echter Feed mit 20 Items, aber stale (letztes Item 12.03.2026). Trotzdem wöchentlich mitlaufen lassen: wenig Aktivität, aber relevante Verfahren (z. B. DeepSeek, Meta-Training).
  (aus der Nachprüfung)

## Fallen

- EUR-Lex: HTML-Seiten (ELI/CELEX) liefern 202 mit leerem Body und Header x-amzn-waf-action: challenge (AWS WAF), mit Bot- und mit Browser-UA. Das RSS (display-feed.rss) war erreichbar. Volltexte deshalb über CELLAR/publications.europa.eu holen, nicht über eur-lex.europa.eu. digital-strategy.ec.europa.eu und der AI Act Service Desk laufen ebenfalls über CloudFront und können von Azure-IPs künftig ebenso gechallenged werden.
- FTC (Akamai) ist komplett geblockt: Bot-UA bekommt 403 'abusive automated request', Browser-UA eine maskierte 404 (auch die Startseite). NY Senate und LegiScan zeigen Cloudflare 'Just a moment' für beide UAs.
- Cloudflare-Quellen, die vom Heim-IP gingen, aber von GitHub-Actions/Azure-IPs gechallenged werden können: Substack (cf-ray), artificialintelligenceact.eu, consilium.europa.eu, nist.gov, copyright.gov, gov.ca.gov, privacy.ca.gov, rapporteur.com, api.congress.gov (cf-ray), bakerlaw.com. Pro Quelle einen Health-Status loggen und bei 403/503 mit Challenge-HTML nicht als 'keine News' werten.
- Feeds ohne brauchbares Datum: BNetzA (kein pubDate, Datum aus URL /2026/20261020_), Bundestag digitales.rss (kein pubDate), Rat der EU (Datum nur in a10:updated), BGBl (pubDate nur YYYY-MM-DD), Bundesrat (ein Item auf 17.12.2026 vordatiert). Deshalb GUID/Link-Dedupe und first-seen-Timestamp im Repo-State.
- Kurze Feeds mit 10 Items (EC Digital Strategy, EC Press Corner standardmäßig, CA Governor, EDPB): bei Spitzen zwischen zwei Läufen gehen Items verloren. Press Corner mit &pagesize=50 abrufen; das DSM-RSS ignoriert ?topic=.
- Die Volltextsuche der Federal Register API liefert viele False Positives (z. B. SNAP-EBT-Karten, Medicare); Public-Inspection-Dokumente tragen ein künftiges publication_date. Deshalb nach type filtern und zusätzlich title/abstract per Keyword prüfen.
- Veraltete oder tote Quellen: artificialintelligenceact.eu/feed (neuestes 07.08.2026), Copyright-Office-RSS (2023), IAPP State Tracker (28.04.2026), BakerHostetler Tracker (23.07.2026), DSK-Beschlüsse-Seite (17.06.2026, Entschließungen dagegen aktuell). Die URL-Pfade auf der BfDI-, BSI- und BNetzA-Startseite haben sich geändert (alte Feed-URLs liefern 404). BNetzA-Feeds funktionieren nur mit ?nn=693926.
- Umbenennungen 2026 brechen Keyword-Filter: ai.gov leitet auf si.gov ('Super Intelligence') weiter, NIST /artificial-intelligence auf /super-intelligence, CAISI heißt jetzt CAISSI, Euractiv leitet auf Rapporteur weiter, CPPA heißt CalPrivacy (privacy.ca.gov). Keywords 'super intelligence|Superintelligenz' ergänzen.
- Bundestag DIP: Der öffentliche Key steht nur auf einer JS-gerenderten Hilfeseite und wird rotiert, also nicht hart einbauen. Einen persönlichen Dauer-Key beantragen. Congress.gov /bill hat keine Keyword-Suche (nur Listen-Scan), DEMO_KEY mit Ratelimit 10.
- Große Volltext-Feeds und Seiten (WH 575 KB, AI-Act-Substack 321 KB, netzpolitik 446 KB, BGBl 420 KB, CJEU-Seite 934 KB, artificialintelligenceact.eu 757 KB): vor dem Claude-Call auf Titel plus ~300–1.500 Zeichen kürzen, sonst ist das 10-EUR-Budget gefährdet.
- Strukturierten Status liefern nur Federal Register (type/effective_on/comments_close_on), DIP (beratungsstand/verkuendung/inkrafttreten), OEIL ('Stage reached in procedure'), Congress.gov (latestAction), Have Your Say (frontEndStage), CourtListener (dateFiled) sowie die BGBl- und ABl-Veröffentlichung. Alle anderen Quellen brauchen eine Status-Extraktion durch Claude aus Fließtext, die fehleranfällig ist; das Dashboard sollte sie als 'laut Meldung' kennzeichnen.
- colorado.gov-Bill-Seiten liefern 406 ohne Accept-Header; die Have-Your-Say-API ist undokumentiert und antwortet auf sort-Parameter mit 406.

## Empfehlungen der Recherche

- Core-Set (12 Quellen, alle ohne Key außer DIP): EC Digital Strategy RSS, EUR-Lex OJ-L-RSS (rssId=222), AI-Act-Substack, AI Act Service Desk Timeline (Diff), BNetzA-PM-RSS, BMDS-RSS, Bundestag digitales.rss, DIP-API (sobald persönlicher Key da), Federal Register API, White House Presidential Actions, MultiState Updates, ChatGPT Is Eating the World.
- Billiges Vorfiltern vor Claude: Regex-Keywordlisten EN (artificial intelligence|\bAI\b|AI Act|2024/1689|GPAI|general-purpose|algorithm|automated decision|ADMT|deepfake|chatbot|frontier|super ?intelligence|foundation model|copyright.*(AI|training)) und DE (Künstliche Intelligenz|\bKI\b|KI-|KI-Verordnung|KI-MIG|Sprachmodell|Algorithm|Deepfake|Superintelligenz). Dazu Blacklist für Kalender-, Personal- und Agenda-Items. Erwartetes Volumen nach Filter: ca. 3–10 Rechts-Items pro Tag.
- Statusmodell im Dashboard fest definieren: Entwurf/Vorschlag → Konsultation → in Verhandlung (Ausschuss/Trilog) → angenommen → verkündet/veröffentlicht → in Kraft → gilt ab (Datum); für Gerichte: Klage → Anhörung → Urteil/Vergleich. Den Status aus strukturierten Quellen (FR, DIP, OEIL, BGBl, ABl) deterministisch setzen; Claude nur für unstrukturierte Meldungen und dann als 'laut Meldung' markieren.
- Eine kuratierte, statische Fristen-Tabelle (JSON im Repo) für EU AI Act (aus der Service-Desk-Timeline inkl. Digital-Omnibus), KI-MIG/BNetzA, Colorado (coag.gov/ai), Kalifornien (SB 53, CalPrivacy ADMT), Texas TRAIGA und NY RAISE pflegen. Die Quellseiten wöchentlich diffen; nur bei Änderung Claude befragen und den PR-Diff zur Prüfung anlegen.
- HTML-Diff-Quellen (OEIL-Watchlist, coag.gov/ai, Copyright NewsNet, DSK, CJEU, BNetzA KI-Service-Desk, Service-Desk-Timeline) nur einmal täglich bzw. wöchentlich abrufen statt dreimal täglich. Diffen über einen normalisierten Textauszug des relevanten Abschnitts, nicht über Roh-HTML (Tracking-IDs).
- Collector-Hygiene für GitHub Actions: UA mit Kontakt-URL, ETag/If-Modified-Since, -m 20, ein Retry mit Backoff, fail-soft. Health-JSON pro Quelle (HTTP-Code, Challenge erkannt, neuestes Item) mit Hinweis auf dem Dashboard. Bei wiederholter Cloudflare- oder WAF-Challenge die Quelle automatisch pausieren statt das Budget zu verbrennen.
- Kostenlose Keys beantragen und als GitHub Secrets ablegen: DIP-Dauer-Key (Mail an parlamentsdokumentation@bundestag.de), api.data.gov (Congress.gov und regulations.gov), CourtListener-Token, Open-States-Key. Kein Key ist für den MVP zwingend außer DIP.
- Für Volltexte von EU-Rechtsakten CELLAR (publications.europa.eu, SPARQL und REST) statt eur-lex.europa.eu verwenden; im Dashboard trotzdem auf die EUR-Lex-URL verlinken (für Browser ohne Problem).
- Claude-Calls bündeln: pro Lauf alle neuen gefilterten Rechts-Items in einem Batch-Prompt (Titel, Quelle, Datum, 300 Zeichen Teaser, strukturierte Statusfelder) bewerten und zusammenfassen lassen; bei kleinen Batches ein Haiku-Modell. Duplikate über Quellen hinweg (z. B. dieselbe AI-Act-Meldung in DSM, Substack und Rapporteur) vorher per URL- oder Titel-Ähnlichkeit clustern.
