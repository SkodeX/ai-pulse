// Persona-Profil (geklärt mit dem Nutzer am 2026-10-25, Steckbrief → references/entscheidungen.md).
// persona.txt muss jeden tools[].name nennen (Test pipeline/test/llm.test.ts).

export interface ProfileTool { name: string; provider: string; aliases: string[]; watchlist: string[] }

export const PROFILE = {
  roles: ['Produktmanagement', 'Softwareentwicklung', 'Beratung/Strategie', 'KI-Einführung im Konzern/Mittelstand'],
  jurisdiction: ['EU', 'DE'],
  tools: [
    { name: 'Claude / Claude Code', provider: 'anthropic', aliases: ['claude', 'claude code'], watchlist: ['claude', 'claude-code'] },
    { name: 'ChatGPT / Codex', provider: 'openai', aliases: ['chatgpt', 'codex'], watchlist: ['openai', 'codex'] },
    { name: 'Gemini', provider: 'google', aliases: ['gemini', 'gemini cli', 'ai studio'], watchlist: ['gemini', 'gemini-cli'] },
    { name: 'GitHub Copilot', provider: 'github', aliases: ['github copilot', 'copilot'], watchlist: ['github-copilot'] },
    { name: 'Cursor', provider: 'anysphere', aliases: ['cursor'], watchlist: ['cursor'] },
  ] satisfies ProfileTool[],
  selfHosted: ['Ollama', 'n8n', 'Open WebUI', 'ComfyUI'],
  interests: [
    'Agenten und Coding-Tools (Claude Code, Codex, Cursor, Copilot, MCP)',
    'neue Modelle und Benchmarks',
    'Produkt und Strategie: Marktbewegungen, Geschäftsmodelle, Funding',
    'Recht und Regulierung: AI Act, DSGVO, AGB-Änderungen der Anbieter',
    'Dev-Tool-Startups, EU/DE-Startups (Mistral, Aleph Alpha, Black Forest Labs, DeepL), China-Labs (DeepSeek, Qwen, Kimi, GLM, MiniMax)',
    'selbst gehostete und schnell wachsende Open-Source-Tools',
    'Sicherheit: Lücken in den eigenen Tools, Prompt Injection und Agenten/MCP, Datenschutz-Vorfälle',
  ],
  lowInterest: ['Gadgets und Consumer-Hardware', 'Krypto und Web3', 'Bild-, Video- und Musik-KI', 'Hype und Promi-Zitate'],
  summaryStyle: 'gemischt: kurz das Wichtigste, bei Entwickler-Themen mit technischen Details',
} as const

const TOOL_RE = new RegExp(String.raw`\b(${PROFILE.tools.flatMap(t => t.aliases).map(a => a.replace(/ /g, '\\s+')).join('|')})\b`, 'i')

export function mentionsOwnTool(text: string): boolean {
  return TOOL_RE.test(text)
}
