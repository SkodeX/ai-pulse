// Anbieter- und Modell-Tags je Story (Wunsch 2026-10-25): regelbasiert aus Titel, Teaser und Claude-Tags,
// damit auch Regel-Stories sie haben. Keine Treffer → „Allgemein" im Dashboard.

interface ProviderRule { name: string; re: RegExp }

// Anzeige-Namen kurz halten (Chip); Aliasse aus der Watchlist plus bekannte Produkte
const PROVIDERS: ProviderRule[] = [
  // optionales „s" für deutsche Genitive („OpenAIs", „Googles", „Nvidias")
  { name: 'OpenAI', re: /\b(openais?|chatgpt|gpt[- ]?\d|codex|sora|dall-?e|gpt-image)/i },
  { name: 'Anthropic', re: /\b(anthropics?|claude)\b/i },
  { name: 'Google', re: /\b(googles?|deepmind|gemini|gemma|veo|nano banana|notebooklm|alphafold)\b/i },
  { name: 'Meta', re: /\b(meta ai|meta platforms|llama|muse (?:spark|wonder)|zuckerberg)\b|(?-i:\bMetas?\b)(?![-–])/i },
  { name: 'Microsoft', re: /\b(microsofts?|azure|foundry|bing|phi-\d)\b/i },
  { name: 'GitHub', re: /\b(github|(?<!microsoft )copilot)\b/i },
  { name: 'Amazon', re: /\b(amazons?|aws|bedrock|alexa\+?|amazon nova|kiro)\b/i },
  { name: 'xAI', re: /\b(xai|x\.ai|grok|spacexsi)\b/i },
  { name: 'Mistral AI', re: /\b(mistral|le chat|devstral|codestral|magistral)\b/i },
  { name: 'DeepSeek', re: /\bdeepseek\b/i },
  { name: 'Alibaba', re: /\b(alibaba|qwen\w*|tongyi)\b/i },
  { name: 'Moonshot AI', re: /\b(moonshot ai|kimi)\b/i },
  { name: 'Z.ai', re: /\b(zhipu|z\.ai|glm-?\d[\w.]*)\b/i },
  { name: 'MiniMax', re: /\bminimax\b/i },
  { name: 'ByteDance', re: /\b(bytedance|doubao|seedance|seedream|tiktok)\b/i },
  { name: 'Tencent', re: /\b(tencent|hunyuan)\b/i },
  { name: 'Baidu', re: /\b(baidu|ernie)\b/i },
  { name: 'Xiaomi', re: /\b(xiaomi|mimo)\b/i },
  { name: 'NVIDIA', re: /\b(nvidias?|nemotron|jensen huang)\b/i },
  { name: 'Apple', re: /\b(apple intelligence|apples?|siri)\b/i },
  { name: 'Cursor', re: /\bcursor\b(?! (?:position|pointer))/i },
  { name: 'Perplexity', re: /\bperplexity\b/i },
  { name: 'Hugging Face', re: /\bhugging ?face\b/i },
  { name: 'Cohere', re: /\bcohere\b/i },
  { name: 'Aleph Alpha', re: /\baleph alpha\b/i },
  { name: 'Black Forest Labs', re: /\b(black forest labs|flux[\s.-]?\d)/i },
  { name: 'DeepL', re: /\bdeepl\b/i },
  { name: 'IBM', re: /\b(ibm|granite)\b/i },
  { name: 'Ollama', re: /\bollama\b/i },
  { name: 'n8n', re: /\bn8n\b/i },
  { name: 'Thinking Machines', re: /\bthinking machines\b/i },
  { name: 'Cerebras', re: /\bcerebras\b/i },
]

