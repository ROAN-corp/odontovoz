/* ===== 1.12: turno con solo el nombre y el teléfono, y sobreturnos más fáciles de dar y de ver ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;

  /* ---------------------------------------------------------------
     PACIENTE NUEVO: alcanza con el nombre (y el teléfono para el WhatsApp).
     Apellido, DNI y lo demás se completan cuando viene por primera vez.
     --------------------------------------------------------------- */
  const prevDerive = A.derive;
  A.derive = p => { prevDerive(p); p.name = String(p.name || '').replace(/\s+/g, ' ').trim(); return p; };
  A.PATS.forEach(p => { if (p.name) p.name = p.name.trim(); });
  /* qué le falta a la ficha de un paciente cargado al paso */
  A.patMissing = p => { if (!p) return []; const m = []; if (!String(p.last || '').trim()) m.push('apellido'); if (!String(p.dni || '').trim()) m.push('DNI'); return m; };
  const cap = s => String(s || '').trim().replace(/\s+/g, ' ').replace(/(^|\s)(\S)/g, (x, a, b) => a + b.toUpperCase());

  function quickCreate(f) {
    const v = id => (($('#' + id) || {}).value || '').trim();
    const first = cap(v('nc_first') || f.n_first), last = cap(v('nc_last') || f.n_last), dni = (v('nc_dni') || f.n_dni || '').replace(/\D/g, ''), phone = v('nc_phone') || f.n_phone || '';
    if (!first && !last) return null;
    const p = A.addPatient({ first: first || last, last: first ? last : '', dni, phone, age: 0 });
    A.setProfile(p.id, { age: 0 }); A.save();
    f.pid = p.id; f.creating = false; return p;
  }
  A.acts.naCreate = () => {
    const f = S.modal.f, p = quickCreate(f), msg = $('#naMsg');
    if (!p) { if (msg) { msg.className = 'hint bad'; msg.textContent = 'Escribí al menos el nombre (por ejemplo «Fulano»).'; } const i = $('#nc_first'); if (i) i.focus(); return; }
    A.renderModal();
  };

  /* el formulario: «Nombre» es lo único necesario; el resto dice «opcional» */
  const prevWrap = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = prevWrap ? prevWrap(m, html) : html;
    const f = m.f;
    html = html.replace('<label for="nc_first">Nombre</label>', '<label for="nc_first">Nombre <span class="req">(alcanza con esto)</span></label>')
      .replace('<label for="nc_last">Apellido</label>', '<label for="nc_last">Apellido <span class="opt">opcional</span></label>')
      .replace('<label for="nc_dni">DNI</label>', '<label for="nc_dni">DNI <span class="opt">opcional</span></label>')
      .replace('<label for="nc_phone">Teléfono (WhatsApp)</label>', '<label for="nc_phone">Teléfono (WhatsApp) <span class="opt">para el recordatorio</span></label>')
      .replace('<button class="btn small primary" data-act="naCreate">Crear y elegir</button>', '<div class="hint">Si es la primera vez, con el nombre y el teléfono alcanza. La ficha completa la llenás cuando venga.</div><button class="btn small primary" data-act="naCreate">Usar este paciente</button>');
    if (f.pid) { const p = A.PAT(f.pid), miss = A.patMissing(p); if (miss.length) html = html.replace(/<div class="hint">DNI [^<]*<\/div>/, '<div class="hint">' + (p.phone ? esc(p.phone) + ' · ' : '') + 'falta ' + miss.join(' y ') + ' (se completa cuando venga)</div>'); }

    /* turno o sobreturno: un interruptor bien visible arriba */
    const seg = '<div class="na-kind" role="group" aria-label="Tipo de turno"><button type="button" data-act="naKind" data-k="0" aria-pressed="' + !f.sobre + '"><b>Turno</b><small>en un horario libre</small></button><button type="button" data-act="naKind" data-k="1" aria-pressed="' + !!f.sobre + '"><b>Sobreturno</b><small>encima de otro turno</small></button></div>';
    html = html.replace('<div class="field"><label for="naQ">Paciente</label>', seg + '<div class="field"><label for="naQ">Paciente</label>');
    html = html.replace(/<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="naSobre"([^>]*)>[^<]*<\/label>/, '<input type="checkbox" id="naSobre"$1 hidden>');

    /* la hora: hora y minutos por separado, con atajos de ±15 y los horarios cercanos */
    const tm = /<input type="time" id="naTime"[^>]*>/;
    if (tm.test(html)) {
      const st = f.start, hh = Math.floor(st / 60), mi = st % 60;
      let hs = ''; for (let x = 6; x <= 22; x++) hs += '<option value="' + x + '"' + (x === hh ? ' selected' : '') + '>' + String(x).padStart(2, '0') + ' h</option>';
      let ms = ''; for (let x = 0; x < 60; x += 5) ms += '<option value="' + x + '"' + (x === mi - mi % 5 ? ' selected' : '') + '>' + String(x).padStart(2, '0') + '</option>';
      html = html.replace(tm, '<input type="hidden" id="naTime" value="' + A.mm(st) + '"><div class="na-time"><select id="naH" aria-label="Hora">' + hs + '</select><span>:</span><select id="naMi" aria-label="Minutos">' + ms + '</select><button type="button" class="btn small" data-act="naStep" data-d="-15" aria-label="15 minutos antes">−15</button><button type="button" class="btn small" data-act="naStep" data-d="15" aria-label="15 minutos después">+15</button></div>');
    }
    html = html.replace('<div id="naMsg"', '<div id="naOcc" class="na-occ"></div><div id="naMsg"');
    return html;
  };

  const readTime = () => { const h = $('#naH'), m = $('#naMi'); return h && m ? (+h.value) * 60 + (+m.value) : A.toMin(($('#naTime') || {}).value || '09:00'); };
  function setTime(t) {
    t = Math.max(360, Math.min(22 * 60 + 55, t));
    const h = $('#naH'), m = $('#naMi'), hid = $('#naTime');
    if (h) h.value = String(Math.floor(t / 60)); if (m) m.value = String(t % 60 - (t % 60) % 5);
    if (hid) { hid.value = A.mm(t); hid.dispatchEvent(new Event('change', { bubbles: true })); }
    if (S.modal && S.modal.f) S.modal.f.start = t;
    occ();
  }
  A.acts.naStep = el => setTime(readTime() + parseInt(el.getAttribute('data-d'), 10));
  A.acts.naKind = el => {
    const on = el.getAttribute('data-k') === '1', cb = $('#naSobre'); if (cb) cb.checked = on; if (S.modal && S.modal.f) S.modal.f.sobre = on;
    document.querySelectorAll('.na-kind button').forEach(b => b.setAttribute('aria-pressed', String((b.getAttribute('data-k') === '1') === on)));
    const ttl = document.querySelector('#modalHost .modal h2, #modalHost h2'); if (ttl && /^Nuevo (sobre)?turno$/.test(ttl.textContent)) ttl.textContent = on ? 'Nuevo sobreturno' : 'Nuevo turno';
    const msg = $('#naMsg'); if (msg) { msg.textContent = ''; msg.className = 'hint'; }
    occ();
  };
  A.acts.naAsSobre = () => { A.acts.naKind({ getAttribute: () => '1' }); A.acts.naSave(); };

  /* aviso en vivo: qué hay a esa hora */
  function occ() {
    const host = $('#naOcc'); if (!host || !S.modal || S.modal.type !== 'newAppt') return;
    const pro = ($('#naPro') || {}).value || S.modal.f.pro, date = ($('#naDate') || {}).value || S.modal.f.date, start = readTime(), dur = parseInt(($('#naDur') || {}).value, 10) || S.modal.f.dur || 30, sobre = !!($('#naSobre') || {}).checked;
    const cf = A.day(date).filter(b => b.pro === pro && b.status !== 'cancelado' && !b.sobre && b.start < start + dur && start < b.start + b.dur);
    const who = cf.map(c => '<b>' + esc(c.type === 'block' ? c.label : (A.PAT(c.pid) || {}).name || '') + '</b> (' + A.mm(c.start) + '–' + A.mm(c.start + c.dur) + ')').join(', ');
    const blocked = cf.some(c => c.type === 'block');
    if (!cf.length) { host.className = 'na-occ ok'; host.innerHTML = sobre ? 'A esa hora no hay otro turno: lo podés dar como turno común.' : 'Horario libre.'; return; }
    if (sobre) { host.className = 'na-occ sb'; host.innerHTML = 'Queda como sobreturno junto a ' + who + '.' + (blocked ? ' Ojo: ese horario está bloqueado.' : ''); return; }
    host.className = 'na-occ bad'; host.innerHTML = 'A esa hora ya está ' + who + '.<div class="row-btns"><button class="btn small primary" data-act="naAsSobre">Darlo como sobreturno</button><button class="btn small" data-act="naNextFree">Buscar el próximo libre</button></div>';
  }
  A.acts.naNextFree = () => {
    const pro = ($('#naPro') || {}).value, date = ($('#naDate') || {}).value, dur = parseInt(($('#naDur') || {}).value, 10) || 30, from = readTime();
    const items = A.day(date).filter(b => b.pro === pro && b.status !== 'cancelado' && !b.sobre);
    const hrs = A.hoursFor(A.PRO(pro), date);
    for (const r of hrs) for (let t = Math.max(r[0], Math.ceil(from / 5) * 5); t + dur <= r[1]; t += 5) if (!items.some(b => b.start < t + dur && t < b.start + b.dur)) { setTime(t); return; }
    A.toast('No queda otro horario libre ese día.');
  };
  document.addEventListener('change', e => {
    const id = e.target && e.target.id; if (!id || !S.modal || S.modal.type !== 'newAppt') return;
    if (id === 'naH' || id === 'naMi') { setTime(readTime()); return; }
    if (['naPro', 'naDate', 'naDur'].indexOf(id) >= 0) occ();
  });
  const prevRender = A.renderModal;
  A.renderModal = () => { prevRender(); if (S.modal && S.modal.type === 'newAppt') occ(); };

  /* agendar: si falta crear al paciente, se crea con lo que haya; si choca, se ofrece el sobreturno */
  const prevSave = A.acts.naSave;
  A.acts.naSave = (el, ev) => {
    const m = S.modal; if (!m || m.type !== 'newAppt') return prevSave(el, ev);
    const f = m.f, msg = $('#naMsg');
    if (!f.pid && f.creating && !quickCreate(f)) { if (msg) { msg.className = 'hint bad'; msg.textContent = 'Escribí al menos el nombre del paciente.'; } return; }
    if (!f.pid && !f.creating) {
      const q = (($('#naQ') || {}).value || f.q || '').trim();
      if (q.length >= 2 && !A.searchPats(q, 1).length) { f.creating = true; const w = q.split(/\s+/); f.n_first = w[0]; f.n_last = w.slice(1).join(' '); quickCreate(f); }
    }
    const hid = $('#naTime'); if (hid && $('#naH')) hid.value = A.mm(readTime());
    const sobre = !!($('#naSobre') || {}).checked;
    if (!sobre && f.pid) {
      const pro = ($('#naPro') || {}).value || f.pro, date = ($('#naDate') || {}).value || f.date, start = readTime(), dur = parseInt(($('#naDur') || {}).value, 10) || f.dur;
      const cf = A.conflicts({ pro, date, start, dur });
      if (cf.length) { occ(); const o = $('#naOcc'); if (o) o.scrollIntoView({ block: 'nearest' }); return; }
    }
    return prevSave(el, ev);
  };

  /* ---------------------------------------------------------------
     SOBRETURNO DESDE LA AGENDA: en el turno abierto, «+ Sobreturno a las 10:30»;
     y al tocar la agenda, el formulario ya permite elegir turno o sobreturno.
     --------------------------------------------------------------- */
  const prevPanel = A.renderPanel;
  A.renderPanel = () => {
    prevPanel();
    if (!S.panel || S.panel.type !== 'appt') return;
    const a = A.apptById(S.panel.id), host = $('#panelHost .panel'); if (!a || !host || host.querySelector('.sob-add')) return;
    const head = host.querySelector('.panel-head');
    let h = '';
    if (a.type !== 'block' && a.status !== 'cancelado') h += '<div class="sob-add"><button class="btn small" data-act="sobHere" data-id="' + a.id + '">+ Sobreturno a las ' + A.mm(a.start) + '</button><span class="hint">otro paciente a la misma hora</span></div>';
    const p = a.pid && A.PAT(a.pid), miss = A.patMissing(p);
    if (p && miss.length) h += '<div class="quick-note">Paciente cargado al paso: falta ' + miss.join(' y ') + '. <button class="link" data-act="quickFill" data-pid="' + p.id + '">Completar ficha</button></div>';
    if (h && head) head.insertAdjacentHTML('afterend', h);
  };
  A.acts.sobHere = el => { const a = A.apptById(el.getAttribute('data-id')); if (!a) return; S.panel = null; A.renderPanel(); A.openNewAppt({ date: a.date, pro: a.pro, start: a.start, dur: a.dur, sobre: true }); };
  A.acts.quickFill = el => { S.panel = null; A.renderPanel(); A.openFicha(el.getAttribute('data-pid'), 'datos'); setTimeout(() => { const i = $('#pf_last') && !$('#pf_last').value ? $('#pf_last') : $('#pf_dni'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 80); };

  /* en la ficha: aviso de datos que faltan */
  const prevFicha = A.render.ficha;
  A.render.ficha = () => {
    prevFicha();
    const p = A.PAT(S.fichaPid), miss = A.patMissing(p), fh = document.querySelector('#view-ficha .fh');
    if (!fh || !miss.length || document.querySelector('#view-ficha .quick-note')) return;
    fh.insertAdjacentHTML('afterend', '<div class="quick-note">Paciente cargado al paso: falta ' + miss.join(' y ') + '.' + (S.fichaTab !== 'datos' ? ' <button class="link" data-act="quickFill" data-pid="' + p.id + '">Completar ficha</button>' : ' Completalo acá abajo en «Datos personales».') + '</div>');
    const sub = document.querySelector('#view-ficha .fh .sub'); if (sub && !String(p.dni || '').trim()) sub.innerHTML = sub.innerHTML.replace(/DNI\s*(·\s*)?/, '');
  };

  /* Pacientes › Nuevo paciente: apellido opcional */
  const prevPat = MF.patient;
  if (prevPat) MF.patient = m => prevPat(m).replace('Apellido *', 'Apellido');

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.na-kind{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.na-kind button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:10px 12px;cursor:pointer;text-align:left;font:inherit}.na-kind b{font-size:16px}.na-kind small{color:var(--ink-2);font-size:12.5px}' +
    '.na-kind button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}.na-kind button[data-k="1"][aria-pressed="true"]{border-color:var(--warn);background:var(--warn-soft)}' +
    '.na-time{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.na-time select{width:auto!important;flex:1 1 72px;min-width:72px!important;max-width:120px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:600 17px var(--f-mono,inherit);padding:0 8px}.na-time span{font-weight:700}.na-time .btn{flex:0 0 auto;padding:0 8px;min-height:44px}' +
    '.na-occ{border-radius:10px;padding:8px 10px;font-size:14px;margin:6px 0}.na-occ:empty{display:none}.na-occ.ok{background:var(--ok-soft,#e5f4ea);color:var(--ink)}.na-occ.bad{background:var(--red-soft,#fbe4e2)}.na-occ.sb{background:var(--warn-soft)}.na-occ .row-btns{margin-top:6px}' +
    'label .opt,label .req{font-weight:400;color:var(--ink-2);font-size:12px;margin-left:4px}' +
    '.sob-add{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 16px 0}.quick-note{margin:8px 16px 0;padding:8px 12px;border-radius:10px;background:var(--warn-soft);font-size:14px}#view-ficha .quick-note{margin:0 0 10px}.quick-note .link{background:none;border:0;color:var(--accent);font-weight:700;cursor:pointer;padding:0;text-decoration:underline}' +
    /* sobreturno flotante: semitransparente y punteado, sobre la mitad derecha del turno */
    '.blk.over{border:2px dashed var(--warn);border-left:5px solid var(--warn)}.blk.over.float{z-index:4;background-color:color-mix(in srgb,var(--surface) 70%,transparent);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);box-shadow:0 4px 14px rgba(0,0,0,.16)}.blk.over.float:hover{background-color:var(--surface)}' +
    '.blk.under{padding-right:calc(50% + 4px)}.blk.under .t .wab{display:none}' +
    '</style>');
})();
