import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {parse} from 'yaml';
function matter(text){const m=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);return {data:m?parse(m[1]):{},content:m?text.slice(m[0].length):text};}
import {marked} from 'marked';
const origin='https://sandesh.work';
await rm('dist',{recursive:true,force:true});await cp('website','dist',{recursive:true});
let posts=JSON.parse(await readFile('website/posts.json','utf8'));
for(const name of await readdir('content/posts')){
 if(!name.endsWith('.md'))continue;
 const {data,content}=matter(await readFile(`content/posts/${name}`,'utf8'));
 const old=posts.find(p=>p.title.toLowerCase()===String(data.title).toLowerCase());
 if(old){old.content=marked(content);old.tags=data.tags||old.tags;}
}
const slugs=['boosting-frontend-application-availability','redesigning-rearchitecting-merchant-experience','high-availability-razorpay-payments-dashboard','how-to-use-middlewares-in-node','node-js-flamechart'];
const external=s=>s.replace(/<a\b([^>]*href="https?:\/\/[^>]+)>/g,(tag)=>tag.includes('target=')?tag:tag.slice(0,-1)+' target="_blank" rel="noopener noreferrer">');
posts=posts.map(p=>({...p,content:external(p.content)}));
await writeFile('dist/posts.json',JSON.stringify(posts));
let home=await readFile('dist/index.html','utf8');home=home.replace('</head>',`<link rel="canonical" href="${origin}/"></head>`);
await writeFile('dist/index.html',home);
for(let i=0;i<posts.length;i++){
 const p=posts[i],slug=slugs[i];await mkdir(`dist/${slug}`,{recursive:true});
 const title=p.title.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 let page=home.replace(/<title>.*?<\/title>/,`<title>${title} — Sandesh Damkondwar</title>`).replace(`href="${origin}/"`,`href="${origin}/${slug}/"`);
 page=page.replace(/<main>[\s\S]*?<\/main>/,`<main class="article-page"><a class="text-link" href="/#writing">← All field notes</a><article id="article"><span class="eyebrow">FIELD NOTES</span><h1>${title}</h1>${p.content}</article></main>`).replace(/<dialog[\s\S]*?<\/dialog>/,'').replace('<script src="app.js"></script>','').replace('<head>','<head><base href="/">');
 page=page.replaceAll('href="#work"','href="/#work"').replaceAll('href="#writing"','href="/#writing"').replaceAll('href="#about"','href="/#about"').replaceAll('href="#"','href="/"');
 await writeFile(`dist/${slug}/index.html`,page);
}
let feed=await readFile('dist/feed.xml','utf8');feed=feed.replaceAll('https://sandesh-fieldnotes.youngfawn64.chatgpt.site',origin);await writeFile('dist/feed.xml',feed);
await writeFile('dist/sitemap.xml',`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...slugs].map(s=>`<url><loc>${origin}/${s?s+'/':''}</loc></url>`).join('')}</urlset>`);
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Built portfolio and ${posts.length} article pages.`);
