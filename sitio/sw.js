// La app se mudó a /app/. Este archivo reemplaza al service worker viejo de la raíz y se da de baja solo.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^odontovoz-/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => { try { c.navigate(c.url); } catch (err) { /* nada */ } });
  })());
});
