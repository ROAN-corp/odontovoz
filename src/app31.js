/* ===== 1.21: control del día: prácticas cargadas, cobros, atenciones sin práctica, libro diario y prácticas en el inicio de la empresa ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const money = n => A.money(n);
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const sedeOf = (pid, e) => (isEmp() && A.empCargoLoc ? A.empCargoLoc(pid, e) : null);
  const apptSede = a => (isEmp() && A.locOf ? A.locOf(a) : null);
  const dayList = d => (A.DEMO ? A.day(d) : (A.S.days[d] || []));

  /* ---------------------------------------------------------------
     NÚMEROS DEL DÍA (para un consultorio o para todos)
       producción = prácticas cargadas como realizadas (cargos)
       cobranza   = pagos de pacientes
       controles  = atenciones sin práctica cargada, prácticas sin cobrar, caja sin cerrar
     --------------------------------------------------------------- */
  /* modo de prueba: las atenciones de ejemplo ya pasadas tienen su práctica cargada (casi todas, para que se vea el control) */
  const DEMO_PRICE = { control: 15000, limpieza: 38000, composite: 48000, endodoncia: 180000, extraccion: 60000, corona: 90000, ortodoncia: 30000, urgencia: 35000, primera: 25000, implante: 30000, blanq: 120000 };
  const demoDone = {};
  function demoCargos(d) {
    if (!A.DEMO || demoDone[d] || d > A.today()) return; demoDone[d] = 1;
    A.day(d).forEach((a, i) => {
      if (a.type === 'block' || a.status !== 'atendido' || !a.pid || i % 7 === 6) return;
      const pd = A.pd(a.pid); if (pd.ledger.some(e => e.date === d && e.type === 'cargo')) return;
      const amt = DEMO_PRICE[a.type] || DEMO_PRICE[a.what] || 25000, lab = (A.TYPES[a.type] || A.TYPES[a.what] || ['Consulta'])[0];
      pd.ledger.push({ id: A.uid(), date: d, type: 'cargo', amount: amt, desc: lab, pro: a.pro, demo: true });
      if (i % 3 !== 1) pd.ledger.push({ id: A.uid(), date: d, type: 'pago', amount: i % 4 === 0 ? Math.round(amt / 2 / 1000) * 1000 : amt, desc: 'Cobro', method: i % 2 ? 'Efectivo' : 'Transferencia', pro: a.pro, demo: true });
    });
  }
  A.dayControl = (d, sd) => {
    demoCargos(d);
    const out = { d, prod: 0, nPrac: 0, cob: 0, pm: {}, pros: {}, prac: [], appts: { tot: 0, atend: 0, aus: 0, canc: 0, pend: 0 }, sinPrac: [], sinCobro: [], egr: 0, ing: 0 };
    const P = id => out.pros[id] || (out.pros[id] = { prod: 0, n: 0, cob: 0, atend: 0, turnos: 0 });
    const byPat = {};
    A.PATS.forEach(p => {
      const pd = A.S.pd[p.id] || (A.DEMO ? A.pd(p.id) : null); if (!pd || !pd.ledger) return;
      pd.ledger.forEach(e => {
        if (e.voided || e.anula || e.date !== d) return;
        if (e.type === 'cargo') {
          const loc = sedeOf(p.id, e); if (sd && loc !== sd) return;
          const pr = e.pro || p.pro || 'pr1', q = P(pr); q.prod += e.amount; q.n++; out.prod += e.amount; out.nPrac++;
          out.prac.push({ pid: p.id, name: p.name, pro: pr, desc: e.desc, amount: e.amount });
          const b = byPat[p.id] || (byPat[p.id] = { prod: 0, cob: 0 }); b.prod += e.amount;
        } else if (e.type === 'pago') {
          const loc = isEmp() && A.empPayLoc ? A.empPayLoc(p.id, e) : null; if (sd && loc !== sd) return;
          out.cob += e.amount; const m = e.method || 'Otro'; out.pm[m] = (out.pm[m] || 0) + e.amount;
          const pr = e.pro || p.pro || 'pr1'; P(pr).cob += e.amount;
          const b = byPat[p.id] || (byPat[p.id] = { prod: 0, cob: 0 }); b.cob += e.amount;
        }
      });
    });
    dayList(d).forEach(a => {
      if (a.type === 'block') return; if (sd && apptSede(a) !== sd) return;
      if (a.status === 'cancelado') { out.appts.canc++; return; }
      out.appts.tot++; P(a.pro).turnos++;
      if (a.status === 'atendido') {
        out.appts.atend++; P(a.pro).atend++;
        const has = a.pid && byPat[a.pid] && byPat[a.pid].prod > 0;
        if (!has && !a.noCharge) out.sinPrac.push({ a, pid: a.pid, name: (a.pid && (A.PAT(a.pid) || {}).name) || a.name || 'Paciente', pro: a.pro });
      } else if (a.status === 'ausente') out.appts.aus++;
      else out.appts.pend++;
    });
    Object.keys(byPat).forEach(pid => { const b = byPat[pid]; if (b.prod > b.cob) { const s = A.saldo ? A.saldo(pid) : b.prod - b.cob; if (s > 0) out.sinCobro.push({ pid, name: (A.PAT(pid) || {}).name || '', prod: b.prod, cob: b.cob, saldo: s }); } });
    /* egresos e ingresos de caja */
    if (sd && A.EMP && A.EMP.caja[sd]) A.EMP.caja[sd].moves.forEach(m => { if (m.status === 'pendiente' || m.date !== d) return; if (m.type === 'ingreso') out.ing += m.amount; else out.egr += m.amount; });
    else if (!sd) (S.cash && S.cash.moves || []).forEach(m => { if (m.status === 'pendiente' || m.date !== d) return; if (m.type === 'ingreso') out.ing += m.amount; else out.egr += m.amount; });
    return out;
  };

  /* una atención sin práctica se puede marcar «sin cargo» (control, consulta sin costo) para que no quede como pendiente */
  A.acts.ctlNoCharge = el => {
    const a = A.apptById(el.getAttribute('data-id')); if (!a) return;
    A.mutate([a.date], () => { a.noCharge = true; }, 'Atención sin cargo');
    if (A.empAudit) A.empAudit('Marcó sin cargo la atención de ' + ((A.PAT(a.pid) || {}).name || '') + ' (' + A.mm(a.start) + ').');
    A.refresh();
  };
  A.acts.ctlCargar = el => { const pid = el.getAttribute('data-pid'); if (pid) A.openFicha(pid, 'plan'); };
  A.acts.ctlCobrar = el => { const pid = el.getAttribute('data-pid'); if (!pid) return; A.openFicha(pid, 'cuenta'); if (A.acts.cobroNew) A.acts.cobroNew(); };

  /* ---------- tarjetas reutilizables ---------- */
  const proName = id => { const p = A.PRO(id) || {}; return p.short || p.name || 'Profesional'; };
  A.ctlCards = (C, opts) => {
    opts = opts || {};
    const ok = (b, t) => '<li class="' + (b ? 'ok' : 'bad') + '">' + (b ? '✓ ' : '! ') + t + '</li>';
    const closed = opts.closed;
    let h = '<div class="ctl-kpis"><div><span>Prácticas realizadas</span><b>' + money(C.prod) + '</b><small>' + C.nPrac + ' práctica' + (C.nPrac === 1 ? '' : 's') + '</small></div><div><span>Cobrado a pacientes</span><b>' + money(C.cob) + '</b><small>' + (C.prod ? Math.round(C.cob / C.prod * 100) + '% de lo realizado' : '&nbsp;') + '</small></div><div><span>Quedó en cuenta corriente</span><b>' + money(Math.max(0, C.prod - C.cob)) + '</b><small>' + C.sinCobro.length + ' paciente' + (C.sinCobro.length === 1 ? '' : 's') + '</small></div><div><span>Turnos</span><b>' + C.appts.atend + ' / ' + C.appts.tot + '</b><small>atendidos' + (C.appts.aus ? ' · ' + C.appts.aus + ' ausentes' : '') + '</small></div></div>';
    h += '<section class="card"><h2>Controles del día</h2><ul class="ctl-check">' +
      ok(!C.sinPrac.length, C.sinPrac.length ? C.sinPrac.length + (C.sinPrac.length > 1 ? ' atenciones' : ' atención') + ' sin práctica cargada' : 'Todas las atenciones tienen su práctica cargada') +
      ok(!C.sinCobro.length, C.sinCobro.length ? C.sinCobro.length + ' paciente' + (C.sinCobro.length > 1 ? 's' : '') + ' con prácticas de hoy sin cobrar del todo' : 'Lo realizado hoy está cobrado') +
      ok(!C.appts.pend || C.d < A.today(), C.appts.pend && C.d < A.today() ? C.appts.pend + ' turno' + (C.appts.pend > 1 ? 's' : '') + ' sin marcar (¿vino o no vino?)' : C.appts.pend ? C.appts.pend + ' turno' + (C.appts.pend > 1 ? 's' : '') + ' por atender' : 'Todos los turnos tienen su estado') +
      (closed != null ? ok(closed, closed ? 'Caja cerrada' : 'Falta cerrar la caja') : '') + '</ul></section>';
    /* por profesional */
    const ids = Object.keys(C.pros).filter(id => C.pros[id].prod || C.pros[id].turnos || C.pros[id].cob);
    if (ids.length) h += '<section class="card"><h2>Por profesional</h2><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Profesional</th><th class="num">Atendidos</th><th class="num">Prácticas</th><th class="num">Realizado</th><th class="num">Cobrado</th></tr></thead><tbody>' +
      ids.sort((a, b) => C.pros[b].prod - C.pros[a].prod).map(id => { const q = C.pros[id]; return '<tr><td><i class="stdot" style="background:' + esc((A.PRO(id) || {}).color || 'var(--accent)') + '"></i> ' + esc(proName(id)) + '</td><td class="num">' + q.atend + ' de ' + q.turnos + '</td><td class="num">' + q.n + '</td><td class="num">' + money(q.prod) + '</td><td class="num">' + money(q.cob) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td><b>Total</b></td><td class="num"><b>' + C.appts.atend + '</b></td><td class="num"><b>' + C.nPrac + '</b></td><td class="num"><b>' + money(C.prod) + '</b></td><td class="num"><b>' + money(C.cob) + '</b></td></tr></tbody></table></div></section>';
    /* lo que falta */
    if (C.sinPrac.length) h += '<section class="card ctl-warn"><h2>Atenciones sin práctica cargada</h2><p class="hint" style="margin:0 0 6px">El turno figura como atendido pero no hay ninguna práctica realizada ese día. Cargala en el plan del paciente (marcándola como realizada) o, si fue sin costo, marcala «sin cargo».</p><ul class="ctl-list">' +
      C.sinPrac.map(x => '<li><span><b>' + esc(x.name) + '</b><small>' + A.mm(x.a.start) + ' · ' + esc(proName(x.pro)) + '</small></span>' + (x.pid ? '<button class="btn small primary" data-act="ctlCargar" data-pid="' + x.pid + '">Cargar práctica</button>' : '') + '<button class="btn small" data-act="ctlNoCharge" data-id="' + x.a.id + '">Sin cargo</button></li>').join('') + '</ul></section>';
    if (C.sinCobro.length) h += '<section class="card"><h2>Realizado hoy y sin cobrar del todo</h2><ul class="ctl-list">' +
      C.sinCobro.map(x => '<li><span><b>' + esc(x.name) + '</b><small>Realizado ' + money(x.prod) + ' · cobrado hoy ' + money(x.cob) + ' · saldo ' + money(x.saldo) + '</small></span><button class="btn small" data-act="ctlCobrar" data-pid="' + x.pid + '">Cobrar</button></li>').join('') + '</ul></section>';
    if (C.prac.length) h += '<details class="card ctl-det"><summary><b>Detalle de prácticas (' + C.prac.length + ')</b></summary><table class="tbl"><tbody>' + C.prac.map(x => '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.desc) + '</td><td>' + esc(proName(x.pro)) + '</td><td class="num">' + money(x.amount) + '</td></tr>').join('') + '</tbody></table></details>';
    return h;
  };

  /* ---------- Caja › Control del día ---------- */
  A.cajaControlHTML = () => {
    const d = S.caja.ctl || A.today(), C = A.dayControl(d, null), closed = (S.cash.closes || []).some(c => c.date === d);
    let h = '<div class="ctl-top"><button class="btn small" data-act="ctlDay" data-n="-1" aria-label="Día anterior">‹</button><input type="date" value="' + d + '" data-chg="ctlDate" aria-label="Día"><button class="btn small" data-act="ctlDay" data-n="1" aria-label="Día siguiente"' + (d >= A.today() ? ' disabled' : '') + '>›</button>' + (d !== A.today() ? '<button class="btn small" data-act="ctlDay" data-n="0">Hoy</button>' : '') + '<span class="grow"></span><button class="btn small" data-act="ctlLibro">Libro diario del mes (Excel)</button></div>';
    h += A.ctlCards(C, { closed });
    h += '<section class="card"><h2>Movimientos de caja del día</h2><table class="tbl"><tbody><tr><td>Cobros de pacientes</td><td class="num">' + money(C.cob) + '</td></tr><tr><td>Otros ingresos</td><td class="num">' + money(C.ing) + '</td></tr><tr><td>Gastos</td><td class="num">−' + money(C.egr) + '</td></tr><tr class="tot"><td><b>Resultado de caja del día</b></td><td class="num"><b>' + money(C.cob + C.ing - C.egr) + '</b></td></tr></tbody></table>' + (closed ? '' : '<div class="row-btns"><button class="btn small" data-act="cajaSub" data-s="cierre">Ir al cierre de caja</button></div>') + '</section>';
    return h;
  };
  A.acts.ctlDay = el => { const n = +el.getAttribute('data-n'); S.caja.ctl = n ? A.add(S.caja.ctl || A.today(), n) : A.today(); if (S.caja.ctl > A.today()) S.caja.ctl = A.today(); A.refresh(); };
  A.chg.ctlDate = el => { if (el.value) { S.caja.ctl = el.value > A.today() ? A.today() : el.value; A.refresh(); } };

  /* ---------- libro diario del mes: todos los movimientos, para el contador ---------- */
  A.acts.ctlLibro = () => {
    const m = (S.caja.ctl || A.today()).slice(0, 7), rows = [];
    A.PATS.forEach(p => { const pd = A.S.pd[p.id]; if (!pd || !pd.ledger) return; pd.ledger.forEach(e => { if (e.voided || !e.date || e.date.slice(0, 7) !== m) return; if (e.type === 'cargo') rows.push([e.date, 'Práctica realizada', p.name, e.desc, proName(e.pro || p.pro), '', e.amount, '']); else if (e.type === 'pago') rows.push([e.date, 'Cobro a paciente', p.name, e.desc || 'Cobro', proName(e.pro || p.pro), e.method || '', '', e.amount]); else if (e.type === 'ajuste') rows.push([e.date, 'Ajuste de cuenta', p.name, e.desc || '', '', '', e.amount, '']); }); });
    (S.cash && S.cash.moves || []).forEach(mv => { if (mv.status === 'pendiente' || !mv.date || mv.date.slice(0, 7) !== m) return; rows.push([mv.date, mv.type === 'ingreso' ? 'Otro ingreso' : 'Gasto', A.cashCatName ? A.cashCatName(mv.cat) : mv.cat, mv.desc || '', '', mv.method || '', '', mv.type === 'ingreso' ? mv.amount : -mv.amount]); });
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '﻿' + [['Fecha', 'Tipo', 'Paciente / categoría', 'Detalle', 'Profesional', 'Medio', 'Realizado', 'Caja']].concat(rows).map(r => r.map(q).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), name = 'libro-diario-' + m + '.csv';
    if (A.saveFile) A.saveFile(name, blob); else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
  };

  /* retiros del dueño: un gasto que no es gasto del consultorio, pero sale de la caja */
  if (A.CASH_EG && !A.CASH_EG.some(c => c[0] === 'retiro')) A.CASH_EG.push(['retiro', 'Retiro del dueño', 0]);
  const catPrev = A.cashCatName; if (catPrev) A.cashCatName = k => (k === 'retiro' ? 'Retiro del dueño' : catPrev(k));

  /* las prácticas que se cargan desde un equipo de consultorio quedan anotadas en ese consultorio */
  const txDonePrev = A.onTxDone;
  if (txDonePrev) A.onTxDone = (pid, t) => {
    const r = txDonePrev(pid, t);
    if (isEmp() && A.empSede && A.empSede()) { const pd = A.pd(pid), e = pd.ledger.filter(x => x.txId === t.id && !x.voided)[0]; if (e && !e.loc) e.loc = A.empSede(); }
    return r;
  };

  /* en la agenda: los atendidos sin práctica cargada llevan una marca, para que cada profesional lo vea en el momento */
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    if (S.tab !== 'agenda') return;
    document.querySelectorAll('#view-agenda .blk.st-atendido[data-appt]').forEach(el => {
      if (el.querySelector('.np')) return;
      const a = A.apptById && A.apptById(el.getAttribute('data-appt')); if (!a || !a.pid || a.noCharge) return;
      const pd = A.S.pd[a.pid]; if (pd && pd.ledger && pd.ledger.some(e => e.type === 'cargo' && !e.voided && e.date === a.date)) return;
      const host = el.querySelector('.k') || el.querySelector('.n'); if (host) host.insertAdjacentHTML('afterbegin', '<span class="np" title="Atendido sin práctica cargada">sin práctica</span> ');
    });
  };

  const css = document.createElement('style');
  css.textContent = '.ctl-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}.ctl-top input{min-height:36px}.ctl-top .grow{flex:1}' +
    '.ctl-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px}.ctl-kpis>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}.ctl-kpis span{font-size:12.5px;color:var(--ink-2)}.ctl-kpis b{font-size:19px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ctl-kpis small{font-size:12px;color:var(--ink-2)}' +
    '.ctl-check{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.ctl-check li{padding:8px 10px;border-radius:10px;font-size:14.5px}.ctl-check li.ok{background:var(--ok-soft,#e5f4ea)}.ctl-check li.bad{background:var(--warn-soft,#fbf0d9);font-weight:600}' +
    '.ctl-list{list-style:none;margin:0;padding:0}.ctl-list li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)}.ctl-list li:first-child{border-top:0}.ctl-list li>span{flex:1;min-width:160px;display:flex;flex-direction:column}.ctl-list small{color:var(--ink-2);font-size:12.5px}.ctl-warn{border-left:5px solid #d49a1f}.ctl-det summary{cursor:pointer;padding:4px 0}' +
    '.blk .np{display:inline-block;font-size:10.5px;font-weight:800;color:#8a5a00;background:#fbe7b8;border-radius:6px;padding:0 5px;margin-right:4px;vertical-align:1px}' +
    '@media (max-width:640px){.ctl-kpis{grid-template-columns:repeat(2,1fr)}}';
  document.head.appendChild(css);
})();
