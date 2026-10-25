// Öffentliche Konstanten: nichts Geheimes, nichts, was sich je Lauf ändert
import type { Meta } from '../shared/types.ts';

export { REPO_URL, PAGES_URL, FEEDBACK_API_URL } from '../shared/config.ts';

// Leer bis zur Entscheidung des Nutzers zu Impressum/Datenschutz – dann entfällt die Footer-Zeile
export const LEGAL_LINKS: { label: 'Impressum' | 'Datenschutz'; href: string }[] = [];

export const CREDITS_FALLBACK: Meta['credits'] = [
  { name: 'LMArena Leaderboard-Dataset', url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset', license: 'CC-BY-4.0' },
  { name: 'Epoch AI', url: 'https://epoch.ai/benchmarks/use-this-data', license: 'CC-BY-4.0' },
  { name: 'Artificial Analysis (über OpenRouter)', url: 'https://artificialanalysis.ai/' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/' },
  { name: 'Open Terms Archive', url: 'https://opentermsarchive.org/', license: 'ODC-By' },
];
