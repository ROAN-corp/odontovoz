/* ===== 1.11: límites de cada plan (profesionales, equipos, consultorios y tipo de cuenta), iguales a lo que ofrece la web ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;

  /* lo mismo que controla el servidor (supabase/limites.sql) */
  const PLAN = {
    prueba: { name: 'Prueba gratis', pros: 40, devices: 5, locs: 5, centros: 5 }, /* 1.17: la prueba trae todo, para conocer cualquier plan */
    basico: { name: 'Profesional', pros: 1, devices: 2, locs: 1 },
    consultorio: { name: 'Consultorio', pros: 3, devices: 5, locs: 1 },
    centro: { name: 'Centro', pros: 8, devices: 12, locs: 5 },
    red: { name: 'Red', pros: 40, devices: 60, locs: 5, centros: 5 }
  };
  const NEXT = { prueba: null, basico: 'consultorio', consultorio: 'centro', centro: 'red', red: null };
  A.PLAN_INFO = PLAN;
  const lic = () => (CL && CL.lic) || null;
  const real = () => !!(CL && CL.session && !A.DEMO);
  /* sin cuenta (modo prueba con datos de ejemplo) no hay límites: es solo para mirar */
  A.limits = () => {
    const l = lic(); if (!real() || !l) return null;
    const p = PLAN[l.plan] || PLAN.prueba;
    return { plan: l.plan, name: p.name, pros: l.lim_pros || p.pros, devices: l.lim_devices || p.devices, locs: l.max_locs || p.locs };
  };
  A.locLimit = () => { const L = A.limits(); return L ? Math.max(1, Math.min(5, L.locs)) : 5; };
  /* el servidor rechaza estos datos si se pasan del plan: tampoco se intentan subir */
  A.recAllowed = (k, v) => {
    const L = A.limits(); if (!L) return true;
    if (k === 'pros') return !Array.isArray(v) || v.length <= L.pros;
    if (k === 'setup') return !v || (v.type || 'solo') === 'solo' || L.pros >= 2;
    if (k === 'cfg') return !v || !Array.isArray(v.locs) || v.locs.length <= L.locs;
    return true;
  };
  const over = () => { const L = A.limits(); if (!L) return null; const o = []; if (A.PROS.length > L.pros) o.push('pros'); if (S.setup && S.setup.type === 'centro' && L.pros < 2) o.push('type'); if (Array.isArray(A.CFG.locs) && A.CFG.locs.length > L.locs) o.push('locs'); return o.length ? o : null; };

  /* ---------- aviso: «tu plan incluye…» con botón para pedir el cambio ---------- */
  const upgradeLink = what => { const sup = A.SUPPORT || {}, L = A.limits(), nx = L && NEXT[L.plan]; const t = 'Hola, quiero ' + (nx ? 'pasar al plan ' + PLAN[nx].name : 'ampliar mi plan') + ' de OdontoVoz (' + what + '). Mi cuenta: ' + ((CL.session && CL.session.user.email) || ''); return sup.whatsapp ? 'https://wa.me/' + String(sup.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(t) : 'mailto:' + (sup.email || 'somosroan@gmail.com') + '?subject=' + encodeURIComponent('Cambio de plan') + '&body=' + encodeURIComponent(t); };
  function planBlock(kind) {
    const L = A.limits(), nx = L && NEXT[L.plan], back = S.modal;
    const txt = { pros: 'Tu plan <b>' + esc(L.name) + '</b> incluye <b>' + L.pros + ' profesional' + (L.pros > 1 ? 'es' : '') + '</b>.', type: 'Tu plan <b>' + esc(L.name) + '</b> es para <b>un profesional</b>. Para trabajar como consultorio o centro, con varios odontólogos y recepción, hace falta el plan Consultorio o Centro.', devices: 'Tu plan <b>' + esc(L.name) + '</b> permite <b>' + L.devices + ' equipos</b>.' }[kind];
    S.modal = { type: 'planLim', html: txt, nx, what: { pros: 'más profesionales', type: 'trabajar como centro', devices: 'más equipos' }[kind], back };
    A.renderModal();
  }
  MF.planLim = m => A.modalShell('Límite de tu plan', '<p>' + m.html + '</p>' + (m.nx ? '<div class="acct-box"><b>Plan ' + esc(PLAN[m.nx].name) + '</b><span>Hasta ' + PLAN[m.nx].pros + ' profesionales · ' + PLAN[m.nx].devices + ' equipos</span></div>' : '') + '<p class="hint">Escribinos y lo cambiamos en el momento: tus datos quedan igual.</p>',
    '<button class="btn" data-act="planLimBack">Volver</button><a class="btn primary" target="_blank" rel="noopener" href="' + esc(upgradeLink(m.what)) + '">Pedir el cambio de plan</a>');
  A.acts.planLimBack = () => { const b = S.modal && S.modal.back; S.modal = b || null; A.renderModal(); };
  A.planBlock = planBlock;

  /* ---------- profesionales ---------- */
  const canAddPro = () => { const L = A.limits(); return !L || A.PROS.length < L.pros; };
  ['cfgProNew', 'cfgProBack'].forEach(k => { const prev = A.acts[k]; if (!prev) return; A.acts[k] = (el, ev) => { if (!canAddPro()) { planBlock('pros'); return; } return prev(el, ev); }; });
  const wizPrev = A.acts.cfgWizDone;
  if (wizPrev) A.acts.cfgWizDone = (el, ev) => { if (!canAddPro()) { planBlock('pros'); return; } return wizPrev(el, ev); };
  /* ---------- tipo de cuenta ---------- */
  const typeGoPrev = A.acts.acctTypeGo;
  if (typeGoPrev) A.acts.acctTypeGo = (el, ev) => { const L = A.limits(); if (L && S.modal && S.modal.t === 'centro' && L.pros < 2 && (!S.setup || S.setup.type !== 'centro')) { planBlock('type'); return; } return typeGoPrev(el, ev); };
  const setupGoPrev = A.acts.setupGo;
  if (setupGoPrev) A.acts.setupGo = (el, ev) => { const L = A.limits(), m = S.modal; if (L && m && m.f && m.f.type === 'centro' && L.pros < 2) { planBlock('type'); return; } return setupGoPrev(el, ev); };
  /* los nombres de los tipos de cuenta, iguales a los planes de la web */
  const rename = h => h
    .replace('<b>Soy un odontólogo</b><span>Consultorio individual</span>', '<b>Profesional</b><span>Un odontólogo, en uno o varios consultorios</span>')
    .replace('<b>Somos un centro odontológico</b><span>Dos o más odontólogos</span>', '<b>Consultorio o centro</b><span>Varios odontólogos y recepción (planes Consultorio y Centro)</span>')
    .replace('<b>Odontólogo</b><span>Consultorio individual</span>', '<b>Profesional</b><span>Un odontólogo</span>')
    .replace('<b>Centro odontológico</b><span>Dos o más profesionales</span>', '<b>Consultorio o centro</b><span>Varios odontólogos y recepción</span>');
  const limLine = () => { const L = A.limits(); return L ? '<div class="pl-line">Tu plan: <b>' + esc(L.name) + '</b> · hasta ' + L.pros + ' profesional' + (L.pros > 1 ? 'es' : '') + ' · ' + L.devices + ' equipos</div>' : ''; };
  ['setup', 'acctType'].forEach(k => { const prev = MF[k]; if (!prev) return; MF[k] = m => { const h = rename(prev(m)); return h.replace('<div class="setup-grid">', limLine() + '<div class="setup-grid">'); }; });
  /* la lista de profesionales muestra cuántos permite el plan */
  const cfgPrev = MF.cfg;
  if (cfgPrev) MF.cfg = m => {
    let h = cfgPrev(m); const L = A.limits();
    if (L && m.tab === 'pros' && !m.sel && !m.wiz && !m.rm) {
      const n = A.PROS.length, full = n >= L.pros;
      h = h.replace('<button class="btn primary" data-act="cfgProNew">+ Agregar profesional</button>', '<span class="pl-count' + (n > L.pros ? ' bad' : '') + '">' + n + ' de ' + L.pros + ' profesionales del plan ' + esc(L.name) + '</span><button class="btn primary" data-act="cfgProNew">' + (full ? 'Sumar más profesionales' : '+ Agregar profesional') + '</button>');
    }
    return h;
  };

  /* ---------- equipos ---------- */
  const ago = iso => { if (!iso) return ''; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 2 ? 'recién' : m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' días'; };
  let devList = null;
  async function loadDevices() { try { devList = await CL.api('/rest/v1/rpc/ov_device_list', { method: 'POST', body: {} }); } catch (e) { devList = null; } return devList; }
  function devRows(list, me, canRemove) {
    return '<ul class="dv-list">' + (list || []).map(d => '<li><span class="dv-n"><b>' + esc(d.name || 'Equipo') + '</b>' + (d.id === me ? ' <span class="chip ok">este</span>' : '') + '<small>Usado ' + ago(d.last_seen) + '</small></span>' + (canRemove && d.id !== me ? '<button class="btn small" data-act="devRemove" data-id="' + esc(d.id) + '">Liberar</button>' : '') + '</li>').join('') + '</ul>';
  }
  A.onDeviceFull = r => { if (S.modal && S.modal.type === 'devFull') { S.modal.r = r; return; } S.modal = { type: 'devFull', r }; A.renderModal(); };
  MF.devFull = m => {
    const r = m.r || {}, L = A.limits();
    return '<div class="modal-scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="Límite de equipos"><div class="m-head"><h2>Este equipo no está habilitado</h2></div><div class="m-body">' +
      '<p>Tu plan <b>' + esc((PLAN[r.plan] || {}).name || (L && L.name) || '') + '</b> permite <b>' + (r.limit || (L && L.devices) || '') + ' equipos</b> y ya están todos en uso. Para usar este, liberá uno que ya no uses (por ejemplo, un celular viejo):</p>' +
      devRows(r.devices, null, true) + '<div class="hint" id="dvMsg">Podés liberar hasta 4 equipos por mes. El equipo liberado deja de sincronizar hasta que vuelva a entrar.</div></div>' +
      '<div class="m-foot"><button class="btn" data-act="acctOut">Cerrar sesión</button><a class="btn" target="_blank" rel="noopener" href="' + esc(upgradeLink('más equipos')) + '">Pedir más equipos</a><button class="btn primary" data-act="devRetry">Reintentar</button></div></div></div>';
  };
  A.acts.devRemove = async el => {
    const id = el.getAttribute('data-id'), msg = $('#dvMsg'); el.disabled = true;
    try {
      const r = await CL.api('/rest/v1/rpc/ov_device_remove', { method: 'POST', body: { p_id: id } });
      if (!r || !r.ok) { if (msg) msg.textContent = (r && r.msg) || 'No se pudo liberar.'; el.disabled = false; return; }
      if (S.modal && S.modal.type === 'devFull') { const ok = await CL.devCheck(); if (ok) { S.modal = null; A.renderModal(); A.toast('Listo: este equipo quedó habilitado.'); CL.sync(); } }
      else { await loadDevices(); A.renderModal(); A.toast('Equipo liberado.'); }
    } catch (e) { if (msg) msg.textContent = e.message || 'Sin conexión.'; el.disabled = false; }
  };
  /* el equipo fue desconectado (desde el panel o desde otro equipo): se cierra la sesión y se borran los datos de acá */
  let revoking = false;
  A.onDeviceRevoked = r => {
    if (revoking) return; revoking = true;
    try { localStorage.removeItem('odontovoz.devid'); localStorage.setItem('odontovoz.revoked', JSON.stringify({ by: (r && r.by) || 'user', at: new Date().toISOString() })); } catch (e) { /* nada */ }
    try { if (CL.signOut) CL.signOut(true); } catch (e) { /* nada */ }
  };
  /* al volver a abrir (ya sin sesión), se explica por qué */
  (function () {
    let info = null; try { info = JSON.parse(localStorage.getItem('odontovoz.revoked') || 'null'); } catch (e) { info = null; }
    if (!info) return;
    const show = () => { const w = document.getElementById('loginWrap'); const msg = '<div class="dv-revoked" role="alert"><b>Este equipo fue desconectado de la cuenta</b><span>' + (info.by === 'admin' ? 'Lo hizo el soporte de OdontoVoz.' : 'Se liberó desde otro equipo de la cuenta.') + ' Por seguridad se cerró la sesión y se borraron los datos de este equipo (en la nube están intactos). Para volver a usarlo, ingresá de nuevo: va a ocupar un lugar de equipo de tu plan.</span><button class="btn small" data-act="devRevokedOk">Entendido</button></div>';
      if (w && !w.querySelector('.dv-revoked')) w.insertAdjacentHTML('afterbegin', msg); else if (!w && !document.querySelector('.dv-revoked')) document.body.insertAdjacentHTML('afterbegin', msg); };
    setTimeout(show, 600); setTimeout(show, 2000);
  })();
  A.acts.devRevokedOk = el => { try { localStorage.removeItem('odontovoz.revoked'); } catch (e) { /* nada */ } const b = el.closest('.dv-revoked'); if (b) b.remove(); };
  A.acts.devRetry = async () => { const ok = await CL.devCheck(); if (ok) { S.modal = null; A.renderModal(); CL.sync(); } };
  /* «Cuenta y equipos»: plan, uso y lista de equipos */
  const acctPrev = MF.acct;
  if (acctPrev) MF.acct = m => {
    const h = acctPrev(m), L = A.limits(); if (!L) return h;
    if (!devList) loadDevices().then(() => { if (S.modal && S.modal.type === 'acct') A.renderModal(); });
    const d = devList, block = '<div class="block"><h3>Tu plan: ' + esc(L.name) + '</h3><div class="pl-grid"><span><b>' + A.PROS.length + '/' + L.pros + '</b>profesionales</span><span><b>' + (d ? d.devices.length : '…') + '/' + L.devices + '</b>equipos</span>' + (A.isSolo() ? '<span><b>' + ((A.CFG.locs || []).length || 1) + '/' + L.locs + '</b>consultorios</span>' : '') + '</div>' +
      (d ? devRows(d.devices, d.me, true) + '<div class="hint" style="margin:4px 0 0">Liberá los equipos que ya no uses' + (d.removals_left != null ? ' (te quedan ' + d.removals_left + ' este mes)' : '') + '.</div>' : '') +
      '<div class="row-btns"><a class="btn small" target="_blank" rel="noopener" href="' + esc(upgradeLink('ampliar el plan')) + '">Cambiar de plan</a></div></div>';
    return h.replace('<div class="block"><h3>Bloqueo con PIN</h3>', block + '<div class="block"><h3>Bloqueo con PIN</h3>');
  };

  /* ---------- si el plan bajó y hay más de lo permitido: aviso fijo ---------- */
  function overBanner() {
    const o = over(), old = $('#planOver'); if (!o) { if (old) old.remove(); return; }
    const L = A.limits(), txt = o.indexOf('type') >= 0 ? 'Tu plan ' + L.name + ' es para un profesional: la cuenta está como consultorio o centro.' : o.indexOf('pros') >= 0 ? 'Tu plan ' + L.name + ' incluye ' + L.pros + ' profesional' + (L.pros > 1 ? 'es' : '') + ' y tenés ' + A.PROS.length + '.' : 'Tu plan incluye ' + L.locs + ' consultorio' + (L.locs > 1 ? 's' : '') + ' y cargaste ' + A.CFG.locs.length + '.';
    const h = '<div class="plan-over" id="planOver" role="alert"><span><b>' + esc(txt) + '</b> Esos cambios no se guardan en la nube hasta que lo ajustes o cambies de plan.</span><span class="row-btns"><button class="btn small" data-act="cfgOpen" data-t="pros">Ajustar</button><a class="btn small primary" target="_blank" rel="noopener" href="' + esc(upgradeLink('ajustar el plan')) + '">Cambiar de plan</a></span></div>';
    if (old) old.outerHTML = h; else { const main = document.querySelector('main') || document.body; main.insertAdjacentHTML('afterbegin', h); }
  }
  const afterPrev = A.afterRefresh;
  A.afterRefresh = () => { if (afterPrev) afterPrev(); try { overBanner(); } catch (e) { /* nada */ } };

  const css = document.createElement('style');
  css.textContent = '.pl-line{font-size:13px;color:var(--ink-2);margin:0 0 10px;padding:6px 10px;border-radius:8px;background:var(--surface-2)}.pl-count{font-size:13px;color:var(--ink-2);align-self:center}.pl-count.bad{color:var(--pat)}' +
    '.pl-grid{display:flex;gap:16px;flex-wrap:wrap;margin:6px 0}.pl-grid span{display:flex;flex-direction:column;font-size:12px;color:var(--ink-2)}.pl-grid b{font:700 18px var(--f-mono);color:var(--ink)}' +
    '.dv-list{list-style:none;margin:8px 0;padding:0;display:flex;flex-direction:column;gap:6px}.dv-list li{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 10px}.dv-n{flex:1;display:flex;flex-direction:column}.dv-n small{color:var(--ink-2)}' +
    '.dv-revoked{display:flex;flex-direction:column;gap:6px;margin:12px auto;max-width:520px;padding:14px 16px;border-radius:12px;background:var(--alert-bg);color:var(--alert-ink);border:1px solid var(--pat);font-size:14px;position:relative;z-index:200}.dv-revoked .btn{align-self:flex-start}.plan-over{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 12px;padding:10px 14px;border-radius:12px;background:var(--warn-soft);color:var(--ink);border:1px solid var(--warn);font-size:14px}';
  document.head.appendChild(css);
})();
