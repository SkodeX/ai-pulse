import { useEffect, useState } from 'react';
import type { Briefing, Latest } from '../../shared/types.ts';
import { BriefingPanel } from '../components/BriefingPanel.tsx';
import { safeHref, score } from '../lib/format.ts';
import { DEFAULT_FILTERS, SAVED_MAX, clearAll, toggleSaved, useStored, write } from '../lib/storage.ts';
import type { Display, Filters, SavedState } from '../lib/storage.ts';
import { CATEGORY_SHORT, T } from '../texts.ts';

function InstallHint() {
  const display = useStored<Display>('display', { v: 1 });
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (standalone) return <p className="muted">Läuft als App.</p>;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (display.installHintDismissed) return null;
  return (
    <div className="box">
      <h3>Als App installieren</h3>
      {ios ? <ol><li>Öffne die Seite in Safari und tippe auf „Teilen".</li><li>Wähle „Zum Home-Bildschirm".</li><li>Tippe auf „Hinzufügen".</li></ol>
        : <p>Im Browsermenü findest du „App installieren" bzw. „Zum Startbildschirm hinzufügen".</p>}
    </div>
  );
}

export function MoreView({ section, briefing, latest }: { section?: string; briefing?: Briefing; latest?: Latest }) {
  const saved = useStored<SavedState>('saved', { v: 1, items: [] });
  const filters = useStored<Filters>('filters', DEFAULT_FILTERS);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (section) document.getElementById(section)?.scrollIntoView(); }, [section]);

  return (
    <div className="view">
      <h1>Mehr</h1>
      <nav className="chips" aria-label="Bereiche">
        <a className="pill" href="#/briefing">Briefing</a>
        <a className="pill" href="#/gemerkt">Gemerkt</a>
        <a className="pill" href="#/einstellungen">Einstellungen</a>
      </nav>

      {briefing && section === 'briefing' && <BriefingPanel briefing={briefing} stories={latest?.stories ?? []} full />}

      <h2 className="sec" id="gemerkt">Gemerkt <small>{saved.items.length} von {SAVED_MAX}</small></h2>
      {saved.items.length === 0 ? <p className="empty">{T.emptySaved}</p> : (
        <ul className="saved">
          {saved.items.map(s => {
            const h = safeHref(s.url);
            return (
              <li key={s.id}>
                <span className="cat">{CATEGORY_SHORT[s.category]}</span> <b>{score(s.score)}</b>{' '}
                {h ? <a href={h} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title}
                {s.summary && <p className="muted small">{s.summary}</p>}
                <button className="linkish" onClick={() => toggleSaved(s)}>Entfernen</button>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="sec" id="einstellungen">Einstellungen</h2>
      <div className="box settings">
        <label htmlFor="set-min">Mindest-Score (Startseite und Listen): <b>{filters.minScore || 'aus'}</b></label>
        <input id="set-min" type="range" min={0} max={8} step={1} value={filters.minScore} onChange={e => write('filters', { ...filters, minScore: Number(e.target.value) })} />
        <label className="check"><input id="set-hide" type="checkbox" checked={filters.hideRead} onChange={e => write('filters', { ...filters, hideRead: e.target.checked })} /> Gelesenes ausblenden</label>
        <p className="muted small">{T.privacy}</p>
        {confirm ? (
          <p>Wirklich alles löschen (Gelesen, Gemerkt, Einstellungen)? <button className="btn" onClick={() => { clearAll(); setConfirm(false); }}>Ja, löschen</button> <button className="btn ghost" onClick={() => setConfirm(false)}>Abbrechen</button></p>
        ) : <button className="btn ghost" onClick={() => setConfirm(true)}>Lokale Daten löschen</button>}
      </div>
      <InstallHint />
      <h2 className="sec">Bald</h2>
      <p className="muted">📌 Spickzettel, Top-50-Listen, Archiv und Radar folgen in späteren Phasen.</p>
    </div>
  );
}
