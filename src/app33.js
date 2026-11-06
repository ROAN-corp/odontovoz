/* ===== 1.23: cuentas del equipo: secretarias y odontólogos entran con su propio usuario, gratis, y ven solo lo de su puesto ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  if (!CL) return;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const real = () => !!(CL.session && !A.DEMO);
  /* A._tmMember: solo para probar las pantallas en el modo de prueba (desde la consola) */
  const mb = () => (real() && CL.member) || (A.DEMO && A._tmMember) || null;
  A.memberNow = mb;
  const role = () => { const m = mb(); return m ? m.role : 'dueno'; };
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const isOwner = () => (real() || (A.DEMO && A._tmOwner)) && !mb();
  A.mbRole = role; A.isMember = () => !!mb();
  const rpc = (fn, body) => CL.api('/rest/v1/rpc/' + fn, { method: 'POST', body: body || {} });
  const noServer = e => e && (e.status === 404 || /could not find the function|schema cache/i.test(String(e.message)));
  const RN = { admin: 'Administración', recepcion: 'Recepción', profesional: 'Profesional', asistente: 'Asistente', dueno: 'Dueño' };
  const RDESC = {
    recepcion: 'Agenda, turnos, pacientes (datos y cuenta, sin la historia clínica), cobros y la caja de su consultorio.',
    profesional: 'Su agenda, los pacientes con la historia clínica, odontograma, prácticas, presupuestos y cobros. No ve la caja, las liquidaciones ni los números de la empresa.',
    asistente: 'Agenda, pacientes e historia clínica. No ve la plata.',
    admin: 'Todo, salvo los sueldos y las metas. No puede cambiar el plan ni borrar la cuenta.'
  };
  const sedes = () => (A.locs ? A.locs() : []);
  /* en modo Empresa cada sede es un centro (adentro tiene sus consultorios) */
  const LW = pl => ((A.isEmp && A.isEmp()) ? 'centro' : 'consultorio') + (pl ? 's' : '');
  const LWc = () => { const w = LW(); return w.charAt(0).toUpperCase() + w.slice(1); };
  const sedeName = id => { const l = sedes().filter(x => x.id === id)[0]; return l ? l.name : ''; };
  const proName = id => { const p = A.PROS.filter(x => x.id === id)[0]; return p ? p.name : ''; };
  /* el enlace siempre apunta a la app publicada (desde el APK la dirección propia es «localhost» y no sirve para otros) */
  const PUB_APP = 'https://roan-corp.github.io/odontovoz/app/';
  const appUrl = () => (/^https?:$/.test(location.protocol) && !/^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname) && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? location.origin + location.pathname.replace(/index\.html$/, '') : PUB_APP);
  const fmtWhen = t => { if (!t) return 'nunca'; const d = new Date(t), s = (Date.now() - d) / 1000; return s < 120 ? 'recién' : s < 3600 ? 'hace ' + Math.round(s / 60) + ' min' : s < 86400 ? 'hace ' + Math.round(s / 3600) + ' h' : A.fmtDMY(d.toISOString().slice(0, 10)); };

  /* =====================================================================
     1) EL ENLACE DE INVITACIÓN: …/app/?invitacion=CODIGO
     ===================================================================== */
  (function () {
    try {
      const q = new URLSearchParams(location.search), c = (q.get('invitacion') || '').trim().toUpperCase();
      if (/^[A-Z0-9]{6,20}$/.test(c)) { LS.set('odontovoz.invite', c); q.delete('invitacion'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
    } catch (e) { /* nada */ }
  })();
  const pendingInv = () => LS.get('odontovoz.invite', '');
  let INV = null, invTabDone = false;
  async function loadInv() {
    const c = pendingInv(); if (!c || !CL.conf()) return;
    try { INV = await CL.http('/rest/v1/rpc/ov_invite_info', { method: 'POST', auth: false, body: { p_code: c } }); }
    catch (e) { INV = { ok: false, msg: e.offline ? 'Sin conexión: no pudimos revisar la invitación.' : noServer(e) ? 'El servidor todavía no recibe invitaciones.' : e.message }; }
    paintInv();
  }
  function paintInv() {
    const f = document.querySelector('#loginWrap .login-card'); if (!f) return;
    const old = f.querySelector('.inv-box'); if (old) old.remove();
    if (!pendingInv()) return;
    let h;
    if (!INV) h = '<span>Revisando la invitación…</span>';
    else if (INV.ok) h = '<b>Te invitaron a ' + esc(INV.clinic || 'un consultorio') + '</b><span>Como <b>' + esc(RN[INV.role] || INV.role) + '</b>' + (INV.sede_name ? ' en <b>' + esc(INV.sede_name) + '</b>' : '') + '.</span><span>Creá tu usuario con tu correo y una contraseña tuya. Para vos es gratis: la cuenta la paga el consultorio.</span>';
    else h = '<b>Invitación</b><span>' + esc(INV.msg || 'La invitación no es válida.') + '</span>';
    h += '<button type="button" class="linkbtn" data-act="invForget">' + (INV && !INV.ok ? 'Seguir sin invitación' : 'No es para mí') + '</button>';
    const h1 = f.querySelector('h1'); if (h1) h1.insertAdjacentHTML('afterend', '<div class="inv-box">' + h + '</div>');
    const up = f.getAttribute('data-sub') === 'loginUp';
    if (up && INV && INV.ok) {
      const b = f.querySelector('button[type="submit"]'); if (b) b.textContent = 'Crear mi usuario';
      const t = f.querySelector('h1'); if (t) t.textContent = 'Crear mi usuario';
    }
  }
  A.acts.invForget = () => { LS.set('odontovoz.invite', null); INV = null; paintInv(); };
  const slPrev = CL.showLogin;
  CL.showLogin = (tab, msg) => {
    if (pendingInv() && !invTabDone && !tab) tab = 'up';
    if (pendingInv() && !invTabDone && tab === 'in' && !msg) tab = 'up';
    invTabDone = true;
    slPrev(tab, msg); paintInv();
  };
  if (pendingInv()) loadInv();
  /* el enlace abre directamente «Crear mi usuario» */
  if (pendingInv() && !CL.session) setTimeout(() => { if (CL.session || !pendingInv() || !CL.conf() || $('#loginWrap')) return; const it = $('#intro'); if (it) it.remove(); CL.showLogin('up'); }, 700);
  /* al registrarse con el enlace, la persona queda en el equipo del dueño (no se le crea una cuenta propia) */
  const suPrev = CL.signUp;
  CL.signUp = (email, pass, meta) => suPrev(email, pass, Object.assign({}, meta || {}, pendingInv() ? { invite: pendingInv() } : {}));

  /* =====================================================================
     2) AL INGRESAR: aceptar la invitación pendiente y, si cambió el equipo, empezar de cero en este equipo
     ===================================================================== */
  let accepting = false;
  async function maybeAccept() {
    const c = pendingInv(); if (!c || !CL.session || accepting) return;
    accepting = true;
    try {
      const r = await rpc('ov_invite_accept', { p_code: c });
      if (r && r.ok) { LS.set('odontovoz.invite', null); }
      else if (r) { LS.set('odontovoz.invite', null); if (!(CL.member)) setTimeout(() => A.toast(r.msg || 'No se pudo usar la invitación.'), 600); }
    } catch (e) { if (noServer(e)) LS.set('odontovoz.invite', null); }
    finally { accepting = false; }
  }
  function wipeLocal() {
    A.noSave = true;
    try { Object.keys(localStorage).forEach(k => { if (k.indexOf('odontovoz.real.v1') === 0) localStorage.removeItem(k); }); } catch (e) { /* nada */ }
    ['odontovoz.cloud.since', 'odontovoz.person', 'odontovoz.sedeSel', 'odontovoz.scope'].forEach(k => LS.set(k, null));
    try { indexedDB.deleteDatabase('odontovoz.media'); } catch (e) { /* nada */ }
  }
  const clPrev = CL.checkLicense;
  CL.checkLicense = async force => {
    await maybeAccept();
    const bM = CL.member || null, bO = CL.ownerId || null;
    await clPrev(force || !!pendingInv());
    const aM = CL.member || null, aO = CL.ownerId || null;
    const flip = !bM !== !aM || (bM && aM && bO && aO && bO !== aO);
    if (flip && CL.session) {
      /* entró a un equipo o lo sacaron: los datos de este equipo eran de otra cuenta */
      wipeLocal(); try { await CL.baseClear(); } catch (e) { /* nada */ }
      setTimeout(() => location.reload(), 120);
      const er = new Error(aM ? 'Entrando a ' + 'tu equipo de trabajo…' : 'Actualizando…'); er.offline = true; throw er;
    }
    if (bM && aM && JSON.stringify(bM) !== JSON.stringify(aM)) { meDone = false; setTimeout(() => A.refresh(), 0); }
  };

  /* =====================================================================
     3) LO QUE CADA PUESTO PUEDE HACER (el servidor también lo controla)
     ===================================================================== */
  /* lo que no se sube desde el equipo de una persona del equipo (el servidor lo rechazaría) */
  const raPrev = A.recAllowed;
  A.recAllowed = (k, v) => {
    if (raPrev && !raPrev(k, v)) return false;
    const m = mb(); if (!m) return true;
    if (k === 'setup') return false;
    const r = m.role;
    if (r === 'admin') return k !== 'empo';
    if (k === 'cfg' || k === 'pros' || k === 'staff' || k === 'liq' || k === 'empo' || k === 'audit:todo') return false;
    if (k === 'cash') return r === 'recepcion' && !(CL.empresaOn || isEmp());
    if (k.indexOf('caja:') === 0) return r === 'recepcion' && !!m.sede && k.slice(5) === m.sede;
    if (k.indexOf('audit:') === 0) return !!m.sede && k.slice(6) === m.sede;
    return true;
  };
  const TAB_OK = {
    admin: () => true,
    recepcion: t => t !== 'liq' && t !== 'empresa',
    profesional: t => t !== 'liq' && t !== 'empresa' && t !== 'caja',
    asistente: t => t !== 'liq' && t !== 'empresa' && t !== 'caja'
  };
  const tabOk = t => { const m = mb(); if (!m) return true; return (TAB_OK[m.role] || TAB_OK.asistente)(t); };
  A.mbTabOk = tabOk;
  /* acciones que no son del puesto */
  const NEVER = /^(reqOpen|reqSend|planOpen|licOpen|empOn|empOff|modeOpen|changeAccount|role$|empTryScope|empDevScope|empWhereGo|tmNew|tmGo|tmSet|tmOff|tmOn|tmRevoke)/;
  const NOT_ADMIN = /^(cfgOpen|tnOpen|tnSave|tnToggle|empPerEdit|empPerSave|empPerDel|empSalEdit|empGoalEdit|treeProNew|treeProAdd|treeProMove|treeMove|proNew|proEdit|proDel|locNew|locEdit|locDel|importOpen|catalogOpen)/;
  const NOT_REC = /^(catalogOpen)/;
  document.addEventListener('click', e => {
    const m = mb(); if (!m) return;
    const el = e.target.closest && e.target.closest('[data-act]'); if (!el || el.closest('#loginWrap')) return;
    const a = el.getAttribute('data-act') || '';
    let no = NEVER.test(a) && !(m.role === 'admin' && /^(empDevScope)$/.test(a));
    if (!no && m.role !== 'admin' && NOT_ADMIN.test(a)) no = !(m.role === 'profesional' && NOT_REC.test(a));
    if (a === 'tab' && !tabOk(el.getAttribute('data-tab'))) no = true;
    if (no) { e.stopImmediatePropagation(); e.preventDefault(); A.toast('Eso lo maneja el dueño de la cuenta.'); }
  }, true);
  /* por voz tampoco */
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    const m = mb();
    if (m && m.role !== 'admin') {
      let pr = null; try { pr = window.OVCmd.parse(text, { today: A.today(), pros: A.PROS }); } catch (e) { /* nada */ }
      const dest = pr && (pr.tab || pr.section || pr.dest || pr.to || '');
      if (pr && /liq|empresa/.test(String(dest)) || pr && /caja/.test(String(dest)) && m.role !== 'recepcion') return { ok: false, msg: 'Eso lo maneja el dueño de la cuenta.' };
    }
    return execPrev(text, o);
  };

  /* la pantalla según el puesto */
  let meDone = false;
  function enforce(m) {
    const r = m.role;
    if (r === 'recepcion') { S.role = 'recepcion'; if (S.uimode === 'atencion') S.uimode = 'admin'; }
    else if (r === 'profesional' || r === 'asistente') S.role = 'profesional';
    if ((r === 'profesional' || r === 'asistente') && m.pro && A.PROS.some(p => p.id === m.pro)) {
      S.me = m.pro;
      if (!meDone) { meDone = true; S.proSel = [m.pro]; }
    }
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    const m = mb(), b = document.body;
    b.classList.toggle('mb-on', !!m);
    ['admin', 'recepcion', 'profesional', 'asistente'].forEach(x => b.classList.toggle('mb-' + x, !!m && m.role === x));
    if (m) enforce(m);
    if (arPrev) arPrev();
    if (m && !tabOk(S.tab)) { S.tab = 'inicio'; setTimeout(() => A.refresh(), 0); return; }
    offScreen();
  };
  /* mientras baja los datos del consultorio, la persona del equipo no arma una cuenta nueva */
  const setupPrev = MF.setup;
  if (setupPrev) MF.setup = m => ((mb() || (CL.session && pendingInv())) ? A.modalShell('Conectando con el consultorio', '<p>Estamos bajando los datos del consultorio. Tarda unos segundos.</p><p class="hint">Si tarda mucho, revisá la conexión a internet.</p>', '') : setupPrev(m));

  /* le quitaron el acceso: se borra lo que había en este equipo y se avisa */
  function offScreen() {
    let w = $('#mbOff');
    const on = real() && CL.memberOff && !CL.member;
    if (!on) { if (w) w.remove(); return; }
    if (w) return;
    w = document.createElement('div'); w.id = 'mbOff'; w.className = 'login-wrap';
    w.innerHTML = '<div class="login-card"><h1>Ya no tenés acceso</h1><p>El dueño de la cuenta te quitó el acceso a su consultorio. Los datos que había en este equipo se borraron.</p><p class="hint">Si es un error, pedile que te lo devuelva desde su equipo (Cuenta y equipos › Usuarios del equipo).</p><button class="btn primary" data-act="mbOut" style="min-height:48px">Cerrar sesión</button></div>';
    document.body.appendChild(w);
  }
  A.acts.mbOut = () => CL.signOut(true);

  /* en el menú: de quién es la cuenta y el puesto */
  const ccPrev = A.cloudChrome;
  A.cloudChrome = () => {
    ccPrev();
    const m = mb(), box = document.querySelector('#drAcct .acct-box'); if (!m || !box || box.querySelector('.mb-line')) return;
    const b = box.querySelector('b'); if (b) b.insertAdjacentHTML('afterend', '<span class="mb-line">' + esc(RN[m.role] || m.role) + (m.sede && sedeName(m.sede) ? ' · ' + esc(sedeName(m.sede)) : '') + ' en ' + esc(A.CLINIC || 'el consultorio') + '</span>');
  };

  /* =====================================================================
     4) CUENTA Y EQUIPOS: el dueño invita y maneja su equipo; la persona ve de quién es la cuenta
     ===================================================================== */
  const acctPrev = MF.acct;
  if (acctPrev) MF.acct = m => {
    let h = acctPrev(m);
    const mm = mb();
    if (mm) {
      const box = '<div class="block mb-block"><h3>Tu puesto</h3><div class="acct-box"><b>' + esc(RN[mm.role] || mm.role) + (mm.sede && sedeName(mm.sede) ? ' · ' + esc(sedeName(mm.sede)) : '') + '</b><span>Usás la cuenta de <b>' + esc(A.CLINIC || 'el consultorio') + '</b>. La paga el dueño: para vos es gratis.</span><span>' + esc(RDESC[mm.role] || '') + '</span></div><div class="hint" style="margin:6px 0 0">' + (mm.sub ? 'Entrás con la cuenta <b>' + esc((CL.code || '')) + '</b> y el usuario <b>' + esc(mm.username || '') + '</b>. Si te olvidás la contraseña, pedile al dueño que te la cambie desde Equipo. Para entrar en otro lugar donde trabajes, tocá «Entrar en otro lugar».' : 'Tu correo y tu contraseña son tuyos.') + ' Si dejás de trabajar ahí, el dueño te quita el acceso y los datos se borran de tus equipos.</div><div class="row-btns" style="margin-top:8px"><button class="btn small" data-act="lgOtherPlace">Entrar en otro lugar</button></div></div>';
      return h.replace('<div class="field" style="margin-top:10px">', box + '<div class="field" style="margin-top:10px">');
    }
    if (isOwner()) {
      const n = TEAM && TEAM.ok ? TEAM.members.filter(x => x.active).length : null;
      const block = '<div class="block"><h3>Usuarios del equipo</h3><div class="hint" style="margin:0 0 6px">Creale un usuario a tu secretaria y a los odontólogos que trabajan con vos: entran con el código de tu cuenta, su usuario y su contraseña (no necesitan correo), gratis, y ven solo lo de su puesto.</div><div class="row-btns"><button class="btn small primary" data-act="teamOpen">' + (n ? 'Ver el equipo (' + n + ')' : 'Crear usuarios') + '</button></div></div>';
      h = h.replace('<div class="block"><h3>Tus datos</h3>', block + '<div class="block"><h3>Tus datos</h3>');
      if (h.indexOf('data-act="teamOpen"') < 0) h = h.replace('<div class="block"><h3>Bloqueo con PIN</h3>', block + '<div class="block"><h3>Bloqueo con PIN</h3>');
    }
    return h;
  };

  let TEAM = null, teamErr = '', NEWINV = null, NEWSUB = null, teamBusy = false;
  const noAcc = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sugUser = n => { const w = noAcc(n).replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean); return w.length ? (w.length > 1 ? w[0] + '.' + w[w.length - 1] : w[0]).slice(0, 30) : ''; };
  const sugPass = () => { const al = 'abcdefghjkmnpqrstuvwxyz', d = '23456789'; let p = ''; for (let i = 0; i < 5; i++) p += al[Math.floor(Math.random() * al.length)]; for (let i = 0; i < 3; i++) p += d[Math.floor(Math.random() * d.length)]; return p; };
  const subText = n => 'Hola ' + (n.name || '').split(' ')[0] + '. Ya tenés tu usuario de OdontoVoz en ' + (A.CLINIC || 'el consultorio') + '.\nEntrá a ' + PUB_APP + ' (o a la app) y tocá «Entrar con usuario del equipo».\nCuenta: ' + n.code + '\nUsuario: ' + n.user + '\nContraseña: ' + n.pass + '\nDespués podés cambiar la contraseña desde Menú › Cuenta.';
  A.acts.tmMode = el => { S.tmMode = el.getAttribute('data-m'); paintTeam(); };
  A.acts.tmSubCopy = async () => { const t = subText(NEWSUB); try { await navigator.clipboard.writeText(t); A.toast('Datos copiados.'); } catch (e) { A.toast(t); } };
  A.acts.tmCodeEdit = () => { S.modal = { type: 'tmCode', v: TEAM.code || '' }; A.renderModal(); };
  MF.tmCode = m => A.modalShell('Código de la cuenta', '<p>Es lo que escribe tu equipo en «Cuenta» para entrar. Que sea corto y fácil, por ejemplo el nombre del consultorio.</p><div class="field"><label for="tcV">Código</label><input id="tcV" value="' + esc(m.v) + '" autocapitalize="none" spellcheck="false" maxlength="20"></div><p class="hint">De 4 a 20 letras o números, sin espacios ni acentos. Después de crear el primer usuario ya no se puede cambiar.</p><div class="hint bad" id="tcMsg"></div>', '<button class="btn" data-act="teamOpen">Cancelar</button><button class="btn primary" data-act="tmCodeSave">Guardar</button>');
  A.acts.tmCodeSave = async () => {
    const v = noAcc(($('#tcV') || {}).value).replace(/[^a-z0-9]/g, ''), o = $('#tcMsg');
    try { const r = await rpc('ov_code_set', { p_code: v }); if (!r || !r.ok) { if (o) o.textContent = (r && r.msg) || 'No se pudo.'; return; } A.toast('Código guardado: ' + r.code); A.acts.teamOpen(); }
    catch (e) { if (o) o.textContent = noServer(e) ? 'Falta actualizar el servidor (subusuarios.sql).' : e.message || 'Sin conexión.'; }
  };
  A.acts.tmPass = el => { const z = memberOf(el.getAttribute('data-id')); S.modal = { type: 'tmPassM', id: z.member, name: z.name || z.username, user: z.username, v: sugPass() }; A.renderModal(); };
  MF.tmPassM = m => A.modalShell('Nueva contraseña', '<p>Contraseña nueva para <b>' + esc(m.name) + '</b> (usuario ' + esc(m.user || '') + '). Se le cierra la sesión en sus equipos y entra con la nueva.</p><div class="field"><label for="tpV">Contraseña</label><input id="tpV" value="' + esc(m.v) + '" autocomplete="off" spellcheck="false"></div><div class="hint bad" id="tpMsg"></div>', '<button class="btn" data-act="teamOpen">Cancelar</button><button class="btn primary" data-act="tmPassGo">Guardar</button>');
  A.acts.tmPassGo = async () => {
    const m = S.modal, v = (($('#tpV') || {}).value || '').trim(), o = $('#tpMsg');
    if (v.length < 6) { if (o) o.textContent = 'Al menos 6 caracteres.'; return; }
    try { const r = await rpc('ov_sub_password', { p_member: m.id, p_pass: v }); if (!r || !r.ok) { if (o) o.textContent = (r && r.msg) || 'No se pudo.'; return; } NEWSUB = { name: m.name, code: TEAM.code, user: m.user, pass: v }; if (A.empAudit) A.empAudit('Cambió la contraseña de ' + m.name + '.'); A.acts.teamOpen(); }
    catch (e) { if (o) o.textContent = e.message || 'Sin conexión.'; }
  };
  async function loadTeam() {
    if (!isOwner() || teamBusy) return; teamBusy = true;
    try { TEAM = await rpc('ov_team'); teamErr = ''; }
    catch (e) { teamErr = noServer(e) ? 'Falta actualizar el servidor para usar los usuarios del equipo.' : e.offline ? 'Sin conexión.' : (e.message || 'No se pudo.'); }
    teamBusy = false; paintTeam();
  }
  function paintTeam() {
    if (S.modal && S.modal.type === 'team') A.renderModal();
    const host = $('#tmEmp'); if (host) host.innerHTML = teamHTML();
  }
  A.acts.teamOpen = () => { S.modal = { type: 'team' }; A.renderModal(); loadTeam(); };
  const invLink = code => appUrl() + '?invitacion=' + encodeURIComponent(code);
  const waText = i => 'Hola' + (i.name ? ' ' + i.name.split(' ')[0] : '') + '. Te invito a usar OdontoVoz en ' + (A.CLINIC || 'el consultorio') + ' como ' + (RN[i.role] || i.role).toLowerCase() + (i.sede && sedeName(i.sede) ? ' en ' + sedeName(i.sede) : '') + '. Entrá a este enlace y creá tu usuario con tu correo (para vos es gratis): ' + invLink(i.code) + ' . El enlace vence en 7 días y sirve una sola vez.';
  const sedeOpts = (sel, any) => (any ? '<option value=""' + (!sel ? ' selected' : '') + '>Todos los ' + LW(true) + '</option>' : '') + sedes().map(l => '<option value="' + esc(l.id) + '"' + (sel === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('');
  const proOpts = sel => '<option value="">— Elegí —</option>' + A.PROS.map(p => '<option value="' + esc(p.id) + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');
  const roleOpts = sel => ['recepcion', 'profesional', 'asistente', 'admin'].map(r => '<option value="' + r + '"' + (sel === r ? ' selected' : '') + '>' + RN[r] + '</option>').join('');
  const manyLocs = () => sedes().length > 1 || isEmp();
  function teamHTML() {
    let x = '';
    if (teamErr) x += '<div class="hint bad">' + esc(teamErr) + '</div>';
    if (TEAM && TEAM.ok && TEAM.code !== undefined) {
      const locked = TEAM.members.some(z => z.sub);
      x += '<div class="tm-code"><span>Código de tu cuenta</span><b>' + esc(TEAM.code || '…') + '</b>' + (!locked && TEAM.code ? '<button class="btn small ghost" data-act="tmCodeEdit">Cambiar</button>' : '') + '<small>Tu equipo entra con este código, su usuario y su contraseña.' + (!locked ? ' Elegilo antes de crear el primer usuario: después no se puede cambiar.' : '') + '</small></div>';
    }
    if (NEWSUB) {
      x += '<div class="tm-new"><b>Usuario listo para ' + esc(NEWSUB.name) + '</b><p class="hint" style="margin:4px 0">Pasale estos datos. En OdontoVoz toca «Entrar con usuario del equipo». Puede cambiar la contraseña después desde Menú › Cuenta.</p><dl class="tm-cred"><dt>Cuenta</dt><dd>' + esc(NEWSUB.code) + '</dd><dt>Usuario</dt><dd>' + esc(NEWSUB.user) + '</dd><dt>Contraseña</dt><dd>' + esc(NEWSUB.pass) + '</dd></dl><div class="row-btns"><a class="btn small primary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(subText(NEWSUB)) + '">Mandar por WhatsApp</a><button class="btn small" data-act="tmSubCopy">Copiar datos</button><button class="btn small ghost" data-act="tmAnother">Crear otro usuario</button></div></div>';
    }
    /* nueva invitación */
    const f = S.tmForm || (S.tmForm = { role: 'recepcion', sede: (A.empSede && A.empSede()) || (sedes()[0] || {}).id || '', pro: '', name: '' });
    if (NEWSUB) { /* ya se mostró arriba */ } else if (NEWINV) {
      x += '<div class="tm-new"><b>Invitación lista para ' + esc(NEWINV.name || RN[NEWINV.role]) + '</b><p class="hint" style="margin:4px 0">Mandale este enlace. Entra, crea su usuario con su correo y ya queda en tu equipo. Vence en 7 días y sirve una sola vez.</p><input class="tm-link" readonly value="' + esc(invLink(NEWINV.code)) + '" aria-label="Enlace de invitación"><div class="row-btns"><a class="btn small primary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText(NEWINV)) + '">Mandar por WhatsApp</a><button class="btn small" data-act="tmCopy" data-code="' + esc(NEWINV.code) + '">Copiar enlace</button><button class="btn small ghost" data-act="tmAnother">Invitar a otra persona</button></div></div>';
    } else {
      const byMail = S.tmMode === 'mail';
      x += '<div class="tm-form"><div class="seg tm-mode" role="group"><button type="button" data-act="tmMode" data-m="user" aria-pressed="' + !byMail + '">Crear usuario (sin correo)</button><button type="button" data-act="tmMode" data-m="mail" aria-pressed="' + byMail + '">Invitar por correo</button></div><div class="tm-grid">' +
        '<div class="field"><label for="tmName">Nombre</label><input id="tmName" value="' + esc(f.name) + '" placeholder="Ej.: Marta" data-in="tmF" data-k="name"></div>' +
        '<div class="field"><label for="tmRole">Puesto</label><select id="tmRole" data-chg="tmF" data-k="role">' + roleOpts(f.role) + '</select></div>' +
        (manyLocs() ? '<div class="field"><label for="tmSede">' + LWc() + '</label><select id="tmSede" data-chg="tmF" data-k="sede">' + sedeOpts(f.sede, f.role === 'admin') + '</select></div>' : '') +
        (f.role === 'profesional' || f.role === 'asistente' ? '<div class="field"><label for="tmPro">' + (f.role === 'profesional' ? 'Es el profesional' : 'Trabaja con') + '</label><select id="tmPro" data-chg="tmF" data-k="pro">' + proOpts(f.pro) + '</select></div>' : '') +
        (!byMail ? '<div class="field"><label for="tmUser">Usuario</label><input id="tmUser" value="' + esc(f.user || '') + '" placeholder="Ej.: marta.gomez" autocapitalize="none" autocomplete="off" spellcheck="false" data-in="tmF" data-k="user"></div><div class="field"><label for="tmPass">Contraseña</label><input id="tmPass" value="' + esc(f.pass || (f.pass = sugPass())) + '" autocomplete="off" spellcheck="false" data-in="tmF" data-k="pass"></div>' : '') +
        '</div><p class="hint" style="margin:4px 0 8px">' + esc(RDESC[f.role] || '') + (f.role === 'profesional' ? ' Si el odontólogo todavía no está cargado, primero sumalo en Profesionales.' : '') + '</p><div class="row-btns"><button class="btn small primary" data-act="tmNew">' + (byMail ? 'Crear invitación' : 'Crear usuario') + '</button></div><div class="hint bad" id="tmMsg"></div></div>';
    }
    if (!TEAM) return x + '<div class="hint">Cargando el equipo…</div>';
    if (!TEAM.ok) return x;
    /* personas */
    x += '<h3 style="margin-top:14px">Personas con usuario <span class="count">' + TEAM.members.filter(z => z.active).length + '</span></h3>';
    x += TEAM.members.length ? '<div class="tm-list">' + TEAM.members.map(z => '<div class="tm-row' + (z.active ? '' : ' off') + '"><div class="tm-who"><b>' + esc(z.name || z.username || z.email || 'Sin nombre') + '</b><span>' + (z.sub ? 'Usuario: <b>' + esc(z.username || '') + '</b>' : esc(z.email || '')) + '</span><span>' + (z.active ? 'Último uso: ' + esc(fmtWhen(z.last_seen)) + ' · ' + z.devices + ' equipo' + (z.devices === 1 ? '' : 's') : 'Sin acceso') + '</span></div>' +
      (z.active ? '<div class="tm-ctl"><select aria-label="Puesto" data-chg="tmSet" data-k="role" data-id="' + esc(z.member) + '">' + roleOpts(z.role) + '</select>' + (manyLocs() ? '<select aria-label="Consultorio" data-chg="tmSet" data-k="sede" data-id="' + esc(z.member) + '">' + sedeOpts(z.sede, z.role === 'admin') + '</select>' : '') + (z.role === 'profesional' || z.role === 'asistente' ? '<select aria-label="Profesional" data-chg="tmSet" data-k="pro" data-id="' + esc(z.member) + '">' + proOpts(z.pro) + '</select>' : '') + (z.sub ? '<button class="btn small" data-act="tmPass" data-id="' + esc(z.member) + '">Cambiar contraseña</button>' : '') + '<button class="btn small danger" data-act="tmOff" data-id="' + esc(z.member) + '">Quitar acceso</button></div>' : '<div class="tm-ctl"><button class="btn small" data-act="tmOn" data-id="' + esc(z.member) + '">Devolver acceso</button></div>') + '</div>').join('') + '</div>' : '<div class="empty">Todavía no creaste usuarios.</div>';
    if (TEAM.invites.length) x += '<h3 style="margin-top:14px">Invitaciones sin usar</h3><div class="tm-list">' + TEAM.invites.map(i => '<div class="tm-row"><div class="tm-who"><b>' + esc(i.name || RN[i.role]) + '</b><span>' + esc(RN[i.role] || i.role) + (i.sede && sedeName(i.sede) ? ' · ' + esc(sedeName(i.sede)) : '') + ' · vence el ' + A.fmtDMY(String(i.expires_at).slice(0, 10)) + '</span></div><div class="tm-ctl"><a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waText(i)) + '">WhatsApp</a><button class="btn small" data-act="tmCopy" data-code="' + esc(i.code) + '">Copiar</button><button class="btn small ghost" data-act="tmRevoke" data-code="' + esc(i.code) + '">Cancelar</button></div></div>').join('') + '</div>';
    x += '<p class="hint" style="margin-top:12px">Cada persona usa uno de los equipos de tu plan. El servidor controla lo que puede ver: la recepción y los profesionales no pueden bajar las liquidaciones, los sueldos, la caja general ni los datos de otros consultorios. Los pacientes y la agenda del consultorio son compartidos (es lo que necesitan para trabajar).</p>';
    return x;
  }
  MF.team = () => A.modalShell('Usuarios del equipo', teamHTML(), '<button class="btn" data-act="closeModal">Cerrar</button>', true);
  A.ins.tmF = el => {
    const f = S.tmForm || (S.tmForm = {}), k = el.getAttribute('data-k'); f[k] = el.value;
    if (k === 'name' && !f.userTouched) { f.user = sugUser(el.value); const u = $('#tmUser'); if (u) u.value = f.user; }
    if (k === 'user') f.userTouched = true;
  };
  A.chg.tmF = el => {
    const f = S.tmForm || (S.tmForm = {}), k = el.getAttribute('data-k'); f[k] = el.value;
    const nm = $('#tmName'); if (nm) f.name = nm.value;
    if (k === 'role') { if (f.role === 'admin') f.sede = isEmp() ? '' : f.sede; else if (!f.sede) f.sede = (sedes()[0] || {}).id || ''; }
    paintTeam();
  };
  A.acts.tmAnother = () => { NEWINV = null; NEWSUB = null; S.tmForm = null; paintTeam(); };
  A.acts.tmNew = async el => {
    const f = S.tmForm || {}, msg = $('#tmMsg'), nm = $('#tmName'); if (nm) f.name = nm.value.trim();
    const say = t => { if (msg) msg.textContent = t; };
    if (!real()) return say('Para invitar personas, ingresá con tu cuenta en la nube.');
    if (!f.name) return say('Escribí el nombre de la persona.');
    if (f.role !== 'admin' && isEmp() && !f.sede) return say('Elegí el ' + LW() + ' donde trabaja.');
    if (f.role === 'profesional' && !f.pro) return say('Elegí qué profesional es.');
    if (S.tmMode !== 'mail') {
      const ui = $('#tmUser'), pi = $('#tmPass'); if (ui) f.user = noAcc(ui.value).trim(); if (pi) f.pass = pi.value.trim();
      if (!/^[a-z0-9]([a-z0-9._-]{1,28}[a-z0-9])$/.test(f.user || '') || /\.\./.test(f.user)) return say('El usuario lleva de 3 a 30 letras minúsculas, números, punto o guion, sin espacios (ej.: marta.gomez).');
      if ((f.pass || '').length < 6) return say('La contraseña necesita al menos 6 caracteres.');
      el.disabled = true; say('Creando…');
      try {
        const r = await rpc('ov_sub_create', { p_name: f.name, p_user: f.user, p_pass: f.pass, p_role: f.role, p_sede: manyLocs() ? (f.sede || null) : null, p_pro: f.pro || null });
        if (!r || !r.ok) { el.disabled = false; return say((r && r.msg) || 'No se pudo.'); }
        NEWSUB = { name: f.name, code: r.code, user: r.user, pass: f.pass };
        if (A.empAudit) A.empAudit('Creó el usuario ' + r.user + ' para ' + f.name + ' (' + RN[f.role] + ').');
        S.tmForm = null; loadTeam(); paintTeam();
      } catch (e) { el.disabled = false; say(noServer(e) ? 'Falta actualizar el servidor: corré subusuarios.sql en Supabase.' : e.message || 'Sin conexión.'); }
      return;
    }
    el.disabled = true; say('Creando…');
    try {
      const r = await rpc('ov_invite_create', { p_role: f.role, p_sede: manyLocs() ? (f.sede || null) : null, p_pro: f.pro || null, p_name: f.name });
      if (!r || !r.ok) { el.disabled = false; return say((r && r.msg) || 'No se pudo.'); }
      NEWINV = { code: r.code, role: f.role, sede: manyLocs() ? f.sede : null, name: f.name };
      if (A.empAudit) A.empAudit('Invitó a ' + f.name + ' como ' + RN[f.role] + '.');
      loadTeam(); paintTeam();
    } catch (e) { el.disabled = false; say(noServer(e) ? 'Falta actualizar el servidor (equipo.sql).' : e.message || 'Sin conexión.'); }
  };
  A.acts.tmCopy = async el => {
    const t = invLink(el.getAttribute('data-code'));
    try { await navigator.clipboard.writeText(t); A.toast('Enlace copiado.'); } catch (e) { const i = document.querySelector('.tm-link'); if (i) { i.select(); try { document.execCommand('copy'); A.toast('Enlace copiado.'); } catch (x) { A.toast(t); } } else A.toast(t); }
  };
  A.acts.tmRevoke = async el => { try { await rpc('ov_invite_revoke', { p_code: el.getAttribute('data-code') }); A.toast('Invitación cancelada.'); } catch (e) { A.toast(e.message || 'Sin conexión.'); } loadTeam(); };
  async function setMember(id, patch, okMsg) {
    try {
      const r = await rpc('ov_member_set', Object.assign({ p_member: id, p_role: null, p_sede: null, p_pro: null, p_active: null }, patch));
      if (!r || !r.ok) A.toast((r && r.msg) || 'No se pudo.'); else if (okMsg) A.toast(okMsg);
    } catch (e) { A.toast(e.message || 'Sin conexión.'); }
    loadTeam();
  }
  const memberOf = id => (TEAM && TEAM.members || []).filter(z => z.member === id)[0] || {};
  A.chg.tmSet = el => {
    const id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), v = el.value, z = memberOf(id), p = {};
    if (k === 'role') { p.p_role = v; if (v !== 'admin' && isEmp() && !z.sede && sedes()[0]) p.p_sede = sedes()[0].id; }
    if (k === 'sede') p.p_sede = v;
    if (k === 'pro') p.p_pro = v;
    if (A.empAudit) A.empAudit('Cambió ' + (k === 'role' ? 'el puesto' : k === 'sede' ? 'el ' + LW() : 'el profesional') + ' de ' + (z.name || z.email) + '.');
    setMember(id, p, 'Listo. Se aplica en su equipo en menos de un minuto.');
  };
  A.acts.tmOff = el => { const z = memberOf(el.getAttribute('data-id')); S.modal = { type: 'tmOffAsk', id: z.member, name: z.name || z.email }; A.renderModal(); };
  MF.tmOffAsk = m => A.modalShell('Quitar acceso', '<p>¿Le quitás el acceso a <b>' + esc(m.name) + '</b>?</p><p class="hint">Deja de ver los datos al instante, se desconectan sus equipos y en esos equipos se borra lo que había del consultorio. Lo que cargó queda guardado. Podés devolverle el acceso cuando quieras.</p>', '<button class="btn" data-act="teamOpen">Volver</button><button class="btn danger" data-act="tmOffGo" data-id="' + esc(m.id) + '">Quitar acceso</button>');
  A.acts.tmOffGo = el => { const id = el.getAttribute('data-id'), z = memberOf(id); if (A.empAudit) A.empAudit('Quitó el acceso a ' + (z.name || z.email) + '.'); S.modal = { type: 'team' }; A.renderModal(); setMember(id, { p_active: false }, 'Acceso quitado.'); };
  A.acts.tmOn = el => setMember(el.getAttribute('data-id'), { p_active: true }, 'Acceso devuelto.');

  /* también en Empresa › Personal */
  const rePrev = A.render.empresa;
  if (rePrev) A.render.empresa = () => {
    rePrev();
    if (!isEmp() || (S.empTab || 'resumen') !== 'personal' || !isOwner()) return;
    const body = document.querySelector('#view-empresa .emp-body'); if (!body) return;
    body.insertAdjacentHTML('afterbegin', '<section class="card tm-card"><h2>Usuarios del equipo</h2><p class="hint" style="margin-top:0">La forma recomendada: cada persona entra con su propio correo y contraseña, gratis, y ve solo lo de su puesto y su consultorio. El PIN de abajo sirve para una compu compartida que usa tu cuenta.</p><div id="tmEmp">' + teamHTML() + '</div></section>');
    if (!TEAM && !teamBusy) loadTeam();
    /* atajo: invitar a alguien que ya está en la lista del personal */
    body.querySelectorAll('[data-act="empPerEdit"][data-id]').forEach(btn => { const id = btn.getAttribute('data-id'); if (id) btn.insertAdjacentHTML('beforebegin', '<button class="btn small" data-act="tmFromPer" data-id="' + esc(id) + '" style="margin-right:6px">Invitar</button>'); });
  };
  A.acts.tmFromPer = el => {
    const p = ((A.EMP && A.EMP.staff.people) || []).filter(x => x.id === el.getAttribute('data-id'))[0]; if (!p) return;
    const r = ['admin', 'recepcion', 'profesional', 'asistente'].indexOf(p.role) >= 0 ? p.role : 'recepcion';
    S.tmForm = { role: r, sede: p.sede || (r === 'admin' ? '' : (sedes()[0] || {}).id || ''), pro: p.pro || '', name: p.name };
    NEWINV = null; paintTeam();
    const h = $('#tmEmp'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.inv-box{display:flex;flex-direction:column;gap:4px;background:var(--accent-soft,#e6f3f3);border:1px solid var(--accent,#0b6b6f);border-radius:12px;padding:12px 14px;font-size:14px;text-align:left}.inv-box b{font-size:15px}.inv-box .linkbtn{align-self:flex-start}' +
    '.login-card .chk{display:block;position:relative;padding-left:30px;line-height:1.4;text-align:left}.login-card .chk input{position:absolute;left:0;top:1px;margin:0}' +
    '.mb-line{display:block;font-size:13px;color:var(--muted,#5a6b6c)}' +
    '.tm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 12px}.tm-grid .field{margin:0}' +
    '.tm-form h3,.tm-card h3,#modalHost .m-body h3{font-size:15px;margin:0 0 8px}' +
    '.tm-new{background:var(--accent-soft,#e6f3f3);border-radius:12px;padding:12px}.tm-link{width:100%;font-family:var(--mono,monospace);font-size:13px;margin:6px 0}' +
    '.tm-list{display:flex;flex-direction:column;gap:8px}.tm-row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;border:1px solid var(--line,#dde5e5);border-radius:12px;padding:10px 12px}.tm-row.off{opacity:.6}' +
    '.tm-who{display:flex;flex-direction:column;min-width:0;flex:1 1 200px}.tm-who span{font-size:13px;color:var(--muted,#5a6b6c);overflow-wrap:anywhere}.tm-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.tm-ctl select{max-width:180px;min-height:36px}' +
    'body.mb-on [data-act="role"],body.mb-on [data-act="modeOpen"],body.mb-on [data-act="changeAccount"],body.mb-on [data-act="reqOpen"],body.mb-on [data-act="planOpen"],body.mb-on [data-act="licOpen"],body.mb-on [data-act="empOn"],body.mb-on [data-act="empTryScope"]{display:none!important}' +
    'body.mb-on:not(.mb-admin) [data-act="cfgOpen"],body.mb-on:not(.mb-admin) [data-act="importOpen"],body.mb-on:not(.mb-admin) [data-act="tnOpen"],body.mb-on:not(.mb-admin) [data-tab="liq"],body.mb-on:not(.mb-admin) [data-tab="empresa"],body.mb-recepcion [data-act="catalogOpen"],body.mb-asistente [data-act="catalogOpen"],body.mb-profesional [data-tab="caja"],body.mb-asistente [data-tab="caja"]{display:none!important}' +
    '</style>');
})();
