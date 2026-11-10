/* Charvi Computers Billing - service worker.
   Handles: push alerts for new sales, installable app, and app updates.
   Keep this file next to the HTML file, served over https.

   NOTE: bump SW_VERSION on every release - a byte change here is what makes
   the browser notice that a new version of the app is available. */
const SW_VERSION = '1.9.1';

importScripts('sw-push.js');

self.addEventListener('install', () => {
  // do NOT skip waiting automatically: the app asks the user first, then sends 'skip-waiting'
});

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'skip-waiting') self.skipWaiting();
  if (d.type === 'sw-app-version' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: SW_VERSION });
});

/* Chrome only offers "Install app" when the service worker handles fetch.
   Everything goes straight to the network, so nothing is ever served stale.
   Page loads bypass the HTTP cache so an update really brings the newest file. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'reload' }).catch(() => fetch(req)));
    return;
  }
  event.respondWith(fetch(req).catch(() => caches.match(req).then((hit) => hit || Response.error())));
});
