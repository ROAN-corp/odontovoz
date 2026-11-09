/* ===== 1.34: una cuenta en varios lugares: elegir dónde trabajar, vincularse con un código y ver los turnos de los otros lugares en la propia agenda ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  if (!CL) return;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const RN = { dueno: 'Dueño', admin: 'Administración', recepcion: 'Recepción', profesional: 'Profesional', asistente: 'Asistente' };
  const places = () => { if (CL.places && CL.places.length) return CL.places; try { const l = JSON.parse(LS.get('odontovoz.places.list', '[]')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  const curOwner = () => CL.ownerId || null;
  const here = () => places().filter(p => p.owner === curOwner())[0] || null;
  const rpc = (fn, body) => CL.api('/rest/v1/rpc/' + fn, { method: 'POST', body: body || {} });
  const noServer = e => e && (e.status === 404 || /could not find the function|schema cache/i.test(String(e.message || '')));

  /* ---------- elegir el lugar ---------- */
  A.acts.plOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'places' }; A.renderModal(); if (CL.checkLicense) CL.checkLicense(true).then(() => { if (S.modal && S.modal.type === 'places') A.renderModal(); }).catch(() => {}); };
  MF.places = m => {
    const L = places(), cur = curOwner();
    let b = '<p class="hint" style="margin-top:0">Con tu misma cuenta podés trabajar en tu consultorio y en los de otros dueños que te invitan. Cada lugar tiene sus pacientes y su agenda por separado.</p>';
    if (!CL.session) b += '<p>Ingresá con tu cuenta para ver tus lugares.</p>';
    else if (!L.length) b += '<p class="hint">Todavía no tenés otros lugares. Cuando un dueño te mande su enlace de invitación, abrilo con esta cuenta.</p>';
    else b += '<ul class="pl-list">' + L.map(p => '<li class="' + (p.owner === cur ? 'on' : '') + '"><button class="pl-it" data-act="plGo" data-o="' + esc(p.owner) + '"' + (p.owner === cur ? ' aria-current="true"' : '') + '><span class="pl-ic" aria-hidden="true">' + (p.mine ? '🏠' : '🦷') + '</span><span class="pl-tx"><b>' + esc(p.clinic || 'Consultorio') + '</b><small>' + (p.mine ? 'Tu consultorio · ' : '') + esc(RN[p.role] || p.role) + '</small></span>' + (p.owner === cur ? '<span class="pl-now">Ahora</span>' : '<span class="pl-go">Entrar ›</span>') + '</button>' +
      (!p.mine && !p.sub ? '<button class="btn small ghost pl-leave" data-act="plLeave" data-o="' + esc(p.owner) + '" title="Dejar este lugar">Dejar</button>' : '') + '</li>').join('') + '</ul>';
    if (CL.session) b += '<details class="pl-code"' + (m.code ? ' open' : '') + '><summary>Tengo un código de invitación</summary><div class="row-inline"><input id="plCode" placeholder="Ej.: K7M2Q9XR4T" autocapitalize="characters" spellcheck="false" value="' + esc(m.code || '') + '"><button class="btn primary" data-act="plLink">Vincular</button></div><div class="hint bad" id="plMsg"></div></details>';
    const ext = otherPro();
    if (here() && here().mine && ext.length && A.PROS.length > 1) b += '<div class="field" style="margin-top:10px"><label for="plPro">En tu agenda, tus turnos de otros lugares se muestran en la columna de</label><select id="plPro" data-chg="plPro">' + A.PROS.map(p => '<option value="' + esc(p.id) + '"' + (p.id === extPro() ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></div>';
    return A.modalShell('Dónde trabajás', b, '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  async function goPlace(owner) {
    if (!owner || owner === curOwner()) { S.modal = null; A.renderModal(); return; }
    const p = places().filter(x => x.owner === owner)[0];
    S.modal = { type: 'plBusy', name: p ? p.clinic : '' }; A.renderModal();
    let okSync = true;
    const idle = async () => { for (let i = 0; i < 60 && CL.state === 'busy'; i++) await new Promise(r => setTimeout(r, 500)); };
    try { await idle(); if (CL.sync) await CL.sync(); await idle(); } catch (e) { okSync = false; }
    if (CL.state !== 'ok') okSync = false;
    /* 1.40.5: si no se pudo guardar lo de acá en la nube (sin internet), no se cambia: al cambiar se borra lo de este equipo */
    if (!okSync || CL.state === 'err' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      S.modal = null; A.renderModal();
      A.toast('No se pudo guardar en la nube lo de este lugar (¿sin internet?). Probá de nuevo cuando haya conexión: si cambiás ahora se perdería.');
      return;
    }
    LS.set('odontovoz.place', owner); LS.set('odontovoz.placeJust', '1'); LS.set('odontovoz.goHome', '1'); LS.set('odontovoz.dataOwner', owner); LS.set('odontovoz.cloud.since', null);
    if (A.wipeLocal) A.wipeLocal();
    try { if (CL.baseClear) await CL.baseClear(); } catch (e) { /* nada */ }
    setTimeout(() => location.reload(), 150);
  }
  MF.plBusy = m => A.modalShell('Cambiando de lugar', '<div class="pl-busy"><span class="spin" aria-hidden="true"></span><p>Entrando a <b>' + esc(m.name || 'el otro lugar') + '</b>…</p><p class="hint">Se guarda lo de acá y se bajan los datos del otro lugar. Tarda unos segundos.</p></div>', '');
  A.acts.plGo = el => goPlace(el.getAttribute('data-o'));
  A.acts.plLeave = el => { const o = el.getAttribute('data-o'), p = places().filter(x => x.owner === o)[0]; S.modal = { type: 'plLeaveAsk', o, name: p ? p.clinic : '' }; A.renderModal(); };
  MF.plLeaveAsk = m => A.modalShell('Dejar ' + (m.name || 'este lugar'), '<p>Vas a dejar de ver la agenda y los pacientes de <b>' + esc(m.name) + '</b>. Lo que hiciste ahí queda en su historia clínica. Para volver, el dueño te tiene que invitar de nuevo.</p><div class="hint bad" id="plMsg2"></div>', '<button class="btn" data-act="plOpen">Cancelar</button><button class="btn danger" data-act="plLeaveGo">Dejar el lugar</button>');
  A.acts.plLeaveGo = async () => {
    const m = S.modal;
    try {
      const r = await rpc('ov_leave', { p_owner: m.o }); if (!r || !r.ok) { $('#plMsg2').textContent = 'No se pudo.'; return; }
      CL.places = places().filter(p => p.owner !== m.o);
      if (m.o === curOwner()) { const mine = CL.places.filter(p => p.mine)[0]; LS.set('odontovoz.place', mine ? mine.owner : null); LS.set('odontovoz.placeJust', '1'); LS.set('odontovoz.dataOwner', mine ? mine.owner : null); LS.set('odontovoz.cloud.since', null); if (A.wipeLocal) A.wipeLocal(); try { await CL.baseClear(); } catch (e) { /* nada */ } location.reload(); return; }
      A.toast('Dejaste ' + m.name + '.'); A.acts.plOpen();
    } catch (e) { $('#plMsg2').textContent = noServer(e) ? 'Falta actualizar el servidor (vinculos.sql).' : e.message || 'Sin conexión.'; }
  };
  A.acts.plLink = async () => {
    const c = (($('#plCode') || {}).value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), o = $('#plMsg');
    if (c.length < 6) { o.textContent = 'Escribí el código que te pasaron.'; return; }
    try {
      const r = await rpc('ov_invite_accept', { p_code: c });
      if (!r || !r.ok) { o.textContent = (r && r.msg) || 'No se pudo.'; return; }
      await CL.checkLicense(true).catch(() => {});
      linkedPrompt(r.owner);
    } catch (e) { o.textContent = noServer(e) ? 'Falta actualizar el servidor (vinculos.sql).' : e.message || 'Sin conexión.'; }
  };
  function linkedPrompt(owner) {
    LS.set('odontovoz.linkedNew', null);
    const p = places().filter(x => x.owner === owner)[0];
    S.modal = { type: 'plNew', o: owner, name: p ? p.clinic : 'el consultorio', role: p ? p.role : '' }; A.renderModal();
  }
  MF.plNew = m => A.modalShell('¡Listo, te vinculaste!', '<p>Ya sos parte de <b>' + esc(m.name) + '</b>' + (m.role ? ' como ' + esc((RN[m.role] || m.role).toLowerCase()) : '') + '. Tu consultorio sigue igual.</p><p class="hint">Para pasar de un lugar a otro, tocá el nombre del consultorio arriba de todo (debajo del título) o Menú › Dónde trabajás.' + (m.role === 'profesional' ? ' En tu agenda vas a ver también tus turnos de ' + esc(m.name) + ', en otro color.' : '') + '</p>',
    '<button class="btn" data-act="closeModal">Seguir acá</button><button class="btn primary" data-act="plGo" data-o="' + esc(m.o) + '">Entrar a ' + esc(m.name) + '</button>');
  A.chg.plPro = el => { LS.set('odontovoz.extPro', el.value); EXT.at = 0; paintExt(); };

  /* ---------- en la barra de arriba: el nombre del lugar se toca para cambiar ---------- */
  const markTitle = () => {
    const sb = $('#abSub'), t = document.querySelector('.ab-title'); if (!sb || !t) return;
    const many = places().length > 1;
    t.classList.toggle('pl-many', many);
    if (many) { t.setAttribute('data-act', 'plOpen'); t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); t.title = 'Cambiar de lugar'; const h = here(); if (h && !h.mine) t.classList.add('pl-away'); else t.classList.remove('pl-away'); }
    else { t.removeAttribute('data-act'); t.removeAttribute('role'); t.removeAttribute('tabindex'); }
  };
  const addMenu = () => {
    const ex = document.querySelector('.dnav[data-act="plOpen"]'); if (ex) { ex.hidden = !CL.session; return; }
    const first = document.querySelector('.drawer .dnav.acct-type'); if (!first || !CL.session) return;
    first.insertAdjacentHTML('beforebegin', '<button class="dnav" data-act="plOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span class="t">Dónde trabajás</span></button>');
  };

  /* =====================================================================
     MIS TURNOS DE OTROS LUGARES DENTRO DE MI AGENDA (solo se ven; se manejan entrando a ese lugar)
     ===================================================================== */
  const EXT = { from: '', to: '', list: [], at: 0, busy: false };
  const otherPro = () => places().filter(p => !p.mine && p.pro && p.owner !== curOwner());
  const extPro = () => { const v = LS.get('odontovoz.extPro', ''); if (v && A.PRO(v)) return v; return (S.me && A.PRO(S.me) ? S.me : (A.PROS[0] || {}).id); };
  const placeName = o => (places().filter(p => p.owner === o)[0] || {}).clinic || 'Otro lugar';
  const COLORS = ['#7d3c98', '#b9770e', '#117864', '#a93226', '#2e4053'];
  const placeColor = o => { const L = otherPro().map(p => p.owner); const i = Math.max(0, L.indexOf(o)); return COLORS[i % COLORS.length]; };
  async function loadExt(force) {
    if (!CL.session || !otherPro().length || !here() || !here().mine) { EXT.list = []; return; }
    const d = S.date || A.today(), dw = A.dow(d), from = A.add(d, dw === 0 ? -6 : 1 - dw), to = A.add(from, 6);
    if (!force && EXT.from === from && Date.now() - EXT.at < 120000) return;
    if (EXT.busy) return; EXT.busy = true;
    try { const r = await rpc('ov_ext_agenda', { p_from: from, p_to: to }); EXT.list = Array.isArray(r) ? r : []; EXT.from = from; EXT.to = to; EXT.at = Date.now(); }
    catch (e) { if (noServer(e)) EXT.list = []; }
    finally { EXT.busy = false; }
    paintExt();
  }
  A.extAgenda = (date) => EXT.list.filter(x => x.date === date);
  function paintExt() {
    const host = $('#view-agenda'); if (!host || S.tab !== 'agenda') return;
    host.querySelectorAll('.ext-blk,.ext-band').forEach(x => x.remove());
    if (!EXT.list.length) return;
    const grid = host.querySelector('.grid'), shPx = grid ? parseFloat(getComputedStyle(grid).getPropertyValue('--sh')) || 28 : 28;
    const pro = extPro(), days = {};
    host.querySelectorAll('.gb[data-pro="' + pro + '"]').forEach(gb => {
      const date = gb.getAttribute('data-date'), g0 = +gb.getAttribute('data-g0'), H = gb.clientHeight, g1 = g0 + H / shPx * 15;
      A.extAgenda(date).forEach(x => {
        days[date] = (days[date] || 0) + 1;
        const st = Math.max(g0, +x.start), en = Math.min(g1, +x.start + (+x.dur || 30)); if (en <= st) return;
        const top = (st - g0) / 15 * shPx, h = Math.max(shPx - 2, (en - st) / 15 * shPx - 2);
        gb.insertAdjacentHTML('beforeend', '<div class="ext-blk" style="top:' + top + 'px;height:' + h + 'px;--pc:' + placeColor(x.owner) + '" data-act="extOpen" data-o="' + esc(x.owner) + '" data-d="' + esc(x.date) + '" data-s="' + x.start + '" role="button" tabindex="0" title="' + esc(placeName(x.owner) + ' · ' + A.mm(+x.start) + ' · ' + (x.name || '')) + '"><b>' + esc(placeName(x.owner)) + '</b><span>' + A.mm(+x.start) + ' ' + esc(x.name || '') + '</span></div>');
      });
    });
    /* aviso arriba de la grilla del día */
    const d = S.date || A.today(), L = A.extAgenda(d);
    if (L.length && (S.view === 'dia' || !S.view)) {
      const by = {}; L.forEach(x => { (by[x.owner] = by[x.owner] || []).push(x); });
      const gw = host.querySelector('#gridWrap');
      if (gw) gw.insertAdjacentHTML('beforebegin', '<div class="ext-band">' + Object.keys(by).map(o => { const l = by[o].sort((a, b) => a.start - b.start), e = l[l.length - 1]; return '<button class="ext-chip" data-act="extOpen" data-o="' + esc(o) + '" data-d="' + esc(d) + '" style="--pc:' + placeColor(o) + '">🦷 Hoy también en <b>' + esc(placeName(o)) + '</b>: ' + l.length + ' turno' + (l.length === 1 ? '' : 's') + ' de ' + A.mm(+l[0].start) + ' a ' + A.mm(+e.start + (+e.dur || 30)) + '</button>'; }).join('') + '</div>');
    }
  }
  A.acts.extOpen = el => {
    const o = el.getAttribute('data-o'), d = el.getAttribute('data-d'), s = el.getAttribute('data-s');
    S.modal = { type: 'extM', o, d, s: s != null ? +s : null }; A.renderModal();
  };
  MF.extM = m => {
    const L = A.extAgenda(m.d).filter(x => x.owner === m.o).sort((a, b) => a.start - b.start), nm = placeName(m.o);
    return A.modalShell(nm + ' · ' + A.fmtDMY(m.d), '<p class="hint" style="margin-top:0">Tus turnos en ' + esc(nm) + '. Acá solo se ven; para manejarlos, entrá a ' + esc(nm) + '.</p><ul class="ext-list">' + L.map(x => '<li class="' + (m.s === +x.start ? 'on' : '') + '"><b>' + A.mm(+x.start) + '–' + A.mm(+x.start + (+x.dur || 30)) + '</b><span>' + esc(x.name || '') + (x.motivo ? '<small>' + esc(x.motivo) + '</small>' : '') + '</span><em>' + esc((A.STATUS_LABEL && A.STATUS_LABEL[x.status]) || '') + '</em></li>').join('') + '</ul>',
      '<button class="btn" data-act="closeModal">Cerrar</button><button class="btn primary" data-act="plGo" data-o="' + esc(m.o) + '">Entrar a ' + esc(nm) + '</button>');
  };
  /* al dar un turno en mi agenda a una hora en la que estoy en otro lugar: aviso */
  const overlapExt = (date, start, dur, pro) => (pro && pro !== extPro()) ? null : A.extAgenda(date).filter(x => +x.start < start + (dur || 30) && start < +x.start + (+x.dur || 30))[0] || null;
  const naPrev = A.acts.naSave;
  if (naPrev) A.acts.naSave = function () {
    const r = naPrev.apply(this, arguments);
    try {
      const d = S.date || A.today(), list = A.day ? A.day(d) : [], last = list.slice().sort((a, b) => (a.at || '') < (b.at || '') ? 1 : -1)[0];
      if (last && last.at && Date.now() - Date.parse(last.at) < 5000) { const x = overlapExt(last.date || d, last.start, last.dur, last.pro); if (x) setTimeout(() => A.toast('Ojo: a esa hora tenés turno en ' + placeName(x.owner) + ' (' + A.mm(+x.start) + ' ' + (x.name || '') + ').'), 400); }
    } catch (e) { /* nada */ }
    return r;
  };
  const gbPrev = A.acts.gbClick;
  if (gbPrev) A.acts.gbClick = function (el, ev) {
    try {
      const date = el.getAttribute('data-date'), pro = el.getAttribute('data-pro'), g0 = +el.getAttribute('data-g0'), grid = el.closest('.grid'), shPx = grid ? parseFloat(getComputedStyle(grid).getPropertyValue('--sh')) || 28 : 28;
      if (ev && ev.target && ev.target.closest && ev.target.closest('.ext-blk')) return;
      const y = ev ? ev.clientY - el.getBoundingClientRect().top : 0, start = g0 + Math.floor(y / shPx) * 15, x = overlapExt(date, start, 15, pro);
      if (x) A.toast('A esa hora estás en ' + placeName(x.owner) + ' (' + A.mm(+x.start) + ' ' + (x.name || '') + ').');
    } catch (e) { /* nada */ }
    return gbPrev.apply(this, arguments);
  };

  /* ---------- cuando se refresca la pantalla ---------- */
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    markTitle(); addMenu();
    if (S.tab === 'agenda') { paintExt(); loadExt(false); }
    const ln = LS.get('odontovoz.linkedNew', ''); if (ln && places().some(p => p.owner === ln) && !S.modal) linkedPrompt(ln);
  };
  const agPrev = A.render.agenda;
  A.render.agenda = function () { const r = agPrev.apply(this, arguments); setTimeout(paintExt, 0); return r; };

  const css = document.createElement('style');
  css.textContent = '.ab-title.pl-many{cursor:pointer;border-radius:10px;padding:2px 6px;margin-left:-6px}.ab-title.pl-many:hover{background:color-mix(in srgb,var(--accent) 10%,transparent)}.ab-title.pl-many #abSub::after{content:" ▾";font-size:11px}.ab-title.pl-away #abSub{color:#7d3c98;font-weight:700}' +
    '.pl-list{list-style:none;margin:0 0 8px;padding:0;display:flex;flex-direction:column;gap:6px}.pl-list li{display:flex;gap:6px;align-items:center}.pl-it{all:unset;cursor:pointer;flex:1;display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.pl-it:hover{border-color:var(--accent)}.pl-list li.on .pl-it{border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--surface))}' +
    '.pl-ic{font-size:22px}.pl-tx{flex:1;display:flex;flex-direction:column;min-width:0}.pl-tx small{color:var(--ink-2);font-size:12.5px}.pl-now{font-size:12px;font-weight:800;color:var(--accent)}.pl-go{font-size:13px;font-weight:700;color:var(--accent)}' +
    '.pl-code{margin-top:6px}.pl-code summary{cursor:pointer;font-weight:700}.row-inline{display:flex;gap:8px;margin-top:8px}.row-inline input{flex:1;min-height:40px;border:1px solid var(--line);border-radius:10px;padding:0 10px;background:var(--surface);color:var(--ink);font:inherit;letter-spacing:.06em;text-transform:uppercase}' +
    '.pl-busy{text-align:center;padding:16px 6px}.pl-busy .spin{display:inline-block;width:28px;height:28px;border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:plspin 1s linear infinite}@keyframes plspin{to{transform:rotate(360deg)}}' +
    '.ext-blk{position:absolute;left:52%;right:2px;z-index:3;border-radius:8px;padding:2px 6px;font-size:11.5px;line-height:1.2;overflow:hidden;cursor:pointer;color:#fff;background:repeating-linear-gradient(135deg,var(--pc) 0 8px,color-mix(in srgb,var(--pc) 82%,#000) 8px 16px);opacity:.92;box-shadow:0 1px 3px rgba(0,0,0,.25)}.ext-blk b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.03em}.ext-blk span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ext-band{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}.ext-chip{all:unset;cursor:pointer;font-size:13px;padding:5px 10px;border-radius:999px;border:1.5px solid var(--pc);color:var(--ink);background:color-mix(in srgb,var(--pc) 10%,var(--surface))}' +
    '.ext-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.ext-list li{display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:10px}.ext-list li.on{border:2px solid var(--accent)}.ext-list span{flex:1;display:flex;flex-direction:column}.ext-list small{color:var(--ink-2)}.ext-list em{font-style:normal;font-size:12px;color:var(--ink-2)}';
  document.head.appendChild(css);
})();
