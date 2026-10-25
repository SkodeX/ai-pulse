import { useState } from 'react';
import { useFristen } from '../data/load.ts';
import { dateDe, daysUntil, inDays, safeHref } from '../lib/format.ts';
import { FRIST_KIND, JURISDICTION, LAW_LABEL } from '../texts.ts';

const KINDS = [['alle', 'Alle'], ['gesetz', 'Gesetze'], ['gericht', 'Gerichte'], ['agb', 'AGB'], ['modell', 'Abschaltungen']] as const;

export function DeadlinesView() {
  const fristen = useFristen();
  const [kind, setKind] = useState<string>('alle');
  const [past, setPast] = useState(false);
  if (fristen.status === 'loading') return <div className="view"><p className="muted">Lädt …</p></div>;
  const all = fristen.data?.items ?? [];
  const list = all
    .filter(f => kind === 'alle' || f.kind === kind)
    .filter(f => past || !f.date || daysUntil(f.date) >= 0)
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  return (
    <div className="view">
      <h1>Fristen</h1>
      <p className="lead">Stichtage zu Gesetzen, Gerichten, AGB und Modell-Abschaltungen.</p>
      {all.length === 0 ? <p className="empty">Noch keine Fristen-Datei. Sie kommt mit dem Fristen-Modul.</p> : (
        <>
          <div className="chips" role="list">
            {KINDS.map(([k, l]) => <button key={k} role="listitem" className="pill" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
            <button className="pill" aria-pressed={past} onClick={() => setPast(p => !p)}>Vergangene</button>
          </div>
          <ol className="timeline">
            {list.map(f => {
              const d = f.date ? daysUntil(f.date) : null;
              const href = safeHref(f.sourceUrl);
              const status = f.kind === 'agb' ? (f.status === 'in_kraft' ? 'gilt' : 'angekündigt') : f.kind === 'modell' ? (f.status === 'in_kraft' ? 'abgeschaltet' : 'angekündigt') : LAW_LABEL[f.status] ?? f.status;
              return (
                <li key={f.id} className={d !== null && d >= 0 && d <= 14 ? 'soon' : ''}>
                  <span className="t-date">{f.date ? `${dateDe(f.date)} · ${inDays(d!)}` : 'Datum prüfen'}</span>
                  <span className="t-title">{f.title}</span>
                  <span className="muted small">
                    {FRIST_KIND[f.kind] ?? f.kind} · {status}
                    {f.jurisdiction ? ` · ${JURISDICTION[f.jurisdiction] ?? f.jurisdiction}${f.region ? ` (${f.region})` : ''}` : ''}
                    {f.provider ? ` · ${f.provider}` : ''}
                    {href && <> · <a href={href} target="_blank" rel="noopener noreferrer">Quelle</a></>}
                  </span>
                  {f.note && <span className="muted small">{f.note}</span>}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
