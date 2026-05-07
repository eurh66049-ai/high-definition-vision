const VERSION = 'kotobi-v6-cdn-2026-04';
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;
const MAX_IMAGE_CACHE = 200;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

// Push Notifications Handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let data = {
    title: 'إشعار من كتبي',
    body: 'لديك إشعار جديد',
    icon: '/lovable-uploads/5882b036-f2e2-4fec-bc07-9ee97960056a.png',
    badge: '/favicon.png',
    tag: 'kotobi-notification',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || `kotobi-${Date.now()}`,
        data: payload.data || data.data
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Helper: trim image cache to MAX_IMAGE_CACHE entries (LRU eviction)
async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  if (keys.length > MAX_IMAGE_CACHE) {
    const toDelete = keys.slice(0, keys.length - MAX_IMAGE_CACHE);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHtml = req.mode === 'navigate' || accept.includes('text/html');
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // ✅ HTML pages: Network-first
  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(ASSET_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // ✅ CDN Image proxy (/i/*): Cache-first with LRU eviction
  if (sameOrigin && url.pathname.startsWith('/i/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            const cache = await caches.open(IMAGE_CACHE);
            cache.put(req, fresh.clone());
            event.waitUntil(trimImageCache());
          }
          return fresh;
        } catch (err) {
          return new Response('', { status: 503 });
        }
      })()
    );
    return;
  }

  // ✅ PDF proxy (/f/*): Network-only (too large to cache)
  if (sameOrigin && url.pathname.startsWith('/f/')) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ Static assets (JS/CSS/fonts): Cache-first + background refresh
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) {
          event.waitUntil(
            (async () => {
              try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) {
                  const cache = await caches.open(ASSET_CACHE);
                  cache.put(req, fresh.clone());
                }
              } catch (_) {}
            })()
          );
          return cached;
        }

        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })()
    );
    return;
  }

  // ✅ External requests: no cache
  event.respondWith(fetch(req));
});
