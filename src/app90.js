/* ===== 1.8: cobrar con varios medios de pago a la vez, recargos por cuotas configurados en cada consultorio (Ajustes) y toda corrección con su motivo ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(Math.round(n || 0));
  const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; };
  const pnum = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.').replace(/[−–]/g, '-'); const n = parseFloat(s); return isFinite(n) ? n : null; };
  const pctTxt = p => (p > 0 ? '+' : p < 0 ? '−' : '') + String(Math.round(Math.abs(p) * 100) / 100).replace('.', ',') + '%';
  const who = () => { try { return (A.actor && A.actor().who) || ''; } catch (e) { return ''; } };
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const METHS = () => (A.METHODS || ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago']).filter(x => !/obra social/i.test(x));
  const CUOTAS = [1, 2, 3, 4, 5, 6, 9, 10, 12, 18, 24];

  /* =====================================================================
     1. RECARGOS DE CADA CONSULTORIO
     A.CFG.payRates = { 'Crédito': { p: 0, cuo: true, c: { 1: 10, 2: 25, 3: 25, 6: 25 } }, 'Efectivo': { p: -5 } … }
     ===================================================================== */
  const RATES = () => A.CFG.payRates || {};
  const hasCuotas = meth => !!(RATES()[meth] && RATES()[meth].cuo) || (/cr[eé]dito/i.test(meth) && !(RATES()[meth] && RATES()[meth].cuo === false));
  A.payRate = (meth, n) => {
    const r = RATES()[meth]; if (!r) return 0;
    if (hasCuotas(meth) && r.c) { const k = Object.keys(r.c).map(Number).filter(x => x <= (n || 1) && r.c[x] !== '' && r.c[x] != null).sort((a, b) => b - a)[0]; if (k != null) return +r.c[k] || 0; }
    return +r.p || 0;
  };
  const configured = () => Object.keys(RATES()).some(k => { const r = RATES()[k]; return (+r.p) || (r.c && Object.keys(r.c).some(x => +r.c[x])); });
  A.acts.payRatesOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'payRates', back: S.modal && S.modal.type !== 'ajustes' ? S.modal : null }; A.renderModal(); };
  MF.payRates = m => {
    const R = RATES(), ok = boss();
    let b = '<p class="m-lead">Lo que se le suma (recargo) o se le descuenta al paciente según cómo paga. Queda fijo para este consultorio: la secretaria no tiene que acordarse ni hacer cuentas. Si en un cobro se cambia, la app pide el motivo.</p>';
    b += '<div class="pr-list">' + METHS().map(k => {
      const r = R[k] || {}, cuo = hasCuotas(k);
      return '<section class="pr-m"><div class="pr-mh"><b>' + esc(k) + '</b>' + (ok ? '<label class="pr-cuo"><input type="checkbox" data-pr="' + esc(k) + '" data-f="cuo"' + (cuo ? ' checked' : '') + '> Se paga en cuotas</label>' : '') + '</div>' +
        (cuo ? '<div class="pr-cs">' + CUOTAS.map(n => '<label class="pr-c"><span>' + (n === 1 ? '1 pago' : n + ' cuotas') + '</span><span class="pr-in"><input inputmode="decimal" data-pr="' + esc(k) + '" data-f="c" data-n="' + n + '" value="' + (r.c && r.c[n] != null ? String(r.c[n]).replace('.', ',') : '') + '" placeholder="—"' + (ok ? '' : ' disabled') + ' aria-label="Recargo con ' + esc(k) + ' en ' + n + ' cuotas"><i>%</i></span></label>').join('') + '</div><small class="pr-h">Si dejás una vacía, se usa la de menos cuotas que tenga valor.</small>'
          : '<label class="pr-c one"><span>Recargo o descuento</span><span class="pr-in"><input inputmode="decimal" data-pr="' + esc(k) + '" data-f="p" value="' + (r.p ? String(r.p).replace('.', ',') : '') + '" placeholder="0"' + (ok ? '' : ' disabled') + ' aria-label="Recargo con ' + esc(k) + '"><i>%</i></span></label>') + '</section>';
    }).join('') + '</div>';
    b += '<p class="hint">Para un <b>descuento</b> poné el número con un menos adelante (por ejemplo, −10 = 10% de descuento pagando en efectivo).</p>';
    if (!ok) b += '<p class="hint warn">Solo el dueño o la administración pueden cambiar estos valores.</p>';
    return A.modalShell('Medios de pago y recargos', b, '<button class="btn" data-act="payRatesClose">' + (ok ? 'Cancelar' : 'Cerrar') + '</button>' + (ok ? '<button class="btn primary" data-act="payRatesSave">Guardar</button>' : ''));
  };
  document.addEventListener('change', e => { const t = e.target; if (t && t.getAttribute && t.getAttribute('data-f') === 'cuo' && S.modal && S.modal.type === 'payRates') { readRates(); A.renderModal(); } }, true);
  function readRates() {
    const R = JSON.parse(JSON.stringify(RATES()));
    A.$$('#modalHost [data-pr]').forEach(i => {
      const k = i.getAttribute('data-pr'), f = i.getAttribute('data-f'), r = R[k] = R[k] || {};
      if (f === 'cuo') r.cuo = i.checked;
      else if (f === 'p') { const v = pnum(i.value); r.p = v == null ? 0 : v; }
      else if (f === 'c') { r.c = r.c || {}; const v = pnum(i.value); if (v == null) delete r.c[i.getAttribute('data-n')]; else r.c[i.getAttribute('data-n')] = v; }
    });
    A.CFG.payRates = R;
  }
  A.acts.payRatesSave = () => {
    readRates(); A.save(); if (A.cjLog) A.cjLog('config', 'Cambió los recargos por medio de pago y cuotas');
    const back = S.modal.back; S.modal = back || null; A.renderModal(); A.toast('Recargos guardados para este consultorio.');
  };
  A.acts.payRatesClose = () => { const back = S.modal.back; S.modal = back || null; A.renderModal(); };
  /* entrada en Ajustes › Consultorio (solo dueño o administración) */
  function mountMenu() {
    if (!boss() || document.getElementById('drPayRates')) return;
    const ref = document.querySelector('#gearMenu .aj-sec .dnav[data-act="osOpen"]') || document.querySelector('#gearMenu .aj-sec .dnav[data-act="catalogOpen"]'); if (!ref) return;
    const b = ref.cloneNode(true); b.id = 'drPayRates'; b.setAttribute('data-act', 'payRatesOpen'); [].slice.call(b.attributes).forEach(a => { if (/^data-/.test(a.name) && a.name !== 'data-act') b.removeAttribute(a.name); });
    const t = b.querySelector('.t') || b.querySelector('span'); if (t) t.innerHTML = 'Medios de pago y recargos<small>Recargo por cuotas de tarjeta, descuento en efectivo</small>';
    ref.after(b);
  }
  mountMenu(); setTimeout(mountMenu, 1500);
  const arPrev = A.afterRefresh; A.afterRefresh = () => { if (arPrev) arPrev(); try { mountMenu(); } catch (e) { /* nada */ } };

  /* =====================================================================
     2. VARIOS MEDIOS DE PAGO
     m.pl = [{ meth, amt (parte del precio; la última línea es «el resto»), n (cuotas), pct (null = el del consultorio), why }]
     ===================================================================== */
  const initPl = (m, meth) => { if (!m.pl) m.pl = [{ meth: meth || 'Efectivo', amt: 0, n: 1, pct: null, why: '' }]; return m.pl; };
  A.payLines = (m, base) => {
    const L = initPl(m), out = []; let left = base;
    L.forEach((l, i) => {
      const last = i === L.length - 1, b = last ? Math.max(0, left) : Math.max(0, Math.min(l.amt || 0, left));
      left -= b;
      const n = hasCuotas(l.meth) ? (l.n || 1) : 1, def = A.payRate(l.meth, n), pct = l.pct == null ? def : l.pct;
      const rec = Math.round(b * pct / 100), total = b + rec;
      out.push({ i, meth: l.meth, base: b, n, pct, def, over: l.pct != null && Math.abs(l.pct - def) > 0.001, why: l.why || '', rec, total, each: n > 1 ? Math.ceil(total / n) : total, last });
    });
    return out;
  };
  A.payLinesHTML = (m, base) => {
    const L = A.payLines(m, base), multi = L.length > 1, rec = L.reduce((s, l) => s + l.rec, 0), tot = L.reduce((s, l) => s + l.total, 0);
    let h = '<div class="pl-box"><div class="pl-hd">¿Cómo paga?</div>';
    L.forEach(l => {
      h += '<div class="pl-ln"><div class="pl-r1"><select data-chg="plMeth" data-i="' + l.i + '" aria-label="Medio de pago">' + METHS().map(x => '<option' + (x === l.meth ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
        (multi ? (l.last ? '<span class="pl-rest">el resto: <b>' + money(l.base) + '</b></span>' : '<span class="po-amt pl-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-chg="plAmt" data-i="' + l.i + '" value="' + (l.base || '') + '" placeholder="¿cuánto?" aria-label="Cuánto paga con ' + esc(l.meth) + '"></span>') : '') +
        (multi ? '<button type="button" class="pl-x" data-act="plDel" data-i="' + l.i + '" aria-label="Quitar este medio">✕</button>' : '') + '</div>';
      h += '<div class="pl-r2">' + (hasCuotas(l.meth) ? '<select data-chg="plN" data-i="' + l.i + '" aria-label="Cuotas">' + CUOTAS.map(n => '<option value="' + n + '"' + (n === l.n ? ' selected' : '') + '>' + (n === 1 ? '1 pago' : n + ' cuotas') + '</option>').join('') + '</select>' : '') +
        '<label class="pl-pct"><span>' + (l.pct < 0 ? 'Descuento' : 'Recargo') + '</span><span class="pr-in"><input inputmode="decimal" data-chg="plPct" data-i="' + l.i + '" value="' + String(l.pct).replace('.', ',') + '" aria-label="Recargo o descuento en %"><i>%</i></span></label>' +
        '<span class="pl-res">' + (l.rec ? (l.rec > 0 ? '+ ' : '− ') + money(Math.abs(l.rec)) + ' → ' : '') + 'paga <b>' + money(l.total) + '</b>' + (l.n > 1 ? ' (' + l.n + ' cuotas de ' + money(l.each) + ')' : '') + '</span></div>';
      if (l.over) h += '<div class="pl-over"><small>El consultorio tiene ' + pctTxt(l.def) + ' para ' + esc(l.meth) + (l.n > 1 ? ' en ' + l.n + ' cuotas' : '') + '. ¿Por qué lo cambiás? <button type="button" class="pl-reset" data-act="plReset" data-i="' + l.i + '">Volver a ' + pctTxt(l.def) + '</button></small><input data-in="plWhy" data-i="' + l.i + '" value="' + esc(l.why) + '" placeholder="Obligatorio · lo ve el dueño (ej.: promo del banco)"></div>';
    });
    h += '<button type="button" class="btn small ghost pl-add" data-act="plAdd">+ Pagar una parte con otro medio</button>';
    h += '<div class="pl-sum"><span>Precio ' + money(base) + (rec ? ' · ' + (rec > 0 ? 'recargos +' : 'descuentos −') + money(Math.abs(rec)) : '') + '</span><b>Paga en total ' + money(tot) + '</b></div>';
    if (!configured() && boss()) h += '<p class="hint pl-cfg">Todavía no cargaste los recargos de la tarjeta para este consultorio. <button type="button" class="btn small" data-act="payRatesOpen">Configurarlos</button></p>';
    return h + '</div>';
  };
  let plT = 0;
  const plRe = () => { clearTimeout(plT); plT = setTimeout(() => { if (!S.modal) return; const b = $('#modalHost .m-body'), t = b ? b.scrollTop : 0, f = document.activeElement, fk = f && f.getAttribute ? [f.getAttribute('data-chg') || f.getAttribute('data-in'), f.getAttribute('data-i')] : null; A.renderModal(); const b2 = $('#modalHost .m-body'); if (b2) b2.scrollTop = t; if (fk && fk[0]) { const n = document.querySelector('#modalHost [data-chg="' + fk[0] + '"][data-i="' + fk[1] + '"], #modalHost [data-in="' + fk[0] + '"][data-i="' + fk[1] + '"]'); if (n && n.focus) n.focus(); } }, 0); };
  const plSync = () => { const m = S.modal; if (!m || !m.pl) return; A.$$('[data-in="plWhy"]').forEach(i => { const l = m.pl[+i.getAttribute('data-i')]; if (l) l.why = i.value; }); };
  A.chg.plMeth = el => { plSync(); const l = S.modal.pl[+el.getAttribute('data-i')]; if (!l) return; l.meth = el.value; l.pct = null; l.why = ''; if (!hasCuotas(l.meth)) l.n = 1; plRe(); };
  A.chg.plAmt = el => { plSync(); const l = S.modal.pl[+el.getAttribute('data-i')]; if (l) l.amt = num(el.value); plRe(); };
  A.chg.plN = el => { plSync(); const l = S.modal.pl[+el.getAttribute('data-i')]; if (!l) return; l.n = +el.value || 1; l.pct = null; l.why = ''; plRe(); };
  A.chg.plPct = el => { plSync(); const l = S.modal.pl[+el.getAttribute('data-i')]; if (!l) return; const v = pnum(el.value); l.pct = v == null ? null : v; plRe(); };
  A.ins.plWhy = el => { const l = S.modal.pl[+el.getAttribute('data-i')]; if (l) l.why = el.value; };
  A.acts.plReset = el => { plSync(); const l = S.modal.pl[+el.getAttribute('data-i')]; if (l) { l.pct = null; l.why = ''; } plRe(); };
  A.acts.plAdd = () => {
    plSync(); const m = S.modal, base = baseOf(m), L = A.payLines(m, base), half = L.length === 1 ? Math.round(base / 2 / 100) * 100 : 0;
    if (L.length === 1) m.pl[0].amt = half || 0; else { const last = m.pl[m.pl.length - 1]; last.amt = L[L.length - 1].base; }
    const used = m.pl.map(l => l.meth), next = METHS().filter(x => used.indexOf(x) < 0)[0] || 'Efectivo';
    m.pl.push({ meth: /cr[eé]dito/i.test(METHS().join(' ')) && used.indexOf('Crédito') < 0 ? 'Crédito' : next, amt: 0, n: 1, pct: null, why: '' }); plRe();
  };
  A.acts.plDel = el => { plSync(); const m = S.modal; m.pl.splice(+el.getAttribute('data-i'), 1); if (m.pl.length === 1) m.pl[0].amt = 0; plRe(); };
  const plCheck = (m, base) => {
    plSync(); const L = A.payLines(m, base);
    const sumNotLast = L.slice(0, -1).reduce((s, l) => s + l.base, 0);
    if (L.length > 1 && L.slice(0, -1).some(l => !l.base)) return 'Poné cuánto paga con cada medio (el último se completa solo con el resto).';
    if (L.length > 1 && sumNotLast >= base) return 'Lo que pusiste en los primeros medios ya cubre todo el precio: sacá uno o bajá el importe.';
    const nw = L.filter(l => l.over && !String(l.why).trim())[0]; if (nw) return 'Contá por qué cambiaste el recargo de ' + nw.meth + ': lo ve el dueño.';
    return '';
  };
  /* asentar los recargos/descuentos en la cuenta del paciente (así la plata cierra) */
  const bookRec = (pid, L, extra) => {
    const pd = A.pd(pid), at = new Date().toISOString(), by = who();
    L.forEach(l => {
      if (!l.rec) return;
      pd.ledger.push(Object.assign({ id: A.uid(), date: A.today(), type: 'ajuste', amount: l.rec, desc: (l.rec > 0 ? 'Recargo ' : 'Descuento ') + pctTxt(l.pct).replace('+', '') + ' por pagar ' + money(l.base) + ' con ' + l.meth + (l.n > 1 ? ' en ' + l.n + ' cuotas' : '') + (l.over ? ' · cambiado a mano (lista: ' + pctTxt(l.def) + '): ' + l.why : ''), adj: { k: 'pl', p: l.pct, n: l.n, base: l.base, meth: l.meth, def: l.def }, plOver: l.over ? 1 : undefined, why: l.over ? l.why : undefined, by, at }, extra || {}));
      if (l.over && A.cjLog) A.cjLog('correccion', 'Cambió el recargo de ' + l.meth + ' de ' + pctTxt(l.def) + ' a ' + pctTxt(l.pct) + ' (' + ((A.PAT(pid) || {}).name || '') + '): ' + l.why);
    });
  };

  /* ---------- en «Cobrar» (lo que mandó el odontólogo) ---------- */
  const baseOf = m => (m && m.type === 'pcPay') ? (m.tot + (m.addPrev ? m.prev : 0)) : m && m.type === 'preCob' ? m.lines.reduce((s, l) => s + (l.amt || 0) * (l.qty || 1), 0) : 0;
  const pcPrev = MF.pcPay;
  MF.pcPay = m => {
    initPl(m, m.m1); m.adj = { k: 'none' }; m.split = false;
    let h = pcPrev(m); const base = baseOf(m);
    if (!(base > 0) && (m.ids || []).length) return h.replace('<div class="hint" id="ppMsg">', '<p class="pl-zero">Hoy no paga nada. Tocá «Listo» y queda registrado.</p><div class="hint" id="ppMsg">').replace(/(data-act="ppGo"[^>]*>)Cobrar</, (a, b) => b + 'Listo, no paga nada<').replace(/<button class="btn ghost" data-act="ppDebt">[^<]*<\/button>/, '');
    h = h.replace('<div class="hint" id="ppMsg">', () => A.payLinesHTML(m, base) + '<div class="hint" id="ppMsg">');
    return h.replace(/(data-act="ppGo"[^>]*>)Cobrar</, (a, b) => b + 'Cobrar ' + money(A.payLines(m, base).reduce((s, l) => s + l.total, 0)) + '<');
  };
  const ppPrev = A.acts.ppGo;
  A.acts.ppGo = function () {
    const m = S.modal; if (!m || m.type !== 'pcPay' || !m.pl) return ppPrev.apply(this, arguments);
    const base = baseOf(m), err = plCheck(m, base);
    if (err) { const o = $('#ppMsg'); if (o) { o.className = 'hint bad'; o.textContent = err; } return; }
    const L = A.payLines(m, base);
    m.plLines = L.filter(l => l.total > 0);
    m._plBook = () => bookRec(m.pid, L, { pcIds: (m.ids || []).slice() });
    return ppPrev.apply(this, arguments);
  };
  /* el ajuste se asienta justo antes de crear los pagos (después de las correcciones de recepción) */
  const settleHook = () => {
    const m = S.modal; if (!m || !m._plBook) return;
    const rec = (m.plLines || []).reduce((s, l) => s + l.rec, 0); m._plBook(); m._plBook = null; m.tot = m.tot + rec;
  };
  const ddPrev = A.acts.ppDebt;
  if (ddPrev) A.acts.ppDebt = function () { const m = S.modal; if (m) m.plLines = null; return ddPrev.apply(this, arguments); };
  /* el recargo va a la cuenta cuando se crean los pagos: lo hace este hook que app40 llama si existe */
  A.plBeforePay = settleHook;

  /* ---------- en «Cobrar antes de atender» ---------- */
  const preRender = MF.preCob;
  if (preRender) MF.preCob = m => {
    initPl(m, m.meth);
    let h = preRender(m); const base = baseOf(m);
    h = h.replace(/<div class="field pc-meth">[\s\S]*?<\/select><\/div>/, () => A.payLinesHTML(m, base));
    const tot = A.payLines(m, base).reduce((s, l) => s + l.total, 0);
    return h.replace(/(id="pcGoBtn">)Cobrar [^<]*/, (a, b) => b + 'Cobrar ' + money(tot));
  };
  /* al cambiar el importe de una práctica, se redibuja el «¿cómo paga?» cuando se sale del campo */
  document.addEventListener('change', e => { const t = e.target; if (t && t.getAttribute && t.getAttribute('data-in') === 'pcAmt' && S.modal && S.modal.type === 'preCob') { const p = A.ins.pcAmt; if (p) p(t); plRe(); } }, true);
  const pcGoPrev = A.acts.pcGo;
  if (pcGoPrev) A.acts.pcGo = function () {
    const m = S.modal; if (!m || m.type !== 'preCob' || !m.pl) return pcGoPrev.apply(this, arguments);
    A.$$('[data-in="pcAmt"]').forEach(i => { const l = m.lines[+i.getAttribute('data-i')]; if (l) l.amt = num(i.value); });
    const base = baseOf(m), err = base > 0 ? plCheck(m, base) : '';
    if (err) { const o = $('#pcMsg'); if (o) o.textContent = err; return; }
    const L = base > 0 ? A.payLines(m, base).filter(l => l.total > 0) : [];
    const pid = m.pid, pd = A.pd(pid), n0 = (pd.pre || []).length;
    m.meth = L[0] ? L[0].meth : m.meth;
    const r = pcGoPrev.apply(this, arguments);
    try {
      const rr = (pd.pre || [])[n0]; if (!rr || !L.length) return r;
      const first = pd.ledger.filter(e => e.id === rr.payIds[0])[0]; if (!first) return r;
      const one = l => ({ amount: l.total, method: l.meth, cuotas: l.n > 1 ? l.n : undefined, rec: l.rec || undefined, recPct: l.rec ? l.pct : undefined });
      Object.assign(first, one(L[0])); if (L[0].n > 1) first.desc += ' · ' + L[0].n + ' cuotas';
      L.slice(1).forEach(l => {
        pd.rcpSeq = (pd.rcpSeq || 0) + 1;
        const e = Object.assign({}, first, one(l), { id: A.uid(), rcp: String(first.rcp || '').replace(/-\d+$/, '-' + pd.rcpSeq), desc: String(first.desc || '').replace(/ · \d+ cuotas$/, '') + (l.n > 1 ? ' · ' + l.n + ' cuotas' : '') });
        pd.ledger.push(e); rr.payIds.push(e.id);
      });
      bookRec(pid, L, { pre: rr.id });
      rr.paidTotal = L.reduce((s, l) => s + l.total, 0); rr.methods = L.map(l => l.meth + (l.n > 1 ? ' ' + l.n + 'c' : '') + ' ' + money(l.total)).join(' + ');
      pd.ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      A.touchPd(pid); A.save(); A.refresh();
    } catch (e) { if (A.logError) A.logError('plPre', e); }
    return r;
  };

  /* estilos (solo tokens del tema) */
  const css = document.createElement('style');
  css.textContent = '.m-body:has(.pl-box) .pp-row,.m-body:has(.pl-box) [data-act="ppSplit"],.m-body:has(.pl-box) .aj-box,.m-body:has(.pl-zero) .pp-row,.m-body:has(.pl-zero) [data-act="ppSplit"],.m-body:has(.pl-zero) .aj-box{display:none!important}.pl-zero{margin:8px 0;padding:10px 12px;border-radius:12px;background:var(--accent-soft);color:var(--ink);font-weight:600}' +
    '.pl-box{border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin:10px 0 6px;background:var(--surface)}.pl-hd{font-weight:700;margin-bottom:6px}' +
    '.pl-ln{padding:8px 0;border-top:1px solid var(--line)}.pl-ln:first-of-type{border-top:0;padding-top:0}' +
    '.pl-r1{display:flex;gap:8px;align-items:center}.pl-r1 select{flex:1;min-width:0}.pl-amt{flex:0 0 130px;display:flex;align-items:center;gap:4px}.pl-amt input{width:100%;min-width:0}.pl-rest{flex:0 0 auto;font-size:.9rem;color:var(--ink-2)}.pl-rest b{color:var(--ink)}' +
    '.pl-x{background:none;border:0;color:var(--ink-2);font-size:1rem;cursor:pointer;padding:4px 6px}' +
    '.pl-r2{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px;font-size:.9rem}.pl-pct{display:flex;align-items:center;gap:6px;color:var(--ink-2)}' +
    '.pr-in{display:inline-flex;align-items:center;gap:2px}.pr-in input{width:62px;text-align:right;padding:4px 6px}.pr-in i{font-style:normal;color:var(--ink-2)}.pl-res{margin-left:auto}' +
    '.pl-over{margin-top:6px;display:flex;flex-direction:column;gap:4px}.pl-over small{color:var(--ink-2)}.pl-over input{border:1px solid var(--warn,#e8a33d);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink);font:inherit;font-size:.9rem}.pl-reset{background:none;border:0;color:var(--accent);cursor:pointer;font:inherit;font-size:.85rem;padding:0 0 0 4px}' +
    '.pl-add{margin-top:6px}.pl-sum{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);margin-top:8px;padding-top:8px}.pl-sum span{color:var(--ink-2);font-size:.9rem}.pl-sum b{font-size:1.15rem}' +
    '.pr-c>span:first-child{border:0!important;background:none!important;padding:0!important;box-shadow:none!important;min-height:0!important}.pr-list{display:flex;flex-direction:column;gap:10px}.pr-m{border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:var(--surface)}.pr-mh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.pr-cuo{display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--ink-2)}.pr-cs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px}.pr-c{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:.9rem}.pr-c.one{max-width:280px}.pr-h{display:block;margin-top:4px;color:var(--ink-2);font-size:.78rem}' +
    '@media (max-width:600px){.pr-cs{grid-template-columns:1fr}.pl-amt{flex-basis:112px}}';
  document.head.appendChild(css);
})();
