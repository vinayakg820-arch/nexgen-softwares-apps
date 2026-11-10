/* NexGen portal service worker (root). It only handles the portal's own files:
   every software folder (/billing/, /coaching/ …) keeps its own service worker. */
const CACHE = 'nexgen-portal-v1.9.0';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'nexgen-app.js'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('nexgen-portal-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || /versions?\.json$/.test(url.pathname)) return;
  const p = url.pathname.split('/');
  if ((p.length > 2 && p[1] !== 'icons') || url.pathname.endsWith('.apk')) return;      // a software folder → not ours
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
