/* Retired: the site-wide worker made the Super Admin app cover every software. It removes itself. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('nexgen-portal-v1')).map(k => caches.delete(k))))
    .then(() => self.registration.unregister())
));
