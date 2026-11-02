const CACHE='oncology-toxicity-v1.0.0-2';
const ASSETS=['./','./index.html','./styles.css','./ui.mjs','./engine.mjs','./rules.mjs','./units.mjs','./examples.mjs','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('oncology-toxicity-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  // Network first; only the fixed static asset list above is cached at install.
  // Imported cases, diary values and generated exports are never cached.
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
