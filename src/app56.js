/* ===== 1.45: responsabilidad sobre la historia clínica (Ley 26.529): quién hizo qué, nada clínico se borra, archivar, pacientes de prueba y unir duplicados ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud, $ = q => document.querySelector(q);
  const real = () => !!(CL && CL.session && !A.DEMO);
  const role = () => (A.mbRole ? A.mbRole() : 'dueno');
  const boss = () => !(A.isMember && A.isMember()) || role() === 'admin';           /* dueño o administrador */
  const desk = () => boss() || role() === 'recepcion';

  /* ---------- quién está usando la app (su usuario, no el equipo) ---------- */
  A.actor = () => {
    if (real()) { const u = CL.session.user || {}, m = CL.member; return { uid: u.id || '', who: (m && (m.name || m.username)) || u.email || 'Usuario' }; }
    const pr = A.PRO && S.me ? A.PRO(S.me) : null; return { uid: 'local', who: (pr && (pr.name || pr.short)) || 'Este equipo' };
  };
  const stamp = () => { const a = A.actor(); return { at: new Date().toISOString(), uid: a.uid, who: a.who }; };
  /* registro de la ficha (además del registro del servidor, que es el que no se puede tocar) */
  const alog = (pid, act, txt) => { const pd = A.pd(pid); if (!pd) return; (pd.alog = pd.alog || []).push(Object.assign(stamp(), { act, txt })); if (pd.alog.length > 400) pd.alog.shift(); A.touchPd(pid); };
  A.alog = alog;

  /* ---------- 1) evoluciones: cada nota lleva el usuario que la escribió; ninguna se borra, se anula ---------- */
  const touchPrev = A.touchPd;
  A.touchPd = function (pid) {
    try { const pd = A.S.pd && A.S.pd[pid]; if (pd && pd.notes) { const t = A.today(); let a = null; pd.notes.forEach(n => { if (n && !n.uid && n.date === t && !n.imp) { a = a || A.actor(); n.uid = a.uid; n.who = a.who; } }); } } catch (e) { /* nada */ }
    return touchPrev.apply(this, arguments);
  };
  const delAsk = A.acts.evDelAsk;
  A.acts.evDelAsk = function (el) {
    const n = ((A.pd(S.fichaPid) || {}).notes || []).filter(x => x.id === el.getAttribute('data-id'))[0];
    if (n && !n.auto) return A.acts.evVoidAsk(el);       /* lo escrito por una persona se anula (con motivo), aunque sea de hoy */
    return delAsk.apply(this, arguments);
  };
  const voidGo = A.acts.evVoidGo;
  A.acts.evVoidGo = function (el) {
    const id = el.getAttribute('data-id'), pid = S.fichaPid;
    const r = voidGo.apply(this, arguments);
    const n = ((A.pd(pid) || {}).notes || []).filter(x => x.id === id)[0];
    if (n && n.void && !n.void.uid) { Object.assign(n.void, (({ uid, who }) => ({ uid, who }))(A.actor())); alog(pid, 'anular', 'Anuló la evolución del ' + A.fmtDMY(n.date) + ': ' + n.void.why); }
    return r;
  };
  A.acts.evRestore = el => {
    const pid = S.fichaPid, n = ((A.pd(pid) || {}).notes || []).filter(x => x.id === el.getAttribute('data-id'))[0]; if (!n || !n.void) return;
    (n.voidLog = n.voidLog || []).push(Object.assign({}, n.void, { undone: stamp() }));
    alog(pid, 'reactivar', 'Quitó la anulación de la evolución del ' + A.fmtDMY(n.date) + ' (había sido anulada por: ' + n.void.why + ')');
    delete n.void; A.touchPd(pid); A.refresh(); A.toast('La nota vuelve a estar vigente. Queda registrado quién la reactivó.');
  };
  /* el nombre de quién escribió/anuló, en la lista de evoluciones */
  const evPaint = () => {
    const pid = S.fichaPid, pd = pid && A.S.pd && A.S.pd[pid]; if (!pd || !pd.notes) return;
    document.querySelectorAll('#view-ficha .ev-n').forEach(li => {
      if (li.querySelector('.ev-who')) return;
      const b = li.querySelector('[data-id]'); const n = b && pd.notes.filter(x => x.id === b.getAttribute('data-id'))[0];
      if (!n) return; const meta = li.querySelector('.meta'); if (!meta) return;
      if (n.who) meta.insertAdjacentHTML('beforeend', '<span class="ev-who" title="Usuario que la cargó">✎ ' + esc(n.who) + '</span>');
      if (n.void && n.void.who) { const w = li.querySelector('.ev-why'); if (w) w.insertAdjacentHTML('beforeend', ' <span class="ev-who">(usuario: ' + esc(n.void.who) + ')</span>'); }
    });
  };

  /* ---------- 2) pacientes: archivar en vez de borrar; borrar solo los de prueba ---------- */
  const isTest = p => !!(p && p.test);
  A.isTestPat = isTest;
  const fixMenu = m => {
    const host = document.querySelector('#modalHost .pm-list'); if (!host || host.getAttribute('data-ov145')) return;
    host.setAttribute('data-ov145', '1');
    const p = A.PAT(m.pid), del = host.querySelector('[data-act="pmDel"]');
    const it = (act, label, sub, cls) => '<button class="pm-it' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-pid="' + esc(m.pid) + '"><b>' + label + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</button>';
    let extra = '';
    if (desk()) extra += it('mgOpen', 'Unir con otra ficha (duplicado)', 'Si el paciente quedó cargado dos o más veces');
    if (boss()) extra += it('auOpen', 'Historial de cambios', 'Quién cargó, cambió o anuló cada cosa');
    if (isTest(p)) extra += it('pmDel', 'Eliminar paciente de prueba', 'Se borra del todo: era para practicar', 'danger');
    else if (boss()) extra += it('arOpen', 'Archivar paciente', 'Sale de la lista; la historia clínica se conserva', 'danger');
    if (del) del.remove();
    host.insertAdjacentHTML('beforeend', extra);
  };
  const delPrev = A.acts.pmDel;
  A.acts.pmDel = function (el) {
    const p = A.PAT(el.getAttribute('data-pid'));
    if (!isTest(p)) { A.toast(boss() ? 'Los pacientes reales no se borran: se archivan (la ley pide guardar la historia clínica).' : 'Solo el dueño o un administrador pueden archivar pacientes.'); return; }
    return delPrev.apply(this, arguments);
  };
  const pdGoPrev = A.acts.pdGo;
  A.acts.pdGo = function (el) {
    const p = A.PAT(el.getAttribute('data-pid'));
    if (!isTest(p)) { A.toast('Los pacientes reales no se borran: se archivan.'); return; }
    return pdGoPrev.apply(this, arguments);
  };

  MF.patArch = m => {
    const p = A.PAT(m.pid) || {}, fut = futAppts(m.pid).length;
    const b = '<p>Vas a archivar a <b>' + esc(p.name || '') + '</b>.</p><ul class="pd-list"><li>Sale de la lista de pacientes y del buscador.</li><li><b>Su historia clínica, odontograma, fotos y pagos se conservan</b> (la ley pide guardarlos al menos 10 años).</li>' +
      (fut ? '<li>Sus ' + fut + ' turno' + (fut > 1 ? 's' : '') + ' a futuro se cancelan.</li>' : '') + '<li>Lo podés volver a la lista cuando quieras desde Ajustes › Pacientes archivados.</li></ul>' +
      '<div class="field"><label for="arWhy">Motivo</label><input id="arWhy" maxlength="200" placeholder="Ej.: se mudó, dejó de atenderse, ficha duplicada"></div><div class="hint bad" id="arMsg"></div>' +
      '<p class="hint">Si es una ficha repetida, mejor usá «Unir con otra ficha»: junta todo en una sola.</p>';
    return A.modalShell('Archivar paciente', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="arGo" data-pid="' + esc(m.pid) + '">Archivar</button>');
  };
  const futAppts = pid => { const t = A.today(), out = []; Object.keys(A.S.days || {}).forEach(d => { if (d >= t) (A.S.days[d] || []).forEach(a => { if (a.pid === pid && a.type !== 'block' && a.status !== 'cancelado') out.push([d, a]); }); }); return out; };
  A.acts.arOpen = el => { if (!boss()) { A.toast('Solo el dueño o un administrador pueden archivar pacientes.'); return; } S.modal = { type: 'patArch', pid: el.getAttribute('data-pid') }; A.renderModal(); };
  A.archivePatient = (pid, why) => {
    const p = A.PAT(pid); if (!p) return false;
    const fut = futAppts(pid), days = fut.map(x => x[0]).filter((d, i, a) => a.indexOf(d) === i);
    if (fut.length) fut.forEach(([d, a]) => { a.status = 'cancelado'; a.cancelWhy = 'Paciente archivado'; A.S.dirtyDays = A.S.dirtyDays || {}; A.S.dirtyDays[d] = 1; });
    p.arch = Object.assign(stamp(), { why });
    const np = A.S.newPats || (A.S.newPats = []); if (!np.some(x => x.id === pid)) np.push(p);
    const pd = A.pd(pid); pd.prof = Object.assign(pd.prof || {}, { arch: p.arch });
    alog(pid, 'archivar', 'Archivó al paciente. Motivo: ' + why + (fut.length ? ' (' + fut.length + ' turnos a futuro cancelados)' : ''));
    const i = A.PATS.indexOf(p); if (i >= 0) A.PATS.splice(i, 1);
    if (S.fichaPid === pid) { S.fichaPid = null; S.tab = 'pacientes'; }
    if (S.panel && S.panel.pid === pid) S.panel = null;
    A.save(); if (CL && CL.sync) setTimeout(() => CL.sync(), 300);
    return days.length >= 0;
  };
  A.acts.arGo = el => {
    const pid = el.getAttribute('data-pid'), why = (($('#arWhy') || {}).value || '').trim();
    if (!why) { const m = $('#arMsg'); if (m) m.textContent = 'Escribí el motivo: queda registrado.'; return; }
    const nm = (A.PAT(pid) || {}).name; A.archivePatient(pid, why); S.modal = null; A.renderModal(); A.refresh(); A.toast(nm + ' quedó archivado. Su historia clínica se conserva.');
  };
  /* los archivados no aparecen en listas ni búsquedas (como los borrados), pero siguen guardados */
  const hideArch = () => { for (let i = A.PATS.length - 1; i >= 0; i--) if (A.PATS[i] && A.PATS[i].arch) A.PATS.splice(i, 1); };
  const loadPrev = A.load;
  if (loadPrev) A.load = function () { const r = loadPrev.apply(this, arguments); try { hideArch(); } catch (e) { /* nada */ } return r; };
  try { hideArch(); } catch (e) { /* nada */ }
  const archived = () => (A.S.newPats || []).filter(p => p && p.arch && !p.deleted);
  MF.archList = () => {
    const l = archived().sort((a, b) => (a.arch.at < b.arch.at ? 1 : -1));
    const b = l.length ? '<div class="ar-list">' + l.map(p => '<div class="ar-row"><div><b>' + esc(p.name || ((p.first || '') + ' ' + (p.last || ''))) + '</b><span>' + (p.dni ? 'DNI ' + esc(p.dni) + ' · ' : '') + 'archivado el ' + A.fmtDMY(String(p.arch.at).slice(0, 10)) + (p.arch.who ? ' por ' + esc(p.arch.who) : '') + ' · ' + esc(p.arch.why || '') + '</span></div>' +
      (boss() ? '<button class="btn small" data-act="arBack" data-pid="' + esc(p.id) + '">Volver a la lista</button>' : '') + '</div>').join('') + '</div>' : '<p class="hint">No hay pacientes archivados.</p>';
    return A.modalShell('Pacientes archivados', '<p class="hint" style="margin-top:0">Su historia clínica se conserva completa. Volverlos a la lista los deja como antes.</p>' + b, '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.archOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'archList' }; A.renderModal(); };
  A.acts.arBack = el => {
    const pid = el.getAttribute('data-pid'), p = (A.S.newPats || []).filter(x => x.id === pid)[0]; if (!p || !boss()) return;
    const was = p.arch; delete p.arch; const pd = A.pd(pid); if (pd.prof) delete pd.prof.arch;
    if (A.PATS.indexOf(p) < 0) A.PATS.push(p); if (A.PIDX) A.PIDX[pid] = p;
    alog(pid, 'desarchivar', 'Volvió a la lista (estaba archivado: ' + (was && was.why || '') + ')');
    A.save(); A.renderModal(); A.refresh(); A.toast((p.name || 'El paciente') + ' volvió a la lista.');
  };

  /* ---------- 3) «Es de prueba»: solo se elige al crear la ficha (después no se puede, así nadie lo usa para borrar uno real) ---------- */
  const TEST_RE = /\b(prueba|pruebas|test|testeo|ejemplo|ficticio|ficticia|demo|inventado|inventada)\b/i;
  const chk = () => { const c = $('#pTest'); return !!(c && c.checked); };
  const addPrev = A.addPatient;
  A.addPatient = function (d) {
    const want = chk(); const p = addPrev.apply(this, arguments);
    if (p && want) { p.test = true; p.testAt = stamp(); A.save && A.save(); }
    return p;
  };
  const mountTest = () => {
    const h = document.getElementById('modalHost'); if (!h || h.querySelector('#pTest')) return;
    const f = h.querySelector('#npF, #nc_first, #ltNf, #ltNn'); if (!f || !f.offsetParent) return;
    const box = f.closest('.m-body') || f.closest('form') || f.parentNode;
    box.insertAdjacentHTML('beforeend', '<label class="chk pt-chk"><input type="checkbox" id="pTest"> <span><b>Es un paciente de prueba</b> (para practicar). Se puede borrar del todo. Esto se elige solo ahora: después no se puede cambiar.</span></label>');
    const names = h.querySelectorAll('#npF, #npL, #nc_first, #nc_last, #ltNf, #ltNn');
    names.forEach(i => i.addEventListener('input', () => { const c = $('#pTest'); if (!c || c.dataset.touched) return; const v = Array.from(names).map(x => x.value).join(' '); c.checked = TEST_RE.test(v); }));
    const c = $('#pTest'); if (c) c.addEventListener('change', () => { c.dataset.touched = '1'; });
  };
  try { new MutationObserver(() => { try { mountTest(); if (S.modal && S.modal.type === 'patMenu') fixMenu(S.modal); } catch (e) { /* nada */ } }).observe(document.getElementById('modalHost') || document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  /* etiqueta «Prueba» en listas y ficha */
  const tagTest = () => {
    document.querySelectorAll('.prow[data-pid]').forEach(r => { const p = A.PAT(r.getAttribute('data-pid')); if (isTest(p) && !r.querySelector('.pt-tag')) { const n = r.querySelector('.nm, b, strong') || r; n.insertAdjacentHTML('beforeend', ' <span class="pt-tag">Prueba</span>'); } });
    const fh = document.querySelector('#view-ficha .fh h1, #view-ficha .fh h2'); if (fh && S.fichaPid && isTest(A.PAT(S.fichaPid)) && !fh.querySelector('.pt-tag')) fh.insertAdjacentHTML('beforeend', ' <span class="pt-tag">Prueba</span>');
  };
  /* borrar todo lo de prueba de una vez */
  MF.testWipe = () => {
    const l = A.PATS.filter(isTest);
    const b = l.length ? '<p>Se borran del todo <b>' + l.length + ' paciente' + (l.length > 1 ? 's' : '') + ' de prueba</b>, con sus turnos, notas y cobros:</p><ul class="pd-list">' + l.slice(0, 12).map(p => '<li>' + esc(p.name) + '</li>').join('') + (l.length > 12 ? '<li>y ' + (l.length - 12) + ' más</li>' : '') + '</ul><p class="hint">Los pacientes reales no se tocan.</p>'
      : '<p class="hint">No hay pacientes marcados como de prueba. (La marca se pone al crear la ficha.)</p>';
    return A.modalShell('Borrar los pacientes de prueba', b, '<button class="btn" data-act="closeModal">Cancelar</button>' + (l.length ? '<button class="btn danger" data-act="twGo">Borrar ' + l.length + '</button>' : ''));
  };
  A.acts.testWipeOpen = () => { if (!boss()) { A.toast('Solo el dueño o un administrador.'); return; } if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'testWipe' }; A.renderModal(); };
  A.acts.twGo = () => { const l = A.PATS.filter(isTest).map(p => p.id); l.forEach(pid => A.deletePatient(pid)); S.modal = null; A.renderModal(); A.refresh(); A.toast(l.length + ' pacientes de prueba borrados.'); };

  /* ---------- 4) unir fichas duplicadas: todo pasa a una sola, no se pierde nada ---------- */
  const blank = v => v == null || v === '' || v === 0 || v === 'Particular' || (Array.isArray(v) && !v.length);
  const SKIP = { id: 1, first: 1, last: 1, name: 1, seed: 1, debt: 1, custom: 1, test: 1, testAt: 1, arch: 1, deleted: 1, prov: 1, ini: 1, key: 1, nkey: 1, age: 1 };
  const mergeOdon = (to, from) => {
    Object.keys(from || {}).forEach(n => {
      const a = from[n], b = to[n];
      if (!b || b.sano && !Object.keys(b.faces || {}).length && !(b.whole || []).length) { to[n] = JSON.parse(JSON.stringify(a)); return; }
      Object.keys(a.faces || {}).forEach(f => { if (!b.faces[f]) b.faces[f] = a.faces[f]; });
      (a.whole || []).forEach(w => { if (!(b.whole || []).some(x => x.cond === w.cond)) (b.whole = b.whole || []).push(w); });
      b.sano = false;
    });
  };
  A.mergePatients = (from, to) => {
    const pf = A.PAT(from), pt = A.PAT(to); if (!pf || !pt || from === to) return false;
    const days = []; Object.keys(A.S.days || {}).forEach(d => { if ((A.S.days[d] || []).some(a => a.pid === from)) days.push(d); });
    const mv = () => days.forEach(d => (A.S.days[d] || []).forEach(a => { if (a.pid === from) a.pid = to; }));
    if (A.mutate) A.mutate(days, mv, 'Turnos de ' + pf.name + ' pasados a ' + pt.name); else { mv(); days.forEach(d => { A.S.dirtyDays[d] = 1; }); }
    const a = A.S.pd[from], b = A.pd(to);
    if (a) {
      Object.keys(a).forEach(k => {
        if (k === 'prof' || k === 'odon' || k === 'hc') return;
        if (Array.isArray(a[k]) && a[k].length) { const have = {}; (b[k] || []).forEach(x => { if (x && x.id) have[x.id] = 1; }); b[k] = (b[k] || []).concat(a[k].filter(x => !(x && x.id && have[x.id]))); }
      });
      mergeOdon(b.odon || (b.odon = {}), a.odon);
      if (a.hc && b.hc) { Object.keys(a.hc.conds || {}).forEach(c => { if (a.hc.conds[c]) b.hc.conds[c] = true; }); Object.keys(a.hc).forEach(k => { if (k !== 'conds' && blank(b.hc[k]) && !blank(a.hc[k])) b.hc[k] = a.hc[k]; }); }
      if (b.notes) b.notes.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
    }
    const fill = {}; Object.keys(pf).forEach(k => { if (!SKIP[k] && typeof pf[k] !== 'function' && blank(pt[k]) && !blank(pf[k])) fill[k] = pf[k]; });
    if (Object.keys(fill).length) A.setProfile(to, fill);
    alog(to, 'unir', 'Unió la ficha duplicada «' + pf.name + '»' + (pf.dni ? ' (DNI ' + pf.dni + ')' : '') + ': se pasaron sus turnos, notas, odontograma y pagos.');
    A.touchPd(to);
    if (a) A.S.pd[from] = { prof: a.prof };   /* así borrar la ficha vieja no borra las fotos, que ya pasaron */
    A.deletePatient(from);
    return true;
  };
  const score = (p, q) => {   /* parecido: mismo DNI, mismo teléfono o mismo nombre */
    if (!p || p.id === q.id) return 0; let s = 0;
    const N = x => (A.norm ? A.norm(x || '') : String(x || '').toLowerCase()).replace(/\s+/g, ' ').trim();
    if (q.dni && p.dni && String(p.dni).replace(/\D/g, '') === String(q.dni).replace(/\D/g, '')) s += 5;
    if (q.phone && p.phone && String(p.phone).replace(/\D/g, '').slice(-8) === String(q.phone).replace(/\D/g, '').slice(-8)) s += 3;
    if (N(p.last) && N(p.last) === N(q.last)) s += 2; if (N(p.first) && N(p.first) === N(q.first)) s += 2;
    if (N(p.first).split(' ')[0] === N(q.first).split(' ')[0] && N(p.last).split(' ')[0] === N(q.last).split(' ')[0]) s += 1;
    return s;
  };
  const fill = p => { let n = 0; ['dni', 'phone', 'email', 'cov', 'birth', 'addr', 'afil'].forEach(k => { if (!blank(p[k])) n++; }); const pd = A.S.pd && A.S.pd[p.id]; if (pd) n += (pd.notes || []).length + Object.keys(pd.odon || {}).length + (pd.ledger || []).length; return n; };
  MF.mgPick = m => {
    const p = A.PAT(m.pid) || {}, q = (m.q || '').trim(), N = x => (A.norm ? A.norm(x || '') : String(x || '').toLowerCase());
    let l = A.PATS.filter(x => x.id !== p.id && !x.deleted);
    l = q ? l.filter(x => N(x.name + ' ' + (x.dni || '')).indexOf(N(q)) >= 0).slice(0, 30) : l.map(x => [x, score(x, p)]).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 12);
    const b = '<p>Elegí la otra ficha de <b>' + esc(p.name) + '</b>. Se juntan en una sola: turnos, evoluciones, odontograma, pagos, fotos y datos. No se pierde nada.</p>' +
      '<input class="inp" id="mgQ" data-in="mgQ" placeholder="Buscar por nombre o DNI" value="' + esc(m.q || '') + '">' +
      '<div class="mg-list">' + (l.length ? l.map(x => '<button class="mg-it" data-act="mgSel" data-pid="' + esc(p.id) + '" data-to="' + esc(x.id) + '"><b>' + esc(x.name) + (isTest(x) ? ' <span class="pt-tag">Prueba</span>' : '') + '</b><span>' + [x.dni ? 'DNI ' + esc(x.dni) : '', x.phone ? esc(x.phone) : '', x.cov && x.cov !== 'Particular' ? esc(x.cov) : ''].filter(Boolean).join(' · ') + '</span></button>').join('') : '<p class="hint">' + (q ? 'No encontré a nadie con eso.' : 'No encontré fichas parecidas. Buscala por nombre arriba.') + '</p>') + '</div>';
    return A.modalShell('Unir con otra ficha', b, '<button class="btn" data-act="closeModal">Cancelar</button>');
  };
  A.acts.mgOpen = el => { if (!desk()) { A.toast('Esto lo hace el dueño, un administrador o recepción.'); return; } S.modal = { type: 'mgPick', pid: el.getAttribute('data-pid'), q: '' }; A.renderModal(); };
  A.ins = A.ins || {};
  A.ins.mgQ = el => { if (!S.modal) return; S.modal.q = el.value; const pos = el.selectionStart; A.renderModal(); const i = $('#mgQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } };
  MF.mgOk = m => {
    const a = A.PAT(m.a), b = A.PAT(m.b); if (!a || !b) return A.modalShell('Unir fichas', '<p>Una de las fichas ya no está.</p>', '<button class="btn primary" data-act="closeModal">Listo</button>');
    const keep = m.keep === 'b' ? b : a, drop = keep === a ? b : a;
    const card = (p, k) => '<label class="mg-card' + (keep === p ? ' on' : '') + '"><input type="radio" name="mgKeep" data-chg="mgKeep" value="' + k + '"' + (keep === p ? ' checked' : '') + '><b>' + esc(p.name) + '</b><span>' + [p.dni ? 'DNI ' + esc(p.dni) : 'sin DNI', p.phone ? esc(p.phone) : 'sin teléfono'].join(' · ') + '</span><span>' + (c => c + (c === 1 ? ' evolución' : ' evoluciones'))(((A.S.pd[p.id] || {}).notes || []).length) + '</span></label>';
    const b2 = '<p>¿Cuál queda como ficha principal? (Su nombre y sus datos mandan; de la otra se completan los que falten.)</p><div class="mg-two">' + card(a, 'a') + card(b, 'b') + '</div>' +
      '<p class="hint">Todo lo de «' + esc(drop.name) + '» pasa a «' + esc(keep.name) + '» y esa ficha deja de aparecer. Queda registrado quién las unió.</p>';
    return A.modalShell('Unir fichas', b2, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="mgGo">Unir</button>');
  };
  A.acts.mgSel = el => { const a = A.PAT(el.getAttribute('data-pid')), b = A.PAT(el.getAttribute('data-to')); S.modal = { type: 'mgOk', a: a.id, b: b.id, keep: fill(b) > fill(a) ? 'b' : 'a' }; A.renderModal(); };
  A.chg.mgKeep = el => { if (S.modal) { S.modal.keep = el.value; A.renderModal(); } };
  A.acts.mgGo = () => {
    const m = S.modal; if (!m) return; const keep = m.keep === 'b' ? m.b : m.a, drop = keep === m.a ? m.b : m.a, nm = (A.PAT(keep) || {}).name;
    A.mergePatients(drop, keep); S.modal = null; A.renderModal(); A.save && A.save(); A.refresh(); A.toast('Listo: quedó una sola ficha de ' + nm + '.');
  };

  /* ---------- 5) historial de cambios de la ficha (dueño y administradores) ---------- */
  const sum = (o, n) => {
    const out = [], on = (o && o.notes) || [], nn = (n && n.notes) || [], oid = {}; on.forEach(x => { oid[x.id] = x; });
    nn.forEach(x => { const p = oid[x.id]; if (!p) out.push('Agregó una evolución: «' + String(x.text || '').slice(0, 90) + '»'); else if (!p.void && x.void) out.push('Anuló la evolución del ' + A.fmtDMY(x.date) + ' (' + (x.void.why || '') + ')'); else if (p.void && !x.void) out.push('Quitó la anulación de la evolución del ' + A.fmtDMY(x.date)); else if (p.text !== x.text) out.push('Cambió el texto de la evolución del ' + A.fmtDMY(x.date)); });
    const nid = {}; nn.forEach(x => { nid[x.id] = 1; }); on.forEach(x => { if (!nid[x.id]) out.push('Borró la evolución del ' + A.fmtDMY(x.date) + ': «' + String(x.text || '').slice(0, 90) + '»'); });
    const ot = JSON.stringify((o && o.odon) || {}), nt = JSON.stringify((n && n.odon) || {}); if (ot !== nt) { const a = (o && o.odon) || {}, b = (n && n.odon) || {}; const ch = Object.keys(Object.assign({}, a, b)).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])); out.push('Odontograma: cambió ' + ch.slice(0, 8).join(', ') + (ch.length > 8 ? '…' : '')); }
    const ol = ((o && o.ledger) || []).length, nl = ((n && n.ledger) || []).length; if (ol !== nl) out.push(nl > ol ? 'Cargó ' + (nl - ol) + ' movimiento' + (nl - ol > 1 ? 's' : '') + ' de cuenta (cobros/cargos)' : 'Quitó ' + (ol - nl) + ' movimiento' + (ol - nl > 1 ? 's' : '') + ' de cuenta');
    else if (JSON.stringify((o && o.ledger) || []) !== JSON.stringify((n && n.ledger) || [])) out.push('Modificó la cuenta (cobros/cargos)');
    const oa = ((o && o.alog) || []).length; ((n && n.alog) || []).slice(oa).forEach(x => out.push(x.txt));
    if (JSON.stringify((o && o.hc) || {}) !== JSON.stringify((n && n.hc) || {})) out.push('Cambió la anamnesis / antecedentes');
    if (JSON.stringify((o && o.prof) || {}) !== JSON.stringify((n && n.prof) || {})) out.push('Cambió datos personales');
    if (JSON.stringify((o && o.budgets) || []) !== JSON.stringify((n && n.budgets) || [])) out.push('Cambió presupuestos');
    if (((o && o.images) || []).length !== ((n && n.images) || []).length) out.push('Cambió fotos');
    return out;
  };
  MF.audit = m => {
    let b;
    if (m.err) b = '<p class="hint">' + esc(m.err) + '</p>';
    else if (!m.rows) b = '<p class="hint">Buscando el historial…</p>';
    else {
      const rows = m.rows, it = [];
      for (let i = 0; i < rows.length; i++) { const n = rows[i], o = rows[i + 1]; const ch = o ? sum(o.v, n.v) : ['Creó la ficha']; if (ch.length) it.push('<li><div class="au-h"><b>' + esc(n.who || '') + '</b>' + (n.who_role ? ' <span class="au-r">' + esc({ dueno: 'dueño', admin: 'administrador', recepcion: 'recepción', profesional: 'profesional', asistente: 'asistente' }[n.who_role] || n.who_role) + '</span>' : '') + '<span class="au-d">' + (n.saved_at ? new Date(n.saved_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '') + (n.device ? ' · ' + esc(n.device) : '') + '</span></div><ul>' + ch.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></li>'); }
      b = it.length ? '<ol class="au-list">' + it.join('') + '</ol>' : '<p class="hint">Todavía no hay cambios registrados.</p>';
    }
    return A.modalShell('Historial de cambios', '<p class="hint" style="margin-top:0">Lo guarda el servidor y no se puede borrar ni modificar desde la app. Sirve para saber quién cargó, cambió o anuló cada cosa.</p>' + b, '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.auOpen = async el => {
    const pid = el.getAttribute('data-pid'); if (!boss()) { A.toast('El historial lo ven el dueño y los administradores.'); return; }
    S.modal = { type: 'audit', pid }; A.renderModal();
    if (!real()) {
      const pd = A.pd(pid), l = (pd.alog || []).slice().reverse();
      S.modal.rows = null; S.modal.err = l.length ? '' : 'En el modo de prueba no hay servidor: el historial completo se ve con la cuenta real.';
      if (l.length) S.modal.rows = [{ who: 'Este equipo', saved_at: new Date().toISOString(), v: pd }, { who: '', v: Object.assign({}, pd, { alog: [] }) }];
      A.renderModal(); return;
    }
    try {
      try { if (CL.sync) await CL.sync(); } catch (e) { /* nada */ }
      const rows = await CL.api('/rest/v1/rpc/ov_audit', { method: 'POST', body: { p_k: 'pd:' + pid, p_limit: 120 } });
      if (S.modal && S.modal.type === 'audit') { S.modal.rows = rows || []; A.renderModal(); }
    } catch (e) {
      const msg = /could not find the function|schema cache|404/i.test(String(e && (e.message || e.status))) ? 'Falta activar el registro de cambios en el servidor (supabase/auditoria.sql).' : 'No se pudo traer el historial: ' + (e && e.message || 'sin conexión');
      if (S.modal && S.modal.type === 'audit') { S.modal.err = msg; A.renderModal(); }
    }
  };

  /* ---------- entradas en Ajustes ---------- */
  const SVG_A = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>';
  const SVG_T = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3"/></svg>';
  const mountMenu = () => {
    const ref = document.querySelector('#gearMenu .dnav[data-act="modeOpen"]') || document.querySelector('#gearMenu .dnav[data-act="supportOpen"]');
    if (!ref || document.querySelector('#gearMenu .dnav[data-act="archOpen"]')) return;
    ref.insertAdjacentHTML('beforebegin', '<button class="dnav" data-act="archOpen">' + SVG_A + '<span class="t">Pacientes archivados</span></button><button class="dnav" data-act="testWipeOpen">' + SVG_T + '<span class="t">Borrar los pacientes de prueba</span></button>');
  };
  mountMenu(); setTimeout(mountMenu, 900);

  A.afterRefresh = (prev => function () { const r = prev && prev.apply(this, arguments); try { evPaint(); tagTest(); } catch (e) { /* nada */ } return r; })(A.afterRefresh);
  try { new MutationObserver(() => { try { tagTest(); evPaint(); } catch (e) { /* nada */ } }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = '.pt-chk{display:flex;gap:8px;align-items:flex-start;margin:12px 0 4px;padding:10px 12px;border:1px dashed var(--line,#cdd);border-radius:12px;font-size:13.5px;line-height:1.35}.pt-chk input{margin-top:3px}' +
    '.pt-tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.02em;background:#efe7ff;color:#5a2ca0;border-radius:999px;padding:1px 8px;vertical-align:middle}' +
    '.ev-who{color:var(--muted,#567);font-size:12px}' +
    '.ar-list,.mg-list{display:grid;gap:6px;margin-top:10px}.ar-row{display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line,#dde);border-radius:12px;padding:8px 10px}.ar-row span{display:block;font-size:12.5px;color:var(--muted,#567)}' +
    '.mg-it{display:grid;text-align:left;gap:2px;border:1px solid var(--line,#dde);background:var(--card,#fff);border-radius:12px;padding:9px 12px;cursor:pointer;font:inherit;color:inherit}.mg-it span{font-size:12.5px;color:var(--muted,#567)}' +
    '.mg-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.mg-card{display:grid;gap:2px;border:2px solid var(--line,#dde);border-radius:12px;padding:10px;cursor:pointer}.mg-card.on{border-color:var(--accent,#0b6b6f);background:rgba(11,107,111,.05)}.mg-card span{font-size:12.5px;color:var(--muted,#567)}.mg-card input{justify-self:start}' +
    '.au-list{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:8px}.au-list>li{border:1px solid var(--line,#dde);border-radius:12px;padding:8px 10px}.au-h{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}.au-r{font-size:11px;background:#e6f4f3;color:#0b4f52;border-radius:999px;padding:1px 7px}.au-d{margin-left:auto;font-size:12px;color:var(--muted,#567)}.au-list ul{margin:4px 0 0;padding-left:18px;font-size:13.5px}' +
    '@media (max-width:520px){.mg-two{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})();
