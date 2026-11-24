// Mafia Bhaiyas service worker: lets the game work offline once it has been opened.
// Built files have hashed names, so cached copies never go stale. The page itself is network-first.
const CACHE = 'mafia-bhaiyas-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// The page tells us which files it already loaded (the first visit happens before this worker takes control)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === 'string' && u.startsWith(self.location.origin))
          .map((u) => c.add(u).catch(() => {}))
      ).then(async () => {
        // Drop files from older builds (hashed bundle names that the current page no longer uses)
        const keep = new Set(data.urls);
        const keys = await c.keys();
        await Promise.all(keys.filter((k) => /\/assets\/index-[^/]+\.(js|css)$/.test(k.url) && !keep.has(k.url)).map((k) => c.delete(k)));
      })
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Google Fonts, the leaderboard Sheet etc. alone
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
