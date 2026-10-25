import { Bot, CircleAlert, Info, KeyRound } from 'lucide-react';
import { useState } from 'react';
import type { Meta } from '../../shared/types.ts';
import { CREDITS_FALLBACK, LEGAL_LINKS, REPO_URL } from '../config.ts';
import { absTime, dateDe, safeHref, usd } from '../lib/format.ts';
import { HEALTH_LABEL, NOTICE_KIND, RUN_LABEL } from '../texts.ts';
import { Sheet } from './Sheet.tsx';

function budgetText(b: Meta['budget']): string | undefined {
  if (b.level === 'abo') return `Bewertet mit Claude (Abo)${b.apiUsdMonth > 0 ? ` · Notfall-API diesen Monat: ${usd(b.apiUsdMonth)} von ${usd(b.apiUsdCap)}` : ''}`;
  if (b.level === 'api') return `Notfall-Modus: Claude Haiku über API · ${usd(b.apiUsdMonth)} von ${usd(b.apiUsdCap)} diesen Monat`;
  if (b.level === 'aus') return `KI-Bewertung pausiert – Schlagzeilen mit Regel-Bewertung, Nachholen im nächsten Lauf${b.resetHint ? ` · Abo wieder frei: ${b.resetHint}` : ''}`;
  return undefined;
}

const ORDER = ['token', 'system'];

export function Footer({ meta }: { meta?: Meta }) {
  const [health, setHealth] = useState(false);
  const credits = meta?.credits?.length ? meta.credits : CREDITS_FALLBACK;
  const notices = [...(meta?.notices ?? [])].sort((a, b) => {
    const ra = ORDER.indexOf(a.kind), rb = ORDER.indexOf(b.kind);
    return (ra < 0 ? 9 : ra) - (rb < 0 ? 9 : rb) || b.since.localeCompare(a.since);
  });
  const c = meta?.health?.counts;
  return (
    <footer className="footer wrap">
      {meta && <p>Stand {absTime(meta.generatedAt)} · {RUN_LABEL[meta.run] ?? meta.run} · {meta.buildId} · App {__APP_VERSION__}</p>}
      {meta?.budget && budgetText(meta.budget) && <p><Bot size={14} aria-hidden="true" /> {budgetText(meta.budget)}</p>}
      {c && <p><button className="linkish" onClick={() => setHealth(true)}>Quellen: {c.ok} ok · {c.degraded} gestört · {c.blockiert} blockiert</button></p>}
      {notices.length > 0 && (
        <div className="notices">
          <h3>Hinweise</h3>
          <ul>
            {notices.map((n, i) => {
              const Icon = n.kind === 'token' ? KeyRound : n.kind === 'system' ? CircleAlert : Info;
              return <li key={i}><Icon size={14} aria-hidden="true" /> <b>{NOTICE_KIND[n.kind] ?? 'Hinweis'}:</b> {n.text} <span className="muted">seit {dateDe(n.since).slice(0, 6)}</span></li>;
            })}
          </ul>
        </div>
      )}
      <p className="credits">
        Daten: {credits.map((x, i) => {
          const h = safeHref(x.url);
          return <span key={x.name}>{i > 0 ? ' · ' : ''}{h ? <a href={h} target="_blank" rel="noopener noreferrer">{x.name}</a> : x.name}{x.license ? ` (${x.license})` : ''}</span>;
        })}
      </p>
      <p><a href={REPO_URL} target="_blank" rel="noopener noreferrer">Quellcode auf GitHub</a></p>
      {LEGAL_LINKS.length > 0 && <p>{LEGAL_LINKS.map((l, i) => <span key={l.label}>{i > 0 ? ' · ' : ''}<a href={l.href}>{l.label}</a></span>)}</p>}
      {health && meta?.health && (
        <Sheet title="Quellenstatus" onClose={() => setHealth(false)}>
          {meta.health.issues.length === 0 ? <p>Alle Quellen ok.</p> : (
            <ul className="plain">
              {meta.health.issues.map(i => <li key={i.id}><b>{i.name}</b>: {HEALTH_LABEL[i.status] ?? i.status} seit {dateDe(i.since)}{i.coveredBy ? ` · abgedeckt durch ${i.coveredBy}` : ''}</li>)}
            </ul>
          )}
          {meta.health.stale.length > 0 && <p className="muted">Lange nichts Neues: {meta.health.stale.join(', ')}</p>}
        </Sheet>
      )}
    </footer>
  );
}
