/* Hábitos Atómicos — service worker: funciona sin conexión.
   Red primero para los archivos propios (así siempre ves la versión más nueva),
   caché primero para fuentes e íconos de CDN. */
const CACHE = 'habitos-atomicos-v2.4.0';
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './css/report.css',
  './js/core.js',
  './js/store.js',
  './js/stats.js',
  './js/sound.js',
  './js/ui.js',
  './js/atom.js',
  './js/editor.js',
  './js/settings.js',
  './js/views/today.js',
  './js/views/month.js',
  './js/views/goals.js',
  './js/views/notes.js',
  './js/views/progress.js',
  './js/views/report.js',
  './js/app.js',
  './assets/favicon.svg',
  './assets/sfx/check.mp3',
  './assets/sfx/uncheck.mp3',
  './assets/sfx/tap.mp3',
  './assets/sfx/tab.mp3',
  './assets/sfx/open.mp3',
  './assets/sfx/close.mp3',
  './assets/sfx/add.mp3',
  './assets/sfx/remove.mp3',
  './assets/sfx/goal.mp3',
  './assets/sfx/perfect.mp3',
  './assets/sfx/theme.mp3',
  './assets/sfx/voice.mp3',
  './css/motion.css',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // los videos usan peticiones parciales (Range): se dejan pasar directo a la red
  if (req.headers.has('range') || url.pathname.endsWith('.mp4')) return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      // 'no-cache' revalida con el servidor: siempre llega la versión publicada más nueva
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com/.test(url.host)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
