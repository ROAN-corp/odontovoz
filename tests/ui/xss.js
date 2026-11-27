/* Prueba de seguridad (XSS): llena con un texto malicioso todos los datos que escribe una persona (nombres, notas, motivos, obras sociales…)
   y recorre las pantallas. Si algún texto se interpreta como código en vez de mostrarse como texto, la prueba falla y dice en qué pantalla.
   Uso:  node tests/ui/xss.js      Necesita: npm i --no-save playwright jspdf@2.5.1 */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const PANT = [
  ['inicio', "App.S.modal=null; App.goHome()"], ['agenda', "App.S.modal=null; App.S.tab='agenda'; App.refresh()"], ['pacientes', "App.S.modal=null; App.S.tab='pacientes'; App.refresh()"], ['caja', "App.S.modal=null; App.S.tab='caja'; App.refresh()"], ['liquidaciones', "App.S.modal=null; App.S.tab='liq'; App.refresh()"],
  ...['datos', 'odon', 'perio', 'plan', 'hecho', 'lab', 'rx', 'img', 'orto', 'implantes', 'endo', 'scan', 'docs', 'cuenta'].map(t => ['ficha-' + t, "App.S.modal=null; App.openFicha(App.PATS[1].id,'" + t + "')"]),
  ['panel-paciente', "App.S.modal=null; App.S.tab='agenda'; App.refresh(); App.S.panel={type:'pat',pid:App.PATS[1].id}; App.renderPanel()"], ['turno-nuevo', "App.S.modal=null; App.S.tab='agenda'; App.refresh(); App.acts.newAppt(document.createElement('button'))"],
  ['ajustes', "App.S.modal=null; App.acts.ajOpen()"], ['config-centro', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'centro':null})"], ['config-pros', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'pros':null})"],
  ['config-profesional', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'pros':null}); App.S.modal.sel=App.PROS[0].id; App.renderModal()"], ['stock', "App.S.modal=null; App.acts.stkOpen()"], ['obras-sociales', "App.S.modal=null; App.acts.osOpen()"],
  ['catalogo', "App.S.modal=null; App.acts.catalogOpen()"], ['menu', "App.S.modal=null; App.renderModal(); App.acts.gear()"], ['consentimientos', "App.S.modal=null; App.S.fichaPid=App.PATS[1].id; App.acts.consentPick()"], ['mensajes-wa', "App.S.modal=null; App.acts.waTplOpen()"],
  ['dondetrabajas', "App.S.modal=null; App.acts.plOpen()"], ['notificaciones', "App.S.modal=null; App.acts.nfToggle && App.acts.nfToggle()"]
];
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(CHROME ? { executablePath: CHROME } : {}) }), pg = await b.newPage({ viewport: { width: 1366, height: 860 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message.split('\n')[0])); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForTimeout(1800);
  await pg.addScriptTag({ path: path.join(ROOT, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js') }).catch(() => {});
  const tocados = await pg.evaluate(() => {
    document.querySelectorAll('#intro,.intro').forEach(x => x.remove()); const A = window.App; A.S.modal = null; A.CFG.demo = false; window.__xss = 0;
    const P = 'x"\'><img src=x onerror=window.__xss=(window.__xss||0)+1>', NO = /^(id|pid|pro|pros|k|kind|type|status|cond|date|doneDate|planDate|tpl|color|mode|role|tab|view|icon|fmt|st|method|ym|from|to|at|ts|time|start|dur|hash|h|key|uid|owner|member|code|ph|sede|view|tone|ck|cat|by|rem|etapa|impl|endo|ctrl|loc|s|u|f)$/;
    let n = 0, vis = new Set();
    const walk = (o, d) => { if (!o || typeof o !== 'object' || vis.has(o) || d > 7) return; vis.add(o); if (Array.isArray(o)) { o.forEach(x => walk(x, d + 1)); return; }
      Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string' && !NO.test(k) && v.length > 1 && v.length < 200 && !/^[\d:\/.,\-+ $%]+$/.test(v) && !/^[a-z0-9_-]{8,}$/i.test(v)) { o[k] = P; n++; } else if (v && typeof v === 'object') walk(v, d + 1); }); };
    [A.PATS, A.PROS, A.S.pd, A.CFG, A.S.days, A.EMP, A.S.setup].forEach(x => walk(x, 0)); A.CLINIC = P; return n;
  });
  const fallas = []; let total = 0;
  for (const [nombre, js] of PANT) {
    try { await pg.evaluate("window.__xss=0"); await pg.evaluate(js); await pg.waitForTimeout(250); total++; const x = await pg.evaluate("window.__xss"); if (x > 0) fallas.push(nombre); } catch (e) { errs.push(nombre + ': ' + String(e.message).split('\n')[0]); }
  }
  await b.close();
  console.log('XSS: se cambiaron ' + tocados + ' textos por uno malicioso y se recorrieron ' + total + ' pantallas.');
  if (fallas.length) { console.log('FALLA: el texto malicioso se ejecutó en: ' + fallas.join(', ')); } else console.log('todo bien: ningún texto se ejecutó como código.');
  if (errs.length) console.log('(errores de JavaScript durante la prueba: ' + errs.length + ')', errs.slice(0, 5));
  process.exit(fallas.length ? 1 : 0);
})();
