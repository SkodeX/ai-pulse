import { ChevronDown } from 'lucide-react';
import type { Briefing, Story } from '../../shared/types.ts';
import { read, useStored, write } from '../lib/storage.ts';
import type { Display } from '../lib/storage.ts';
import { BRIEFING_HEAD, modelLabel } from '../texts.ts';

export function BriefingPanel({ briefing: b, stories, full = false }: { briefing: Briefing; stories: Story[]; full?: boolean }) {
  const display = useStored<Display>('display', { v: 1 });
  const collapsed = !full && display.briefingCollapsedFor === b.generatedAt;
  const ids = new Set(stories.map(s => s.id));
  const toggle = () => write('display', { ...read<Display>('display', { v: 1 }), briefingCollapsedFor: collapsed ? undefined : b.generatedAt });
  const jump = (id: string) => {
    const el = document.getElementById(`s-${id}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('is-hl'); setTimeout(() => el.classList.remove('is-hl'), 1800); }
  };

  return (
    <section className="brief" aria-label="Briefing">
      <header className="brief-head">
        <span className="eyebrow">{BRIEFING_HEAD[b.kind] ?? 'Briefing'}</span>
        {!full && <button className="icon-btn" aria-expanded={!collapsed} aria-label={collapsed ? 'Briefing aufklappen' : 'Briefing einklappen'} onClick={toggle}><ChevronDown size={18} className={collapsed ? '' : 'rot'} /></button>}
      </header>
      <h2>{b.title}</h2>
      {!collapsed && (
        <>
          <p>{b.intro}</p>
          {b.items.length > 0 && (
            <ol>
              {b.items.map(i => (
                <li key={i.storyId}>
                  {ids.has(i.storyId) ? <a href={`#/heute?s=${i.storyId}`} onClick={() => jump(i.storyId)}>{i.text}</a> : i.text}
                </li>
              ))}
            </ol>
          )}
          {b.outlook && <p className="muted">{b.outlook}</p>}
          <p className="small muted">{modelLabel(b.model)}</p>
        </>
      )}
    </section>
  );
}
