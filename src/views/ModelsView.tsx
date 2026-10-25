import { useData } from '../data/load.ts';

// Modelle & Tools (Phase 4): liest data/models.json; bis dahin Hinweis statt leerer Seite.
export interface ModelsFile {
  generatedAt: string;
  boards: { title: string; hint: string; unit: string; rows: { name: string; provider: string; value: number; price: number | null }[] }[];
}

export default function ModelsView() {
  const models = useData<ModelsFile>('models.json');
  return (
    <div className="view">
      <h1>Modelle &amp; Tools</h1>
      {models.status === 'loading' && <p className="muted">Lädt …</p>}
      {(models.status === 'missing' || models.status === 'error') && <p className="empty">Die Bestenlisten kommen mit dem Modelle-Modul (Aktualisierung Mo, Mi, Fr).</p>}
      {models.data && (
        <div className="grid">
          {models.data.boards.map(b => (
            <section key={b.title} className="box">
              <h3>{b.title}</h3>
              <p className="muted small">{b.hint}</p>
              <ol className="rank">
                {b.rows.slice(0, 8).map((r, i) => (
                  <li key={r.name}><span className="pos">{i + 1}</span><span className="nm"><b>{r.name}</b><small>{r.provider}</small></span><span className="val">{r.value}<small>{b.unit}</small></span></li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
