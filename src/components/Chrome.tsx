import { CalendarClock, ClockAlert, Cpu, LayoutGrid, Menu, Sun, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Meta } from '../../shared/types.ts';
import { absTime } from '../lib/format.ts';
import { RUN_LABEL, T } from '../texts.ts';

// Frische: ab 14 h Hinweis in der Kopfzeile, ab 24 h Banner (gemessen an meta.generatedAt bzw. latest.generatedAt)
export function useAgeHours(generatedAt?: string): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10 * 60_000);
    const v = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, []);
  return generatedAt ? (now - Date.parse(generatedAt)) / 3600e3 : 0;
}

export function TopBar({ generatedAt, run }: { generatedAt?: string; run?: Meta['run'] }) {
  const age = useAgeHours(generatedAt);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  return (
    <header className="topbar">
      <div className="wrap topbar-in">
        <a className="logo" href="#/heute" aria-label="AI Pulse – Heute">
          <svg viewBox="0 0 26 16" aria-hidden="true"><path d="M1 9h5l2.5-6 4 11 3-8 2 3h7.5" /></svg>
          AI Pulse
        </a>
        {generatedAt && (
          <span className={`stand${age >= 14 ? ' overdue' : ''}`}>
            {age >= 14 && <ClockAlert size={14} aria-hidden="true" />}
            {!online && `${T.offline} · `}Stand: {absTime(generatedAt)} · {age >= 14 ? T.overdue : run ? RUN_LABEL[run] : ''}
          </span>
        )}
      </div>
    </header>
  );
}

export function StaleBanner({ generatedAt }: { generatedAt?: string }) {
  const age = useAgeHours(generatedAt);
  if (!generatedAt || age < 24) return null;
  return <div className="banner warn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{T.stale(absTime(generatedAt))}</div>;
}

const NAV = [
  { href: '#/heute', match: ['/heute', '/', '/briefing'], label: 'Heute', Icon: Sun },
  { href: '#/kategorien', match: ['/kategorien', '/kategorie'], label: 'Kategorien', Icon: LayoutGrid },
  { href: '#/modelle', match: ['/modelle'], label: 'Modelle', Icon: Cpu },
  { href: '#/fristen', match: ['/fristen'], label: 'Fristen', Icon: CalendarClock },
  { href: '#/mehr', match: ['/mehr', '/gemerkt', '/einstellungen'], label: 'Mehr', Icon: Menu },
];

export function BottomNav({ path, newCount }: { path: string; newCount: number }) {
  const base = '/' + (path.split('/')[1] ?? '');
  return (
    <nav className="bottomnav" aria-label="Hauptnavigation">
      <div className="wrap nav-in">
        {NAV.map(({ href, match, label, Icon }) => (
          <a key={href} href={href} aria-current={match.includes(base) ? 'page' : undefined}>
            <Icon size={22} aria-hidden="true" />
            {label}
            {label === 'Heute' && newCount > 0 && <span className="nav-badge" aria-label={`${newCount} neu`}>{newCount > 99 ? '99+' : newCount}</span>}
          </a>
        ))}
      </div>
    </nav>
  );
}
