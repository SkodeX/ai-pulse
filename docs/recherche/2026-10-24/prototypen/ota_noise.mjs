// Measure OTA noise: fetch commit .diff for recent commits, compute word-level change after normalization
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)';
const repos = ['genai-eu-versions', 'genai-contrib-versions'];
const REL = /\b(updated|aktualisiert)?:?\s*(yesterday|today|gestern|heute|\d+\s+(days?|hours?|weeks?|months?)\s+ago|vor\s+\d+\s+\w+)\b/i;
const EFFECTIVE = /\b(effective|last updated|last modified|updated on|gültig ab|stand|wirksam)\b[^\n]{0,40}\b(20\d\d|\d{1,2}[./]\d{1,2}[./]\d{2,4})/i;
const norm = s => s.replace(/\]\([^)]*\)/g, ']').replace(/https?:\/\/\S+/g, '').replace(/[*_#>`|\[\]\\-]/g, ' ').replace(/⁠/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(w => w.length > 1);
const out = [];
for (const repo of repos) {
  const atom = await (await fetch(`https://github.com/OpenTermsArchive/${repo}/commits/main.atom`, { headers: { 'User-Agent': UA } })).text();
  const entries = [...atom.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(m => m[0]);
  for (const e of entries) {
    const sha = (e.match(/commit\/([0-9a-f]{40})/) || [])[1];
    const title = ((e.match(/<title>\s*([\s\S]*?)\s*<\/title>/) || [])[1] || '').replace(/\s+/g, ' ');
    const upd = (e.match(/<updated>([^<]*)/) || [])[1];
    const r = await fetch(`https://github.com/OpenTermsArchive/${repo}/commit/${sha}.diff`, { headers: { 'User-Agent': UA } });
    const d = await r.text();
    const add = [], del = [];
    for (const l of d.split('\n')) {
      if (l.startsWith('+++') || l.startsWith('---')) continue;
      if (l.startsWith('+')) add.push(l.slice(1)); else if (l.startsWith('-')) del.push(l.slice(1));
    }
    const relOnly = [...add, ...del].filter(l => l.trim()).every(l => REL.test(l));
    const effChange = [...add].some(l => EFFECTIVE.test(l));
    const wa = words(add.join(' ')), wd = words(del.join(' '));
    const ca = {}, cd = {};
    wa.forEach(w => ca[w] = (ca[w] || 0) + 1); wd.forEach(w => cd[w] = (cd[w] || 0) + 1);
    let net = 0; for (const w of new Set([...wa, ...wd])) net += Math.abs((ca[w] || 0) - (cd[w] || 0));
    const isNew = /^(Start tracking|First record)/i.test(title);
    out.push({ repo, upd: upd.slice(0, 16), title: title.slice(0, 80), status: r.status, bytes: d.length, add: add.length, del: del.length, netWords: net, relOnly, effChange, isNew });
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const cls = o => o.isNew ? 'new' : o.relOnly || o.netWords === 0 ? 'noise' : o.effChange || o.netWords >= 30 ? 'material' : o.netWords < 8 ? 'noise?' : 'minor';
for (const o of out) console.log(o.upd, o.repo.slice(6, 10), o.status, `+${o.add}/-${o.del}`, 'net=' + o.netWords, o.effChange ? 'EFF' : '', cls(o), '|', o.title.slice(0, 60));
const c = {}; out.forEach(o => c[cls(o)] = (c[cls(o)] || 0) + 1); console.log(JSON.stringify(c));
