/* Prueba de los PDF: todos salen con el membrete del consultorio (logo, nombre, dirección, teléfono, correo y web).
   1) Revisa en el código que cada PDF que se arma con A.pdfDoc_ llame al membrete (o.head).  2) Arma varios PDF de verdad y mira que tengan el logo y los datos.
   Uso: node tests/ui/pdfs.js    Necesita: npm i --no-save playwright jspdf@2.5.1 */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const R = [], ok = (n, c, d) => R.push([n, !!c, d === undefined ? '' : String(d)]);
/* 1) estático */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), re = /(?:A\.pdfDoc_ && A\.pdfDoc_|A\.pdfDoc_|\bDoc)\('([^']*)/g; let m; const sin = [];
while ((m = re.exec(html))) { const trozo = html.slice(m.index, m.index + 900); if (!/\b[od]\.head\(/.test(trozo) && !/bodyToPdf\(/.test(trozo)) sin.push(m[1] + ' @' + html.slice(0, m.index).split('\n').length); }
const EXC = ['Constancia']; const faltan = sin.filter(x => !EXC.some(e => x.startsWith(e)));
ok('todos los PDF llaman al membrete del consultorio', faltan.length === 0, faltan.join(' | '));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(CHROME ? { executablePath: CHROME } : {}) }), pg = await b.newPage({ viewport: { width: 1280, height: 860 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForTimeout(1800);
  await pg.addScriptTag({ path: path.join(ROOT, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js') });
  const res = await pg.evaluate(async () => {
    document.querySelectorAll('#intro,.intro').forEach(x => x.remove()); const A = window.App; A.S.modal = null; A.CFG.demo = false;
    A.CLINIC = 'Consultorio Aurora'; A.CFG.addr = 'Belgrano 155, Allen'; A.CFG.phone = '298 4513279'; A.CFG.mail = 'hola@aurora.com'; A.CFG.web = '@aurora.odonto';
    const c = document.createElement('canvas'); c.width = 120; c.height = 60; const g = c.getContext('2d'); g.fillStyle = '#0f766e'; g.fillRect(0, 0, 120, 60); A.CFG.logo = { src: c.toDataURL('image/png'), w: 120, h: 60 };
    const pid = A.PATS[1].id; A.S.fichaPid = pid; const out = {}; const sv = A.saveFile;
    const grab = async (n, fn) => { let blob = null; A.saveFile = (name, b) => { blob = b; return Promise.resolve(true); }; try { await fn(); } catch (e) { out[n] = { err: String(e.message) }; A.saveFile = sv; return; } A.saveFile = sv; if (!blob) { out[n] = { err: 'no generó PDF' }; return; } const t = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer())); out[n] = { img: /\/Subtype\s*\/Image/.test(t), nombre: /Consultorio Aurora/i.test(t), dir: /Belgrano 155/.test(t), tel: /298 4513279/.test(t), mail: /hola@aurora\.com/.test(t), web: /@aurora\.odonto/.test(t) }; };
    await grab('historia clínica', () => A.acts.pdfHC({ getAttribute: () => pid }));
    await grab('estado de cuenta', () => A.acts.pdfCuenta({ getAttribute: () => pid }));
    await grab('informe para colega', async () => { A.pd(pid).notes.push({ id: A.uid(), date: A.today(), text: 'x', pro: A.PAT(pid).pro }); A.S.modal = { type: 'rp', pid, sel: { evo: true }, to: '', why: 'x', rec: '', rx: false, sign: false }; await A.acts.rpGo(); });
    await grab('tarjeta del implante', async () => { A.pd(pid).impl = [{ id: 'i1', tooth: '36', brand: 'Straumann', surgDate: '2026-09-10', ctls: [] }]; await A.acts.imCard(); });
    await grab('plan de tratamiento', async () => { A.pd(pid).tp = A.pd(pid).tp || {}; A.S.tab = 'ficha'; A.S.fichaTab = 'plan'; A.refresh(); A.acts.pdfPlanTp(); });
    const paper = A.docPaperHTML({ title: 'Recibo', lead: 'x', sections: [] }, A.PAT(pid)); out.pantalla = { logo: /dp-head/.test(paper) && /<img/.test(paper), datos: /Belgrano 155/.test(paper) && /hola@aurora\.com/.test(paper) };
    return out;
  });
  await b.close();
  Object.keys(res).forEach(k => { const v = res[k]; if (v.err) ok('PDF ' + k, false, v.err); else { const faltan = Object.keys(v).filter(x => !v[x]); ok((k === 'pantalla' ? 'vista en pantalla (recibos, documentos): ' : 'PDF ') + k + ': logo, nombre y datos', faltan.length === 0, 'falta: ' + faltan.join(', ')); } });
  let mal = 0; R.forEach(([n, c, d]) => { if (!c) mal++; console.log((c ? '  ok  ' : ' MAL  ') + n + (c ? '' : '  → ' + d)); });
  if (errs.length) console.log('errores de JavaScript:', errs.slice(0, 5));
  console.log(mal || errs.length ? '\nFALLÓ' : '\ntodo bien (' + R.length + ' controles)'); process.exit(mal || errs.length ? 1 : 0);
})();
