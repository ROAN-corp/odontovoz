/* Prueba del panel de administración (admin.html) con el servidor simulado: alertas, atajos de prueba y pago, carga de hojas con IA, uso e historial.
   Uso: node tests/ui/admin.js    Necesita: npm i --no-save playwright */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const hoy = new Date(), iso = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const cuentas = [
  { owner: 'o1', email: 'cliente1@ejemplo.com', plan: 'prueba', status: 'activa', trial_until: iso(3), paid_until: null, created_at: iso(-5) + 'T10:00:00Z', records: 12, limits: { pros: 1, devices: 2 }, ai_sheets: 0 },
  { owner: 'o2', email: 'cliente2@ejemplo.com', plan: 'basico', status: 'activa', trial_until: iso(-20), paid_until: iso(30), created_at: iso(-60) + 'T10:00:00Z', records: 900, limits: { pros: 1, devices: 2 }, ai_sheets: 20 }
];
const uso = [{ owner: 'o1', days: 0, last_day: null, counts: {} }, { owner: 'o2', days: 12, last_day: iso(-1), counts: { turno: 80, cobro: 30, voz: 5 } }];
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(CHROME ? { executablePath: CHROME } : {}) }), ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = [], calls = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept('10').catch(() => {}));
  await pg.addInitScript(() => { sessionStorage.setItem('ovadm', JSON.stringify({ access_token: 't', refresh_token: 'r', email: 'admin@ejemplo.com', id: 'adm' })); });
  await pg.route('**/*', async r => {
    const u = r.request().url(), m = r.request().method(); if (u.startsWith('file:')) return r.continue();
    const J = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
    if (!u.includes('supabase.co')) return r.abort();
    calls.push(m + ' ' + u.replace(/^.*supabase\.co/, '') + ' ' + (r.request().postData() || ''));
    if (u.includes('/ov_admins')) return J([{ user_id: 'adm' }]);
    if (u.includes('/rpc/ov_admin_accounts')) return J(cuentas);
    if (u.includes('/rpc/ov_admin_usage')) return J(uso);
    if (u.includes('/rpc/ov_admin_ai_add')) return J(520);
    if (u.includes('/ov_ai_ledger')) return J([{ at: iso(0) + 'T10:00:00Z', delta: 500, saldo: 520, motivo: 'Paquete 500 hojas (USD 49)', by_email: 'admin@ejemplo.com' }]);
    if (u.includes('/ov_audit')) return J([{ at: iso(0) + 'T10:00:00Z', by_email: 'admin@ejemplo.com', change: { trial_until: [iso(3), iso(45)] } }]);
    if (m === 'PATCH') return J({});
    return J([], 200);
  });
  await pg.goto('file://' + path.join(ROOT, 'admin.html')); await pg.waitForTimeout(1200);
  const R = []; const ok = (n, c, d) => R.push([n, !!c, d === undefined ? '' : String(d)]);
  const txt = () => pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  let t = await txt();
  ok('lista las cuentas', /cliente1@ejemplo\.com/.test(t) && /cliente2@ejemplo\.com/.test(t));
  ok('alerta: vence en 7 días', /Vencen en 7 días \(1\)/.test(t));
  ok('alerta: sin uso hace 10 días', /Sin uso hace 10 días o más \(1\)/.test(t));
  ok('alerta: pocas hojas con IA', /Pocas hojas con IA \(1\)/.test(t));
  ok('muestra días de uso y saldo de hojas', /12 días de uso en 30/.test(t) && /IA: 20 hojas/.test(t));
  await pg.click('[data-x="ed"][data-id="o1"]'); await pg.waitForTimeout(200);
  await pg.click('[data-tr="45"]'); const tr = await pg.inputValue('#eTr'); ok('atajo: 45 días de prueba desde hoy', tr === iso(45), tr);
  await pg.click('[data-pa="30"]'); const pa = await pg.inputValue('#ePa'), pl = await pg.inputValue('#ePl'); ok('atajo: +1 mes pagado pasa el plan a Profesional', pa === iso(30) && pl === 'basico', pa + ' ' + pl);
  await pg.selectOption('#eAiP', { index: 0 }); await pg.click('#eAiOk'); await pg.waitForTimeout(300);
  ok('carga un paquete de 500 hojas', calls.some(c => /ov_admin_ai_add/.test(c) && /"p_n":500/.test(c) && /"p_owner":"o1"/.test(c)));
  ok('muestra el saldo nuevo', /ahora tiene 520 hojas/.test(await txt()));
  await pg.click('#eAiH'); await pg.waitForTimeout(200); ok('muestra movimientos de hojas', /Paquete 500 hojas/.test(await txt()));
  await pg.click('#eHist'); await pg.waitForTimeout(200); t = await txt(); ok('muestra el historial de cambios', /Prueba hasta/.test(t) && /admin@ejemplo\.com/.test(t));
  await pg.click('#eOk'); await pg.waitForTimeout(300);
  ok('guarda la cuenta con la prueba nueva', calls.some(c => /^PATCH .*owner=eq\.o1/.test(c) && c.includes(iso(45))));
  await b.close();
  let mal = 0; R.forEach(([n, c, d]) => { if (!c) mal++; console.log((c ? '  ok  ' : ' MAL  ') + n + (c ? '' : '  → ' + d)); });
  if (errs.length) console.log('errores de JavaScript:', errs.slice(0, 5));
  console.log(mal || errs.length ? '\nFALLÓ' : '\ntodo bien (' + R.length + ' controles)'); process.exit(mal || errs.length ? 1 : 0);
})();
