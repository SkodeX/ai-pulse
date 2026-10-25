import { Bookmark, BookmarkCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { TopListsFile } from '../../shared/types.ts';
import { useData } from '../data/load.ts';
import { absTime, safeHref } from '../lib/format.ts';
import { useStored, write } from '../lib/storage.ts';

// „Die 50 besten …": data/toplists.json, wöchentlich. Merker lokal (aipulse.topSaved), später geräteübergreifend.
interface TopSaved { v: 1; ids: Record<string, { name: string; url: string; savedAt: string }> }

export default function TopListsView() {
  const data = useData<TopListsFile>('toplists.json');
  const saved = useStored<TopSaved>('topSaved', { v: 1, ids: {} });
  const [tab, setTab] = useState<string>('repos');
  const [onlyRising, setOnlyRising] = useState(false);
  const toggle = (id: string, name: string, url: string) => {
    const ids = { ...saved.ids };
    if (ids[id]) delete ids[id];
    else ids[id] = { name, url, savedAt: new Date().toISOString() };
    write('topSaved', { v: 1, ids });
  };

  if (data.status === 'loading') return <div className="view"><p className="muted">Lädt …</p></div>;
  if (!data.data) return <div className="view"><h1>Top 50</h1><p className="empty">Die Top-Listen kommen mit dem nächsten Wochen-Update (sonntags).</p></div>;
  const lists = data.data.lists;
  const list = lists.find(l => l.id === tab) ?? lists[0]!;
  const items = list.items.filter(i => !onlyRising || i.rising);
  const savedList = Object.entries(saved.ids);

  return (
    <div className="view">
      <h1>Top 50</h1>
      <p className="lead small">Stand {absTime(data.data.generatedAt)} · wöchentlich · Rang aus Sternen und Wachstum der letzten 7 Tage, nur gepflegte Projekte</p>
      <div className="chips" role="tablist">
        {lists.map(l => <button key={l.id} role="tab" className="pill" aria-selected={l.id === list.id} aria-pressed={l.id === list.id} onClick={() => setTab(l.id)}>{l.title.replace(' (KI)', '').replace(' (Trending)', '')}</button>)}
        <button className="pill" aria-pressed={tab === 'merker'} onClick={() => setTab('merker')}>★ Merker <b>{savedList.length}</b></button>
      </div>

      {tab === 'merker' ? (
        savedList.length === 0 ? <p className="empty">Noch nichts gemerkt. Tippe bei einem Eintrag auf das Lesezeichen.</p> : (
          <ul className="toplist">
            {savedList.map(([id, s]) => {
              const h = safeHref(s.url);
              return <li key={id}><span className="nm"><b>{h ? <a href={h} target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}</b></span><button className="icon-btn" aria-pressed="true" aria-label="Merker entfernen" onClick={() => toggle(id, s.name, s.url)}><BookmarkCheck size={18} /></button></li>;
            })}
          </ul>
        )
      ) : (
        <>
          <p className="muted small">{list.hint}</p>
          <label className="check"><input id="rising" type="checkbox" checked={onlyRising} onChange={e => setOnlyRising(e.target.checked)} /> Nur Aufsteiger der Woche</label>
          <ol className="toplist">
            {items.map((it, i) => {
              const h = safeHref(it.url);
              const isSaved = Boolean(saved.ids[it.id]);
              return (
                <li key={it.id}>
                  <span className="pos">{list.items.indexOf(it) + 1 || i + 1}</span>
                  <span className="nm">
                    <b>{h ? <a href={h} target="_blank" rel="noopener noreferrer">{it.name}</a> : it.name}</b>
                    <small>{it.useCase ?? it.description}</small>
                    <small className="muted">{it.stars.toLocaleString('de-DE')} {list.unit}{it.growth7d !== null ? ` · +${it.growth7d.toLocaleString('de-DE')} in 7 Tagen` : ''}{it.language ? ` · ${it.language}` : ''}{it.rising ? '' : ''}</small>
                  </span>
                  {it.rising && <span className="badge rise" title="Aufsteiger der Woche"><TrendingUp size={12} aria-hidden="true" />Aufsteiger</span>}
                  <button className="icon-btn" aria-pressed={isSaved} aria-label={isSaved ? 'Gemerkt' : 'Merken'} onClick={() => toggle(it.id, it.name, it.url)}>{isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>
                </li>
              );
            })}
          </ol>
          {!list.items.some(i => i.useCase) && <p className="muted small">Die deutschen Use-Case-Beschreibungen ergänzt später Claude (nur für neue Einträge). Bis dahin steht hier die Original-Beschreibung.</p>}
        </>
      )}
    </div>
  );
}
