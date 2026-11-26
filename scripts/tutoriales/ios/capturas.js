/* Capturas reales de la app (en un iPhone simulado, ya instalada) para el video del iPhone.
   Uso: node capturas.js CARPETA_SALIDA   (la app tiene que estar servida en http://localhost:8123) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '.'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => {
    window.__st = { perm: 'default', sub: null };
    window.PushManager = window.PushManager || function () {};
    window.Notification = { get permission() { return window.__st.perm; }, requestPermission: async () => 'granted' };
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const sub = { endpoint: 'https://web.push.apple.com/X', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'a', auth: 'b' } }; }, unsubscribe: async () => true };
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => window.__st.sub, subscribe: async () => { window.__st.sub = sub; return sub; } } }), addEventListener() {}, register: () => new Promise(() => {}) }, configurable: true });
    const f = window.fetch; window.fetch = async (u, i) => String(u).includes('/functions/v1/push-hook') ? new Response(JSON.stringify({ ok: true, key: 'BAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-Pw' })) : f(u, i);
  });
  const pg = await ctx.newPage(); await pg.goto('http://localhost:8123/index.html'); await pg.waitForTimeout(2500);
  const coords = {};
  await pg.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); const A = window.App; A.S.modal = null; A.DEMO = false; A.cloud.session = { user: { id: 'u' } }; A.cloud.api = async () => ({ ok: true }); A.S.tab = 'inicio'; A.refresh(); window.scrollTo(0, 0); });
  await pg.waitForTimeout(800);
  const box = async sel => { const r = await pg.locator(sel).first().boundingBox(); return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null; };
  coords.menu = await box('[data-act="drawer"], [data-act="menu"], header [aria-label*="enú"], header button:nth-of-type(2)');
  await pg.screenshot({ path: path.join(OUT, 'scr1.png') });
  await pg.evaluate(() => { window.App.acts.notifOpen(); }); await pg.waitForTimeout(700);
  await pg.evaluate(() => { const b = document.querySelector('.wp-box'); if (b) b.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(400);
  coords.activar = await box('[data-act="wpEnable"]');
  await pg.screenshot({ path: path.join(OUT, 'scr2.png') });
  await pg.evaluate(() => { window.__st.perm = 'granted'; });
  await pg.locator('[data-act="wpEnable"]').click(); await pg.waitForTimeout(900);
  await pg.evaluate(() => { const b = document.querySelector('.wp-box'); if (b) b.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(OUT, 'scr3.png') });
  fs.writeFileSync(path.join(OUT, 'coords.json'), JSON.stringify(coords));
  console.log(JSON.stringify(coords)); await b.close();
})();
