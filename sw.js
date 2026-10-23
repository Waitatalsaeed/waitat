/* دفتر الوايتات - يخلي التطبيق يفتح بدون نت */
var V = 'shib-v1';
var FONTS = 'shib-fonts';
var SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req) {
  return caches.open(V).then(function (c) {
    var timeout = new Promise(function (res) { setTimeout(res, 3500); });
    var net = fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; });
    return Promise.race([net, timeout.then(function () { return c.match(req, { ignoreSearch: true }); })])
      .then(function (r) { return r || net; })
      .catch(function () { return c.match(req, { ignoreSearch: true }).then(function (r) { return r || c.match('index.html'); }); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  if (url.origin === location.origin) {
    if (req.mode === 'navigate' || /config\.js$/.test(url.pathname) || /index\.html$/.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { c.put(req, r.clone()); return r; }); });
    }));
  }
});
