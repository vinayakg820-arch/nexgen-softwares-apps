/* NexGen admin service worker – only this folder (other softwares have their own) */
const CACHE = 'nexgen-admin-v2.3.1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.json'])).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('nexgen-admin-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url), scope = new URL('./', self.registration.scope);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(scope.pathname)) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
