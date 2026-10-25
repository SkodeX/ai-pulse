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

// Org-Schlüssel je Quelle (Alias-Tabelle, Skill modelle-und-ranglisten references/aliases.md)
export interface OrgAlias { org: string; displayName: string; arena: string | null; openrouter: string[]; hf: string[]; group: 'basis' | 'rangliste' | 'beobachtet' | 'fest' }

export const ORG_ALIASES: OrgAlias[] = [
  { org: 'openai', displayName: 'OpenAI', arena: 'openai', openrouter: ['openai'], hf: ['openai'], group: 'basis' },
  { org: 'anthropic', displayName: 'Anthropic', arena: 'anthropic', openrouter: ['anthropic'], hf: [], group: 'basis' },
  { org: 'google', displayName: 'Google', arena: 'google', openrouter: ['google'], hf: ['google'], group: 'basis' },
  { org: 'meta', displayName: 'Meta', arena: 'meta', openrouter: ['meta', 'meta-llama'], hf: ['meta-models'], group: 'basis' },
  { org: 'microsoft', displayName: 'Microsoft', arena: 'microsoft', openrouter: ['microsoft'], hf: ['microsoft'], group: 'basis' },
  { org: 'amazon', displayName: 'Amazon', arena: 'amazon', openrouter: ['amazon'], hf: ['amazon'], group: 'basis' },
  { org: 'xai', displayName: 'xAI (SpaceXSI)', arena: 'xai', openrouter: ['x-ai'], hf: ['xai-org'], group: 'basis' },
  { org: 'mistral', displayName: 'Mistral AI', arena: 'mistral', openrouter: ['mistralai'], hf: ['mistralai'], group: 'basis' },
  { org: 'deepseek', displayName: 'DeepSeek', arena: 'deepseek', openrouter: ['deepseek'], hf: ['deepseek-ai'], group: 'basis' },
  { org: 'alibaba', displayName: 'Alibaba (Qwen)', arena: 'alibaba', openrouter: ['qwen'], hf: ['Qwen'], group: 'basis' },
  { org: 'zai', displayName: 'Z.ai (GLM)', arena: 'zai', openrouter: ['z-ai'], hf: ['zai-org'], group: 'rangliste' },
  { org: 'xiaomi', displayName: 'Xiaomi MiMo', arena: 'xiaomi', openrouter: ['xiaomi'], hf: ['XiaomiMiMo'], group: 'rangliste' },
  { org: 'moonshot', displayName: 'Moonshot AI (Kimi)', arena: 'moonshot', openrouter: ['moonshotai'], hf: ['moonshotai'], group: 'rangliste' },
  { org: 'baidu', displayName: 'Baidu (ERNIE)', arena: 'baidu', openrouter: [], hf: ['baidu'], group: 'rangliste' },
  { org: 'bytedance', displayName: 'ByteDance Seed', arena: 'bytedance', openrouter: ['bytedance-seed', 'bytedance'], hf: ['ByteDance-Seed'], group: 'rangliste' },
  { org: 'minimax', displayName: 'MiniMax', arena: 'minimax', openrouter: ['minimax'], hf: ['MiniMaxAI'], group: 'rangliste' },
  { org: 'stepfun', displayName: 'StepFun', arena: 'stepfun', openrouter: ['stepfun'], hf: ['stepfun-ai'], group: 'rangliste' },
  { org: 'tencent', displayName: 'Tencent Hunyuan', arena: 'tencent', openrouter: ['tencent'], hf: ['tencent'], group: 'rangliste' },
  { org: 'thinky', displayName: 'Thinking Machines', arena: 'thinky', openrouter: ['thinkingmachines'], hf: ['thinkingmachines'], group: 'rangliste' },
  { org: 'nvidia', displayName: 'NVIDIA', arena: 'nvidia', openrouter: ['nvidia'], hf: ['nvidia'], group: 'rangliste' },
  { org: 'meituan', displayName: 'Meituan LongCat', arena: 'meituan', openrouter: ['meituan'], hf: ['meituan-longcat'], group: 'beobachtet' },
  { org: 'ant-group', displayName: 'Ant Group (Ling/Ring)', arena: 'ant-group', openrouter: ['inclusionai'], hf: ['inclusionAI'], group: 'beobachtet' },
  { org: 'reflection', displayName: 'Reflection AI', arena: 'reflection', openrouter: ['reflection'], hf: ['reflection'], group: 'beobachtet' },
  { org: 'upstage', displayName: 'Upstage (Solar)', arena: 'upstage', openrouter: ['upstage'], hf: ['upstage'], group: 'beobachtet' },
  { org: 'ibm', displayName: 'IBM Granite', arena: 'ibm', openrouter: ['ibm-granite'], hf: ['ibm-granite'], group: 'beobachtet' },
  { org: 'cohere', displayName: 'Cohere', arena: 'cohere', openrouter: ['cohere'], hf: ['CohereLabs'], group: 'beobachtet' },
  { org: 'allenai', displayName: 'Ai2 (Olmo)', arena: 'allenai', openrouter: [], hf: ['allenai'], group: 'beobachtet' },
  { org: 'inception-ai', displayName: 'Inception (Mercury)', arena: 'inception-ai', openrouter: ['inception'], hf: [], group: 'beobachtet' },
  { org: 'poolside', displayName: 'Poolside', arena: 'poolside', openrouter: ['poolside'], hf: ['poolside'], group: 'beobachtet' },
  { org: 'perplexity', displayName: 'Perplexity', arena: null, openrouter: ['perplexity'], hf: [], group: 'beobachtet' },
  { org: 'bfl', displayName: 'Black Forest Labs', arena: 'bfl', openrouter: [], hf: ['black-forest-labs'], group: 'fest' },
  { org: 'aleph-alpha', displayName: 'Aleph Alpha', arena: null, openrouter: [], hf: ['Aleph-Alpha'], group: 'fest' },
  { org: 'deepl', displayName: 'DeepL', arena: null, openrouter: [], hf: [], group: 'fest' },
]
export const BASE_ORGS = ORG_ALIASES.filter(a => a.group === 'basis').map(a => a.org)
const BY_PREFIX = new Map(ORG_ALIASES.flatMap(a => a.openrouter.map(p => [p, a] as const)))
const BY_ARENA = new Map(ORG_ALIASES.filter(a => a.arena).map(a => [a.arena!, a] as const))
export const orgFromPrefix = (prefix: string): OrgAlias | undefined => BY_PREFIX.get(prefix)
export const orgFromArena = (org: string): OrgAlias | undefined => BY_ARENA.get(org)
export const orgDisplay = (org: string): string => ORG_ALIASES.find(a => a.org === org)?.displayName ?? org

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
