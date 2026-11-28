/* Prueba de pantallas de OdontoVoz (modo prueba, sin internet ni servidor).
   Qué revisa:
   1) Que la versión sea la misma en todos lados y que index.html esté al día con src/.
   2) Que cada módulo de src/ esté dentro de index.html y bien armado.
   3) Que ninguna pantalla tire errores de JavaScript, que ningún botón apunte a una acción que no existe y que nada se salga del ancho en el celular.
   4) Que anden las funciones principales (consentimientos, alquileres, mensajes de WhatsApp, Implantes, Endodoncia, Escaneos 3D, vínculos y datos del profesional).
   Uso:  node tests/ui/humo.js [carpeta_capturas]     (capturas fuera del repo; por defecto /tmp/ov-humo)
   Necesita: npm i --no-save playwright jspdf   y   npx playwright install chromium (o un Chrome en CHROME=/ruta). */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = process.argv[2] || '/tmp/ov-humo'; fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
let fails = 0, oks = 0;
const ok = (c, m, d) => { if (c) { oks++; if (process.env.VERBOSE) console.log('OK   ' + m); } else { fails++; console.log('FALLA ' + m + (d ? ' → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------- 1) versión y archivo armado ---------- */
(function estatico() {
  const pkg = JSON.parse(read('package.json')).version, a10 = read('src/app10.js'), sw = read('sw.js'), apk = read('.github/workflows/apk.yml'), cl = read('CLAUDE.md'), n55 = read('src/app55.js');
  const V = (a10.match(/A\.VERSION = '([^']+)'/) || [])[1], B = (a10.match(/A\.VBUILD = '([^']+)'/) || [])[1];
  ok(V === pkg, 'versión visible igual en app10 y package.json', { app10: V, pkg });
  ok((sw.match(/const NAME = '([^']+)'/) || [])[1] === V, 'versión visible igual en sw.js');
  ok((sw.match(/const VERSION = 'odontovoz-([^']+)'/) || [])[1] === B, 'compilación igual en app10 y sw.js', { app10: B });
  ok(apk.indexOf('v' + V + '.') >= 0 && apk.indexOf('OdontoVoz ' + V + ' ') >= 0, 'apk.yml tiene la versión ' + V);
  ok(cl.indexOf('**' + V + '** (compilación ' + B + ')') >= 0, 'CLAUDE.md tiene la versión y la compilación');
  ok(new RegExp("NEWS = \\[\\s*\\{ v: '" + V.replace(/\./g, '\\.') + "', b: '" + B.replace(/\./g, '\\.') + "'").test(n55), 'Novedades (app55) arranca con la versión ' + V + ' / ' + B);
  /* cada módulo de src/ está en el orden de inline-src y bien armado */
  const order = read('scripts/inline-src.js'), idx = read('index.html'), mods = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /\.js$/.test(f));
  const sin = mods.filter(f => order.indexOf("'" + f + "'") < 0); ok(!sin.length, 'todos los módulos están en inline-src.js', sin);
  const malos = mods.filter(f => { const L = read('src/' + f).split('\n'); return !L[0].startsWith('/* =====') || L.slice(1).some(l => l.startsWith('/* =====')); }); ok(!malos.length, 'la primera línea de cada módulo es la única que empieza con «/* =====»', malos);
  const fuera = mods.filter(f => { const first = read('src/' + f).split('\n')[0]; return idx.indexOf(first) < 0; }); ok(!fuera.length, 'cada módulo de src/ está dentro de index.html', fuera);
  /* index.html al día: se vuelve a armar y no tiene que cambiar */
  const antes = idx; try { execFileSync('node', [path.join(ROOT, 'scripts', 'inline-src.js')], { cwd: ROOT, stdio: 'pipe' }); } catch (e) { /* se juzga abajo */ }
  const despues = read('index.html'); ok(antes === despues, 'index.html está al día con src/ (corré node scripts/inline-src.js)'); if (antes !== despues) fs.writeFileSync(path.join(ROOT, 'index.html'), antes);
})();

/* ---------- archivos de prueba ---------- */
const stlBuf = (() => { const nu = 24, nv = 14, V = [], F = []; for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) { const th = Math.PI * j / nv, ph = 2 * Math.PI * i / nu; V.push([12 * Math.sin(th) * Math.cos(ph), 9 * Math.cos(th), 8 * Math.sin(th) * Math.sin(ph)]); } for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + (i + 1) % nu, c = (j + 1) * nu + i, e = (j + 1) * nu + (i + 1) % nu; F.push([a, c, b], [b, c, e]); }
  const buf = Buffer.alloc(84 + F.length * 50); buf.writeUInt32LE(F.length, 80); F.forEach((t, k) => { const o = 84 + k * 50; t.forEach((vi, q) => V[vi].forEach((x, r) => buf.writeFloatLE(x, o + 12 + q * 12 + r * 4))); }); return buf; })();
const dcmBuf = (() => { const rows = 32, cols = 40, px = Buffer.alloc(rows * cols * 2); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) px.writeUInt16LE(500 + Math.round(3000 * Math.exp(-((r - 16) ** 2 + (c - 20) ** 2) / 120)), (r * cols + c) * 2);
  const el = (g, e, vr, v) => { if (vr === 'OW') { const h = Buffer.alloc(12); h.writeUInt16LE(g, 0); h.writeUInt16LE(e, 2); h.write(vr, 4); h.writeUInt32LE(v.length, 8); return Buffer.concat([h, v]); } if (v.length % 2) v = Buffer.concat([v, Buffer.from(vr === 'US' ? [0] : ' ')]); const h = Buffer.alloc(8); h.writeUInt16LE(g, 0); h.writeUInt16LE(e, 2); h.write(vr, 4); h.writeUInt16LE(v.length, 6); return Buffer.concat([h, v]); };
  const us = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  return Buffer.concat([Buffer.alloc(128), Buffer.from('DICM'), el(2, 0x10, 'UI', Buffer.from('1.2.840.10008.1.2.1\0')), el(0x28, 2, 'US', us(1)), el(0x28, 4, 'CS', Buffer.from('MONOCHROME2')), el(0x28, 0x10, 'US', us(rows)), el(0x28, 0x11, 'US', us(cols)), el(0x28, 0x100, 'US', us(16)), el(0x28, 0x103, 'US', us(0)), el(0x7FE0, 0x10, 'OW', px)]); })();

/* ---------- 2) pantallas y 3) funciones ---------- */
const PASOS = [
  ['inicio', "App.goHome()"], ['agenda', "App.S.tab='agenda'; App.refresh()"], ['turno-nuevo', "App.acts.newAppt(document.createElement('button'))"], ['cerrar', "App.S.modal=null; App.renderModal()"],
  ['ficha', "App.openFicha(App.PATS[0].id,'datos')"], ['odontograma', "App.openFicha(App.PATS[0].id,'odon')"], ['plan', "App.openFicha(App.PATS[0].id,'plan')"], ['fotos', "App.openFicha(App.PATS[0].id,'img')"], ['ortodoncia', "App.openFicha(App.PATS[0].id,'orto')"],
  ['implantes', "App.openFicha(App.PATS[0].id,'implantes')"], ['endodoncia', "App.openFicha(App.PATS[0].id,'endo')"], ['escaneos', "App.openFicha(App.PATS[0].id,'scan')"], ['documentos', "App.openFicha(App.PATS[0].id,'docs')"], ['cuenta', "App.openFicha(App.PATS[0].id,'cuenta')"],
  ['consentimientos', "App.S.fichaPid=App.PATS[0].id; App.acts.consentPick()"], ['caja', "App.S.modal=null; App.S.tab='caja'; App.refresh()"], ['liquidaciones', "App.S.tab='liq'; App.refresh()"], ['ajustes', "App.acts.ajOpen()"], ['stock', "App.S.modal=null; App.acts.stkOpen()"],
  ['recargos', "App.S.modal=null; App.acts.payRatesOpen()"], ['whatsapp', "App.S.modal=null; App.acts.waCfg()"], ['mensajes-wa', "App.acts.waTplOpen()"], ['avisos', "App.S.modal=null; App.acts.notifOpen()"], ['menu', "App.S.modal=null; App.renderModal(); App.acts.gear()"]
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'].concat(CHROME ? [] : []), ...(CHROME ? { executablePath: CHROME } : {}) });
  const nuevo = async (w, h) => {
    const pg = await b.newPage({ viewport: { width: w, height: h } }), errs = [];
    pg.on('pageerror', e => errs.push('JS: ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::|proxy|403|favicon/i.test(m.text())) errs.push('consola: ' + m.text()); });
    await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForTimeout(2200);
    await pg.addScriptTag({ path: path.join(ROOT, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js') }).catch(() => {});
    await pg.evaluate(() => { document.querySelectorAll('#intro,.intro').forEach(x => x.remove()); App.S.modal = null; App.CFG.demo = false; App.renderModal(); });
    /* mientras se prueba, cualquier botón que aparezca y no tenga su acción queda anotado */
    await pg.evaluate(() => { window.__falta = {}; const A = window.App, m = { 'data-act': A.acts, 'data-chg': A.chg, 'data-in': A.ins, 'data-sub': A.subs };
      const audit = () => Object.keys(m).forEach(at => document.querySelectorAll('[' + at + ']').forEach(e => { const n = e.getAttribute(at); if (n && !(m[at] && typeof m[at][n] === 'function')) window.__falta[at + '=' + n] = 1; }));
      new MutationObserver(audit).observe(document.body, { childList: true, subtree: true }); audit(); });
    return { pg, errs };
  };
  /* pantallas: errores, botones sin acción y desbordes */
  for (const [w, h, tag] of [[390, 844, 'cel'], [1366, 860, 'pc']]) {
    const { pg, errs } = await nuevo(w, h);
    for (const [nombre, js] of PASOS) {
      try {
        await pg.evaluate(js); await pg.waitForTimeout(250);
        const r = await pg.evaluate(() => { const A = window.App, falta = []; const m = { act: A.acts, chg: A.chg, in: A.ins, sub: A.subs };
          [['data-act', 'act'], ['data-chg', 'chg'], ['data-in', 'in'], ['data-sub', 'sub']].forEach(([at, k]) => document.querySelectorAll('[' + at + ']').forEach(e => { const n = e.getAttribute(at); if (n && !(m[k] && typeof m[k][n] === 'function')) falta.push(at + '=' + n); }));
          return { falta: Array.from(new Set(falta)), ancho: document.documentElement.scrollWidth - window.innerWidth }; });
        ok(!r.falta.length, tag + ' · ' + nombre + ': todos los botones tienen su acción', r.falta);
        if (tag === 'cel') ok(r.ancho <= 2, tag + ' · ' + nombre + ': no se sale del ancho de la pantalla', r.ancho + ' px de más');
        if (process.env.CAPTURAS) await pg.screenshot({ path: path.join(OUT, tag + '-' + nombre + '.png') });
      } catch (e) { ok(false, tag + ' · ' + nombre + ': abre sin romperse', String(e.message).split('\n')[0]); }
    }
    ok(!errs.length, tag + ': sin errores de JavaScript', errs.slice(0, 5)); await pg.close();
  }

  /* funciones: se prueban en el celular */
  const { pg, errs } = await nuevo(390, 844);
  const T = async (nombre, fn, arg) => { try { const r = await pg.evaluate(fn, arg); ok(r === true || (r && r.ok), nombre, r && r.ok === false ? r : (r === false ? 'devolvió falso' : r && r.d)); } catch (e) { ok(false, nombre, String(e.message).split('\n')[0]); } };
  await pg.evaluate(() => { const A = window.App, p = A.PATS[0]; window.__pid = p.id; A.S.fichaPid = p.id; A.S.tab = 'ficha'; A.S.fichaTab = 'docs'; A.refresh(); });

  /* consentimientos: editar para todos, crear uno nuevo, ajustar antes de firmar, PDF y WhatsApp */
  await T('consentimientos: editar uno y volver al original', () => { const A = window.App, pid = window.__pid; A.S.modal = { type: 'consentPick', pid }; A.renderModal(); document.querySelector('[data-act="consentEd"]').click(); document.getElementById('ceP').value = 'TEXTO PROPIO'; document.getElementById('ceR').value = 'Riesgo uno\nRiesgo dos'; A.acts.consentSave(); const k = Object.keys(A.CFG.consentTpl)[0], b = A.consentBody(pid, k); const ed = b.sections[0].p === 'TEXTO PROPIO' && b.sections[1].list.length === 2; A.S.modal = { type: 'consentPick', pid }; A.renderModal(); document.querySelector('[data-act="consentEd"]').click(); A.acts.consentRestore(); return { ok: ed && !Object.keys(A.CFG.consentTpl).length, d: { ed } }; });
  await T('consentimientos: crear uno nuevo y firmar con texto ajustado', () => { const A = window.App, pid = window.__pid; A.S.modal = { type: 'consentPick', pid }; A.renderModal(); A.acts.consentNew(); document.getElementById('ceT').value = 'Prueba nuevo'; document.getElementById('ceP').value = 'Proc'; document.getElementById('ceR').value = 'R1'; A.acts.consentSave(); const k = Object.keys(A.CFG.consentTpl)[0]; A.acts.consentGo({ getAttribute: () => k }); const hay = !!document.querySelector('[data-act="signEdit"]'); document.querySelector('[data-act="signEdit"]').click(); document.getElementById('seB1').value = 'R1\nR2'; A.acts.seSave(); const m = A.S.modal; const r = m.type === 'sign' && m.body.sections[1].list.length === 2 && /ajustado/.test(m.body.lead); delete A.CFG.consentTpl[k]; A.S.modal = null; A.renderModal(); return { ok: hay && r }; });
  await T('documentos firmados: se arma el PDF y el botón de WhatsApp', async () => { const A = window.App, pid = window.__pid, pd = A.pd(pid), now = new Date().toISOString(); pd.docs.push({ id: 'dt', kind: 'consent', title: 'Prueba', body: { title: 'Prueba', lead: 'x', sections: [{ h: 'A', p: 'b' }] }, pid, patient: { name: 'a', dni: '1' }, createdAt: now, sealedAt: now, sigs: [{ role: 'Paciente', name: 'A', dni: '1', strokes: [], ts: now }], status: 'firmado', audit: [], hash: 'abc' }); A.S.modal = { type: 'docView', pid, id: 'dt' }; A.renderModal(); const wa = !!document.querySelector('[data-act="docWa"]'); let got = null; const sv = A.saveFile; A.saveFile = (n, bl) => { got = bl.size; return Promise.resolve(true); }; await A.pdfOfDoc(pid, pd.docs[pd.docs.length - 1]); A.saveFile = sv; return { ok: wa && got > 1000, d: { wa, got } }; });

  /* mensajes de WhatsApp editables */
  await T('mensajes de WhatsApp: el recordatorio usa el texto editado', () => { const A = window.App, a = A.day(A.today()).filter(x => x.pid && x.type !== 'block')[0]; A.CFG.waTpl = { rem: 'Hola {nombre}, mañana {hora}.' }; const t = A.reminderText(a); delete A.CFG.waTpl; return { ok: /^Hola \S+, mañana \d\d:\d\d\.$/.test(t), d: t }; });

  /* alquileres */
  await T('alquileres: 3 módulos, aviso el último día, cobrar y pagar', () => {
    const A = window.App, id = 'pr2', c = A.liqCfg(id); c.mode = 'mod'; c.mod = { by: 'modulo', price: 300000, hs: 4 }; A.chg.dlSet({ getAttribute: k => ({ 'data-id': id, 'data-f': 'modN' })[k], value: '3' });
    const d = +A.today().slice(8, 10); A.PRO(id).rent = { from: 1, to: d, wa: '2984000111' }; A._tmOwner = true; const I = A.rentInfo(id), ym = A.today().slice(0, 7);
    const html = A.liqDealHTML(id).indexOf('Cobro del alquiler') >= 0; A.acts.rentDueOpen(); const popup = /Último día: hoy/.test(document.body.innerText) && !!document.querySelector('[data-act="rentCobOpen"]');
    document.querySelector('[data-act="rentCobOpen"]').click(); document.getElementById('rfA').value = '900000'; A.acts.rentCobSave(); const cob = (A.rentPay(id, ym) || {}).st === 'cobrado';
    delete A.cloudExtra('rp:pr2').get().pays[ym]; A._tmOwner = false; A._tmMember = { role: 'profesional', pro: 'pr2', name: 'Dr', active: true }; A.acts.rentDueOpen(); const pagar = !!document.querySelector('[data-act="rentPayOpen"]');
    document.querySelector('[data-act="rentPayOpen"]').click(); document.getElementById('rfA').value = '900000'; A.acts.rentPaySave(); const wa = A.S.modal.type === 'rentWa' && /900\.000/.test(document.getElementById('rwT').value);
    A._tmMember = null; A.S.modal = null; A.renderModal(); return { ok: I.fee === 900000 && html && popup && cob && pagar && wa, d: { fee: I.fee, html, popup, cob, pagar, wa } }; });

  /* Implantes, Endodoncia y Escaneos 3D */
  await pg.evaluate(() => { window.App.S.fichaTab = 'implantes'; window.App.refresh(); });
  await T('implantes: nuevo implante, control y etapa', () => { const A = window.App; A.acts.imNew(); ['tooth:36', 'brand:Straumann', 'lot:L1', 'diam:4,1', 'len:10', 'surgDate:2026-09-10'].forEach(x => { const [k, v] = x.split(':'); document.getElementById('ie_' + k).value = v; }); A.acts.imSave(); document.querySelector('[id^="icP_"]').value = '3'; A.acts.imCtlAdd({ getAttribute: () => A.pd(window.__pid).impl[0].id }); const x = A.pd(window.__pid).impl[0]; return { ok: x.tooth === '36' && x.ctls.length === 1 && /Oseointegración/.test(document.querySelector('.im-steps .on').textContent) }; });
  await pg.setInputFiles('[data-chg="imRxUp"]', { name: 'rx.dcm', mimeType: 'application/dicom', buffer: dcmBuf }); await pg.waitForTimeout(900);
  await T('radiografías: se lee un DICOM de radiovisiógrafo', () => { const i = window.App.pd(window.__pid).images.slice(-1)[0]; return { ok: !!i && i.impl && i.kind === 'rx-peri' && /^data:image\/jpeg/.test(i.thumb) }; });
  await pg.evaluate(() => { window.App.S.fichaTab = 'endo'; window.App.refresh(); });
  await T('endodoncia: tratamiento, conducto y sesión', () => { const A = window.App; A.acts.enNew(); document.getElementById('ee_tooth').value = '46'; A.acts.enSave(); const id = A.pd(window.__pid).endo[0].id; document.querySelector('[id^="ecN_"]').value = 'MV'; document.querySelector('[id^="ecW_"]').value = '19,5'; A.acts.enCanalAdd({ getAttribute: () => id }); document.querySelector('.en-chips [data-act="enChip"]:nth-child(5)').click(); A.acts.enSesAdd({ getAttribute: () => id }); const x = A.pd(window.__pid).endo[0]; return { ok: x.canals.length === 1 && x.sessions.length === 1 && !!x.obtDate }; });
  await pg.evaluate(() => { window.App.S.fichaTab = 'scan'; window.App.refresh(); });
  await pg.setInputFiles('#scF', { name: 'prueba.stl', mimeType: 'model/stl', buffer: stlBuf }); await pg.waitForTimeout(1800);
  await T('escaneos 3D: se sube un STL y se ve en el visor', async () => { const A = window.App, x = (A.pd(window.__pid).scans || [])[0]; if (!x) return { ok: false, d: 'no se guardó' }; A.acts.scOpen({ getAttribute: () => x.id }); await new Promise(r => setTimeout(r, 1500)); const cv = document.getElementById('scCv'); if (!cv || document.getElementById('scLoad')) return { ok: false, d: 'el visor no cargó' }; const gl = cv.getContext('webgl'), px = new Uint8Array(4); gl.readPixels(cv.width >> 1, cv.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return { ok: x.tris > 100 && px[0] + px[1] + px[2] > 150, d: { tris: x.tris, px: Array.from(px) } }; });

  /* iPhone, vínculos y datos del profesional */
  await T('iPhone: la guía de instalación tiene los 4 pasos', () => { const h = window.App.modalFns.iosInst(); return { ok: (h.match(/<li>/g) || []).length === 4 }; });
  await T('vincular usuario: aparece en «Dónde trabajás» y valida', () => { const A = window.App; A.cloud.session = { user: { id: 'u' }, access_token: 't' }; A.S.modal = null; A.acts.plOpen(); const hay = !!document.querySelector('[data-act="plLinkOpen"]'); A.acts.plLinkOpen(); A.acts.plLinkGo(); const v = /cuenta del consultorio/i.test(document.getElementById('lkMsg').textContent); A.cloud.session = null; A.S.modal = null; A.renderModal(); return { ok: hay && v }; });
  await T('datos del profesional: el equipo carga su matrícula sin tocar la lista del dueño', () => { const A = window.App; A._tmMember = { role: 'profesional', pro: 'pr2', name: 'Dr', active: true }; A.acts.myProOpen(); const hay = !!document.querySelector('.pe-mats') && !!document.getElementById('cr-sello'); document.getElementById('peMn0').value = 'MP 99'; document.getElementById('peMj0').value = 'Río Negro'; A.chg.matSet({ getAttribute: k => ({ 'data-id': 'pr2', 'data-i': '0', 'data-k': 'n' })[k], value: 'MP 99' }); const d = A.cloudExtra('pf:pr2').get(); const p = A.PROS.filter(x => x.id === 'pr2')[0]; const ok = hay && d && /MP 99/.test(d.mat) && JSON.stringify(p).indexOf('MP 99') < 0; A._tmMember = null; A.S.modal = null; A.renderModal(); return { ok, d: { hay, mat: d && d.mat } }; });
  await T('uso de la app: manda solo contadores (sin datos de pacientes)', async () => { const A = window.App, CL = A.cloud, pid = window.__pid, keep = CL.api, ses = CL.session; let sent = []; const dm = A.DEMO; A.DEMO = false; CL.readonly = false; CL.session = { user: { id: 'u' } }; CL.api = async (u, o) => { if (/ov_usage_add/.test(u)) sent.push(o.body); return null; }; localStorage.removeItem('odontovoz.usage');
    const a = await A.usageFlush(true); const n0 = sent.length; A.pd(pid).notes.push({ id: A.uid(), date: A.today(), text: 'Nombre Secreto Apellido', pro: A.PAT(pid).pro }); A.pd(pid).ledger.push({ id: A.uid(), date: A.today(), type: 'pago', amount: 100, desc: 'x', method: 'Efectivo' }); A.saveFile && 0; await A.usageFlush(true);
    const last = sent[sent.length - 1], txt = JSON.stringify(sent); CL.api = keep; CL.session = ses; A.DEMO = dm; localStorage.removeItem('odontovoz.usage');
    return { ok: a && n0 === 1 && last.p_counts.nota === 1 && last.p_counts.cobro === 1 && !/Secreto|Apellido/.test(txt) && /^\d{4}-\d{2}-\d{2}$/.test(last.p_day), d: txt.slice(0, 200) }; });
  await T('turnero: la cancelación del paciente pone el turno en «Canceló» y avisa', async () => { const A = window.App, CL = A.cloud, pid = window.__pid, keep = CL.api, ses = CL.session, cf = CL.conf, dm = A.DEMO, pub = A.tnPublish; const date = A.today(), a = { id: A.uid(), pid, pro: A.PAT(pid).pro, date, start: 700, dur: 30, what: 'Control', status: 'pendiente', online: true, code: 'OV-TEST' }; A.mutate([date], () => { A.day(date).push(a); });
    let asked = 0, pubd = 0; A.DEMO = false; CL.readonly = false; CL.session = { user: { id: 'u' } }; CL.conf = () => true; A.tnPublish = () => { pubd++; }; CL.api = async u => { if (/ov_booking_claim_cancels/.test(u)) { asked++; return [{ id: 'r1', code: 'OV-TEST', data: { first: 'Ana', last: 'Prueba', date, start: 700, pro: a.pro, cancel: { reason: 'no puedo' } } }]; } return null; };
    await A.tnClaimCancels(); const st = A.apptById(a.id).status; CL.api = keep; CL.session = ses; CL.conf = cf; A.DEMO = dm; A.tnPublish = pub; return { ok: asked === 1 && st === 'cancelado' && pubd === 1, d: asked + ' ' + st + ' ' + pubd }; });
  await T('presupuesto: «Enviar por WhatsApp» arma el PDF y ofrece compartirlo o abrir el chat', async () => { const A = window.App, pid = window.__pid, pd = A.pd(pid); pd.budgets = pd.budgets || []; const b = { id: 'bw1', num: 'P-T-1', date: A.today(), validUntil: A.add(A.today(), 10), status: 'enviado', items: [{ txId: 'x', label: 'Limpieza', price: 1000, qty: 1 }], total: 1000, disc: 0 }; pd.budgets.push(b);
    A.S.modal = { type: 'budgetView', pid, bid: b.id }; A.renderModal(); const btn = !!document.querySelector('[data-act="budgetWa"]'); if (!btn) return { ok: false, d: 'sin botón' };
    const sv = A.saveFile, so = window.open, wl = A.waOpen; let opened = null, saved = null; A.saveFile = (n, bl) => { saved = { n, size: bl.size }; return Promise.resolve(true); }; A.waOpen = u => { opened = u; };
    const ph = A.PAT(pid).phone; A.PAT(pid).phone = '2984000000'; await A.acts.budgetWa({ getAttribute: () => 'bw1' }); const modal = A.S.modal && A.S.modal.type === 'waPc'; const txt = document.body.innerText; await A.acts.waPcChat(); A.saveFile = sv; A.waOpen = wl; A.PAT(pid).phone = ph;
    const r = { btn, modal, txt: /Abrir el chat y adjuntar el PDF/.test(txt), pdf: !!saved && saved.size > 1000 && /^presupuesto/i.test(saved.n), wa: /wa\.me\/549?2984000000|wa\.me\/2984000000/.test(opened || ''), texto: /P-T-1/.test(decodeURIComponent(opened || '')) }; r.ok = Object.keys(r).every(k => r[k]); r.d = JSON.stringify(r) + ' ' + (saved && saved.n) + ' ' + opened; return r; });
  await T('turnero: prácticas editables (se pueden quitar, duración, precio y prácticas propias)', async () => { const A = window.App; A.S.modal = null; const o = A.CFG.online; delete o.motives; const L = A.tnMotives(); const mig = L.length === Object.keys(A.TYPES).length && L.every(m => m.dur > 0);
    A.acts.cfgOpen({ getAttribute: k => (k === 'data-t' ? 'online' : null) }); const sum = /Editar prácticas, tiempos y precios/.test(document.body.innerText); A.acts.tnMotOpen(); const ed = /Prácticas del turnero online/.test(document.body.innerText) && document.querySelectorAll('.tm-row').length === L.length;
    const ix = k => L.findIndex(m => m.k === k); const ch = (i, f, v) => { const el = { getAttribute: a => (a === 'data-i' ? String(i) : a === 'data-f' ? f : null), value: v, checked: v === true }; A.chg.tnMotF(el); };
    ch(ix('extraccion'), 'on', false); ch(ix('endodoncia'), 'dur', '60'); ch(ix('limpieza'), 'dur', '30'); ch(ix('limpieza'), 'price', '38.000'); A.acts.tnMotAdd(); const nl = A.tnMotives().length - 1; ch(nl, 'label', 'Control de ortodoncia con brackets'); ch(nl, 'dur', '20');
    A.chg.tnMotO({ getAttribute: () => 'otherHint', value: 'Las extracciones se evalúan en consulta.' }); const d = A.tnPubData(), T = {}; d.types.forEach(t => { T[t.k] = t; });
    const r = { mig, sum, ed, sinExt: !T.extraccion, endo60: T.endodoncia && T.endodoncia.dur === 60, limp: T.limpieza && T.limpieza.dur === 30 && T.limpieza.price === 38000, propia: d.types.some(t => t.label === 'Control de ortodoncia con brackets' && t.dur === 20), otro: !!T.otro && d.otherHint.indexOf('extracciones') >= 0 };
    const sl = (d.slots.endodoncia || {}), first = Object.keys(sl)[0]; r.slot60 = !first || sl[first].every(x => x[2] >= 60); r.ok = Object.keys(r).every(k => r[k]); r.d = JSON.stringify(r); A.S.modal = null; delete o.motives; return r; });
  await T('cada profesional ve solo su agenda (opción prendida)', () => { const A = window.App; A.CFG.agOwn = true; A._tmMember = { role: 'profesional', pro: 'pr2', name: 'Dr', active: true }; const uno = A.visPros().length === 1; A._tmMember = { role: 'recepcion', name: 'S', active: true }; const todas = A.visPros().length > 1; A._tmMember = null; A.CFG.agOwn = false; return { ok: uno && todas, d: { uno, todas } }; });
  await T('informe para un colega: PDF con endodoncia, implante, logo y sello', async () => { const A = window.App, pid = window.__pid; A.S.tab = 'ficha'; A.S.fichaPid = pid; A.S.fichaTab = 'endo'; A.refresh(); const btn = !!document.querySelector('[data-act="rpOpen"]');
    const pd = A.pd(pid), pro = A.PRO(A.PAT(pid).pro); A.CFG.logo = { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', w: 1, h: 1 }; pro.cred = Object.assign({}, pro.cred, { firma: A.CFG.logo.src, sello: A.CFG.logo.src });
    A.acts.rpOpen({ getAttribute: () => 'endo' }); const abre = A.S.modal && A.S.modal.type === 'rp'; const html = document.body.innerText; A.S.modal.to = 'Dra. Prueba'; A.S.modal.why = 'Derivado para conducto <b>36</b>'; A.S.modal.sel.impl = true;
    let got = null; const sv = A.saveFile; A.saveFile = (n, b) => { got = { n, size: b.size }; return Promise.resolve(true); }; await A.acts.rpGo(); A.saveFile = sv;
    const r = { btn, abre, titulo: /Informe para un colega/.test(html), pdf: !!got && got.size > 1500 && /^informe-/.test(got.n), cerro: !A.S.modal }; r.ok = Object.keys(r).every(k => r[k]); r.d = JSON.stringify(Object.assign({}, r, { tam: got && got.size })); return r; });
  await T('logo del consultorio: se puede subir desde Datos del centro', () => { const A = window.App; A.S.modal = null; A.acts.cfgOpen({ getAttribute: k => (k === 'data-t' ? 'centro' : null) }); const h = document.body.innerHTML; return /Logo del consultorio/.test(h) && /data-chg="cfgLogo"/.test(h); });
  const falta = await pg.evaluate(() => Object.keys(window.__falta)); ok(!falta.length, 'funciones: todos los botones que aparecieron tienen su acción', falta);
  ok(!errs.length, 'funciones: sin errores de JavaScript', errs.slice(0, 5));
  await b.close();
  console.log(fails ? '\n' + fails + ' FALLAS (de ' + (fails + oks) + ' pruebas)' : 'todo bien · ' + oks + ' pruebas');
  process.exit(fails ? 1 : 0);
})();
