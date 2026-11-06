/* ===== 1.9: turnero online con link para el paciente, recordatorios en el inicio y deshacer cualquier cambio del día ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const N = s => A.norm(String(s || ''));
  const J = v => JSON.stringify(v === undefined ? null : v);
  const hhmm = (d) => { d = d || new Date(); return A.pad(d.getHours()) + ':' + A.pad(d.getMinutes()); };
  const PUBLIC = 'https://roan-corp.github.io/odontovoz/';
  const real = () => !!(CL && CL.session && CL.conf && CL.conf() && !A.DEMO);

  /* =====================================================================
     1) DESHACER LOS CAMBIOS DEL DÍA
     Cada vez que se guarda, se compara cada paciente y cada día de agenda con su versión anterior.
     Si cambió, se anota en el historial de hoy con «cómo estaba antes». Deshacer vuelve a esa versión.
     Solo vale para hoy y en este equipo; lo de días anteriores en la historia clínica se anula.
     ===================================================================== */
  const last = {};            /* clave → JSON de la última versión vista */
  let inited = false;
  const JR = { day: A.today(), list: [] };
  const IDB = { db: null };
  const idbOpen = () => new Promise(res => { try { const r = indexedDB.open('odontovoz.journal', 1); r.onupgradeneeded = () => r.result.createObjectStore('j'); r.onsuccess = () => { IDB.db = r.result; res(IDB.db); }; r.onerror = () => res(null); } catch (e) { res(null); } });
  const idbKey = () => (A.DEMO ? 'demo:' : 'real:') + JR.day;
  let jt = null;
  const jPersist = () => { clearTimeout(jt); jt = setTimeout(async () => { const db = IDB.db || await idbOpen(); if (!db) return; try { const tx = db.transaction('j', 'readwrite'); tx.objectStore('j').put(JR.list.slice(-250), idbKey()); /* lo de otros días se borra */ const st = tx.objectStore('j'); const rq = st.getAllKeys(); rq.onsuccess = () => (rq.result || []).forEach(k => { if (String(k).slice(-10) !== JR.day) st.delete(k); }); } catch (e) { /* nada */ } }, 400); };
  const jLoad = async () => { const db = await idbOpen(); if (!db) return; try { const rq = db.transaction('j').objectStore('j').get(idbKey()); rq.onsuccess = () => { if (Array.isArray(rq.result) && rq.result.length && !JR.list.length) JR.list = rq.result; }; } catch (e) { /* nada */ } };
  jLoad();

  const keyVal = k => (k.indexOf('day:') === 0 ? A.S.days[k.slice(4)] : k.indexOf('pd:') === 0 ? A.S.pd[k.slice(3)] : k === 'cfg' ? A.CFG : k === 'cash' ? A.S.cash : undefined);
  const seeAll = () => {
    Object.keys(A.S.days || {}).forEach(d => { last['day:' + d] = J(A.S.days[d]); });
    Object.keys(A.S.pd || {}).forEach(p => { last['pd:' + p] = J(A.S.pd[p]); });
    last.cfg = J(A.CFG); last.cash = J(A.S.cash);
  };
  A.journalSeen = k => { const v = keyVal(k); if (v !== undefined) last[k] = J(v); };
  /* antes de cambiar un día o un paciente que todavía no se había mirado, se guarda cómo estaba */
  const mutPrev = A.mutate;
  A.mutate = (keys, fn, msg) => { (keys || []).forEach(k => { if (!(('day:' + k) in last)) last['day:' + k] = J(A.day(k)); }); return mutPrev(keys, fn, msg); };
  const pdPrev = A.pd;
  A.pd = pid => { const v = pdPrev(pid); if (inited && pid && !(('pd:' + pid) in last)) last['pd:' + pid] = J(v); return v; };

  /* qué cambió, en palabras */
  const SEC = { notes: 'Evolución', tx: 'Tratamientos', odon: 'Odontograma', perio: 'Periodontograma', ledger: 'Cuenta y cobros', budgets: 'Presupuestos', labs: 'Laboratorio', images: 'Fotos', hc: 'Anamnesis', docs: 'Documentos firmados', rx: 'Recetas', tplan: 'Plan de tratamiento', prof: 'Datos personales', controls: 'Controles' };
  function labelOf(k, b, a) {
    try {
      if (k.indexOf('day:') === 0) {
        const d = k.slice(4), B = JSON.parse(b || '[]') || [], Aa = JSON.parse(a || '[]') || [], bm = {}, am = {}, out = [];
        B.forEach(x => { bm[x.id] = x; }); Aa.forEach(x => { am[x.id] = x; });
        const who = x => (x.pid && A.PAT(x.pid) ? A.PAT(x.pid).name : x.label || 'bloqueo') + ' ' + A.mm(x.start);
        Aa.forEach(x => { const o = bm[x.id]; if (!o) out.push('Turno nuevo: ' + who(x)); else if (o.status !== x.status) out.push(who(x) + ' → ' + (A.STATUS_LABEL[x.status] || x.status)); else if (o.start !== x.start || o.pro !== x.pro || o.dur !== x.dur) out.push('Turno movido: ' + who(o) + ' → ' + A.mm(x.start)); else if (J(o) !== J(x)) out.push('Cambio en el turno de ' + who(x)); });
        B.forEach(x => { if (!am[x.id]) out.push('Turno borrado: ' + who(x)); });
        return 'Agenda ' + A.fmtDMY(d) + ' · ' + (out.slice(0, 3).join(' · ') || 'cambios') + (out.length > 3 ? ' (+' + (out.length - 3) + ')' : '');
      }
      if (k.indexOf('pd:') === 0) {
        const pid = k.slice(3), p = A.PAT(pid), B = JSON.parse(b || '{}') || {}, Aa = JSON.parse(a || '{}') || {};
        if (Aa.deleted && !B.deleted) return 'Paciente eliminado: ' + (p ? p.name : pid);
        const ch = Object.keys(Object.assign({}, B, Aa)).filter(x => SEC[x] && J(B[x]) !== J(Aa[x]));
        let extra = '';
        const nb = (B.notes || []).map(n => n.id), nn = (Aa.notes || []).filter(n => nb.indexOf(n.id) < 0 && !n.auto)[0];
        if (nn) extra = ': «' + nn.text.slice(0, 50) + (nn.text.length > 50 ? '…' : '') + '»';
        return (p ? p.name : 'Paciente') + ' · ' + (ch.map(x => SEC[x]).join(', ') || 'cambios') + extra;
      }
      if (k === 'cfg') { const B = JSON.parse(b || '{}') || {}, Aa = JSON.parse(a || '{}') || {}; if (J(B.rem) !== J(Aa.rem)) return 'Recordatorios'; if (J(B.logo) !== J(Aa.logo)) return 'Logo del consultorio'; if (J(B.online) !== J(Aa.online)) return 'Turnero online'; return 'Ajustes del consultorio'; }
      if (k === 'cash') return 'Caja';
    } catch (e) { /* nada */ }
    return 'Cambio';
  }
  const pendingLabel = {};
  function scan() {
    if (!inited) return;
    const keys = Object.keys(A.S.dirtyDays || {}).map(d => 'day:' + d).concat(Object.keys(A.S.dirtyPd || {}).map(p => 'pd:' + p), ['cfg', 'cash']);
    const now = Date.now(); if (A.today() !== JR.day) { JR.day = A.today(); JR.list = []; }
    keys.forEach(k => {
      const v = keyVal(k); if (v === undefined) return; const cur = J(v), was = last[k];
      if (was === undefined) { last[k] = cur; return; }
      if (was === cur) return;
      last[k] = cur;
      const prevE = JR.list[JR.list.length - 1];
      if (prevE && prevE.key === k && !prevE.undone && now - prevE.t < 20000 && !pendingLabel[k]) { prevE.after = cur; prevE.t = now; prevE.at = hhmm(); prevE.label = labelOf(k, prevE.before, cur); }
      else { JR.list.push({ id: A.uid(), t: now, at: hhmm(), key: k, before: was, after: cur, label: pendingLabel[k] || labelOf(k, was, cur) }); if (A.onJournal) { try { A.onJournal(JR.list[JR.list.length - 1]); } catch (e) { /* nada */ } } }
      delete pendingLabel[k];
    });
    if (JR.list.length > 250) JR.list = JR.list.slice(-250);
    jPersist(); paintJrBtn();
  }
  const saveNowPrev = A.saveNow;
  A.saveNow = () => { try { scan(); } catch (e) { if (A.logError) A.logError('journal', e); } return saveNowPrev(); };
  function restore(k, json) {
    const v = JSON.parse(json);
    if (k.indexOf('day:') === 0) { A.S.days[k.slice(4)] = v || []; A.S.dirtyDays[k.slice(4)] = 1; }
    else if (k.indexOf('pd:') === 0) { const pid = k.slice(3); A.S.pd[pid] = v; A.S.dirtyPd[pid] = 1; if (v && v.prof && A.PAT(pid)) A.setProfileQuiet(pid, v.prof); }
    else if (k === 'cfg') { Object.keys(A.CFG).forEach(x => { if (!(x in (v || {}))) delete A.CFG[x]; }); Object.assign(A.CFG, v || {}); }
    else if (k === 'cash') A.S.cash = v;
  }
  const todayList = () => JR.list.filter(e => !e.undone).slice().reverse();
  A.acts.jrOpen = () => { if (A.hideDrawer) A.hideDrawer(); A.saveNow(); S.modal = { type: 'jr' }; A.renderModal(); };
  MF.jr = () => {
    const l = todayList();
    const body = '<p class="hint" style="margin-top:0">Todo lo que se cambió hoy en este equipo. Tocá «Deshacer» y vuelve a como estaba. Mañana esta lista empieza de cero: lo que quede en la historia clínica se corrige anulando, no borrando.</p>' +
      (l.length ? '<ul class="jr-list">' + l.map(e => '<li><span class="jr-t mono">' + esc(e.at) + '</span><button class="jr-l jr-go" data-act="jrGo" data-id="' + e.id + '" title="Ir a este cambio">' + esc(e.label) + ' <span aria-hidden="true">›</span></button><button class="btn small" data-act="jrUndoAsk" data-id="' + e.id + '">Deshacer</button></li>').join('') + '</ul>' : '<div class="empty">Hoy todavía no hay cambios en este equipo.</div>');
    return A.modalShell('Cambios de hoy', body, '<button class="btn primary" data-act="closeModal">Listo</button>', true);
  };
  A.acts.jrUndoAsk = el => {
    const e = JR.list.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!e) return;
    const after = JR.list.filter(x => x.key === e.key && !x.undone && x.t > e.t);
    if (!after.length) return jrUndo(e);
    S.modal = { type: 'jrAsk', id: e.id, n: after.length };
    A.renderModal();
  };
  MF.jrAsk = m => { const e = JR.list.filter(x => x.id === m.id)[0]; return A.modalShell('Deshacer', '<p>Se deshace <b>' + esc(e ? e.label : '') + '</b>.</p><p class="hint">Después de eso hubo <b>' + m.n + ' cambio' + (m.n > 1 ? 's' : '') + ' más</b> en ' + (e && e.key.indexOf('pd:') === 0 ? 'este mismo paciente' : e && e.key.indexOf('day:') === 0 ? 'la agenda de ese día' : 'el mismo lugar') + ': también se deshace' + (m.n > 1 ? 'n' : '') + '.</p>', '<button class="btn" data-act="jrOpen">Volver</button><button class="btn danger" data-act="jrUndoGo" data-id="' + m.id + '">Deshacer</button>'); };
  A.acts.jrUndoGo = el => { const e = JR.list.filter(x => x.id === el.getAttribute('data-id'))[0]; if (e) jrUndo(e); };
  function jrUndo(e) {
    A.saveNow();
    JR.list.forEach(x => { if (x.key === e.key && !x.undone && x.t >= e.t) x.undone = true; });
    pendingLabel[e.key] = 'Deshiciste: ' + e.label;
    restore(e.key, e.before);
    if (e.key.indexOf('pd:') === 0) A.touchPd(e.key.slice(3)); else A.save();
    A.saveNow();
    S.modal = { type: 'jr' }; A.renderModal(); A.refresh(); A.toast('Listo, volvió a como estaba.');
  }
  /* tocar un cambio lleva al lugar donde se hizo */
  const TAB_OF = { notes: 'datos', hc: 'datos', prof: 'datos', controls: 'datos', tx: 'plan', tplan: 'plan', budgets: 'plan', odon: 'odon', perio: 'perio', ledger: 'cuenta', labs: 'lab', images: 'img', docs: 'docs', rx: 'rx' };
  A.acts.jrGo = el => {
    const e = JR.list.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!e) return;
    A.closeModal();
    try {
      if (e.key.indexOf('day:') === 0) {
        const d = e.key.slice(4), B = JSON.parse(e.before || '[]') || [], Aa = JSON.parse(e.after || '[]') || [], bm = {}; B.forEach(x => { bm[x.id] = J(x); });
        const ch = Aa.filter(x => bm[x.id] !== J(x))[0] || B.filter(x => !Aa.some(y => y.id === x.id))[0];
        S.tab = 'agenda'; S.view = 'dia'; S.date = d; S.panel = null; A.refresh();
        if (ch) setTimeout(() => { const b = document.querySelector('[data-appt="' + ch.id + '"]'); if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.classList.add('jr-flash'); setTimeout(() => b.classList.remove('jr-flash'), 2200); } if (Aa.some(y => y.id === ch.id) && A.acts.openAppt) A.acts.openAppt({ getAttribute: k => (k === 'data-id' ? ch.id : null) }); }, 120);
      } else if (e.key.indexOf('pd:') === 0) {
        const pid = e.key.slice(3), B = JSON.parse(e.before || '{}') || {}, Aa = JSON.parse(e.after || '{}') || {};
        if (!A.PAT(pid) || (Aa && Aa.deleted)) { A.toast('Ese paciente ya no está.'); return; }
        const sec = Object.keys(Object.assign({}, B, Aa)).filter(x => TAB_OF[x] && J(B[x]) !== J(Aa[x]))[0];
        A.openFicha(pid, TAB_OF[sec] || 'datos');
      } else if (e.key === 'cfg') { S.tab = 'inicio'; A.refresh(); }
      else if (e.key === 'cash') { S.tab = 'caja'; A.refresh(); }
    } catch (er) { if (A.logError) A.logError('jrGo', er); }
  };
  function paintJrBtn() { const b = $('#jrBtn'); if (b) { const n = todayList().length; b.querySelector('span').textContent = n ? n : ''; } const h = $('#jrHome'); if (h) { const n = todayList().length; h.hidden = !n; h.querySelector('b').textContent = n; } }
  /* botón en el menú */
  (function () {
    const nav = document.querySelector('#gearMenu .dr-nav'); if (!nav || $('#jrBtn')) return;
    nav.insertAdjacentHTML('beforeend', '<button class="dnav" id="jrBtn" data-act="jrOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>Cambios de hoy · deshacer<span class="jr-n"></span></button>');
  })();

  /* =====================================================================
     2) RECORDATORIOS EN EL INICIO (opcionales, chicos y editables)
     ===================================================================== */
  const COLORS = { sol: ['Amarillo', '#f6c453'], cel: ['Celeste', '#7cc4e8'], ver: ['Verde', '#7bc99a'], ros: ['Rosa', '#f2a2b6'] };
  const R = () => (A.CFG.rem = A.CFG.rem || { on: false, list: [] });
  const forMe = r => !r.for || r.for === 'todos' || (r.for === 'pro' ? S.role === 'profesional' : S.role !== 'profesional');
  function remVisible() { const t = A.today(); return (R().list || []).filter(r => !r.done && forMe(r) && (!r.date || r.date <= t)).sort((a, b) => ((a.date || '') + (a.time || '99:99') < (b.date || '') + (b.time || '99:99') ? -1 : 1)); }
  function remHTML() {
    const r = R();
    if (!r.on) return r.never ? '' : '<div class="rem-off" id="remBox"><button class="lnk" data-act="remOn">+ Recordatorio en el inicio</button></div>';
    const l = remVisible(), later = (r.list || []).filter(x => !x.done && forMe(x) && x.date && x.date > A.today()).length, t = A.today(), nowM = A.nowMin ? A.nowMin() : 0;
    let h = '<section class="rem" id="remBox" aria-label="Recordatorios"><div class="rem-h"><b>Recordatorios</b><span><button class="lnk" data-act="remNew">+ Agregar</button><button class="lnk" data-act="remMenu" aria-label="Opciones de recordatorios">⋯</button></span></div>';
    h += l.length ? '<ul>' + l.map(x => {
      const late = x.date && x.date < t, due = x.time && (!x.date || x.date === t) && (+x.time.slice(0, 2) * 60 + +x.time.slice(3)) <= nowM;
      return '<li style="--rc:' + (COLORS[x.color] || COLORS.sol)[1] + '"' + (late || due ? ' class="due"' : '') + '><input type="checkbox" data-chg="remDone" data-id="' + x.id + '" aria-label="Hecho"><button class="rem-t" data-act="remEdit" data-id="' + x.id + '">' + esc(x.text) + '</button>' +
        (x.time || late ? '<span class="rem-w">' + (late ? 'desde ' + A.fmtDMY(x.date).slice(0, 5) : '') + (x.time ? (late ? ' · ' : '') + x.time + ' h' : '') + '</span>' : '') + '</li>';
    }).join('') + '</ul>' : '<div class="rem-e">Nada para hoy.' + (later ? ' ' + later + ' más adelante.' : '') + '</div>';
    return h + (l.length && later ? '<div class="rem-e">' + later + ' más adelante</div>' : '') + '</section>';
  }
  function mountRem() {
    const host = $('#view-inicio'); if (!host || host.hidden || $('#remBox')) return;
    const hi = host.querySelector('.loc-today') || host.querySelector('.home-hi'), html = remHTML() + '<button class="jr-home lnk" id="jrHome" data-act="jrOpen" hidden>↶ Cambios de hoy (<b>0</b>) · deshacer</button>';
    if (hi) hi.insertAdjacentHTML('afterend', html); else host.insertAdjacentHTML('afterbegin', html);
    paintJrBtn();
  }
  const afterPrev = A.afterRefresh;
  A.afterRefresh = () => { if (afterPrev) afterPrev(); if (!inited) { inited = true; seeAll(); } try { if (S.tab === 'inicio') mountRem(); } catch (e) { if (A.logError) A.logError('rem', e); } paintJrBtn(); };
  const remRe = () => { const b = $('#remBox'); if (b) { b.outerHTML = remHTML(); } else A.refresh(); const j = $('#jrHome'); if (!j) A.refresh(); };
  A.acts.remOn = () => { R().on = true; A.save(); S.modal = { type: 'remEd', f: { text: '', date: A.today(), time: '', color: 'sol', for: 'todos' } }; A.renderModal(); remRe(); };
  A.acts.remNew = () => { S.modal = { type: 'remEd', f: { text: '', date: A.today(), time: '', color: 'sol', for: 'todos' } }; A.renderModal(); };
  A.acts.remEdit = el => { const x = (R().list || []).filter(r => r.id === el.getAttribute('data-id'))[0]; if (!x) return; S.modal = { type: 'remEd', f: Object.assign({}, x) }; A.renderModal(); };
  MF.remEd = m => {
    const f = m.f;
    return A.modalShell(f.id ? 'Recordatorio' : 'Nuevo recordatorio', '<div class="field"><label for="reT">¿Qué tenés que recordar?</label><input id="reT" maxlength="140" value="' + esc(f.text) + '" placeholder="Ej.: enviar el modelo al laboratorio antes de las 17 h"></div>' +
      '<div class="row2"><div class="field"><label for="reD">Día <span class="muted">(vacío = siempre)</span></label><input id="reD" type="date" value="' + esc(f.date || '') + '"></div><div class="field"><label for="reH">Hora <span class="muted">(opcional)</span></label><input id="reH" type="time" value="' + esc(f.time || '') + '"></div></div>' +
      '<div class="field"><label>Color</label><div class="rem-cols">' + Object.keys(COLORS).map(k => '<label><input type="radio" name="reC" value="' + k + '"' + ((f.color || 'sol') === k ? ' checked' : '') + '><i style="background:' + COLORS[k][1] + '"></i>' + COLORS[k][0] + '</label>').join('') + '</div></div>' +
      (A.isSolo() ? '' : '<div class="field"><label for="reF">Lo ve</label><select id="reF"><option value="todos">Todos</option><option value="pro"' + (f.for === 'pro' ? ' selected' : '') + '>Solo el profesional</option><option value="rec"' + (f.for === 'rec' ? ' selected' : '') + '>Solo recepción</option></select></div>') +
      '<div class="hint" id="reMsg"></div>',
    (f.id ? '<button class="btn danger" data-act="remDel" data-id="' + f.id + '">Borrar</button>' : '<button class="btn" data-act="closeModal">Cancelar</button>') + '<button class="btn primary" data-act="remSave">Guardar</button>');
  };
  A.modalAfter = A.modalAfter || {};
  A.modalAfter.remEd = () => { const i = $('#reT'); if (i) i.focus(); };
  A.acts.remSave = () => {
    const f = S.modal.f, t = $('#reT').value.trim(); if (!t) { $('#reMsg').textContent = 'Escribí el recordatorio.'; return; }
    const c = document.querySelector('input[name=reC]:checked');
    Object.assign(f, { text: t, date: $('#reD').value || '', time: $('#reH').value || '', color: c ? c.value : 'sol', for: $('#reF') ? $('#reF').value : 'todos' });
    const r = R(); r.on = true; r.list = r.list || [];
    if (f.id) r.list = r.list.map(x => (x.id === f.id ? Object.assign({}, x, f) : x)); else { f.id = A.uid(); f.done = false; r.list.push(f); }
    A.save(); A.closeModal(); remRe();
  };
  A.acts.remDel = el => { const r = R(); r.list = (r.list || []).filter(x => x.id !== el.getAttribute('data-id')); A.save(); A.closeModal(); remRe(); };
  A.chg.remDone = el => {
    const r = R(), x = (r.list || []).filter(y => y.id === el.getAttribute('data-id'))[0]; if (!x) return;
    x.done = true; x.doneAt = A.today(); A.save(); remRe();
    A.toast('Hecho: ' + x.text, () => { x.done = false; delete x.doneAt; A.save(); remRe(); });
  };
  A.acts.remMenu = () => { S.modal = { type: 'remMenu' }; A.renderModal(); };
  MF.remMenu = () => {
    const done = (R().list || []).filter(x => x.done);
    return A.modalShell('Recordatorios', (done.length ? '<h3 style="margin-top:0">Hechos</h3><ul class="jr-list">' + done.slice(-15).reverse().map(x => '<li><span class="jr-l">' + esc(x.text) + '</span><button class="btn small" data-act="remBack" data-id="' + x.id + '">Volver a mostrar</button></li>').join('') + '</ul>' : '<p class="hint" style="margin-top:0">Los que tildes como hechos aparecen acá.</p>') +
      '<div class="setup-grid" style="margin-top:12px"><button class="setup-card" data-act="remOff"><b>Ocultar del inicio</b><span>Se guardan igual; lo volvés a activar desde «+ Recordatorio en el inicio».</span></button>' +
      '<button class="setup-card" data-act="remNever"><b>No usar recordatorios</b><span>Saca también el botón chiquito del inicio.</span></button></div>',
    '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.remBack = el => { const x = (R().list || []).filter(y => y.id === el.getAttribute('data-id'))[0]; if (x) { x.done = false; A.save(); } S.modal = { type: 'remMenu' }; A.renderModal(); remRe(); };
  A.acts.remOff = () => { R().on = false; A.save(); A.closeModal(); remRe(); };
  A.acts.remNever = () => { R().on = false; R().never = true; A.save(); A.closeModal(); remRe(); };
  /* por voz: «recordatorio enviar el modelo al laboratorio antes de las 17» */
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    const m = /^(?:recordatorio|recordame|recorda(?:r)?(?:me)?|anota(?:me)? (?:un )?recordatorio|agrega(?:r)? (?:un )?recordatorio)[:,]?\s+(?:que\s+)?(.{3,140})$/i.exec(String(text || '').trim().replace(/[.!¡¿?]+$/, ''));
    if (m && !(A.cloud && A.cloud.readonly)) {
      const r = R(), x = { id: A.uid(), text: m[1].charAt(0).toUpperCase() + m[1].slice(1), date: A.today(), time: '', color: 'sol', for: 'todos', done: false };
      const tm = /\b(?:a las|antes de las|para las|hasta las)\s+(\d{1,2})(?:[:.](\d{2}))?\b/.exec(N(m[1])); if (tm && +tm[1] < 24) x.time = A.pad(+tm[1]) + ':' + (tm[2] || '00');
      if (/\bmanana\b/.test(N(m[1]))) x.date = A.add(A.today(), 1);
      r.on = true; r.list = r.list || []; r.list.push(x); A.save(); if (S.tab === 'inicio') remRe();
      return { ok: true, msg: 'Recordatorio agregado: ' + x.text + '.' };
    }
    return execPrev(text, o);
  };

  /* =====================================================================
     3) TURNERO ONLINE DE VERDAD: link para el paciente
     La app publica los horarios libres (sin datos de pacientes) y trae los pedidos nuevos.
     ===================================================================== */
  const O = () => A.CFG.online || (A.CFG.online = {});
  const slug = () => { const o = O(); if (!o.slug) { const al = 'abcdefghjkmnpqrstuvwxyz23456789'; o.slug = Array.from({ length: 8 }, () => al[Math.floor(Math.random() * al.length)]).join(''); A.save(); } return o.slug; };
  const link = pro => PUBLIC + 'turnos.html?c=' + slug() + (pro ? '&p=' + encodeURIComponent(pro) : '');
  const TS = { state: 'idle', msg: '', at: null, count: 0, lastJ: null, busy: false };
  const proList = () => A.PROS.filter(p => O().pros && O().pros[p.id] === false ? false : p.sched && Object.keys(p.sched).length);
  const DEF_TYPES = ['primera', 'control', 'limpieza', 'composite', 'endodoncia', 'extraccion', 'urgencia', 'corona', 'ortodoncia', 'implante', 'blanq'];
  const PUB_LABEL = { primera: 'Primera consulta', control: 'Control', limpieza: 'Limpieza y control', composite: 'Arreglo de caries / restauración', endodoncia: 'Tratamiento de conducto (endodoncia)', extraccion: 'Extracción', urgencia: 'Urgencia · dolor', corona: 'Corona (prueba o cementado)', ortodoncia: 'Control de ortodoncia', implante: 'Control de implante', blanq: 'Blanqueamiento' };
  A.PUB_TYPES = DEF_TYPES;
  const typeDur = (k, p) => { const s = A.slotOf(p), d = (A.TYPES[k] || ['', 30])[1]; return Math.max(s, Math.ceil(d / s) * s); };
  function pubData() {
    const o = O(), pros = proList(), slots = {}, today = A.today();
    /* si nunca se tocaron los motivos, se ofrecen todos los habituales (antes eran solo 4) */
    const OLD4 = 'primera,control,urgencia,limpieza';
    let types = (o.types && o.types.length && (o.typesSet || o.types.join(',') !== OLD4) ? o.types : DEF_TYPES).filter(k => A.TYPES[k]);
    if (o.other !== false) types = types.concat(['otro']);
    let n = 0;
    types.forEach(k => {
      const byD = {};
      for (let i = 0; i <= Math.min(60, o.maxDays || 30); i++) {
        const d = A.add(today, i);
        if (A.closedOn && A.closedOn(d)) continue;
        const l = [];
        pros.forEach(p => { const dur = k === 'otro' ? Math.max(A.slotOf(p), 30) : typeDur(k, p); A.freeSlots(p, d, dur, { minMin: (o.minHours || 0) * 60 }).forEach(t => l.push([p.id, t, dur])); });
        if (l.length) { byD[d] = l.sort((a, b) => a[1] - b[1]); n += l.length; }
      }
      slots[k] = byD;
    });
    return { n, data: { clinic: A.CLINIC, addr: A.CFG.addr || '', phone: A.CFG.phone || '', wa: A.waNumber ? A.waNumber(A.CFG.phone || '') || '' : '', sena: o.sena || 0, cancelHours: o.cancelHours || 24, msg: o.msg || '',
      types: types.map(k => ({ k, label: k === 'otro' ? 'Otro motivo (lo escribo yo)' : PUB_LABEL[k] || A.TYPES[k][0] })), pros: pros.map(p => ({ id: p.id, name: p.name, spec: p.spec || '' })), slots, solo: A.isSolo() } };
  }
  async function publish(force) {
    if (!real() || TS.busy) return; const o = O();
    if (o.on === false || o.link === false) { TS.state = 'off'; return; }
    const pd = pubData(), js = J(pd.data); TS.count = pd.n;
    if (!force && js === TS.lastJ) return;
    TS.busy = true;
    try {
      await CL.api('/rest/v1/ov_booking?on_conflict=owner', { method: 'POST', body: { owner: A.ownerId(), slug: slug(), enabled: true, data: pd.data, updated_at: new Date().toISOString() }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
      TS.lastJ = js; TS.state = 'ok'; TS.at = new Date(); TS.msg = '';
    } catch (e) {
      TS.state = e && (e.status === 404 || /relation|does not exist|schema cache/i.test(String(e.message))) ? 'notables' : e && e.offline ? 'offline' : 'err'; TS.msg = (e && e.message) || '';
    } finally { TS.busy = false; paintTn(); }
  }
  async function unpublish() { if (!real()) return; try { await CL.api('/rest/v1/ov_booking?owner=eq.' + A.ownerId(), { method: 'PATCH', body: { enabled: false } }); } catch (e) { /* nada */ } TS.lastJ = null; TS.state = 'off'; paintTn(); }
  /* pedidos nuevos → turnos en la agenda */
  async function claim() {
    if (!real() || O().on === false || O().link === false || (CL.readonly)) return;
    let rows = []; try { rows = await CL.api('/rest/v1/rpc/ov_booking_claim', { method: 'POST', body: {} }) || []; } catch (e) { return; }
    if (!rows.length) return;
    rows.forEach(r => {
      const d = r.data || {}, dni = String(d.dni || '').replace(/\D/g, '');
      let pat = dni ? A.PATS.filter(x => String(x.dni || '').replace(/\D/g, '') === dni)[0] : null;
      if (!pat) pat = A.addPatient({ first: d.first, last: d.last, dni: d.dni, phone: d.phone, email: d.email, cov: d.cov || 'Particular', pro: d.pro });
      else if (!pat.phone && d.phone) A.setProfile(pat.id, { phone: d.phone });
      const a = { id: A.uid(), pid: pat.id, pro: A.PRO(d.pro) ? d.pro : (A.PROS[0] || {}).id, date: d.date, start: +d.start, dur: +d.dur || 30, what: d.type === 'otro' ? ((m => m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Otro motivo')(String(d.note || '').replace(/^Motivo:\s*/, '').split('. ')[0].trim())) : (A.TYPES[d.type] || [d.type || 'Turno'])[0], status: 'pendiente', rem: 'porenviar', online: true, code: r.code, onlineAt: r.created_at, note: d.note || '' };
      if (A.locAt) { const l = A.locAt(a.date, a.start, a.pro); if (l) a.loc = l; }
      A.mutate([a.date], () => { A.day(a.date).push(a); });
      A.toast('Turno pedido online: ' + pat.name + ', ' + A.fmtShort(a.date) + ' ' + A.mm(a.start) + '. Confirmalo por WhatsApp.');
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Turno pedido online', { body: pat.name + ' · ' + A.fmtShort(a.date) + ' ' + A.mm(a.start), icon: 'icon-192.png', tag: 'ov-online-' + r.id }); } catch (e) { /* nada */ }
    });
    A.saveNow(); A.refresh(); publish(true);
  }
  let pt = null;
  const saveNowP2 = A.saveNow;
  A.saveNow = () => { const r = saveNowP2(); clearTimeout(pt); pt = setTimeout(() => publish(false), 4000); return r; };
  setInterval(() => { claim(); }, 60000);
  setInterval(() => { publish(false); }, 10 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { claim(); publish(false); } });
  setTimeout(() => { claim(); publish(true); }, 6000);

  /* ---------- panel del link arriba de la vista del paciente ---------- */
  function tnPanel() {
    const o = O(), on = o.on !== false && o.link !== false;
    if (!real()) return '<div class="tn-link" id="tnLink"><b>Link para tus pacientes</b><p>Para tener tu link, entrá con tu cuenta (en el modo prueba solo se ve esta muestra).</p><button class="btn small" data-act="tnClose">Salir de la muestra</button></div>';
    const st = TS.state === 'ok' ? 'Publicado ' + (TS.at ? 'a las ' + hhmm(TS.at) : '') + ' · ' + TS.count + ' horarios libres' : TS.state === 'notables' ? 'Falta activar el turnero en el servidor.' : TS.state === 'offline' ? 'Sin internet: se publica apenas vuelva.' : TS.state === 'err' ? 'No se pudo publicar: ' + esc(TS.msg) : TS.state === 'off' || !on ? 'Pausado: los pacientes no pueden pedir turnos.' : 'Publicando…';
    return '<div class="tn-link" id="tnLink"><div class="tl-h"><b>Link para tus pacientes</b><label class="chk"><input type="checkbox" data-chg="tnLinkOn"' + (on ? ' checked' : '') + '> Recibir pedidos online</label></div>' +
      (on ? '<div class="tl-u"><input readonly value="' + esc(link()) + '" aria-label="Link del turnero" onclick="this.select()"><button class="btn small primary" data-act="tnLinkCopy">Copiar</button><button class="btn small" data-act="tnLinkWa">WhatsApp</button>' + (navigator.share ? '<button class="btn small" data-act="tnLinkShare">Compartir</button>' : '') + '<a class="btn small" href="' + esc(link()) + '" target="_blank" rel="noopener">Abrir</a></div>' : '') +
      (on && !A.isSolo() && proList().length > 1 ? '<details class="tl-pros"><summary>Un link para cada profesional</summary><p class="hint" style="margin:4px 0">Cada uno muestra solo a ese profesional: sus pacientes no ven a los demás del centro.</p>' + proList().map(p => '<div class="tl-u"><span class="tl-pn"><i class="stdot" style="background:' + p.color + '"></i> ' + esc(p.name) + '</span><input readonly value="' + esc(link(p.id)) + '" onclick="this.select()" aria-label="Link de ' + esc(p.name) + '"><button class="btn small" data-act="tnLinkCopy" data-p="' + p.id + '">Copiar</button><button class="btn small" data-act="tnLinkWa" data-p="' + p.id + '">WhatsApp</button></div>').join('') + '</details>' : '') +
      '<div class="tl-s' + (TS.state === 'err' || TS.state === 'notables' ? ' bad' : '') + '">' + st + '</div>' +
      '<p class="hint" style="margin:4px 0 0">El paciente ve solo los horarios libres de los próximos ' + (o.maxDays || 30) + ' días y pide el turno. Te llega a la agenda como <b>pendiente · online</b> para que lo confirmes por WhatsApp' + (o.sena ? ' y le pidas la seña de ' + A.money(o.sena) : '') + '. Horarios, motivos y anticipación: Ajustes › Turnero online.</p>' +
      '<p class="tl-demo">Abajo, una muestra de lo que ve el paciente.</p><button class="btn small" data-act="tnClose">Volver a la app</button></div>';
  }
  function paintTn() { const h = $('#tnHost'); if (!h || !document.body.classList.contains('tn-on')) return; const old = $('#tnLink'); if (old) old.outerHTML = tnPanel(); else h.insertAdjacentHTML('afterbegin', tnPanel()); const dm = h.querySelector('.tn-demo'); if (dm) dm.style.display = 'none'; }
  const tnOpenPrev = A.acts.tnOpen;
  A.acts.tnOpen = el => { const r = tnOpenPrev(el); paintTn(); publish(false); return r; };
  const mo = new MutationObserver(() => { const h = $('#tnHost'); if (h && document.body.classList.contains('tn-on') && !$('#tnLink') && h.firstChild) paintTn(); });
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: false }));
  setTimeout(() => { const h = $('#tnHost'); if (h) mo.observe(h, { childList: true }); }, 0);
  const tnHostObs = () => { const h = $('#tnHost'); if (h && !h.__ovObs) { h.__ovObs = true; mo.observe(h, { childList: true }); } };
  setInterval(tnHostObs, 2000);
  A.chg.tnLinkOn = el => { const o = O(); o.link = el.checked; if (el.checked && o.on === false) o.on = true; A.save(); if (el.checked) publish(true); else unpublish(); paintTn(); };
  A.acts.tnLinkCopy = el => { const u = link(el && el.getAttribute && el.getAttribute('data-p')); try { navigator.clipboard.writeText(u).then(() => A.toast('Link copiado.'), () => A.toast('Copialo a mano: ' + u)); } catch (e) { A.toast('Copialo a mano: ' + u); } };
  const invite = pro => 'Hola! Podés sacar tu turno ' + (pro && A.PRO(pro) ? 'con ' + A.PRO(pro).name + ' ' : '') + 'en ' + A.CLINIC + ' desde este link: ' + link(pro);
  A.acts.tnLinkWa = el => window.open('https://wa.me/?text=' + encodeURIComponent(invite(el && el.getAttribute && el.getAttribute('data-p'))), '_blank', 'noopener');
  A.acts.tnLinkShare = () => { try { navigator.share({ title: 'Turnos online · ' + A.CLINIC, text: invite(), url: link() }); } catch (e) { /* nada */ } };
  A.tnLink = () => link(); A.tnPublish = publish; A.tnClaim = claim;

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.textContent =
    '.rem{border:1.5px solid var(--line);border-left:4px solid #f6c453;border-radius:12px;padding:8px 12px;margin:10px 0;background:color-mix(in srgb,#f6c453 7%,transparent)}.rem-h{display:flex;justify-content:space-between;align-items:center;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2)}.rem-h span{display:flex;gap:12px}' +
    '.rem ul{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}.rem li{display:flex;align-items:center;gap:8px;padding:3px 0 3px 8px;border-left:3px solid var(--rc,#f6c453)}.rem li input{width:18px;height:18px;flex:0 0 auto}.rem-t{background:none;border:0;padding:2px 0;font:inherit;font-size:15px;color:inherit;text-align:left;cursor:pointer;flex:1;min-width:0}' +
    '.rem-w{font:600 12px var(--f-mono,monospace);color:var(--ink-2);white-space:nowrap}.rem li.due .rem-w{color:var(--pat,#b3261e)}.rem-e{font-size:13px;color:var(--ink-2);padding:2px 0}.rem-off{margin:6px 0}' +
    '.rem-cols{display:flex;gap:12px;flex-wrap:wrap}.rem-cols label{display:flex;gap:6px;align-items:center;font-size:14px}.rem-cols i{width:16px;height:16px;border-radius:50%;display:inline-block}' +
    '.jr-go{background:none;border:0;padding:4px 0;font:inherit;font-size:14px;color:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent);text-underline-offset:3px}.jr-go:hover{color:var(--accent,#0d6b6b)}@keyframes jrfl{0%,100%{box-shadow:none}30%,70%{box-shadow:0 0 0 3px var(--accent,#0d6b6b)}}.jr-flash{animation:jrfl 1.1s ease 2}.jr-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.jr-list li{display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding:6px 0}.jr-t{font-size:12px;color:var(--ink-2)}.jr-l{flex:1;min-width:0;font-size:14px}.jr-n{margin-left:auto;font:700 12px var(--f-mono,monospace);color:var(--ink-2)}.jr-home{display:block;margin:2px 0 8px;font-size:13px}' +
    '.tn-link{max-width:760px;margin:12px auto;padding:14px 16px;border:2px solid var(--accent,#0d6b6b);border-radius:14px;background:var(--surface,#fff)}.tl-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}.tl-u{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px}.tl-u input{flex:1 1 260px;min-width:0;font:13px var(--f-mono,monospace);padding:8px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit}' +
    '.tl-pros{margin:6px 0}.tl-pros summary{cursor:pointer;font-weight:700;font-size:14px}.tl-pn{flex:0 0 100%;font-size:13px;font-weight:700}.tl-s{font-size:13px;color:var(--ink-2)}.tl-s.bad{color:var(--pat,#b3261e)}.tl-demo{margin:10px 0 6px;font-size:13px;font-weight:700;color:var(--ink-2);border-top:1px dashed var(--line);padding-top:8px}';
  document.head.appendChild(css);
})();
