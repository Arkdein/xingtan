// Offline support: keeps a copy of the app so it opens without internet.
// Bump VERSION whenever you change any file, so browsers fetch the update.
const VERSION = 'v49';
const CACHE = `xingtan-${VERSION}`;
// Stroke-order data for the Character grid never changes, so each character is
// kept (in its own cache, across app updates) from the first time it is shown.
const HANZI_CACHE = 'xingtan-hanzi-v1';
const FILES = [
  './',
  './index.html',
  './guide.html',
  './css/guide.css',
  './privacy.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/i18n.js',
  './js/i18n/zh-core.js',
  './js/i18n/zh-app.js',
  './js/i18n/zh-common.js',
  './js/i18n/zh-widgets-media.js',
  './js/i18n/zh-widgets-poll-dictation.js',
  './js/i18n/zh-widgets-thinking.js',
  './js/i18n/zh-widgets-classroom.js',
  './js/i18n/zh-widgets-quotes.js',
  './js/i18n/zh-widgets-readaloud.js',
  './js/i18n/zh-widgets-analysis.js',
  './js/store.js',
  './js/db.js',
  './js/ui.js',
  './js/richtext.js',
  './js/classes.js',
  './js/boards.js',
  './js/backgrounds.js',
  './js/icons.js',
  './js/dock.js',
  './js/points.js',
  './js/images.js',
  './js/pdf.js',
  './js/library.js',
  './js/boardsettings.js',
  './js/youtube.js',
  './js/audio.js',
  './js/musiclibrary.js',
  './js/spotify.js',
  './js/routines.js',
  './js/google.js',
  './js/gforms.js',
  './js/polls.js',
  './js/wordcloud.js',
  './js/dictionary.js',
  './js/voiceui.js',
  './js/wordlists.js',
  './js/quotelibrary.js',
  './js/quotelists.js',
  './js/textposts.js',
  './js/passages.js',
  './js/reading.js',
  './js/vendor/qrcode.js',
  './js/widgets/index.js',
  './js/widgets/timer.js',
  './js/widgets/clock.js',
  './js/widgets/picker.js',
  './js/widgets/groups.js',
  './js/widgets/points.js',
  './js/widgets/routine.js',
  './js/widgets/poll.js',
  './js/widgets/noise.js',
  './js/widgets/traffic.js',
  './js/widgets/text.js',
  './js/widgets/symbols.js',
  './js/widgets/youtube.js',
  './js/widgets/music.js',
  './js/widgets/images.js',
  './js/widgets/lessonflow.js',
  './js/widgets/dictation.js',
  './js/widgets/hanzi.js',
  './js/widgets/organiser.js',
  './js/widgets/whiteboard.js',
  './js/widgets/sharelink.js',
  './js/widgets/quotes.js',
  './js/widgets/readaloud.js',
  './js/widgets/analysis.js',
  './js/widgets/saved.js',
  // The user guide (guide.html and each tool's "?" panel).
  './js/guide/index.js',
  './js/guide/sections.js',
  './js/guide/panel.js',
  './js/guide/page.js',
  './js/guide/tools-time-people.js',
  './js/guide/tools-thinking-signals.js',
  './js/guide/tools-media-language.js',
  // Pinyin and stroke animation, so Dictation and the Character grid work offline.
  './js/vendor/pinyin-pro/pinyin-pro.mjs',
  './js/vendor/hanzi-writer/hanzi-writer.mjs',
  // The traditional-character converter (js/vendor/opencc) is only for online
  // 萌典 look-ups, so it is cached the first time it is used.
  // PDF.js (js/vendor/pdfjs) is cached the first time a PDF is added, not up front.
  // Background music (music/*.mp3) is cached the first time each track plays.
  // Library thumbnails; full-size backgrounds are cached the first time they're used.
  './backgrounds/thumbs/cn-bulbuls.webp',
  './backgrounds/thumbs/cn-finches-bamboo.webp',
  './backgrounds/thumbs/cn-orchids-bamboo.webp',
  './backgrounds/thumbs/cn-streams-mountains.webp',
  './backgrounds/thumbs/cn-thousand-li.webp',
  './backgrounds/thumbs/fe-christmas.webp',
  './backgrounds/thumbs/fe-cny-lanterns.webp',
  './backgrounds/thumbs/fe-deepavali.webp',
  './backgrounds/thumbs/fe-fireworks.webp',
  './backgrounds/thumbs/fe-lanterns.webp',
  './backgrounds/thumbs/na-calm-waters.webp',
  './backgrounds/thumbs/na-cumulus.webp',
  './backgrounds/thumbs/na-hills.webp',
  './backgrounds/thumbs/na-misty-mountains.webp',
  './backgrounds/thumbs/na-sea-sky.webp',
  './backgrounds/thumbs/na-tea-plantation.webp',
  './backgrounds/thumbs/sg-hdb.webp',
  './backgrounds/thumbs/sg-marina-bay-night.webp',
  './backgrounds/thumbs/sg-marina-bay.webp',
  './backgrounds/thumbs/sg-skyline.webp',
  './backgrounds/thumbs/sg-supertrees.webp',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/blossom-branch.svg',
  './fonts/mashanzheng-xingtan.woff2',
  './fonts/wenkai-quotes.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== HANZI_CACHE).map((k) => caches.delete(k))))
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
  if (new URL(req.url).pathname.includes('/data/hanzi/')) {
    event.respondWith(caches.open(HANZI_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
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
