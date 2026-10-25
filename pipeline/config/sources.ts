// Quellenregister (Skill quellen § 1, Startliste quellen/references/kernquellen.md).
// Eine Quelle = ein Eintrag = ein Abruf. IDs nie umbenennen (stecken in seen-Keys und Health).

import type { Category } from '../../shared/categories.ts'

export type SourceKind = 'feed' | 'json' | 'sitemap' | 'htmldiff' | 'github'   // Phase 4: + 'parquet' | 'terms'
export type Cadence = '3x' | 'daily07' | 'weekly'
export type SourceRole = 'official' | 'press' | 'community' | 'aggregator'
export interface UrlContext { now: Date; lastSuccess?: string }

export interface Source {
  id: string
  name: string
  kind: SourceKind
  role: SourceRole
  outlet?: string
  url: string                   // Platzhalter {since36hUnix}, {yesterdayUtc}
  buildUrl?: (ctx: UrlContext) => string
  github?: { repo: `${string}/${string}`; perPage: number }
  categoryHint: Category[]
  categoryMap?: Record<string, Category>
  priority: 'core' | 'nice'
  cadence: Cadence
  startStatus?: 'blockiert'
  aiOnly: boolean
  filter?: {
    include?: RegExp
    exclude?: RegExp
    minPoints?: number
    minUpvotes?: number
    pathRe?: RegExp
    tagRe?: RegExp
    maxNew?: number
  }
  titleStrip?: RegExp
  paywall: boolean | RegExp
  fallbacks: string[]
  fallbackOnly?: boolean
  lang: 'de' | 'en'
  adapter?: 'techmeme' | 'hn' | 'hfPapers' | 'yc'
  html?: {
    mode: 'sections' | 'links'
    container?: string          // CSS-Selektor des Inhaltsbereichs (Standard body)
    heading?: string            // CSS-Selektor der Datumsüberschriften (Standard 'h2, h3')
    dateRe?: RegExp             // Überschrift zählt nur, wenn ihr Text passt
    yearFrom?: string           // Selektor einer Monatsüberschrift, die das Jahr für „Oct 22" liefert
    linkRe?: RegExp
  }
  sitemap?: {
    lastmod: boolean            // <lastmod> als publishedAt (nur wo plausibel)
    urlDateRe?: RegExp          // Datum JJMMTT aus der URL (DeepSeek /news/news261017)
  }
  headers?: Record<string, string>
  maxBytes?: number
  staleDays?: number
  notes?: string
}

const HN_FILTER = { minPoints: 100 }
const PRESS_DE = { role: 'press', priority: 'core', cadence: '3x', lang: 'de', paywall: false } as const
const PRESS_EN = { role: 'press', priority: 'core', cadence: '3x', lang: 'en', paywall: false } as const
const LAB = { role: 'official', priority: 'core', cadence: '3x', lang: 'en', paywall: false } as const
const DATE_LONG = /^[A-Z][a-z]+ \d{1,2}, \d{4}$/

function gh(name: string, repo: `${string}/${string}`, perPage: number, extra: Partial<Source> = {}): Source {
  return {
    id: `gh-${name}`,
    name: `GitHub ${repo}`,
    kind: 'github',
    ...LAB,
    url: `https://github.com/${repo}/releases`,
    github: { repo, perPage },
    categoryHint: ['opensource'],
    aiOnly: true,
    fallbacks: [],
    staleDays: 120,
    ...extra,
  }
}

function olshansk(id: string, name: string, file: string, outlet: string): Source {
  return {
    id, name, kind: 'feed', ...LAB, outlet,
    url: `https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/${file}`,
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [], fallbackOnly: true,
    notes: 'Community-Feed (Olshansk/rss-feeds), hinkt teils; nie einzige Quelle',
  }
}

