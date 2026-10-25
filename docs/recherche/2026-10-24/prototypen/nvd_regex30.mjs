// Fetch all NVD CVEs published in the last 30 days (paged, paced) and apply a strict AI-product regex to descriptions
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)';
const end = new Date(), start = new Date(Date.now() - 30 * 864e5);
const iso = d => d.toISOString().slice(0, 23) + 'Z';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const P = {
  'OpenAI (Codex/ChatGPT/SDK)': /\bOpenAI\b(?![- ]?(compatible|API key))|\bChatGPT\b|\bCodex CLI\b/i,
  'Anthropic/Claude Code': /\bAnthropic\b|\bClaude Code\b|\bClaude (Desktop|SDK)\b/i,
  'Google Gemini CLI': /\bGemini CLI\b|\bgemini-cli\b/i,
  'Ollama': /\bOllama\b/i,
  'Langflow': /\bLangflow\b/i,
  'n8n': /\bn8n\b/i,
  'Open WebUI': /\bOpen[- ]?WebUI\b/i,
  'ComfyUI': /\bComfyUI\b/i,
  'vLLM': /\bvLLM\b/,
  'LiteLLM': /\bLiteLLM\b/i,
  'Cursor IDE': /\bCursor\b(?= (IDE|editor|AI|code editor|is an))|\bAnysphere\b/,
  'GitHub Copilot': /\bGitHub Copilot\b|\bCopilot CLI\b/i,
  'Microsoft Copilot': /\b(Microsoft|M365|365) Copilot\b|\bCopilot Studio\b/i,
  'LangChain': /\bLangChain\b/i,
  'MCP server': /\bMCP server\b|\bModel Context Protocol\b/i,
};
const counts = {}, samples = {}; let total = 0, pages = 0, startIndex = 0, totalResults = 1;
while (startIndex < totalResults) {
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${encodeURIComponent(iso(start))}&pubEndDate=${encodeURIComponent(iso(end))}&resultsPerPage=2000&startIndex=${startIndex}`;
  let j = null;
  for (let i = 0; i < 3 && !j; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (r && r.status === 200) j = await r.json(); else await sleep(10000);
  }
  await sleep(6500);
  if (!j) { console.log('page failed at', startIndex); break; }
  totalResults = j.totalResults; pages++;
  for (const v of j.vulnerabilities) {
    total++;
    const d = (v.cve.descriptions.find(x => x.lang === 'en') || {}).value || '';
    for (const [k, re] of Object.entries(P)) if (re.test(d)) { counts[k] = (counts[k] || 0) + 1; (samples[k] = samples[k] || []).length < 2 && samples[k].push(v.cve.id + ' ' + d.slice(0, 90)); }
  }
  startIndex += j.resultsPerPage;
}
const hitsAny = Object.values(counts).reduce((a, b) => a + b, 0);
const out = { window: [iso(start), iso(end)], pages, total, hitsAny, counts, samples };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ pages, total, hitsAny, counts }));
