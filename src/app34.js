/* ===== 1.24: turnos sin ficha (solo en la agenda), bloquear un horario con un toque y notas en la agenda ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const LSget = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const who = () => { const m = A.memberNow && A.memberNow(); if (m && m.name) return m.name; const p = A.empCurPerson && A.empCurPerson(); return p && p.name ? p.name : ''; };

  /* =====================================================================
     1) TURNO SIN FICHA: el paciente queda solo en la agenda (nombre y teléfono)
        y pasa a la lista de pacientes cuando viene y se le toman los datos.
     ===================================================================== */
  A.isProv = p => !!(p && p.prov);
  const provDefault = () => LSget('odontovoz.provDef', '1') === '1';
  let provNext = null;
  const addPrev = A.addPatient;
  A.addPatient = d => {
    const p = addPrev(d);
    if (provNext) { p.prov = true; const pd = A.pd(p.id); pd.prof = Object.assign(pd.prof || {}, { prov: true }); A.touchPd(p.id); A.save(); }
    return p;
  };
  /* al cargar, la marca vuelve desde la ficha guardada */
  const markProv = () => A.PATS.forEach(p => { const pd = A.S.pd && A.S.pd[p.id]; if (pd && pd.prof && pd.prof.prov != null) p.prov = !!pd.prof.prov; });
  const loadPrev = A.load; if (loadPrev) A.load = (...a) => { const r = loadPrev.apply(A, a); markProv(); return r; };
  markProv();
  const afterPrev = A.afterRefresh; let mk = 0;
  A.afterRefresh = () => { if (++mk % 5 === 1) markProv(); if (afterPrev) afterPrev(); };

  /* en el buscador del turno: «Agendar a Fulano sin ficha» como primera opción */
  const insPrev = A.ins.naSearch;
  A.ins.naSearch = el => {
    insPrev(el);
    const host = $('#naRes'), q = el.value.trim(); if (!host || q.length < 2) return;
    const list = host.querySelector('.mini-list'); if (!list) return;
    list.querySelectorAll('[data-act="naPick"]').forEach(b => { const p = A.PAT(b.getAttribute('data-pid')); if (A.isProv(p)) { b.innerHTML = '<b>' + esc(p.name) + '</b> <span class="chip warn">sin ficha</span>' + (p.phone ? ' <span class="muted">· ' + esc(p.phone) + '</span>' : ''); } });
    list.insertAdjacentHTML('afterbegin', '<button data-act="naGuest" class="na-guest"><b>+ Agendar a «' + esc(q) + '» solo en la agenda</b><span class="muted">sin ficha: nombre y teléfono, la ficha se hace cuando venga</span></button>');
    const nw = list.querySelector('[data-act="naNew"]'); if (nw) nw.innerHTML = '+ Crear paciente nuevo con ficha' + (list.querySelectorAll('[data-act="naPick"]').length ? '' : ' (no hay otro con ese nombre)');
  };
  A.acts.naGuest = el => { A.acts.naNew(el); const f = S.modal && S.modal.f; if (f) { f.prov = true; A.renderModal(); const ph = $('#nc_phone'); if (ph) ph.focus(); } };
  const naNewPrev = A.acts.naNew;
  A.acts.naNew = el => { const f0 = S.modal && S.modal.f; if (f0 && f0.prov == null) f0.prov = false; naNewPrev(el); };

  /* el formulario del paciente nuevo: casilla «Guardarlo ya en la lista de pacientes» */
  const wrapPrev = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = wrapPrev ? wrapPrev(m, html) : html;
    const f = m.f;
    if (f.creating) {
      const prov = f.prov == null ? provDefault() : !!f.prov;
      const box = '<label class="na-prov"><input type="checkbox" id="naProv"' + (prov ? '' : ' checked') + '> Guardarlo ya en la lista de pacientes</label><div class="hint" id="naProvHint">' + (prov ? 'Queda <b>solo en la agenda</b>, sin ficha. Cuando venga a la consulta lo pasás a la lista (o lo unís con su ficha si ya la tenía), y no se duplica.' : 'Se crea su ficha ahora. El DNI y lo demás se completan cuando venga.') + '</div>';
      html = html.replace('<h3>Paciente nuevo</h3>', '<h3>' + (prov ? 'Solo en la agenda (sin ficha)' : 'Paciente nuevo') + '</h3>');
      html = html.replace(/(<div class="hint">Si es la primera vez[^<]*<\/div>)?<button class="btn small primary" data-act="naCreate">[^<]*<\/button>/, box + '<button class="btn small primary" data-act="naCreate">' + (prov ? 'Listo' : 'Usar este paciente') + '</button>');
      if (prov) html = html.replace(/<div class="field"><label for="nc_dni">[\s\S]*?<\/div>(?=<div class="field"><label for="nc_phone">)/, '');
    }
    if (f.pid && A.isProv(A.PAT(f.pid))) html = html.replace(/(<b>[^<]*<\/b>)(<div class="hint">)/, '$1 <span class="chip warn">sin ficha</span>$2');
    return html;
  };
  document.addEventListener('change', e => {
    if (!e.target || e.target.id !== 'naProv' || !S.modal || !S.modal.f) return;
    const f = S.modal.f; ['first', 'last', 'dni', 'phone'].forEach(k => { const i = $('#nc_' + k); if (i) f['n_' + k] = i.value; });
    f.prov = !e.target.checked; LSset('odontovoz.provDef', f.prov ? '1' : '0');
    const keep = { pro: ($('#naPro') || {}).value, date: ($('#naDate') || {}).value, dur: ($('#naDur') || {}).value, what: ($('#naWhat') || {}).value };
    A.renderModal();
    if (keep.pro && $('#naPro')) $('#naPro').value = keep.pro; if (keep.date && $('#naDate')) $('#naDate').value = keep.date; if (keep.dur && $('#naDur')) $('#naDur').value = keep.dur; if (keep.what && $('#naWhat')) $('#naWhat').value = keep.what;
  });
  /* crear el paciente con la marca que corresponda */
  ['naCreate', 'naSave'].forEach(k => {
    const prev = A.acts[k]; if (!prev) return;
    A.acts[k] = (el, ev) => {
      const f = S.modal && S.modal.f;
      provNext = f ? (f.prov == null ? provDefault() : !!f.prov) : null;
      try { return prev(el, ev); } finally { provNext = null; }
    };
  });

  /* lista de pacientes: los de solo agenda no se mezclan; van en su propio recuadro */
  const rpPrev = A.render.pacientes;
  A.render.pacientes = () => {
    const prov = A.PATS.filter(A.isProv);
    if (!prov.length) return rpPrev();
    const keep = A.PATS.slice(); for (let i = A.PATS.length - 1; i >= 0; i--) if (A.PATS[i].prov) A.PATS.splice(i, 1);
    try { rpPrev(); } finally { A.PATS.length = 0; keep.forEach(p => A.PATS.push(p)); }
    const host = $('#patList'); if (!host || S.pq) return;
    const nx = p => { const a = A.nextAppt && A.nextAppt(p.id); return a ? A.fmtShort(a.date) + ' ' + A.mm(a.start) : 'sin turno próximo'; };
    host.insertAdjacentHTML('beforebegin', '<details class="prov-box"' + (S.provOpen ? ' open' : '') + '><summary>Solo en la agenda, sin ficha <span class="chip warn">' + prov.length + '</span><span class="muted"> · se pasan a la lista cuando vienen</span></summary><div class="prov-list">' + prov.map(p => '<div class="prov-row"><span><b>' + esc(p.name) + '</b><span class="muted">' + (p.phone ? esc(p.phone) + ' · ' : '') + 'turno: ' + esc(nx(p)) + '</span></span><span class="row-btns"><button class="btn small" data-act="provReg" data-pid="' + p.id + '">Pasar a la lista</button></span></div>').join('') + '</div></details>');
    const d = document.querySelector('.prov-box'); if (d) d.addEventListener('toggle', () => { S.provOpen = d.open; });
  };

  /* al llegar a la consulta: pasarlo a la lista o unirlo con la ficha que ya tenía */
  function matches(p) {
    const seen = {}, out = [];
    [p.name, p.last, p.first + ' ' + (p.last || '').split(' ')[0]].filter(x => x && x.trim().length >= 3).forEach(q => (A.searchPats(q, 8) || []).forEach(x => { if (x.id !== p.id && !x.prov && !x.deleted && !seen[x.id]) { seen[x.id] = 1; out.push(x); } }));
    const ph = String(p.phone || '').replace(/\D/g, '').slice(-8);
    if (ph.length >= 6) A.PATS.forEach(x => { if (x.id !== p.id && !x.prov && !seen[x.id] && String(x.phone || '').replace(/\D/g, '').slice(-8) === ph) { seen[x.id] = 1; out.unshift(x); } });
    return out.slice(0, 6);
  }
  A.acts.provReg = el => { const pid = el.getAttribute('data-pid'); S.panel = null; A.renderPanel(); S.modal = { type: 'provReg', pid, q: '' }; A.renderModal(); };
  MF.provReg = m => {
    const p = A.PAT(m.pid); if (!p) return A.modalShell('Paciente', '<p>No se encontró.</p>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const ms = m.q ? (A.searchPats(m.q, 8) || []).filter(x => x.id !== p.id && !x.prov) : matches(p);
    const row = x => '<button class="pm-it" data-act="provJoin" data-pid="' + p.id + '" data-to="' + x.id + '"><b>Es ' + esc(x.name) + '</b><span>' + (x.dni ? 'DNI ' + esc(x.dni) + ' · ' : '') + (x.phone ? esc(x.phone) + ' · ' : '') + esc(x.cov || '') + '</span></button>';
    return A.modalShell('Pasar a la lista de pacientes',
      '<p><b>' + esc(p.name) + '</b>' + (p.phone ? ' · ' + esc(p.phone) : '') + ' tiene turno pero todavía no tiene ficha.</p>' +
      '<h3 style="font-size:15px;margin:12px 0 6px">¿Ya tenía ficha?</h3>' + (ms.length ? '<div class="pm-list">' + ms.map(row).join('') + '</div>' : '<p class="hint">No hay otro paciente con ese nombre o teléfono.</p>') +
      '<div class="field" style="margin-top:8px"><label for="provQ">Buscar otra ficha</label><input id="provQ" data-in="provQ" autocomplete="off" placeholder="Apellido, nombre o DNI" value="' + esc(m.q || '') + '"></div>' +
      '<p class="hint">Si es uno de estos, se unen: sus turnos pasan a esa ficha y no queda duplicado.</p>',
      '<button class="btn" data-act="closeModal">Más tarde</button><button class="btn primary" data-act="provNew" data-pid="' + p.id + '">Es nuevo: hacer la ficha</button>');
  };
  let pqT = null;
  A.ins.provQ = el => { if (!S.modal) return; S.modal.q = el.value; clearTimeout(pqT); pqT = setTimeout(() => { const pos = el.selectionStart; A.renderModal(); const i = $('#provQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }, 250); };
  A.acts.provNew = el => {
    const pid = el.getAttribute('data-pid'), p = A.PAT(pid); if (!p) return;
    A.setProfile(pid, { prov: false }); p.prov = false; A.save();
    S.modal = null; A.renderModal(); suppressAsk = true;
    try { A.openFicha(pid, 'datos'); } finally { suppressAsk = false; }
    A.toast(p.name + ' ya está en la lista de pacientes. Completá sus datos.');
    if (A.acts.quickFill) setTimeout(() => { const b = document.querySelector('[data-act="pfEdit"],[data-act="profEdit"],[data-act="editProfile"]'); if (b) b.click(); }, 200);
  };
  A.provMerge = (from, to) => {
    const pf = A.PAT(from), pt = A.PAT(to); if (!pf || !pt || from === to) return false;
    const days = []; Object.keys(A.S.days || {}).forEach(d => { if ((A.S.days[d] || []).some(a => a.pid === from)) days.push(d); });
    A.mutate(days, () => { days.forEach(d => (A.S.days[d] || []).forEach(a => { if (a.pid === from) a.pid = to; })); }, 'Turnos de ' + pf.name + ' pasados a la ficha de ' + pt.name);
    /* si había cargado algo (una nota, un cobro), se suma a la ficha */
    const a = A.S.pd[from], b = A.pd(to);
    if (a) Object.keys(a).forEach(k => { if (k !== 'prof' && Array.isArray(a[k]) && a[k].length) b[k] = (b[k] || []).concat(a[k]); });
    if (!pt.phone && pf.phone) A.setProfile(to, { phone: pf.phone });
    A.touchPd(to);
    if (a) A.S.pd[from] = { prof: a.prof };
    A.deletePatient(from);
    return true;
  };
  A.acts.provJoin = el => {
    const from = el.getAttribute('data-pid'), to = el.getAttribute('data-to'), pf = A.PAT(from), pt = A.PAT(to); if (!pf || !pt) return;
    const nm = pf.name; A.provMerge(from, to);
    S.modal = null; A.renderModal(); A.refresh(); A.toast(nm + ' quedó unido a la ficha de ' + pt.name + '.');
  };

  /* el aviso aparece en el turno abierto, al marcar que llegó y al abrir la ficha */
  let suppressAsk = false;
  const ofPrev = A.openFicha;
  A.openFicha = (pid, tab, opt) => {
    const r = ofPrev(pid, tab, opt);
    if (!suppressAsk && A.isProv(A.PAT(pid)) && !(S.modal && S.modal.type === 'provReg')) { S.modal = { type: 'provReg', pid, q: '' }; A.renderModal(); }
    return r;
  };
  const ssPrev = A.setStatus;
  A.setStatus = (id, st) => {
    const r = ssPrev(id, st), a = A.apptById(id);
    if (a && a.pid && A.isProv(A.PAT(a.pid)) && (st === 'llego' || st === 'en-atencion' || st === 'atendido')) { S.modal = { type: 'provReg', pid: a.pid, q: '' }; A.renderModal(); }
    return r;
  };
  const rpPanel = A.renderPanel;
  A.renderPanel = () => {
    rpPanel();
    if (!S.panel || S.panel.type !== 'appt') return;
    const a = A.apptById(S.panel.id), host = $('#panelHost .panel'); if (!a || !host) return;
    if (a.type === 'block') { notePanel(a, host); return; }
    const p = a.pid && A.PAT(a.pid); if (!A.isProv(p) || host.querySelector('.prov-note')) return;
    const old = host.querySelector('.quick-note'); if (old && /cargado al paso/.test(old.textContent)) old.remove();
    const head = host.querySelector('.panel-head');
    if (head) head.insertAdjacentHTML('afterend', '<div class="prov-note"><b>Turno sin ficha</b><span>' + (p.phone ? esc(p.phone) + ' · ' : 'Sin teléfono · ') + 'todavía no está en la lista de pacientes.</span><div class="row-btns"><button class="btn small primary" data-act="provReg" data-pid="' + p.id + '">Pasar a la lista de pacientes</button>' + (!p.phone ? '<button class="btn small" data-act="provPhone" data-pid="' + p.id + '">Agregar teléfono</button>' : '') + '</div></div>');
  };
  A.acts.provPhone = el => { const pid = el.getAttribute('data-pid'); S.modal = { type: 'provPhone', pid }; A.renderModal(); setTimeout(() => { const i = $('#ppTel'); if (i) i.focus(); }, 50); };
  MF.provPhone = m => A.modalShell('Teléfono', '<div class="field"><label for="ppTel">Teléfono (WhatsApp) de ' + esc(A.PAT(m.pid).name) + '</label><input id="ppTel" inputmode="tel" placeholder="Ej.: 299 555-1234"></div>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="provPhoneGo" data-pid="' + m.pid + '">Guardar</button>');
  A.acts.provPhoneGo = el => { const pid = el.getAttribute('data-pid'), v = ($('#ppTel') || {}).value || ''; if (v.trim()) A.setProfile(pid, { phone: v.trim() }); S.modal = null; A.renderModal(); A.refresh(); if (S.panel) A.renderPanel(); };

  /* =====================================================================
     2) BLOQUEAR Y NOTA DESDE EL MISMO TOQUE EN LA AGENDA
        Turno · Sobreturno · 🔒 Bloquear · ✎ Nota
     ===================================================================== */
  const wrap2 = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = wrap2(m, html);
    return html.replace(/(<div class="na-kind" role="group" aria-label="Tipo de turno">[\s\S]*?)(<\/div>)/, '$1<button type="button" data-act="qbGo" data-k="block"><b>🔒 Bloquear</b><small>que no den turnos</small></button><button type="button" data-act="qbGo" data-k="note"><b>✎ Nota</b><small>un mensaje en la agenda</small></button>$2');
  };
  const readTime = () => { const h = $('#naH'), mi = $('#naMi'); return h && mi ? (+h.value) * 60 + (+mi.value) : A.toMin(($('#naTime') || {}).value || '09:00'); };
  A.acts.qbGo = el => {
    const f = S.modal && S.modal.f || {}, k = el.getAttribute('data-k');
    const pro = ($('#naPro') || {}).value || f.pro, date = ($('#naDate') || {}).value || f.date, start = $('#naH') ? readTime() : f.start, slot = A.slotOf ? A.slotOf(A.PRO(pro)) : 30;
    S.modal = { type: 'qblock', note: k === 'note', f: { pro, date, start, dur: k === 'note' ? slot : Math.max(slot, parseInt(($('#naDur') || {}).value, 10) || slot), label: '' } };
    A.renderModal(); setTimeout(() => { const i = $('#qbLab'); if (i && k === 'note') i.focus(); }, 30);
  };
  const BL_OPTS = ['Curso', 'Trámite', 'Salgo y vuelvo', 'Almuerzo', 'Reunión', 'Urgencia'];
  const NOTE_OPTS = ['Llamar al paciente', 'Confirmar este horario', 'Avisame si llega', 'Paciente prioritario'];
  MF.qblock = m => {
    const f = m.f, pros = A.visPros(), p = A.PRO(f.pro), note = m.note;
    let hs = ''; for (let x = 6; x <= 22; x++) hs += '<option value="' + x + '"' + (x === Math.floor(f.start / 60) ? ' selected' : '') + '>' + String(x).padStart(2, '0') + ' h</option>';
    let ms = ''; for (let x = 0; x < 60; x += 5) ms += '<option value="' + x + '"' + (x === f.start % 60 - (f.start % 60) % 5 ? ' selected' : '') + '>' + String(x).padStart(2, '0') + '</option>';
    const end = (A.hoursFor(p, f.date).filter(r => f.start >= r[0] && f.start < r[1])[0] || [0, 0])[1];
    const durs = [15, 30, 45, 60, 90, 120, 180, 240].filter(d => !end || f.start + d <= end + 1);
    if (durs.indexOf(f.dur) < 0) durs.push(f.dur); durs.sort((a, b) => a - b);
    const kinds = '<div class="na-kind" role="group" aria-label="Qué querés hacer"><button type="button" data-act="qbBack" data-k="0" aria-pressed="false"><b>Turno</b><small>en un horario libre</small></button><button type="button" data-act="qbBack" data-k="1" aria-pressed="false"><b>Sobreturno</b><small>encima de otro</small></button><button type="button" data-act="qbGo" data-k="block" aria-pressed="' + !note + '"><b>🔒 Bloquear</b><small>que no den turnos</small></button><button type="button" data-act="qbGo" data-k="note" aria-pressed="' + note + '"><b>✎ Nota</b><small>un mensaje en la agenda</small></button></div>';
    const body = kinds +
      '<p class="qb-when"><b>' + esc(A.fmtLong(f.date)) + '</b> · ' + esc(p.name) + '</p>' +
      '<div class="row2"><div class="field"><label>Desde</label><div class="na-time"><select id="qbH" aria-label="Hora">' + hs + '</select><span>:</span><select id="qbMi" aria-label="Minutos">' + ms + '</select></div></div>' +
      '<div class="field"><label for="qbDur">' + (note ? 'Duración' : 'Cuánto tiempo') + '</label><select id="qbDur">' + durs.map(d => '<option value="' + d + '"' + (d === f.dur ? ' selected' : '') + '>' + (d < 60 ? d + ' min' : (d / 60) + (d === 60 ? ' hora' : ' horas')) + '</option>').join('') + (end && end > f.start ? '<option value="end">Hasta el final (' + A.mm(end) + ')</option>' : '') + '</select></div></div>' +
      (pros.length > 1 && !note ? '<div class="field"><label for="qbPro">Profesional</label><select id="qbPro">' + pros.map(x => '<option value="' + x.id + '"' + (x.id === f.pro ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '<option value="all">Todos los profesionales</option></select></div>' : '<input type="hidden" id="qbPro" value="' + esc(f.pro) + '">') +
      '<div class="field"><label for="qbLab">' + (note ? 'Mensaje' : 'Motivo o mensaje <span class="opt">opcional</span>') + '</label><input id="qbLab" maxlength="120" placeholder="' + (note ? 'Ej.: llamar a Pérez para confirmar' : 'Ej.: no citar, estoy de curso') + '" value="' + esc(f.label) + '"></div>' +
      '<div class="qb-chips">' + (note ? NOTE_OPTS : BL_OPTS).map(o => '<button type="button" class="pill" data-act="qbChip" data-v="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
      '<p class="hint">' + (note ? 'La nota se ve en la agenda de todos los equipos y <b>no ocupa el horario</b>: se pueden dar turnos igual.' : 'Nadie va a poder dar un turno común en ese horario (en todos los equipos). Un sobreturno sí, si hace falta.') + '</p><div id="qbMsg" class="hint bad"></div>';
    return A.modalShell(note ? 'Nota en la agenda' : 'Bloquear horario', body, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="qbSave">' + (note ? 'Guardar nota' : '🔒 Bloquear') + '</button>');
  };
  A.acts.qbChip = el => { const i = $('#qbLab'); if (!i) return; i.value = el.getAttribute('data-v'); i.focus(); };
  A.acts.qbBack = el => {
    const f = S.modal.f, start = $('#qbH') ? (+$('#qbH').value) * 60 + (+$('#qbMi').value) : f.start;
    S.modal = null; A.openNewAppt({ pro: (($('#qbPro') || {}).value || f.pro).replace('all', '') || f.pro, date: f.date, start, sobre: el.getAttribute('data-k') === '1' });
  };
  A.acts.qbSave = () => {
    const m = S.modal; if (!m || m.type !== 'qblock') return;
    const f = m.f, note = m.note, start = (+$('#qbH').value) * 60 + (+$('#qbMi').value), dv = $('#qbDur').value, lab = ($('#qbLab').value || '').trim();
    if (note && !lab) { $('#qbMsg').textContent = 'Escribí el mensaje de la nota.'; $('#qbLab').focus(); return; }
    const pv = ($('#qbPro') || {}).value || f.pro, targets = pv === 'all' ? A.visPros() : [A.PRO(pv)], made = [], by = who();
    targets.forEach(p => {
      let dur = dv === 'end' ? 0 : parseInt(dv, 10) || 30;
      if (dv === 'end') { const r = A.hoursFor(p, f.date).filter(x => start >= x[0] && start < x[1])[0]; dur = r ? r[1] - start : 60; }
      const it = { id: A.uid(), type: 'block', label: lab || (note ? 'Nota' : 'Bloqueado'), pro: p.id, date: f.date, start, dur, status: 'confirmado', at: new Date().toISOString() };
      if (by) it.by = by;
      if (note) { it.note = true; it.sobre = true; }
      if (A.empSede && A.empSede()) it.loc = A.empSede();
      made.push(it);
    });
    const busy = note ? [] : made.reduce((acc, b) => acc.concat(A.day(f.date).filter(x => x.pro === b.pro && x.type !== 'block' && x.status !== 'cancelado' && !x.sobre && x.start < b.start + b.dur && b.start < x.start + x.dur)), []);
    A.mutate([f.date], () => { made.forEach(b => A.day(f.date).push(b)); }, note ? 'Nota en la agenda: ' + lab : 'Horario bloqueado' + (lab ? ': ' + lab : ''));
    S.modal = null; S.date = f.date; A.refresh();
    if (busy.length) A.toast('Bloqueado. Ojo: en ese horario ya tenía turno ' + busy.map(x => (A.PAT(x.pid) || {}).name).filter(Boolean).join(', ') + '.', null, 7000);
  };

  /* el panel de una nota (o de un bloqueo): quién lo dejó, y convertir uno en otro */
  function notePanel(a, host) {
    if (host.querySelector('.note-meta')) return;
    host.querySelectorAll('button').forEach(x => { if (x.textContent.trim() === 'Borrar turno') x.remove(); });
    if (a.note) {
      const h2 = host.querySelector('.panel-head h2'); if (h2) h2.textContent = '✎ ' + a.label;
      host.querySelectorAll('.block h3').forEach(h => { if (h.textContent === 'Bloqueo') h.textContent = 'Nota'; });
      const lb = host.querySelector('label[for="blLabel"]'); if (lb) lb.textContent = 'Mensaje';
      const sv = host.querySelector('[data-act="apSaveBlock"]'); if (sv) sv.textContent = 'Guardar mensaje';
      const del = host.querySelector('[data-act="apDelBlock"]'); if (del) { del.textContent = 'Borrar nota'; del.insertAdjacentHTML('beforebegin', '<button class="btn small" data-act="noteToBlock" data-id="' + a.id + '">🔒 Convertir en bloqueo</button>'); }
      const sob = host.querySelector('[data-act="apSobre"]'); if (sob) sob.remove();
    } else {
      const h2 = host.querySelector('.panel-head h2'); if (h2 && h2.textContent.indexOf('🔒') < 0) h2.textContent = '🔒 ' + h2.textContent;
    }
    const head = host.querySelector('.panel-head');
    if (head) head.insertAdjacentHTML('afterend', '<div class="note-meta">' + (a.note ? 'Nota: no ocupa el horario.' : 'Bloqueado: no se pueden dar turnos comunes.') + (a.by ? ' Lo dejó <b>' + esc(a.by) + '</b>' : '') + (a.at ? ' · ' + esc(A.fmtShort ? A.fmtShort(a.at.slice(0, 10)) : a.at.slice(0, 10)) + ' ' + esc(new Date(a.at).toTimeString().slice(0, 5)) : '') + '</div>');
  }
  A.acts.noteToBlock = el => { const a = A.apptById(el.getAttribute('data-id')); if (!a) return; A.mutate([a.date], () => { delete a.note; delete a.sobre; }, 'La nota ahora bloquea el horario'); A.refresh(); A.renderPanel(); };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.na-kind{flex-wrap:wrap}.na-kind button{flex:1 1 calc(50% - 4px);min-width:0}' +
    '.na-guest{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:var(--accent-soft,#e6f3f3)!important}.na-guest .muted{font-size:12.5px}' +
    '.na-prov{display:flex;gap:8px;align-items:center;margin:8px 0 2px;font-weight:600}.na-prov input{width:20px;height:20px}' +
    '.prov-box{margin:0 0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 14px}.prov-box summary{cursor:pointer;font-weight:700;list-style-position:inside}.prov-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}' +
    '.prov-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:8px}.prov-row>span:first-child{display:flex;flex-direction:column}.prov-row .muted{font-size:13px}' +
    '.prov-note{margin:0 16px 10px;padding:10px 12px;border-radius:12px;background:#fff6dd;border:1px solid #f0d58a;display:flex;flex-direction:column;gap:4px;color:#5c4400}.prov-note span{font-size:13.5px}' +
    '.note-meta{margin:0 16px 10px;font-size:13px;color:var(--ink-2)}' +
    '.qb-when{margin:4px 0 8px;font-size:14px}.qb-chips{display:flex;flex-wrap:wrap;gap:6px;margin:-2px 0 8px}' +
    '.blk.st-note{background:#fff3c4!important;border-left-color:#d9a400!important;color:#4d3b00;opacity:.96}.blk.st-note .n{font-weight:600}' +
    'html[data-theme="dark"] .blk.st-note{background:#4a3d10!important;color:#ffeaa6}' +
    '@media (prefers-color-scheme: dark){html:not([data-theme="light"]) .blk.st-note{background:#4a3d10!important;color:#ffeaa6}}' +
    '.chip.warn{background:#fff1c7;color:#6b4e00}' +
    '</style>');
})();