// Modelle und KI-Produkte mit Version; Reihenfolge = Priorität
const MODELS: RegExp[] = [
  /\bGPT[- ]?\d+(?:\.\d+)?(?:[- ](?:mini|nano|pro|turbo|astra|sol|luna|terra|codex|image(?:[- ][\d.]+)?))*\b/gi,
  /\bgpt-image-[\d.]+(?:-\w+)?\b/gi,
  /\bClaude (?:Opus|Sonnet|Haiku|Fable)(?: \d+(?:\.\d+)?)?\b|\bClaude Code\b|\bClaude Duet\b/gi,
  /\bGemini(?: \d+(?:\.\d+)?)(?: (?:Pro|Flash(?:[- ]Lite)?|Ultra|Nano|Argon|Omni))?\b|\bGemini (?:CLI|Live|Omni)\b|\bNano Banana(?: \d+(?:\.\d+)?)?\b/gi,
  /\bGemma[- ]?\d+(?:\.\d+)?\b|\bVeo[- ]?\d+(?:\.\d+)?\b/gi,
  /\bLlama[- ]?\d+(?:\.\d+)?(?: \w+)?\b|\bMuse (?:Spark|Wonder)(?: \d+(?:\.\d+)?)?\b/gi,
  /\bQwen[\d.]+(?:-[\w.]+)?\b|\bQwen Code\b/gi,
  /\bKimi K\d+(?:\.\d+)?(?: Pro)?\b/gi,
  /\bGLM[- ]?\d+(?:\.\d+)?[VvA-Z]?\b/g,
  /\bDeepSeek[- ](?:V|R)\d+(?:\.\d+)?(?:[- ]\w+)?\b/gi,
  /\bGrok[- ]?\d+(?:\.\d+)?\b/gi,
  /\b(?:Mistral (?:Large|Medium|Small)|Devstral|Codestral|Magistral)(?: \d+(?:\.\d+)?)?\b/gi,
  /\bMiMo[- ]V?[\d.]+(?:-\w+)?\b|\bMiniMax[- ]M\d+(?:\.\d+)?\b|\bERNIE[- ]?\d+(?:\.\d+)?\b|\bSeedance[- ]?[\d.]+\b|\bNemotron[- ]?\w*\b/gi,
  /\bFLUX[\s.-]?\d+(?:\.\d+)?(?: (?:Pro|Dev|Schnell|Kontext|Klein|Video))?\b|\bSora[- ]?\d+\b/gi,
  /\bPhi-\d+(?:\.\d+)?\b|\bGranite[- ]?\d+(?:\.\d+)?\b|\bNova (?:Pro|Premier|Lite|Micro|\d)\b/gi,
  /\b(?:ChatGPT|Codex|GitHub Copilot|Copilot CLI|Microsoft Copilot|Gemini CLI|NotebookLM|Le Chat|Cursor \d+(?:\.\d+)?)\b/gi,
]

function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function detectEntities(text: string, tags: string[] = []): { providers: string[]; models: string[] } {
  const hay = `${text} ${tags.join(' · ')}`
  const providers = PROVIDERS.filter(p => p.re.test(hay)).map(p => p.name)
  const found: string[] = []
  for (const re of MODELS) for (const m of hay.matchAll(re)) found.push(tidy(m[0]))
  // gleiche Modelle (Groß/Klein, Bindestrich) zusammenfassen, längste Schreibweise behalten, kürzere Teil-Treffer weg
  const byKey = new Map<string, string>()
  for (const f of found) {
    const k = f.toLowerCase().replace(/[\s-]+/g, ' ')
    if (!byKey.has(k) || f.length > byKey.get(k)!.length) byKey.set(k, f)
  }
  const keys = [...byKey.keys()]
  const models = keys.filter(k => !keys.some(o => o !== k && o.startsWith(k + ' '))).map(k => byKey.get(k)!)
  return { providers: [...new Set(providers)].slice(0, 4), models: models.slice(0, 4) }
}

// Rückfall für offizielle Quellen ohne Firmennamen im Titel (Changelogs, Lab-Blogs, Release-Repos)
const SOURCE_PROVIDER: [RegExp, string][] = [
  [/^(openai-|chatgpt-|olshansk-openai|gh-codex|gh-openai-python)/, 'OpenAI'],
  [/^(anthropic-|claude-|olshansk-anthropic|olshansk-claude|gh-claude-code)/, 'Anthropic'],
  [/^(deepmind-|google-|gemini-|gh-gemini-cli)/, 'Google'],
  [/^meta-newsroom/, 'Meta'], [/^ms-foundry/, 'Microsoft'], [/^copilot-changelog/, 'GitHub'], [/^cursor-changelog/, 'Cursor'],
  [/^(mistral-|olshansk-mistral)/, 'Mistral AI'], [/^xai-/, 'xAI'], [/^deepseek-/, 'DeepSeek'], [/^bfl-/, 'Black Forest Labs'],
  [/^(hf-blog|gh-transformers)/, 'Hugging Face'], [/^gh-qwen-code/, 'Alibaba'], [/^gh-ollama/, 'Ollama'], [/^gh-n8n/, 'n8n'],
]

export function sourceProvider(sourceId: string): string | undefined {
  return SOURCE_PROVIDER.find(([re]) => re.test(sourceId))?.[1]
}
