/* ===== 1.6: la caja de nuevo, clara para cualquiera: Hoy, Te deben, Tenés que pagar, Tu plata, El mes, Historial (abrir y cerrar con conteo, comisiones, transferencias por confirmar, nada se borra) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(Math.round(n || 0));
  const num = v => /\d/.test(String(v == null ? '' : v)) ? A.parseMoney(v) : null;   /* 1.18: acepta centavos */
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const isEmp = () => S.setup && S.setup.type === 'empresa';
  const role = () => (A.isMember && A.isMember() && A.mbRole) ? A.mbRole() : 'dueno';
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const moneyOk = () => ['dueno', 'admin', 'recepcion'].indexOf(role()) >= 0;
  const T = () => A.today();
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monName = mk => MON[+mk.slice(5) - 1] + ' ' + mk.slice(0, 4);
  const dayName = d => (d === T() ? 'hoy' : d === A.add(T(), -1) ? 'ayer' : (A.fmtLong ? A.fmtLong(d) : A.fmtDMY(d)));
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : (p || s + 's'));

  /* ---------------- datos (todo dentro de la caja, que ya viaja a la nube con la clave «cash») ---------------- */
  const C = () => {
    const c = S.cash || (S.cash = { moves: [], closes: [] });
    ['moves', 'closes', 'opens', 'voids', 'adj', 'xfer', 'log', 'prov'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
    ['acred', 'fact', 'dun'].forEach(k => { if (!c[k] || typeof c[k] !== 'object' || Array.isArray(c[k])) c[k] = {}; });
    return c;
  };
  const who = () => { try { return (A.actor && A.actor().who) || ''; } catch (e) { return ''; } };
  const stamp = () => ({ at: new Date().toISOString(), by: who() });
  const log = (k, txt, extra) => { const c = C(); c.log.push(Object.assign({ id: A.uid(), k, txt, date: T() }, stamp(), extra || {})); if (c.log.length > 3000) c.log.splice(0, c.log.length - 3000); };
  const save = () => { memo = null; A.save(); };
  A.cjLog = log;

  /* cuentas: dónde está la plata */
  const ACC = [['ef', 'En el cajón', 'efectivo'], ['banco', 'En el banco', 'transferencias, débito y crédito'], ['mp', 'En Mercado Pago', 'cobros con QR o link'], ['chica', 'Caja chica', 'para gastos chicos']];
  const accName = k => (ACC.filter(a => a[0] === k)[0] || [k, k])[1];
  /* comisiones y días de acreditación por medio de pago (estimados; cada uno pone los suyos) */
  const FEE0 = {
    'Efectivo': { acc: 'ef' }, 'Transferencia': { acc: 'banco', confirm: 1 }, 'Débito': { acc: 'banco', pct: 1.5, days: 1 },
    'Crédito': { acc: 'banco', pct: 3.5, days: 10 }, 'Mercado Pago': { acc: 'mp', pct: 4, days: 0 }, 'Cheque': { acc: 'banco', days: 2 },
    'Obra social / prepaga': { acc: 'banco' }, 'Caja chica': { acc: 'chica' }
  };
  A.cjFee = method => Object.assign({ acc: 'banco', pct: 0, days: 0, confirm: 0 }, FEE0[method] || {}, ((A.CFG && A.CFG.cjFees) || {})[method] || {});
  const accOf = method => A.cjFee(method || 'Efectivo').acc;

  /* todos los cobros de pacientes, con comisión, neto y cuándo llega */
  let memo = null, memoAt = 0;
  const pays = () => {
    if (memo && Date.now() - memoAt < 1500) return memo;
    const out = [], c = C();
    (A.allPids ? A.allPids() : A.PATS.map(p => p.id)).forEach(id => {
      const pd = A.pd(id); if (!pd || !pd.ledger) return;
      const nm = (A.PAT(id) || {}).name || (pd.prof && pd.prof.name) || 'Paciente';
      pd.ledger.forEach(e => {
        if (e.type !== 'pago' || e.voided || e.anula || (A.privFrom && A.privFrom(e.pro))) return; /* 1.25: caja privada de otro profesional */
        const amt = +e.amount || 0; if (!amt) return;
        const method = e.method || 'Efectivo', f = A.cjFee(method), fee = amt > 0 ? Math.round(amt * (+f.pct || 0) / 100) : 0, ac = c.acred[e.id];
        const due = A.add(e.date, +f.days || 0);
        out.push({ id: e.id, pid: id, name: nm, date: e.date, amt, method, fee, net: amt - fee, acc: f.acc, needConf: !!f.confirm, conf: !f.confirm || !!(ac && ac.ok !== false), ac, due, arr: f.confirm ? (ac && ac.ok !== false ? (ac.date || e.date) : null) : due, pro: e.pro, rcp: e.rcp, desc: e.desc });
      });
    });
    memo = out; memoAt = Date.now(); return out;
  };
  A.cjPays = pays;
  const tp = A.touchPd; if (tp) A.touchPd = function () { memo = null; return tp.apply(this, arguments); };
  const osPays = () => { const P = (A.CFG && A.CFG.osPay) || {}, out = []; Object.keys(P).forEach(os => Object.keys(P[os] || {}).forEach(mk => { const r = P[os][mk]; if (r && +r.amt > 0) out.push({ os, mk, amt: +r.amt, date: r.date || mk + '-28', r }); })); return out; };
  const moves = () => C().moves.filter(m => m && m.status !== 'pendiente');

  /* saldo de una cuenta (null = todavía no se dijo con cuánto se arranca) */
  const a0 = () => C().acc0 || null;
  function bal(acc, upto) {
    const z = a0(); if (!z || z[acc] == null) return null;
    const D = upto || T(), since = z.since, inR = d => !!d && d >= since && d <= D; let s = +z[acc] || 0;
    pays().forEach(p => { if (p.acc !== acc) return; if (acc === 'ef' || acc === 'chica') { if (inR(p.date)) s += p.amt; } else if (p.arr && inR(p.arr)) s += p.net; });
    moves().forEach(m => { if (!inR(m.date) || accOf(m.method) !== acc) return; s += m.type === 'ingreso' ? +m.amount : -m.amount; });
    if (acc === 'banco') osPays().forEach(o => { if (inR(o.date)) s += o.amt; });
    C().xfer.forEach(x => { if (!inR(x.date)) return; if (x.from === acc) s -= +x.amt; if (x.to === acc) s += +x.amt; });
    C().adj.forEach(j => { if (j.acc === acc && inR(j.date)) s += +j.amt; });
    return s;
  }
  A.cjBal = bal;
  /* efectivo de un día (para el cierre aunque no se sepa el saldo del banco) */
  function dayEf(d) {
    let cob = 0, inn = 0, out = 0, xo = 0, xi = 0;
    pays().forEach(p => { if (p.date === d && p.acc === 'ef') cob += p.amt; });
    moves().forEach(m => { if (m.date !== d || accOf(m.method) !== 'ef') return; if (m.type === 'ingreso') inn += +m.amount; else out += +m.amount; });
    C().xfer.forEach(x => { if (x.date !== d) return; if (x.from === 'ef') xo += +x.amt; if (x.to === 'ef') xi += +x.amt; });
    return { cob, inn, out, xo, xi, net: cob + inn - out - xo + xi };
  }
  const openOf = d => C().opens.filter(o => o.date === d && !o.re).slice(-1)[0] || null;
  const closeOf = d => C().closes.filter(c => c.date === d && !c.re).slice(-1)[0] || null;
  A.cjClosed = d => !!closeOf(d);
  /* lo que debería haber en el cajón al final del día d */
  function expEf(d) {
    d = d || T(); const z = a0();
    if (z && z.ef != null && d >= z.since) { const b = bal('ef', d); const adjAfterClose = 0; return b + adjAfterClose; }
    const o = openOf(d), prev = C().closes.filter(c => c.date < d && !c.re).slice(-1)[0];
    const start = o ? +o.amt : prev ? (prev.keepEf != null ? +prev.keepEf : +prev.counted) : 0;
    return start + dayEf(d).net;
  }
  /* lo que debería haber al empezar el día (antes de los movimientos de hoy) */
  function expStart(d) {
    d = d || T(); const z = a0();
    if (z && z.ef != null && d > z.since) return bal('ef', A.add(d, -1));
    const prev = C().closes.filter(c => c.date < d && !c.re).slice(-1)[0];
    return prev ? (prev.keepEf != null ? +prev.keepEf : +prev.counted) : null;
  }

  /* comisiones: también son un gasto (para «el mes» y el resultado) */
  const ctPrev = A.cashTotals;
  if (ctPrev) A.cashTotals = function (r) {
    const out = ctPrev.apply(this, arguments);
    try {
      const t = T(), inR = d => (r === 'hoy' ? d === t : r === 'semana' ? d >= A.add(t, -6) && d <= t : r === 'mes' ? d.slice(0, 7) === t.slice(0, 7) : d.slice(0, 4) === t.slice(0, 4));
      let f = 0; pays().forEach(p => { if (p.fee && inR(p.date)) f += p.fee; });
      if (f) { out.egr += f; out.byCat.banco = (out.byCat.banco || 0) + f; out.result -= f; out.fees = f; }
    } catch (e) { /* nada */ }
    return out;
  };

  /* ---------------- números de un período ---------------- */
  function periodNums(lo, hi) {
    const inR = d => d >= lo && d <= hi; let cob = 0, ing = 0, os = 0, gas = 0, ret = 0, fees = 0; const byCat = {}, pm = {};
    pays().forEach(p => { if (!inR(p.date)) return; cob += p.amt; fees += p.fee; pm[p.method] = (pm[p.method] || 0) + p.amt; });
    moves().forEach(m => {
      if (!inR(m.date)) return;
      if (m.type === 'ingreso') { ing += +m.amount; return; }
      if (m.cat === 'retiro') { ret += +m.amount; return; }
      gas += +m.amount; byCat[m.cat] = (byCat[m.cat] || 0) + +m.amount;
    });
    osPays().forEach(o => { if (inR(o.date)) os += o.amt; });
    if (fees) byCat.banco = (byCat.banco || 0) + fees;
    const entro = cob + ing + os, salio = gas + fees;
    return { cob, ing, os, gas, ret, fees, byCat, pm, entro, salio, gano: entro - salio };
  }
  A.cjPeriod = periodNums;
  const monthRange = mk => [mk + '-01', mk + '-31'];

  /* ---------------- quién debe (pacientes) ---------------- */
  function debtors() {
    const out = [], t = T();
    (A.allPids ? A.allPids() : A.PATS.map(p => p.id)).forEach(id => {
      const pd = A.pd(id); if (!pd || !pd.ledger || !pd.ledger.length) return;
      const p = A.PAT(id); if (p && p.test) return;
      const sal = A.saldo(id); if (!(sal > 0)) return;
      let credit = 0; pd.ledger.forEach(e => { if (e.type === 'pago') credit += +e.amount || 0; else if ((+e.amount || 0) < 0) credit += -e.amount; });
      const ch = pd.ledger.filter(e => e.type !== 'pago' && (+e.amount || 0) > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
      let acc = 0, since = ch.length ? ch[0].date : t; for (const e of ch) { acc += +e.amount; if (acc > credit) { since = e.date; break; } }
      const days = Math.max(0, Math.round((A.parse(t) - A.parse(since)) / 864e5));
      const dl = C().dun[id] || [];
      out.push({ pid: id, name: (p && p.name) || (pd.prof && pd.prof.name) || 'Paciente', phone: (p && p.phone) || '', sal, since, days, lvl: days > 90 ? 'bad' : days > 30 ? 'warn' : 'ok', dun: dl[dl.length - 1] || null });
    });
    return out.sort((a, b) => b.days - a.days || b.sal - a.sal);
  }
  A.cjDebtors = debtors;

  /* ---------------- cosas para revisar (el semáforo) ---------------- */
  function checks() {
    const t = T(), out = [], c = C();
    const worked = d => pays().some(p => p.date === d) || moves().some(m => m.date === d) || (A.day ? A.day(d).some(a => a.type !== 'block' && a.status === 'atendido') : false);
    for (let i = c.firstUse ? 7 : 1; i >= 1; i--) { const d = A.add(t, -i); if (worked(d) && !closeOf(d) && (!c.firstUse || d >= c.firstUse)) { out.push({ lvl: 'bad', txt: 'No se cerró la caja ' + (dayName(d) === 'ayer' ? 'de ayer' : 'del ' + dayName(d)) + '.', act: 'cjCloseOpen', args: { 'data-d': d }, btn: 'Cerrarla ahora' }); break; } }
    if (!openOf(t) && !closeOf(t) && worked(t)) out.push({ lvl: 'warn', txt: 'Todavía no abriste la caja de hoy (contar la plata del cajón).', act: 'cjOpenOpen', btn: 'Abrir la caja' });
    const cl = closeOf(t); if (cl && cl.flow != null && Math.round(dayEf(t).net) !== Math.round(cl.flow)) out.push({ lvl: 'warn', txt: 'Hubo movimientos en efectivo después de cerrar la caja de hoy.', act: 'cjSub', args: { 'data-s': 'hist' }, btn: 'Ver' });
    try { const dc = A.dayControl ? A.dayControl(t) : null; const n = dc ? (dc.sinCobro || []).length : 0; if (n) out.push({ lvl: 'warn', txt: plural(n, 'paciente atendido hoy no tiene', 'pacientes atendidos hoy no tienen') + ' cobro ni deuda anotada.', act: 'cjCtl', btn: 'Ver quiénes' }); } catch (e) { /* nada */ }
    const tc = pays().filter(p => p.needConf && !p.ac && p.date >= confFrom()); if (tc.length) out.push({ lvl: 'warn', txt: plural(tc.length, 'transferencia') + ' para confirmar que llegaron al banco (' + money(tc.reduce((s, p) => s + p.amt, 0)) + ').', act: 'cjSub', args: { 'data-s': 'plata' }, btn: 'Revisar' });
    const venc = c.moves.filter(m => m.status === 'pendiente' && m.type === 'egreso' && (m.due || m.date) < t); if (venc.length) out.push({ lvl: 'bad', txt: plural(venc.length, 'cuenta vencida', 'cuentas vencidas') + ' para pagar (' + money(venc.reduce((s, m) => s + +m.amount, 0)) + ').', act: 'cjSub', args: { 'data-s': 'pagar' }, btn: 'Ver' });
    try { const cu = (A.upcomingCuotas ? A.upcomingCuotas(0) : []).filter(x => x.late); if (cu.length) out.push({ lvl: 'warn', txt: plural(cu.length, 'cuota vencida', 'cuotas vencidas') + ' de pacientes.', act: 'cjSub', args: { 'data-s': 'deben' }, btn: 'Ver' }); } catch (e) { /* nada */ }
    if (boss()) { let nc = 0; (A.allPids ? A.allPids() : []).forEach(id => { const pd = A.pd(id); (pd && pd.ledger || []).forEach(e => { if (e.date === t && !e.voided && ((e.type === 'ajuste' && (e.rcpFix || e.plOver || e.free)) || (e.type === 'cargo' && (e.freeWhy || e.why)))) nc++; }); });
      if (nc) out.push({ lvl: 'warn', txt: plural(nc, 'corrección o aclaración', 'correcciones o aclaraciones') + ' en cobros de hoy (cada una con su motivo).', act: 'cjCorr', btn: 'Ver' }); }
    return out;
  }
  A.cjChecks = checks;
  /* transferencias para confirmar: desde que se empezó a usar la caja nueva (si no, la última semana) */
  function confFrom() { const t = T(), c = C(), lo = A.add(t, -45), f = c.firstUse || A.add(t, -7); return f > lo ? f : lo; }

  /* ---------------- conteo de billetes ---------------- */
  const DEN = [20000, 10000, 2000, 1000, 500, 200, 100];
  const billsHTML = (m, label) => {
    const b = m.bills || (m.bills = {}), direct = !!m.direct;
    let h = '<div class="cj-count"><div class="cj-count-h"><b>' + esc(label) + '</b><button class="btn small ghost" data-act="cjDirect">' + (direct ? 'Contar billete por billete' : 'Prefiero poner el total') + '</button></div>';
    if (direct) h += '<div class="field"><label for="cjTotIn">Total que contaste</label><input id="cjTotIn" inputmode="numeric" data-in="cjTotIn" value="' + (m.total != null ? m.total : '') + '" placeholder="$"></div>';
    else {
      h += '<div class="cj-bills">' + DEN.map(v => '<label class="cj-bill"><span>$ ' + v.toLocaleString('es-AR') + '</span><input inputmode="numeric" data-in="cjBill" data-v="' + v + '" value="' + (b[v] || '') + '" placeholder="0" aria-label="Cantidad de billetes de ' + v + '"><small>billetes</small></label>').join('') +
        '<label class="cj-bill"><span>Monedas y sueltos</span><input inputmode="numeric" data-in="cjBill" data-v="x" value="' + (b.x || '') + '" placeholder="$ 0" aria-label="Monedas y sueltos en pesos"><small>en pesos</small></label></div>';
    }
    return h + '<div class="cj-count-t">Contaste: <b id="cjBillTot">' + money(countTot(m)) + '</b></div></div>';
  };
  const countTot = m => { if (m.direct) return +m.total || 0; const b = m.bills || {}; let s = 0; DEN.forEach(v => { s += (+b[v] || 0) * v; }); return s + (+b.x || 0); };
  A.ins.cjBill = el => { const m = S.modal; if (!m) return; m.bills = m.bills || {}; m.bills[el.getAttribute('data-v')] = num(el.value) || 0; const t = $('#cjBillTot'); if (t) t.textContent = money(countTot(m)); };
  A.ins.cjTotIn = el => { const m = S.modal; if (!m) return; m.total = num(el.value) || 0; const t = $('#cjBillTot'); if (t) t.textContent = money(countTot(m)); };
  A.acts.cjDirect = () => { const m = S.modal; if (!m) return; m.direct = !m.direct; if (m.direct) m.total = countTot(Object.assign({}, m, { direct: false })); A.renderModal(); };

  /* ---------------- abrir la caja ---------------- */
  A.acts.cjOpenOpen = () => { if (openOf(T()) || closeOf(T())) { A.toast(closeOf(T()) ? 'La caja de hoy ya está cerrada.' : 'La caja de hoy ya está abierta.'); return; } S.modal = { type: 'cjOpen', d: T(), bills: {} }; A.renderModal(); };
  MF.cjOpen = m => {
    const exp = expStart(m.d);
    let b = '<p class="m-lead">Antes de empezar, contá la plata que hay en el cajón. Así, al cerrar, la app sabe cuánto tiene que haber.</p>';
    if (exp != null) b += '<div class="cj-exp">Según lo que quedó la última vez, tendría que haber <b>' + money(exp) + '</b>.</div>';
    b += billsHTML(m, 'Plata en el cajón ahora');
    if (m.ask) b += '<div class="cj-diff ' + (m.ask > 0 ? 'warn' : 'bad') + '">' + (m.ask > 0 ? 'Hay ' + money(m.ask) + ' de más' : 'Faltan ' + money(-m.ask)) + ' respecto de lo que quedó. ¿Sabés por qué?</div><div class="field"><label for="cjWhy">Motivo</label><input id="cjWhy" placeholder="Ej.: se pagó un envío en efectivo y no se anotó"></div>';
    b += '<div id="cjMsg" class="m-msg"></div>';
    return A.modalShell('Abrir la caja · ' + dayName(m.d), b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjOpenGo">Abrir la caja</button>');
  };
  A.acts.cjOpenGo = () => {
    const m = S.modal, tot = countTot(m), exp = expStart(m.d), c = C();
    const diff = exp != null ? tot - exp : 0, why = (($('#cjWhy') || {}).value || '').trim();
    if (diff && !m.ask) { m.ask = diff; A.renderModal(); return; }
    if (diff && !why) { const x = $('#cjMsg'); if (x) x.textContent = 'Escribí el motivo (aunque sea «no sé»): queda anotado para revisar.'; return; }
    c.opens.push(Object.assign({ id: A.uid(), date: m.d, amt: tot, exp, diff, why, bills: m.direct ? null : m.bills }, stamp()));
    if (!a0()) c.acc0 = { since: m.d, ef: tot, banco: null, mp: null, chica: null, firstUse: m.d };
    else if (diff && a0().ef != null) c.adj.push(Object.assign({ id: A.uid(), date: m.d, acc: 'ef', amt: diff, why: 'Al abrir: ' + why, kind: 'apertura' }, stamp()));
    if (!c.firstUse) c.firstUse = m.d;
    log('abrir', 'Abrió la caja con ' + money(tot) + (diff ? ' (' + (diff > 0 ? 'sobraban ' : 'faltaban ') + money(Math.abs(diff)) + ': ' + why + ')' : ''));
    save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Caja abierta con ' + money(tot) + '.');
  };

  /* ---------------- cerrar la caja (paso a paso) ---------------- */
  A.acts.cjCloseOpen = el => { const d = (el && el.getAttribute && el.getAttribute('data-d')) || T(); if (closeOf(d)) { A.toast('La caja del ' + dayName(d) + ' ya está cerrada.'); return; } S.modal = { type: 'cjClose', d, step: 'count', bills: {} }; A.renderModal(); };
  const REASONS = ['Di mal un vuelto', 'Un gasto que no se anotó', 'Un cobro que no se anotó', 'Se pagó algo con la plata del cajón', 'No sé'];
  MF.cjClose = m => {
    const d = m.d, e = dayEf(d), exp = expEf(d), o = openOf(d), start = exp - e.net;
    const head = 'Cerrar la caja · ' + dayName(d);
    if (m.step === 'count') {
      let b = '<p class="m-lead">Contá la plata del cajón. La app ya sabe cuánto tendría que haber.</p>' +
        '<table class="tbl cj-sum"><tbody><tr><td>Empezaste el día con</td><td class="num">' + money(start) + (o ? '' : ' <span class="chip">estimado</span>') + '</td></tr>' +
        '<tr><td>Cobraste en efectivo</td><td class="num">+ ' + money(e.cob) + '</td></tr>' + (e.inn ? '<tr><td>Otros ingresos en efectivo</td><td class="num">+ ' + money(e.inn) + '</td></tr>' : '') +
        (e.out ? '<tr><td>Gastos pagados con plata del cajón</td><td class="num">− ' + money(e.out) + '</td></tr>' : '') + (e.xo ? '<tr><td>Plata que salió del cajón (depósitos, caja chica)</td><td class="num">− ' + money(e.xo) + '</td></tr>' : '') + (e.xi ? '<tr><td>Plata que entró al cajón</td><td class="num">+ ' + money(e.xi) + '</td></tr>' : '') +
        '<tr class="tot"><td><b>Tendría que haber</b></td><td class="num"><b>' + money(exp) + '</b></td></tr></tbody></table>';
      b += billsHTML(m, 'Plata que hay en el cajón');
      return A.modalShell(head, b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjCloseNext" data-to="why">Siguiente</button>');
    }
    if (m.step === 'why') {
      const diff = m.counted - exp;
      let b = '<div class="cj-diff big ' + (diff > 0 ? 'warn' : 'bad') + '">' + (diff > 0 ? 'Sobran ' + money(diff) : 'Faltan ' + money(-diff)) + '</div><p class="m-lead">Contaste ' + money(m.counted) + ' y tendría que haber ' + money(exp) + '. Pasa: lo importante es anotar por qué, así no queda un agujero sin explicar.</p>' +
        '<div class="cj-chips">' + REASONS.map(r => '<button class="pill" data-act="cjWhyPick" data-r="' + esc(r) + '" aria-pressed="' + (m.why === r) + '">' + esc(r) + '</button>').join('') + '</div>' +
        '<div class="field"><label for="cjWhy">Contalo con tus palabras (opcional)</label><input id="cjWhy" value="' + esc(m.whyTxt || '') + '" placeholder="Ej.: le di de vuelto 1.000 de más a un paciente"></div><div id="cjMsg" class="m-msg"></div>';
      return A.modalShell(head, b, '<button class="btn" data-act="cjCloseNext" data-to="count">Volver a contar</button><button class="btn primary" data-act="cjCloseNext" data-to="keep">Siguiente</button>');
    }
    if (m.step === 'keep') {
      const prevKeep = (C().closes.filter(c => !c.re && c.keepEf != null).slice(-1)[0] || {}).keepEf;
      const keep = m.keep != null ? m.keep : Math.min(m.counted, prevKeep != null ? prevKeep : 20000), rest = Math.max(0, m.counted - keep);
      let b = '<p class="m-lead">¿Qué hacés con la plata?</p><div class="row2"><div class="field"><label for="cjKeep">Dejo en el cajón para dar vuelto mañana</label><input id="cjKeep" inputmode="numeric" data-in="cjKeep" value="' + keep + '"></div><div class="field"><label>Lo demás</label><div class="cj-rest" id="cjRest">' + money(rest) + '</div></div></div>' +
        '<div class="cj-opts">' + [['ef', 'Queda guardado en el consultorio', 'no se mueve'], ['banco', 'Lo deposito en el banco', 'pasa a «En el banco»'], ['retiro', 'Me lo llevo (retiro del dueño)', 'sale del consultorio']].map(o2 => '<label class="cj-opt"><input type="radio" name="cjTo" value="' + o2[0] + '"' + ((m.to || 'ef') === o2[0] ? ' checked' : '') + ' data-chg="cjTo"><span><b>' + o2[1] + '</b><small>' + o2[2] + '</small></span></label>').join('') + '</div>';
      return A.modalShell(head, b, '<button class="btn" data-act="cjCloseNext" data-to="' + (m.counted !== expEf(d) ? 'why' : 'count') + '">Volver</button><button class="btn primary" data-act="cjCloseGo">Cerrar la caja</button>');
    }
    /* listo */
    const cl = closeOf(d);
    let b = '<div class="cj-done"><div class="cj-ok">✓</div><b>Caja cerrada</b><span>' + (cl && cl.diff ? (cl.diff > 0 ? 'Sobraron ' : 'Faltaron ') + money(Math.abs(cl.diff)) + ' · ' + esc(cl.note || '') : 'Cerró justo, sin diferencias.') + '</span></div>';
    return A.modalShell(head, b, '<button class="btn" data-act="copyText" data-text="' + esc(closeText(d)) + '">Copiar resumen para WhatsApp</button><button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.cjWhyPick = el => { const m = S.modal; m.whyTxt = ($('#cjWhy') || {}).value || m.whyTxt; m.why = el.getAttribute('data-r'); A.renderModal(); };
  A.ins.cjKeep = el => { const m = S.modal; m.keep = num(el.value) || 0; const r = $('#cjRest'); if (r) r.textContent = money(Math.max(0, m.counted - m.keep)); };
  A.chg.cjTo = el => { S.modal.to = el.value; };
  A.acts.cjCloseNext = el => {
    const m = S.modal, to = el.getAttribute('data-to'), exp = expEf(m.d);
    if (m.step === 'count') { m.counted = countTot(m); }
    if (m.step === 'why') { m.whyTxt = (($('#cjWhy') || {}).value || '').trim(); if (to === 'keep' && !m.why && !m.whyTxt) { const x = $('#cjMsg'); if (x) x.textContent = 'Elegí un motivo o escribilo (puede ser «No sé»).'; return; } }
    m.step = to === 'why' && m.counted === exp ? 'keep' : to; A.renderModal();
  };
  A.acts.cjCloseGo = () => {
    const m = S.modal, c = C(), d = m.d, exp = expEf(d), counted = m.counted, diff = counted - exp;
    const keep = Math.min(counted, m.keep != null ? m.keep : num(($('#cjKeep') || {}).value) || 0), rest = Math.max(0, counted - keep), to = m.to || 'ef';
    const note = [m.why, m.whyTxt].filter(Boolean).join(': ');
    const o = openOf(d);
    const rec = Object.assign({ id: A.uid(), date: d, v: 2, open: o ? o.amt : exp - dayEf(d).net, exp, counted, diff, note, bills: m.direct ? null : m.bills, keepEf: to === 'ef' ? counted : keep, out: rest && to !== 'ef' ? { amt: rest, to } : null, flow: dayEf(d).net }, stamp());
    if (!a0()) c.acc0 = { since: A.add(d, 1), ef: rec.keepEf, banco: null, mp: null, chica: null, firstUse: d };
    else if (diff) c.adj.push(Object.assign({ id: A.uid(), date: d, acc: 'ef', amt: diff, why: 'Al cerrar: ' + (note || 'sin motivo'), kind: 'cierre' }, stamp()));
    if (rest && to === 'banco') c.xfer.push(Object.assign({ id: A.uid(), date: d, from: 'ef', to: 'banco', amt: rest, why: 'Depósito al cerrar la caja' }, stamp()));
    if (rest && to === 'retiro') c.moves.push({ id: A.uid(), date: d, type: 'egreso', cat: 'retiro', desc: 'Retiro del dueño al cerrar la caja', amount: rest, method: 'Efectivo', status: 'pagado', by: who() });
    rec.flow = dayEf(d).net;
    c.closes.push(rec);
    log('cerrar', 'Cerró la caja del ' + A.fmtDMY(d) + ': contó ' + money(counted) + (diff ? ', ' + (diff > 0 ? 'sobraron ' : 'faltaron ') + money(Math.abs(diff)) + (note ? ' (' + note + ')' : '') : ', sin diferencia') + (rec.out ? '; ' + (to === 'banco' ? 'depositó ' : 'retiró ') + money(rest) : ''));
    save(); m.step = 'done'; A.renderModal(); A.refresh();
  };
  function closeText(d) {
    const cl = closeOf(d); if (!cl) return '';
    const n = periodNums(d, d);
    return 'Cierre de caja ' + A.fmtDMY(d) + ' · ' + A.CLINIC + '\nEntró: ' + money(n.entro) + '\nSalió: ' + money(n.salio + n.ret) + '\nEn el cajón: contado ' + money(cl.counted) + (cl.diff ? ' (' + (cl.diff > 0 ? 'sobraron ' : 'faltaron ') + money(Math.abs(cl.diff)) + (cl.note ? ': ' + cl.note : '') + ')' : ' (justo)') + (cl.out ? '\n' + (cl.out.to === 'banco' ? 'Depositado en el banco: ' : 'Retiro del dueño: ') + money(cl.out.amt) : '') + '\nCerró: ' + (cl.by || '');
  }
  /* reabrir un día (solo dueño o administración, con motivo) */
  A.acts.cjReopen = el => { S.modal = { type: 'cjReason', what: 'reopen', d: el.getAttribute('data-d'), title: 'Reabrir la caja del ' + A.fmtDMY(el.getAttribute('data-d')), lead: 'Se va a poder volver a cerrar. Queda anotado quién la reabrió y por qué.' }; A.renderModal(); };

  /* ---------------- motivo (anular, reabrir, corregir un día cerrado) ---------------- */
  MF.cjReason = m => A.modalShell(m.title || 'Contanos el motivo', '<p class="m-lead">' + esc(m.lead || '') + '</p><div class="field"><label for="cjWhy">Motivo</label><input id="cjWhy" placeholder="Ej.: se cargó dos veces"></div><div id="cjMsg" class="m-msg"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjReasonGo">' + esc(m.ok || 'Confirmar') + '</button>');
  A.acts.cjReasonGo = () => {
    const m = S.modal, why = (($('#cjWhy') || {}).value || '').trim(), c = C();
    if (!why) { const x = $('#cjMsg'); if (x) x.textContent = 'Escribí el motivo: queda en el historial.'; return; }
    if (m.what === 'reopen') { const cl = closeOf(m.d); if (cl) { cl.re = Object.assign({ why }, stamp()); log('reabrir', 'Reabrió la caja del ' + A.fmtDMY(m.d) + ': ' + why); } }
    if (m.what === 'mvVoid') {
      const i = c.moves.findIndex(x => x.id === m.id); if (i >= 0) { const mv = c.moves.splice(i, 1)[0]; mv.void = Object.assign({ why }, stamp()); c.voids.push(mv); log('anular', 'Anuló «' + (mv.desc || '') + '» (' + money(mv.amount) + '): ' + why); if (mv.status !== 'pendiente' && A.cjClosed(mv.date)) log('tarde', 'Cambio en un día ya cerrado (' + A.fmtDMY(mv.date) + ')'); }
    }
    if (m.what === 'ledVoid') {
      const pd = A.pd(m.pid), e = pd.ledger.filter(x => x.id === m.id)[0];
      if (e && ledVoidPrev) { const keep = S.fichaPid; S.fichaPid = m.pid; ledVoidPrev({ getAttribute: k => (k === 'data-id' ? m.id : null), dataset: {} }); S.fichaPid = keep; Object.assign(e, { voidWhy: why, voidBy: who(), voidAt: new Date().toISOString() }); A.touchPd(m.pid); log('anular', 'Anuló ' + (e.type === 'pago' ? 'el cobro' : 'el cargo') + ' «' + (e.desc || '') + '» de ' + ((A.PAT(m.pid) || {}).name || '') + ' (' + money(e.amount) + '): ' + why); if (A.cjClosed(e.date)) log('tarde', 'Cambio en un día ya cerrado (' + A.fmtDMY(e.date) + ')'); }
    }
    if (m.what === 'acredNo') { c.acred[m.id] = Object.assign({ ok: false, why }, stamp()); log('transf', 'Transferencia no encontrada en el banco: ' + why); }
    save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Listo, quedó anotado en el historial.');
  };
  /* gastos: no se borran, se anulan con motivo */
  A.acts.mvDel = el => { const id = el.getAttribute('data-id'), mv = C().moves.filter(x => x.id === id)[0]; if (!mv) return; S.modal = { type: 'cjReason', what: 'mvVoid', id, title: 'Anular «' + (mv.desc || 'movimiento') + '»', lead: 'No se borra: queda tachado en el historial, con quién lo anuló y por qué.', ok: 'Anular' }; A.renderModal(); };
  const ledVoidPrev = A.acts.ledVoid;
  if (ledVoidPrev) A.acts.ledVoid = el => { const id = el.getAttribute('data-id'), pid = S.fichaPid, e = (A.pd(pid).ledger || []).filter(x => x.id === id)[0]; if (!e || e.voided) return; S.modal = { type: 'cjReason', what: 'ledVoid', id, pid, title: 'Anular ' + (e.type === 'pago' ? 'cobro' : 'cargo') + ' de ' + money(e.amount), lead: 'Queda tachado en la cuenta del paciente con la contrapartida, y en el historial de la caja con quién lo anuló y por qué.', ok: 'Anular' }; A.renderModal(); };

  /* gasto con fecha de un día ya cerrado: se pide motivo; proveedor y «a cargo de» */
  const mvSavePrev = A.acts.mvSave;
  if (mvSavePrev) A.acts.mvSave = function () {
    const m = S.modal, date = ($('#mvDate') || {}).value || T();
    if (A.cjClosed(date)) {
      const w = $('#mvLockWhy');
      if (!w) { const host = $('#mvMsg'); if (host) host.insertAdjacentHTML('beforebegin', '<div class="cj-diff warn">La caja del ' + A.fmtDMY(date) + ' ya está cerrada. Podés guardarlo igual, pero contá por qué.</div><div class="field"><label for="mvLockWhy">Motivo</label><input id="mvLockWhy" placeholder="Ej.: me olvidé de anotarlo ese día"></div>'); return; }
      if (!w.value.trim()) { const x = $('#mvMsg'); if (x) x.textContent = 'Escribí el motivo.'; return; }
      m._lockWhy = w.value.trim();
    }
    const hasProv = !!$('#mvProv'), prov = (($('#mvProv') || {}).value || '').trim(), chg = ($('#mvChg') || {}).value || '', editId = m && m.id, lockWhy = m && m._lockWhy, n0 = C().moves.length;
    const r = mvSavePrev.apply(this, arguments);
    try {
      const mv = editId ? C().moves.filter(x => x.id === editId)[0] : (C().moves.length > n0 ? C().moves[C().moves.length - 1] : null);
      if (mv) {
        if (prov) { mv.prov = prov; if (C().prov.indexOf(prov) < 0) C().prov.push(prov); } else if (hasProv) delete mv.prov;
        if (chg) mv.chargePro = chg; else if (hasProv) delete mv.chargePro;
        if (!editId) mv.by = who();
        log(editId ? 'editar' : 'gasto', (editId ? 'Editó ' : 'Anotó ') + (mv.type === 'ingreso' ? 'el ingreso' : 'el gasto') + ' «' + (mv.desc || '') + '» ' + money(mv.amount));
        if (lockWhy) log('tarde', 'Cambio en el día ya cerrado ' + A.fmtDMY(mv.date) + ': ' + lockWhy);
        save();
      }
    } catch (e) { /* nada */ }
    return r;
  };
  A.modalAfter.mv = m => {
    const desc = $('#mvDesc'); if (!desc || $('#mvProv')) return;
    const f = m.f || {}, eg = f.type !== 'ingreso';
    const pros = (A.PROS || []).filter(p => !p.off);
    const box = document.createElement('div'); box.className = 'row2';
    box.innerHTML = '<div class="field"><label for="mvProv">' + (eg ? 'A quién le pagás (proveedor)' : 'De quién viene') + '</label><input id="mvProv" list="mvProvDl" value="' + esc(f.prov || '') + '" placeholder="Ej.: Dental Sur"><datalist id="mvProvDl">' + C().prov.map(p => '<option value="' + esc(p) + '">').join('') + '</datalist></div>' +
      (eg && pros.length > 1 ? '<div class="field"><label for="mvChg">¿Lo paga el consultorio o un profesional?</label><select id="mvChg"><option value="">El consultorio</option>' + pros.map(p => '<option value="' + p.id + '"' + (f.chargePro === p.id ? ' selected' : '') + '>Se le descuenta a ' + esc(p.name) + '</option>').join('') + '</select></div>' : '');
    desc.closest('.field').after(box);
    const meth = $('#mvMeth'); if (meth && eg && ![].some.call(meth.options, o => o.value === 'Caja chica')) { const o = document.createElement('option'); o.textContent = 'Caja chica'; o.value = 'Caja chica'; if (f.method === 'Caja chica') o.selected = true; meth.appendChild(o); }
  };

  /* ---------------- tu plata: confirmar transferencias, mover plata, ajustar, comisiones ---------------- */
  A.acts.cjAcred = el => { const id = el.getAttribute('data-id'); C().acred[id] = Object.assign({ ok: true, date: T() }, stamp()); const p = pays().filter(x => x.id === id)[0]; log('transf', 'Confirmó que llegó la transferencia de ' + (p ? p.name + ' (' + money(p.amt) + ')' : '')); save(); A.refresh(); };
  A.acts.cjAcredAll = () => { let n = 0; pays().forEach(p => { if (p.needConf && !p.ac) { C().acred[p.id] = Object.assign({ ok: true, date: T() }, stamp()); n++; } }); log('transf', 'Confirmó ' + n + ' transferencias juntas'); save(); A.refresh(); A.toast(n + ' transferencias confirmadas.'); };
  A.acts.cjAcredNo = el => { S.modal = { type: 'cjReason', what: 'acredNo', id: el.getAttribute('data-id'), title: 'No encontrás la transferencia', lead: 'Queda marcada para revisar con el paciente. Cuando aparezca, tocá «Llegó».', ok: 'Guardar' }; A.renderModal(); };
  A.acts.cjAcredUndo = el => { delete C().acred[el.getAttribute('data-id')]; save(); A.refresh(); };

  A.acts.cjXfer = el => { S.modal = { type: 'cjXfer', from: (el && el.getAttribute('data-from')) || 'ef', to: (el && el.getAttribute('data-to')) || 'banco' }; A.renderModal(); };
  MF.cjXfer = m => {
    const opt = sel => ACC.map(a => '<option value="' + a[0] + '"' + (sel === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('');
    return A.modalShell('Mover plata', '<p class="m-lead">Para cuando la plata cambia de lugar pero no se gasta: depositar el efectivo, reponer la caja chica, sacar del banco para el cajón.</p>' +
      '<div class="row2"><div class="field"><label for="cxFrom">Sale de</label><select id="cxFrom">' + opt(m.from) + '</select></div><div class="field"><label for="cxTo">Va a</label><select id="cxTo">' + opt(m.to) + '</select></div></div>' +
      '<div class="row2"><div class="field"><label for="cxAmt">Cuánto</label><input id="cxAmt" inputmode="numeric" placeholder="$"></div><div class="field"><label for="cxDate">Día</label><input id="cxDate" type="date" value="' + T() + '"></div></div>' +
      '<div class="field"><label for="cxWhy">Detalle (opcional)</label><input id="cxWhy" placeholder="Ej.: depósito en el Banco Patagonia"></div><div id="cjMsg" class="m-msg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjXferGo">Guardar</button>');
  };
  A.acts.cjXferGo = () => {
    const from = $('#cxFrom').value, to = $('#cxTo').value, amt = num($('#cxAmt').value), d = $('#cxDate').value || T(), why = $('#cxWhy').value.trim();
    const x = $('#cjMsg'); if (from === to) { x.textContent = 'Elegí dos lugares distintos.'; return; } if (!(amt > 0)) { x.textContent = 'Poné cuánto.'; return; }
    C().xfer.push(Object.assign({ id: A.uid(), date: d, from, to, amt, why }, stamp())); log('mover', 'Movió ' + money(amt) + ' de ' + accName(from).toLowerCase() + ' a ' + accName(to).toLowerCase() + (why ? ' (' + why + ')' : ''));
    if (A.cjClosed(d) && (from === 'ef' || to === 'ef')) log('tarde', 'Movimiento de efectivo en un día ya cerrado (' + A.fmtDMY(d) + ')');
    save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Listo: ' + money(amt) + ' a ' + accName(to).toLowerCase() + '.');
  };
  /* el saldo real no coincide: se anota la diferencia */
  A.acts.cjAdj = el => { S.modal = { type: 'cjAdj', acc: (el && el.getAttribute('data-acc')) || 'banco' }; A.renderModal(); };
  MF.cjAdj = m => {
    const b = bal(m.acc);
    return A.modalShell('Corregir el saldo', '<p class="m-lead">Fijate cuánto dice de verdad (el home banking, Mercado Pago o lo que contaste) y ponelo acá. La diferencia queda anotada con el motivo.</p>' +
      '<div class="field"><label for="caAcc">Dónde</label><select id="caAcc" data-chg="caAcc">' + ACC.map(a => '<option value="' + a[0] + '"' + (a[0] === m.acc ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></div>' +
      '<div class="cj-exp">Según la app: <b>' + (b == null ? 'todavía no lo sabe' : money(b)) + '</b></div>' +
      '<div class="row2"><div class="field"><label for="caReal">Lo que hay de verdad</label><input id="caReal" inputmode="numeric" placeholder="$"></div><div class="field"><label for="caWhy">Motivo</label><input id="caWhy" placeholder="Ej.: comisión del banco, mantenimiento de cuenta"></div></div><div id="cjMsg" class="m-msg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjAdjGo">Guardar</button>');
  };
  A.chg.caAcc = el => { S.modal.acc = el.value; A.renderModal(); };
  A.acts.cjAdjGo = () => {
    const m = S.modal, real = num($('#caReal').value), why = $('#caWhy').value.trim(), c = C(), x = $('#cjMsg');
    if (real == null) { x.textContent = 'Poné cuánto hay.'; return; }
    const b = bal(m.acc);
    if (b == null) { if (!c.acc0) c.acc0 = { since: T(), ef: null, banco: null, mp: null, chica: null, firstUse: T() }; c.acc0[m.acc] = real; log('saldo', accName(m.acc) + ': arranca con ' + money(real)); }
    else { if (!why) { x.textContent = 'Escribí el motivo de la diferencia.'; return; } const d = real - b; if (d) c.adj.push(Object.assign({ id: A.uid(), date: T(), acc: m.acc, amt: d, why, kind: 'ajuste' }, stamp())); log('saldo', 'Corrigió ' + accName(m.acc).toLowerCase() + ': ' + (d >= 0 ? '+' : '−') + money(Math.abs(d)) + ' (' + why + ')'); }
    save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Saldo corregido.');
  };
  /* con cuánto se arranca (la primera vez) */
  A.acts.cjStartGo = () => {
    const c = C(), v = k => num(($('#cs_' + k) || {}).value);
    const z = { since: T(), ef: v('ef'), banco: v('banco'), mp: v('mp'), chica: v('chica'), firstUse: T() };
    if (z.ef == null && z.banco == null) { A.toast('Poné al menos cuánto hay en el cajón o en el banco.'); return; }
    if (z.chica == null) z.chica = 0; if (z.mp == null) z.mp = 0;
    c.acc0 = Object.assign({}, c.acc0 || {}, z); log('saldo', 'Puso con cuánto arranca: ' + ACC.filter(a => z[a[0]] != null).map(a => a[1].toLowerCase() + ' ' + money(z[a[0]])).join(', '));
    save(); A.refresh(); A.toast('Listo. Desde hoy la app sigue dónde está tu plata.');
  };
  /* comisiones (dueño o administración) */
  A.acts.cjFees = () => { S.modal = { type: 'cjFees' }; A.renderModal(); };
  MF.cjFees = () => {
    const L = ['Débito', 'Crédito', 'Mercado Pago', 'Transferencia', 'Cheque'];
    return A.modalShell('Comisiones y plazos', '<p class="m-lead">Lo que te descuenta cada medio de pago y en cuántos días llega la plata. Vienen valores aproximados: fijate en tu resumen del banco o de Mercado Pago y ajustalos.</p>' +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Medio</th><th class="num">Comisión %</th><th class="num">Días en llegar</th><th>Llega a</th></tr></thead><tbody>' + L.map(k => { const f = A.cjFee(k); return '<tr><td>' + esc(k) + (k === 'Transferencia' ? '<div class="small-note" style="margin:0">hay que confirmar que llegó</div>' : '') + '</td><td class="num"><input class="cj-sm" inputmode="decimal" data-fk="' + esc(k) + '" data-ff="pct" value="' + (f.pct || 0) + '"></td><td class="num"><input class="cj-sm" inputmode="numeric" data-fk="' + esc(k) + '" data-ff="days" value="' + (f.days || 0) + '"></td><td><select data-fk="' + esc(k) + '" data-ff="acc">' + ACC.filter(a => a[0] !== 'ef').map(a => '<option value="' + a[0] + '"' + (f.acc === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="field" style="margin-top:12px"><label for="cjAlias">Alias o CBU para que te transfieran (va en los recordatorios)</label><input id="cjAlias" value="' + esc(A.CFG.payAlias || '') + '" placeholder="Ej.: consultorio.allen.mp"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cjFeesGo">Guardar</button>');
  };
  A.acts.cjFeesGo = () => {
    const F = A.CFG.cjFees = A.CFG.cjFees || {};
    document.querySelectorAll('#modalHost [data-fk]').forEach(i => { const k = i.getAttribute('data-fk'), f = i.getAttribute('data-ff'); F[k] = F[k] || {}; F[k][f] = f === 'acc' ? i.value : (parseFloat(String(i.value).replace(',', '.')) || 0); });
    A.CFG.payAlias = (($('#cjAlias') || {}).value || '').trim(); log('config', 'Cambió las comisiones y plazos de cobro');
    save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Comisiones guardadas.');
  };

  /* ---------------- recordatorio de deuda por WhatsApp ---------------- */
  A.cjDunText = d => 'Hola ' + String(d.name || '').split(/[ ,]/)[0] + ', ¿cómo estás? Te escribimos de ' + A.CLINIC + '. Te quedó un saldo pendiente de ' + money(d.sal) + '. Cuando puedas, lo podés abonar en tu próxima visita' + (A.CFG.payAlias ? ' o por transferencia al alias ' + A.CFG.payAlias : '') + '. ¡Muchas gracias!';
  A.acts.cjDun = el => {
    const pid = el.getAttribute('data-pid'), d = debtors().filter(x => x.pid === pid)[0]; if (!d) return;
    const url = A.waLink ? A.waLink(d.phone, A.cjDunText(d)) : ''; if (!url) { A.toast('Este paciente no tiene un celular cargado.'); return; }
    (C().dun[pid] = C().dun[pid] || []).push(Object.assign({ amt: d.sal }, stamp())); log('aviso', 'Le recordó a ' + d.name + ' que debe ' + money(d.sal)); save();
    window.open(url, '_blank'); A.refresh();
  };

  /* ---------------- pantallas ---------------- */
  const H = (q, sub) => '<div class="cj-q"><h1>' + q + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
  const card = (t, body, cls) => '<section class="card cj-card' + (cls ? ' ' + cls : '') + '">' + (t ? '<h2>' + t + '</h2>' : '') + body + '</section>';
  const big3 = L => '<div class="cj-big3">' + L.map(x => '<div class="cj-b ' + (x[3] || '') + '"><small>' + x[0] + '</small><b>' + x[1] + '</b>' + (x[2] ? '<span>' + x[2] + '</span>' : '') + '</div>').join('') + '</div>';
  const attrs = o => Object.keys(o || {}).map(k => ' ' + k + '="' + esc(o[k]) + '"').join('');
  const empty = t => '<div class="cj-empty">' + t + '</div>';

  /* el contenido de las pantallas viejas (sin su barra), para meterlo adentro de las nuevas */
  let prevRender = null;
  function oldHTML(sub) {
    const host = $('#view-caja'); if (!host || !prevRender) return '';
    const keep = S.caja.sub; S._cjInit = 1; S.caja.sub = sub;
    try { prevRender(); } catch (e) { S.caja.sub = keep; return ''; }
    host.querySelectorAll('.cash-top, .ag-bar, .cashnav').forEach(n => n.remove());
    const h = host.innerHTML; S.caja.sub = keep; return h;
  }

  function hoyHTML() {
    const t = T(), n = periodNums(t, t), o = openOf(t), cl = closeOf(t), ck = checks(), ef = expEf(t);
    let h = H('¿Cómo viene el día?', A.fmtLong ? A.cap(A.fmtLong(t)) : A.fmtDMY(t));
    h += big3([['Entró hoy', money(n.entro), plural(pays().filter(p => p.date === t).length, 'cobro')], ['Salió hoy', money(n.salio + n.ret), n.ret ? 'incluye retiro ' + money(n.ret) : 'gastos pagados'], ['Queda en el cajón', money(ef), cl ? 'caja cerrada' : o ? 'caja abierta' : 'según lo anotado', 'acc']]);
    h += '<div class="cj-light ' + (ck.some(x => x.lvl === 'bad') ? 'bad' : ck.length ? 'warn' : 'ok') + '">' + (ck.length ? '<b>' + (ck.length === 1 ? 'Hay 1 cosa para revisar' : 'Hay ' + ck.length + ' cosas para revisar') + '</b>' + ck.map(x => '<div class="cj-chk ' + x.lvl + '"><span>' + esc(x.txt) + '</span><button class="btn small" data-act="' + x.act + '"' + attrs(x.args) + '>' + esc(x.btn) + '</button></div>').join('') : '<b>✓ Todo en orden</b><span>No hay nada pendiente de revisar.</span>') + '</div>';
    h += '<div class="cj-acts">' + (cl ? (boss() ? '<button class="btn" data-act="cjReopen" data-d="' + t + '">Reabrir la caja</button>' : '') : o ? '<button class="btn primary" data-act="cjCloseOpen">Cerrar la caja</button>' : '<button class="btn primary" data-act="cjOpenOpen">Abrir la caja</button>' + (worked0(t) ? '<button class="btn" data-act="cjCloseOpen">Cerrar la caja</button>' : '')) +
      '<button class="btn" data-act="mvNew" data-type="egreso">− Anotar un gasto</button><button class="btn" data-act="mvNew" data-type="ingreso">+ Anotar otro ingreso</button><button class="btn" data-act="cjXfer">⇄ Mover plata</button></div>';
    const old = oldHTML('hoy');
    h += '<div class="cj-sep"><h2>Cobros de hoy</h2><p>Lo que pagó cada paciente y para qué profesional. Arriba, lo que falta cobrar.</p></div>' + old;
    h += '<details class="cj-more" id="cjCtl"' + (S._cjCtl ? ' open' : '') + '><summary>Control del día: atendidos, prácticas y cobros</summary>' + oldHTML('control') + '</details>';
    return h;
  }
  const worked0 = d => pays().some(p => p.date === d) || moves().some(m => m.date === d);
  A.acts.cjCtl = () => { S._cjCtl = true; S.caja.sub = 'hoy'; A.refresh(); setTimeout(() => { const d = $('#cjCtl'); if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }, 60); };

  function debenHTML() {
    const D = debtors(), osOw = A.osOwed ? A.osOwed() : 0, totP = D.reduce((s, d) => s + d.sal, 0);
    let cu = []; try { cu = (A.upcomingCuotas ? A.upcomingCuotas(0) : []).filter(x => x.late); } catch (e) { /* nada */ }
    let h = H('¿Quién te debe plata?', 'Pacientes con saldo, cuotas vencidas y lo que te tienen que pagar las obras sociales.');
    h += big3([['Te deben en total', money(totP + osOw), '', 'acc'], ['Pacientes', money(totP), plural(D.length, 'paciente')], ['Obras sociales', money(osOw), 'liquidaciones por cobrar']]);
    const lvlTxt = { ok: 'reciente', warn: 'hace más de un mes', bad: 'hace más de 3 meses' };
    h += card('Pacientes que deben <span class="count">' + D.length + '</span>', D.length ? '<p class="small-note">Los más viejos arriba. Verde: menos de un mes · amarillo: más de un mes · rojo: más de 3 meses.</p><div class="cj-rows">' + D.slice(0, S._cjAllDeb ? 999 : 40).map(d => '<div class="cj-row"><i class="cj-dot ' + d.lvl + '" title="' + lvlTxt[d.lvl] + '"></i><button class="cj-who" data-act="openFicha" data-pid="' + d.pid + '" data-tab="cuenta"><b>' + esc(d.name) + '</b><small>debe desde el ' + A.fmtDMY(d.since) + ' (' + plural(d.days, 'día') + ')' + (d.dun ? ' · le avisaste el ' + A.fmtDMY(d.dun.at.slice(0, 10)) : '') + '</small></button><b class="cj-amt">' + money(d.sal) + '</b><button class="btn small" data-act="cjDun" data-pid="' + d.pid + '"' + (d.phone ? '' : ' disabled title="Sin celular cargado"') + '>Recordarle</button></div>').join('') + '</div>' + (D.length > 40 && !S._cjAllDeb ? '<button class="btn small ghost" data-act="cjAllDeb">Ver los ' + D.length + '</button>' : '') : empty('Nadie te debe plata. 🎉'));
    if (cu.length) h += card('Cuotas vencidas <span class="count">' + cu.length + '</span>', '<div class="cj-rows">' + cu.map(x => '<div class="cj-row"><i class="cj-dot bad"></i><button class="cj-who" data-act="openFicha" data-pid="' + x.p.id + '" data-tab="cuenta"><b>' + esc(x.p.name) + '</b><small>' + esc(x.l.label) + ' · venció el ' + A.fmtDMY(x.l.due) + '</small></button><b class="cj-amt">' + money(x.rest) + '</b></div>').join('') + '</div>');
    h += '<div class="cj-sep"><h2>Obras sociales</h2><p>Lo que cada obra social te tiene que pagar por mes. Cuando llega la plata, tocá «Llegó el pago».</p></div>' + oldHTML('os');
    return h;
  }
  A.acts.cjAllDeb = () => { S._cjAllDeb = true; A.refresh(); };

  function pagarHTML() {
    const t = T(), L = C().moves.filter(m => m.status === 'pendiente' && m.type === 'egreso').sort((a, b) => ((a.due || a.date) < (b.due || b.date) ? -1 : 1));
    const tot = L.reduce((s, m) => s + +m.amount, 0), venc = L.filter(m => (m.due || m.date) < t), sem = L.filter(m => (m.due || m.date) >= t && (m.due || m.date) <= A.add(t, 7));
    let h = H('¿Qué tenés que pagar?', 'Lo que le debés a proveedores, al laboratorio, el alquiler y los gastos fijos. Lo vencido, arriba.');
    h += big3([['Tenés que pagar', money(tot), plural(L.length, 'cuenta'), 'acc'], ['Vencido', money(venc.reduce((s, m) => s + +m.amount, 0)), plural(venc.length, 'cuenta'), venc.length ? 'bad' : ''], ['Esta semana', money(sem.reduce((s, m) => s + +m.amount, 0)), plural(sem.length, 'cuenta')]]);
    h += '<div class="cj-acts"><button class="btn primary" data-act="mvNewPend">+ Anotar algo para pagar</button><button class="btn" data-act="mvFijos">Cargar los gastos fijos del mes</button></div>';
    const due = m => { const d = m.due || m.date, n = Math.round((A.parse(d) - A.parse(t)) / 864e5); return n < 0 ? '<span class="chip bad">venció hace ' + plural(-n, 'día') + '</span>' : n === 0 ? '<span class="chip warn">vence hoy</span>' : '<span class="chip">vence en ' + plural(n, 'día') + '</span>'; };
    h += card('Cuentas por pagar', L.length ? '<div class="cj-rows">' + L.map(m => '<div class="cj-row"><i class="cj-dot ' + ((m.due || m.date) < t ? 'bad' : 'warn') + '"></i><div class="cj-who"><b>' + esc(m.desc) + '</b><small>' + esc(m.prov || A.cashCatName(m.cat)) + ' · ' + due(m) + '</small></div><b class="cj-amt">' + money(m.amount) + '</b><button class="btn small primary" data-act="mvPay" data-id="' + m.id + '">Ya lo pagué</button><button class="btn small ghost" data-act="mvEdit" data-id="' + m.id + '">Editar</button></div>').join('') + '</div>' : empty('No tenés nada pendiente de pago.'));
    /* proveedores: cuánto se les pagó en los últimos 3 meses y cuánto se les debe */
    const lo = A.addMonths(t, -3), P = {};
    C().moves.forEach(m => { if (m.type !== 'egreso' || !m.prov) return; const r = P[m.prov] || (P[m.prov] = { paid: 0, owe: 0, last: '' }); if (m.status === 'pendiente') r.owe += +m.amount; else if (m.date >= lo) { r.paid += +m.amount; if (m.date > r.last) r.last = m.date; } });
    const ks = Object.keys(P).sort((a, b) => P[b].owe - P[a].owe || P[b].paid - P[a].paid);
    h += card('Proveedores', ks.length ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Proveedor</th><th class="num">Le debés</th><th class="num">Pagado (3 meses)</th><th>Última compra</th></tr></thead><tbody>' + ks.map(k => '<tr><td><b>' + esc(k) + '</b></td><td class="num">' + (P[k].owe ? '<b class="saldo-pos">' + money(P[k].owe) + '</b>' : '—') + '</td><td class="num">' + money(P[k].paid) + '</td><td>' + (P[k].last ? A.fmtDMY(P[k].last) : '—') + '</td></tr>').join('') + '</tbody></table></div>' : empty('Cuando anotes un gasto, poné a quién le pagaste y acá vas a ver cuánto le debés y cuánto le pagaste a cada proveedor.'));
    return h;
  }

  function plataHTML() {
    const t = T(), z = a0(), P = pays();
    let h = H('¿Dónde está tu plata?', 'Cuánto hay en el cajón, en el banco y en Mercado Pago, y lo que todavía está por llegar.');
    if (!z || z.banco == null) {
      h += card('Para empezar, decime con cuánto arrancás', boss() ? '<p class="small-note">Fijate cuánto hay hoy en cada lugar (el home banking, la app de Mercado Pago y el cajón). Es una sola vez: después la app lo va siguiendo sola con cada cobro y cada gasto.</p><div class="cj-start">' + ACC.map(a => '<div class="field"><label for="cs_' + a[0] + '">' + a[1] + ' <small>(' + a[2] + ')</small></label><input id="cs_' + a[0] + '" inputmode="numeric" placeholder="$" value="' + (z && z[a[0]] != null ? z[a[0]] : '') + '"></div>').join('') + '</div><button class="btn primary" data-act="cjStartGo">Guardar</button>' : '<p class="small-note">Le falta al dueño o a la administración poner con cuánto arranca cada cuenta.</p>', 'cj-hl');
    }
    const way = acc => P.filter(p => p.acc === acc && p.acc !== 'ef' && p.date >= A.add(t, -60) && (!p.arr || p.arr > t) && !(p.ac && p.ac.ok === false));
    h += '<div class="cj-accs">' + ACC.map(a => { const b = bal(a[0]), w = way(a[0]), ws = w.reduce((s, p) => s + p.net, 0); return '<div class="cj-acc"><small>' + a[1] + '</small><b>' + (b == null ? '—' : money(b)) + '</b>' + (ws ? '<span>+ ' + money(ws) + ' por llegar</span>' : '<span>' + a[2] + '</span>') + '</div>'; }).join('') + '</div>';
    h += '<div class="cj-acts"><button class="btn" data-act="cjXfer">⇄ Mover plata</button><button class="btn" data-act="cjAdj">El saldo no coincide</button>' + (boss() ? '<button class="btn ghost" data-act="cjFees">Comisiones y plazos</button>' : '') + '</div>';
    const tc = P.filter(p => p.needConf && p.date >= confFrom() && (!p.ac || p.ac.ok === false)).sort((a, b) => (a.date < b.date ? -1 : 1));
    h += card('Transferencias para confirmar <span class="count">' + tc.length + '</span>', '<p class="small-note">Que un paciente diga «te transferí» no alcanza: fijate en el banco y tocá «Llegó». Mientras tanto no cuenta como plata en el banco.</p>' + (tc.length ? '<div class="cj-rows">' + tc.map(p => '<div class="cj-row"><i class="cj-dot ' + (p.ac && p.ac.ok === false ? 'bad' : 'warn') + '"></i><div class="cj-who"><b>' + esc(p.name) + '</b><small>' + A.fmtDMY(p.date) + (p.ac && p.ac.ok === false ? ' · no se encontró: ' + esc(p.ac.why || '') : '') + '</small></div><b class="cj-amt">' + money(p.amt) + '</b><button class="btn small primary" data-act="cjAcred" data-id="' + p.id + '">Llegó</button>' + (p.ac ? '' : '<button class="btn small ghost" data-act="cjAcredNo" data-id="' + p.id + '">No la veo</button>') + '</div>').join('') + '</div>' + (tc.length > 3 ? '<button class="btn small" data-act="cjAcredAll">Llegaron todas</button>' : '') : empty('No hay transferencias para confirmar.')));
    const cards = P.filter(p => !p.needConf && p.acc !== 'ef' && p.acc !== 'chica' && p.date >= A.add(t, -60) && p.due > t).sort((a, b) => (a.due < b.due ? -1 : 1));
    if (cards.length) h += card('Tarjetas y Mercado Pago por acreditarse', '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Paciente</th><th>Medio</th><th class="num">Cobraste</th><th class="num">Comisión</th><th class="num">Te llega</th><th>Cuándo</th></tr></thead><tbody>' + cards.map(p => '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.method) + '</td><td class="num">' + money(p.amt) + '</td><td class="num">− ' + money(p.fee) + '</td><td class="num"><b>' + money(p.net) + '</b></td><td>' + A.fmtDMY(p.due) + '</td></tr>').join('') + '</tbody></table></div>');
    const fm = periodNums(t.slice(0, 7) + '-01', t).fees; if (fm) h += '<p class="small-note">Este mes las comisiones de tarjetas y Mercado Pago suman <b>' + money(fm) + '</b>. Ya se cuentan como gasto en «El mes».</p>';
    return h;
  }

  function mesHTML() {
    const t = T(), mk = S.caja.mk || t.slice(0, 7), r = monthRange(mk), n = periodNums(r[0], r[1]);
    const pm = A.addMonths(mk + '-01', -1).slice(0, 7), nm = A.addMonths(mk + '-01', 1).slice(0, 7), pn = periodNums(pm + '-01', pm + '-31');
    let h = '<div class="cj-q cj-qm"><div><h1>¿Cómo te fue en ' + monName(mk) + '?</h1><p>Lo que entró, lo que salió y lo que quedó. Sin vueltas.</p></div><div class="cj-mnav"><button class="btn small" data-act="cjMk" data-m="' + pm + '" aria-label="Mes anterior">‹</button>' + (mk !== t.slice(0, 7) ? '<button class="btn small" data-act="cjMk" data-m="' + t.slice(0, 7) + '">Este mes</button>' : '') + (nm <= t.slice(0, 7) ? '<button class="btn small" data-act="cjMk" data-m="' + nm + '" aria-label="Mes siguiente">›</button>' : '') + '</div></div>';
    h += '<div class="cj-res ' + (n.gano >= 0 ? 'ok' : 'bad') + '"><small>' + (n.gano >= 0 ? 'Ganaste' : 'Perdiste') + '</small><b>' + money(Math.abs(n.gano)) + '</b><span>' + (pn.entro ? (n.gano >= pn.gano ? '▲ ' : '▼ ') + money(Math.abs(n.gano - pn.gano)) + ' ' + (n.gano >= pn.gano ? 'más' : 'menos') + ' que en ' + MON[+pm.slice(5) - 1] : '') + '</span></div>';
    h += big3([['Entró', money(n.entro), 'pacientes ' + money(n.cob) + (n.os ? ' · obras sociales ' + money(n.os) : '') + (n.ing ? ' · otros ' + money(n.ing) : '')], ['Salió', money(n.salio), 'gastos y comisiones'], ['Te llevaste', money(n.ret), 'retiros del dueño']]);
    const ks = Object.keys(n.byCat).sort((a, b) => n.byCat[b] - n.byCat[a]), mx = Math.max.apply(null, ks.map(k => n.byCat[k]).concat([1]));
    h += card('¿En qué se fue la plata?', ks.length ? ks.map(k => '<div class="bar-row"><span>' + esc(A.cashCatName(k)) + '</span><div class="bar"><i style="width:' + Math.round(n.byCat[k] / mx * 100) + '%"></i></div><span class="mono right">' + money(n.byCat[k]) + '</span></div>').join('') : empty('No hay gastos anotados este mes.'));
    const mkeys = Object.keys(n.pm).sort((a, b) => n.pm[b] - n.pm[a]);
    if (mkeys.length) h += card('¿Cómo te pagaron los pacientes?', mkeys.map(k => '<div class="bar-row"><span>' + esc(k) + '</span><div class="bar"><i style="width:' + Math.round(n.pm[k] / Math.max(n.cob, 1) * 100) + '%"></i></div><span class="mono right">' + money(n.pm[k]) + '</span></div>').join(''));
    if (A.cjFactHTML) h += A.cjFactHTML(mk);
    h += card('Para el contador', '<p class="small-note">Todo el mes en un archivo: cobros, gastos, comisiones, obras sociales, retiros y facturas. Mandáselo tal cual.</p><div class="cj-acts"><button class="btn primary" data-act="cjAcctPdf" data-m="' + mk + '">Descargar resumen (PDF)</button><button class="btn" data-act="cjAcctCsv" data-m="' + mk + '">Descargar planilla (Excel)</button></div>');
    h += '<details class="cj-more"><summary>Más números: punto de equilibrio y otros</summary>' + oldHTML('resumen') + '</details>';
    return h;
  }
  A.acts.cjMk = el => { S.caja.mk = el.getAttribute('data-m'); A.refresh(); };

  /* historial: todo lo que pasó, con quién */
  function histRows(lo, hi) {
    const R = [], inR = d => d >= lo && d <= hi;
    pays().forEach(p => { if (inR(p.date)) R.push({ d: p.date, k: 'cob', t: 'Cobro · ' + p.name, s: p.method + (p.fee ? ' (comisión ' + money(p.fee) + ')' : '') + (p.needConf ? (p.ac && p.ac.ok !== false ? ' · llegó ✓' : ' · sin confirmar') : ''), amt: p.amt, pid: p.pid }); });
    C().moves.forEach(m => { if (!inR(m.date)) return; R.push({ d: m.date, k: m.type === 'ingreso' ? 'ing' : 'gas', t: (m.type === 'ingreso' ? 'Ingreso · ' : (m.status === 'pendiente' ? 'Para pagar · ' : 'Gasto · ')) + (m.desc || ''), s: (m.prov ? m.prov + ' · ' : '') + (m.method || '') + (m.by ? ' · ' + m.by : '') + (m.chargePro ? ' · a cargo de ' + ((A.PRO(m.chargePro) || {}).short || '') : ''), amt: m.type === 'ingreso' ? +m.amount : -m.amount, mv: m, pend: m.status === 'pendiente' }); });
    osPays().forEach(o => { if (inR(o.date)) R.push({ d: o.date, k: 'ing', t: 'Pago de obra social · ' + o.os.replace(/^os-/, '').toUpperCase() + ' (' + monName(o.mk) + ')', s: o.r.by || '', amt: o.amt }); });
    C().xfer.forEach(x => { if (inR(x.date)) R.push({ d: x.date, k: 'cor', t: 'Movió plata · ' + accName(x.from) + ' → ' + accName(x.to).toLowerCase(), s: (x.why || '') + (x.by ? ' · ' + x.by : ''), amt: 0, show: money(x.amt) }); });
    C().adj.forEach(j => { if (inR(j.date)) R.push({ d: j.date, k: 'cor', t: 'Corrección · ' + accName(j.acc), s: (j.why || '') + (j.by ? ' · ' + j.by : ''), amt: +j.amt }); });
    C().voids.forEach(m => { if (inR(m.date) || (m.void && inR(m.void.at.slice(0, 10)))) R.push({ d: m.date, k: 'cor', t: 'Anulado · ' + (m.desc || ''), s: 'anuló ' + ((m.void || {}).by || '') + ' el ' + A.fmtDMY(((m.void || {}).at || '').slice(0, 10)) + ': ' + ((m.void || {}).why || ''), amt: 0, show: money(m.amount), voided: 1 }); });
    (A.allPids ? A.allPids() : []).forEach(id => { const pd = A.pd(id); (pd && pd.ledger || []).forEach(e => { if (e.type === 'pago' && e.voided && !e.anula && e.voidWhy && inR(e.date)) R.push({ d: e.date, k: 'cor', t: 'Cobro anulado · ' + ((A.PAT(id) || {}).name || ''), s: 'anuló ' + (e.voidBy || '') + ': ' + e.voidWhy, amt: 0, show: money(e.amount), voided: 1 }); }); });
    /* correcciones y aclaraciones hechas al cobrar (para que el dueño las vea) */
    (A.allPids ? A.allPids() : []).forEach(id => { const pd = A.pd(id), nm = (A.PAT(id) || {}).name || ''; (pd && pd.ledger || []).forEach(e => {
      if (!inR(e.date) || e.voided) return;
      if (e.type === 'ajuste' && (e.rcpFix || e.plOver || e.free)) R.push({ d: e.date, k: 'cor', t: 'Corrección en el cobro · ' + nm, s: String(e.desc || '') + (e.by ? ' · ' + e.by : ''), amt: +e.amount || 0, pid: id });
      else if (e.type === 'cargo' && (e.freeWhy || e.why)) R.push({ d: e.date, k: 'cor', t: (e.freeWhy ? 'No se cobró · ' : 'Aclaración · ') + nm, s: (e.freeWhy || e.why) + ' · ' + String(e.desc || '').split(' · ').slice(0, 2).join(' · ') + (e.cobBy ? ' · ' + e.cobBy : ''), amt: 0, show: money(e.amount), pid: id });
    }); });
    return R.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  }
  function histHTML() {
    const t = T(), hr = S.caja.hr || 'mes', hf = S.caja.hf || 'todo';
    const rg = { hoy: [t, t], sem: [A.add(t, -6), t], mes: [t.slice(0, 7) + '-01', t], ant: [A.addMonths(t, -1).slice(0, 7) + '-01', A.addMonths(t, -1).slice(0, 7) + '-31'] }[hr];
    let R = histRows(rg[0], rg[1]); if (hf !== 'todo') R = R.filter(r => r.k === hf || (hf === 'gas' && r.k === 'ing'));
    let h = H('Todo lo que pasó', 'Cada cobro, gasto, movimiento y corrección, con quién lo hizo. Nada se borra: lo anulado queda tachado.');
    h += '<div class="cj-acts"><div class="seg" role="group" aria-label="Período">' + [['hoy', 'Hoy'], ['sem', '7 días'], ['mes', 'Este mes'], ['ant', 'Mes pasado']].map(x => '<button data-act="cjHr" data-v="' + x[0] + '" aria-pressed="' + (hr === x[0]) + '">' + x[1] + '</button>').join('') + '</div><div class="seg" role="group" aria-label="Qué ver">' + [['todo', 'Todo'], ['cob', 'Cobros'], ['gas', 'Gastos e ingresos'], ['cor', 'Correcciones']].map(x => '<button data-act="cjHf" data-v="' + x[0] + '" aria-pressed="' + (hf === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div>';
    let last = '';
    h += card('', R.length ? '<div class="cj-rows cj-hist">' + R.slice(0, 400).map(r => { const sep = r.d !== last ? '<div class="cj-day">' + A.cap(dayName(r.d)) + '</div>' : ''; last = r.d; return sep + '<div class="cj-row' + (r.voided ? ' void' : '') + (r.pend ? ' pend' : '') + '"><i class="cj-dot ' + (r.k === 'cor' ? 'warn' : r.amt < 0 ? 'bad' : 'ok') + '"></i><div class="cj-who"><b>' + esc(r.t) + '</b><small>' + esc(r.s) + '</small></div><b class="cj-amt ' + (r.amt < 0 ? 'neg' : '') + '">' + (r.show || ((r.amt < 0 ? '− ' : r.amt > 0 ? '+ ' : '') + money(Math.abs(r.amt)))) + '</b>' + (r.mv ? '<button class="btn small ghost" data-act="mvEdit" data-id="' + r.mv.id + '">Editar</button>' + (boss() ? '<button class="btn small ghost" data-act="mvDel" data-id="' + r.mv.id + '">Anular</button>' : '') : r.pid ? '<button class="btn small ghost" data-act="openFicha" data-pid="' + r.pid + '" data-tab="cuenta">Ver</button>' : '') + '</div>'; }).join('') + '</div>' : empty('No hay movimientos en este período.'));
    const CL = C().closes.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 60);
    h += card('Cierres de caja', CL.length ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Día</th><th class="num">Contado</th><th>Resultado</th><th>Cerró</th><th></th></tr></thead><tbody>' + CL.map(c => '<tr' + (c.re ? ' class="cj-void"' : '') + '><td>' + A.fmtDMY(c.date) + '</td><td class="num">' + money(c.counted) + '</td><td>' + (!c.diff ? '<span class="chip ok">justo</span>' : '<span class="chip ' + (c.diff > 0 ? 'warn' : 'bad') + '">' + (c.diff > 0 ? 'sobraron ' : 'faltaron ') + money(Math.abs(c.diff)) + '</span> ' + esc(c.note || '')) + (c.re ? '<div class="small-note" style="margin:0">reabierta por ' + esc(c.re.by || '') + ': ' + esc(c.re.why || '') + '</div>' : '') + '</td><td>' + esc(c.by || '') + '</td><td>' + (!c.re && boss() ? '<button class="btn small ghost" data-act="cjReopen" data-d="' + c.date + '">Reabrir</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : empty('Todavía no se cerró ninguna caja.'));
    const LG = C().log.slice(-80).reverse();
    h += '<details class="cj-more"><summary>Registro completo de la caja (quién hizo qué)</summary>' + (LG.length ? '<div class="cj-rows">' + LG.map(l => '<div class="cj-row"><i class="cj-dot ' + (l.k === 'tarde' || l.k === 'anular' ? 'bad' : 'ok') + '"></i><div class="cj-who"><b>' + esc(l.txt) + '</b><small>' + esc(l.by || '') + ' · ' + esc(new Date(l.at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })) + '</small></div></div>').join('') + '</div>' : empty('Sin registros todavía.')) + '</details>';
    return h;
  }
  A.acts.cjCorr = () => { S.tab = 'caja'; S.caja = S.caja || {}; S.caja.sub = 'hist'; S.caja.hr = 'hoy'; S.caja.hf = 'cor'; A.refresh(); window.scrollTo(0, 0); };
  A.acts.cjHr = el => { S.caja.hr = el.getAttribute('data-v'); A.refresh(); };
  A.acts.cjHf = el => { S.caja.hf = el.getAttribute('data-v'); A.refresh(); };

  /* ---------------- navegación de la caja ---------------- */
  const NAV = [['hoy', 'Hoy'], ['deben', 'Te deben'], ['pagar', 'Tenés que pagar'], ['plata', 'Tu plata'], ['mes', 'El mes'], ['hist', 'Historial']];
  const OLD = { resumen: 'mes', control: 'hoy', mov: 'hist', pend: 'pagar', cierre: 'hoy', os: 'deben', cuentas: 'plata' };
  const RENDER = { hoy: hoyHTML, deben: debenHTML, pagar: pagarHTML, plata: plataHTML, mes: mesHTML, hist: histHTML };
  A.acts.cjSub = el => { S.caja.sub = el.getAttribute('data-s'); A.refresh(); const v = $('#view-caja'); if (v) window.scrollTo({ top: 0 }); };
  const cr = A.render.caja;
  prevRender = cr;
  A.render.caja = function () {
    if (A.CFG.cajaOld === true || (isEmp() && !S.cajaGral)) return cr.apply(this, arguments);
    if (A.cashSeed) A.cashSeed();
    S.caja = S.caja || {}; S._cjInit = 1;
    let sub = S.caja.sub || 'hoy'; if (OLD[sub]) sub = OLD[sub]; if (!RENDER[sub]) sub = 'hoy'; S.caja.sub = sub;
    const host = $('#view-caja'); if (!host) return;
    let body = ''; try { body = RENDER[sub](); } catch (e) { if (A.logError) A.logError('caja86', e); body = '<div class="card"><div class="empty">No se pudo mostrar esta parte de la caja.</div></div>'; }
    S.caja.sub = sub;
    host.innerHTML = '<div class="cash-top"><div class="seg cashnav cj-nav" role="group" aria-label="Secciones de la caja">' + NAV.map(x => '<button data-act="cjSub" data-s="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div><div class="cj-wrap">' + body + '</div>';
  };
  /* los botones viejos que llevaban a otra sección */
  const subPrev = A.acts.cajaSub; A.acts.cajaSub = el => { const s = el.getAttribute('data-s'); S.caja.sub = OLD[s] || s; if (s === 'control') S._cjCtl = true; A.refresh(); };

  /* ---------------- voz ---------------- */
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = function (text) {
    const s = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^\s*(navi|odontovoz|asistente)[,\s]+/, '').trim();
    const go = sub => { S.tab = 'caja'; S.caja = S.caja || {}; S.caja.sub = sub; A.refresh(); };
    const no = { ok: true, msg: 'Eso lo ve recepción o el dueño.' };
    try {
      if (/^(abri|abrir|abrime|abramos)( la)? caja\b/.test(s)) { if (!moneyOk()) return no; go('hoy'); if (openOf(T()) || closeOf(T())) return { ok: true, msg: closeOf(T()) ? 'La caja de hoy ya está cerrada.' : 'La caja ya está abierta.' }; A.acts.cjOpenOpen(); return { ok: true, msg: 'Contá la plata del cajón.' }; }
      if (/^(cerra|cerrar|cerrame|cerremos|hace el cierre|haceme el cierre)( (la|de) )?caja\b|^cierre de caja$/.test(s)) { if (!moneyOk()) return no; go('hoy'); if (closeOf(T())) return { ok: true, msg: 'La caja de hoy ya está cerrada.' }; A.acts.cjCloseOpen(); return { ok: true, msg: 'Contá la plata del cajón.' }; }
      if (/cuant[oa] (plata )?(hay|tengo|queda|tenemos)( de plata)? en (la )?(caja|cajon)|cuanto hay en el cajon|cuanta plata (hay|tengo|tenemos)\b/.test(s)) {
        if (!moneyOk()) return no; go('plata'); const b = bal('banco'), m = bal('mp');
        return { ok: true, msg: 'En el cajón tendría que haber ' + money(expEf()) + '.' + (b != null ? ' En el banco, ' + money(b) + '.' : '') + (m ? ' En Mercado Pago, ' + money(m) + '.' : '') };
      }
      if (/qui[e]?n(es)? me debe|quienes deben|cuanto me deben|cuanto nos deben|quien debe plata/.test(s)) {
        if (!moneyOk()) return no; go('deben'); const D = debtors(), tot = D.reduce((x, d) => x + d.sal, 0), os = A.osOwed ? A.osOwed() : 0;
        return { ok: true, msg: D.length ? 'Te deben ' + money(tot + os) + ': ' + plural(D.length, 'paciente') + (os ? ' y las obras sociales ' + money(os) : '') + '. El que más hace que debe: ' + D[0].name + ', ' + money(D[0].sal) + '.' : (os ? 'Los pacientes no deben nada. Las obras sociales te deben ' + money(os) + '.' : 'Nadie te debe plata.') };
      }
      if (/que tengo que pagar|que debo|cuanto debo|que hay que pagar/.test(s)) { if (!moneyOk()) return no; go('pagar'); const L = C().moves.filter(m => m.status === 'pendiente' && m.type === 'egreso'); return { ok: true, msg: L.length ? 'Tenés ' + plural(L.length, 'cuenta') + ' para pagar, ' + money(L.reduce((x, m) => x + +m.amount, 0)) + ' en total.' : 'No tenés nada pendiente de pago.' }; }
      if (/como (nos|me) (fue|va|esta yendo) (este|en el|el) mes|cuanto (ganamos|gane|ganaste) (este|el) mes|ganamos (plata )?este mes/.test(s)) { if (!moneyOk()) return no; go('mes'); const t = T(), n = periodNums(t.slice(0, 7) + '-01', t); return { ok: true, msg: 'Este mes entraron ' + money(n.entro) + ' y salieron ' + money(n.salio) + ': ' + (n.gano >= 0 ? 'vas ganando ' : 'vas perdiendo ') + money(Math.abs(n.gano)) + '.' }; }
      if (/como (viene|va) (la caja|el dia)|esta todo en orden( en la caja)?|hay algo para revisar/.test(s)) { if (!moneyOk()) return no; go('hoy'); const ck = checks(); return { ok: true, msg: ck.length ? 'Hay ' + plural(ck.length, 'cosa') + ' para revisar: ' + ck[0].txt : 'Todo en orden en la caja.' }; }
    } catch (e) { /* sigue el intérprete de siempre */ }
    return execPrev.apply(this, arguments);
  };

  /* ---------------- estilos ---------------- */
  const css = document.createElement('style');
  css.textContent = '#view-caja .cj-wrap{display:flex;flex-direction:column;gap:12px;padding-bottom:40px}' +
    '#view-caja .cj-nav button{font-size:15px;padding:8px 14px}' +
    '.cj-q h1{margin:6px 0 2px;font-size:1.45rem;line-height:1.2}.cj-q p{margin:0;color:var(--muted,#667);font-size:.95rem}' +
    '.cj-qm{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap}.cj-mnav{display:flex;gap:6px}' +
    '.cj-big3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cj-b{background:var(--surface,#fff);border:1px solid var(--line,#dde3e2);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '.cj-b small{font-size:.85rem;color:var(--muted,#667)}.cj-b b{font-size:1.55rem;line-height:1.15;font-variant-numeric:tabular-nums}.cj-b span{font-size:.8rem;color:var(--muted,#667)}' +
    '.cj-b.acc{background:var(--accent-soft,#e6f3f2);border-color:var(--accent,#0f6f6c)}.cj-b.acc b{color:var(--accent,#0f6f6c)}.cj-b.bad b{color:var(--bad,#c0392b)}' +
    '.cj-light{border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;border:1px solid}.cj-light>b{font-size:1.05rem}.cj-light>span{font-size:.9rem}' +
    '.cj-light.ok{background:color-mix(in srgb,#1e8a5a 10%,var(--surface,#fff));border-color:#1e8a5a}.cj-light.ok>b{color:#1e8a5a}' +
    '.cj-light.warn{background:color-mix(in srgb,#e8a33d 12%,var(--surface,#fff));border-color:#e8a33d}.cj-light.bad{background:color-mix(in srgb,#c0392b 9%,var(--surface,#fff));border-color:#c0392b}' +
    '.cj-chk{display:flex;align-items:center;gap:10px;justify-content:space-between;font-size:.95rem}.cj-chk span{flex:1}.cj-chk.bad span::before{content:"● ";color:#c0392b}.cj-chk.warn span::before{content:"● ";color:#e8a33d}' +
    '.cj-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.cj-sep{margin-top:10px}.cj-sep h2{margin:0;font-size:1.15rem}.cj-sep p{margin:2px 0 0;color:var(--muted,#667);font-size:.9rem}' +
    '.cj-more{border:1px solid var(--line,#dde3e2);border-radius:14px;background:var(--surface,#fff);padding:4px 12px}.cj-more>summary{cursor:pointer;padding:10px 0;font-weight:600}.cj-more[open]>summary{border-bottom:1px solid var(--line,#dde3e2);margin-bottom:10px}' +
    '.cj-card{margin:0}.cj-card.cj-hl{border-color:var(--accent,#0f6f6c);box-shadow:0 0 0 2px var(--accent-soft,#e6f3f2)}' +
    '.cj-rows{display:flex;flex-direction:column}.cj-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line,#eee)}.cj-row:first-child{border-top:0}' +
    '.cj-row .btn{flex:none}.cj-who{flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer}.cj-who b{display:block}.cj-who small{display:block;color:var(--muted,#667);font-size:.82rem}' +
    '.cj-amt{white-space:nowrap;font-variant-numeric:tabular-nums}.cj-amt.neg{color:var(--bad,#c0392b)}.cj-row.void .cj-who b,.cj-row.void .cj-amt{text-decoration:line-through;opacity:.6}.cj-row.pend{opacity:.75}.cj-void td{opacity:.55}' +
    '.cj-dot{width:11px;height:11px;border-radius:50%;flex:0 0 11px;background:#1e8a5a}.cj-dot.warn{background:#e8a33d}.cj-dot.bad{background:#c0392b}' +
    '.cj-day{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#667);padding:12px 0 2px;border-top:1px solid var(--line,#eee)}.cj-hist .cj-day:first-child{border-top:0;padding-top:0}.cj-day+.cj-row{border-top:0}' +
    '.cj-empty{padding:14px 0;color:var(--muted,#667)}' +
    '.cj-accs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cj-acc{background:var(--surface,#fff);border:1px solid var(--line,#dde3e2);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column}.cj-acc small{color:var(--muted,#667)}.cj-acc b{font-size:1.4rem;font-variant-numeric:tabular-nums}.cj-acc span{font-size:.8rem;color:var(--muted,#667)}' +
    '.cj-start{display:grid;grid-template-columns:repeat(2,1fr);gap:0 12px;margin-bottom:8px}' +
    '.cj-res{border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;border:1px solid}.cj-res small{font-size:1rem}.cj-res b{font-size:2.2rem;line-height:1.1;font-variant-numeric:tabular-nums}.cj-res span{font-size:.88rem;opacity:.85}' +
    '.cj-res.ok{background:color-mix(in srgb,#1e8a5a 10%,var(--surface,#fff));border-color:#1e8a5a}.cj-res.ok b{color:#1e8a5a}.cj-res.bad{background:color-mix(in srgb,#c0392b 9%,var(--surface,#fff));border-color:#c0392b}.cj-res.bad b{color:#c0392b}' +
    '.cj-count{border:1px solid var(--line,#dde3e2);border-radius:14px;padding:10px 12px;margin:10px 0}.cj-count-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}' +
    '.cj-bills{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 12px}.cj-bill{display:grid;grid-template-columns:1fr 84px;align-items:center;gap:2px 8px;font-size:.95rem}.cj-bill input{text-align:right;padding:6px 8px;font-size:1rem}.cj-bill small{grid-column:2;font-size:.7rem;color:var(--muted,#667);text-align:right;margin-top:-2px}' +
    '.cj-count-t{margin-top:10px;font-size:1.05rem;text-align:right}.cj-count-t b{font-size:1.3rem}' +
    '.cj-exp{background:var(--bg-soft,rgba(0,0,0,.035));border-radius:10px;padding:8px 12px;margin:8px 0}' +
    '.cj-diff{border-radius:10px;padding:8px 12px;margin:8px 0;font-weight:600}.cj-diff.warn{background:color-mix(in srgb,#e8a33d 18%,transparent)}.cj-diff.bad{background:color-mix(in srgb,#c0392b 14%,transparent);color:#a5281b}.cj-diff.big{font-size:1.5rem;text-align:center;padding:14px}' +
    '.cj-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.cj-sum td{padding:5px 4px}' +
    '.cj-rest{font-size:1.3rem;font-weight:700;padding:8px 0}.cj-opts{display:flex;flex-direction:column;gap:8px;margin-top:6px}.cj-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line,#dde3e2);border-radius:12px;padding:10px 12px;cursor:pointer}.cj-opt span{display:flex;flex-direction:column}.cj-opt small{color:var(--muted,#667)}' +
    '.cj-done{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 0;text-align:center}.cj-ok{width:64px;height:64px;border-radius:50%;background:#1e8a5a;color:#fff;font-size:36px;display:flex;align-items:center;justify-content:center}.cj-done b{font-size:1.3rem}' +
    'input.cj-sm{width:76px;text-align:right}' +
    '@media (max-width:700px){.cj-big3{grid-template-columns:1fr 1fr}.cj-big3 .cj-b:first-child{grid-column:1/-1}.cj-b b{font-size:1.35rem}.cj-accs{grid-template-columns:1fr 1fr}.cj-start{grid-template-columns:1fr}.cj-row{flex-wrap:wrap}.cj-row .cj-who{flex:1 1 60%}.cj-q h1{font-size:1.3rem}#view-caja .cj-nav{overflow-x:auto!important;flex-wrap:nowrap!important;display:flex!important;max-width:100%;scrollbar-width:none}#view-caja .cj-nav button{white-space:nowrap;flex:0 0 auto}.cj-bills{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})();
