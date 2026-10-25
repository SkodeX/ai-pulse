import { useDeferredValue, useEffect, useState } from 'react';
import { CATEGORY_KEYS } from '../../shared/categories.ts';
import type { Latest } from '../../shared/types.ts';
import { StoryCard } from '../components/StoryCard.tsx';
import { berlinDay } from '../lib/format.ts';
import { inRange, isForMe, matchesQuery, sortStories } from '../lib/sort.ts';
import type { SortKey } from '../lib/sort.ts';
import { DEFAULT_FILTERS, read, toggleRead, useStored, write } from '../lib/storage.ts';
import type { Display, Filters, ReadState } from '../lib/storage.ts';
import { isNewSinceVisit } from '../lib/visit.ts';
import { CATEGORY_SHORT, T } from '../texts.ts';

export const SPECIAL: Record<string, string> = { alle: 'Alle', neu: 'Neu', 'fuer-mich': 'Für mich geändert', hype: 'Hype & Zitate' };

export function CategoryView({ latest, cat }: { latest: Latest; cat: string }) {
  const filters = useStored<Filters>('filters', DEFAULT_FILTERS);
  const sort = useStored<SortKey>('sort', 'score');
  const readState = useStored<ReadState>('read', { v: 1, ids: {} });
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(20);
  const query = useDeferredValue(q);
  const now = new Date();
  const todayStart = new Date(`${berlinDay(now)}T00:00:00`).toISOString();
  const stories = latest.stories;
  useEffect(() => {
    if (CATEGORY_KEYS.includes(cat as never)) write('display', { ...read<Display>('display', { v: 1 }), lastCategory: cat });
    setShown(20);
  }, [cat]);

  const counts: Record<string, number> = { alle: 0, neu: 0, 'fuer-mich': 0, hype: 0 };
  for (const s of stories) {
    if (!readState.ids[s.id]) {
      if (s.hype) counts.hype!++;
      else { counts.alle!++; counts[s.category] = (counts[s.category] ?? 0) + 1; }
      if (isNewSinceVisit(s.firstSeen)) counts.neu!++;
      if (isForMe(s)) counts['fuer-mich']!++;
    }
  }
  const pick = (s: (typeof stories)[number]) => {
    if (cat === 'hype') return s.hype;
    if (cat === 'neu') return isNewSinceVisit(s.firstSeen);
    if (cat === 'fuer-mich') return isForMe(s);
    if (s.hype) return false;
    return cat === 'alle' || s.category === cat;
  };
  const visible = sortStories(stories, sort).filter(s => pick(s) && s[sort] >= filters.minScore && inRange(s, filters.range, now, todayStart) && !(filters.hideRead && readState.ids[s.id] && cat !== 'neu') && matchesQuery(s, query));
  const setF = (f: Partial<Filters>) => write('filters', { ...filters, ...f });

  return (
    <div className="view">
      <h1>{SPECIAL[cat] ?? CATEGORY_SHORT[cat]}</h1>
      <div className="chips" role="list">
        {[...Object.keys(SPECIAL), ...CATEGORY_KEYS.filter(k => counts[k])].map(k => (
          <a role="listitem" key={k} className="pill" aria-current={k === cat ? 'page' : undefined} href={`#/kategorie/${k}`}>
            {SPECIAL[k] ?? CATEGORY_SHORT[k]} <b>{counts[k] ?? 0}</b>
          </a>
        ))}
      </div>
      <div className="tools">
        <input id="search" type="search" placeholder="Suchen in Titeln, Tags und Quellen" value={q} onChange={e => setQ(e.target.value)} aria-label="Suche" />
        <select id="sort" value={sort} onChange={e => write('sort', e.target.value as SortKey)} aria-label="Sortierung">
          <option value="score">Gesamt</option><option value="impact">Tragweite</option><option value="personal">Für mich</option>
        </select>
        <select id="min" value={filters.minScore} onChange={e => setF({ minScore: Number(e.target.value) })} aria-label="Mindest-Score">
          <option value={0}>alle Scores</option><option value={5}>ab 5</option><option value={6}>ab 6</option><option value={7}>ab 7</option><option value={8}>ab 8</option>
        </select>
        <select id="range" value={filters.range} onChange={e => setF({ range: e.target.value as Filters['range'] })} aria-label="Zeitraum">
          <option value="today">Heute</option><option value="24h">24 h</option><option value="72h">72 h</option>
        </select>
        <label className="check"><input id="hide-read" type="checkbox" checked={filters.hideRead} onChange={e => setF({ hideRead: e.target.checked })} /> Gelesene ausblenden</label>
      </div>
      <p className="count" aria-live="polite">{visible.length} Meldungen</p>
      <div className="list">
        {visible.slice(0, shown).map(s => <StoryCard key={s.id} story={s} sort={sort} isNew={isNewSinceVisit(s.firstSeen)} />)}
      </div>
      {visible.length === 0 && (
        <div className="empty">
          <p>{stories.some(pick) ? T.emptyFilter : T.emptyCategory}</p>
          <button className="btn" onClick={() => write('filters', DEFAULT_FILTERS)}>Filter zurücksetzen</button>
        </div>
      )}
      {visible.length > shown && <button className="more-btn" onClick={() => setShown(n => n + 20)}>Weitere 20</button>}
      {visible.length > 0 && <button className="btn ghost" onClick={() => visible.slice(0, shown).forEach(s => toggleRead(s.id, true))}>Alle sichtbaren als gelesen</button>}
    </div>
  );
}
