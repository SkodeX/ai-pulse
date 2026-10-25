// Dry run: fetch sources, count items in windows, keyword filter, cluster. No Claude.
import fs from 'node:fs';
const OUT = process.argv[2];
const UA = 'Mozilla/5.0 (compatible; AIPulseBot/1.0; +https://github.com/SkodeX/ai-pulse)';
const now = Date.now(), H = 3600e3;
const since24 = now - 24*H, since7d = now - 168*H;
const hnSince = Math.floor(since7d/1000);
const fd = new Date(since7d).toISOString().slice(0,10);
// [name, url, aiOnly, kind]
const S = [
 ['heise_ki','https://www.heise.de/thema/Kuenstliche-Intelligenz.xml',true,'news'],
 ['golem_ki','https://rss.golem.de/rss.php?feed=ATOM1.0&ms=ki',true,'news'],
 ['decoder_de','https://the-decoder.de/feed/',true,'news'],
 ['tc_ai','https://techcrunch.com/category/artificial-intelligence/feed/',true,'news'],
 ['techmeme','https://www.techmeme.com/feed.xml',false,'news'],
 ['simonw','https://simonwillison.net/atom/everything/',false,'news'],
 ['latent','https://www.latent.space/feed',true,'news'],
 ['scmp_tech','https://www.scmp.com/rss/36/feed',false,'news'],
 ['pandaily','https://pandaily.com/feed/',false,'news'],
 ['crunchbase_ai','https://news.crunchbase.com/sections/ai/feed/',true,'funding'],
 ['producthunt','https://www.producthunt.com/feed',false,'ideas'],
 ['openai_rss','https://openai.com/news/rss.xml',true,'lab'],
 ['deepmind','https://deepmind.google/blog/rss.xml',true,'lab'],
 ['gemini_blog','https://blog.google/products-and-platforms/products/gemini/rss/',true,'lab'],
 ['gdev_blog','https://developers.googleblog.com/rss/',false,'lab'],
 ['mistral_rss','https://mistral.ai/news/rss',true,'lab'],
 ['claude_platform','https://platform.claude.com/docs/en/release-notes/feed.xml',true,'lab'],
 ['olsh_anthropic','https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',true,'lab'],
 ['olsh_claude','https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_claude.xml',true,'lab'],
 ['copilot_cl','https://github.blog/changelog/label/copilot/feed/',true,'lab'],
 ['cursor_cl','https://cursor.com/changelog/rss.xml',true,'lab'],
 ['meta_newsroom','https://about.fb.com/feed/',false,'lab'],
 ['foundry','https://devblogs.microsoft.com/foundry/feed/',true,'lab'],
 ['gh_claude_code','https://github.com/anthropics/claude-code/releases.atom',true,'release'],
 ['gh_qwen_code','https://github.com/QwenLM/qwen-code/releases.atom',true,'release'],
 ['epoch','https://epoch.ai/atom.xml',true,'research'],
 ['heise_sec','https://www.heise.de/security/feed.xml',false,'sec'],
 ['thn','https://feeds.feedburner.com/TheHackersNews',false,'sec'],
 ['certbund','https://wid.cert-bund.de/content/public/securityAdvisory/rss',false,'advisory'],
 ['bt_digitales','https://www.bundestag.de/static/appdata/includes/rss/digitales.rss',false,'law'],
 ['bmds','https://bmds.bund.de/feed/rss.xml',false,'law'],
 ['eu_dsm','https://digital-strategy.ec.europa.eu/en/rss.xml',false,'law'],
 ['wh','https://www.whitehouse.gov/presidential-actions/feed/',false,'law'],
 ['multistate','https://www.multistate.ai/updates?format=rss',true,'law'],
 ['aiact_substack','https://artificialintelligenceact.substack.com/feed',true,'law'],
 ['ota_eu','https://github.com/OpenTermsArchive/genai-eu-versions/commits/main.atom',true,'terms'],
 ['ota_contrib','https://github.com/OpenTermsArchive/genai-contrib-versions/commits/main.atom',true,'terms'],
 ['hn','https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E100,created_at_i%3E'+hnSince+'&hitsPerPage=500',false,'json-hn'],
 ['hf_daily','https://huggingface.co/api/daily_papers?date='+new Date(now-24*H).toISOString().slice(0,10),true,'json-hfp'],
 ['fedreg','https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=%22artificial+intelligence%22&conditions%5Bpublication_date%5D%5Bgte%5D='+fd+'&per_page=100&order=newest&fields%5B%5D=title&fields%5B%5D=publication_date&fields%5B%5D=html_url&fields%5B%5D=type',true,'json-fr'],
];
const AI = /\b(ki|ai|llms?|gpt[-\w.]*|chatgpt|claude|anthropic|openai|gemini|copilot|cursor|mistral|deepseek|qwen|llama|grok|kimi|glm|agent(s|ic)?|agenten|künstliche[n]? intelligenz|artificial intelligence|machine learning|neural|chatbot|prompt|inference|nvidia|hugging ?face|transformer|diffusion|multimodal|sprachmodell\w*|language model|foundation model|ai act|ki-verordnung)\b/i;
const NOISE = /\b(nightly|canary|alpha|beta|rc\d*|preview build|dev build)\b/i;
function dec(s){return (s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#8217;|&#039;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/<[^>]+>/g,'').trim();}
function parseXml(t){
  const blocks = t.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/g)||[];
  return blocks.map(b=>{
    const title = dec((b.match(/<title[^>]*>([\s\S]*?)<\/title>/)||[])[1]);
    const link = (b.match(/<link[^>]*href="([^"]+)"/)||[])[1] || dec((b.match(/<link>([\s\S]*?)<\/link>/)||[])[1]);
    const ds = (b.match(/<(pubDate|published|updated|dc:date)>([\s\S]*?)<\/\1>/)||[])[2];
    const desc = dec((b.match(/<(description|summary|content)[^>]*>([\s\S]*?)<\/\1>/)||[])[2]).slice(0,300);
    return {title, link, ts: ds? Date.parse(ds.trim()) : NaN, desc};
  });
}
function parseJson(kind, j){
  if(kind==='json-hn') return j.hits.map(h=>({title:h.title, link:h.url||('https://news.ycombinator.com/item?id='+h.objectID), ts:h.created_at_i*1000, desc:''}));
  if(kind==='json-hfp') return j.map(p=>({title:p.title||(p.paper&&p.paper.title), link:'https://huggingface.co/papers/'+((p.paper&&p.paper.id)||''), ts:Date.parse(p.publishedAt||(p.paper&&p.paper.publishedAt)), desc:'', up:(p.paper&&p.paper.upvotes)||0}));
  if(kind==='json-fr') return j.results.map(r=>({title:r.title, link:r.html_url, ts:Date.parse(r.publication_date+'T12:00:00Z'), desc:r.type}));
  return [];
}
const res = []; const all = [];
await Promise.all(S.map(async ([name,url,ai,kind])=>{
  const t0=Date.now(); let st='', items=[], bytes=0;
  try{
    const r = await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});
    st = r.status; const body = await r.text(); bytes=body.length;
    items = kind.startsWith('json') ? parseJson(kind, JSON.parse(body)) : parseXml(body);
  }catch(e){ st='ERR '+String(e.message).slice(0,40); }
  const dated = items.filter(i=>!isNaN(i.ts));
  const oldest = dated.length? Math.min(...dated.map(i=>i.ts)) : NaN;
  const in24 = dated.filter(i=>i.ts>=since24), in7 = dated.filter(i=>i.ts>=since7d);
  const f = x=> ai || AI.test(x.title+' '+x.desc);
  const n = x=> !(kind==='release' && NOISE.test(x.title)) && !(kind==='json-hfp' && (x.up||0)<20);
  res.push({name,kind,st,ms:Date.now()-t0,bytes,total:items.length,undated:items.length-dated.length,in24:in24.length,in7:in7.length,
    kw24:in24.filter(f).length, kw7:in7.filter(f).length, kwn7:in7.filter(f).filter(n).length,
    trunc7: !isNaN(oldest) && oldest>since7d, rateKwPerDay: (()=>{const kwAll=dated.filter(f).filter(n); if(!kwAll.length) return 0; const o=Math.max(Math.min(...kwAll.map(i=>i.ts)), since7d); const span=Math.max((now-o)/864e5, 1); return +(kwAll.filter(i=>i.ts>=o).length/span).toFixed(2);})()});
  for(const i of in7.filter(f).filter(n)) all.push({...i,src:name,kind});
}));
const STOP=new Set('the a an and or of to in for on with by is are at from as its it this that new der die das und mit für von zu im ein eine den des auf ist sich wie how why what after über'.split(' '));
const tok = s=> new Set((s||'').toLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)));
const normUrl = u=> (u||'').replace(/^https?:\/\/(www\.)?/,'').replace(/[?#].*$/,'').replace(/\/$/,'');
const clusters=[];
for(const it of all.sort((a,b)=>a.ts-b.ts)){
  const T=tok(it.title), U=normUrl(it.link);
  const hit = clusters.find(c=> c.urls.has(U) || c.toks.some(ct=>{ let inter=0; for(const w of T) if(ct.has(w)) inter++; const uni=T.size+ct.size-inter; return uni>0 && inter/uni>=0.5 && inter>=3; }));
  if(hit){ hit.n++; hit.urls.add(U); hit.toks.push(T); hit.srcs.add(it.src); if(it.ts>=since24) hit.r24=true; }
  else clusters.push({n:1,urls:new Set([U]),toks:[T],srcs:new Set([it.src]),r24:it.ts>=since24,kind:it.kind});
}
const sum=(k)=>res.reduce((a,r)=>a+r[k],0);
const byKind={}; for(const c of clusters){ byKind[c.kind]=(byKind[c.kind]||0)+1; }
const out = {now:new Date(now).toISOString(), sources:res.sort((a,b)=>b.kw7-a.kw7),
  totals:{ratePerDay:+res.reduce((a,r)=>a+r.rateKwPerDay,0).toFixed(1), sources:res.length, ok:res.filter(r=>r.st===200).length, raw24:sum('in24'), raw7:sum('in7'), kw24:sum('kw24'), kw7:sum('kw7'), kwNoise7:sum('kwn7'),
    clusters7:clusters.length, clusters24:clusters.filter(c=>c.r24).length,
    multiSourceClusters7: clusters.filter(c=>c.srcs.size>1).length, clustersByKind7:byKind, bytesTotal:sum('bytes')}};
fs.writeFileSync(OUT, JSON.stringify(out,null,1));
console.log(JSON.stringify(out.totals));
