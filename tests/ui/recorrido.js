/* Recorrido de OdontoVoz: aprieta TODOS los botones de cada pantalla (y de las ventanas que se abren) y avisa si alguno tira un error de JavaScript.
   Usa los datos de ejemplo (modo prueba), sin internet. Es más lento que humo.js (unos minutos): se corre antes de un lanzamiento.
   Uso:  node tests/ui/recorrido.js [celular|pc]      Necesita: npm i --no-save playwright jspdf@2.5.1 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), MODO = process.argv[2] === 'pc' ? 'pc' : 'celular', VP = MODO === 'pc' ? { width: 1366, height: 860 } : { width: 390, height: 844 };
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
/* acciones que sacan de la app o borran todo: se prueban aparte, no acá */
const SALTAR = /^(logout|cloudLogout|acctOutKeep|acctOutWipe|acctOutAsk|testWipe|testWipeGo|wipe|resetAll|changeAccount|loginDemo|delAccount|acctDelete|deleteAccount|eraseAll|importGo|mudGo|signOut|reload)$|testWipe|wipeAll|resetAll|logOut|signOut/i;
const PANTALLAS = [
  ['inicio', "App.S.modal=null; App.S.panel=null; App.goHome()"], ['agenda', "App.S.modal=null; App.S.tab='agenda'; App.refresh()"], ['pacientes', "App.S.modal=null; App.S.tab='pacientes'; App.refresh()"],
  ['caja', "App.S.modal=null; App.S.tab='caja'; App.refresh()"], ['liquidaciones', "App.S.modal=null; App.S.tab='liq'; App.refresh()"], ['empresa', "App.S.modal=null; App.S.tab='empresa'; App.refresh()"],
  ...['datos', 'odon', 'perio', 'plan', 'hecho', 'lab', 'rx', 'img', 'orto', 'implantes', 'endo', 'scan', 'docs', 'cuenta'].map(t => ['ficha-' + t, "App.S.modal=null; App.openFicha(App.PATS[1].id,'" + t + "')"]),
  ['turno-nuevo', "App.S.modal=null; App.S.tab='agenda'; App.refresh(); App.acts.newAppt(document.createElement('button'))"], ['ajustes', "App.S.modal=null; App.acts.ajOpen()"],
  ['config-centro', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'centro':null})"], ['config-pros', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'pros':null})"], ['config-agenda', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'agenda':null})"],
  ['config-turnero', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'online':null})"], ['config-datos', "App.S.modal=null; App.acts.cfgOpen({getAttribute:k=>k==='data-t'?'datos':null})"],
  ['stock', "App.S.modal=null; App.acts.stkOpen()"], ['recargos', "App.S.modal=null; App.acts.payRatesOpen()"], ['obras-sociales', "App.S.modal=null; App.acts.osOpen()"], ['catalogo', "App.S.modal=null; App.acts.catalogOpen()"],
  ['menu', "App.S.modal=null; App.renderModal(); App.acts.gear()"], ['avisos', "App.S.modal=null; App.acts.notifOpen()"], ['whatsapp', "App.S.modal=null; App.acts.waCfg()"], ['mensajes-wa', "App.S.modal=null; App.acts.waTplOpen()"],
  ['novedades', "App.S.modal=null; App.acts.newsOpen && App.acts.newsOpen()"], ['ayuda', "App.S.modal=null; App.acts.supportOpen()"], ['apariencia', "App.S.modal=null; App.acts.appearOpen()"], ['asistente-voz', "App.S.modal=null; App.acts.assistOpen()"],
  ['dondetrabajas', "App.S.modal=null; App.acts.plOpen()"], ['consentimientos', "App.S.modal=null; App.S.fichaPid=App.PATS[1].id; App.acts.consentPick()"], ['mudanza', "App.S.modal=null; App.acts.importOpen && App.acts.importOpen()"], ['hc-papel', "App.S.modal=null; App.acts.hcpOpen && App.acts.hcpOpen()"],
  ['ios', "App.S.modal=null; App.acts.pwaInstall()"], ['turnero-vista', "App.S.modal=null; App.acts.tnOpen && App.acts.tnOpen()"]
];
(async () => {
  const lanzar = () => chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'], ...(CHROME ? { executablePath: CHROME } : {}) });
  let b = await lanzar(), pg, errs;
  const abrir = async () => {
    if (pg) await pg.close().catch(() => {});
    if (!b.isConnected()) { console.error('(el navegador se cerró: se vuelve a abrir)'); b = await lanzar(); }
    pg = await b.newPage({ viewport: VP }); errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept().catch(() => {}));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::|proxy|403|favicon|jspdf|cdnjs|supabase/i.test(m.text())) errs.push('consola: ' + m.text()); });
    await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForTimeout(1800);
    await pg.addScriptTag({ path: path.join(ROOT, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js') }).catch(() => {});
    await pg.evaluate(() => { document.querySelectorAll('#intro,.intro').forEach(x => x.remove()); App.S.modal = null; App.CFG.demo = false; App.renderModal(); window.open = () => null; });
  };
  await abrir();
  const problemas = {}; let clicks = 0, pantallas = 0;
  const anotar = (donde, act, e) => { const k = act + ' | ' + e; console.error('PROBLEMA: ' + k + '   ← ' + donde); if (!problemas[k]) problemas[k] = []; problemas[k].push(donde); };
  const botones = () => pg.evaluate(() => Array.from(document.querySelectorAll('[data-act]')).filter(e => e.offsetParent !== null || e.getClientRects().length).map((e, i) => ({ i, act: e.getAttribute('data-act'), txt: (e.textContent || '').trim().slice(0, 30) })));
  const DESDE = process.env.DESDE ? PANTALLAS.findIndex(x => x[0] === process.env.DESDE) : 0, HASTA = process.env.HASTA ? PANTALLAS.findIndex(x => x[0] === process.env.HASTA) : PANTALLAS.length - 1;
  for (const [nombre, js] of PANTALLAS.slice(Math.max(0, DESDE), HASTA + 1)) {
    try { await pg.evaluate(js); await pg.waitForTimeout(200); } catch (e) { anotar(nombre, '(abrir la pantalla)', String(e.message).split('\n')[0]); try { await abrir(); } catch (e2) { console.error('no se pudo reabrir', e2.message.split('\n')[0]); } continue; }
    pantallas++; if (process.env.VERBOSE) console.error('» ' + nombre); const lista = await botones(), vistos = new Set();
    for (const bt of lista) {
      if (SALTAR.test(bt.act)) continue; const clave = bt.act + '|' + bt.txt; if (vistos.has(clave)) continue; vistos.add(clave);
      errs.length = 0;
      try {
        await pg.evaluate(js); await pg.waitForTimeout(80);
        const hit = await pg.evaluate(([act, txt]) => { const el = Array.from(document.querySelectorAll('[data-act="' + act + '"]')).filter(e => (e.textContent || '').trim().slice(0, 30) === txt)[0]; if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, [bt.act, bt.txt]);
        if (!hit) continue; clicks++; await pg.waitForTimeout(140);
        if (errs.length) anotar(nombre, bt.act, errs[0].split('\n')[0]);
        /* segundo nivel: lo que se abrió */
        const hijos = await botones(), vis2 = new Set();
        for (const h2 of hijos.slice(0, 40)) {
          if (SALTAR.test(h2.act) || h2.act === bt.act) continue; const c2 = h2.act + '|' + h2.txt; if (vis2.has(c2)) continue; vis2.add(c2); errs.length = 0;
          await pg.evaluate(js); await pg.waitForTimeout(60);
          await pg.evaluate(([a1, t1, a2, t2]) => { const f = (a, t) => Array.from(document.querySelectorAll('[data-act="' + a + '"]')).filter(e => (e.textContent || '').trim().slice(0, 30) === t)[0]; const e1 = f(a1, t1); if (e1) e1.dispatchEvent(new MouseEvent('click', { bubbles: true })); const e2 = f(a2, t2); if (e2) e2.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, [bt.act, bt.txt, h2.act, h2.txt]);
          clicks++; await pg.waitForTimeout(100);
          if (errs.length) anotar(nombre + ' › ' + bt.act, h2.act, errs[0].split('\n')[0]);
        }
      } catch (e) { anotar(nombre, bt.act, 'recorrido: ' + String(e.message).split('\n')[0]); }
      if (!pg.isClosed() && clicks % 60 === 0) { /* cada tanto se reinicia para no arrastrar estado */ await abrir(); await pg.evaluate(js).catch(() => {}); }
    }
  }
  await b.close();
  const ks = Object.keys(problemas);
  console.log(MODO + ': ' + pantallas + ' pantallas, ' + clicks + ' botones apretados, ' + ks.length + ' problemas distintos');
  ks.forEach(k => console.log('  - ' + k + '   ← ' + Array.from(new Set(problemas[k])).slice(0, 3).join(' · ')));
  process.exit(ks.length ? 1 : 0);
})();
