const CACHE='mhs-gpr-v4';
const FILES=['./','index.html','report.js','jspdf.umd.min.js','jspdf.plugin.autotable.min.js','manifest.json','sample.json','icon-180.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
// Network first (so updates arrive), cache fallback within 3 s (so it always opens offline).
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(u.origin!==location.origin||e.request.method!=='GET') return;
  e.respondWith((async()=>{
    const cached=await caches.match(e.request,{ignoreSearch:true});
    try{
      const net=fetch(e.request).then(res=>{ if(res.ok){ const c=res.clone(); caches.open(CACHE).then(k=>k.put(e.request,c)); } return res; });
      if(!cached) return await net;
      return await Promise.race([net, new Promise((_,rej)=>setTimeout(()=>rej('timeout'),3000))]);
    }catch{ return cached || Response.error(); }
  })());
});
