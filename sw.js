// Shikkha offline PWA. Network-first HTML prevents obsolete cached app shells.
const CACHE_VERSION='ashik-shikkha-salesman-settings-tour-v14-2026-10-20';
const ASSETS=['./','./index.html','./manifest.webmanifest','./tailwind-offline.css','./travel-animation.css','./travel-animation-pwa-v14.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ashik-shikkha-salesman-')&&k!==CACHE_VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const isPage=req.mode==='navigate'||url.pathname.endsWith('/index.html');
  if(isPage){
    event.respondWith(fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.put('./index.html',copy)));}
      return response;
    }).catch(()=>caches.match('./index.html').then(cached=>cached||caches.match('./'))));
  }else{
    event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>{
      if(cached)return cached;
      return fetch(req).then(response=>{
        if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.put(req,copy)));}
        return response;
      });
    }));
  }
});
