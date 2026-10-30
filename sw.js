/* İnternetsiz çalışabilmek için dosyaları telefonda saklar */
var CACHE = 'pixeltime-v4';
var FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/data.js', 'js/birds.js', 'js/app.js', 'logo.svg', 'favicon.svg', 'favicon-32.png',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Önce internet, yoksa telefondaki kopya: güncellemeler hemen gelir, internetsizken de açılır */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var h = new URL(e.request.url).host;
  if (h !== location.host && h !== 'cdn.jsdelivr.net') return;   // sunucu istekleri önbelleğe girmez
  e.respondWith(
    fetch(e.request).then(function (r) {
      var u = new URL(e.request.url);
      if (r.ok && (u.origin === location.origin || u.host === 'cdn.jsdelivr.net')) {
        var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return r;
    }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); })
  );
});
