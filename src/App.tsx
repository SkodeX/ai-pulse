import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { CATEGORY_KEYS } from '../shared/categories.ts';
import { BottomNav, StaleBanner, TopBar } from './components/Chrome.tsx';
import { Footer } from './components/Footer.tsx';
import { debug, reloadCore, useBriefing, useLatest, useMeta } from './data/load.ts';
import { useRoute } from './lib/router.ts';
import { pruneRead, read } from './lib/storage.ts';
import type { Display } from './lib/storage.ts';
import { isNewSinceVisit } from './lib/visit.ts';
import { T } from './texts.ts';
import { CategoryView, SPECIAL } from './views/CategoryView.tsx';
import { TodayView } from './views/TodayView.tsx';

const ModelsView = lazy(() => import('./views/ModelsView.tsx'));
const DeadlinesView = lazy(() => import('./views/DeadlinesView.tsx').then(m => ({ default: m.DeadlinesView })));
const TopListsView = lazy(() => import('./views/TopListsView.tsx'));
const MoreView = lazy(() => import('./views/MoreView.tsx').then(m => ({ default: m.MoreView })));

class Boundary extends Component<{ children: ReactNode }, { error?: string }> {
  state: { error?: string } = {};
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(e: Error) { window.__lastError = e.message; }
  render() { return this.state.error ? <p className="empty">Fehler in dieser Ansicht: {this.state.error}</p> : this.props.children; }
}

pruneRead();
if (!location.hash || location.hash === '#/' || location.hash === '#') location.replace('#/heute');

export default function App() {
  const { path, query } = useRoute();
  const latest = useLatest();
  const briefing = useBriefing();
  const meta = useMeta();
  const parts = path.split('/');
  const view = parts[1] || 'heute';

  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  debug.route = path;
  debug.backend = meta.data?.budget?.level;

  const generatedAt = meta.data?.generatedAt ?? latest.data?.generatedAt;
  const newCount = latest.data?.stories.filter(s => isNewSinceVisit(s.firstSeen)).length ?? 0;

  let content: ReactNode;
  if (latest.status === 'loading' && !latest.data) content = <p className="muted view">Lädt …</p>;
  else if (!latest.data) content = <div className="empty view"><p>{T.loadError}</p><button className="btn" onClick={reloadCore}>{T.retry}</button></div>;
  else if (view === 'kategorien') {
    const last = read<Display>('display', { v: 1 }).lastCategory;
    location.replace(`#/kategorie/${last && CATEGORY_KEYS.includes(last as never) ? last : 'alle'}`);
    content = null;
  } else if (view === 'kategorie') {
    const key = parts[2] ?? 'alle';
    content = CATEGORY_KEYS.includes(key as never) || SPECIAL[key] ? <CategoryView latest={latest.data} cat={key} provider={query.get('anbieter')} /> : <TodayView latest={latest.data} briefing={briefing.data} />;
  } else if (view === 'modelle') content = <ModelsView />;
  else if (view === 'fristen') content = <DeadlinesView />;
  else if (view === 'top') content = <TopListsView />;
  else if (view === 'mehr' || view === 'gemerkt' || view === 'einstellungen' || view === 'briefing') content = <MoreView section={view === 'mehr' ? undefined : view} briefing={briefing.data} latest={latest.data} />;
  else content = <TodayView latest={latest.data} briefing={briefing.data} focus={query.get('s')} />;

  return (
    <>
      <a className="skip" href="#inhalt">Zum Inhalt</a>
      <TopBar generatedAt={generatedAt} run={meta.data?.run ?? latest.data?.run} />
      <main id="inhalt" className="wrap">
        <StaleBanner generatedAt={generatedAt} />
        <Boundary key={view}>
          <Suspense fallback={<p className="muted view">Lädt …</p>}>{content}</Suspense>
        </Boundary>
      </main>
      <Footer meta={meta.data} />
      <BottomNav path={path} newCount={newCount} />
    </>
  );
}
