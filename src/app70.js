/* ===== 1.48: costos y rentabilidad: precios de insumos mes a mes, costo de cada práctica, gastos fijos y precio sugerido para no perder margen ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const num = v => parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10) || 0;
  const MONL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mName = m => MONL[+m.slice(5) - 1] + ' ' + m.slice(0, 4);
  const addM = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const pct = (a, b) => (b ? Math.round((a - b) / b * 1000) / 10 : 0);
  const fmtPct = v => (v > 0 ? '+' : '') + String(v).replace('.', ',') + '%';
  const R = () => A.stkRec || null;

  /* ---------- datos (en ajustes: solo el dueño o administración los cambian) ---------- */
  const SP = () => A.CFG.supPrice || (A.CFG.supPrice = {});      /* { ck: [{m, p}] }  precio por unidad de compra */
  const FX = () => A.CFG.fixed || (A.CFG.fixed = []);            /* [{id, name, hist:[{m, p}]}] gastos fijos por mes */
  const at = (hist, m) => { let v = null; (hist || []).slice().sort((a, b) => (a.m < b.m ? -1 : 1)).forEach(h => { if (h.m <= m) v = h.p; }); return v; };
  const setAt = (hist, m, p) => { const i = hist.findIndex(h => h.m === m); if (i >= 0) hist[i].p = p; else hist.push({ m, p }); };
  A.supPriceAt = (ck, m) => at(SP()[ck], m);
  A.fixedAt = m => FX().reduce((s, f) => s + (at(f.hist, m) || 0), 0);

  /* insumos que se usan: los del stock (si hay) y los de las recetas */
  const supplies = () => {
    const r = R(); if (!r) return [];
    const L = {}, stock = (A.stockList ? A.stockList('main') : []) || [];
    stock.forEach(i => { L[i.ck || i.id] = { ck: i.ck || i.id, name: i.name, unit: i.unit || 'unidad', uses: i.uses || 1 }; });
    Object.keys(r.CATI).forEach(ck => { if (!L[ck]) { const c = r.CATI[ck]; L[ck] = { ck, name: c[1], unit: c[3], uses: c[4] || 1 }; } });
    return Object.keys(L).map(k => L[k]);
  };
  const usesOf = ck => { const s = supplies().filter(x => x.ck === ck)[0]; return s ? s.uses : 1; };
  /* costo de insumos de una receta, en un mes */
  const recCost = (rec, m) => rec.reduce((s, x) => { const p = A.supPriceAt(x[0], m); return s + (p ? p / usesOf(x[0]) * x[1] : 0); }, 0);
  A.pracCost = (label, m) => {
    const r = R(); if (!r) return { cost: 0, known: false };
    const k = r.recKey({ label }); const rec = (k ? r.recOf(k) : []).concat(r.recOf('atencion'));
    const known = rec.some(x => A.supPriceAt(x[0], m));
    return { cost: Math.round(recCost(rec, m)), known, key: k };
  };

  /* lo hecho en un mes: cantidad de prácticas, cobrado, costo de insumos y parte de los profesionales */
  A.monthResult = m => {
    let n = 0, ins = 0, fact = 0;
    (A.allPids ? A.allPids() : A.PATS.map(p => p.id)).forEach(id => { (A.pd(id).ledger || []).forEach(e => { if (e.type !== 'cargo' || e.voided || e.anula || e.date.slice(0, 7) !== m) return; n++; fact += (+e.amount || 0) + (+e.osCov || 0); ins += A.pracCost(e.desc, m).cost; }); });
    const cob = A.cobAlloc ? A.cobAlloc().filter(x => x.date.slice(0, 7) === m).reduce((s, x) => s + x.amount, 0) : fact;
    const pros = (A.PROS || []).reduce((s, p) => s + (A.liqCalc ? A.liqCalc(p.id, m).dent : 0), 0);
    const solo = S.setup && S.setup.type === 'solo';
    const fixed = A.fixedAt(m), res = cob - ins - fixed - (solo ? 0 : pros);
    return { m, n, fact, cob, ins, fixed, pros: solo ? 0 : pros, res, margin: cob ? Math.round(res / cob * 1000) / 10 : 0 };
  };

  /* ---------- pantalla ---------- */
  A.costOpenBtn = () => '<button class="btn small" data-act="costOpen">Costos y rentabilidad</button>';
  A.acts.costOpen = () => { S.modal = { type: 'costs', back: S.modal, tab: 'res', m: A.today().slice(0, 7), q: '' }; A.renderModal(); };
  A.acts.costTab = el => { S.modal.tab = el.getAttribute('data-t'); A.renderModal(); };
  A.acts.costM = el => { S.modal.m = addM(S.modal.m, +el.getAttribute('data-n')); A.renderModal(); };
  A.acts.costBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  MF.costs = m => {
    const T = [['res', 'Rentabilidad'], ['sup', 'Precios de insumos'], ['prac', 'Costo por práctica'], ['fix', 'Gastos fijos']];
    let b = '<div class="seg cs-tabs" role="group">' + T.map(t => '<button data-act="costTab" data-t="' + t[0] + '" aria-pressed="' + (m.tab === t[0]) + '">' + t[1] + '</button>').join('') + '</div>';
    b += '<div class="cj-day"><button class="btn small" data-act="costM" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(A.cap(mName(m.m))) + '</b><button class="btn small" data-act="costM" data-n="1" aria-label="Mes siguiente"' + (m.m >= A.today().slice(0, 7) ? ' disabled' : '') + '>›</button></div>';
    b += m.tab === 'sup' ? supHTML(m) : m.tab === 'prac' ? pracHTML(m) : m.tab === 'fix' ? fixHTML(m) : resHTML(m);
    return A.modalShell('Costos y rentabilidad', b, '<button class="btn" data-act="costBack">Volver</button>', true);
  };

  function resHTML(m) {
    const Y = [addM(m.m, -2), addM(m.m, -1), m.m].map(A.monthResult), c = Y[2], p = Y[1];
    let h = '<div class="cj-kpis"><div class="cj-kpi big"><small>Te queda (' + esc(mName(m.m)) + ')</small><b>' + money(c.res) + '</b><span>' + String(c.margin).replace('.', ',') + '% de lo cobrado</span></div>' +
      '<div class="cj-kpi"><small>Cobrado</small><b>' + money(c.cob) + '</b></div><div class="cj-kpi"><small>Insumos usados</small><b>' + money(c.ins) + '</b></div><div class="cj-kpi"><small>Gastos fijos</small><b>' + money(c.fixed) + '</b></div>' + (c.pros ? '<div class="cj-kpi"><small>Profesionales</small><b>' + money(c.pros) + '</b></div>' : '') + '</div>';
    h += '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Mes</th><th class="num">Prácticas</th><th class="num">Cobrado</th><th class="num">Insumos</th><th class="num">Fijos</th>' + (c.pros || p.pros ? '<th class="num">Profesionales</th>' : '') + '<th class="num">Queda</th><th class="num">Margen</th></tr></thead><tbody>' +
      Y.map(y => '<tr><td>' + esc(A.cap(mName(y.m))) + '</td><td class="num">' + y.n + '</td><td class="num">' + money(y.cob) + '</td><td class="num">' + money(y.ins) + '</td><td class="num">' + money(y.fixed) + '</td>' + (c.pros || p.pros ? '<td class="num">' + money(y.pros) + '</td>' : '') + '<td class="num"><b>' + money(y.res) + '</b></td><td class="num">' + String(y.margin).replace('.', ',') + '%</td></tr>').join('') + '</tbody></table></div>';
    const insUp = supChange(m.m), fixUp = pct(A.fixedAt(m.m), A.fixedAt(addM(m.m, -1))), catUp = catChange();
    const msgs = [];
    if (insUp != null) msgs.push('Los insumos ' + (insUp >= 0 ? 'subieron ' : 'bajaron ') + fmtPct(Math.abs(insUp)).replace('+', '') + ' respecto del mes anterior.');
    if (fixUp) msgs.push('Los gastos fijos ' + (fixUp >= 0 ? 'subieron ' : 'bajaron ') + String(Math.abs(fixUp)).replace('.', ',') + '%.');
    if (catUp != null) msgs.push('Tu último cambio de precios fue ' + fmtPct(catUp) + '.');
    if (p.cob && c.margin < p.margin - 2) msgs.push('<b>Tu margen bajó de ' + String(p.margin).replace('.', ',') + '% a ' + String(c.margin).replace('.', ',') + '%.</b> Mirá «Costo por práctica» para ver qué precios quedaron atrasados.');
    if (msgs.length) h += '<div class="cs-msg">' + msgs.map(x => '<p>' + x + '</p>').join('') + '</div>';
    if (!Object.keys(SP()).length) h += '<div class="hint">Para calcular el costo de los insumos, cargá sus precios en «Precios de insumos». Los gastos fijos (alquiler, expensas, servicios, sueldos) van en «Gastos fijos».</div>';
    return h;
  }
  /* variación promedio de los insumos con precio en los dos meses */
  const supChange = m => { const P = SP(), pm = addM(m, -1); const v = Object.keys(P).map(ck => [at(P[ck], m), at(P[ck], pm)]).filter(x => x[0] && x[1]); if (!v.length) return null; return Math.round(v.reduce((s, x) => s + (x[0] - x[1]) / x[1], 0) / v.length * 1000) / 10; };
  const catChange = () => { const h = (A.CFG.priceHist || [])[0]; if (!h) return null; const m = /([+-]?\d+(?:[.,]\d+)?)%/.exec(h.what); return m ? parseFloat(m[1].replace(',', '.')) : null; };

  /* compra de referencia: la primera (o la que se elija); contra esa se mide cuánto subió cada insumo */
  const months = () => { const o = {}; Object.keys(SP()).forEach(ck => SP()[ck].forEach(x => { o[x.m] = 1; })); return Object.keys(o).sort(); };
  const refM = m => { const L = months().filter(x => x < m); const r = A.CFG.supRef; return r && r < m && L.indexOf(r) >= 0 ? r : (L[0] || addM(m, -1)); };
  A.supRefM = refM;
  /* peso de cada insumo: cuánto pesa en el costo de las prácticas de la lista */
  const weights = rm => { const r = R(), w = {}; if (!r) return w; A.CAT.forEach(x => { const k = r.recKey({ label: x.label }); (k ? r.recOf(k) : []).forEach(q => { const p = A.supPriceAt(q[0], rm); if (p) w[q[0]] = (w[q[0]] || 0) + p / usesOf(q[0]) * q[1]; }); }); return w; };
  A.supDiff = m => {
    const rm = refM(m), P = SP(), rows = Object.keys(P).map(ck => ({ ck, ref: at(P[ck], rm), now: at(P[ck], m), upd: P[ck].some(x => x.m > rm && x.m <= m) })).filter(x => x.ref && x.now && x.upd);
    if (!rows.length) return null;
    const avg = rows.reduce((s, x) => s + (x.now - x.ref) / x.ref, 0) / rows.length, w = weights(rm);
    let sw = 0, sv = 0; rows.forEach(x => { const k = w[x.ck] || 0; sw += k; sv += k * (x.now - x.ref) / x.ref; });
    return { rm, n: rows.length, avg: Math.round(avg * 1000) / 10, wavg: sw ? Math.round(sv / sw * 1000) / 10 : null };
  };
  function supHTML(m) {
    const rm = refM(m.m), q = A.norm ? A.norm(m.q || '') : '', L = supplies().filter(s => !q || (A.norm(s.name)).indexOf(q) >= 0).sort((a, b) => a.name.localeCompare(b.name)), MS = months().filter(x => x < m.m);
    let h = '<p class="m-lead">1) La primera vez cargá lo que te costó cada insumo (por unidad de compra: caja, paquete, kit…). 2) En la próxima compra, cuando sea, pasá al mes de esa compra con las flechas y cargá los precios nuevos. La app calcula cuánto subió cada insumo contra la compra de referencia y el aumento promedio, para trasladarlo a las prácticas.</p>';
    const D = A.supDiff(m.m);
    if (D) h += '<div class="cs-diff"><div><small>Aumento de los insumos desde ' + esc(MONL[+D.rm.slice(5) - 1]) + ' ' + D.rm.slice(0, 4) + '</small><b>' + fmtPct(D.wavg != null ? D.wavg : D.avg) + '</b><span>' + (D.wavg != null ? 'según cuánto pesa cada insumo en tus prácticas · promedio simple ' + fmtPct(D.avg) : 'promedio de ' + D.n + ' insumos') + '</span></div>' + (A.isBoss && A.isBoss() ? '<button class="btn primary" data-act="csApply" data-p="' + (D.wavg != null ? D.wavg : D.avg) + '">Subir las prácticas ' + fmtPct(D.wavg != null ? D.wavg : D.avg) + '</button>' : '') + '</div>';
    if (MS.length > 1) h += '<div class="field" style="max-width:280px"><label for="csRef">Comparar contra la compra de</label><select id="csRef" data-chg="csRef">' + MS.map(x => '<option value="' + x + '"' + (x === rm ? ' selected' : '') + '>' + esc(A.cap(mName(x))) + '</option>').join('') + '</select></div>';
    h += '<input class="inp" data-in="csQ" placeholder="Buscar insumo" value="' + esc(m.q || '') + '" style="width:100%;margin:4px 0 8px">';
    h += '<div class="tbl-scroll" style="max-height:48vh"><table class="tbl cs-sup"><thead><tr><th>Insumo</th><th class="num">Referencia<br><small>' + esc(MONL[+rm.slice(5) - 1]) + '</small></th><th class="num">Compra de<br><small>' + esc(MONL[+m.m.slice(5) - 1]) + '</small></th><th class="num">Aumento</th></tr></thead><tbody>' + L.map(s => {
      const now = at(SP()[s.ck], m.m), ref = at(SP()[s.ck], rm), own = (SP()[s.ck] || []).some(x => x.m === m.m);
      return '<tr><td>' + esc(s.name) + '<small class="cs-u"> · ' + esc(s.unit) + ' (' + s.uses + ' usos)</small></td><td class="num">' + (ref ? money(ref) : '—') + '</td><td class="num"><input class="p" inputmode="numeric" data-chg="stkPrice" data-ck="' + esc(s.ck) + '" value="' + (own ? now : '') + '" placeholder="' + (now ? String(now) : '') + '" aria-label="Precio de ' + esc(s.name) + '"></td><td class="num">' + (now && ref && own && ref !== now ? '<b class="' + (now > ref ? 'cs-up' : 'cs-dn') + '">' + fmtPct(pct(now, ref)) + '</b>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return h + '<div class="hint">Si un precio no cambió, no hace falta volver a cargarlo: se usa el último.</div>';
  }
  A.chg.csRef = el => { A.CFG.supRef = el.value; A.save(); A.renderModal(); };
  A.acts.csApply = el => { const p = el.getAttribute('data-p'); A.acts.pctOpen(); S.modal.pct = String(p); A.renderModal(); };
  A.ins.csQ = el => { S.modal.q = el.value; const pos = el.selectionStart; A.renderModal(); const i = $('[data-in="csQ"]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } };
  A.chg.stkPrice = el => { const ck = el.getAttribute('data-ck'), v = num(el.value), P = SP(); P[ck] = P[ck] || []; if (v) setAt(P[ck], S.modal.m, v); else P[ck] = P[ck].filter(x => x.m !== S.modal.m); A.save(); const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; };

  function pracHTML(m) {
    const pm = refM(m.m), res = A.monthResult(m.m), fixPer = res.n ? Math.round(res.fixed / res.n) : 0;
    const rows = A.CAT.map(x => { const c = A.pracCost(x.label, m.m), cp = A.pracCost(x.label, pm); return { x, c: c.cost, cp: cp.cost, known: c.known }; }).filter(r => r.known);
    let h = '<p class="m-lead">Costo de los insumos de cada práctica (según las recetas del stock) y precio sugerido para mantener tu margen si subieron los costos.' + (fixPer ? ' Los gastos fijos de ' + esc(mName(m.m)) + ' equivalen a <b>' + money(fixPer) + '</b> por práctica.' : '') + '</p>';
    if (!rows.length) return h + '<div class="empty">Todavía no hay precios de insumos para calcular. Cargalos en «Precios de insumos».</div>';
    m.sel = m.sel || {};
    h += '<div class="tbl-scroll" style="max-height:50vh"><table class="tbl cs-prac"><thead><tr><th></th><th>Práctica</th><th class="num">Precio</th><th class="num">Insumos</th><th class="num">Var. costo</th><th class="num">Margen</th><th class="num">Sugerido</th></tr></thead><tbody>' + rows.map(r => {
      const tot = r.c + fixPer, mg = r.x.price ? Math.round((r.x.price - tot) / r.x.price * 1000) / 10 : 0;
      const s = r.cp && r.c > r.cp ? Math.round((r.x.price + (r.c - r.cp)) / 100) * 100 : null;
      return '<tr><td>' + (s ? '<input type="checkbox" data-chg="csSel" data-k="' + esc(r.x.k) + '"' + (m.sel[r.x.k] !== false ? ' checked' : '') + ' aria-label="Usar sugerido">' : '') + '</td><td>' + esc(r.x.label) + '</td><td class="num">' + money(r.x.price) + '</td><td class="num">' + money(r.c) + '</td><td class="num">' + (r.cp ? fmtPct(pct(r.c, r.cp)) : '—') + '</td><td class="num' + (mg < 30 ? ' cs-low' : '') + '">' + String(mg).replace('.', ',') + '%</td><td class="num">' + (s ? '<b>' + money(s) + '</b>' : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    h += '<div class="hint">Margen = precio menos insumos y gastos fijos por práctica. El sugerido mantiene la misma ganancia en pesos que antes del aumento de los insumos.</div>';
    h += '<div class="row-btns"><button class="btn primary" data-act="costGo">Aplicar sugeridos a lo tildado</button><button class="btn" data-act="pctOpen">Subir todo un %</button></div>';
    return h;
  }
  A.chg.csSel = el => { S.modal.sel = S.modal.sel || {}; S.modal.sel[el.getAttribute('data-k')] = el.checked; };
  A.acts.costGo = () => {
    const m = S.modal, pm = refM(m.m); let n = 0;
    const hist = A.CFG.priceHist || (A.CFG.priceHist = []); hist.unshift({ at: new Date().toISOString(), what: 'Sugeridos por costos de ' + mName(m.m), prev: A.CAT.map(x => [x.k, x.price]) }); A.CFG.priceHist = hist.slice(0, 12);
    A.CAT.forEach(x => {
      if ((m.sel || {})[x.k] === false) return; const c = A.pracCost(x.label, m.m), cp = A.pracCost(x.label, pm);
      if (!c.known || !cp.cost || c.cost <= cp.cost) return; x.price = Math.round((x.price + (c.cost - cp.cost)) / 100) * 100; n++;
    });
    A.save(); A.renderModal(); A.toast(n ? n + ' precios actualizados para cubrir el aumento de los insumos.' : 'No hay precios para actualizar.');
  };

  function fixHTML(m) {
    const pm = addM(m.m, -1), F = FX();
    let h = '<p class="m-lead">Lo que pagás todos los meses aunque no atiendas: alquiler, expensas, luz, gas, internet, sueldos, contador, seguros… Si un mes cambia, cargás el valor nuevo y queda el historial.</p>';
    h += F.length ? '<table class="tbl"><thead><tr><th>Gasto</th><th class="num">' + esc(MONL[+pm.slice(5) - 1]) + '</th><th class="num">' + esc(MONL[+m.m.slice(5) - 1]) + '</th><th></th></tr></thead><tbody>' + F.map(f => {
      const now = at(f.hist, m.m), prev = at(f.hist, pm), own = f.hist.some(x => x.m === m.m);
      return '<tr><td><input class="inp" data-chg="fixF" data-id="' + f.id + '" data-f="name" value="' + esc(f.name) + '" aria-label="Nombre del gasto"></td><td class="num">' + (prev ? money(prev) : '—') + '</td><td class="num"><input class="p" inputmode="numeric" data-chg="fixF" data-id="' + f.id + '" data-f="p" value="' + (own ? now : '') + '" placeholder="' + (now || '') + '" aria-label="Importe"></td><td><button class="btn small ghost" data-act="fixDel" data-id="' + f.id + '" aria-label="Quitar">✕</button></td></tr>';
    }).join('') + '<tr class="tot"><td><b>Total del mes</b></td><td class="num">' + money(A.fixedAt(pm)) + '</td><td class="num"><b>' + money(A.fixedAt(m.m)) + '</b></td><td></td></tr></tbody></table>' : '<div class="empty">Todavía no cargaste gastos fijos.</div>';
    h += '<div class="row-btns" style="margin-top:8px">' + ['Alquiler', 'Expensas', 'Luz', 'Gas', 'Internet y teléfono', 'Sueldos', 'Contador', 'Seguros', 'Otro'].filter(n => !F.some(f => f.name === n)).map(n => '<button class="chip-ex" data-act="fixAdd" data-n="' + esc(n) + '">+ ' + esc(n) + '</button>').join('') + '</div>';
    return h;
  }
  A.acts.fixAdd = el => { FX().push({ id: A.uid(), name: el.getAttribute('data-n'), hist: [] }); A.save(); A.renderModal(); };
  A.acts.fixDel = el => { A.CFG.fixed = FX().filter(f => f.id !== el.getAttribute('data-id')); A.save(); A.renderModal(); };
  A.chg.fixF = el => { const f = FX().filter(x => x.id === el.getAttribute('data-id'))[0]; if (!f) return; if (el.getAttribute('data-f') === 'name') f.name = el.value.trim() || f.name; else { const v = num(el.value); if (v) setAt(f.hist, S.modal.m, v); else f.hist = f.hist.filter(x => x.m !== S.modal.m); } A.save(); A.renderModal(); };

  /* aviso mensual al dueño: cargá los precios del mes */
  const arPrev = A.afterRefresh;
  let done = false;
  A.afterRefresh = function () {
    const r = arPrev ? arPrev.apply(this, arguments) : undefined;
    if (!done && A.isBoss && A.isBoss() && A.nfAdd && !A.DEMO) { done = true; const m = A.today().slice(0, 7), d = +A.today().slice(8); if (Object.keys(SP()).length && d <= 10 && !Object.keys(SP()).some(ck => SP()[ck].some(x => x.m === m))) A.nfAdd({ id: 'cost:' + m, k: 'info', t: 'Precios de insumos de ' + mName(m), b: 'Cargá lo que te costaron los insumos este mes para ver si tus precios quedaron atrasados.', act: 'costOpen' }); }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = '.cs-tabs{margin-bottom:8px;flex-wrap:wrap}.cs-u{color:var(--muted,#667);font-size:.78rem}.cs-low{color:#b3261e;font-weight:600}.cs-msg{margin:10px 0;padding:10px 12px;border-radius:12px;background:#fff8e6;font-size:.9rem}.cs-msg p{margin:4px 0}.cs-diff{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:6px 0 10px;padding:10px 12px;border-radius:12px;background:var(--soft,#eef6f6)}.cs-diff small{display:block;color:var(--muted,#667);font-size:.8rem}.cs-diff b{display:block;font-size:1.5rem;color:var(--teal,#0b6b6f)}.cs-diff span{font-size:.8rem;color:var(--muted,#667)}.cs-sup input.p{width:110px}@media (max-width:640px){.cs-sup input.p{width:78px}.cs-sup th,.cs-sup td{padding:6px 4px;font-size:.82rem}.cs-sup .cs-u{display:block}}.cs-up{color:#b3261e}.cs-dn{color:#2e7d32}@media (max-width:640px){.cs-prac th:nth-child(4),.cs-prac td:nth-child(4){display:none}.cs-prac{font-size:.85rem}}';
  document.head.appendChild(css);
})();
