/* NexGenSoftwares - sale push notifications.
   Loaded by sw.js (importScripts). If you already have your own sw.js,
   just add this line at the very top of it:   importScripts('sw-push.js');
*/

const SW_PUSH_VERSION = 'push-v4';

// lets the app confirm this worker really contains the push code
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'sw-version' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: SW_PUSH_VERSION });
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'NexGen alert', body: event.data ? event.data.text() : '' }; }

  const kind = data.kind || 'sale';
  const title = data.title || 'New Sales Record At Charvi Computers';
  const options = {
    body: data.body || '',
    tag: data.tag || ('sale-' + Date.now()),
    renotify: data.renotify !== false,          // ring again even if same tag
    vibrate: data.vibrate || [200, 100, 200, 100, 500], // unique sale vibration signature
    badge: data.badge || 'icon-192.png',
    icon: data.icon || 'icon-192.png',
    requireInteraction: false,
    timestamp: Date.now(),
    data: { kind, tag: data.tag || '', url: data.url || './' }
  };
  Object.keys(options).forEach((k) => options[k] === undefined && delete options[k]);

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    // If the app is open (even in a background tab) let it play the custom sale chime.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((c) => c.postMessage({ type: 'sale-alert', kind, tag: data.tag || '', title, body: data.body || '', speak: data.speak || '' }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if ('focus' in c) { try { await c.focus(); return; } catch (e) {} }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
