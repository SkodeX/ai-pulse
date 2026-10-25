import { useEffect } from 'react';
import type { Briefing, Frist, Latest } from '../../shared/types.ts';
import { BriefingPanel } from '../components/BriefingPanel.tsx';
import { StoryCard } from '../components/StoryCard.tsx';
import { useFristen } from '../data/load.ts';
import { daysUntil, dateDe } from '../lib/format.ts';
import { isForMe, sortStories } from '../lib/sort.ts';
import { DEFAULT_FILTERS, useStored } from '../lib/storage.ts';
import type { Filters, ReadState } from '../lib/storage.ts';
import { isNewSinceVisit } from '../lib/visit.ts';
import { FRIST_KIND } from '../texts.ts';

export function FristStrip({ fristen }: { fristen: Frist[] }) {
  const next = fristen.filter(f => f.date && daysUntil(f.date) >= 0).sort((a, b) => a.date!.localeCompare(b.date!)).slice(0, 6);
  if (next.length === 0) return null;
  return (
    <div className="strip" role="list">
      {next.map(f => {
        const d = daysUntil(f.date!);
        return (
          <a role="listitem" key={f.id} className={`due${d <= 14 ? ' soon' : ''}`} href="#/fristen">
            <span className="due-date">{dateDe(f.date!)} · {d === 0 ? 'heute' : `in ${d} T.`}</span>
            <span>{f.title}</span>
            <span className="muted small">{FRIST_KIND[f.kind] ?? f.kind}{f.provider ? ` · ${f.provider}` : f.jurisdiction ? ` · ${f.jurisdiction}` : ''}</span>
          </a>
        );
      })}
    </div>
  );
}

export function TodayView({ latest, briefing, focus }: { latest: Latest; briefing?: Briefing; focus?: string | null }) {
  const filters = useStored<Filters>('filters', DEFAULT_FILTERS);
  const read = useStored<ReadState>('read', { v: 1, ids: {} });
  const fristen = useFristen();
  const stories = latest.stories;
  const top = sortStories(stories, 'score').filter(s => !s.hype && s.score >= filters.minScore && !(filters.hideRead && read.ids[s.id])).slice(0, 10);
  const newN = stories.filter(s => isNewSinceVisit(s.firstSeen)).length;
  const mineN = stories.filter(isForMe).length;
  const hypeN = stories.filter(s => s.hype).length;

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`s-${focus}`);
    el?.scrollIntoView({ block: 'center' });
  }, [focus]);

  return (
    <div className="view">
      {briefing && <BriefingPanel briefing={briefing} stories={stories} />}
      <div className="pills">
        <a className="pill" href="#/kategorie/neu"><b>{newN}</b> neu seit letztem Besuch</a>
        <a className="pill" href="#/kategorie/fuer-mich"><b>{mineN}</b> Änderungen für mich</a>
        <a className="pill" href="#/kategorie/hype"><b>{hypeN}</b> Hype &amp; Zitate</a>
      </div>
      {fristen.data && fristen.data.length > 0 && (
        <>
          <h2 className="sec">Nächste Fristen</h2>
          <FristStrip fristen={fristen.data} />
        </>
      )}
      <h2 className="sec">Top 10 <small>ab Score {filters.minScore}, ohne Gelesenes und Hype</small></h2>
      <div className="list">
        {top.length ? top.map(s => <StoryCard key={s.id} story={s} isNew={isNewSinceVisit(s.firstSeen)} highlight={s.id === focus} />) : <p className="empty">Alles gelesen – oder der Mindest-Score ist zu hoch.</p>}
      </div>
      <a className="more-btn" href="#/kategorie/alle">Alle {stories.length} Meldungen anzeigen</a>
    </div>
  );
}
