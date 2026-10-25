// Statische Anbieter-Basis mit Aliassen (Startbestand; dynamische Watchlist ab Phase 4, Skill modelle-und-ranglisten).
// Dient in Phase 2 für Tag-Normalisierung und den Watchlist-Bonus im Vor-Score.

export interface WatchProvider { org: string; displayName: string; aliases: string[] }

export const BASE_PROVIDERS: WatchProvider[] = [
  { org: 'openai', displayName: 'OpenAI', aliases: ['openai', 'chatgpt', 'gpt', 'codex', 'sora'] },
  { org: 'anthropic', displayName: 'Anthropic', aliases: ['anthropic', 'claude'] },
  { org: 'google', displayName: 'Google', aliases: ['google', 'deepmind', 'gemini', 'gemma'] },
  { org: 'meta', displayName: 'Meta', aliases: ['meta', 'llama', 'muse'] },
  { org: 'microsoft', displayName: 'Microsoft', aliases: ['microsoft', 'copilot', 'azure', 'foundry'] },
  { org: 'amazon', displayName: 'Amazon', aliases: ['amazon', 'aws', 'bedrock', 'nova'] },
  { org: 'xai', displayName: 'xAI', aliases: ['xai', 'grok'] },
  { org: 'mistral', displayName: 'Mistral AI', aliases: ['mistral', 'le chat'] },
  { org: 'deepseek', displayName: 'DeepSeek', aliases: ['deepseek'] },
  { org: 'alibaba', displayName: 'Alibaba (Qwen)', aliases: ['alibaba', 'qwen'] },
  { org: 'moonshot', displayName: 'Moonshot AI (Kimi)', aliases: ['moonshot', 'kimi'] },
  { org: 'zai', displayName: 'Z.ai (GLM)', aliases: ['zhipu', 'z.ai', 'glm'] },
  { org: 'minimax', displayName: 'MiniMax', aliases: ['minimax'] },
  { org: 'nvidia', displayName: 'NVIDIA', aliases: ['nvidia', 'nemotron'] },
  { org: 'aleph-alpha', displayName: 'Aleph Alpha', aliases: ['aleph alpha'] },
  { org: 'bfl', displayName: 'Black Forest Labs', aliases: ['black forest labs', 'flux'] },
  { org: 'deepl', displayName: 'DeepL', aliases: ['deepl'] },
]

const ALIAS_TO_NAME = new Map<string, string>()
for (const p of BASE_PROVIDERS) for (const a of p.aliases) ALIAS_TO_NAME.set(a, p.displayName)

// Tag auf Anzeigenamen normalisieren, wenn er ein Anbieter-Alias ist (sonst unverändert).
export function normalizeTag(tag: string): string {
  return ALIAS_TO_NAME.get(tag.trim().toLowerCase()) ?? tag.trim()
}

const PROVIDER_RE = new RegExp(String.raw`\b(${[...ALIAS_TO_NAME.keys()].map(a => a.replace(/[.]/g, '\\.').replace(/ /g, '\\s+')).join('|')})\b`, 'i')

export function mentionsWatchProvider(text: string): boolean {
  return PROVIDER_RE.test(text)
}
