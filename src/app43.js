/* ===== 1.33: stock de insumos en todos los modos: catálogo cargado, usos por unidad, descuento automático por práctica, compras, vencimientos, conteo y traspasos ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  if (!A.EMP) return;
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const sedes = () => (A.locs ? A.locs() : []);
  const sedeName = id => { const l = sedes().filter(x => x.id === id)[0]; return l ? l.name : ''; };
  const curSede = () => (isEmp() && A.empSede ? A.empSede() : null);
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const role = () => { const m = mb(); return m ? m.role : 'dueno'; };
  const canAll = () => (A.empPermAll ? A.empPermAll() : true) && (!mb() || role() === 'admin');
  const canCfg = () => !mb() || role() === 'admin';
  const who = () => { const m = mb(); if (m && m.name) return m.name; const p = A.empCurPerson && A.empCurPerson(); return (p && p.name) || ''; };
  const today = () => A.today();
  const nowIso = () => new Date().toISOString();
  const fq = q => { const r = Math.round(q * 10) / 10; return String(r).replace('.', ','); };
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const dec = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };

  /* ---------- catálogo sugerido: [clave, nombre, categoría, unidad, usos que rinde cada unidad, mínimo] ---------- */
  const CAT = [
    ['guantes', 'Guantes de nitrilo (caja x100)', 'Descartables', 'cajas', 50, 2],
    ['barbijos', 'Barbijos (caja x50)', 'Descartables', 'cajas', 50, 1],
    ['baberos', 'Baberos (paquete x100)', 'Descartables', 'paquetes', 100, 1],
    ['eyectores', 'Eyectores de saliva (bolsa x100)', 'Descartables', 'bolsas', 100, 1],
    ['vasos', 'Vasos descartables (x100)', 'Descartables', 'paquetes', 100, 1],
    ['gasas', 'Gasas (paquete x100)', 'Descartables', 'paquetes', 25, 2],
    ['algodon', 'Rollos de algodón (bolsa)', 'Descartables', 'bolsas', 120, 1],
    ['cofias', 'Cofias / gorros (x100)', 'Descartables', 'paquetes', 100, 1],
    ['papel', 'Papel para camilla (rollo)', 'Descartables', 'rollos', 60, 1],
    ['anestesia', 'Anestesia (caja x50 cartuchos)', 'Anestesia', 'cajas', 50, 1],
    ['agujas', 'Agujas dentales (caja x100)', 'Anestesia', 'cajas', 100, 1],
    ['topica', 'Anestesia tópica (pote)', 'Anestesia', 'potes', 80, 1],
    ['composite', 'Composite (jeringa)', 'Restauración', 'jeringas', 12, 3],
    ['grabador', 'Ácido grabador (jeringa)', 'Restauración', 'jeringas', 30, 1],
    ['adhesivo', 'Adhesivo (frasco)', 'Restauración', 'frascos', 80, 1],
    ['microbrush', 'Microbrush (x100)', 'Restauración', 'paquetes', 100, 1],
    ['matrices', 'Matrices / tiras (x50)', 'Restauración', 'paquetes', 50, 1],
    ['cunas', 'Cuñas (x100)', 'Restauración', 'paquetes', 100, 1],
    ['pulido', 'Discos y gomas de pulido (kit)', 'Restauración', 'kits', 40, 1],
    ['ionomero', 'Ionómero vítreo (kit)', 'Restauración', 'kits', 40, 1],
    ['hidroxido', 'Hidróxido de calcio (kit)', 'Restauración', 'kits', 50, 1],
    ['amalgama', 'Amalgama (cápsulas x50)', 'Restauración', 'cajas', 50, 0],
    ['fresas', 'Fresas de diamante (unidad)', 'Restauración', 'unidades', 10, 5],
    ['limas', 'Limas de endodoncia (caja x6)', 'Endodoncia', 'cajas', 3, 2],
    ['gutapercha', 'Conos de gutapercha (caja)', 'Endodoncia', 'cajas', 12, 1],
    ['papelendo', 'Conos de papel (caja)', 'Endodoncia', 'cajas', 20, 1],
    ['hipoclorito', 'Hipoclorito de sodio (1 litro)', 'Endodoncia', 'litros', 20, 1],
    ['sellador', 'Cemento sellador de conductos', 'Endodoncia', 'tubos', 30, 1],
    ['clorhex', 'Clorhexidina (frasco)', 'Endodoncia', 'frascos', 40, 1],
    ['suturas', 'Suturas (sobre)', 'Cirugía', 'sobres', 1, 10],
    ['bisturi', 'Hojas de bisturí (caja x100)', 'Cirugía', 'cajas', 100, 1],
    ['hemostatico', 'Esponja hemostática (unidad)', 'Cirugía', 'unidades', 1, 5],
    ['profilaxis', 'Pasta profiláctica (pote)', 'Prevención', 'potes', 100, 1],
    ['cepillos', 'Cepillos de profilaxis (x100)', 'Prevención', 'paquetes', 100, 1],
    ['fluor', 'Flúor en gel (frasco)', 'Prevención', 'frascos', 80, 1],
    ['selladores', 'Sellador de fosas y fisuras (jeringa)', 'Prevención', 'jeringas', 40, 1],
    ['blanqueador', 'Blanqueamiento (kit)', 'Prevención', 'kits', 1, 1],
    ['alginato', 'Alginato (bolsa 450 g)', 'Impresiones', 'bolsas', 20, 1],
    ['silicona', 'Silicona por adición (kit)', 'Impresiones', 'kits', 10, 1],
    ['cubetas', 'Cubetas descartables (x50)', 'Impresiones', 'paquetes', 50, 1],
    ['cementocor', 'Cemento para coronas (kit)', 'Prótesis', 'kits', 25, 1],
    ['provisorio', 'Acrílico para provisorios (kit)', 'Prótesis', 'kits', 30, 1],
    ['peliculas', 'Películas radiográficas (caja x150)', 'Radiología', 'cajas', 150, 1],
    ['ligaduras', 'Ligaduras elásticas (bolsa)', 'Ortodoncia', 'bolsas', 50, 1],
    ['bolsasest', 'Bolsas de esterilización (caja x200)', 'Esterilización', 'cajas', 200, 1],
    ['desinf', 'Desinfectante de superficies (litro)', 'Esterilización', 'litros', 100, 2],
    ['indicadores', 'Indicadores de esterilización (x250)', 'Esterilización', 'paquetes', 250, 1],
    ['enzimatico', 'Detergente enzimático (litro)', 'Esterilización', 'litros', 200, 1]
  ];
  const CATI = {}; CAT.forEach(c => { CATI[c[0]] = c; });
  const CATS = []; CAT.forEach(c => { if (CATS.indexOf(c[2]) < 0) CATS.push(c[2]); });

  /* ---------- qué se usa en cada práctica (en «usos»); se puede cambiar en «Recetas» ---------- */
  const BASE = [['guantes', 1], ['barbijos', 1], ['baberos', 1], ['eyectores', 1], ['vasos', 1], ['bolsasest', 1], ['desinf', 1], ['papel', 1]];
  const REC0 = {
    restauracion: [['anestesia', 1], ['agujas', 1], ['composite', 1], ['grabador', 1], ['adhesivo', 1], ['microbrush', 1], ['matrices', 1], ['cunas', 1], ['pulido', 1], ['algodon', 2], ['gasas', 1]],
    amalgama: [['anestesia', 1], ['agujas', 1], ['amalgama', 1], ['matrices', 1], ['cunas', 1], ['algodon', 2]],
    ionomero: [['ionomero', 1], ['algodon', 2]],
    endodoncia: [['anestesia', 1], ['agujas', 1], ['limas', 1], ['gutapercha', 1], ['papelendo', 1], ['hipoclorito', 1], ['sellador', 1], ['clorhex', 1], ['algodon', 2], ['gasas', 1]],
    extraccion: [['anestesia', 2], ['agujas', 1], ['topica', 1], ['gasas', 2], ['suturas', 1], ['bisturi', 1]],
    corona: [['silicona', 1], ['cubetas', 2], ['provisorio', 1], ['cementocor', 1], ['anestesia', 1], ['agujas', 1]],
    perno: [['cementocor', 1], ['anestesia', 1], ['agujas', 1]],
    implante: [['anestesia', 3], ['agujas', 1], ['suturas', 1], ['bisturi', 1], ['gasas', 3], ['clorhex', 1]],
    sellador: [['selladores', 1], ['grabador', 1], ['microbrush', 1], ['cepillos', 1]],
    limpieza: [['profilaxis', 1], ['cepillos', 1], ['fluor', 0]],
    fluor: [['fluor', 1], ['cubetas', 0]],
    raspaje: [['anestesia', 1], ['agujas', 1], ['gasas', 1], ['clorhex', 1]],
    rx: [['peliculas', 1]],
    blanqueamiento: [['blanqueador', 1]],
    impresion: [['alginato', 1], ['cubetas', 2]],
    ortodoncia: [['ligaduras', 1]]
  };
  const RNAME = { atencion: 'Toda atención (guantes, barbijo, babero…)', restauracion: 'Restauración (composite, obturación)', amalgama: 'Amalgama', ionomero: 'Ionómero', endodoncia: 'Endodoncia', extraccion: 'Extracción', corona: 'Corona', perno: 'Perno', implante: 'Implante', sellador: 'Sellador de fosas', limpieza: 'Limpieza / profilaxis', fluor: 'Flúor', raspaje: 'Raspaje', rx: 'Radiografía', blanqueamiento: 'Blanqueamiento', impresion: 'Impresión / modelos', ortodoncia: 'Control de ortodoncia' };
  /* práctica → receta */
  const recKey = it => {
    const c = it.a ? it.a.cond : null, l = (A.norm ? A.norm(it.label) : String(it.label).toLowerCase());
    if (c === 'composite' || c === 'obturacion') return 'restauracion';
    if (c === 'amalgama' || c === 'ionomero' || c === 'endodoncia' || c === 'corona' || c === 'perno' || c === 'implante' || c === 'sellador') return c;
    if (c === 'extraido' || c === 'extraccion') return 'extraccion';
    if (/limpieza|profilaxis/.test(l)) return 'limpieza'; if (/fluor/.test(l)) return 'fluor'; if (/raspaje/.test(l)) return 'raspaje';
    if (/radiograf|panoram/.test(l)) return 'rx'; if (/blanque/.test(l)) return 'blanqueamiento'; if (/ortodoncia/.test(l)) return 'ortodoncia';
    if (/composite|amalgama|ionomero|restaura|obtura/.test(l)) return 'restauracion'; if (/endodon/.test(l)) return 'endodoncia'; if (/extracc|cordal/.test(l)) return 'extraccion';
    if (/corona|carilla/.test(l)) return 'corona'; if (/implante/.test(l)) return 'implante'; if (/impresi|protesis/.test(l)) return 'impresion';
    return null;
  };

  /* ---------- datos: A.EMP.stock = { <centro o 'main'>: [insumos], _cfg: { rec, done, nf } } (se sincroniza con la clave «stock») ---------- */
  const ST = () => A.EMP.stock || (A.EMP.stock = {});
  const cfg = () => { const s = ST(); const c = s._cfg || (s._cfg = {}); c.rec = c.rec || {}; c.done = c.done || {}; return c; };
  const recOf = k => (cfg().rec[k] || (k === 'atencion' ? BASE : REC0[k]) || []);
  const place = () => (isEmp() ? (S.stkSede && sedeName(S.stkSede) ? S.stkSede : (curSede() || (sedes()[0] || {}).id || 'main')) : 'main');
  const list = sd => { const s = ST(); return Array.isArray(s[sd]) ? s[sd] : (s[sd] = []); };
  const save = () => { if (A.saveNow) A.saveNow(); A.save(); };
  const norm1 = i => { if (!i.uses || i.uses < 1) i.uses = 1; if (i.qty == null) i.qty = 0; if (!i.cat) i.cat = (CATI[i.ck] || [])[2] || 'Otros'; if (!Array.isArray(i.mv)) i.mv = []; return i; };
  const byCk = (sd, ck) => list(sd).filter(i => i.ck === ck)[0] || null;
  const mvAdd = (i, d, why, note) => { i.mv.unshift({ at: nowIso(), d: Math.round(d * 1000) / 1000, why, note: note || '', by: who() }); if (i.mv.length > 80) i.mv.length = 80; i.at = nowIso(); };
  /* consumo de los últimos 30 días (en unidades) y días que alcanza */
  const use30 = i => { const lim = Date.now() - 30 * 864e5; return -i.mv.filter(m => m.why === 'uso' && Date.parse(m.at) >= lim).reduce((s, m) => s + Math.min(0, m.d), 0); };
  /* solo con al menos una semana de datos, para no adivinar */
  const daysLeft = i => {
    if (!(i.qty > 0)) return null; const u = use30(i); if (!(u > 0)) return null;
    const first = i.mv.length ? Date.parse(i.mv[i.mv.length - 1].at) : Date.now(), span = Math.min(30, (Date.now() - first) / 864e5);
    if (span < 7) return null; return Math.floor(i.qty / (u / span));
  };
  const expSoon = i => i.exp && i.qty > 0 && A.dayDiff(today(), i.exp) <= 45;
  const status = i => (i.qty <= 0 ? 'out' : (i.min > 0 && i.qty <= i.min) || (daysLeft(i) != null && daysLeft(i) <= 10) ? 'low' : 'ok');
  A.stockList = sd => list(sd || place()).map(norm1);

  /* ---------- descuento automático al cargar prácticas («Prácticas de hoy») ---------- */
  A.stockConsume = (items, pid, sdIn) => {
    const sd = sdIn || (isEmp() ? (curSede() || (sedes()[0] || {}).id) : 'main'); if (!sd) return 0;
    const c = cfg(), L = list(sd); if (!L.length) return 0;
    const need = {};
    const add = (rec, mult) => rec.forEach(r => { if (r[1] > 0) need[r[0]] = (need[r[0]] || 0) + r[1] * mult; });
    const key = pid + '|' + today();
    if (!c.done[key]) { add(recOf('atencion'), 1); c.done[key] = 1; const ks = Object.keys(c.done); if (ks.length > 500) ks.slice(0, ks.length - 400).forEach(k => delete c.done[k]); }
    items.forEach(it => { const k = recKey(it); if (!k) return; const m = /×\s*(\d+)/.exec(it.label || ''); add(recOf(k), m ? +m[1] : 1); });
    let n = 0; const pn = (A.PAT(pid) || {}).name || '';
    Object.keys(need).forEach(ck => { const i = byCk(sd, ck); if (!i) return; norm1(i); const d = need[ck] / i.uses; i.qty = Math.max(0, Math.round((i.qty - d) * 1000) / 1000); mvAdd(i, -d, 'uso', pn); n++; });
    if (n) { save(); checkAlerts(sd); }
    return n;
  };
  const poPrev = A.acts.poGo;
  if (poPrev) A.acts.poGo = function (el) {
    const m = S.modal, k = el && el.getAttribute ? el.getAttribute('data-k') : null;
    const snap = m && m.type === 'pracOk' && k !== 'nota' ? { pid: m.pid, items: m.items.filter(i => i.on).map(i => ({ a: i.a, label: i.label })) } : null;
    const r = poPrev.apply(this, arguments);
    if (snap && snap.items.length && (!S.modal || S.modal.type !== 'pracOk')) A.stockConsume(snap.items, snap.pid);
    return r;
  };

  /* ---------- avisos: poco stock y vencimientos (una vez por día por insumo) ---------- */
  function checkAlerts(sd) {
    if (!A.nfAdd) return; const d = today(), where = isEmp() ? ' · ' + sedeName(sd) : '';
    /* solo insumos que ya se contaron o se compraron alguna vez (recién cargados en cero no avisan) */
    const L = list(sd).map(norm1).filter(i => i.mv.some(m => m.why !== 'uso'));
    const low = L.filter(i => status(i) !== 'ok'), exp = L.filter(expSoon);
    if (low.length) A.nfAdd({ id: 'stk:' + sd + ':' + d, k: 'stock', t: low.length === 1 ? 'Queda poco: ' + low[0].name : low.length + ' insumos con poco o nada' + where, b: low.slice(0, 4).map(i => i.name.split(' (')[0] + ' (' + fq(i.qty) + ')').join(', ') + (low.length > 4 ? '…' : ''), act: 'stkOpen', args: { 'data-t': 'comprar' } });
    if (exp.length) A.nfAdd({ id: 'stkv:' + sd + ':' + d, k: 'stock', t: exp.length === 1 ? 'Vence pronto: ' + exp[0].name : exp.length + ' insumos vencen pronto' + where, b: exp.slice(0, 4).map(i => i.name.split(' (')[0] + ' ' + A.fmtDMY(i.exp).slice(0, 5)).join(', '), act: 'stkOpen', args: { 'data-t': 'lista' } });
  }
  let alertDay = '';
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => { if (arPrev) arPrev(); const d = today(); if (alertDay !== d) { alertDay = d; try { checkAlerts(place()); } catch (e) { /* nada */ } } };

  /* =====================================================================
     PANTALLA DE STOCK (ventana grande; en Empresa también dentro de Empresa › Stock)
     ===================================================================== */
  A.acts.stkOpen = el => { if (A.hideDrawer) A.hideDrawer(); S.stk = Object.assign({ tab: 'lista', q: '', cat: '', low: false }, S.stk || {}); const t = el && el.getAttribute && el.getAttribute('data-t'); if (t) S.stk.tab = t; S.modal = { type: 'stk' }; A.renderModal(); };
  const TABS = [['lista', 'Insumos'], ['comprar', 'Para comprar'], ['mov', 'Movimientos'], ['rec', 'Qué usa cada práctica']];
  A.stkHTML = () => {
    const st = S.stk || (S.stk = { tab: 'lista', q: '', cat: '', low: false }), sd = place(), L = list(sd).map(norm1);
    let h = '';
    if (isEmp() && canAll() && sedes().length > 1) h += '<div class="stk-sede"><label for="stkSd">Centro</label><select id="stkSd" data-chg="stkSede">' + sedes().map(l => '<option value="' + esc(l.id) + '"' + (l.id === sd ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div>';
    else if (isEmp()) h += '<p class="stk-where">Stock de <b>' + esc(sedeName(sd)) + '</b></p>';
    h += '<div class="seg stk-tabs" role="tablist">' + TABS.filter(t => t[0] !== 'rec' || canCfg()).map(t => '<button type="button" role="tab" data-act="stkTab" data-t="' + t[0] + '" aria-pressed="' + (st.tab === t[0]) + '">' + t[1] + (t[0] === 'comprar' ? (n => n ? ' <span class="stk-n">' + n + '</span>' : '')(L.filter(i => status(i) !== 'ok').length) : '') + '</button>').join('') + '</div>';
    if (!L.length) {
      return h + '<div class="stk-empty"><p><b>Todavía no cargaste insumos' + (isEmp() ? ' en ' + esc(sedeName(sd)) : '') + '.</b></p><p>Podés empezar con el catálogo sugerido: ' + CAT.length + ' insumos odontológicos comunes, con cuántos usos rinde cada uno. Después contás lo que tenés y listo. Todo se puede cambiar o borrar.</p><div class="row-btns"><button class="btn primary" data-act="stkSeed">Cargar el catálogo sugerido</button><button class="btn" data-act="stkNew">Cargar un insumo a mano</button></div></div>';
    }
    if (st.tab === 'comprar') return h + buyHTML(sd, L);
    if (st.tab === 'mov') return h + movHTML(L);
    if (st.tab === 'rec' && canCfg()) return h + recHTML(sd, L);
    /* lista */
    const q = A.norm ? A.norm(st.q || '') : (st.q || '').toLowerCase();
    const vis = L.filter(i => (!st.cat || i.cat === st.cat) && (!st.low || status(i) !== 'ok' || expSoon(i)) && (!q || (A.norm ? A.norm(i.name) : i.name.toLowerCase()).indexOf(q) >= 0));
    const cats = []; L.forEach(i => { if (cats.indexOf(i.cat) < 0) cats.push(i.cat); });
    const nLow = L.filter(i => status(i) !== 'ok').length, nExp = L.filter(expSoon).length;
    h += '<div class="stk-sum"><span class="ok">' + L.filter(i => status(i) === 'ok').length + ' bien</span><span class="low">' + nLow + ' poco o nada</span>' + (nExp ? '<span class="exp">' + nExp + ' vence' + (nExp === 1 ? '' : 'n') + ' pronto</span>' : '') + '</div>';
    h += '<div class="stk-bar"><input type="search" placeholder="Buscar insumo…" value="' + esc(st.q || '') + '" data-in="stkQ" aria-label="Buscar insumo"><select data-chg="stkCat" aria-label="Categoría"><option value="">Todas</option>' + cats.map(c => '<option' + (c === st.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select><label class="chk"><input type="checkbox" data-chg="stkLow"' + (st.low ? ' checked' : '') + '> <span>Solo lo que falta</span></label></div>';
    h += '<div class="row-btns stk-acts"><button class="btn small primary" data-act="stkIn">+ Llegó mercadería</button><button class="btn small" data-act="stkCount">Contar el stock</button><button class="btn small" data-act="stkUseM">Usé algo</button>' + (isEmp() && sedes().length > 1 ? '<button class="btn small" data-act="stkMove">Pasar a otro centro</button>' : '') + '<button class="btn small ghost" data-act="stkNew">+ Insumo nuevo</button></div>';
    h += '<ul class="stk-list" id="stkList">' + listRows(vis) + '</ul>';
    return h;
  };
  function listRows(vis) {
    if (!vis.length) return '<li class="stk-none">No hay insumos con ese filtro.</li>';
    return vis.map(i => {
      const s = status(i), dl = daysLeft(i), pct = i.min > 0 ? Math.min(100, Math.round(i.qty / (i.min * 3) * 100)) : (i.qty > 0 ? 70 : 0);
      return '<li class="stk-it ' + s + '"><button class="stk-row" data-act="stkItem" data-id="' + i.id + '"><span class="stk-l"><b>' + esc(i.name) + '</b><small>' + esc(i.cat) + (i.uses > 1 ? ' · rinde ' + i.uses + ' usos c/u' : '') + (i.min > 0 ? ' · mínimo ' + fq(i.min) : '') + '</small>' +
        '<span class="stk-meter"><i style="width:' + pct + '%"></i></span></span><span class="stk-r"><b>' + fq(i.qty) + '</b><small>' + esc(i.unit || '') + '</small>' + (dl != null ? '<small class="stk-dl">~' + dl + ' días</small>' : '') + (expSoon(i) ? '<small class="stk-ex">vence ' + A.fmtDMY(i.exp).slice(0, 5) + '</small>' : '') + '</span></button></li>';
    }).join('');
  }
  /* lista de compras: lo que está bajo el mínimo o no llega a 30 días */
  function buyList(L) {
    return L.map(i => {
      const u = use30(i), want = Math.max(i.min * 2, u > 0 ? Math.ceil(u * 1.1) : 0, i.min > 0 ? i.min + 1 : 0);
      const need = Math.ceil(Math.max(0, want - i.qty));
      return { i, need, why: i.qty <= 0 ? 'sin stock' : i.min > 0 && i.qty <= i.min ? 'bajo el mínimo' : daysLeft(i) != null && daysLeft(i) <= 30 ? 'alcanza ~' + daysLeft(i) + ' días' : '' };
    }).filter(x => x.need > 0 && x.why);
  }
  function buyHTML(sd, L) {
    const B = buyList(L);
    if (!B.length) return '<div class="stk-empty"><p><b>No falta nada.</b> Todos los insumos están arriba del mínimo y alcanzan para más de un mes con lo que se viene usando.</p></div>';
    return '<p class="hint">Lo que conviene pedir' + (isEmp() ? ' para <b>' + esc(sedeName(sd)) + '</b>' : '') + ', calculado con el mínimo de cada insumo y con lo que se usó en los últimos 30 días.</p><ul class="stk-buy">' +
      B.map(x => '<li><span><b>' + esc(x.i.name) + '</b><small>Hay ' + fq(x.i.qty) + ' ' + esc(x.i.unit || '') + ' · ' + esc(x.why) + '</small></span><b class="stk-need">' + x.need + ' ' + esc(x.i.unit || '') + '</b></li>').join('') + '</ul>' +
      '<div class="row-btns"><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(buyText(sd, B)) + '">Mandar el pedido por WhatsApp</a><button class="btn" data-act="stkBuyCopy">Copiar el pedido</button></div>';
  }
  const buyText = (sd, B) => 'Pedido de insumos · ' + (A.CLINIC || '') + (isEmp() ? ' · ' + sedeName(sd) : '') + ' · ' + A.fmtDMY(today()) + '\n' + B.map(x => '- ' + x.need + ' ' + (x.i.unit || '') + ' de ' + x.i.name).join('\n');
  function movHTML(L) {
    const all = []; L.forEach(i => i.mv.forEach(m => all.push({ i, m })));
    all.sort((a, b) => (a.m.at < b.m.at ? 1 : -1));
    const WN = { uso: 'Uso', compra: 'Llegó', conteo: 'Conteo', ajuste: 'Ajuste', traspaso: 'Traspaso', vencido: 'Vencido / roto' };
    return all.length ? '<ul class="stk-mov">' + all.slice(0, 120).map(x => '<li><span class="stk-mw ' + x.m.why + '">' + (WN[x.m.why] || x.m.why) + '</span><span class="stk-ml"><b>' + esc(x.i.name) + '</b><small>' + new Date(x.m.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (x.m.by ? ' · ' + esc(x.m.by) : '') + (x.m.note ? ' · ' + esc(x.m.note) : '') + '</small></span><b class="' + (x.m.d < 0 ? 'neg' : 'pos') + '">' + (x.m.d > 0 ? '+' : '') + fq(x.m.d) + '</b></li>').join('') + '</ul>' : '<div class="stk-empty"><p>Todavía no hay movimientos.</p></div>';
  }
  function recHTML(sd, L) {
    const has = {}; L.forEach(i => { if (i.ck) has[i.ck] = i; });
    return '<p class="hint">Lo que se descuenta solo cada vez que se carga una práctica en «Prácticas de hoy». Los números son <b>usos</b>: por ejemplo, 1 uso de una caja de guantes que rinde 50 es 1/50 de caja. Poné 0 para no descontar ese insumo.</p>' +
      ['atencion'].concat(Object.keys(REC0)).map(k => '<details class="stk-rec"><summary><b>' + esc(RNAME[k] || k) + '</b><small>' + recOf(k).filter(r => r[1] > 0).map(r => (CATI[r[0]] ? CATI[r[0]][1].split(' (')[0] : r[0]) + (r[1] !== 1 ? ' ×' + r[1] : '')).join(', ') + '</small></summary><div class="stk-rgrid">' +
        recOf(k).map(r => '<label><span>' + esc(CATI[r[0]] ? CATI[r[0]][1] : r[0]) + (has[r[0]] ? '' : ' <em>(no está cargado)</em>') + '</span><input inputmode="decimal" value="' + String(r[1]).replace('.', ',') + '" data-chg="stkRec" data-k="' + k + '" data-ck="' + r[0] + '" aria-label="Usos"></label>').join('') + '</div></details>').join('') +
      '<div class="row-btns"><button class="btn small ghost" data-act="stkRecReset">Volver a lo sugerido</button></div>';
  }
  MF.stk = () => A.modalShell('Stock de insumos', '<div id="stkHost">' + A.stkHTML() + '</div>', '<button class="btn" data-act="closeModal">Cerrar</button>', true);
  const paint = () => { if (S.modal && S.modal.type === 'stk') { const h = $('#stkHost'); if (h) h.innerHTML = A.stkHTML(); else A.renderModal(); } else if (S.tab === 'empresa' && S.empTab === 'stock') A.refresh(); };
  const back = () => { if (S._stkInline) { S.modal = null; A.renderModal(); A.refresh(); } else { S.modal = { type: 'stk' }; A.renderModal(); } };
  A.acts.stkTab = el => { S.stk.tab = el.getAttribute('data-t'); paint(); };
  A.chg.stkSede = el => { S.stkSede = el.value; paint(); };
  A.ins.stkQ = el => { S.stk.q = el.value; const L = list(place()).map(norm1), st = S.stk, q = A.norm ? A.norm(st.q) : st.q.toLowerCase(); const u = $('#stkList'); if (u) u.innerHTML = listRows(L.filter(i => (!st.cat || i.cat === st.cat) && (!st.low || status(i) !== 'ok' || expSoon(i)) && (!q || (A.norm ? A.norm(i.name) : i.name.toLowerCase()).indexOf(q) >= 0))); };
  A.chg.stkCat = el => { S.stk.cat = el.value; paint(); };
  A.chg.stkLow = el => { S.stk.low = el.checked; paint(); };
  A.acts.stkBuyCopy = async () => { const sd = place(), t = buyText(sd, buyList(list(sd).map(norm1))); try { await navigator.clipboard.writeText(t); A.toast('Pedido copiado.'); } catch (e) { A.toast(t); } };
  A.acts.stkSeed = () => {
    const sd = place(), L = list(sd);
    CAT.forEach(c => { if (!byCk(sd, c[0])) L.push({ id: A.uid(), ck: c[0], name: c[1], cat: c[2], unit: c[3], uses: c[4], min: c[5], qty: 0, mv: [] }); });
    /* los insumos viejos del modo Empresa quedan, sin clave */
    save(); S.stk.tab = 'lista'; paint(); A.toast('Catálogo cargado. Ahora tocá «Contar el stock» y poné lo que tenés.');
  };
  A.chg.stkRec = el => {
    const k = el.getAttribute('data-k'), ck = el.getAttribute('data-ck'), v = Math.max(0, dec(el.value)), c = cfg();
    const r = recOf(k).map(x => x.slice()); const f = r.filter(x => x[0] === ck)[0]; if (f) f[1] = v; c.rec[k] = r; save();
  };
  A.acts.stkRecReset = () => { cfg().rec = {}; save(); paint(); A.toast('Recetas sugeridas restauradas.'); };

  /* ---------- un insumo: llegó, usé, contar, editar, borrar ---------- */
  const itemById = id => list(place()).filter(i => i.id === id)[0];
  A.acts.stkItem = el => { const i = itemById(el.getAttribute('data-id')); if (!i) return; S.modal = { type: 'stkI', id: i.id, mode: 'in' }; A.renderModal(); };
  MF.stkI = m => {
    const i = norm1(itemById(m.id) || {}); if (!i.id) return A.modalShell('Insumo', '<p>No está.</p>', '<button class="btn" data-act="stkBack">Volver</button>');
    const mode = m.mode;
    let b = '<div class="stk-head"><b>' + esc(i.name) + '</b><span>Hay <b>' + fq(i.qty) + ' ' + esc(i.unit || '') + '</b>' + (i.uses > 1 ? ' (≈' + Math.floor(i.qty * i.uses) + ' usos)' : '') + (daysLeft(i) != null ? ' · alcanza ~' + daysLeft(i) + ' días' : '') + (i.exp ? ' · vence ' + A.fmtDMY(i.exp) : '') + '</span></div>';
    b += '<div class="seg stk-tabs" role="tablist">' + [['in', 'Llegó'], ['use', 'Usé'], ['count', 'Contar'], ['edit', 'Datos'], ['hist', 'Historial']].map(t => '<button type="button" data-act="stkIMode" data-m="' + t[0] + '" aria-pressed="' + (mode === t[0]) + '">' + t[1] + '</button>').join('') + '</div>';
    if (mode === 'in') b += '<div class="row2"><div class="field"><label for="siQ">Cantidad que llegó (' + esc(i.unit || 'unidades') + ')</label><input id="siQ" inputmode="decimal" placeholder="Ej.: 2"></div><div class="field"><label for="siE">Vence (opcional)</label><input id="siE" type="date"></div></div><div class="field"><label for="siN">Nota (opcional)</label><input id="siN" placeholder="Ej.: proveedor, número de factura, precio"></div>';
    if (mode === 'use') b += '<div class="row2"><div class="field"><label for="siQ">Cuánto se usó</label><input id="siQ" inputmode="decimal" placeholder="Ej.: 1"></div><div class="field"><label for="siU">En</label><select id="siU"><option value="u">' + esc(i.unit || 'unidades') + '</option>' + (i.uses > 1 ? '<option value="x">usos (1/' + i.uses + ' de unidad)</option>' : '') + '<option value="v">se venció o se rompió (' + esc(i.unit || 'unidades') + ')</option></select></div></div><div class="field"><label for="siN">Nota (opcional)</label><input id="siN" placeholder="Ej.: paciente, motivo"></div>';
    if (mode === 'count') b += '<div class="field"><label for="siQ">Cuánto hay de verdad ahora (' + esc(i.unit || 'unidades') + ')</label><input id="siQ" inputmode="decimal" value="' + fq(i.qty) + '"></div><p class="hint">Se guarda la diferencia como ajuste, para que se vea en el historial.</p>';
    if (mode === 'edit') b += '<div class="field"><label for="seN">Nombre</label><input id="seN" value="' + esc(i.name) + '"></div><div class="row2"><div class="field"><label for="seU">Unidad</label><input id="seU" value="' + esc(i.unit || '') + '" placeholder="cajas, jeringas…"></div><div class="field"><label for="seX">Usos que rinde cada unidad</label><input id="seX" inputmode="numeric" value="' + i.uses + '"></div></div><div class="row2"><div class="field"><label for="seM">Avisar cuando queden</label><input id="seM" inputmode="decimal" value="' + fq(i.min || 0) + '"></div><div class="field"><label for="seC">Categoría</label><input id="seC" value="' + esc(i.cat) + '" list="stkCats"><datalist id="stkCats">' + CATS.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div></div><div class="field"><label for="seE">Próximo vencimiento</label><input id="seE" type="date" value="' + esc(i.exp || '') + '"></div>';
    if (mode === 'hist') b += i.mv.length ? '<ul class="stk-mov">' + i.mv.slice(0, 40).map(x => '<li><span class="stk-mw ' + x.why + '">' + esc(x.why) + '</span><span class="stk-ml"><small>' + new Date(x.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (x.by ? ' · ' + esc(x.by) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</small></span><b class="' + (x.d < 0 ? 'neg' : 'pos') + '">' + (x.d > 0 ? '+' : '') + fq(x.d) + '</b></li>').join('') + '</ul>' : '<p class="hint">Sin movimientos.</p>';
    b += '<div class="hint bad" id="siMsg"></div>';
    const foot = '<button class="btn" data-act="stkBack">Volver</button>' + (mode === 'edit' && canCfg() ? '<button class="btn danger" data-act="stkDel">Borrar</button>' : '') + (mode !== 'hist' ? '<button class="btn primary" data-act="stkISave">Guardar</button>' : '');
    return A.modalShell('Insumo', b, foot);
  };
  A.acts.stkIMode = el => { S.modal.mode = el.getAttribute('data-m'); A.renderModal(); };
  A.acts.stkBack = () => back();
  A.acts.stkISave = () => {
    const m = S.modal, i = norm1(itemById(m.id)), say = t => { $('#siMsg').textContent = t; };
    const q = dec(($('#siQ') || {}).value), note = (($('#siN') || {}).value || '').trim();
    if (m.mode === 'in') { if (!(q > 0)) return say('Escribí cuánto llegó.'); const e = ($('#siE') || {}).value; i.qty = Math.round((i.qty + q) * 1000) / 1000; if (e) i.exp = i.exp && i.exp < e && i.qty - q > 0 ? i.exp : e; mvAdd(i, q, 'compra', note); A.toast('+' + fq(q) + ' ' + (i.unit || '') + ' de ' + i.name + '.'); }
    else if (m.mode === 'use') { if (!(q > 0)) return say('Escribí cuánto se usó.'); const u = ($('#siU') || {}).value, d = u === 'x' ? q / i.uses : q; i.qty = Math.max(0, Math.round((i.qty - d) * 1000) / 1000); mvAdd(i, -d, u === 'v' ? 'vencido' : 'uso', note); }
    else if (m.mode === 'count') { const v = dec(($('#siQ') || {}).value); if (v < 0) return say('No puede ser negativo.'); const d = v - i.qty; i.qty = v; mvAdd(i, d, 'conteo'); }
    else if (m.mode === 'edit') { const n = ($('#seN').value || '').trim(); if (!n) return say('Poné el nombre.'); i.name = n; i.unit = $('#seU').value.trim(); i.uses = Math.max(1, Math.round(num($('#seX').value)) || 1); i.min = Math.max(0, dec($('#seM').value)); i.cat = ($('#seC').value || '').trim() || 'Otros'; i.exp = $('#seE').value || null; }
    save(); checkAlerts(place()); back();
  };
  A.acts.stkDel = () => { const m = S.modal, sd = place(), L = list(sd), i = itemById(m.id); if (!i) return; ST()[sd] = L.filter(x => x !== i); save(); back(); A.toast('Insumo borrado.', () => { list(sd).push(i); save(); paint(); }); };
  A.acts.stkNew = () => { S.modal = { type: 'stkNew' }; A.renderModal(); };
  MF.stkNew = () => A.modalShell('Insumo nuevo', '<div class="field"><label for="snN">Nombre</label><input id="snN" placeholder="Ej.: Composite A3 (jeringa)"></div><div class="row2"><div class="field"><label for="snU">Unidad</label><input id="snU" placeholder="jeringas, cajas…"></div><div class="field"><label for="snX">Usos que rinde cada unidad</label><input id="snX" inputmode="numeric" value="1"></div></div><div class="row2"><div class="field"><label for="snQ">Cuánto hay</label><input id="snQ" inputmode="decimal" value="0"></div><div class="field"><label for="snM">Avisar cuando queden</label><input id="snM" inputmode="decimal" value="1"></div></div><div class="field"><label for="snC">Categoría</label><input id="snC" list="stkCats2" placeholder="Restauración, Descartables…"><datalist id="stkCats2">' + CATS.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div><div class="hint bad" id="snMsg"></div>',
    '<button class="btn" data-act="stkBack">Volver</button><button class="btn primary" data-act="stkNewGo">Guardar</button>');
  A.acts.stkNewGo = () => {
    const n = ($('#snN').value || '').trim(); if (!n) { $('#snMsg').textContent = 'Poné el nombre.'; return; }
    const i = { id: A.uid(), ck: null, name: n, unit: $('#snU').value.trim(), uses: Math.max(1, Math.round(num($('#snX').value)) || 1), qty: Math.max(0, dec($('#snQ').value)), min: Math.max(0, dec($('#snM').value)), cat: ($('#snC').value || '').trim() || 'Otros', mv: [] };
    if (i.qty) mvAdd(i, i.qty, 'conteo'); list(place()).push(i); save(); back();
  };
  /* llegó mercadería / usé algo: elegir el insumo de una lista */
  const pickHTML = (act, title) => A.modalShell(title, '<div class="field"><label for="spQ">Buscá el insumo</label><input id="spQ" type="search" data-in="stkPickQ" data-a="' + act + '" placeholder="Ej.: guantes, composite, anestesia"></div><ul class="stk-pick" id="stkPick">' + pickRows('', act) + '</ul>', '<button class="btn" data-act="stkBack">Volver</button>');
  const pickRows = (q, act) => { const L = list(place()).map(norm1), qq = A.norm ? A.norm(q) : q.toLowerCase(); return L.filter(i => !qq || (A.norm ? A.norm(i.name) : i.name.toLowerCase()).indexOf(qq) >= 0).slice(0, 60).map(i => '<li><button data-act="stkPickGo" data-id="' + i.id + '" data-m="' + act + '"><b>' + esc(i.name) + '</b><small>Hay ' + fq(i.qty) + ' ' + esc(i.unit || '') + '</small></button></li>').join('') || '<li class="stk-none">No hay coincidencias.</li>'; };
  A.acts.stkIn = () => { S.modal = { type: 'stkPick', m: 'in' }; A.renderModal(); };
  A.acts.stkUseM = () => { S.modal = { type: 'stkPick', m: 'use' }; A.renderModal(); };
  MF.stkPick = m => pickHTML(m.m, m.m === 'in' ? 'Llegó mercadería' : 'Usé algo');
  A.ins.stkPickQ = el => { const u = $('#stkPick'); if (u) u.innerHTML = pickRows(el.value, el.getAttribute('data-a')); };
  A.acts.stkPickGo = el => { S.modal = { type: 'stkI', id: el.getAttribute('data-id'), mode: el.getAttribute('data-m') }; A.renderModal(); };
  /* contar todo de una vez */
  A.acts.stkCount = () => { S.modal = { type: 'stkCountM' }; A.renderModal(); };
  MF.stkCountM = () => {
    const L = list(place()).map(norm1), cats = []; L.forEach(i => { if (cats.indexOf(i.cat) < 0) cats.push(i.cat); });
    return A.modalShell('Contar el stock', '<p class="hint" style="margin-top:0">Escribí lo que hay de cada cosa. Lo que no toques queda como está.</p>' + cats.map(c => '<h3 class="stk-ch">' + esc(c) + '</h3><div class="stk-cgrid">' + L.filter(i => i.cat === c).map(i => '<label><span>' + esc(i.name) + '<small>' + esc(i.unit || '') + '</small></span><input inputmode="decimal" data-cid="' + i.id + '" placeholder="' + fq(i.qty) + '"></label>').join('') + '</div>').join(''),
      '<button class="btn" data-act="stkBack">Volver</button><button class="btn primary" data-act="stkCountGo">Guardar el conteo</button>', true);
  };
  A.acts.stkCountGo = () => {
    let n = 0; const L = list(place());
    A.$$('[data-cid]').forEach(inp => { if (inp.value.trim() === '') return; const i = L.filter(x => x.id === inp.getAttribute('data-cid'))[0]; if (!i) return; norm1(i); const v = Math.max(0, dec(inp.value)), d = v - i.qty; if (Math.abs(d) < 1e-9) return; i.qty = v; mvAdd(i, d, 'conteo'); n++; });
    save(); checkAlerts(place()); back(); A.toast(n ? 'Conteo guardado (' + n + ' insumo' + (n === 1 ? '' : 's') + ').' : 'No cambiaste ningún número.');
  };
  /* pasar insumos a otro centro (Empresa) */
  A.acts.stkMove = () => { S.modal = { type: 'stkMoveM' }; A.renderModal(); };
  MF.stkMoveM = () => {
    const sd = place(), L = list(sd).map(norm1).filter(i => i.qty > 0);
    return A.modalShell('Pasar a otro centro', '<div class="row2"><div class="field"><label for="smI">Insumo</label><select id="smI">' + L.map(i => '<option value="' + i.id + '">' + esc(i.name) + ' (hay ' + fq(i.qty) + ')</option>').join('') + '</select></div><div class="field"><label for="smQ">Cantidad</label><input id="smQ" inputmode="decimal"></div></div><div class="field"><label for="smD">A</label><select id="smD">' + sedes().filter(l => l.id !== sd).map(l => '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>').join('') + '</select></div><div class="hint bad" id="smMsg"></div>',
      '<button class="btn" data-act="stkBack">Volver</button><button class="btn primary" data-act="stkMoveGo">Pasar</button>');
  };
  A.acts.stkMoveGo = () => {
    const sd = place(), i = itemById($('#smI').value), q = dec($('#smQ').value), to = $('#smD').value;
    if (!i || !(q > 0)) { $('#smMsg').textContent = 'Elegí el insumo y la cantidad.'; return; } if (q > i.qty) { $('#smMsg').textContent = 'No hay tanto.'; return; }
    let j = i.ck ? byCk(to, i.ck) : list(to).filter(x => x.name === i.name)[0];
    if (!j) { j = { id: A.uid(), ck: i.ck || null, name: i.name, cat: i.cat, unit: i.unit, uses: i.uses, min: i.min, qty: 0, mv: [] }; list(to).push(j); }
    norm1(j); i.qty = Math.round((i.qty - q) * 1000) / 1000; j.qty = Math.round((j.qty + q) * 1000) / 1000;
    mvAdd(i, -q, 'traspaso', 'a ' + sedeName(to)); mvAdd(j, q, 'traspaso', 'desde ' + sedeName(sd));
    if (A.empAudit) A.empAudit('Pasó ' + fq(q) + ' ' + (i.unit || '') + ' de ' + i.name + ' de ' + sedeName(sd) + ' a ' + sedeName(to) + '.');
    save(); back(); A.toast('Listo: ' + fq(q) + ' ' + (i.unit || '') + ' a ' + sedeName(to) + '.');
  };

  /* ---------- entradas: menú, Empresa › Stock y aviso en el inicio ---------- */
  const addMenu = () => {
    const c = document.querySelector('.dnav[data-act="catalogOpen"]');
    if (c && !document.querySelector('.dnav[data-act="stkOpen"]')) c.insertAdjacentHTML('afterend', '<button class="dnav" data-act="stkOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg><span class="t">Stock de insumos</span></button>');
  };
  addMenu();
  const erPrev = A.render.empresa;
  if (erPrev) A.render.empresa = function () {
    const r = erPrev.apply(this, arguments);
    if (S.empTab === 'stock') { const host = $('#view-empresa .emp-sedes') ; const top = host && host.previousElementSibling && host.previousElementSibling.classList.contains('hint') ? host.previousElementSibling : null; if (host) { if (top) top.remove(); host.outerHTML = '<section class="card stk-inline" id="stkHost">' + A.stkHTML() + '</section>'; S._stkInline = true; } }
    else S._stkInline = false;
    return r;
  };
  const closePrev = A.closeModal;
  if (closePrev) A.closeModal = function () { const r = closePrev.apply(this, arguments); if (S._stkInline && S.tab === 'empresa') A.refresh(); return r; };

  const css = document.createElement('style');
  css.textContent = '.stk-sede{display:flex;gap:8px;align-items:center;margin-bottom:8px}.stk-sede select{min-height:36px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;padding:0 8px}.stk-where{margin:0 0 8px}' +
    '.stk-tabs{margin-bottom:10px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;max-width:100%}.stk-tabs::-webkit-scrollbar{display:none}.stk-tabs button{white-space:nowrap}.stk-n{background:#c0392b;color:#fff;border-radius:999px;font-size:11px;padding:0 6px;margin-left:2px}' +
    '.stk-empty{padding:14px;border:1px dashed var(--line);border-radius:12px}.stk-empty p{margin:0 0 8px}' +
    '.stk-sum{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.stk-sum span{font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid var(--line)}.stk-sum .ok{background:var(--ok-soft,#e5f4ea)}.stk-sum .low{background:#fde7e4}.stk-sum .exp{background:var(--warn-soft,#fbf0d9)}' +
    '.stk-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}.stk-bar input[type=search]{flex:1 1 180px;min-height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px;background:var(--surface);color:var(--ink);font:inherit}.stk-bar select{min-height:38px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;padding:0 8px}' +
    '.stk-acts{margin-bottom:10px}.stk-list,.stk-buy,.stk-mov,.stk-pick{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
    '.stk-row{all:unset;cursor:pointer;display:flex;gap:10px;align-items:center;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.stk-row:hover{border-color:var(--accent)}' +
    '.stk-it.low .stk-row{border-left:4px solid #d68910}.stk-it.out .stk-row{border-left:4px solid #c0392b}.stk-it.ok .stk-row{border-left:4px solid #27ae60}' +
    '.stk-l{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.stk-l small{color:var(--ink-2);font-size:12px}.stk-meter{display:block;height:4px;border-radius:4px;background:var(--line);overflow:hidden;max-width:220px}.stk-meter i{display:block;height:100%;background:#27ae60}.stk-it.low .stk-meter i{background:#d68910}.stk-it.out .stk-meter i{background:#c0392b}' +
    '.stk-r{display:flex;flex-direction:column;align-items:flex-end;min-width:64px}.stk-r b{font-size:18px}.stk-r small{font-size:11.5px;color:var(--ink-2)}.stk-r .stk-ex{color:#b9770e;font-weight:700}.stk-none{color:var(--ink-2);padding:8px}' +
    '.stk-buy li,.stk-mov li{display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:10px}.stk-buy li>span,.stk-ml{flex:1;min-width:0;display:flex;flex-direction:column}.stk-buy small,.stk-ml small{color:var(--ink-2);font-size:12px}.stk-need{white-space:nowrap;color:var(--accent)}' +
    '.stk-mw{font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--line);white-space:nowrap}.stk-mw.uso{background:#fde7e4}.stk-mw.compra{background:var(--ok-soft,#e5f4ea)}.stk-mw.conteo{background:#e3edfb}.stk-mw.traspaso{background:#efe6fb}.stk-mov .neg{color:#a93226}.stk-mov .pos{color:#1e8449}' +
    '.stk-rec{border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-bottom:6px}.stk-rec summary{cursor:pointer;display:flex;flex-direction:column}.stk-rec summary small{color:var(--ink-2);font-size:12px}.stk-rgrid,.stk-cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 12px;margin-top:8px}' +
    '.stk-rgrid label,.stk-cgrid label{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:13.5px}.stk-rgrid label span,.stk-cgrid label span{flex:1;min-width:0;display:flex;flex-direction:column}.stk-cgrid small{color:var(--ink-2);font-size:11.5px}.stk-rgrid em{color:#b9770e;font-style:normal;font-size:11.5px}.stk-rgrid input,.stk-cgrid input{width:76px;min-height:34px;border:1px solid var(--line);border-radius:8px;text-align:right;padding:0 6px;background:var(--surface);color:var(--ink);font:inherit}.stk-ch{margin:12px 0 2px;font-size:14px}' +
    '.stk-head{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}.stk-head span{color:var(--ink-2);font-size:13.5px}' +
    '.stk-pick button{all:unset;cursor:pointer;display:flex;flex-direction:column;padding:8px 10px;border:1px solid var(--line);border-radius:10px;width:100%;box-sizing:border-box}.stk-pick button:hover{border-color:var(--accent)}.stk-pick small{color:var(--ink-2);font-size:12px}';
  document.head.appendChild(css);
})();
