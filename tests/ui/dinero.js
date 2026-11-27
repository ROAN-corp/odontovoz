/* Prueba de plata: cargos, cobros, anulaciones, ajustes, centavos y que la caja y el saldo del paciente coincidan.
   Uso: node tests/ui/dinero.js    Necesita: npm i --no-save playwright jspdf@2.5.1 */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(CHROME ? { executablePath: CHROME } : {}) }), pg = await b.newPage({ viewport: { width: 1366, height: 860 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message.split('\n')[0])); pg.on('dialog', d => d.accept().catch(() => {}));
  await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForTimeout(1800);
  const res = await pg.evaluate(() => {
    document.querySelectorAll('#intro,.intro').forEach(x => x.remove()); const A = window.App; A.S.modal = null; A.CFG.demo = false;
    const out = [], ok = (n, c, d) => out.push([n, !!c, d === undefined ? '' : String(d)]);
    const pid = A.PATS[2].id, pd = A.pd(pid); pd.ledger = []; const S0 = A.saldo(pid);
    const add = (type, amount, extra) => { const e = Object.assign({ id: A.uid(), date: A.today(), type, amount, desc: type, pro: A.PAT(pid).pro }, extra || {}); pd.ledger.push(e); A.touchPd(pid); return e; };
    // importes con centavos
    [['1.234,56', 1234.56], ['1234,5', 1234.5], ['$ 1.500', 1500], ['1500.75', 1500.75], ['10.000', 10000], ['0,99', 0.99], ['2.500,00', 2500], ['', NaN]].forEach(([s, v]) => { const r = A.parseMoney(s); ok('parseMoney("' + s + '")', (isNaN(v) ? !(r > 0) : Math.abs(r - v) < 0.005), r); });
    add('cargo', 10000.10); ok('saldo tras cargo', Math.abs(A.saldo(pid) - 10000.10) < 0.005, A.saldo(pid));
    const p1 = add('pago', 4000.05); ok('saldo tras pago', Math.abs(A.saldo(pid) - 6000.05) < 0.005, A.saldo(pid));
    A.S.fichaPid = pid; const anular = id => { A.acts.ledVoid({ getAttribute: () => id }); const w = document.getElementById('cjWhy'); if (w) { w.value = 'prueba'; A.acts.cjReasonGo(); } };
    anular(p1.id); ok('anular el pago devuelve el saldo', Math.abs(A.saldo(pid) - 10000.10) < 0.005, A.saldo(pid));
    anular(p1.id); ok('anular dos veces no duplica', Math.abs(A.saldo(pid) - 10000.10) < 0.005, A.saldo(pid));
    add('ajuste', -1000); ok('descuento baja el saldo', Math.abs(A.saldo(pid) - 9000.10) < 0.005, A.saldo(pid));
    add('pago', 9000.10); ok('saldo en cero tras pagar todo', Math.abs(A.saldo(pid)) < 0.005, A.saldo(pid));
    ok('sin NaN en el libro', pd.ledger.every(e => isFinite(e.amount)));
    // el cobro real por pantalla
    pd.ledger = []; add('cargo', 5000); S0; A.S.modal = { type: 'cobro', pid }; A.renderModal();
    const f = id => document.getElementById(id);
    if (f('mvAmt')) { f('mvAmt').value = '1.250,50'; A.acts.cobroSave(); ok('cobro por pantalla con centavos', Math.abs(A.saldo(pid) - 3749.5) < 0.005, A.saldo(pid)); ok('el cobro quedó con medio y fecha', pd.ledger.filter(e => e.type === 'pago').every(e => e.method && e.date)); }
    else ok('se abre la ventana de cobro', false);
    A.S.modal = null; A.renderModal();
    // cargo con importe cero o negativo no se guarda
    A.S.modal = { type: 'cargo', pid }; A.renderModal(); const n0 = pd.ledger.length; f('mvDesc').value = 'Prueba'; f('mvAmt').value = '0'; A.acts.cargoSave(); ok('un cargo en cero no se guarda', pd.ledger.length === n0);
    f('mvAmt').value = '-500'; A.acts.cargoSave(); ok('un cargo negativo no se guarda', pd.ledger.length === n0);
    A.S.modal = null; A.renderModal();
    // caja: lo cobrado hoy coincide con la suma de pagos de hoy
    A.PATS.forEach(p => { A.pd(p.id).ledger = A.pd(p.id).ledger.filter(e => e.date !== A.today()); });
    const pa = A.PATS[0].id, pb = A.PATS[1].id; [[pa, 1000], [pb, 2500.5]].forEach(([id, m]) => { A.pd(id).ledger.push({ id: A.uid(), date: A.today(), type: 'pago', amount: m, desc: 'Cobro', method: 'Efectivo', pro: A.PAT(id).pro, rcp: 'X' + m }); A.touchPd(id); });
    A.S.tab = 'caja'; A.refresh(); const hoy = Array.from(document.querySelectorAll('button,[data-act]')).filter(e => (e.textContent || '').trim() === 'Hoy')[0]; if (hoy) hoy.click(); const txt = document.body.innerText.replace(/\s+/g, ' ');
    ok('la caja muestra 3.500,50 de hoy', /3\.50[01](,50)?/.test(txt), txt.slice(0, 900));
    return out;
  });
  await b.close();
  let mal = 0; res.forEach(([n, c, d]) => { if (!c) mal++; console.log((c ? '  ok  ' : ' MAL  ') + n + (c ? '' : '  → ' + d)); });
  if (errs.length) console.log('errores de JavaScript:', errs.slice(0, 5));
  console.log(mal || errs.length ? '\nFALLÓ: ' + mal + ' controles' : '\ntodo bien (' + res.length + ' controles)'); process.exit(mal || errs.length ? 1 : 0);
})();
