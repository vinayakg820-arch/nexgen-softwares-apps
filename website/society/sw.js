const CACHE = 'sm-v5';
const SHELL = ['./', './index.html', './app.css', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './badge-96.png'];

self.addEventListener('install', e => {
  // add files one by one so a single missing file never breaks offline support
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const save = (req, r) => { if (r && r.ok && r.type === 'basic' && !r.redirected) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return r; };
const offlinePage = req => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./'));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;   // never cache data calls
  if (req.cache === 'no-store' || url.searchParams.has('vcheck')) return;     // update checks always go straight to the server
  if (req.mode === 'navigate') {                                              // opening the app: network first, offline copy as fallback
    e.respondWith(fetch(req).then(r => save(req, r)).catch(() => offlinePage(req)));
  } else if (url.origin === location.origin) {                                // app files: network first (skip browser cache) so updates arrive at once
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => save(req, r)).catch(() => offlinePage(req)));
  } else {                                                                    // CDN icons/fonts: cache first, refresh in background
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

// ===== Push notifications =====
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const kind = d.kind || 'info';
  const options = {
    body: d.body || '', icon: 'icon-192.png', badge: 'badge-96.png', tag: d.tag || kind, renotify: true,
    data: { url: d.url || './', kind }, timestamp: Date.now(),
    vibrate: kind === 'complaint' ? [250, 100, 250, 100, 500] : [150, 80, 150],   // distinct buzz on phones
    requireInteraction: kind === 'complaint'                                          // complaint alerts stay on screen (desktop) until clicked
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'SocietyConnect', options),
    // if the app is open, tell it so it can play its own sound
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage({ type: 'push', kind, title: d.title, body: d.body })))
  ]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) { c.postMessage({ type: 'open', url }); return c.focus(); }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
