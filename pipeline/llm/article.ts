// Artikelauszug für Stufe 2: Abruf über die Abruf-Schicht (UA, Timeout, keine Challenge-Umgehung),
// Readability auf linkedom-DOM, gekürzt an einer Absatzgrenze. Volltext nie nach public/data/.

import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { LIMITS } from '../config/models.ts'
import { ACCEPT_HTML, HostScheduler, httpFetch } from '../collect/http.ts'
import { isAllowed, robotsFor } from '../collect/robots.ts'

export function cutAtParagraph(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const p = cut.lastIndexOf('\n\n')
  return (p > max * 0.5 ? cut.slice(0, p) : cut).trim()
}

export function extractArticle(html: string): string | undefined {
  try {
    const { document } = parseHTML(html)
    const article = new Readability(document as unknown as Document, { charThreshold: 300 }).parse()
    const text = article?.textContent?.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
    return text && text.length > 200 ? cutAtParagraph(text, LIMITS.articleChars) : undefined
  } catch {
    return undefined
  }
}

export async function fetchArticles(urls: string[], now: Date): Promise<Map<string, string>> {
  const scheduler = new HostScheduler(6)
  const out = new Map<string, string>()
  await Promise.all(urls.map(async url => {
    if (!scheduler.reserve(url)) return
    const robots = await scheduler.run(url, () => robotsFor(url, undefined, now))
    if (!isAllowed(robots.rules, url)) return
    const res = await scheduler.run(url, () => httpFetch({ url, accept: ACCEPT_HTML, maxBytes: 3 * 1024 * 1024, retry: false }))
    if (!res.ok || !res.body) return
    const text = extractArticle(res.body)
    if (text) out.set(url, text)
  }))
  return out
}
