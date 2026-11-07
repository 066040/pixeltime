/* İnternetsiz çalışabilmek için dosyaları telefonda saklar */
var CACHE = 'pixeltime-v14';
var FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/data.js', 'js/birds.js', 'js/app.js', 'img/pixel.jpg', 'img/pixel-portre.jpg', 'img/pixel-logo.svg', 'img/pixel-logo-kucuk.svg', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'media/uyanik.mp4', 'fonts/ibm-plex-mono-latin-400-normal.woff2', 'fonts/ibm-plex-mono-latin-500-normal.woff2', 'fonts/ibm-plex-mono-latin-ext-400-normal.woff2', 'fonts/ibm-plex-mono-latin-ext-500-normal.woff2', 'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-500-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2', 'fonts/ibm-plex-sans-latin-ext-400-normal.woff2', 'fonts/ibm-plex-sans-latin-ext-500-normal.woff2', 'fonts/ibm-plex-sans-latin-ext-600-normal.woff2', 'fonts/bitter-latin-600-normal.woff2', 'fonts/bitter-latin-700-normal.woff2', 'fonts/bitter-latin-ext-600-normal.woff2', 'fonts/bitter-latin-ext-700-normal.woff2'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.host !== location.host && u.host !== 'cdn.jsdelivr.net' && u.host !== 'upload.wikimedia.org') return;   // sunucu istekleri önbelleğe girmez
  e.respondWith(fetch(e.request).then(function (r) { if (!r.ok && r.type !== 'opaque') return r; var c = r.clone(); caches.open(CACHE).then(function (x) { x.put(e.request, c); }); return r; })
    .catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('./'); }); }));
});
