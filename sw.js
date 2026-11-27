// Odonto Voz: funcionamiento sin conexión y avisos de versión nueva.
// Cambiar VERSION en cada actualización publicada para que los teléfonos la reciban.
// VERSION es interno (sigue subiendo); NAME es el número que ve la gente.
const VERSION = 'odontovoz-1.114.0';
const NAME = '1.58.0';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'jspdf.umd.min.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // La página siempre intenta traer la última versión; sin conexión usa la guardada.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })));
  }
});

// avisos con la app cerrada (Web Push: iPhone, iPad, PC y Android sin el APK). Apple exige mostrar siempre una notificación.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { body: e.data.text() }; } catch (y) { d = {}; } }
  e.waitUntil(self.registration.showNotification(d.title || 'OdontoVoz', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icon-192.png', badge: 'icon-192.png', data: d.data || {}, renotify: !!d.tag
  }));
});
// si el navegador renueva la suscripción, la app se vuelve a anotar la próxima vez que se abre
self.addEventListener('pushsubscriptionchange', e => { e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage({ type: 'ov-push-renew' })))); });

// al tocar una notificación (por ejemplo «Llegó …»), se abre o se trae al frente la app y se le pasa qué se tocó
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = (e.notification && e.notification.data) || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { try { c.postMessage({ type: 'ov-push', data }); } catch (x) { /* nada */ } return c.focus(); } }
    return self.clients.openWindow ? self.clients.openWindow('./?ovp=' + encodeURIComponent(JSON.stringify(data))) : null;
  }));
});
