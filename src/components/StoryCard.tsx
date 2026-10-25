import { Bookmark, BookmarkCheck, Check, Lock, Megaphone } from 'lucide-react';
import { useState } from 'react';
import type { Story } from '../../shared/types.ts';
import { CATEGORY_ICON } from './icons.tsx';
import { relTime, safeHref, score } from '../lib/format.ts';
import type { SortKey } from '../lib/sort.ts';
import { toggleRead, toggleSaved, useStored } from '../lib/storage.ts';
import type { ReadState, SavedState } from '../lib/storage.ts';
import { CATEGORY_SHORT, JURISDICTION, LAW_LABEL, SEVERITY, T } from '../texts.ts';

export function StoryCard({ story: s, sort = 'score', isNew = false, highlight = false }: { story: Story; sort?: SortKey; isNew?: boolean; highlight?: boolean }) {
  const read = useStored<ReadState>('read', { v: 1, ids: {} });
  const saved = useStored<SavedState>('saved', { v: 1, items: [] });
  const [msg, setMsg] = useState('');
  const isRead = Boolean(read.ids[s.id]);
  const isSaved = saved.items.some(x => x.id === s.id);
  const Icon = CATEGORY_ICON[s.category];
  const href = safeHref(s.url);
  const en = s.ratedBy === 'regel' && s.sources[0]?.lang === 'en';

  const onSave = () => {
    const r = toggleSaved({ id: s.id, title: s.title, url: s.url, category: s.category, impact: s.impact, personal: s.personal, score: s.score, sources: s.sources.map(x => ({ name: x.name, url: x.url })), summary: s.summary, savedAt: new Date().toISOString() });
    setMsg(r === 'full' ? T.savedFull : r === 'error' ? T.storageFull : '');
  };

  return (
    <article className={`card${isRead ? ' is-read' : ''}${highlight ? ' is-hl' : ''}`} data-story={s.id} id={`s-${s.id}`}>
      <div className="card-head">
        {isNew && <span className="dot" aria-label="neu seit deinem letzten Besuch" />}
        <span className="cat">{Icon && <Icon size={13} aria-hidden="true" />}{CATEGORY_SHORT[s.category]}</span>
        <span className="muted">{relTime(s.firstSeen)}</span>
        {s.hype && <span className="badge hype" title="Wirkt übertrieben – Einschätzung von Claude"><Megaphone size={12} aria-hidden="true" />Hype?</span>}
        {s.paywall && <span className="badge pay" title="Artikel kostenpflichtig"><Lock size={12} aria-hidden="true" />Paywall</span>}
        {s.ratedBy === 'regel' && <span className="badge">{T.ruleRated}</span>}
      </div>
      <div className="card-main">
        <h3 lang={en ? 'en' : undefined}>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => toggleRead(s.id, true)}>{s.title}</a> : s.title}
        </h3>
        <div className={`score score-${s.score >= 7 ? 'high' : s.score >= 5 ? 'mid' : 'low'}`} aria-label={`Gesamt ${score(s.score)}`}>
          <b>{score(s.score)}</b>
          <span className={sort === 'impact' ? 'on' : ''} aria-label={`Tragweite ${s.impact} von 10`}>T {s.impact}</span>
          <span className={sort === 'personal' ? 'on' : ''} aria-label={`Für mich ${s.personal} von 10`}>F {s.personal}</span>
        </div>
      </div>
      <div className="entities" aria-label="Betrifft">
        {(s.providers?.length ?? 0) === 0 && (s.models?.length ?? 0) === 0
          ? <span className="ent general">Allgemein</span>
          : <>
              {s.providers?.map(p => <a key={p} className="ent prov" href={`#/kategorie/alle?anbieter=${encodeURIComponent(p)}`}>{p}</a>)}
              {s.models?.map(m => <span key={m} className="ent model">{m}</span>)}
            </>}
      </div>
      {s.summary && <p className="summary">{s.summary}</p>}
      {(s.whyImportant || s.forYou) && (
        <details className="more">
          <summary>Warum wichtig · Für mich</summary>
          {s.whyImportant && <p><b>Warum wichtig:</b> {s.whyImportant}</p>}
          {s.forYou && <p><b>Für mich:</b> {s.forYou}</p>}
        </details>
      )}
      {s.law && LAW_LABEL[s.law.status] && (
        <p className="extra">⚖ {LAW_LABEL[s.law.status]} · {JURISDICTION[s.law.jurisdiction] ?? s.law.jurisdiction}{s.law.effectiveDate ? ` · gilt ab ${s.law.effectiveDate}` : ''}{s.law.statusSource !== 'quelle' ? ' · laut Meldung' : ''}</p>
      )}
      {s.security && <p className="extra">🛡 {SEVERITY[s.security.severity]}{s.security.exploited ? ' · wird aktiv ausgenutzt' : ''}{s.security.cves[0] ? ` · ${s.security.cves[0]}${s.security.cves.length > 1 ? ` +${s.security.cves.length - 1}` : ''}` : ''}</p>}
      <div className="card-foot">
        <span className="sources">
          {s.sources.slice(0, 2).map((x, i) => {
            const h = safeHref(x.url);
            return <span key={x.id + i}>{h ? <a href={h} target="_blank" rel="noopener noreferrer">{x.name}</a> : x.name}{x.lang === 'en' ? <small> EN</small> : null}</span>;
          })}
          {s.sources.length > 2 && <span className="muted">+{s.sources.length - 2} Quellen</span>}
        </span>
        <span className="actions">
          <button className="icon-btn" aria-pressed={isRead} aria-label={isRead ? 'Als ungelesen markieren' : 'Gelesen'} onClick={() => toggleRead(s.id)}><Check size={18} /></button>
          <button className="icon-btn" aria-pressed={isSaved} aria-label={isSaved ? 'Gemerkt' : 'Merken'} onClick={onSave}>{isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>
        </span>
      </div>
      {msg && <p className="warn-text" role="status">{msg}</p>}
    </article>
  );
}