export const SOURCES: Source[] = [
  // ---------- Presse & Community ----------
  {
    id: 'heise-ki', name: 'heise online – KI', kind: 'feed', ...PRESS_DE, outlet: 'heise',
    url: 'https://www.heise.de/thema/Kuenstliche-Intelligenz.xml',
    categoryHint: ['neuigkeiten'], aiOnly: true,
    paywall: /^\s*heise\+\s*\|\s*|\s*\|\s*heise\+\s*$/i,
    fallbacks: ['decoder-de'],
    notes: '100 Entries ≈ 9 Tage; Paywall-Marker „heise+ |" am Titelanfang (geprüft 2026-10-25)',
  },
  {
    id: 'golem-ki', name: 'Golem.de – KI', kind: 'feed', ...PRESS_DE,
    url: 'https://rss.golem.de/rss.php?feed=ATOM1.0&ms=ki',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
    notes: 'ISO-8859-1; „Anzeige:"-Titel verwirft der Vorfilter',
  },
  {
    id: 'decoder-de', name: 'The Decoder', kind: 'feed', ...PRESS_DE, outlet: 'the-decoder',
    url: 'https://the-decoder.de/feed/',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: ['heise-ki'],
    notes: 'nur 10 Items → jeden Lauf',
  },
  {
    id: 'techcrunch-ai', name: 'TechCrunch AI', kind: 'feed', ...PRESS_EN, outlet: 'techcrunch',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    categoryHint: ['neuigkeiten'],
    categoryMap: { Security: 'sicherheit', Fundraising: 'funding', Startups: 'startups', Venture: 'funding' },
    aiOnly: false, fallbacks: ['techmeme'],
  },
  {
    id: 'verge-ai', name: 'The Verge – AI', kind: 'feed', ...PRESS_EN,
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    categoryHint: ['neuigkeiten'], aiOnly: false, fallbacks: [],
  },
  {
    id: 'techmeme', name: 'Techmeme', kind: 'feed', role: 'aggregator', priority: 'core', cadence: '3x', lang: 'en', paywall: false,
    url: 'https://www.techmeme.com/feed.xml', adapter: 'techmeme',
    categoryHint: ['neuigkeiten'], aiOnly: false, fallbacks: ['techcrunch-ai'],
    notes: '15 Items ≈ 12 h; Original-URL aus erstem Nicht-Techmeme-Link',
  },
  {
    id: 'hn', name: 'Hacker News', kind: 'json', role: 'aggregator', priority: 'core', cadence: '3x', lang: 'en', paywall: false,
    outlet: 'hn', adapter: 'hn',
    url: 'https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100,created_at_i%3E{since36hUnix}&hitsPerPage=200',
    categoryHint: ['neuigkeiten'], aiOnly: false, filter: HN_FILTER, fallbacks: [],
  },
  {
    id: 'simonw', name: 'Simon Willison', kind: 'feed', role: 'community', priority: 'core', cadence: '3x', lang: 'en', paywall: false,
    url: 'https://simonwillison.net/atom/everything/',
    categoryHint: ['opensource', 'neuigkeiten'], aiOnly: false, fallbacks: [],
  },
  {
    id: 'latent-space', name: 'Latent Space', kind: 'feed', role: 'community', priority: 'core', cadence: '3x', lang: 'en', paywall: false,
    url: 'https://latent.space/feed',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
    notes: '1,3 MB, nur Last-Modified; tägliche [AINews]-Recaps',
  },
  {
    id: 'scmp-tech', name: 'South China Morning Post – Tech', kind: 'feed', ...PRESS_EN,
    url: 'https://www.scmp.com/rss/36/feed/',
    categoryHint: ['neuigkeiten'], aiOnly: false, fallbacks: [],
  },

  // ---------- Labs & Produkte ----------
  {
    id: 'openai-news', name: 'OpenAI News', kind: 'feed', ...LAB, outlet: 'openai',
    url: 'https://openai.com/news/rss.xml',
    categoryHint: ['neuigkeiten'],
    categoryMap: { Security: 'sicherheit', Research: 'forschung', Safety: 'forschung' },
    aiOnly: true, fallbacks: ['olshansk-openai', 'techmeme'],
    notes: '~800 KB ohne Validatoren → Hash; openai.com = 1-Request-Host',
  },
  {
    id: 'openai-api-changelog', name: 'OpenAI API Changelog', kind: 'htmldiff', ...LAB, outlet: 'openai',
    url: 'https://developers.openai.com/api/docs/changelog',
    categoryHint: ['preise', 'modelle'], aiOnly: true, fallbacks: [],
    html: { mode: 'sections', container: 'main', heading: 'div[data-variant="outline"]', dateRe: /^[A-Z][a-z]{2,8}\.? \d{1,2}$/, yearFrom: 'h3' },
    notes: 'Monatsüberschrift h3 „October, 2026", Einträge mit Badge „Oct 22" (geprüft 2026-10-25)',
  },
  {
    id: 'chatgpt-release-notes', name: 'ChatGPT Release Notes', kind: 'htmldiff', ...LAB, outlet: 'openai', cadence: 'daily07',
    url: 'https://help.openai.com/en/articles/6825453-chatgpt-release-notes',
    startStatus: 'blockiert',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: ['openai-api-changelog'],
    html: { mode: 'sections', heading: 'h2, h3', dateRe: DATE_LONG },
    notes: 'Node-fetch 403 (cf-mitigated); Konfiguration vorläufig wie claude-apps-notes (Intercom), bis die Tagesprobe ok liefert',
  },
  {
    id: 'anthropic-sitemap', name: 'Anthropic', kind: 'sitemap', ...LAB, outlet: 'anthropic',
    url: 'https://www.anthropic.com/sitemap.xml',
    categoryHint: ['neuigkeiten'], aiOnly: true,
    filter: { pathRe: /\/(news|research|engineering)\// },
    sitemap: { lastmod: false },
    titleStrip: /\s*[\\|]\s*Anthropic\s*$/,
    fallbacks: ['olshansk-anthropic-news', 'claude-platform-notes'],
    notes: 'lastmod unzuverlässig (alte Posts neu gestempelt); keine Validatoren',
  },
  {
    id: 'claude-platform-notes', name: 'Claude Platform Release Notes', kind: 'feed', ...LAB, outlet: 'anthropic',
    url: 'https://platform.claude.com/docs/en/release-notes/feed.xml',
    categoryHint: ['preise', 'modelle'], aiOnly: true, fallbacks: ['gh-claude-code', 'olshansk-claude'],
  },
  {
    id: 'claude-apps-notes', name: 'Claude Apps Release Notes', kind: 'htmldiff', ...LAB, outlet: 'anthropic', cadence: 'daily07',
    url: 'https://support.claude.com/en/articles/12138966-release-notes',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: ['olshansk-claude'],
    html: { mode: 'sections', container: 'article', heading: 'h3', dateRe: DATE_LONG },
    notes: 'Intercom: h2 = Monat, h3 = „October 21, 2026" mit id (geprüft 2026-10-25)',
  },
  {
    id: 'deepmind-blog', name: 'Google DeepMind Blog', kind: 'feed', ...LAB, outlet: 'google',
    url: 'https://deepmind.google/blog/rss.xml',
    categoryHint: ['forschung', 'modelle'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'google-ai-blog', name: 'Google AI Blog', kind: 'feed', ...LAB, outlet: 'google',
    url: 'https://blog.google/innovation-and-ai/technology/ai/rss/',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'gemini-blog', name: 'Gemini Blog', kind: 'feed', ...LAB, outlet: 'google',
    url: 'https://blog.google/products-and-platforms/products/gemini/rss/',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'gemini-api-changelog', name: 'Gemini API Changelog', kind: 'htmldiff', ...LAB, outlet: 'google',
    url: 'https://ai.google.dev/gemini-api/docs/changelog',
    categoryHint: ['preise', 'modelle'], aiOnly: true, fallbacks: [],
    html: { mode: 'sections', container: '.devsite-article-body', heading: 'h2[id]', dateRe: DATE_LONG },
    notes: '<h2 id="10-13-2026" data-text="October 13, 2026"> (geprüft 2026-10-25)',
  },
  {
    id: 'gemini-apps-notes', name: 'Gemini Apps Release Notes', kind: 'htmldiff', ...LAB, outlet: 'google', cadence: 'daily07',
    url: 'https://gemini.google/release-notes/?hl=en',
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
    html: { mode: 'sections', heading: 'h2', dateRe: /^\d{4}\.\d{2}\.\d{2}$/ },
    notes: 'Karten mit h2 „2026.10.13"; mit Accept-Language „en" allein kommt lang="de-DE" (teils deutsche Karten), mit „en-US,en;q=0.9" Englisch (geprüft 2026-10-25); 301 auf /us/release-notes/ erwartet',
  },
  {
    id: 'meta-newsroom', name: 'Meta Newsroom', kind: 'feed', ...LAB,
    url: 'https://about.fb.com/feed/',
    categoryHint: ['neuigkeiten'], aiOnly: false,
    filter: { include: /\b(AI|Llama|Muse|Meta AI|Superintelligence)\b/ },
    fallbacks: [],
  },
  {
    id: 'ms-foundry', name: 'Microsoft Foundry Blog', kind: 'feed', ...LAB,
    url: 'https://devblogs.microsoft.com/foundry/feed/',
    categoryHint: ['modelle'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'hf-blog', name: 'Hugging Face Blog', kind: 'feed', ...LAB,
    url: 'https://huggingface.co/blog/feed.xml',
    categoryHint: ['opensource'], aiOnly: false, fallbacks: [],
  },
  {
    id: 'mistral-news', name: 'Mistral AI News', kind: 'feed', ...LAB, outlet: 'mistral',
    url: 'https://mistral.ai/news/rss',
    categoryHint: ['modelle'], aiOnly: true, fallbacks: ['olshansk-mistral'], staleDays: 60,
  },
  {
    id: 'xai-sitemap', name: 'xAI News', kind: 'sitemap', ...LAB,
    url: 'https://x.ai/sitemap.xml',
    startStatus: 'blockiert',
    categoryHint: ['modelle'], aiOnly: true,
    filter: { pathRe: /\/news\// }, sitemap: { lastmod: true },
    fallbacks: ['techmeme', 'techcrunch-ai'],
    notes: 'Node-fetch 403 „Attention Required"; 1-Request-Host, keine Seitentitel nachladen',
  },
  {
    id: 'deepseek-sitemap', name: 'DeepSeek News', kind: 'sitemap', ...LAB,
    url: 'https://api-docs.deepseek.com/sitemap.xml',
    categoryHint: ['modelle'], aiOnly: true,
    filter: { pathRe: /\/news\/news\d+/ }, sitemap: { lastmod: false, urlDateRe: /\/news\/news(\d{6})$/ },
    titleStrip: /\s*\|\s*DeepSeek API Docs\s*$/,
    fallbacks: [], staleDays: 60,
  },
  {
    id: 'bfl-sitemap', name: 'Black Forest Labs', kind: 'sitemap', ...LAB, cadence: 'daily07',
    url: 'https://bfl.ai/sitemap.xml',
    categoryHint: ['modelle'], aiOnly: true,
    filter: { pathRe: /\/blog\// }, sitemap: { lastmod: true },
    fallbacks: [], staleDays: 60,
  },
  {
    id: 'copilot-changelog', name: 'GitHub Copilot Changelog', kind: 'feed', ...LAB,
    url: 'https://github.blog/changelog/label/copilot/feed/',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'cursor-changelog', name: 'Cursor Changelog', kind: 'feed', ...LAB,
    url: 'https://cursor.com/changelog/rss.xml',
    categoryHint: ['neuigkeiten'], aiOnly: true, fallbacks: [],
  },

  // ---------- Startups & Funding ----------
  {
    id: 'techcrunch-venture', name: 'TechCrunch Venture', kind: 'feed', ...PRESS_EN, outlet: 'techcrunch',
    url: 'https://techcrunch.com/category/venture/feed/',
    categoryHint: ['funding', 'startups'], aiOnly: false, fallbacks: [],
  },
  {
    id: 'crunchbase-ai', name: 'Crunchbase News – AI', kind: 'feed', ...PRESS_EN,
    url: 'https://news.crunchbase.com/sections/ai/feed/',
    categoryHint: ['funding'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'yc-changes', name: 'Y Combinator (neue Firmen)', kind: 'json', role: 'aggregator', priority: 'core', cadence: 'daily07', lang: 'en', paywall: false,
    url: 'https://yc-oss.github.io/api/changes/latest.json', adapter: 'yc',
    categoryHint: ['startups'], aiOnly: false, fallbacks: [],
  },
  {
    id: 'hn-show', name: 'Show HN', kind: 'json', role: 'aggregator', priority: 'core', cadence: '3x', lang: 'en', paywall: false,
    outlet: 'hn', adapter: 'hn',
    url: 'https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=points%3E50,created_at_i%3E{since36hUnix}&hitsPerPage=50',
    categoryHint: ['ideen'], aiOnly: false, filter: { minPoints: 50 }, fallbacks: [],
  },
  {
    id: 'producthunt', name: 'Product Hunt', kind: 'feed', role: 'aggregator', priority: 'core', cadence: 'daily07', lang: 'en', paywall: false,
    url: 'https://www.producthunt.com/feed',
    categoryHint: ['ideen'], aiOnly: false, fallbacks: [],
    notes: 'nur der öffentliche Atom-Feed (Titel + Link), nie die API',
  },

  // ---------- Forschung & Open Source ----------
  {
    id: 'hf-daily-papers', name: 'Hugging Face Daily Papers', kind: 'json', role: 'aggregator', priority: 'core', cadence: 'daily07', lang: 'en', paywall: false,
    url: 'https://huggingface.co/api/daily_papers?date={yesterdayUtc}', adapter: 'hfPapers',
    categoryHint: ['forschung'], aiOnly: true, filter: { minUpvotes: 30 }, fallbacks: [],
    notes: 'Sa/So-Daten liefern []',
  },
  {
    id: 'google-research', name: 'Google Research Blog', kind: 'feed', ...LAB, outlet: 'google',
    url: 'https://research.google/blog/rss/',
    categoryHint: ['forschung'], aiOnly: true, fallbacks: [],
  },
  {
    id: 'epoch-atom', name: 'Epoch AI', kind: 'feed', role: 'community', priority: 'core', cadence: 'daily07', lang: 'en', paywall: false,
    url: 'https://epoch.ai/atom.xml',
    categoryHint: ['forschung'], aiOnly: true, fallbacks: [], staleDays: 30,
  },

  // ---------- GitHub-Releases ----------
  gh('claude-code', 'anthropics/claude-code', 30, { outlet: 'anthropic' }),
  gh('codex', 'openai/codex', 30, { outlet: 'openai' }),
  gh('gemini-cli', 'google-gemini/gemini-cli', 30, { outlet: 'google' }),
  gh('openai-python', 'openai/openai-python', 30, { outlet: 'openai' }),
  gh('ollama', 'ollama/ollama', 30),
  gh('vllm', 'vllm-project/vllm', 10),
  gh('n8n', 'n8n-io/n8n', 30, { filter: { tagRe: /^n8n@2\./ } }),
  gh('langchain', 'langchain-ai/langchain', 30, { filter: { tagRe: /^langchain(?:-core)?==\d+\.\d+\.0$/ } }),
  gh('comfyui', 'Comfy-Org/ComfyUI', 30),
  gh('cline', 'cline/cline', 30, { filter: { tagRe: /^v\d+\.\d+\.\d+$/ } }),
  gh('transformers', 'huggingface/transformers', 5),
  gh('open-webui', 'open-webui/open-webui', 10),
  gh('qwen-code', 'QwenLM/qwen-code', 30),

  // ---------- Nur als Fallback ----------
  olshansk('olshansk-openai', 'OpenAI News (Olshansk-Spiegel)', 'feed_openai_main.xml', 'openai'),
  olshansk('olshansk-anthropic-news', 'Anthropic News (Olshansk-Spiegel)', 'feed_anthropic_news.xml', 'anthropic'),
  olshansk('olshansk-claude', 'Claude Blog (Olshansk-Spiegel)', 'feed_claude.xml', 'anthropic'),
  olshansk('olshansk-mistral', 'Mistral News (Olshansk-Spiegel)', 'feed_mistral.xml', 'mistral'),
]

export const SOURCE_BY_ID = new Map(SOURCES.map(s => [s.id, s]))

// Nenner von Trockenlauf-Bericht und Smoke-Test: core ohne fallbackOnly, inkl. startStatus 'blockiert'.
export function countsInDenominator(source: Source): boolean {
  return source.priority === 'core' && !source.fallbackOnly
}
