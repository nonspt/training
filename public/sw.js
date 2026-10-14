const BUILD=__BUILD__,CACHE=`training-follow-${BUILD}`,ASSETS=__ASSETS__;
const base=new URL('./',self.location.href),files=new Set(ASSETS.map(file=>new URL(file,base).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(file=>new URL(file,base).href)))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('training-follow-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  if(request.mode==='navigate'){event.respondWith((async()=>{const cache=await caches.open(CACHE),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);try{const response=await fetch(request,{signal:controller.signal});if(response.ok)return response;throw new Error('Navigation unavailable');}catch{const offline=await cache.match(new URL('index.html',base).href);return offline??Response.error();}finally{clearTimeout(timeout);}})());return;}
  if(files.has(url.href))event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;})());
});
