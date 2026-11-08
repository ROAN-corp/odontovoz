/* ===== 1.36: modo LITE (versión simple para el que no se lleva bien con la tecnología): Hoy, Agenda, Pacientes y Recordatorios con botones grandes; plan Profesional LITE ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const KEY = 'odontovoz.lite';
  const TABS = ['inicio', 'agenda', 'pacientes', 'ficha'];

  /* ---------- cuándo está activo ---------- */
  const plan = () => (CL && CL.session && CL.lic && !A.DEMO ? CL.lic.plan || 'prueba' : null);
  A.liteForced = () => plan() === 'lite';                         /* el plan LITE solo tiene esta versión */
  A.liteOn = () => A.liteForced() || LS.get(KEY, '0') === '1';    /* los planes PRO (y la prueba) pueden pasar de una a otra */
  const setLite = on => { LS.set(KEY, on ? '1' : null); S.panel = null; S.modal = null; A.renderModal(); if (on && TABS.indexOf(S.tab) < 0) S.tab = 'inicio'; A.refresh(); window.scrollTo(0, 0); };

  /* ---------- utilidades ---------- */
  const pros = () => { const v = (A.visPros ? A.visPros() : A.PROS) || []; return v.length ? v : A.PROS.slice(0, 1); };
  const manyPros = () => pros().length > 1;
  const proIds = () => pros().map(p => p.id);
  const isAppt = a => a && a.pid && a.type !== 'block' && A.PAT(a.pid);
  const dayList = (k, all) => A.day(k).filter(a => isAppt(a) && proIds().indexOf(a.pro) >= 0 && (all || a.status !== 'cancelado')).sort((x, y) => x.start - y.start);
  const ST = { pendiente: ['Por venir', ''], confirmado: ['Confirmó', 'ok'], llego: ['Llegó', 'warn'], 'en-atencion': ['Atendiendo', 'acc'], atendido: ['Atendido', 'done'], ausente: ['No vino', 'bad'], cancelado: ['Cancelado', 'bad'] };
  const stChip = a => { const s = ST[a.status] || [a.status, '']; return '<span class="lt-st ' + s[1] + '">' + esc(s[0]) + '</span>'; };
  const dayTitle = k => { const t = A.today(); return k === t ? 'Hoy' : k === A.add(t, 1) ? 'Mañana' : k === A.add(t, -1) ? 'Ayer' : A.cap(A.fmtLong(k)); };
  const telLink = ph => { const d = String(ph || '').replace(/[^\d+]/g, ''); return d.length >= 6 ? 'tel:' + d : ''; };
  const firstName = () => { const p = A.PROS[0] || {}; return String(p.name || '').replace(/^(dr|dra|od)\.?\s+/i, '').split(/\s+/)[0] || ''; };
  const IC = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    pats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.8 3.1 2.6 3.5 5.2"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>'
  };
  const cobradoHoy = () => { const t = A.today(); let s = 0; Object.keys(A.S.pd || {}).forEach(pid => { const pd = A.S.pd[pid]; (pd && pd.ledger || []).forEach(e => { if (e.type === 'pago' && e.date === t && !e.void && !e.anulado) s += e.amount || 0; }); }); return s; };
  const remPend = k => dayList(k).filter(a => ['pendiente'].indexOf(a.status) >= 0 && a.rem !== 'enviado' && a.rem !== 'confirmo').length;
  const switchBtn = () => A.liteForced()
    ? '<button class="lt-sw" data-act="liteUp">Conocé OdontoVoz PRO</button>'
    : '<button class="lt-sw" data-act="liteOff" title="Volver a la versión completa">Pasar a PRO</button>';

  /* ---------- fila de un turno ---------- */
  function apptRow(a, opt) {
    opt = opt || {}; const p = A.PAT(a.pid), done = a.status === 'atendido' || a.status === 'ausente' || a.status === 'cancelado';
    const quick = opt.quick && !done ? (a.status === 'llego' || a.status === 'en-atencion'
      ? '<button class="lt-q ok" data-act="ltSt" data-id="' + a.id + '" data-st="atendido">Atendido</button>'
      : '<button class="lt-q" data-act="ltSt" data-id="' + a.id + '" data-st="llego">Llegó</button>') : '';
    const wa = !done && a.status !== 'llego' && a.status !== 'en-atencion' && p.phone ? '<button class="lt-ic' + (a.rem === 'enviado' || a.rem === 'confirmo' ? ' sent' : '') + '" data-act="ltWa" data-id="' + a.id + '" aria-label="Mandar recordatorio por WhatsApp a ' + esc(p.name) + '" title="Recordatorio por WhatsApp">' + IC.wa + '</button>' : '';
    return '<li class="lt-ap' + (done ? ' done' : '') + '"><button class="lt-ap-main" data-act="ltAppt" data-id="' + a.id + '"><span class="lt-time">' + A.mm(a.start) + '</span><span class="lt-who"><b>' + esc(p.name) + '</b><small>' + esc(a.what || '') + (manyPros() ? ' · ' + esc(A.PRO(a.pro).short || A.PRO(a.pro).name) : '') + '</small></span>' + stChip(a) + '</button>' + quick + wa + '</li>';
  }

  /* ---------- INICIO ---------- */
  function homeHTML() {
    const t = A.today(), list = dayList(t), left = list.filter(a => ['pendiente', 'confirmado', 'llego', 'en-atencion'].indexOf(a.status) >= 0).length;
    const tm = A.add(t, 1), rp = remPend(tm), nm = firstName(), h = new Date().getHours();
    let x = '<div class="lt"><div class="lt-hello"><div><h1>' + (h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches') + (nm ? ', ' + esc(nm) : '') + '</h1><p>' + esc(A.cap(A.fmtLong(t))) + '</p></div>' + switchBtn() + '</div>';
    x += '<div class="lt-tiles">' +
      '<button class="lt-tile" data-act="tab" data-tab="agenda">' + IC.cal + '<b>Agenda</b><small>' + (list.length ? list.length + ' turno' + (list.length === 1 ? '' : 's') + ' hoy' : 'Sin turnos hoy') + '</small></button>' +
      '<button class="lt-tile main" data-act="ltNew">' + IC.plus + '<b>Dar un turno</b><small>Elegí paciente, día y hora</small></button>' +
      '<button class="lt-tile" data-act="tab" data-tab="pacientes">' + IC.pats + '<b>Pacientes</b><small>Buscar, llamar, ver notas</small></button>' +
      '<button class="lt-tile' + (rp ? ' warn' : '') + '" data-act="ltRem">' + IC.wa + '<b>Recordatorios</b><small>' + (rp ? rp + ' para mandar de mañana' : 'Todo al día') + '</small></button>' +
      '</div>';
    x += '<section class="lt-card"><div class="lt-h"><h2>Turnos de hoy</h2>' + (left ? '<span class="lt-cnt">Faltan ' + left + '</span>' : '') + '</div>' +
      (list.length ? '<ul class="lt-list">' + list.map(a => apptRow(a, { quick: true })).join('') + '</ul>' : '<p class="lt-empty">No tenés turnos hoy. Tocá <b>Dar un turno</b> para agendar uno.</p>') + '</section>';
    x += '<div class="lt-foot"><div class="lt-cash">' + IC.cash + '<span>Cobrado hoy<b>' + A.money(cobradoHoy()) + '</b></span></div>' +
      '<div class="lt-voice">' + IC.mic + '<span>También podés tocar el micrófono y decir, por ejemplo: <i>«turno para Juan Pérez mañana a las 10»</i>.</span></div></div></div>';
    return x;
  }

  /* ---------- AGENDA ---------- */
  function agendaHTML() {
    const k = S.date || A.today(), all = dayList(k, true), t = A.today();
    let x = '<div class="lt"><div class="lt-dayhead"><button class="lt-arw" data-act="ltDay" data-n="-1" aria-label="Día anterior">‹</button><label class="lt-daylbl"><b>' + esc(dayTitle(k)) + '</b><small>' + esc(A.fmtDMY(k)) + ' · tocá para elegir otro día</small><input type="date" data-chg="ltDate" value="' + k + '" aria-label="Elegir día"></label><button class="lt-arw" data-act="ltDay" data-n="1" aria-label="Día siguiente">›</button></div>';
    x += '<div class="lt-row">' + (k !== t ? '<button class="btn" data-act="ltDay" data-n="0">Volver a hoy</button>' : '') + '<button class="btn primary lt-big" data-act="ltNew" data-date="' + k + '">' + IC.plus + ' Dar un turno este día</button></div>';
    x += all.length ? '<ul class="lt-list">' + all.map(a => apptRow(a, { quick: k === t })).join('') + '</ul>' : '<p class="lt-empty">No hay turnos para ' + (k === t ? 'hoy' : 'este día') + '.</p>';
    return x + '</div>';
  }

  /* ---------- PACIENTES ---------- */
  function patsHTML() {
    const q = S.ltQ || '', list = (q.trim().length >= 2 ? A.searchPats(q, 40) : A.PATS.filter(p => !p.prov).slice().sort((a, b) => A.norm(a.last + ' ' + a.first) < A.norm(b.last + ' ' + b.first) ? -1 : 1).slice(0, 60));
    let x = '<div class="lt"><div class="lt-h"><h1>Pacientes</h1><button class="btn primary" data-act="ltPatNew">' + IC.plus + ' Paciente nuevo</button></div>';
    x += '<label class="sr" for="ltQ">Buscar paciente</label><input id="ltQ" class="lt-search" data-in="ltQ" autocomplete="off" placeholder="Buscar por nombre, apellido o DNI" value="' + esc(q) + '">';
    x += list.length ? '<ul class="lt-pats">' + list.map(p => '<li><button data-act="ltPat" data-pid="' + p.id + '"><span class="lt-av" aria-hidden="true">' + esc((p.first || '?').charAt(0) + (p.last || '').charAt(0)) + '</span><span class="lt-who"><b>' + esc(p.name) + '</b><small>' + esc([p.phone, p.cov && p.cov !== 'Particular' ? p.cov : ''].filter(Boolean).join(' · ') || 'Sin teléfono') + '</small></span><span class="lt-go" aria-hidden="true">›</span></button></li>').join('') + '</ul>' : '<p class="lt-empty">' + (q ? 'No encontramos a «' + esc(q) + '». Revisá cómo está escrito o cargalo como paciente nuevo.' : 'Todavía no cargaste pacientes.') + '</p>';
    if (!q && A.PATS.length > 60) x += '<p class="hint">Mostramos los primeros 60 por apellido. Escribí en el buscador para encontrar a cualquiera.</p>';
    return x + '</div>';
  }

  /* ---------- FICHA SIMPLE ---------- */
  function fichaHTML(pid) {
    const p = A.PAT(pid); if (!p) return '<div class="lt"><p class="lt-empty">No encontramos al paciente.</p></div>';
    const pd = A.pd(pid), t = A.today(), tel = telLink(p.phone), wa = A.waLink ? A.waLink(p.phone, 'Hola ' + p.first + ', ') : '';
    const next = []; Object.keys(A.S.days || {}).forEach(k => { if (k >= t) A.S.days[k].forEach(a => { if (a.pid === pid && a.type !== 'block' && a.status !== 'cancelado' && a.status !== 'atendido') next.push(a); }); });
    next.sort((a, b) => (a.date + A.mm(a.start) < b.date + A.mm(b.start) ? -1 : 1));
    const notes = (pd.notes || []).filter(n => !n.void && !n.anulada).slice(0, 12), pays = (pd.ledger || []).filter(e => e.type === 'pago').slice(-5).reverse();
    let x = '<div class="lt"><button class="lt-back" data-act="tab" data-tab="pacientes">‹ Pacientes</button>';
    x += '<section class="lt-card lt-pat"><div class="lt-pat-h"><span class="lt-av big" aria-hidden="true">' + esc((p.first || '?').charAt(0) + (p.last || '').charAt(0)) + '</span><div><h1>' + esc(p.name) + '</h1><p>' + esc([p.dni ? 'DNI ' + p.dni : '', p.cov].filter(Boolean).join(' · ')) + '</p><p>' + (p.phone ? esc(p.phone) : '<i>Sin teléfono</i>') + '</p></div></div>' +
      '<div class="lt-acts">' + (tel ? '<a class="btn lt-big" href="' + esc(tel) + '">' + IC.tel + ' Llamar</a>' : '') + (wa ? '<a class="btn lt-big" target="_blank" rel="noopener" href="' + esc(wa) + '">' + IC.wa + ' WhatsApp</a>' : '') + '<button class="btn primary lt-big" data-act="ltNew" data-pid="' + pid + '">' + IC.plus + ' Dar turno</button><button class="btn" data-act="ltPatEdit" data-pid="' + pid + '">Editar datos</button></div></section>';
    x += '<section class="lt-card"><div class="lt-h"><h2>Próximos turnos</h2></div>' + (next.length ? '<ul class="lt-list">' + next.slice(0, 5).map(a => '<li class="lt-ap"><button class="lt-ap-main" data-act="ltAppt" data-id="' + a.id + '"><span class="lt-time">' + A.mm(a.start) + '</span><span class="lt-who"><b>' + esc(dayTitle(a.date)) + '</b><small>' + esc(A.fmtDMY(a.date) + (a.what ? ' · ' + a.what : '')) + '</small></span>' + stChip(a) + '</button></li>').join('') + '</ul>' : '<p class="lt-empty">No tiene turnos por delante.</p>') + '</section>';
    x += '<section class="lt-card"><div class="lt-h"><h2>Notas de las visitas</h2></div><label class="sr" for="ltNote">Qué hiciste hoy</label><textarea id="ltNote" class="inp lt-note" rows="3" placeholder="Escribí o dictá qué le hiciste hoy. Ej.: Limpieza y control. Vuelve en 6 meses."></textarea>' +
      '<div class="lt-row"><button class="btn lt-big" data-act="dictate" data-target="#ltNote">' + IC.mic + ' Dictar</button><button class="btn primary lt-big" data-act="ltNoteSave" data-pid="' + pid + '">Guardar nota</button></div>' +
      (notes.length ? '<ul class="lt-notes">' + notes.map(n => '<li><b>' + esc(A.fmtDMY(n.date || t)) + '</b><span>' + esc(n.text || '') + '</span></li>').join('') + '</ul>' : '<p class="lt-empty">Todavía no hay notas.</p>') + '<p class="hint">Las notas quedan en la historia clínica del paciente y no se pueden borrar después del día.</p></section>';
    x += '<section class="lt-card"><div class="lt-h"><h2>Cobros</h2><button class="btn primary" data-act="ltPay" data-pid="' + pid + '">' + IC.cash + ' Registrar cobro</button></div>' + (pays.length ? '<ul class="lt-notes">' + pays.map(e => '<li><b>' + esc(A.fmtDMY(e.date)) + '</b><span>' + A.money(e.amount) + ' · ' + esc(e.method || '') + '</span></li>').join('') + '</ul>' : '<p class="lt-empty">Sin cobros registrados.</p>') + '</section>';
    if (!A.liteForced()) x += '<button class="btn lt-full" data-act="ltFull" data-pid="' + pid + '">Ver la ficha completa en PRO (odontograma, presupuestos, fotos…)</button>';
    return x + '</div>';
  }

  /* ---------- renders ---------- */
  const R = { inicio: A.render.inicio, agenda: A.render.agenda, pacientes: A.render.pacientes, ficha: A.render.ficha };
  A.render.inicio = () => { if (!A.liteOn()) return R.inicio(); $('#view-inicio').innerHTML = homeHTML(); };
  A.render.agenda = () => { if (!A.liteOn()) return R.agenda(); if (!S.date) S.date = A.today(); $('#view-agenda').innerHTML = agendaHTML(); };
  A.render.pacientes = () => { if (!A.liteOn()) return R.pacientes(); $('#view-pacientes').innerHTML = patsHTML(); };
  A.render.ficha = () => { if (!A.liteOn()) return R.ficha(); $('#view-ficha').innerHTML = fichaHTML(S.fichaPid); };

  /* el buscador de arriba y los paneles abren la ficha simple */
  const panelPrev = A.renderPanel;
  A.renderPanel = () => {
    if (A.liteOn() && S.panel) {
      const p = S.panel; S.panel = null;
      if (p.type === 'pat' && p.pid) { openPat(p.pid); return; }
      if (p.type === 'appt' && p.id && A.apptById(p.id)) { panelPrev(); S.modal = { type: 'ltAppt', id: p.id }; A.renderModal(); return; }
    }
    return panelPrev();
  };
  function openPat(pid) { const host = $('#topRes'); if (host) host.innerHTML = ''; const inp = $('#topQ'); if (inp) inp.value = ''; S.fichaPid = pid; S.tab = 'ficha'; S.panel = null; A.refresh(); window.scrollTo(0, 0); }
  const openFichaPrev = A.openFicha;
  A.openFicha = function (pid) { if (A.liteOn()) { openPat(pid); return; } return openFichaPrev.apply(this, arguments); };

  /* ---------- acciones ---------- */
  A.acts.liteOn = () => { if (A.hideDrawer) A.hideDrawer(); setLite(true); A.toast('Modo LITE: lo justo y con botones grandes. Para volver tocá «Pasar a PRO».'); };
  A.acts.liteOff = () => { if (A.hideDrawer) A.hideDrawer(); if (A.liteForced()) { A.acts.liteUp(); return; } setLite(false); A.toast('Volviste a OdontoVoz PRO.'); };
  A.acts.liteToggle = () => (A.liteOn() ? A.acts.liteOff() : A.acts.liteOn());
  A.acts.ltFull = el => { const pid = el.getAttribute('data-pid'); LS.set(KEY, null); A.openFicha(pid, 'datos'); A.toast('Pasaste a PRO. Para volver a la versión simple, abrí el menú › Modo LITE.'); };
  A.acts.ltDay = el => { const n = parseInt(el.getAttribute('data-n'), 10); S.date = n === 0 ? A.today() : A.add(S.date || A.today(), n); A.refresh(); };
  A.chg.ltDate = el => { if (el.value) { S.date = el.value; A.refresh(); } };
  A.ins.ltQ = el => { S.ltQ = el.value; const pos = el.selectionStart; A.refresh(); const i = $('#ltQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } };
  A.acts.ltPat = el => openPat(el.getAttribute('data-pid'));
  A.acts.ltSt = (el, ev) => { if (ev) ev.stopPropagation(); A.setStatus(el.getAttribute('data-id'), el.getAttribute('data-st')); if (S.modal && S.modal.type === 'ltAppt') A.renderModal(); };
  A.acts.ltWa = (el, ev) => { A.acts.waAppt(el, ev); if (S.modal) A.renderModal(); };
  A.acts.ltAppt = el => { S.modal = { type: 'ltAppt', id: el.getAttribute('data-id') }; A.renderModal(); };
  A.acts.ltNoteSave = el => {
    const pid = el.getAttribute('data-pid'), ta = $('#ltNote'), t = ta ? ta.value.trim() : ''; if (!t) { A.toast('Escribí o dictá la nota primero.'); if (ta) ta.focus(); return; }
    const pd = A.pd(pid); pd.notes.unshift({ id: A.uid(), date: A.today(), pro: A.PAT(pid).pro, text: t, quick: true }); A.touchPd(pid);
    A.toast('Nota guardada en la historia clínica.'); A.refresh();
  };

  /* ---------- turno: ver y cambiar ---------- */
  MF.ltAppt = m => {
    const a = A.apptById(m.id); if (!a || !A.PAT(a.pid)) return A.modalShell('Turno', '<p>Ese turno ya no existe.</p>', '<button class="btn primary" data-act="closeModal">Cerrar</button>');
    const p = A.PAT(a.pid), tel = telLink(p.phone), live = a.status !== 'cancelado';
    let b = '<div class="lt-sheet"><div class="lt-ap-big"><span class="lt-time">' + A.mm(a.start) + '</span><div><b>' + esc(p.name) + '</b><small>' + esc(dayTitle(a.date) + ' · ' + A.fmtDMY(a.date) + (a.what ? ' · ' + a.what : '') + (manyPros() ? ' · ' + A.PRO(a.pro).name : '')) + '</small></div>' + stChip(a) + '</div>';
    if (live) b += '<p class="lt-lbl">¿Cómo va el turno?</p><div class="lt-stbtns">' + [['llego', 'Llegó'], ['atendido', 'Atendido'], ['ausente', 'No vino']].map(s => '<button class="btn lt-big' + (a.status === s[0] ? ' primary' : '') + '" data-act="ltSt" data-id="' + a.id + '" data-st="' + s[0] + '" aria-pressed="' + (a.status === s[0]) + '">' + s[1] + '</button>').join('') + '</div>';
    b += '<div class="lt-acts">' + (live && p.phone ? '<button class="btn lt-big" data-act="ltWa" data-id="' + a.id + '">' + IC.wa + (a.rem === 'enviado' || a.rem === 'confirmo' ? ' Reenviar recordatorio' : ' Mandar recordatorio') + '</button>' : '') + (tel ? '<a class="btn lt-big" href="' + esc(tel) + '">' + IC.tel + ' Llamar</a>' : '') + '<button class="btn lt-big" data-act="ltPatGo" data-pid="' + p.id + '">Ver paciente</button></div>';
    if (live) b += '<details class="lt-move"' + (m.move ? ' open' : '') + '><summary>Cambiar día u hora</summary><div class="row2"><div class="field"><label for="ltMvD">Día</label><input id="ltMvD" type="date" value="' + a.date + '"></div><div class="field"><label for="ltMvT">Hora</label><input id="ltMvT" type="time" step="300" value="' + A.mm(a.start) + '"></div></div><button class="btn primary lt-big" data-act="ltMove" data-id="' + a.id + '">Guardar el cambio</button></details>';
    b += '</div>';
    return A.modalShell('Turno', b, (live ? '<button class="btn danger" data-act="ltCancel" data-id="' + a.id + '">Cancelar el turno</button>' : '') + '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.ltPatGo = el => { S.modal = null; A.renderModal(); openPat(el.getAttribute('data-pid')); };
  A.acts.ltMove = el => {
    const a = A.apptById(el.getAttribute('data-id')), d = ($('#ltMvD') || {}).value, t = ($('#ltMvT') || {}).value; if (!a || !d || !t) return;
    S.modal = null; A.renderModal(); A.tryMove(a.id, { date: d, start: A.toMin(t) }); if (!S.modal) S.date = d;
  };
  A.acts.ltCancel = el => { const id = el.getAttribute('data-id'); S.modal = { type: 'ltCancelAsk', id }; A.renderModal(); };
  MF.ltCancelAsk = m => { const a = A.apptById(m.id), p = a && A.PAT(a.pid); return A.modalShell('¿Cancelar el turno?', '<p>Se cancela el turno de <b>' + esc(p ? p.name : '') + '</b> del ' + esc(a ? dayTitle(a.date).toLowerCase() + ' a las ' + A.mm(a.start) : '') + ' y el horario queda libre.</p>', '<button class="btn" data-act="ltAppt" data-id="' + m.id + '">No, volver</button><button class="btn danger" data-act="ltCancelGo" data-id="' + m.id + '">Sí, cancelar</button>'); };
  A.acts.ltCancelGo = el => { S.modal = null; A.renderModal(); A.setStatus(el.getAttribute('data-id'), 'cancelado'); };

  /* ---------- dar un turno ---------- */
  A.acts.ltNew = el => {
    const pid = el && el.getAttribute && el.getAttribute('data-pid'), d = (el && el.getAttribute && el.getAttribute('data-date')) || (S.tab === 'agenda' ? S.date : null) || A.today();
    const now = A.nowMin(), start = d === A.today() && now >= 480 ? Math.min(20 * 60, Math.ceil((now + 15) / 15) * 15) : 9 * 60;
    S.modal = { type: 'ltNew', f: { pid: pid || null, q: '', date: d, start, dur: 30, what: '', pro: (pros()[0] || {}).id, isNew: false, nm: '', ph: '' } }; A.renderModal();
  };
  function readNew() {
    const f = S.modal && S.modal.f; if (!f) return {};
    const v = id => { const e = $('#' + id); return e ? e.value : null; };
    if (v('ltNd') != null) f.date = v('ltNd') || f.date; if (v('ltNt') != null) f.start = A.toMin(v('ltNt') || A.mm(f.start)); if (v('ltNu') != null) f.dur = parseInt(v('ltNu'), 10) || 30;
    if (v('ltNw') != null) f.what = v('ltNw'); if (v('ltNp') != null) f.pro = v('ltNp'); if (v('ltNn') != null) f.nm = v('ltNn'); if (v('ltNf') != null) f.ph = v('ltNf');
    return f;
  }
  MF.ltNew = m => {
    const f = m.f, p = f.pid ? A.PAT(f.pid) : null;
    let b = '<div class="lt-sheet"><p class="lt-lbl">1. ¿Para quién?</p>';
    if (p) b += '<div class="lt-picked"><b>' + esc(p.name) + '</b><small>' + esc(p.phone || 'sin teléfono') + '</small><button class="btn small" data-act="ltNClear">Cambiar</button></div>';
    else if (f.isNew) b += '<div class="field"><label for="ltNn">Nombre y apellido</label><input id="ltNn" value="' + esc(f.nm) + '" autocomplete="off"></div><div class="field"><label for="ltNf">Celular (para el recordatorio)</label><input id="ltNf" inputmode="tel" placeholder="Ej.: 299 4123456" value="' + esc(f.ph) + '"></div><button class="btn small" data-act="ltNOld">Buscar un paciente que ya tengo</button>';
    else b += '<input id="ltNq" class="lt-search" data-in="ltNq" autocomplete="off" placeholder="Escribí nombre, apellido o DNI" value="' + esc(f.q) + '"><div id="ltNr">' + resHTML(f.q) + '</div>';
    b += '<p class="lt-lbl">2. ¿Qué día y a qué hora?</p><div class="row2"><div class="field"><label for="ltNd">Día</label><input id="ltNd" type="date" value="' + f.date + '"></div><div class="field"><label for="ltNt">Hora</label><input id="ltNt" type="time" step="300" value="' + A.mm(f.start) + '"></div></div>';
    b += '<div class="row2"><div class="field"><label for="ltNu">Cuánto dura</label><select id="ltNu">' + [15, 30, 45, 60, 90].map(x => '<option value="' + x + '"' + (x === f.dur ? ' selected' : '') + '>' + (x < 60 ? x + ' minutos' : x === 60 ? '1 hora' : '1 hora y media') + '</option>').join('') + '</select></div><div class="field"><label for="ltNw">Motivo (si querés)</label><input id="ltNw" list="ltNwL" placeholder="Ej.: Control" value="' + esc(f.what) + '"><datalist id="ltNwL">' + Object.keys(A.TYPES).map(k => '<option>' + esc(A.TYPES[k][0]) + '</option>').join('') + '</datalist></div></div>';
    if (manyPros()) b += '<div class="field"><label for="ltNp">Con quién</label><select id="ltNp">' + pros().map(x => '<option value="' + x.id + '"' + (x.id === f.pro ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>';
    b += '<div id="ltNmsg" class="hint bad">' + (m.msg || '') + '</div>' + (m.clash ? '<button class="btn lt-big" data-act="ltNSave" data-force="1">Darlo igual, como sobreturno</button>' : '') + '</div>';
    return A.modalShell('Dar un turno', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary lt-big" data-act="ltNSave">Agendar</button>');
  };
  function resHTML(q) {
    if (A.norm(q).length < 2) return '<button class="btn lt-big lt-newp" data-act="ltNNew">' + IC.plus + ' Es un paciente nuevo</button>';
    const r = A.searchPats(q, 6);
    return '<ul class="lt-res">' + r.map(p => '<li><button data-act="ltNPick" data-pid="' + p.id + '"><b>' + esc(p.name) + '</b><small>' + esc(p.phone || (p.dni ? 'DNI ' + p.dni : '')) + '</small></button></li>').join('') + '<li><button class="lt-newp" data-act="ltNNew">' + IC.plus + ' <b>Es un paciente nuevo' + (r.length ? '' : ': no lo encontré') + '</b></button></li></ul>';
  }
  A.ins.ltNq = el => { const f = S.modal && S.modal.f; if (!f) return; f.q = el.value; const h = $('#ltNr'); if (h) h.innerHTML = resHTML(f.q); };
  A.acts.ltNPick = el => { const f = readNew(); f.pid = el.getAttribute('data-pid'); f.isNew = false; S.modal.msg = ''; S.modal.clash = false; A.renderModal(); };
  A.acts.ltNClear = () => { const f = readNew(); f.pid = null; S.modal.clash = false; A.renderModal(); };
  A.acts.ltNNew = () => { const f = readNew(); f.isNew = true; if (!f.nm) f.nm = f.q || ''; A.renderModal(); const i = $('#ltNn'); if (i) i.focus(); };
  A.acts.ltNOld = () => { const f = readNew(); f.isNew = false; A.renderModal(); };
  A.acts.ltNSave = el => {
    const f = readNew(), m = S.modal, force = el && el.getAttribute && el.getAttribute('data-force') === '1';
    const fail = t => { m.msg = t; A.renderModal(); };
    if (!f.pid && !f.isNew) return fail('Elegí el paciente o tocá «Es un paciente nuevo».');
    if (!f.pid && f.isNew) {
      const w = String(f.nm || '').trim().split(/\s+/).filter(Boolean); if (!w.length) return fail('Escribí el nombre del paciente.');
      if (!force && !m.clash) { const d = A.searchPats(w.join(' '), 1)[0]; if (d && A.norm(d.name) === A.norm(w.join(' '))) { f.pid = d.id; f.isNew = false; m.msg = 'Ya tenías a ' + esc(d.name) + ' cargado: lo elegimos.'; } }
      if (!f.pid) { const np = A.addPatient({ first: w.length > 1 ? w.slice(0, -1).join(' ') : w[0], last: w.length > 1 ? w[w.length - 1] : '', phone: (f.ph || '').trim(), pro: f.pro }); f.pid = np.id; f.isNew = false; }
    }
    if (!f.date || !(f.start >= 0)) return fail('Elegí el día y la hora.');
    const what = (f.what || '').trim() || 'Consulta';
    const a = { id: A.uid(), pid: f.pid, pro: f.pro || (pros()[0] || {}).id, date: f.date, start: f.start, dur: f.dur || 30, what, status: 'pendiente', rem: 'porenviar' };
    if (force) a.sobre = true;
    const cf = force ? [] : A.conflicts(a);
    if (cf.length) { m.clash = true; return fail('A esa hora ya está ' + cf.map(c => esc(A.PAT(c.pid) ? A.PAT(c.pid).name : c.label || 'otro turno') + ' (' + A.mm(c.start) + ')').join(', ') + '. Elegí otra hora o dalo igual como sobreturno.'); }
    if (S.setup && A.inHours && !A.inHours(a)) A.toast('Ojo: queda fuera de tu horario de atención.');
    a.by = A.whoName ? A.whoName() : undefined; a.at = Date.now();
    A.mutate([a.date], () => { A.day(a.date).push(a); }, 'Turno agendado: ' + A.PAT(a.pid).name + ' · ' + dayTitle(a.date).toLowerCase() + ' a las ' + A.mm(a.start));
    S.modal = null; A.renderModal(); S.date = a.date; if (S.tab !== 'ficha') S.tab = 'agenda'; A.refresh();
  };

  /* ---------- pacientes: nuevo y editar ---------- */
  A.acts.ltPatNew = () => { S.modal = { type: 'ltPat', pid: null }; A.renderModal(); };
  A.acts.ltPatEdit = el => { S.modal = { type: 'ltPat', pid: el.getAttribute('data-pid') }; A.renderModal(); };
  MF.ltPat = m => {
    const p = m.pid ? A.PAT(m.pid) : {}, f = (id, l, v, extra) => '<div class="field"><label for="' + id + '">' + l + '</label><input id="' + id + '" value="' + esc(v || '') + '"' + (extra || '') + '></div>';
    const b = '<div class="lt-sheet"><div class="row2">' + f('ltPf', 'Nombre', p.first, ' autocomplete="off"') + f('ltPl', 'Apellido', p.last, ' autocomplete="off"') + '</div><div class="row2">' + f('ltPt', 'Celular', p.phone, ' inputmode="tel" placeholder="Ej.: 299 4123456"') + f('ltPd', 'DNI (si querés)', p.dni, ' inputmode="numeric"') + '</div>' + f('ltPc', 'Obra social (si tiene)', p.cov && p.cov !== 'Particular' ? p.cov : '', ' placeholder="Particular"') + '<div id="ltPm" class="hint bad"></div></div>';
    return A.modalShell(m.pid ? 'Editar datos' : 'Paciente nuevo', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary lt-big" data-act="ltPatSave">Guardar</button>');
  };
  A.acts.ltPatSave = () => {
    const v = id => (($('#' + id) || {}).value || '').trim(), m = S.modal;
    const d = { first: v('ltPf'), last: v('ltPl'), phone: v('ltPt'), dni: v('ltPd').replace(/\D/g, ''), cov: v('ltPc') || 'Particular' };
    if (!d.first && !d.last) { $('#ltPm').textContent = 'Escribí al menos el nombre.'; return; }
    if (m.pid) { A.setProfile(m.pid, d); A.toast('Datos guardados.'); S.modal = null; A.renderModal(); A.refresh(); return; }
    const np = A.addPatient(Object.assign({ pro: (pros()[0] || {}).id }, d)); S.modal = null; A.renderModal(); A.toast('Paciente cargado: ' + np.name + '.'); openPat(np.id);
  };

  /* ---------- cobro simple ---------- */
  A.acts.ltPay = el => { S.modal = { type: 'ltPay', pid: el.getAttribute('data-pid') }; A.renderModal(); };
  MF.ltPay = m => A.modalShell('Registrar cobro · ' + A.PAT(m.pid).name, '<div class="lt-sheet"><div class="field"><label for="ltCa">Cuánto cobraste</label><input id="ltCa" class="lt-money" inputmode="numeric" placeholder="$"></div><p class="lt-lbl">¿Cómo te pagó?</p><div class="lt-meth" role="radiogroup">' + ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago'].map((x, i) => '<label><input type="radio" name="ltCm" value="' + x + '"' + (i === 0 ? ' checked' : '') + '><span>' + x + '</span></label>').join('') + '</div><div id="ltCmsg" class="hint bad"></div></div>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary lt-big" data-act="ltPaySave">Guardar cobro</button>');
  A.acts.ltPaySave = () => {
    const amt = parseInt((($('#ltCa') || {}).value || '').replace(/\D/g, ''), 10); if (!(amt > 0)) { $('#ltCmsg').textContent = 'Escribí el importe.'; return; }
    const pid = S.modal.pid, pd = A.pd(pid), meth = (document.querySelector('input[name="ltCm"]:checked') || {}).value || 'Efectivo';
    pd.ledger.push({ id: A.uid(), date: A.today(), type: 'pago', amount: amt, desc: 'Cobro', method: meth, pro: A.PAT(pid).pro, rcp: 'R-' + (pid.replace(/\D/g, '') || '0') + '-' + (++pd.rcpSeq) });
    A.touchPd(pid); S.modal = null; A.renderModal(); A.toast('Cobro guardado: ' + A.money(amt) + ' (' + meth + ').'); A.refresh();
  };

  /* ---------- recordatorios ---------- */
  A.acts.ltRem = () => { S.modal = { type: 'ltRem', k: A.add(A.today(), 1) }; A.renderModal(); };
  A.acts.ltRemDay = el => { S.modal.k = A.add(A.today(), parseInt(el.getAttribute('data-n'), 10)); A.renderModal(); };
  MF.ltRem = m => {
    const t = A.today(), list = dayList(m.k).filter(a => a.status !== 'atendido' && a.status !== 'ausente');
    let b = '<div class="lt-sheet"><div class="lt-seg" role="group">' + [[0, 'Hoy'], [1, 'Mañana'], [2, 'Pasado mañana']].map(d => '<button class="btn' + (A.add(t, d[0]) === m.k ? ' primary' : '') + '" data-act="ltRemDay" data-n="' + d[0] + '" aria-pressed="' + (A.add(t, d[0]) === m.k) + '">' + d[1] + '</button>').join('') + '</div>';
    b += '<p class="hint">Tocá <b>Mandar</b>: se abre WhatsApp con el mensaje listo y solo tenés que enviarlo. Cuando el paciente conteste, marcá si confirmó.</p>';
    b += list.length ? '<ul class="lt-list">' + list.map(a => { const p = A.PAT(a.pid), sent = a.rem === 'enviado', ok = a.rem === 'confirmo' || a.status === 'confirmado';
      return '<li class="lt-ap"><div class="lt-ap-main"><span class="lt-time">' + A.mm(a.start) + '</span><span class="lt-who"><b>' + esc(p.name) + '</b><small>' + (ok ? 'Confirmó ✓' : sent ? 'Mensaje enviado' : p.phone ? 'Falta mandar' : 'Sin celular cargado') + '</small></span></div>' +
        (p.phone ? '<button class="lt-q' + (sent || ok ? '' : ' ok') + '" data-act="ltWa" data-id="' + a.id + '">' + (sent || ok ? 'Reenviar' : 'Mandar') + '</button>' : '<button class="lt-q" data-act="ltPatEditM" data-pid="' + p.id + '">Cargar celular</button>') +
        (sent && !ok ? '<button class="lt-q" data-act="ltSt" data-id="' + a.id + '" data-st="confirmado">Confirmó</button>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="lt-empty">No hay turnos para ese día.</p>';
    return A.modalShell('Recordatorios por WhatsApp', b + '</div>', '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.ltPatEditM = el => { S.modal = { type: 'ltPat', pid: el.getAttribute('data-pid') }; A.renderModal(); };

  /* ---------- PRO: lo que no está en LITE ---------- */
  A.acts.liteUp = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'liteUp' }; A.renderModal(); };
  MF.liteUp = () => {
    const sup = A.SUPPORT || {}, num = String([].concat(sup.whatsapp || [])[0] || '').replace(/\D/g, ''), mail = CL && CL.session && CL.session.user ? CL.session.user.email : '';
    const txt = 'Hola, tengo OdontoVoz LITE y quiero pasar a PRO.' + (mail ? ' Mi cuenta: ' + mail : ''), link = num ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(txt) : 'mailto:somosroan@gmail.com?subject=' + encodeURIComponent('Pasar a PRO') + '&body=' + encodeURIComponent(txt);
    const usd = (A.PRICE_USD || {}).basico, pesos = usd && A.DOLAR ? ' (≈ $' + Math.round(usd * A.DOLAR).toLocaleString('es-AR') + ')' : '';
    return A.modalShell('OdontoVoz PRO', '<p>Tu plan es <b>Profesional LITE</b>: pacientes, agenda, recordatorios, notas y cobros, con botones grandes.</p><p>Con <b>PRO</b> sumás odontograma y periodontograma, presupuestos y planes de tratamiento, fotos, consentimientos firmados, caja, turnero online, stock y más. Y podés pasar de LITE a PRO con un toque cuando quieras.</p>' + (usd ? '<div class="acct-box"><b>Profesional PRO</b><span>USD ' + usd + pesos + ' por mes. Tus datos quedan igual.</span></div>' : ''), '<button class="btn" data-act="closeModal">Ahora no</button><a class="btn primary" target="_blank" rel="noopener" href="' + esc(link) + '">Quiero PRO</a>');
  };

  /* ---------- menú, clase del cuerpo y secciones permitidas ---------- */
  const DR_OK = ['ajOpen', 'tutVid', 'tab:inicio', 'tab:agenda', 'tab:pacientes', 'appearOpen', 'tutorialOpen', 'voiceHelp', 'supportOpen', 'planOpen', 'liteToggle', 'assistOpen', 'pwaInstall', 'acctOpen', 'licOpen', 'logout', 'cloudLogout', 'acctPass', 'nfOpen'];
  function drawer() {
    const nav = $('#gearMenu .dr-nav'); if (!nav) return;
    let b = $('#drLite');
    if (!b) { nav.insertAdjacentHTML('afterbegin', '<button class="dnav" id="drLite" data-act="liteToggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg><span class="t"><span id="drLiteT"></span><small id="drLiteS"></small></span></button>'); b = $('#drLite'); }
    const on = A.liteOn(), forced = A.liteForced();
    $('#drLiteT').textContent = on ? (forced ? 'OdontoVoz PRO' : 'Pasar a PRO') : 'Modo LITE';
    $('#drLiteS').textContent = on ? (forced ? 'Conocé todo lo que suma' : 'La versión completa') : 'Versión simple, con botones grandes';
    A.$$('#gearMenu .drawer .dnav, #gearMenu .drawer .seg, #gearMenu .drawer .me-sel').forEach(el => {
      const act = el.getAttribute('data-act'), key = act === 'tab' ? 'tab:' + el.getAttribute('data-tab') : act;
      el.classList.toggle('lt-hide', on && DR_OK.indexOf(key) < 0 && el.id !== 'drLite' && el.id !== 'drPlan');
    });
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    const on = A.liteOn();
    document.body.classList.toggle('lite', on);
    if (on && TABS.indexOf(S.tab) < 0) { const was = S.tab; S.tab = 'inicio'; if (A.liteForced()) A.toast('Eso es parte de OdontoVoz PRO. En el menú, «OdontoVoz PRO» te cuenta qué suma.'); A.refresh(); if (was) return; }
    if (arPrev) arPrev();
    try { drawer(); } catch (e) { /* nada */ }
    /* en PRO, un botón para pasar a LITE arriba del inicio */
    if (!on && S.tab === 'inicio') { const v = $('#view-inicio'); if (v && !v.querySelector('.lt-try')) v.insertAdjacentHTML('afterbegin', '<button class="lt-try" data-act="liteOn" title="Versión simple, con botones grandes" aria-label="Pasar al modo LITE, la versión simple">LITE</button>'); }
    if (on) { const ab = $('#abTitle'); if (ab && S.tab === 'inicio') ab.textContent = 'OdontoVoz LITE'; }
  };

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.textContent = [
    'body.lite .lt-hide, body.lite .vd-hf, body.lite #agFnav, body.lite.has-modal .vdock, body.lite #view-inicio > :not(.lt), body.lite #view-agenda > :not(.lt) { display: none !important; }',
    '.lt a.btn, .lt-sheet a.btn, .m-foot a.btn { color: inherit; text-decoration: none; } .lt a.btn.primary, .m-foot a.btn.primary { color: #fff; }',
    '@media (max-width: 560px) { .lt-ap { flex-wrap: wrap; } .lt-ap-main { flex-basis: 100%; } .lt-ap .lt-q { flex: 1 1 auto; } .lt-ap .lt-q, .lt-ap .lt-ic { margin: 0 0 2px; } }',
    '.lt { display: flex; flex-direction: column; gap: 14px; font-size: 17px; max-width: 760px; margin: 0 auto; padding-bottom: 96px; }',
    '.lt h1 { font-size: 26px; margin: 0; line-height: 1.15; } .lt h2 { font-size: 20px; margin: 0; } .lt p { margin: 0; }',
    '.lt-hello { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; } .lt-hello p { color: var(--ink-2); margin-top: 4px; }',
    '.lt-sw { flex: 0 0 auto; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 999px; padding: 8px 14px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }',
    '.lt-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',
    '.lt-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; min-height: 120px; padding: 16px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface); color: inherit; font: inherit; cursor: pointer; box-shadow: var(--shadow); }',
    '.lt-tile svg { width: 34px; height: 34px; color: var(--accent); } .lt-tile b { font-size: 20px; } .lt-tile small { font-size: 15px; color: var(--ink-2); line-height: 1.3; }',
    '.lt-tile.main { background: var(--accent); border-color: var(--accent); color: #fff; } .lt-tile.main svg, .lt-tile.main small { color: #fff; opacity: .95; }',
    '.lt-tile.warn { border-color: #d9a21e; } .lt-tile.warn small { color: #9a6b00; font-weight: 700; }',
    '.lt-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }',
    '.lt-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; } .lt-cnt { font-size: 15px; color: var(--ink-2); font-weight: 700; }',
    '.lt-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }',
    '.lt-ap { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 14px; padding: 6px; background: var(--surface); } .lt-ap.done { opacity: .62; }',
    '.lt-ap-main { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 12px; background: none; border: 0; color: inherit; font: inherit; text-align: left; padding: 6px; cursor: pointer; }',
    '.lt-time { flex: 0 0 auto; font-size: 20px; font-weight: 800; min-width: 62px; font-variant-numeric: tabular-nums; }',
    '.lt-who { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; } .lt-who b { font-size: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .lt-who small { font-size: 14.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.lt-st { flex: 0 0 auto; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: var(--bg); color: var(--ink-2); }',
    '.lt-st.ok { background: #e3f4ea; color: #1f6e43; } .lt-st.warn { background: #fdf0d2; color: #8a5a00; } .lt-st.acc { background: #dff2f1; color: #0b5d61; } .lt-st.bad { background: #fbe3e1; color: #a12a1e; } .lt-st.done { background: #e9ecef; color: #3b4650; }',
    '.lt-q { flex: 0 0 auto; min-height: 48px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: inherit; font: inherit; font-size: 15.5px; font-weight: 700; cursor: pointer; } .lt-q.ok { background: var(--accent); border-color: var(--accent); color: #fff; }',
    '.lt-ic { flex: 0 0 auto; width: 48px; height: 48px; border-radius: 12px; border: 1px solid #25a35a; background: #eaf8ef; color: #1b7f44; display: grid; place-items: center; cursor: pointer; } .lt-ic svg { width: 24px; height: 24px; } .lt-ic.sent { border-color: var(--line); background: var(--bg); color: var(--ink-2); }',
    '.lt-empty { color: var(--ink-2); padding: 6px 2px; }',
    '.lt-foot { display: flex; flex-direction: column; gap: 10px; } .lt-cash, .lt-voice { display: flex; gap: 12px; align-items: center; border-radius: 16px; padding: 14px 16px; border: 1px dashed var(--line); } .lt-cash svg, .lt-voice svg { width: 28px; height: 28px; flex: 0 0 auto; color: var(--accent); } .lt-cash span { display: flex; flex-direction: column; font-size: 15px; color: var(--ink-2); } .lt-cash b { font-size: 24px; color: var(--ink); } .lt-voice span { font-size: 15px; color: var(--ink-2); line-height: 1.4; }',
    '.lt-dayhead { display: flex; align-items: stretch; gap: 8px; } .lt-arw { flex: 0 0 56px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: inherit; font-size: 30px; cursor: pointer; }',
    '.lt-daylbl { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; text-align: center; } .lt-daylbl b { font-size: 22px; } .lt-daylbl small { color: var(--ink-2); font-size: 14px; } .lt-daylbl input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }',
    '.lt-row { display: flex; gap: 10px; flex-wrap: wrap; } .lt-row .lt-big { flex: 1 1 auto; }',
    '.lt .btn.lt-big, .lt-sheet .btn.lt-big, .m-foot .btn.lt-big { min-height: 52px; font-size: 17px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; } .btn.lt-big svg { width: 22px; height: 22px; }',
    '.lt .btn svg { width: 20px; height: 20px; vertical-align: -4px; }',
    '.lt-search { width: 100%; min-height: 54px; font-size: 18px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: inherit; box-sizing: border-box; }',
    '.lt-pats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; } .lt-pats button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: inherit; font: inherit; text-align: left; cursor: pointer; }',
    '.lt-av { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: #dff2f1; color: #0b5d61; font-weight: 800; font-size: 16px; text-transform: uppercase; } .lt-av.big { flex-basis: 64px; width: 64px; height: 64px; font-size: 22px; } .lt-go { font-size: 26px; color: var(--ink-2); }',
    '.lt-back { align-self: flex-start; background: none; border: 0; color: var(--accent); font: inherit; font-weight: 700; font-size: 17px; padding: 6px 0; cursor: pointer; }',
    '.lt-pat-h { display: flex; gap: 14px; align-items: center; } .lt-pat-h p { color: var(--ink-2); font-size: 16px; margin-top: 2px; }',
    '.lt-acts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; } .lt-acts .btn { text-decoration: none; }',
    '.lt-note { width: 100%; font-size: 17px; min-height: 90px; box-sizing: border-box; }',
    '.lt-notes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; } .lt-notes li { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--bg); } .lt-notes b { font-size: 14px; color: var(--ink-2); } .lt-notes span { font-size: 16.5px; line-height: 1.4; white-space: pre-wrap; }',
    '.lt-full { align-self: stretch; min-height: 50px; }',
    '.lt-sheet { display: flex; flex-direction: column; gap: 12px; font-size: 16.5px; } .lt-sheet input, .lt-sheet select { min-height: 48px; font-size: 17px; } .lt-lbl { font-weight: 800; font-size: 17px; margin: 4px 0 0; }',
    '.lt-res { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; } .lt-res button { width: 100%; display: flex; flex-direction: column; align-items: flex-start; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: inherit; font: inherit; text-align: left; cursor: pointer; } .lt-res small { color: var(--ink-2); }',
    '.lt-res .lt-newp, .btn.lt-newp { flex-direction: row; align-items: center; gap: 8px; color: var(--accent); border-style: dashed; } .lt-newp svg { width: 20px; height: 20px; }',
    '.lt-picked { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px; border-radius: 12px; background: var(--bg); } .lt-picked b { font-size: 18px; } .lt-picked small { color: var(--ink-2); flex: 1 1 auto; }',
    '.lt-ap-big { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: var(--bg); } .lt-ap-big > div { flex: 1 1 auto; display: flex; flex-direction: column; } .lt-ap-big b { font-size: 19px; } .lt-ap-big small { color: var(--ink-2); }',
    '.lt-stbtns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }',
    '.lt-move summary { cursor: pointer; font-weight: 700; color: var(--accent); padding: 8px 0; } .lt-move[open] { display: flex; flex-direction: column; gap: 10px; }',
    '.lt-money { font-size: 26px !important; font-weight: 800; }',
    '.lt-meth { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .lt-meth label { display: flex; } .lt-meth input { position: absolute; opacity: 0; } .lt-meth span { flex: 1; text-align: center; padding: 12px 6px; border-radius: 12px; border: 1px solid var(--line); cursor: pointer; font-weight: 700; } .lt-meth input:checked + span { background: var(--accent); border-color: var(--accent); color: #fff; } .lt-meth input:focus-visible + span { outline: 3px solid var(--accent); outline-offset: 2px; }',
    '.lt-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
    '#view-inicio { position: relative; } .lt-try { position: absolute; top: 2px; right: 0; z-index: 2; min-height: 26px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); font: inherit; font-size: 11px; font-weight: 800; letter-spacing: .06em; cursor: pointer; opacity: .8; } .lt-try:hover { opacity: 1; color: var(--accent); border-color: var(--accent); }',
    '@media (max-width: 380px) { .lt-tile { min-height: 108px; padding: 12px; } .lt-tile b { font-size: 18px; } .lt-time { min-width: 54px; font-size: 18px; } .lt-q { padding: 0 10px; } }',
    '@media (min-width: 900px) { .lt-tiles { grid-template-columns: repeat(4, 1fr); } }'
  ].join('\n');
  document.head.appendChild(css);
})();
