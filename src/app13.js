/* ===== 1.6: el profesional con varios consultorios (hasta 5): horarios por consultorio, agenda con franjas y cobros con su parte ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const MAXL = 5;
  const COLORS = ['#0b6b6f', '#7b4fc4', '#c2571a', '#2f6fd1', '#a3326b', '#4d7c0f'];
  const KINDS = [['propio', 'Consultorio propio'], ['porcentaje', 'Trabajo a porcentaje'], ['institucion', 'Institución, sindicato u obra social']];
  const KL = {}; KINDS.forEach(k => { KL[k[0]] = k[1]; });
  const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];

  /* ---------- datos ---------- */
  A.locs = () => (Array.isArray(A.CFG.locs) ? A.CFG.locs : (A.CFG.locs = []));
  A.locById = id => A.locs().filter(l => l.id === id)[0] || null;
  const solo = () => (A.isSolo ? A.isSolo() : S.mode === 'consultorio');
  const me = () => A.PROS[0];
  const multi = () => solo() && A.locs().length > 1;
  A.locMulti = multi;
  A.locLimit = () => {
    const CL = A.cloud; if (!CL || !CL.session || A.DEMO) return MAXL;
    const l = CL.lic; if (!l) return MAXL;
    if (l.max_locs) return Math.max(1, Math.min(MAXL, l.max_locs));
    return l.plan === 'prueba' || l.plan === 'centro' ? MAXL : 1;
  };
  /* en qué consultorio cae un horario: la franja que lo contiene o, si no, la más cercana */
  A.locAt = (date, start, proId) => {
    const p = A.PRO(proId || me().id), hrs = A.hoursFor(p, date).filter(r => r[2] && A.locById(r[2]));
    let r = hrs.filter(x => x[0] <= start && start < x[1])[0];
    if (!r) { let bd = 1e9; hrs.forEach(x => { const d = start < x[0] ? x[0] - start : start - x[1] + 1; if (d < bd) { bd = d; r = x; } }); }
    return r ? r[2] : ((A.locs()[0] || {}).id || null);
  };
  A.locOf = a => (a && a.loc && A.locById(a.loc) ? a.loc : a ? A.locAt(a.date, a.start, a.pro) : null);
  const locName = id => { const l = A.locById(id); return l ? l.name : 'Sin consultorio'; };
  const locColor = id => { const l = A.locById(id); return l ? l.color : '#8a9a9b'; };
  /* días que se atiende = días con alguna franja */
  function syncDays() {
    const s = me().sched || {}, d = Object.keys(s).filter(k => (s[k] || []).length).map(Number).sort();
    if (d.length) A.CFG.days = d;
  }
  /* la primera vez: el consultorio actual pasa a ser el consultorio 1 y sus horarios quedan asignados a él */
  function ensureFirst() {
    if (A.locs().length) return;
    const id = 'c' + Date.now().toString(36);
    A.locs().push({ id, name: A.CLINIC || 'Mi consultorio', addr: A.CFG.addr || '', color: COLORS[0], kind: 'propio', pct: 100, notes: '' });
    const s = me().sched || (me().sched = {});
    Object.keys(s).forEach(d => { s[d] = (s[d] || []).map(r => [r[0], r[1], r[2] || id]); });
    A.save();
  }

  /* ---------- agenda: franjas de color, punto en cada turno, filtro ---------- */
  A.locDot = a => (multi() && a && a.type !== 'block' ? '<i class="ldot" style="background:' + locColor(A.locOf(a)) + '" title="' + esc(locName(A.locOf(a))) + '"></i>' : '');
  A.locTag = a => (multi() && a && a.type !== 'block' ? '<span class="ltag" style="--lc:' + locColor(A.locOf(a)) + '">' + esc(locName(A.locOf(a))) + '</span> ' : '');
  A.locHours = hrs => (!multi() || !S.locSel ? hrs : hrs.filter(r => r[2] === S.locSel));
  A.locKeep = a => (!multi() || !S.locSel || a.type === 'block' ? true : A.locOf(a) === S.locSel);
  A.locBands = (hrs, g0, SH) => {
    if (!multi()) return '';
    return hrs.filter(r => r[2] && A.locById(r[2])).map(r => {
      const l = A.locById(r[2]), top = (r[0] - g0) / 15 * SH, h = (r[1] - r[0]) / 15 * SH;
      return '<div class="lband" style="top:' + top + 'px;height:' + h + 'px;--lc:' + l.color + '" aria-hidden="true"><span>' + esc(l.name) + ' · ' + A.mm(r[0]) + '–' + A.mm(r[1]) + '</span></div>';
    }).join('');
  };
  const prevAgenda = A.render.agenda;
  A.render.agenda = () => {
    prevAgenda();
    if (!multi()) return;
    const wrap = $('#gridWrap'); if (!wrap || $('#locBar')) return;
    const today = S.view === 'dia' ? A.hoursFor(me(), S.date).filter(r => r[2]) : [];
    const chip = (id, label, color, extra) => '<button class="lchip' + ((S.locSel || '') === id ? ' on' : '') + '" data-act="locSel" data-id="' + id + '"' + (color ? ' style="--lc:' + color + '"' : '') + '>' + (color ? '<i></i>' : '') + label + (extra ? '<small>' + extra + '</small>' : '') + '</button>';
    let h = '<div class="lbar" id="locBar" role="group" aria-label="Consultorios">' + chip('', 'Todos', '', '');
    A.locs().forEach(l => { const rs = today.filter(r => r[2] === l.id); h += chip(l.id, esc(l.name), l.color, rs.length ? rs.map(r => A.mm(r[0]) + '–' + A.mm(r[1])).join(', ') : (S.view === 'dia' ? 'no vas' : '')); });
    h += '<button class="lchip ghost" data-act="locsOpen">Horarios</button></div>';
    wrap.insertAdjacentHTML('beforebegin', h);
  };
  A.acts.locSel = el => { S.locSel = el.getAttribute('data-id') || null; A.refresh(); };

  /* ---------- turno nuevo: elegir consultorio (sugerido según la hora) ---------- */
  const prevWrap = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = prevWrap ? prevWrap(m, html) : html;
    if (!multi()) return html;
    const f = m.f, cur = f.loc || A.locAt(f.date, f.start, f.pro);
    const sel = '<div class="field"><label for="naLoc">Consultorio</label><select id="naLoc">' + A.locs().map(l => '<option value="' + l.id + '"' + (l.id === cur ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select><div class="hint" id="naLocHint">' + esc(locHint(f.date, f.start)) + '</div></div>';
    const k = '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="naSobre"';
    return html.indexOf(k) >= 0 ? html.replace(k, sel + k) : html;
  };
  function locHint(date, start) {
    const rs = A.hoursFor(me(), date).filter(r => r[2]);
    if (!rs.length) return 'Ese día no tenés horario cargado en ningún consultorio.';
    const r = rs.filter(x => x[0] <= start && start < x[1])[0];
    return r ? 'A esa hora estás en ' + locName(r[2]) + ' (' + A.mm(r[0]) + '–' + A.mm(r[1]) + ').' : 'Ese día: ' + rs.map(x => locName(x[2]) + ' ' + A.mm(x[0]) + '–' + A.mm(x[1])).join(' · ') + '.';
  }
  let locTouched = false;
  document.addEventListener('change', e => {
    if (!e.target) return;
    if (e.target.id === 'naLoc') { locTouched = true; if (S.modal && S.modal.f) S.modal.f.loc = e.target.value; return; }
    if ((e.target.id === 'naTime' || e.target.id === 'naDate') && $('#naLoc')) {
      const d = ($('#naDate') || {}).value, t = A.toMin(($('#naTime') || {}).value || '09:00'), h = $('#naLocHint');
      if (!locTouched) $('#naLoc').value = A.locAt(d, t, ($('#naPro') || {}).value);
      if (h) h.textContent = locHint(d, t);
    }
  });
  const prevOpen = A.renderModal;
  A.renderModal = () => { if (!S.modal || S.modal.type !== 'newAppt') locTouched = false; prevOpen(); };
  const prevSave = A.acts.naSave;
  A.acts.naSave = (el, ev) => {
    const sel = $('#naLoc'), loc = sel ? sel.value : null, date = ($('#naDate') || {}).value || (S.modal && S.modal.f && S.modal.f.date);
    const before = loc && date ? new Set(A.day(date).map(a => a.id)) : null;
    prevSave(el, ev);
    if (before && !(S.modal && S.modal.type === 'newAppt')) {
      const nw = A.day(date).filter(a => !before.has(a.id) && a.type !== 'block');
      if (nw.length) { A.mutate([date], () => { nw.forEach(a => { a.loc = loc; }); }); A.refresh(); }
    }
  };
  /* al atenderse, el turno queda fijo en su consultorio (aunque después cambien los horarios) */
  const prevSt = A.setStatus;
  A.setStatus = (id, st) => {
    const r = prevSt(id, st);
    if (multi() && (st === 'atendido' || st === 'en-atencion' || st === 'llego')) {
      const a = A.apptById(id); if (a && !a.loc) { const l = A.locOf(a); A.mutate([a.date], () => { a.loc = l; }); }
    }
    return r;
  };

  /* ---------- en el turno abierto: cambiar de consultorio ---------- */
  const prevPanel = A.renderPanel;
  A.renderPanel = () => {
    prevPanel();
    if (!multi() || !S.panel || S.panel.type !== 'appt') return;
    const a = A.apptById(S.panel.id); if (!a || a.type === 'block') return;
    const cur = A.locOf(a), host = $('#panelHost .panel'); if (!host || host.querySelector('.loc-pick')) return;
    const blk = Array.prototype.slice.call(host.querySelectorAll('.block')).filter(b => /Estado del turno/.test((b.querySelector('h3') || {}).textContent || ''))[0];
    const h = '<div class="block loc-pick"><h3>Consultorio</h3><div class="row-btns">' + A.locs().map(l => '<button class="pill" data-act="apLoc" data-id="' + a.id + '" data-loc="' + l.id + '" aria-pressed="' + (l.id === cur) + '" style="--lc:' + l.color + '"><i class="stdot" style="background:' + l.color + '"></i>' + esc(l.name) + '</button>').join('') + '</div>' + (A.locById(cur) && A.locById(cur).addr ? '<div class="hint">' + esc(A.locById(cur).addr) + '</div>' : '') + '</div>';
    const head = host.querySelector('.panel-head');
    if (head) head.insertAdjacentHTML('afterend', h); else if (blk) blk.insertAdjacentHTML('beforebegin', h); else host.insertAdjacentHTML('afterbegin', h);
  };
  A.acts.apLoc = el => {
    const a = A.apptById(el.getAttribute('data-id')), loc = el.getAttribute('data-loc'); if (!a) return;
    A.mutate([a.date], () => { a.loc = loc; }, 'Turno pasado a ' + locName(loc) + '.'); A.renderPanel(); A.refresh();
  };

  /* ---------- inicio: dónde trabajás hoy ---------- */
  const prevInicio = A.render.inicio;
  A.render.inicio = () => {
    prevInicio();
    if (!multi()) return;
    const hi = $('#view-inicio .home-hi'); if (!hi || $('#locToday')) return;
    const rs = A.hoursFor(me(), A.today()).filter(r => r[2]);
    const h = '<div class="loc-today" id="locToday">' + (rs.length ? '<span class="lt-l">Hoy trabajás en</span>' + rs.map(r => '<span class="lt-c" style="--lc:' + locColor(r[2]) + '"><i></i><b>' + esc(locName(r[2])) + '</b> ' + A.mm(r[0]) + '–' + A.mm(r[1]) + '</span>').join('') : '<span class="lt-l">Hoy no tenés horario cargado en tus consultorios.</span>') + '<button class="btn small ghost" data-act="locsOpen">Mis consultorios</button></div>';
    hi.insertAdjacentHTML('afterend', h);
  };

  /* =====================================================================
     MIS CONSULTORIOS: datos de cada uno y semana de trabajo
     ===================================================================== */
  A.acts.locsOpen = () => {
    if (A.hideDrawer) A.hideDrawer(); const g = $('#gearMenu'); if (g) g.hidden = true;
    if (!solo()) { S.modal = { type: 'locsCentro' }; A.renderModal(); return; }
    ensureFirst(); S.modal = { type: 'locs', tab: 'sem' }; A.renderModal();
  };
  MF.locsCentro = () => A.modalShell('Mis consultorios', '<p>Esta opción es para el <b>modo profesional</b>: un odontólogo que atiende en varios consultorios (propio, a porcentaje, en un sindicato…) y quiere una sola agenda.</p><p class="hint">En el modo centro odontológico, cada profesional tiene su propia agenda y sus horarios desde Ajustes › Profesionales.</p>', '<button class="btn primary" data-act="closeModal">Entendido</button>');
  MF.locs = m => {
    const L = A.locs(), lim = A.locLimit(), tab = m.tab || 'sem';
    let b = '<div class="seg lc-tabs" role="tablist"><button role="tab" data-act="locsTab" data-t="sem" aria-pressed="' + (tab === 'sem') + '">Semana de trabajo</button><button role="tab" data-act="locsTab" data-t="cons" aria-pressed="' + (tab === 'cons') + '">Consultorios (' + L.length + ')</button><button role="tab" data-act="locsTab" data-t="plata" aria-pressed="' + (tab === 'plata') + '">Cobros por consultorio</button></div>';
    if (tab === 'cons') {
      b += '<div class="lc-list">' + L.map(l => '<button class="lc-row" data-act="locEdit" data-id="' + l.id + '" style="--lc:' + l.color + '"><i></i><span><b>' + esc(l.name) + '</b><small>' + esc([KL[l.kind] + (l.kind !== 'propio' ? ' · tu parte ' + (l.pct == null ? 100 : l.pct) + '%' : ''), l.addr].filter(Boolean).join(' · ')) + '</small><small>' + esc(weekTxt(l.id) || 'Sin horarios cargados') + '</small></span><span class="lc-ed">Editar</span></button>').join('') + '</div>';
      b += '<div class="row-btns" style="margin-top:10px"><button class="btn primary" data-act="locAdd">+ Agregar consultorio</button><span class="hint" style="margin:0">' + L.length + ' de ' + lim + ' incluidos en tu plan</span></div>';
    } else if (tab === 'plata') b += moneyHTML(m);
    else {
      b += '<p class="hint" style="margin:0 0 10px">Armá tu semana: en qué consultorio estás cada día y en qué horario. Podés tener varias franjas el mismo día.</p><div class="wk">';
      DAYS.forEach(([d, name]) => {
        const rs = ((me().sched || {})[d] || []).slice().sort((x, y) => x[0] - y[0]);
        b += '<div class="wk-d"><b>' + name + '</b><div class="wk-r">' + (rs.length ? rs.map((r, i) => '<span class="wk-s" style="--lc:' + locColor(r[2]) + '"><i></i>' + A.mm(r[0]) + '–' + A.mm(r[1]) + ' · ' + esc(locName(r[2])) + '<button data-act="slotEdit" data-d="' + d + '" data-i="' + ((me().sched[d] || []).indexOf(r)) + '" aria-label="Cambiar franja">✎</button></span>').join('') : '<span class="wk-none">No atendés</span>') +
          '<button class="btn small ghost" data-act="slotAdd" data-d="' + d + '">+ Franja</button></div></div>';
      });
      b += '</div>';
    }
    return A.modalShell('Mis consultorios', b, '<button class="btn primary" data-act="closeModal">Listo</button>', true).replace('<div class="modal wide"', '<div class="modal wide lc-modal"');
  };
  const weekTxt = id => DAYS.map(([d, n]) => { const rs = ((me().sched || {})[d] || []).filter(r => r[2] === id); return rs.length ? n.slice(0, 3) + ' ' + rs.map(r => A.mm(r[0]) + '–' + A.mm(r[1])).join(', ') : ''; }).filter(Boolean).join(' · ');
  A.acts.locsTab = el => { S.modal.tab = el.getAttribute('data-t'); A.renderModal(); };

  /* datos de un consultorio */
  A.acts.locAdd = () => {
    if (A.locs().length >= A.locLimit()) { S.modal = { type: 'locMore', back: S.modal }; A.renderModal(); return; }
    const used = A.locs().map(l => l.color), color = COLORS.filter(c => used.indexOf(c) < 0)[0] || COLORS[A.locs().length % COLORS.length];
    S.modal = { type: 'locEdit', back: S.modal, f: { id: null, name: 'Consultorio ' + (A.locs().length + 1), addr: '', color, kind: 'porcentaje', pct: 50, notes: '' } }; A.renderModal();
  };
  A.acts.locEdit = el => { const l = A.locById(el.getAttribute('data-id')); if (!l) return; S.modal = { type: 'locEdit', back: S.modal, f: Object.assign({}, l) }; A.renderModal(); };
  MF.locEdit = m => {
    const f = m.f;
    let b = '<div class="field"><label for="leN">Nombre</label><input id="leN" value="' + esc(f.name) + '" placeholder="Ej.: Consultorio Centro, Sindicato de la Fruta"></div>' +
      '<div class="field"><label for="leA">Dirección</label><input id="leA" value="' + esc(f.addr || '') + '" placeholder="Calle, número y ciudad"></div>' +
      '<div class="field"><label>Color en la agenda</label><div class="lc-colors">' + COLORS.map(c => '<button class="lc-col' + (c === f.color ? ' on' : '') + '" data-act="leColor" data-c="' + c + '" style="background:' + c + '" aria-label="Color" aria-pressed="' + (c === f.color) + '"></button>').join('') + '</div></div>' +
      '<div class="row2"><div class="field"><label for="leK">Cómo trabajás ahí</label><select id="leK" data-chg="leKind">' + KINDS.map(k => '<option value="' + k[0] + '"' + (k[0] === f.kind ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="leP">Tu parte de lo que se cobra (%)</label><input id="leP" type="number" min="0" max="100" inputmode="numeric" value="' + (f.pct == null ? 100 : f.pct) + '"></div></div>' +
      '<div class="field"><label for="leO">Notas</label><textarea id="leO" rows="2" placeholder="Ej.: el consultorio retiene el 40%; liquida los días 10">' + esc(f.notes || '') + '</textarea></div><div id="leMsg" class="hint bad"></div>';
    return A.modalShell(f.id ? 'Consultorio' : 'Nuevo consultorio', b, (f.id && A.locs().length > 1 ? '<button class="btn danger" data-act="leDel">Quitar</button>' : '') + '<button class="btn" data-act="leBack">Cancelar</button><button class="btn primary" data-act="leSave">Guardar</button>');
  };
  const readLe = () => { const f = S.modal.f; f.name = $('#leN').value.trim(); f.addr = $('#leA').value.trim(); f.kind = $('#leK').value; f.pct = Math.max(0, Math.min(100, parseInt($('#leP').value, 10))); if (isNaN(f.pct)) f.pct = 100; f.notes = $('#leO').value.trim(); };
  A.acts.leColor = el => { readLe(); S.modal.f.color = el.getAttribute('data-c'); A.renderModal(); };
  A.chg.leKind = el => { const p = $('#leP'); if (p) p.value = el.value === 'propio' ? 100 : el.value === 'porcentaje' ? 50 : p.value; };
  A.acts.leBack = () => { S.modal = S.modal.back || { type: 'locs', tab: 'cons' }; A.renderModal(); };
  A.acts.leSave = () => {
    readLe(); const f = S.modal.f; if (!f.name) { $('#leMsg').textContent = 'Poné un nombre para reconocerlo en la agenda.'; return; }
    if (f.id) Object.assign(A.locById(f.id), f); else { f.id = 'c' + Date.now().toString(36); A.locs().push(f); }
    A.save(); A.toast('Consultorio guardado: ' + f.name + '.');
    S.modal = Object.assign({}, S.modal.back || { type: 'locs' }, { tab: f.id && S.modal.back && S.modal.back.tab === 'sem' ? 'sem' : 'cons' }); A.renderModal(); A.refresh();
  };
  A.acts.leDel = () => {
    const f = S.modal.f, fut = futureOf(f.id);
    S.modal = { type: 'leDelOk', id: f.id, back: S.modal.back, fut }; A.renderModal();
  };
  const futureOf = id => { let n = 0; Object.keys(A.S.days || {}).forEach(d => { if (d >= A.today()) (A.S.days[d] || []).forEach(a => { if (a.type !== 'block' && a.status !== 'cancelado' && A.locOf(a) === id) n++; }); }); return n; };
  MF.leDelOk = m => A.modalShell('Quitar ' + locName(m.id), '<p>Se quita el consultorio y sus franjas de horario. Los turnos y cobros ya registrados no se borran.</p>' + (m.fut ? '<p class="pd-warn">Tiene <b>' + m.fut + ' turno' + (m.fut > 1 ? 's' : '') + ' a futuro</b>. Van a quedar en el consultorio más cercano a su horario; revisalos en la agenda.</p>' : ''), '<button class="btn" data-act="leBack">Cancelar</button><button class="btn danger" data-act="leDelGo" data-id="' + m.id + '">Quitar consultorio</button>');
  A.acts.leDelGo = el => {
    const id = el.getAttribute('data-id'), s = me().sched || {};
    A.CFG.locs = A.locs().filter(l => l.id !== id); Object.keys(s).forEach(d => { s[d] = (s[d] || []).filter(r => r[2] !== id); }); syncDays(); A.save();
    S.modal = { type: 'locs', tab: 'cons' }; A.renderModal(); A.refresh();
  };
  MF.locMore = () => {
    const sup = A.SUPPORT || {};
    return A.modalShell('Sumar otro consultorio', '<p>Tu plan incluye <b>' + A.locLimit() + ' consultorio' + (A.locLimit() > 1 ? 's' : '') + '</b>. Podés sumar consultorios adicionales (hasta ' + MAXL + ' en total) para manejar todas tus agendas desde OdontoVoz.</p><p class="hint">Escribinos para activarlo: apenas se acredita, aparece en todos tus equipos.</p>',
      (sup.whatsapp ? '<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(sup.whatsapp).replace(/\D/g, '')) + '?text=' + encodeURIComponent('Hola, quiero sumar un consultorio adicional en OdontoVoz. Mi cuenta: ' + ((A.cloud && A.cloud.session && A.cloud.session.user.email) || '')) + '">Pedirlo por WhatsApp</a>' : '') + '<button class="btn" data-act="leBack">Volver</button>');
  };

  /* franjas de la semana */
  A.acts.slotAdd = el => { const d = +el.getAttribute('data-d'), last = ((me().sched || {})[d] || []).slice().sort((x, y) => y[1] - x[1])[0]; S.modal = { type: 'slot', back: S.modal, d, i: -1, f: { from: last ? Math.min(last[1] + 60, 1260) : 540, to: last ? Math.min(last[1] + 300, 1380) : 720, loc: (A.locs()[0] || {}).id } }; A.renderModal(); };
  A.acts.slotEdit = el => { const d = +el.getAttribute('data-d'), i = +el.getAttribute('data-i'), r = me().sched[d][i]; S.modal = { type: 'slot', back: S.modal, d, i, f: { from: r[0], to: r[1], loc: r[2] } }; A.renderModal(); };
  MF.slot = m => {
    const f = m.f, dn = DAYS.filter(x => x[0] === m.d)[0][1];
    let b = '<div class="field"><label for="slL">Consultorio</label><select id="slL">' + A.locs().map(l => '<option value="' + l.id + '"' + (l.id === f.loc ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div>' +
      '<div class="row2"><div class="field"><label for="slF">Desde</label><input type="time" id="slF" step="900" value="' + A.mm(f.from) + '"></div><div class="field"><label for="slT">Hasta</label><input type="time" id="slT" step="900" value="' + A.mm(f.to) + '"></div></div>' +
      '<div class="field"><label>Repetir en</label><div class="row-btns">' + DAYS.map(([d, n]) => '<label class="chk sl-day"><input type="checkbox" class="slD" value="' + d + '"' + (d === m.d ? ' checked' + (m.i >= 0 ? ' disabled' : '') : '') + '> ' + n.slice(0, 3) + '</label>').join('') + '</div></div><div id="slMsg" class="hint bad"></div>';
    return A.modalShell((m.i >= 0 ? 'Franja del ' : 'Nueva franja · ') + dn.toLowerCase(), b, (m.i >= 0 ? '<button class="btn danger" data-act="slotDel">Quitar</button>' : '') + '<button class="btn" data-act="leBack">Cancelar</button><button class="btn primary" data-act="slotSave">Guardar</button>');
  };
  A.acts.slotSave = () => {
    const m = S.modal, from = A.toMin($('#slF').value), to = A.toMin($('#slT').value), loc = $('#slL').value, msg = $('#slMsg');
    if (!(to > from)) { msg.textContent = 'La hora de fin tiene que ser después del inicio.'; return; }
    const days = Array.prototype.slice.call(document.querySelectorAll('.slD:checked')).map(x => +x.value);
    if (m.i >= 0 && days.indexOf(m.d) < 0) days.push(m.d);
    const s = me().sched || (me().sched = {});
    for (const d of days) {
      const rs = (s[d] || []).filter((r, i) => !(d === m.d && i === m.i));
      const clash = rs.filter(r => r[0] < to && from < r[1])[0];
      if (clash) { msg.textContent = 'El ' + DAYS.filter(x => x[0] === d)[0][1].toLowerCase() + ' ya estás en ' + locName(clash[2]) + ' de ' + A.mm(clash[0]) + ' a ' + A.mm(clash[1]) + '.'; return; }
    }
    days.forEach(d => {
      const rs = (s[d] || []).slice();
      if (d === m.d && m.i >= 0) rs.splice(m.i, 1);
      rs.push([from, to, loc]); rs.sort((x, y) => x[0] - y[0]); s[d] = rs;
    });
    syncDays(); A.save(); A.toast('Horario guardado.'); S.modal = m.back || { type: 'locs' }; A.renderModal(); A.refresh();
  };
  A.acts.slotDel = () => { const m = S.modal, s = me().sched; s[m.d].splice(m.i, 1); syncDays(); A.save(); S.modal = m.back || { type: 'locs' }; A.renderModal(); A.refresh(); };

  /* =====================================================================
     COBROS POR CONSULTORIO Y TU PARTE
     ===================================================================== */
  /* a qué consultorio corresponde un cobro: el elegido al cobrar o el del turno de ese día */
  A.locOfPay = (pid, e) => {
    if (e.loc && A.locById(e.loc)) return e.loc;
    if (e.apptId) { const a = A.apptById(e.apptId); if (a) return A.locOf(a); }
    const same = A.day(e.date).filter(a => a.pid === pid && a.type !== 'block' && a.status !== 'cancelado')[0];
    if (same) return A.locOf(same);
    return (A.locs()[0] || {}).id || null;
  };
  const prevCobro = MF.cobro;
  MF.cobro = m => {
    let h = prevCobro(m);
    if (!multi()) return h;
    const def = A.locOfPay(m.pid, { date: A.today() });
    return h.replace('<div id="mvMsg"', '<div class="field"><label for="mvLoc">Consultorio</label><select id="mvLoc">' + A.locs().map(l => '<option value="' + l.id + '"' + (l.id === def ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div><div id="mvMsg"');
  };
  const prevCobroSave = A.acts.cobroSave;
  A.acts.cobroSave = (el, ev) => {
    const sel = $('#mvLoc'), loc = sel ? sel.value : null, pid = S.modal && S.modal.pid, ids = loc && pid ? new Set(A.pd(pid).ledger.map(e => e.id)) : null;
    prevCobroSave(el, ev);
    if (ids) { const nw = A.pd(pid).ledger.filter(e => !ids.has(e.id)); if (nw.length) { nw.forEach(e => { e.loc = loc; }); A.touchPd(pid); } }
  };
  function monthData(month) {
    const out = {}; A.locs().forEach(l => { out[l.id] = { cob: 0, n: 0, pays: [] }; });
    const none = { cob: 0, n: 0, pays: [] };
    const y = +month.slice(0, 4), mo = +month.slice(5, 7), last = new Date(y, mo, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const k = month + '-' + String(d).padStart(2, '0'); if (k > A.today()) break;
      A.day(k).forEach(a => { if (a.type !== 'block' && a.status === 'atendido') { const l = A.locOf(a); (out[l] || none).n++; } });
    }
    A.PATS.forEach(p => {
      const pd = A.S.pd[p.id] || (A.DEMO ? A.pd(p.id) : null); if (!pd || pd.deleted || !pd.ledger) return;
      pd.ledger.forEach(e => { if (e.type !== 'pago' || e.voided || !e.date || e.date.slice(0, 7) !== month) return; const l = A.locOfPay(p.id, e), t = out[l] || none; t.cob += e.amount; t.pays.push({ e, p }); });
    });
    return { out, none };
  }
  function moneyHTML(m) {
    const month = m.month || A.today().slice(0, 7), { out, none } = monthData(month);
    const [y, mo] = month.split('-').map(Number), label = A.MON ? A.cap(A.MON[mo - 1]) + ' ' + y : month;
    let tC = 0, tMine = 0;
    let b = '<div class="lm-head"><button class="btn small" data-act="lmMon" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(label) + '</b><button class="btn small" data-act="lmMon" data-n="1" aria-label="Mes siguiente">›</button></div>';
    b += '<div class="lm-tbl"><div class="lm-th"><span>Consultorio</span><span>Atendidos</span><span>Cobrado</span><span>Tu parte</span><span>Para el consultorio</span></div>';
    A.locs().forEach(l => {
      const t = out[l.id], pct = l.pct == null ? 100 : l.pct, mine = Math.round(t.cob * pct / 100); tC += t.cob; tMine += mine;
      b += '<details class="lm-tr" style="--lc:' + l.color + '"><summary><span class="lm-n"><i></i><b>' + esc(l.name) + '</b><small>' + esc(KL[l.kind]) + (pct !== 100 ? ' · ' + pct + '%' : '') + '</small></span><span data-l="Atendidos">' + t.n + '</span><span data-l="Cobrado">' + A.money(t.cob) + '</span><span data-l="Tu parte"><b>' + A.money(mine) + '</b></span><span data-l="Para el consultorio">' + A.money(t.cob - mine) + '</span></summary>' +
        (t.pays.length ? '<div class="lm-pays">' + t.pays.sort((x, z) => (x.e.date < z.e.date ? -1 : 1)).map(x => '<div><span>' + A.fmtDMY(x.e.date).slice(0, 5) + '</span><span>' + esc(x.p.name) + '</span><span>' + esc(x.e.method || '') + '</span><b>' + A.money(x.e.amount) + '</b></div>').join('') + '</div>' : '<div class="hint" style="padding:6px 12px">Sin cobros este mes.</div>') + '</details>';
    });
    if (none.cob) { tC += none.cob; tMine += none.cob; b += '<div class="lm-tr lm-x"><span class="lm-n"><b>Sin consultorio</b></span><span>' + none.n + '</span><span>' + A.money(none.cob) + '</span><span>' + A.money(none.cob) + '</span><span>—</span></div>'; }
    b += '<div class="lm-tot"><span>Total del mes</span><span></span><span>' + A.money(tC) + '</span><span><b>' + A.money(tMine) + '</b></span><span>' + A.money(tC - tMine) + '</span></div></div>';
    b += '<p class="small-note">«Cobrado» suma lo que registraste como cobro a pacientes en cada consultorio (al cobrar se elige el consultorio; si no, se toma el del turno de ese día). «Tu parte» aplica el porcentaje de cada consultorio. Lo que paga una obra social o la institución por su cuenta no entra acá.</p>';
    return b;
  }
  A.acts.lmMon = el => { const m = S.modal, cur = m.month || A.today().slice(0, 7), [y, mo] = cur.split('-').map(Number), d = new Date(y, mo - 1 + (+el.getAttribute('data-n')), 1); m.month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); A.renderModal(); };

  /* en la caja: acceso directo */
  const prevCaja = A.render.caja;
  if (prevCaja) A.render.caja = () => {
    prevCaja();
    if (!multi()) return;
    const host = $('#view-caja'); if (!host || $('#cajaLoc')) return;
    host.insertAdjacentHTML('afterbegin', '<div class="caja-loc" id="cajaLoc"><span>Tenés ' + A.locs().length + ' consultorios.</span><button class="btn small primary" data-act="locMoney">Cobros y tu parte por consultorio</button></div>');
  };
  A.acts.locMoney = () => { if (!solo()) return; ensureFirst(); S.modal = { type: 'locs', tab: 'plata' }; A.renderModal(); };

  /* menú: Mis consultorios (solo en modo profesional) */
  const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const anchor = $('#gearMenu .dnav[data-act="notifOpen"]') || $('#gearMenu .dnav[data-act="osOpen"]') || $('#gearMenu .dnav[data-act="catalogOpen"]');
  const btn = '<button class="dnav loc-nav" data-act="locsOpen">' + PIN + '<span>Mis consultorios y horarios</span></button>';
  if (anchor) anchor.insertAdjacentHTML('beforebegin', btn); else { const g = $('#gearMenu'); if (g) g.insertAdjacentHTML('afterbegin', btn); }
  const prevAfter = A.afterRefresh;
  A.afterRefresh = () => { if (prevAfter) prevAfter(); A.$$('.loc-nav').forEach(b => { b.hidden = !solo(); }); };

  /* por voz: «mis consultorios», «horarios de los consultorios» */
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    const c = A.norm(text).replace(/[.,;!?¿¡]/g, '').trim();
    if (/^(?:abri |abrir |ver |mostrame )?(?:mis )?consultorios(?: y horarios)?$|^(?:los )?horarios de (?:los |mis )?consultorios$/.test(c) && solo()) { A.acts.locsOpen(); return { ok: true, msg: 'Tus consultorios y horarios.' }; }
    return execPrev(text, o);
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.lband{position:absolute;left:0;right:0;z-index:1;background:color-mix(in srgb,var(--lc) 9%,transparent);border-left:5px solid var(--lc);pointer-events:none}.lband span{position:absolute;right:6px;bottom:4px;font-size:11px;font-weight:700;color:var(--lc);background:var(--surface);border-radius:999px;padding:1px 8px;opacity:.9}' +
    '.ldot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;margin-right:5px;display:inline-block}.ltag{color:var(--lc);font-weight:700}.ltag::after{content:" ·";color:var(--ink-2);font-weight:400}' +
    '.lbar{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}@media (max-width:640px){.lbar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.lchip{flex:0 0 auto}}.lchip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;font:600 14px/1.1 inherit;cursor:pointer}.lchip i{width:10px;height:10px;border-radius:50%;background:var(--lc)}.lchip small{font-weight:400;color:var(--ink-2)}.lchip.on{border-color:var(--lc,var(--accent));box-shadow:inset 0 0 0 1px var(--lc,var(--accent));background:color-mix(in srgb,var(--lc,var(--accent)) 10%,var(--surface))}.lchip.ghost{border-style:dashed;color:var(--accent)}' +
    '.loc-today{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:-4px 0 12px}.lt-l{color:var(--ink-2);font-size:14px}.lt-c{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-left:4px solid var(--lc);border-radius:10px;padding:5px 10px;background:var(--surface);font-size:14px}.lt-c i{display:none}' +
    '.loc-pick .pill[aria-pressed="true"]{border-color:var(--lc);box-shadow:inset 0 0 0 1px var(--lc)}' +
    '.lc-modal{width:min(860px,96vw);max-width:min(860px,96vw)}.lc-tabs{margin-bottom:12px;flex-wrap:wrap}' +
    '.lc-list{display:flex;flex-direction:column;gap:8px}.lc-row{display:flex;align-items:center;gap:12px;text-align:left;border:1px solid var(--line);border-left:6px solid var(--lc);border-radius:12px;background:var(--surface);color:var(--ink);padding:12px;cursor:pointer;font:inherit}.lc-row>i{display:none}.lc-row span{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}.lc-row small{color:var(--ink-2);font-size:13.5px}.lc-ed{flex:0 0 auto!important;color:var(--accent);font-weight:700}' +
    '.wk{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden}.wk-d{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line)}.wk-d:first-child{border-top:0}.wk-r{display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '.wk-s{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-left:5px solid var(--lc);border-radius:10px;padding:4px 4px 4px 10px;background:var(--surface);font-size:14px}.wk-s i{display:none}.wk-s button{border:0;background:transparent;color:var(--accent);font-size:16px;cursor:pointer;width:30px;height:30px}.wk-none{color:var(--ink-2);font-size:14px}' +
    '@media (max-width:560px){.wk-d{grid-template-columns:1fr;gap:6px}}' +
    '.lc-colors{display:flex;gap:10px}.lc-col{width:34px;height:34px;border-radius:50%;border:3px solid transparent;cursor:pointer}.lc-col.on{border-color:var(--ink);box-shadow:0 0 0 2px var(--surface) inset}.sl-day{min-width:62px}' +
    '.lm-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}.lm-tbl{border:1px solid var(--line);border-radius:12px;overflow:hidden}' +
    '.lm-th,.lm-tr>summary,.lm-x,.lm-tot{display:grid;grid-template-columns:minmax(0,1.6fr) .7fr 1fr 1fr 1fr;gap:8px;align-items:center;padding:10px 12px}.lm-th{font-size:12.5px;color:var(--ink-2);font-weight:700;background:var(--bg-2,transparent)}' +
    '.lm-tr{border-top:1px solid var(--line);border-left:5px solid var(--lc,var(--line))}.lm-tr>summary{cursor:pointer;list-style:none}.lm-tr>summary::-webkit-details-marker{display:none}.lm-n{display:flex;flex-direction:column}.lm-n i{display:none}.lm-n small{color:var(--ink-2);font-size:12.5px}' +
    '.lm-pays{padding:0 12px 10px}.lm-pays div{display:grid;grid-template-columns:52px minmax(0,1fr) 110px 100px;gap:8px;font-size:13.5px;padding:4px 0;border-top:1px dashed var(--line)}.lm-pays b{text-align:right}' +
    '.lm-tot{border-top:2px solid var(--line);font-weight:700}' +
    '@media (max-width:640px){.lm-th{display:none}.lm-tr>summary,.lm-x,.lm-tot{grid-template-columns:1fr 1fr}.lm-n{grid-column:1/-1}.lm-tr>summary span[data-l]::before{content:attr(data-l) ": ";color:var(--ink-2);font-size:12px;font-weight:400}.lm-tot span:empty{display:none}.lm-pays div{grid-template-columns:44px minmax(0,1fr) 80px}.lm-pays div span:nth-child(3){display:none}}' +
    '.caja-loc{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:12px;background:var(--surface)}' +
    '</style>');
})();
