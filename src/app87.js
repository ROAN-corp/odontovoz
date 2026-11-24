/* ===== 1.6: facturas y resumen para el contador; obras sociales (presentada, débitos, retenciones, reclamos); liquidaciones claras (adelantos, gastos a cargo del profesional, confirmación y pago que no se borra) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(Math.round(n || 0));
  const num = v => /\d/.test(String(v == null ? '' : v)) ? A.parseMoney(v) : null;   /* 1.18: acepta centavos */
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const who = () => { try { return (A.actor && A.actor().who) || ''; } catch (e) { return ''; } };
  const stamp = () => ({ at: new Date().toISOString(), by: who() });
  const T = () => A.today();
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monName = mk => MON[+mk.slice(5) - 1] + ' ' + mk.slice(0, 4);
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : (p || s + 's'));
  const C = () => { const c = S.cash || (S.cash = { moves: [], closes: [] }); ['moves', 'voids', 'log'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; }); if (!c.fact || typeof c.fact !== 'object') c.fact = {}; return c; };
  const log = (k, t) => { if (A.cjLog) A.cjLog(k, t); };
  const card = (t, body, cls) => '<section class="card cj-card' + (cls ? ' ' + cls : '') + '">' + (t ? '<h2>' + t + '</h2>' : '') + body + '</section>';

  /* =================== FACTURAS =================== */
  const factOf = id => C().fact[id] || null;
  A.cjFactHTML = mk => {
    const on = A.CFG.factOn;
    if (on === undefined) return boss() ? card('Facturas', '<p>¿Hacés factura (o recibo de ARCA) de lo que cobrás a los pacientes?</p><p class="small-note">Si decís que sí, la app te va avisando qué cobros todavía no tienen factura, así no se escapa ninguno y no te pasás del tope del monotributo.</p><div class="cj-acts"><button class="btn primary" data-act="cjFactOn" data-v="1">Sí, hago factura</button><button class="btn" data-act="cjFactOn" data-v="0">No por ahora</button></div>') : '';
    if (!on) return '';
    const P = (A.cjPays ? A.cjPays() : []).filter(p => p.date.slice(0, 7) === mk && p.amt > 0);
    const sin = P.filter(p => !factOf(p.id)), hechas = P.filter(p => { const f = factOf(p.id); return f && !f.no; });
    const fsum = hechas.reduce((s, p) => s + p.amt, 0), ssum = sin.reduce((s, p) => s + p.amt, 0);
    /* últimos 12 meses facturados (para el tope del monotributo) */
    const lo = A.addMonths(T(), -12).slice(0, 7) + '-01'; let y12 = 0; (A.cjPays ? A.cjPays() : []).forEach(p => { const f = factOf(p.id); if (f && !f.no && p.date >= lo) y12 += p.amt; });
    const tope = +A.CFG.monoTope || 0, pct = tope ? Math.round(y12 / tope * 100) : 0;
    let b = '<div class="cj-big3"><div class="cj-b"><small>Facturado en ' + MON[+mk.slice(5) - 1] + '</small><b>' + money(fsum) + '</b><span>' + plural(hechas.length, 'cobro') + '</span></div><div class="cj-b ' + (sin.length ? 'bad' : '') + '"><small>Sin factura</small><b>' + money(ssum) + '</b><span>' + plural(sin.length, 'cobro') + '</span></div><div class="cj-b"><small>Últimos 12 meses</small><b>' + money(y12) + '</b><span>' + (tope ? pct + '% del tope del monotributo' : (boss() ? '<button class="btn small ghost" data-act="cjTope">Poner el tope</button>' : '')) + '</span></div></div>';
    if (tope) b += '<div class="bar" style="margin:8px 0"><i style="width:' + Math.min(100, pct) + '%;' + (pct >= 85 ? 'background:#c0392b' : pct >= 70 ? 'background:#e8a33d' : '') + '"></i></div>' + (pct >= 85 ? '<div class="cj-diff bad">Estás cerca del tope de tu categoría. Hablalo con tu contador.</div>' : '');
    if (sin.length) b += '<p class="small-note">Cuando hagas la factura, poné el número (o dejalo vacío) y tocá «Hecha». Si ese cobro no lleva factura, tocá «No lleva».</p><div class="cj-rows">' + sin.slice(0, S._cjAllFact ? 999 : 25).map(p => '<div class="cj-row"><i class="cj-dot warn"></i><div class="cj-who"><b>' + esc(p.name) + '</b><small>' + A.fmtDMY(p.date) + ' · ' + esc(p.method) + '</small></div><b class="cj-amt">' + money(p.amt) + '</b><input class="cj-sm cj-fn" data-fid="' + p.id + '" placeholder="N.º" aria-label="Número de factura"><button class="btn small primary" data-act="cjFact" data-id="' + p.id + '">Hecha</button><button class="btn small ghost" data-act="cjFactNo" data-id="' + p.id + '">No lleva</button></div>').join('') + '</div>' + (sin.length > 25 && !S._cjAllFact ? '<button class="btn small ghost" data-act="cjAllFact">Ver los ' + sin.length + '</button>' : '');
    else if (P.length) b += '<div class="cj-light ok" style="margin-top:8px"><b>✓ Todos los cobros del mes tienen factura</b></div>';
    return card('Facturas', b + (boss() ? '<div class="cj-acts" style="margin-top:8px"><button class="btn small ghost" data-act="cjTope">Tope del monotributo</button><button class="btn small ghost" data-act="cjFactOn" data-v="0">No hago factura</button></div>' : ''));
  };
  A.acts.cjFactOn = el => { A.CFG.factOn = el.getAttribute('data-v') === '1'; A.save(); A.refresh(); };
  A.acts.cjAllFact = () => { S._cjAllFact = true; A.refresh(); };
  A.acts.cjFact = el => { const id = el.getAttribute('data-id'), i = document.querySelector('.cj-fn[data-fid="' + id + '"]'); C().fact[id] = Object.assign({ n: i ? i.value.trim() : '' }, stamp()); log('factura', 'Marcó factura hecha' + (i && i.value ? ' N.º ' + i.value.trim() : '')); A.save(); A.refresh(); };
  A.acts.cjFactNo = el => { C().fact[el.getAttribute('data-id')] = Object.assign({ no: 1 }, stamp()); A.save(); A.refresh(); };
  A.acts.cjTope = () => { S.modal = { type: 'cjTope' }; A.renderModal(); };
  MF.cjTope = () => A.modalShell('Tope del monotributo', '<p class="m-lead">Es lo máximo que podés facturar en 12 meses en tu categoría. Lo sabe tu contador o lo ves en la web de ARCA. La app te avisa cuando te acercás.</p><div class="field"><label for="cjTopeIn">Tope anual de tu categoría</label><input id="cjTopeIn" inputmode="numeric" value="' + (A.CFG.monoTope || '') + '" placeholder="$"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjTopeGo">Guardar</button>');
  A.acts.cjTopeGo = () => { A.CFG.monoTope = num($('#cjTopeIn').value) || 0; A.save(); S.modal = null; A.renderModal(); A.refresh(); };

  /* =================== RESUMEN PARA EL CONTADOR =================== */
  function monthData(mk) {
    const lo = mk + '-01', hi = mk + '-31', inR = d => d >= lo && d <= hi, R = [];
    (A.cjPays ? A.cjPays() : []).forEach(p => { if (!inR(p.date)) return; const f = factOf(p.id); R.push({ d: p.date, tipo: 'Cobro a paciente', det: p.name, medio: p.method, imp: p.amt, com: p.fee, fac: f ? (f.no ? 'no lleva' : 'sí ' + (f.n || '')) : 'no', por: '' }); });
    C().moves.forEach(m => { if (m.status === 'pendiente' || !inR(m.date)) return; R.push({ d: m.date, tipo: m.type === 'ingreso' ? 'Otro ingreso' : m.cat === 'retiro' ? 'Retiro del dueño' : 'Gasto · ' + A.cashCatName(m.cat), det: (m.prov ? m.prov + ' · ' : '') + (m.desc || ''), medio: m.method || '', imp: m.type === 'ingreso' ? +m.amount : -m.amount, com: 0, fac: '', por: m.by || '' }); });
    const OP = A.CFG.osPay || {}; Object.keys(OP).forEach(os => Object.keys(OP[os] || {}).forEach(k => { const r = OP[os][k]; if (!r || !inR(r.date || '')) return; const o = (A.osList ? A.osList() : []).filter(x => x.id === os)[0]; R.push({ d: r.date, tipo: 'Pago de obra social', det: ((o && o.sigla) || os) + ' (' + monName(k) + ')' + (r.ret ? ' · retenciones ' + money((r.ret.gan || 0) + (r.ret.iibb || 0) + (r.ret.otr || 0)) : '') + (r.deb ? ' · débito ' + money(r.deb) : ''), medio: 'Transferencia', imp: +r.amt, com: 0, fac: '', por: r.by || '' }); }));
    return R.sort((a, b) => (a.d < b.d ? -1 : 1));
  }
  A.acts.cjAcctCsv = el => {
    const mk = el.getAttribute('data-m'), R = monthData(mk), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '﻿' + ['Fecha;Tipo;Detalle;Medio;Importe;Comisión;Factura;Cargó'].concat(R.map(r => [A.fmtDMY(r.d), r.tipo, r.det, r.medio, r.imp, r.com || '', r.fac, r.por].map(q).join(';'))).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'caja-' + mk + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  A.acts.cjAcctPdf = el => {
    const mk = el.getAttribute('data-m'), n = A.cjPeriod(mk + '-01', mk + '-31'), o = A.pdfDoc_ && A.pdfDoc_('Resumen ' + monName(mk)); if (!o) return;
    o.head('Resumen de caja para el contador', A.cap(monName(mk)) + ' · ' + A.CLINIC, null, '');
    o.h('Resultado del mes'); o.rows([['Cobros a pacientes', money(n.cob)], ['Pagos de obras sociales', money(n.os)], ['Otros ingresos', money(n.ing)], ['Total que entró', money(n.entro)], ['Gastos', '-' + money(n.gas)], ['Comisiones de tarjetas y Mercado Pago', '-' + money(n.fees)], ['Total que salió', '-' + money(n.salio)], [n.gano >= 0 ? 'Ganancia del mes' : 'Pérdida del mes', money(n.gano)], ['Retiros del dueño (aparte)', money(n.ret)]]);
    const ks = Object.keys(n.byCat).sort((a, b) => n.byCat[b] - n.byCat[a]); if (ks.length) { o.h('Gastos por categoría'); o.rows(ks.map(k => [A.cashCatName(k), money(n.byCat[k])])); }
    const pm = Object.keys(n.pm); if (pm.length) { o.h('Cobros a pacientes por medio de pago'); o.rows(pm.map(k => [k, money(n.pm[k])])); }
    if (A.CFG.factOn) { const P = (A.cjPays ? A.cjPays() : []).filter(p => p.date.slice(0, 7) === mk && p.amt > 0); let f = 0, s = 0, nl = 0; P.forEach(p => { const x = factOf(p.id); if (!x) s += p.amt; else if (x.no) nl += p.amt; else f += p.amt; }); o.h('Facturación'); o.rows([['Facturado', money(f)], ['Sin factura todavía', money(s)], ['No lleva factura', money(nl)]]); }
    const OP = A.CFG.osPay || {}, ret = []; Object.keys(OP).forEach(os => Object.keys(OP[os] || {}).forEach(k => { const r = OP[os][k]; if (r && (r.date || '').slice(0, 7) === mk && r.ret) { const os0 = (A.osList ? A.osList() : []).filter(x => x.id === os)[0]; ret.push([((os0 && os0.sigla) || os) + ' (' + monName(k) + ')', 'Ganancias ' + money(r.ret.gan || 0) + ' · IIBB ' + money(r.ret.iibb || 0) + ' · otras ' + money(r.ret.otr || 0)]); } }));
    if (ret.length) { o.h('Retenciones que hicieron las obras sociales'); o.rows(ret); }
    const CL = (C().closes || []).filter(c => !c.re && c.date.slice(0, 7) === mk && c.diff); if (CL.length) { o.h('Cierres de caja con diferencias'); o.rows(CL.map(c => [A.fmtDMY(c.date), (c.diff > 0 ? 'sobraron ' : 'faltaron ') + money(Math.abs(c.diff)) + (c.note ? ' · ' + c.note : '')])); }
    o.h('Detalle de movimientos'); const R = monthData(mk);
    o.table([{ h: 'Fecha', w: 18 }, { h: 'Tipo', w: 36 }, { h: 'Detalle', w: 66 }, { h: 'Medio', w: 24 }, { h: 'Importe', w: 26, a: 'r' }], R.map(r => [A.fmtDMY(r.d).slice(0, 5), r.tipo, r.det + (r.fac && r.fac !== 'no' ? ' [fact. ' + r.fac + ']' : ''), r.medio, (r.imp < 0 ? '-' : '') + money(Math.abs(r.imp))]));
    return o.finish('caja-' + mk + '.pdf');
  };

  /* =================== OBRAS SOCIALES: presentada, débitos, retenciones =================== */
  const OP = () => A.CFG.osPay || (A.CFG.osPay = {});
  const PRES = () => A.CFG.osPres || (A.CFG.osPres = {});
  const dueRow = (os, mk) => (A.osDue ? A.osDue() : []).filter(r => r.os === os && r.month === mk)[0];
  A.acts.osPayNew = el => { const os = el.getAttribute('data-os'), mk = el.getAttribute('data-m'); S.modal = { type: 'osPay', os, m: mk }; A.renderModal(); };
  MF.osPay = m => {
    const r = dueRow(m.os, m.m) || { amt: 0, sigla: '' }, old = (OP()[m.os] || {})[m.m] || {};
    const rt = old.ret || {};
    return A.modalShell('Llegó el pago · ' + esc(r.sigla) + ' ' + monName(m.m),
      '<p class="m-lead">Presentaste <b>' + money(r.amt) + '</b>. Poné lo que entró al banco y lo que te retuvieron de impuestos (figura en el comprobante de pago). Si falta plata, la app lo anota como débito.</p>' +
      '<div class="row2"><div class="field"><label for="opAmt">Entró al banco</label><input id="opAmt" inputmode="numeric" data-in="opCalc" value="' + (old.amt != null ? old.amt : r.amt) + '"></div><div class="field"><label for="opDate">Fecha</label><input id="opDate" type="date" value="' + (old.date || T()) + '"></div></div>' +
      '<details class="cj-more"' + (old.ret ? ' open' : '') + '><summary>Me retuvieron impuestos</summary><div class="row3"><div class="field"><label for="opGan">Ganancias</label><input id="opGan" inputmode="numeric" data-in="opCalc" value="' + (rt.gan || '') + '"></div><div class="field"><label for="opIibb">Ingresos brutos</label><input id="opIibb" inputmode="numeric" data-in="opCalc" value="' + (rt.iibb || '') + '"></div><div class="field"><label for="opOtr">Otras</label><input id="opOtr" inputmode="numeric" data-in="opCalc" value="' + (rt.otr || '') + '"></div></div><p class="small-note">Las retenciones no se pierden: guardá el certificado para tu contador.</p></details>' +
      '<div id="opDeb"></div><div class="field" id="opWhyF"><label for="opWhy">¿Por qué te descontaron? (débito)</label><input id="opWhy" value="' + esc(old.debWhy || '') + '" placeholder="Ej.: faltó la radiografía de la 36, práctica no autorizada"></div><label class="chk" id="opRecF"><input type="checkbox" id="opRec"' + (old.rec ? ' checked' : '') + '> Lo voy a reclamar</label>' +
      '<div class="field"><label for="opNote">Nota (opcional)</label><input id="opNote" value="' + esc(old.note || '') + '" placeholder="Ej.: pagó por el círculo"></div><div id="opMsg" class="m-msg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="osPayGo">Guardar</button>');
  };
  const opRead = () => { const v = id => num(($(id) || {}).value) || 0; return { amt: num(($('#opAmt') || {}).value), ret: { gan: v('#opGan'), iibb: v('#opIibb'), otr: v('#opOtr') } }; };
  A.ins.opCalc = () => {
    const m = S.modal, r = dueRow(m.os, m.m) || { amt: 0 }, x = opRead(), rs = x.ret.gan + x.ret.iibb + x.ret.otr, deb = Math.max(0, r.amt - (x.amt || 0) - rs);
    const d = $('#opDeb'); if (d) d.innerHTML = deb ? '<div class="cj-diff warn">Te debitaron ' + money(deb) + '</div>' : (x.amt != null ? '<div class="cj-diff" style="background:color-mix(in srgb,#1e8a5a 12%,transparent)">Pagó todo lo presentado ✓</div>' : '');
    ['#opWhyF', '#opRecF'].forEach(s => { const e = $(s); if (e) e.hidden = !deb; });
  };
  A.modalAfter.osPay = () => A.ins.opCalc();
  A.acts.osPayGo = () => {
    const m = S.modal, r = dueRow(m.os, m.m) || { amt: 0 }, x = opRead();
    if (x.amt == null || x.amt < 0) { const e = $('#opMsg'); if (e) e.textContent = 'Poné cuánto entró al banco.'; return; }
    const rs = x.ret.gan + x.ret.iibb + x.ret.otr, deb = Math.max(0, r.amt - x.amt - rs), P = OP();
    P[m.os] = P[m.os] || {};
    P[m.os][m.m] = Object.assign({ amt: x.amt, date: ($('#opDate') || {}).value || T(), note: (($('#opNote') || {}).value || '').trim(), billed: r.amt, ret: rs ? x.ret : null, deb, debWhy: deb ? (($('#opWhy') || {}).value || '').trim() : '', rec: deb ? !!($('#opRec') || {}).checked : false }, stamp());
    log('os', 'Registró el pago de ' + (r.sigla || '') + ' ' + monName(m.m) + ': ' + money(x.amt) + (deb ? ' (débito ' + money(deb) + ')' : ''));
    A.save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Pago de la obra social registrado: ' + money(x.amt) + '.');
  };
  A.acts.osPres = el => { const os = el.getAttribute('data-os'), mk = el.getAttribute('data-m'), P = PRES(); P[os] = P[os] || {}; P[os][mk] = Object.assign({ date: T() }, stamp()); log('os', 'Marcó presentada ' + os + ' ' + monName(mk)); A.save(); A.refresh(); };
  A.acts.osPresUndo = el => { const os = el.getAttribute('data-os'), mk = el.getAttribute('data-m'), P = PRES(); if (P[os]) delete P[os][mk]; A.save(); A.refresh(); };
  A.acts.osRecOk = el => { S.modal = { type: 'osRecOk', os: el.getAttribute('data-os'), m: el.getAttribute('data-m') }; A.renderModal(); };
  MF.osRecOk = m => { const r = (OP()[m.os] || {})[m.m] || {}; return A.modalShell('Recuperaste el débito', '<p class="m-lead">Te habían debitado ' + money(r.deb) + '. ¿Cuánto recuperaste con el reclamo?</p><div class="field"><label for="orAmt">Recuperado</label><input id="orAmt" inputmode="numeric" value="' + (r.deb || '') + '"></div>', '<button class="btn" data-act="osRecLost" data-os="' + esc(m.os) + '" data-m="' + m.m + '">No se recuperó</button><button class="btn primary" data-act="osRecGo">Guardar</button>'); };
  A.acts.osRecGo = () => {
    const m = S.modal, r = (OP()[m.os] || {})[m.m]; const amt = num(($('#orAmt') || {}).value) || 0; if (!r) return;
    r.rec = 'ok'; r.recAmt = amt; r.recAt = new Date().toISOString();
    if (amt > 0) C().moves.push({ id: A.uid(), date: T(), type: 'ingreso', cat: 'osoc', desc: 'Reclamo recuperado · ' + (dueRow(m.os, m.m) || {}).sigla + ' ' + monName(m.m), amount: amt, method: 'Transferencia', status: 'pagado', by: who() });
    log('os', 'Recuperó ' + money(amt) + ' de un débito'); A.save(); S.modal = null; A.renderModal(); A.refresh();
  };
  A.acts.osRecLost = el => { const r = (OP()[el.getAttribute('data-os')] || {})[el.getAttribute('data-m')]; if (r) { r.rec = 'perdido'; log('os', 'Débito no recuperado'); A.save(); } S.modal = null; A.renderModal(); A.refresh(); };
  function osDeco() {
    const host = $('#view-caja'); if (!host || S.caja.sub !== 'deben') return;
    const P = OP(), PR = PRES(), recs = [];
    host.querySelectorAll('.cj-osrow').forEach(row => {
      const b = row.querySelector('[data-os][data-m]'); if (!b) return; const os = b.getAttribute('data-os'), mk = b.getAttribute('data-m'), pay = (P[os] || {})[mk], pr = (PR[os] || {})[mk];
      const n = row.querySelector('.cj-osn'); if (!n || n.querySelector('.os-st')) return;
      let st = '';
      if (pay) st = pay.deb ? '<span class="chip ' + (pay.rec === true ? 'warn' : '') + '">débito ' + money(pay.deb) + (pay.debWhy ? ': ' + esc(pay.debWhy) : '') + (pay.rec === true ? ' · a reclamar' : pay.rec === 'ok' ? ' · recuperado ' + money(pay.recAmt) : '') + '</span>' : '<span class="chip ok">pagó todo</span>';
      else st = pr ? '<span class="chip">presentada el ' + A.fmtDMY(pr.date) + '</span>' + (boss() ? ' <button class="btn small ghost" data-act="osPresUndo" data-os="' + esc(os) + '" data-m="' + mk + '">×</button>' : '') : (mk < T().slice(0, 7) ? '<button class="btn small" data-act="osPres" data-os="' + esc(os) + '" data-m="' + mk + '">Marcar presentada</button>' : '<span class="chip">mes en curso</span>');
      n.insertAdjacentHTML('beforeend', '<div class="os-st">' + st + '</div>');
      if (pay && pay.rec === true) recs.push({ os, mk, pay, sig: (n.querySelector('b') || {}).textContent || os });
    });
    const sep = [...host.querySelectorAll('.cj-sep')].filter(s => /Obras sociales/.test(s.textContent))[0];
    if (sep && recs.length && !host.querySelector('.os-recs')) sep.insertAdjacentHTML('afterend', '<section class="card cj-card os-recs"><h2>Débitos para reclamar <span class="count">' + recs.length + '</span></h2><div class="cj-rows">' + recs.map(r => '<div class="cj-row"><i class="cj-dot warn"></i><div class="cj-who"><b>' + esc(r.sig) + ' · ' + monName(r.mk) + '</b><small>' + esc(r.pay.debWhy || 'sin motivo') + '</small></div><b class="cj-amt">' + money(r.pay.deb) + '</b><button class="btn small" data-act="osRecOk" data-os="' + esc(r.os) + '" data-m="' + r.mk + '">Resultado del reclamo</button></div>').join('') + '</div></section>');
  }
  const rc = A.render.caja; A.render.caja = function () { const r = rc.apply(this, arguments); try { osDeco(); } catch (e) { /* nada */ } return r; };

  /* =================== LIQUIDACIONES =================== */
  /* confirmaciones de los profesionales: clave propia de la nube «liqok» (la pueden leer y escribir) */
  const OKKEY = () => 'odontovoz.liqok.' + ((A.ownerId && A.ownerId()) || 'local');
  let OK0 = {}, okK = null;
  const okLoad = () => { const k = OKKEY(); if (k !== okK) { okK = k; try { OK0 = JSON.parse(LS.get(k, '{}')) || {}; } catch (e) { OK0 = {}; } } return OK0; };
  const OKP = new Proxy({}, { get: (t, p) => okLoad()[p], set: (t, p, v) => { okLoad()[p] = v; return true; }, has: (t, p) => p in okLoad(), ownKeys: () => Reflect.ownKeys(okLoad()), getOwnPropertyDescriptor: (t, p) => { const o = okLoad(); return p in o ? { value: o[p], enumerable: true, configurable: true, writable: true } : undefined; } });
  const OK = OKP;
  const okSave = () => { LS.set(OKKEY(), JSON.stringify(okLoad())); A.save(); };
  const xPrev = A.cloudExtra, kPrev = A.cloudExtraKeys;
  A.cloudExtra = k => (k === 'liqok' ? { get: () => { const o = okLoad(); return Object.keys(o).length ? o : null; }, set: v => { okLoad(); OK0 = (v && typeof v === 'object') ? v : {}; LS.set(OKKEY(), JSON.stringify(OK0)); } } : (xPrev ? xPrev(k) : null));
  A.cloudExtraKeys = () => ['liqok'].concat(kPrev ? kPrev() : []);

  const L = () => { S.liq = S.liq || {}; S.liq.adv = S.liq.adv || {}; S.liq.paid = S.liq.paid || {}; S.liq.ded = S.liq.ded || {}; return S.liq; };
  const key = (pid, m) => (A.liqKey ? A.liqKey(pid, m) : m + '|' + pid);
  const curM = () => (A.liqMonth ? A.liqMonth() : T().slice(0, 7));
  /* descuentos automáticos: gastos a cargo del profesional (laboratorio, insumos) y adelantos */
  const calcPrev = A.liqCalc;
  if (calcPrev) A.liqCalc = function (pid, m) {
    const c = calcPrev.apply(this, arguments);
    try {
      const add = [];
      ((S.cash && S.cash.moves) || []).forEach(mv => { if (mv.chargePro === pid && mv.type === 'egreso' && (mv.date || '').slice(0, 7) === m) add.push({ id: 'cg:' + mv.id, auto: true, desc: 'A su cargo: ' + (mv.desc || A.cashCatName(mv.cat)) + (mv.status === 'pendiente' ? ' (todavía sin pagar)' : ''), amount: +mv.amount }); });
      ((L().adv[key(pid, m)]) || []).forEach(a => { add.push({ id: 'adv:' + a.id, auto: true, desc: 'Adelanto del ' + A.fmtDMY(a.date), amount: +a.amount }); });
      if (add.length) { c.deds = (c.deds || []).filter(d => !/^(cg|adv):/.test(String(d.id))).concat(add); c.ded = c.deds.reduce((s, d) => s + (+d.amount || 0), 0); c.net = c.dent - c.ded; }
      c.ok = OK[key(pid, m)] || null;
    } catch (e) { /* nada */ }
    return c;
  };
  const isPaid = (pid, m) => !!L().paid[key(pid, m)];
  /* pagada = cerrada: para cambiarla hay que anular el pago con motivo */
  const lockMsg = 'Esta liquidación ya está pagada. Para cambiarla, primero anulá el pago (queda anotado el motivo).';
  ['liqDedAdd', 'liqDedDel', 'liqRuleAdd', 'liqRuleDel'].forEach(k => { const p = A.acts[k]; if (p) A.acts[k] = function (el) { if (S.liq && S.liq.pro && isPaid(S.liq.pro, curM())) { A.toast(lockMsg); return; } return p.apply(this, arguments); }; });
  const payPrev = A.acts.liqPay;
  if (payPrev) A.acts.liqPay = function (el) {
    const pid = el.getAttribute('data-id'), m = curM(), c = A.liqCalc(pid, m); const r = payPrev.apply(this, arguments);
    try { const p = L().paid[key(pid, m)]; if (p) { Object.assign(p, stamp()); publish(pid, m, c, true); log('liq', 'Pagó la liquidación de ' + (A.PRO(pid) || {}).name + ' (' + monName(m) + '): ' + money(c.net)); A.save(); } } catch (e) { /* nada */ }
    return r;
  };
  A.acts.liqUnpay = el => { const pid = el.getAttribute('data-id'); S.modal = { type: 'liqUnpay', pid, m: curM() }; A.renderModal(); };
  MF.liqUnpay = m => A.modalShell('Anular el pago de la liquidación', '<p class="m-lead">El pago no se borra: queda tachado en la caja, con quién lo anuló y por qué. Después podés corregir la liquidación y volver a pagarla.</p><div class="field"><label for="luWhy">Motivo</label><input id="luWhy" placeholder="Ej.: faltaba descontar el laboratorio"></div><div id="luMsg" class="m-msg"></div>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="liqUnpayGo">Anular el pago</button>');
  A.acts.liqUnpayGo = () => {
    const m = S.modal, why = (($('#luWhy') || {}).value || '').trim(); if (!why) { $('#luMsg').textContent = 'Escribí el motivo.'; return; }
    const k = key(m.pid, m.m), p = L().paid[k], c = C(); if (!p) return;
    const i = c.moves.findIndex(x => x.id === p.mv); if (i >= 0) { const mv = c.moves.splice(i, 1)[0]; mv.void = Object.assign({ why }, stamp()); c.voids.push(mv); }
    (L().unpaid = L().unpaid || []).push(Object.assign({ k, why, was: p }, stamp())); delete L().paid[k];
    if (OK[k]) { OK[k].void = Object.assign({ why }, stamp()); okSave(); }
    log('liq', 'Anuló el pago de la liquidación de ' + (A.PRO(m.pid) || {}).name + ' (' + monName(m.m) + '): ' + why);
    A.save(); S.modal = null; A.renderModal(); A.refresh();
  };
  /* adelantos */
  A.acts.liqAdv = el => { const pid = el.getAttribute('data-id'); if (isPaid(pid, curM())) { A.toast(lockMsg); return; } S.modal = { type: 'liqAdv', pid, m: curM() }; A.renderModal(); };
  MF.liqAdv = m => A.modalShell('Adelanto a ' + esc((A.PRO(m.pid) || {}).name || ''), '<p class="m-lead">Plata que le das antes de fin de mes. Sale de la caja hoy y se le descuenta sola en la liquidación de ' + monName(m.m) + '.</p><div class="row2"><div class="field"><label for="lvAmt">Cuánto</label><input id="lvAmt" inputmode="numeric" placeholder="$"></div><div class="field"><label for="lvMeth">Cómo se lo das</label><select id="lvMeth">' + ['Efectivo', 'Transferencia', 'Mercado Pago'].map(x => '<option>' + x + '</option>').join('') + '</select></div></div><div id="lvMsg" class="m-msg"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="liqAdvGo">Dar el adelanto</button>');
  A.acts.liqAdvGo = () => {
    const m = S.modal, amt = num($('#lvAmt').value), meth = $('#lvMeth').value; if (!(amt > 0)) { $('#lvMsg').textContent = 'Poné cuánto.'; return; }
    const k = key(m.pid, m.m), id = A.uid(), mvId = A.uid(), nm = (A.PRO(m.pid) || {}).name || '';
    (L().adv[k] = L().adv[k] || []).push(Object.assign({ id, date: T(), amount: amt, method: meth, mv: mvId }, stamp()));
    C().moves.push({ id: mvId, date: T(), type: 'egreso', cat: 'sueldos', desc: 'Adelanto de honorarios · ' + nm, amount: amt, method: meth, status: 'pagado', advFor: k, by: who() });
    log('liq', 'Dio un adelanto de ' + money(amt) + ' a ' + nm);
    A.save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Adelanto registrado. Se le descuenta en la liquidación.');
  };
  /* el adelanto se vuelve a sacar si se anula su movimiento de caja */
  const vPrev = A.acts.cjReasonGo;
  if (vPrev) A.acts.cjReasonGo = function () {
    const m = S.modal, mv = m && m.what === 'mvVoid' ? C().moves.filter(x => x.id === m.id)[0] : null; const r = vPrev.apply(this, arguments);
    try { if (mv && mv.advFor && !C().moves.some(x => x.id === mv.id)) { const a = L().adv[mv.advFor] || []; L().adv[mv.advFor] = a.filter(x => x.mv !== mv.id); A.save(); A.refresh(); } } catch (e) { /* nada */ }
    return r;
  };
  /* publicar para que el profesional la vea y la confirme */
  function publish(pid, m, c, paid) {
    const k = key(pid, m), prev = OK[k] || {};
    OK[k] = { pid, m, net: c.net, prod: c.prod, dent: c.dent, deds: (c.deds || []).map(d => ({ desc: d.desc, amount: +d.amount || 0 })), n: (c.lines || []).length, pub: stamp(), paid: paid ? stamp() : (prev.paid || null), conf: prev.conf && prev.conf.net === c.net ? prev.conf : null };
    okSave();
  }
  A.acts.liqPub = el => { const pid = el.getAttribute('data-id'), m = curM(); publish(pid, m, A.liqCalc(pid, m), isPaid(pid, m)); log('liq', 'Mandó la liquidación a ' + (A.PRO(pid) || {}).name + ' para que la confirme'); A.refresh(); A.toast('Listo. ' + ((A.PRO(pid) || {}).short || 'El profesional') + ' la ve en «Mis números» y la puede confirmar.'); };
  A.acts.liqConf = el => { const k = el.getAttribute('data-k'), o = OK[k]; if (!o) return; o.conf = Object.assign({ net: o.net }, stamp()); okSave(); A.renderModal(); A.toast('¡Gracias! Quedó confirmada.'); };
  A.acts.liqDoubt = el => { const k = el.getAttribute('data-k'), o = OK[k]; if (!o) return; const t = (($('#lqDoubt') || {}).value || '').trim(); if (!t) { A.toast('Escribí qué no te cierra.'); return; } o.doubt = Object.assign({ txt: t }, stamp()); o.conf = null; okSave(); A.renderModal(); A.toast('Enviado. El centro lo va a ver en Liquidaciones.'); };
  /* «Mis números»: lo que publicó el centro, con «Está bien» o «No me cierra» */
  const myAfter = A.modalAfter.myLiq;
  A.modalAfter.myLiq = m => {
    if (myAfter) try { myAfter(m); } catch (e) { /* nada */ }
    const body = $('#modalHost .m-body'); if (!body || body.querySelector('.lq-pub')) return;
    const mb = A.memberRaw && A.memberRaw(), pid = (mb && mb.pro) || (S.liq && S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null); if (!pid) return;
    const k = key(pid, m.m), o = OK[k]; if (!o || (o.void && !o.pub)) return;
    let h = '<div class="lq-pub"><h3>Liquidación que te mandó el centro</h3><div class="cj-big3"><div class="cj-b acc"><small>Te pagan</small><b>' + money(o.net) + '</b><span>' + plural(o.n || 0, 'práctica') + '</span></div><div class="cj-b"><small>Te corresponde</small><b>' + money(o.dent) + '</b></div><div class="cj-b"><small>Descuentos</small><b>' + money((o.deds || []).reduce((s, d) => s + d.amount, 0)) + '</b></div></div>' +
      ((o.deds || []).length ? '<ul class="lq-deds">' + o.deds.map(d => '<li>' + esc(d.desc) + ': − ' + money(d.amount) + '</li>').join('') + '</ul>' : '') +
      (o.paid ? '<p class="small-note">Pagada el ' + A.fmtDMY(o.paid.at.slice(0, 10)) + '.</p>' : '');
    if (o.conf) h += '<div class="cj-light ok"><b>✓ La confirmaste el ' + A.fmtDMY(o.conf.at.slice(0, 10)) + '</b></div>';
    else h += '<div class="cj-acts"><button class="btn primary" data-act="liqConf" data-k="' + esc(k) + '">Está bien, la confirmo</button></div><div class="field" style="margin-top:8px"><label for="lqDoubt">¿Algo no te cierra? Contalo</label><input id="lqDoubt" value="' + esc((o.doubt && o.doubt.txt) || '') + '" placeholder="Ej.: falta la endodoncia de Gómez del 12"></div><button class="btn small" data-act="liqDoubt" data-k="' + esc(k) + '">Enviar</button>';
    body.insertAdjacentHTML('afterbegin', h + '</div>');
  };
  /* Liquidaciones: arriba, un resumen claro por profesional; en el detalle, adelantos y estado */
  const liqR = A.render.liq;
  if (liqR) A.render.liq = function () {
    const r = liqR.apply(this, arguments);
    try {
      const host = $('#view-liq'); if (!host || host.querySelector('.lq-clear')) return r;
      const m = curM(), pros = (A.PROS || []).filter(p => !p.off);
      const st = (pid, c) => { const o = OK[key(pid, m)]; if (isPaid(pid, m)) return o && o.conf ? '<span class="chip ok">pagada y confirmada ✓</span>' : o && o.doubt ? '<span class="chip bad">pagada · tiene una duda</span>' : '<span class="chip ok">pagada</span>'; if (o && o.doubt) return '<span class="chip bad">tiene una duda</span>'; if (o && o.conf) return '<span class="chip ok">confirmada, falta pagar</span>'; if (o) return '<span class="chip warn">esperando que la confirme</span>'; return c.net > 0 ? '<span class="chip">falta pagar</span>' : '<span class="chip">sin movimiento</span>'; };
      const rows = pros.map(p => { const c = A.liqCalc(p.id, m); return '<button class="lq-row' + (S.liq.pro === p.id ? ' on' : '') + '" data-act="liqPro" data-id="' + p.id + '"><i class="cj-dot" style="background:' + (p.color || '#888') + '"></i><span class="lq-n"><b>' + esc(p.name) + '</b><small>cobró ' + money(c.prod) + (c.ded ? ' · descuentos ' + money(c.ded) : '') + '</small></span><span class="lq-v"><b>' + money(c.net) + '</b>' + st(p.id, c) + '</span></button>'; }).join('');
      const tot = pros.reduce((s, p) => s + Math.max(0, A.liqCalc(p.id, m).net), 0);
      const bar = host.querySelector('.ag-bar');
      const box = '<section class="card cj-card lq-clear"><h2>¿Cuánto le corresponde a cada uno en ' + monName(m) + '?</h2><p class="small-note">Tocá un nombre para ver el detalle, dar un adelanto o pagarle. Total a pagar: <b>' + money(tot) + '</b>.</p><div class="lq-rows">' + rows + '</div></section>';
      if (bar) bar.insertAdjacentHTML('afterend', box); else host.insertAdjacentHTML('afterbegin', box);
      const pid = S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null;
      if (pid) {
        const btns = [...host.querySelectorAll('[data-act="pdfLiq"]')].map(b => b.parentNode)[0];
        if (btns && !btns.querySelector('[data-act="liqAdv"]')) {
          btns.insertAdjacentHTML('beforeend', (isPaid(pid, m) ? '' : '<button class="btn" data-act="liqAdv" data-id="' + pid + '">Darle un adelanto</button>') + '<button class="btn" data-act="liqPub" data-id="' + pid + '">Mandársela para que la confirme</button>');
          const o = OK[key(pid, m)];
          if (o) btns.insertAdjacentHTML('afterend', '<div class="hint">' + (o.conf ? '✓ ' + esc(o.conf.by || 'El profesional') + ' la confirmó el ' + A.fmtDMY(o.conf.at.slice(0, 10)) + '.' : o.doubt ? '⚠ ' + esc(o.doubt.by || 'El profesional') + ' dice: «' + esc(o.doubt.txt) + '»' : 'Se la mandaste el ' + A.fmtDMY(o.pub.at.slice(0, 10)) + '; todavía no la confirmó.') + '</div>');
          if (isPaid(pid, m)) btns.insertAdjacentHTML('afterend', '<div class="hint">Está pagada: para cambiar algo, primero «Anular pago» (pide el motivo).</div>');
        }
        host.querySelectorAll('[data-act="liqDedDel"]').forEach(b => { if (/^(cg|adv):/.test(b.getAttribute('data-id') || '')) b.replaceWith(Object.assign(document.createElement('span'), { className: 'chip', textContent: 'automático' })); });
      }
    } catch (e) { if (A.logError) A.logError('liq87', e); }
    return r;
  };
  /* que se publique sola al pagar también desde la voz u otros lugares: ya está en liqPay */

  const css = document.createElement('style');
  css.textContent = '.os-st{margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.os-st .chip{white-space:normal}' +
    '.cj-row input.cj-fn{width:70px}' +
    '.lq-rows{display:flex;flex-direction:column;gap:6px}.lq-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line,#dde3e2);background:var(--surface,#fff);border-radius:12px;padding:10px 12px;font:inherit;color:inherit;cursor:pointer}.lq-row.on{border-color:var(--accent,#0f6f6c);box-shadow:0 0 0 2px var(--accent-soft,#e6f3f2)}' +
    '.lq-n{flex:1;min-width:0}.lq-n b{display:block}.lq-n small{color:var(--muted,#667);font-size:.82rem}.lq-v{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.lq-v b{font-size:1.15rem;font-variant-numeric:tabular-nums}' +
    '.lq-pub{border:1px solid var(--accent,#0f6f6c);border-radius:14px;padding:12px;margin-bottom:12px}.lq-pub h3{margin:0 0 8px}.lq-deds{margin:8px 0;padding-left:18px;font-size:.92rem}';
  document.head.appendChild(css);
})();
