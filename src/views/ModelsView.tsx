import { useState } from 'react';
import type { ModelsFile, Watchlist } from '../../shared/types.ts';
import { useData } from '../data/load.ts';
import { absTime, dateDe, daysUntil, inDays, usd } from '../lib/format.ts';

// Modelle & Tools: data/models.json (Bestenlisten, neu, Abschaltungen, Tools) + data/watchlist.json (Anbieter). Aktualisierung Mo/Mi/Fr.
const TABS = [['best', 'Bestenlisten'], ['stack', 'Mein Stack'], ['prov', 'Anbieter'], ['new', 'Neu & Abschaltungen'], ['tools', 'Tools']] as const;
type Tab = typeof TABS[number][0];

// Eigene Werkzeuge (Profil) → passende Bestenliste
const STACK: [string, string][] = [['Claude / Claude Code', 'coding'], ['ChatGPT / Codex', 'text'], ['Gemini', 'text'], ['GitHub Copilot', 'coding'], ['Cursor', 'webdev'], ['Ollama (lokal)', 'value']];
const TREND: Record<string, string> = { up: '↑', down: '↓', same: '→', new: 'neu' };

export default function ModelsView() {
  const models = useData<ModelsFile>('models.json');
  const watch = useData<Watchlist>('watchlist.json');
  const [tab, setTab] = useState<Tab>('best');
  const m = models.data;

  if (models.status === 'loading') return <div className="view"><p className="muted">Lädt …</p></div>;
  if (!m) return <div className="view"><h1>Modelle &amp; Tools</h1><p className="empty">Die Bestenlisten kommen mit dem nächsten Modelle-Update (Mo, Mi, Fr).</p></div>;
  const board = (id: string) => m.boards.find(b => b.id === id);

  return (
    <div className="view">
      <h1>Modelle &amp; Tools</h1>
      <p className="lead small">Stand {absTime(m.generatedAt)} · Aktualisierung Mo, Mi, Fr · Daten: Arena, Artificial Analysis über OpenRouter, Design Arena</p>
      <div className="chips" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" className="pill" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'best' && (
        <div className="grid">
          {m.boards.map(b => {
            const max = Math.max(...b.rows.map(r => r.value));
            return (
              <section key={b.id} className="box">
                <h3>{b.title}</h3>
                <p className="muted small">{b.hint}</p>
                <ol className="rank">
                  {b.rows.slice(0, 8).map((r, i) => (
                    <li key={r.name + i}>
                      <span className="pos">{i + 1}</span>
                      <span className="nm"><b>{r.name}</b><small>{r.provider}{r.price !== null ? ` · ${usd(r.price)}/Mio.` : ''}</small><span className="meter"><i style={{ width: `${Math.round((r.value / max) * 100)}%` }} /></span></span>
                      <span className="val">{r.value.toLocaleString('de-DE')}<small>{b.unit}</small></span>
                    </li>
                  ))}
                </ol>
                {m.recommendations?.[b.id] && <p className="rec">{m.recommendations[b.id]}</p>}
              </section>
            );
          })}
        </div>
      )}

      {tab === 'stack' && (
        <section className="box">
          <h3>Deine Werkzeuge</h3>
          <p className="muted small">Aus deinem Profil · daneben das aktuell beste Modell im passenden Einsatzzweck</p>
          <ul className="stack">
            {STACK.map(([tool, id]) => {
              const b = board(id);
              const top = b?.rows[0];
              return <li key={tool}><b>{tool}</b><span className="muted">{b ? `${b.title}: ${top?.name ?? '–'} (${top?.provider ?? ''})` : '–'}</span></li>;
            })}
          </ul>
          <p className="rec">„Gibt es etwas Besseres für dich?" – die Empfehlung schreibt später Claude Opus (Mo, Mi, Fr).</p>
        </section>
      )}

      {tab === 'prov' && (
        <section className="box">
          {!watch.data ? <p className="muted">Anbieter-Watchlist noch nicht berechnet.</p> : (
            <>
              <p className="muted small">Basis + Top 12 aus Arena-Rangliste und Intelligenz-Index{watch.data.basis.arenaStale ? ' (Arena veraltet, nur Index)' : ''} · Woche {watch.data.week}</p>
              <ol className="rank">
                {watch.data.providers.map(p => (
                  <li key={p.org}>
                    <span className="pos">{p.combinedRank}</span>
                    <span className="nm"><b>{p.displayName}</b><small>{p.reason.includes('basis') ? 'Basis' : ''}{p.reason.includes('basis') && p.reason.includes('top12') ? ' · ' : ''}{p.reason.includes('top12') ? 'Top 12' : ''}{p.trend !== 'same' ? ` · ${TREND[p.trend]}` : ''}</small></span>
                    <span className="val">{p.aaIndex ?? '–'}<small>Index · Arena {p.arenaRating ?? '–'}</small></span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      {tab === 'new' && (
        <>
          <section className="box">
            <h3>Neu in den letzten 30 Tagen</h3>
            <ul className="plain-list">
              {m.fresh.map(f => (
                <li key={f.name}><b>{f.name}</b> <span className="muted small">{f.provider} · {dateDe(f.created)} · {Math.round(f.ctx / 1000)}K Kontext{f.priceIn ? ` · ${usd(f.priceIn)} / ${usd(f.priceOut)} je Mio.` : ''}{f.intel !== null ? ` · Index ${f.intel}` : ''}{f.vision ? ' · Bild' : ''}</span></li>
              ))}
            </ul>
          </section>
          <section className="box">
            <h3>Angekündigte Abschaltungen (OpenRouter)</h3>
            {m.expiring.length === 0 ? <p className="muted">Keine.</p> : (
              <ul className="plain-list">{m.expiring.map(e => <li key={e.name + e.date}><b>{dateDe(e.date)}</b> <span className="muted small">{inDays(daysUntil(e.date))}</span> · {e.name} <span className="muted small">{e.provider}</span></li>)}</ul>
            )}
          </section>
        </>
      )}

      {tab === 'tools' && (
        <div className="grid">
          {m.tools.map(t => (
            <section key={t.group} className="box">
              <h3>{t.group}</h3>
              <div className="chipline">{t.items.map(i => <span key={i}>{i}</span>)}</div>
              {m.recommendations?.[t.group] ? <p className="rec">{m.recommendations[t.group]}</p> : <p className="muted small">Vergleich „welches Tool für was" schreibt später Claude Opus (Mo, Mi, Fr).</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
