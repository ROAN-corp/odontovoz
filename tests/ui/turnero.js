/* Prueba de la página pública de turnos (sitio/turnos.html) con el servidor simulado: pedir turno y cancelarlo con código + DNI.
   Uso: node tests/ui/turnero.js    Necesita: npm i --no-save playwright */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const hoy = new Date(), iso = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const D = { clinic: 'Consultorio Prueba', addr: 'Calle 1', phone: '299 000', wa: '5492990000000', cancelHours: 24, sena: 0, types: [{ k: 'control', label: 'Control' }], pros: [{ id: 'p1', name: 'Dra. Ejemplo' }], slots: { control: { [iso(3)]: [['p1', 600, 30]] } } };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(CHROME ? { executablePath: CHROME } : {}) }), pg = await b.newPage({ viewport: { width: 390, height: 844 } }), errs = [], calls = [];
  pg.on('pageerror', e => errs.push(e.message));
  let modo = 'ok';
  await pg.route('**/*', async r => {
    const u = r.request().url(); if (u.startsWith('file:')) return r.continue();
    if (!u.includes('/rest/v1/rpc/')) return r.abort();
    const fn = u.split('/rpc/')[1], body = JSON.parse(r.request().postData() || '{}'); calls.push(fn + ' ' + JSON.stringify(body));
    const J = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    const appt = { code: 'OV-AB12', date: iso(3), start: 600, pro: 'p1', type: 'control', first: 'Ana' };
    if (fn === 'ov_booking_get') return J(D);
    if (fn === 'ov_booking_find') {
      if (body.p_dni !== '12345678') return J({ ok: false, msg: 'No encontramos un turno con ese código y ese DNI.' });
      return J(modo === 'tarde' ? { ok: true, canceled: false, can_cancel: false, past: false, window: 24, left_hours: 5, appt, wa: D.wa } : { ok: true, canceled: false, can_cancel: true, window: 24, left_hours: 70, appt, wa: D.wa });
    }
    if (fn === 'ov_booking_cancel') return J({ ok: true, canceled: true, can_cancel: false, appt });
    return J(null);
  });
  const R = [], ok = (n, c, d) => R.push([n, !!c, d === undefined ? '' : String(d)]), txt = () => pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  await pg.goto('file://' + path.join(ROOT, 'sitio', 'turnos.html') + '?c=abc123xyz'); await pg.waitForTimeout(800);
  ok('la página de turnos muestra el enlace para cancelar', /Cancelalo acá/.test(await txt()));
  await pg.click('[data-a="cx"]'); await pg.waitForTimeout(100);
  await pg.fill('#cxCode', 'ov-ab12'); await pg.fill('#cxDni', '999'); await pg.click('[data-a="cxFind"]'); await pg.waitForTimeout(200);
  ok('pide código y DNI completos', /Escribí el código del turno y tu DNI/.test(await txt()));
  await pg.fill('#cxDni', '11111111'); await pg.click('[data-a="cxFind"]'); await pg.waitForTimeout(300);
  ok('con un DNI que no es no muestra el turno', /No encontramos un turno/.test(await txt()));
  await pg.fill('#cxDni', '12.345.678'); await pg.click('[data-a="cxFind"]'); await pg.waitForTimeout(300);
  let t = await txt(); ok('muestra el turno con día, hora y código', /10:00 h/.test(t) && /OV-AB12/.test(t) && /Sí, cancelar mi turno/.test(t));
  ok('manda el código en mayúsculas y el DNI solo con números', calls.some(c => /ov_booking_find/.test(c) && /"p_code":"OV-AB12"/.test(c) && /"p_dni":"12345678"/.test(c)));
  await pg.fill('#cxWhy', 'No puedo ir'); await pg.click('[data-a="cxGo"]'); await pg.waitForTimeout(300);
  t = await txt(); ok('confirma que el turno quedó cancelado', /Tu turno quedó cancelado/.test(t) && /Pedir un turno nuevo/.test(t));
  ok('manda el motivo', calls.some(c => /ov_booking_cancel/.test(c) && /No puedo ir/.test(c)));
  await pg.click('[data-a="cxAgain"]'); await pg.waitForTimeout(500); ok('puede pedir un turno nuevo', /por qué querés venir/i.test(await txt()));
  modo = 'tarde'; await pg.click('[data-a="cx"]'); await pg.fill('#cxCode', 'OV-AB12'); await pg.fill('#cxDni', '12345678'); await pg.click('[data-a="cxFind"]'); await pg.waitForTimeout(300);
  t = await txt(); ok('si falta poco, no deja cancelar y ofrece WhatsApp', /Ya no se puede cancelar desde acá/.test(t) && /Escribir al consultorio por WhatsApp/.test(t) && !/Sí, cancelar mi turno/.test(t));
  await b.close();
  let mal = 0; R.forEach(([n, c, d]) => { if (!c) mal++; console.log((c ? '  ok  ' : ' MAL  ') + n + (c ? '' : '  → ' + d)); });
  if (errs.length) console.log('errores de JavaScript:', errs.slice(0, 5));
  console.log(mal || errs.length ? '\nFALLÓ' : '\ntodo bien (' + R.length + ' controles)'); process.exit(mal || errs.length ? 1 : 0);
})();
