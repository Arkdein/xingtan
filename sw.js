// Offline support: keeps a copy of the app so it opens without internet.
// Bump VERSION whenever you change any file, so browsers fetch the update.
const VERSION = 'v8';
const CACHE = `xingtan-${VERSION}`;
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/classes.js',
  './js/boards.js',
  './js/backgrounds.js',
  './js/icons.js',
  './js/dock.js',
  './js/points.js',
  './js/widgets/index.js',
  './js/widgets/timer.js',
  './js/widgets/clock.js',
  './js/widgets/picker.js',
  './js/widgets/groups.js',
  './js/widgets/points.js',
  './js/widgets/noise.js',
  './js/widgets/traffic.js',
  './js/widgets/text.js',
  './js/widgets/symbols.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/blossom-branch.svg',
  './fonts/mashanzheng-xingtan.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (so updates show up when online), fall back to the cached copy offline.
// `cache: 'no-cache'` makes the browser check with the server every time instead of
// reusing its own HTTP cache (GitHub Pages allows 10 minutes), so an update shows up
// on the first reload. Unchanged files come back as a quick "not modified".
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
