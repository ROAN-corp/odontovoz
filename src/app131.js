/* ===== 1.48: avisos con la app cerrada en iPhone, iPad, PC y Android sin el APK (Web Push) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, CL = A.cloud, MF = A.modalFns, esc = A.esc;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } };
  const ios = () => (A.isIOS ? A.isIOS() : /iPhone|iPad|iPod/.test(navigator.userAgent || ''));
  /* el APK ya tiene sus avisos (Firebase); acá es para el navegador y la app instalada desde Safari/Chrome */
  const supported = () => { try { return !window.OV_NATIVE && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && /^https?:$/.test(location.protocol); } catch (e) { return false; } };
  const url = () => ((window.OV_CONFIG && window.OV_CONFIG.supabaseUrl) || '') + '/functions/v1/push-hook';
  const perm = () => { try { return Notification.permission; } catch (e) { return 'denied'; } };
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  let ok = false, busy = false, why = '';
  A.wpushOn = () => supported() && ok;

  /* lo que ya avisa el servidor no se repite con el aviso local */
  const covPrev = A.pushCovers;
  A.pushCovers = ex => (covPrev ? covPrev(ex) : false) || (A.wpushOn() && !!ex && (!!ex.appt || /^(onl|stk|nota):/.test(ex.nf || '')));

  const sig = sub => [A.ownerId ? A.ownerId() : '', (A.notifPref ? A.notifPref().pro : '') || '', sub.endpoint, A.today()].join('|');
  async function getKey() {
    const r = await fetch(url()); const j = await r.json();
    if (!j || !j.ok || !j.key) throw new Error('El servidor todavía no tiene los avisos web activados.');
    return j.key;
  }
  async function ensureSub(create) {
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub && create) { const key = await getKey(); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }); }
    return sub;
  }
  async function save(sub, force) {
    if (!sub || !CL || !CL.session || A.DEMO) return false;
    if (!force && LS.get('odontovoz.wpReg', '') === sig(sub)) { ok = true; return true; }
    const j = sub.toJSON(), k = j.keys || {};
    const r = await CL.api('/rest/v1/rpc/ov_wpush_register', { method: 'POST', body: { p_device: A.devId(), p_endpoint: j.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_filter_pro: (A.notifPref ? A.notifPref().pro : '') || '' } });
    if (r && r.ok) { ok = true; LS.set('odontovoz.wpReg', sig(sub)); return true; }
    return false;
  }
  /* al abrir la app: si ya dio el permiso, se asegura de que la suscripción siga anotada */
  let lastSync = 0;
  async function sync(force) {
    if (!supported() || perm() !== 'granted' || !CL || !CL.session || A.DEMO || busy || LS.get('odontovoz.wpOff', '')) return;
    if (!force && Date.now() - lastSync < 60000) return; lastSync = Date.now();
    busy = true;
    try { const sub = await ensureSub(true); if (sub) await save(sub, force); } catch (e) { why = String((e && e.message) || e); } finally { busy = false; }
  }
  A.acts.wpEnable = async () => {
    if (!supported()) return;
    if (ios() && !standalone()) { A.acts.pwaInstall && A.acts.pwaInstall(); return; }
    try {
      LS.set('odontovoz.wpOff', null);
      const p = await Notification.requestPermission(); /* en iPhone tiene que pedirse directo desde el toque */
      if (p !== 'granted') { A.toast(p === 'denied' ? 'No diste el permiso. Podés activarlo en Ajustes del teléfono › Notificaciones › OdontoVoz.' : 'No se activó.'); A.renderModal(); return; }
      const sub = await ensureSub(true); const good = await save(sub, true);
      A.toast(good ? 'Listo: te van a llegar los avisos aunque la app esté cerrada.' : 'Se activó el permiso, pero no se pudo anotar este equipo. Probá de nuevo con internet.');
    } catch (e) { why = String((e && e.message) || e); A.toast(why.length < 120 ? why : 'No se pudieron activar los avisos.'); }
    A.renderModal();
  };
  A.acts.wpDisable = async () => {
    try {
      const sub = await ensureSub(false); if (sub) await sub.unsubscribe();
      if (CL && CL.session) await CL.api('/rest/v1/rpc/ov_wpush_unregister', { method: 'POST', body: { p_device: A.devId() } });
    } catch (e) { /* igual queda apagado */ }
    ok = false; LS.set('odontovoz.wpReg', null); LS.set('odontovoz.wpOff', '1'); A.toast('Avisos con la app cerrada desactivados en este equipo.'); A.renderModal();
  };

  /* al tocar un aviso: abre el turno o la pantalla que corresponde */
  function open(d) {
    d = d || {};
    setTimeout(() => {
      try {
        if (d.appt) { S.modal = null; A.renderModal(); S.panel = { type: 'appt', id: d.appt }; A.renderPanel(); return; }
        if (d.nf && A.acts.nfGo && A.nfRead) { A.acts.nfGo({ getAttribute: () => d.nf }); }
        if (d.act && A.acts[d.act]) { A.acts[d.act]({ getAttribute: () => null, closest: () => null, value: '' }); return; }
        if (!d.nf && A.acts.nfToggle) A.acts.nfToggle();
      } catch (e) { /* nada */ }
    }, 600);
  }
  if (supported()) {
    navigator.serviceWorker.addEventListener('message', ev => {
      const m = ev && ev.data; if (!m) return;
      if (m.type === 'ov-push') open(m.data); else if (m.type === 'ov-push-renew') { LS.set('odontovoz.wpReg', null); sync(true); }
    });
    try { const u = new URL(location.href), q = u.searchParams.get('ovp'); if (q) { u.searchParams.delete('ovp'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); open(JSON.parse(q)); } } catch (e) { /* nada */ }
  }

  /* al cambiar de lugar o de «Avisarme de los pacientes de…», se vuelve a anotar; al cerrar sesión, se borra */
  const prevAR = A.afterRefresh;
  A.afterRefresh = function () { const r = prevAR && prevAR.apply(this, arguments); setTimeout(() => { sync(); }, 4000); return r; };
  if (A.notifPrefSave) { const prevSave = A.notifPrefSave; A.notifPrefSave = function () { const r = prevSave.apply(this, arguments); setTimeout(() => sync(true), 400); return r; }; }
  if (CL && CL.signOut) {
    const prevOut = CL.signOut;
    CL.signOut = async function () {
      if (supported() && ok) { try { await Promise.race([CL.api('/rest/v1/rpc/ov_wpush_unregister', { method: 'POST', body: { p_device: A.devId() } }), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* igual se cierra */ } }
      LS.set('odontovoz.wpReg', null); ok = false;
      return prevOut.apply(this, arguments);
    };
  }

  /* una sola vez, en el iPhone con la app instalada: invitación a activar los avisos (hace falta un toque del usuario) */
  const nudge = () => {
    if (!supported() || A.DEMO || !CL || !CL.session || perm() !== 'default' || LS.get('odontovoz.wpAsked', '')) return;
    if (ios() && !standalone()) return;
    if (A.nfAdd) { LS.set('odontovoz.wpAsked', '1'); A.nfAdd({ id: 'wpush:ask', k: 'update', t: 'Activá los avisos con la app cerrada', b: 'Que te llegue al celular cuando llega un paciente, cancelan un turno o piden uno online. Tocá para activarlos.', act: 'notifOpen', args: {} }); }
  };
  setTimeout(nudge, 9000);

  /* en «Avisos y sonidos» */
  const prevMF = MF.notif;
  if (prevMF) MF.notif = function () {
    let h = prevMF.apply(this, arguments);
    if (!supported()) {
      if (window.OV_NATIVE || !ios()) return h;
      return h.replace('<p class="small-note">El aviso se ve', '<p class="small-note">Avisos con la app cerrada: este iPhone o iPad es muy viejo (hace falta iOS 16.4 o más nuevo).</p><p class="small-note">El aviso se ve');
    }
    const on = A.wpushOn() && perm() === 'granted' && !LS.get('odontovoz.wpOff', '');
    let blk;
    if (ios() && !standalone()) blk = '<div class="wp-box"><b>Avisos con la app cerrada</b><p>Para recibirlos en el iPhone, primero instalá OdontoVoz en la pantalla de inicio y abrila desde ese ícono.</p><div class="row-btns"><button class="btn small primary" data-act="pwaInstall">Cómo instalarla</button></div></div>';
    else if (perm() === 'denied') blk = '<div class="wp-box"><b>Avisos con la app cerrada</b><p>Los bloqueaste en este equipo. Para activarlos: Ajustes del teléfono › Notificaciones › OdontoVoz (o los permisos del sitio en la PC) y permití las notificaciones.</p></div>';
    else if (on) blk = '<div class="wp-box wp-on"><b>✓ Con la app cerrada también te llegan</b><p>Llegó un paciente, cancelaciones, notas de otros, stock bajo y turnos online.</p><div class="row-btns"><button class="btn small ghost" data-act="wpDisable">Desactivar en este equipo</button></div></div>';
    else blk = '<div class="wp-box"><b>Avisos con la app cerrada</b><p>Activalos para que te lleguen al celular aunque OdontoVoz no esté abierta: llegó un paciente, cancelaciones, notas de otros, stock bajo y turnos online.</p>' + (why ? '<p class="hint bad">' + esc(why) + '</p>' : '') + '<div class="row-btns"><button class="btn small primary" data-act="wpEnable">Activar avisos con la app cerrada</button></div></div>';
    const m = '<p class="small-note">El aviso se ve';
    if (h.indexOf(m) >= 0) h = h.replace(m, blk + m); else h = h.replace('<div class="m-body">', '<div class="m-body">' + blk);
    if (on) h = h.replace('Para que llegue, OdontoVoz tiene que estar abierta o en segundo plano en este equipo.', 'Con los avisos de la app cerrada activados, llegan aunque OdontoVoz esté cerrada.');
    return h;
  };

  const css = document.createElement('style'); css.id = 'ovApp131';
  css.textContent = '.wp-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 12px;background:var(--surface-2)}.wp-box p{margin:4px 0 8px;font-size:.9rem;line-height:1.4;color:var(--ink-2)}.wp-on{border-color:var(--ok)}.wp-on b{color:var(--ok)}';
  document.head.appendChild(css);
})();
