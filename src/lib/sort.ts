// Sortierung und Filter als reine Funktionen (unter Node testbar, src/lib/sort.test.ts).
import type { Story } from '../../shared/types.ts';

export type SortKey = 'score' | 'impact' | 'personal';

export function sortStories(list: Story[], key: SortKey): Story[] {
  const by = (a: Story, b: Story, k: SortKey) => b[k] - a[k];
  return [...list].sort((a, b) => {
    if (key === 'score') return by(a, b, 'score') || by(a, b, 'impact') || b.firstSeen.localeCompare(a.firstSeen);
    if (key === 'impact') return by(a, b, 'impact') || by(a, b, 'personal') || b.firstSeen.localeCompare(a.firstSeen);
    return by(a, b, 'personal') || by(a, b, 'impact') || b.firstSeen.localeCompare(a.firstSeen);
  });
}

export function normalize(text: string): string {
  return text.toLocaleLowerCase('de').normalize('NFKD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss');
}

export function matchesQuery(s: Story, q: string): boolean {
  if (!q.trim()) return true;
  const hay = normalize([s.title, s.originalTitle, s.summary ?? '', s.tags.join(' '), s.sources.map(x => x.name).join(' ')].join(' '));
  return normalize(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

// Zeitraum über firstSeen (nie publishedAt)
export function inRange(s: Story, range: 'today' | '24h' | '72h', now: Date, todayStartIso: string): boolean {
  const t = Date.parse(s.firstSeen);
  if (range === 'today') return s.firstSeen >= todayStartIso;
  if (range === '24h') return now.getTime() - t <= 24 * 3600e3;
  return now.getTime() - t <= 72 * 3600e3;
}

// Eigene Werkzeuge des Profils (Steckbrief): Änderungen an Preisen, AGB, Sicherheit, Modellen
const OWN_TOOLS = /\b(claude|anthropic|chatgpt|codex|openai|gemini|copilot|cursor|ollama|n8n|open webui|comfyui)\b/i;
export function isForMe(s: Story): boolean {
  return ['preise', 'vertraege', 'sicherheit', 'modelle'].includes(s.category) && (OWN_TOOLS.test(s.title) || OWN_TOOLS.test(s.originalTitle) || s.tags.some(t => OWN_TOOLS.test(t)));
}
