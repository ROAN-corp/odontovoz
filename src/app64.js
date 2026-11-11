/* ===== 1.47: Caja «Hoy» (cobros del día por odontólogo) + obras sociales que pagan después (lo que te deben, «llegó el pago») ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isEmp = () => S.setup && S.setup.type === 'empresa';
  const canCfg = () => !A.isMember || !A.isMember() || (A.mbRole && A.mbRole() === 'admin');
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monName = m => A.cap(MON[+m.slice(5) - 1]) + ' ' + m.slice(0, 4);

  /* =================== OBRAS SOCIALES =================== */
  /* OSOEFRNyN: no estaba en la lista; se suma una vez (sin coseguro: el paciente no paga nada) */
  const OSO = { sigla: 'OSOEFRNyN', name: 'Obra Social de Obreros Empacadores de Fruta de Río Negro y Neuquén', kind: 'sindical', via: '', on: true, auth: false, plans: '', notes: 'Paga aprox. al mes. Sin coseguro.', upd: null, aran: {}, cop: 'none' };
  let osDone = false;
  const osSeed = () => {
    if (osDone || !A.osList || !canCfg()) return; osDone = true;
    const l = A.osList(); if (l.some(o => /osoefrnyn|empacadores/.test(norm(o.sigla + ' ' + o.name)))) return;
    l.push(Object.assign({ id: 'os-osoefrnyn' }, OSO)); A.save();
  };

  /* si el paciente tiene una obra social que «no cobra nada al paciente» y la práctica no está cargada en su lista,
     igual la cubre la obra social (al precio de tu lista, como estimado) y no aparece «para cobrar» */
  const ppPrev = A.pracParse;
  if (ppPrev) A.pracParse = function (text, pid) {
    const out = ppPrev.apply(this, arguments) || [];
    try {
      const os = A.osOf && A.osOf(A.PAT(pid));
      if (os && os.on && (os.cop || A.CFG.copDef) === 'none') out.forEach(it => {
        if (it.os) return;
        it.os = { id: os.id, sigla: os.sigla, code: null, cov: it.price || 0, cos: 0, mode: 'none', est: true }; it.pay = 0;
      });
    } catch (e) { /* nada */ }
    return out;
  };
  /* lo que paga la obra social no queda «para cobrar» al paciente */
  const poPrev = A.acts.poGo;
  if (poPrev) A.acts.poGo = function () {
    const m = S.modal, pid = m && m.pid;
    const r = poPrev.apply(this, arguments);
    try {
      if (pid) { const pd = A.pd(pid); let ch = 0; (pd.ledger || []).forEach(e => { if (e.type === 'cargo' && e.cob && !e.cobOk && e.os && !(+e.amount > 0)) { e.cobOk = 'os'; ch++; } }); if (ch) { A.touchPd(pid); A.refresh(); } }
    } catch (e) { /* nada */ }
    return r;
  };

  /* lo que te debe cada obra social, por mes (según las prácticas cargadas con obra social) */
  /* todos los pacientes con datos (también archivados) */
  A.allPids = () => { const o = {}; A.PATS.forEach(p => { o[p.id] = 1; }); Object.keys(A.S.pd || {}).forEach(k => { o[k] = 1; }); return Object.keys(o); };
  A.osPayStore = () => A.CFG.osPay || (A.CFG.osPay = {});
  A.osDue = () => {
    const by = {};
    A.allPids().forEach(id => {
      const pd = A.pd(id); if (!pd) return; const p = { id, name: (A.PAT(id) || {}).name || (pd.prof && pd.prof.name) || 'Paciente' };
      (pd.ledger || []).forEach(e => {
        if (e.type !== 'cargo' || e.voided || e.anula || !e.os || !(+e.osCov > 0)) return;
        const mk = e.date.slice(0, 7), o = by[e.os] || (by[e.os] = {}), r = o[mk] || (o[mk] = { amt: 0, n: 0, items: [] });
        r.amt += +e.osCov; r.n++; r.items.push({ pid: p.id, name: p.name, desc: e.desc, date: e.date, amt: +e.osCov, pro: e.pro });
      });
    });
    const P = A.osPayStore(), rows = [];
    Object.keys(by).forEach(id => Object.keys(by[id]).forEach(mk => {
      const pay = (P[id] || {})[mk] || null, os = A.osById ? A.osById(id) : null;
      rows.push({ os: id, sigla: os ? os.sigla : 'Obra social', month: mk, amt: by[id][mk].amt, n: by[id][mk].n, items: by[id][mk].items, paid: pay ? +pay.amt || 0 : 0, pay });
    }));
    return rows.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.sigla.localeCompare(b.sigla)));
  };
  A.osOwed = () => A.osDue().filter(r => !r.pay).reduce((s, r) => s + r.amt, 0);

  function osHTML() {
    const rows = A.osDue(), owed = rows.filter(r => !r.pay);
    let h = '<div class="cj-kpis"><div class="cj-kpi big"><small>Te deben las obras sociales</small><b>' + money(owed.reduce((s, r) => s + r.amt, 0)) + '</b><span>' + owed.length + ' liquidaci' + (owed.length === 1 ? 'ón' : 'ones') + ' por cobrar</span></div></div>';
    h += '<p class="small-note">Lo que te paga la obra social no entra en la caja del día: queda acá hasta que llega el pago. El coseguro que paga el paciente sí entra en la caja.</p>';
    if (!rows.length) return h + '<div class="empty">Todavía no hay prácticas con obra social. Cuando registres una práctica a un paciente con obra social, lo que paga la obra social aparece acá.</div>';
    h += '<div class="cj-os">' + rows.map(r => '<div class="cj-osrow' + (r.pay ? ' paid' : '') + '"><div class="cj-osn"><b>' + esc(r.sigla) + '</b><small>' + esc(monName(r.month)) + ' · ' + r.n + ' práctica' + (r.n === 1 ? '' : 's') + '</small></div>' +
      '<div class="cj-osa"><b>' + money(r.amt) + '</b>' + (r.pay ? '<small class="ok">Pagó ' + money(r.paid) + ' el ' + esc(A.fmtDMY(r.pay.date)) + (r.paid < r.amt ? ' · débito ' + money(r.amt - r.paid) : '') + '</small>' : '<small>a cobrar</small>') + '</div>' +
      '<div class="cj-osb"><button class="btn small" data-act="osDueSee" data-os="' + esc(r.os) + '" data-m="' + r.month + '">Ver</button>' + (canCfg() ? (r.pay ? '<button class="btn small ghost" data-act="osPayUndo" data-os="' + esc(r.os) + '" data-m="' + r.month + '">Deshacer</button>' : '<button class="btn small primary" data-act="osPayNew" data-os="' + esc(r.os) + '" data-m="' + r.month + '">Llegó el pago</button>') : '') + '</div></div>').join('') + '</div>';
    return h;
  }
  const findRow = (os, m) => A.osDue().filter(r => r.os === os && r.month === m)[0];
  A.acts.osDueSee = el => { S.modal = { type: 'osDueSee', os: el.getAttribute('data-os'), m: el.getAttribute('data-m') }; A.renderModal(); };
  MF.osDueSee = m => {
    const r = findRow(m.os, m.m); if (!r) return A.modalShell('Obra social', '<div class="empty">Sin prácticas.</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const b = '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Fecha</th><th>Paciente</th><th>Práctica</th><th>Profesional</th><th class="num">Paga la O.S.</th></tr></thead><tbody>' +
      r.items.sort((x, y) => (x.date < y.date ? -1 : 1)).map(i => '<tr><td class="mono">' + esc(A.fmtShort ? A.fmtShort(i.date) : i.date) + '</td><td>' + esc(i.name) + '</td><td>' + esc(i.desc) + '</td><td>' + esc((A.PRO(i.pro) || {}).short || '') + '</td><td class="num">' + money(i.amt) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="num"><b>' + money(r.amt) + '</b></td></tr></tfoot></table></div>';
    return A.modalShell(r.sigla + ' · ' + monName(r.month), b, '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  A.acts.osPayNew = el => { const r = findRow(el.getAttribute('data-os'), el.getAttribute('data-m')); if (!r) return; S.modal = { type: 'osPay', os: r.os, m: r.month }; A.renderModal(); };
  MF.osPay = m => {
    const r = findRow(m.os, m.m);
    return A.modalShell('Llegó el pago · ' + esc(r ? r.sigla : '') + ' ' + monName(m.m),
      '<p class="m-lead">Facturado: <b>' + money(r ? r.amt : 0) + '</b>. Poné lo que pagó de verdad (si te debitaron algo, la diferencia queda anotada).</p>' +
      '<div class="row2"><div class="field"><label for="opAmt">Pagó</label><input id="opAmt" inputmode="numeric" value="' + (r ? r.amt : '') + '"></div><div class="field"><label for="opDate">Fecha</label><input id="opDate" type="date" value="' + A.today() + '"></div></div>' +
      '<div class="field"><label for="opNote">Nota (opcional)</label><input id="opNote" placeholder="Ej.: transferencia del círculo, débito por falta de RX"></div><div id="opMsg" class="m-msg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="osPayGo">Guardar</button>');
  };
  A.acts.osPayGo = () => {
    const m = S.modal, amt = parseInt((($('#opAmt') || {}).value || '').replace(/\D/g, ''), 10);
    if (!(amt >= 0) || isNaN(amt)) { const x = $('#opMsg'); if (x) x.textContent = 'Poné el importe que pagó.'; return; }
    const P = A.osPayStore(); P[m.os] = P[m.os] || {};
    P[m.os][m.m] = { amt, date: ($('#opDate') || {}).value || A.today(), note: (($('#opNote') || {}).value || '').trim(), by: (A.actor && A.actor().who) || '', at: new Date().toISOString() };
    A.save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Pago de la obra social registrado: ' + money(amt) + '.');
  };
  A.acts.osPayUndo = el => { const P = A.osPayStore(), os = el.getAttribute('data-os'), mk = el.getAttribute('data-m'); const old = (P[os] || {})[mk]; if (!old) return; delete P[os][mk]; A.save(); A.refresh(); A.toast('Pago quitado.', () => { P[os] = P[os] || {}; P[os][mk] = old; A.save(); A.refresh(); }); };

  /* =================== CAJA «HOY» =================== */
  /* a qué odontólogo corresponde un cobro: el de las prácticas que paga, si no el del turno de ese día, si no el del paciente */
  A.payPro = (pid, e) => {
    const pd = A.pd(pid);
    if (e.pcIds && e.pcIds.length) { const c = (pd.ledger || []).filter(x => x.id === e.pcIds[0])[0]; if (c && c.pro) return c.pro; }
    const a = A.day(e.date).filter(x => x.pid === pid && x.type !== 'block' && x.status !== 'cancelado')[0]; if (a && a.pro) return a.pro;
    return e.pro || ((A.PAT(pid) || {}).pro) || '';
  };
  const dayPays = d => {
    const out = [];
    A.PATS.forEach(p => { const pd = A.pd(p.id); if (!pd) return; (pd.ledger || []).forEach(e => { if (e.type === 'pago' && e.date === d && !e.voided && !e.anula) out.push({ pid: p.id, name: p.name, e, pro: A.payPro(p.id, e) }); }); });
    return out;
  };
  /* qué pagó: las prácticas elegidas al cobrar, o lo que se le hizo ese día */
  const GEN = /^(cobro|pago|pago de paciente|cobro de paciente)?$/i;
  const what = x => {
    if (x.e.desc && !GEN.test(x.e.desc.trim())) return x.e.desc;
    const L = (A.pd(x.pid).ledger || []).filter(c => c.type === 'cargo' && !c.voided && !c.anula);
    let c = (x.e.pcIds || []).map(id => L.filter(y => y.id === id)[0]).filter(Boolean);
    if (!c.length) c = L.filter(y => y.date === x.e.date);
    if (!c.length) return 'A cuenta de su saldo';
    const t = c.map(y => String(y.desc || '').replace(/\s*\(presupuesto.*$/i, '')).filter(Boolean);
    return t.slice(0, 2).join(' · ') + (t.length > 2 ? ' y ' + (t.length - 2) + ' más' : '');
  };
  const NAV = [['hoy', 'Cobros del día'], ['os', 'Obras sociales'], ['resumen', 'Números del mes'], ['control', 'Control del día'], ['mov', 'Ingresos y gastos'], ['pend', 'Pendientes'], ['cierre', 'Cierre del día']];
  const navHTML = sub => '<div class="seg cashnav" role="group" aria-label="Secciones de la caja">' + NAV.map(x => '<button data-act="cajaSub" data-s="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
  function hoyHTML() {
    const d = S.caja.day || A.today(), mp = A.myProOnly ? A.myProOnly() : null;
    let L = dayPays(d); if (mp) L = L.filter(x => x.pro === mp);
    const tot = L.reduce((s, x) => s + (+x.e.amount || 0), 0), byM = {};
    L.forEach(x => { const k = x.e.method || 'Otro'; byM[k] = (byM[k] || 0) + (+x.e.amount || 0); });
    const isToday = d === A.today();
    let h = '<div class="cj-day"><button class="btn small" data-act="cajDay" data-n="-1" aria-label="Día anterior">‹</button><b>' + (isToday ? 'Hoy, ' : '') + esc(A.fmtLong ? A.fmtLong(d) : A.fmtDMY(d)) + '</b><button class="btn small" data-act="cajDay" data-n="1" aria-label="Día siguiente"' + (isToday ? ' disabled' : '') + '>›</button>' + (isToday ? '' : '<button class="btn small" data-act="cajDay" data-n="0">Hoy</button>') + '</div>';
    h += '<div class="cj-kpis"><div class="cj-kpi big"><small>Cobrado ' + (isToday ? 'hoy' : 'ese día') + (mp ? ' · tus pacientes' : '') + '</small><b>' + money(tot) + '</b><span>' + L.length + ' cobro' + (L.length === 1 ? '' : 's') + '</span></div>' +
      Object.keys(byM).sort((a, b) => byM[b] - byM[a]).map(k => '<div class="cj-kpi"><small>' + esc(k) + '</small><b>' + money(byM[k]) + '</b></div>').join('') + '</div>';
    if (isToday && A.pcHTML && A.pcList && A.pcList().length) { const pc = A.pcHTML('caja'); if (pc) h += pc; }
    if (!mp) { const ow = A.osOwed(); if (ow > 0) h += '<button class="cj-osbar" data-act="cajaSub" data-s="os"><span>Las obras sociales te deben <b>' + money(ow) + '</b></span><span aria-hidden="true">›</span></button>'; }
    if (!L.length) return h + '<div class="empty">No hay cobros registrados ' + (isToday ? 'hoy' : 'ese día') + '.</div>';
    const by = {}; L.forEach(x => { (by[x.pro] = by[x.pro] || []).push(x); });
    const ids = Object.keys(by).sort((a, b) => by[b].reduce((s, x) => s + x.e.amount, 0) - by[a].reduce((s, x) => s + x.e.amount, 0));
    h += ids.map(id => {
      const p = A.PRO(id), list = by[id], st = list.reduce((s, x) => s + (+x.e.amount || 0), 0);
      return '<section class="card cj-pro"><h2><span class="cj-dot" style="background:' + esc((p && p.color) || '#999') + '"></span>' + esc(p ? p.name : 'Sin profesional') + '<span class="cj-st">' + money(st) + '</span></h2>' +
        '<div class="cj-list">' + list.map(x => '<div class="cj-row"><button class="cj-pat" data-act="openFicha" data-pid="' + x.pid + '"><b>' + esc(x.name) + '</b><small>' + esc(what(x)) + (x.e.by ? ' · cobró ' + esc(x.e.by) : '') + '</small></button><span class="cj-m">' + esc(x.e.method || '') + '</span><b class="cj-a">' + money(x.e.amount) + '</b></div>').join('') + '</div></section>';
    }).join('');
    return h;
  }
  A.acts.cajDay = el => { const n = +el.getAttribute('data-n'); S.caja.day = n === 0 ? null : A.add(S.caja.day || A.today(), n); if (S.caja.day && S.caja.day > A.today()) S.caja.day = null; A.refresh(); };

  const prevCaja = A.render.caja;
  A.render.caja = () => {
    osSeed(); if (A.cashSeed) A.cashSeed();
    if (isEmp() && !S.cajaGral) return prevCaja();
    S.caja = S.caja || {};
    if (!S._cjInit) { S._cjInit = 1; if (!S.caja.sub || S.caja.sub === 'resumen') S.caja.sub = 'hoy'; }
    const sub = S.caja.sub && NAV.some(x => x[0] === S.caja.sub) ? S.caja.sub : 'hoy';
    const host = $('#view-caja'); if (!host) return prevCaja();
    if (sub === 'hoy' || sub === 'os') {
      host.innerHTML = '<div class="cash-top">' + navHTML(sub) + '</div><div class="ag-bar"><h1 class="ag-title">' + (sub === 'hoy' ? 'Cobros del día' : 'Obras sociales') + '<small>' + esc(A.CLINIC) + (A.DEMO ? ' · datos de ejemplo' : '') + '</small></h1></div>' + (sub === 'hoy' ? hoyHTML() : osHTML());
      return;
    }
    prevCaja();
    const nav = host.querySelector('.cashnav'); if (nav) nav.outerHTML = navHTML(sub);
  };
  A.osDueHTML = osHTML;

  const css = document.createElement('style');
  css.textContent = '.cj-day{display:flex;align-items:center;gap:8px;margin:4px 0 12px;flex-wrap:wrap}.cj-day b{font-size:1.05rem}' +
    '.cj-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.cj-kpi{flex:1 1 120px;background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;padding:10px 12px}' +
    '.cj-kpi small{display:block;color:var(--muted,#667);font-size:.8rem}.cj-kpi b{display:block;font-size:1.15rem}.cj-kpi span{font-size:.8rem;color:var(--muted,#667)}.cj-kpi.big{flex:2 1 220px;background:var(--soft,#eef6f6)}.cj-kpi.big b{font-size:1.7rem;color:var(--teal,#0b6b6f)}' +
    '.cj-osbar{display:flex;justify-content:space-between;align-items:center;width:100%;padding:12px 14px;margin:0 0 12px;border:1px solid var(--line);border-radius:12px;background:#fff8e6;color:inherit;font:inherit;cursor:pointer;text-align:left}' +
    '.cj-pro h2{display:flex;align-items:center;gap:8px}.cj-dot{width:12px;height:12px;border-radius:50%;flex:0 0 12px}.cj-st{margin-left:auto;font-size:1rem}' +
    '.cj-list{display:flex;flex-direction:column}.cj-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.cj-row:first-child{border-top:0}' +
    '.cj-pat{flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer}.cj-pat b{display:block}.cj-pat small{display:block;color:var(--muted,#667);font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cj-m{font-size:.82rem;color:var(--muted,#667);white-space:nowrap}.cj-a{white-space:nowrap}' +
    '.cj-os{display:flex;flex-direction:column;gap:8px}.cj-osrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card,#fff)}.cj-osrow.paid{opacity:.75}' +
    '.cj-osn{flex:1 1 160px}.cj-osn small,.cj-osa small{display:block;color:var(--muted,#667);font-size:.8rem}.cj-osa{text-align:right}.cj-osa small.ok{color:#2e7d32}.cj-osb{display:flex;gap:6px}' +
    '@media (max-width:640px){#view-caja .cashnav{overflow-x:auto!important;flex-wrap:nowrap!important;display:flex!important;max-width:100%;scrollbar-width:none}#view-caja .cashnav button{white-space:nowrap;flex:0 0 auto}.cj-m{font-size:.75rem}}';
  document.head.appendChild(css);
})();
