/* ===== 1.47: notificaciones push con la app cerrada (Firebase): registrar el teléfono y abrir el aviso al tocarlo ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, CL = A.cloud, MF = A.modalFns;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const PN = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  /* solo en el APK armado con Firebase (sin google-services.json, registrar cierra la app) */
  const can = () => !!(window.OV_NATIVE && window.OV_PUSH && PN());
  let token = LS.get('odontovoz.pushTok', '') || '', ok = false;
  A.pushOn = () => can() && ok;
  /* lo que ya avisa el servidor no se repite con el aviso local del teléfono */
  A.pushCovers = ex => A.pushOn() && !!ex && (!!ex.appt || /^(onl|stk|nota):/.test(ex.nf || ''));

  const sig = () => [A.ownerId ? A.ownerId() : '', (A.notifPref ? A.notifPref().pro : '') || '', token, A.today()].join('|');
  async function save(force) {
    if (!token || !CL || !CL.session || A.DEMO) return;
    if (!force && LS.get('odontovoz.pushReg', '') === sig()) { ok = true; return; }
    try {
      const r = await CL.api('/rest/v1/rpc/ov_push_register', { method: 'POST', body: { p_device: A.devId(), p_token: token, p_filter_pro: (A.notifPref ? A.notifPref().pro : '') || '' } });
      if (r && r.ok) { ok = true; LS.set('odontovoz.pushReg', sig()); }
    } catch (e) { /* sin internet o sin el SQL: se reintenta en la próxima vuelta */ }
  }
  let started = false;
  async function start() {
    if (started || !can() || !CL || !CL.session || A.DEMO) return; started = true;
    const pn = PN();
    try {
      if (pn.createChannel) await pn.createChannel({ id: 'ov-avisos', name: 'Avisos de OdontoVoz', description: 'Llegó un paciente, turnos online, stock, laboratorio y otros avisos', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#0B6B6F' }).catch(() => null);
      let p = await pn.checkPermissions();
      if (p.receive === 'prompt' || p.receive === 'prompt-with-rationale') p = await pn.requestPermissions();
      if (p.receive !== 'granted') return;
      await pn.register();
    } catch (e) { if (A.logError) A.logError('push', e); }
  }
  if (can()) {
    const pn = PN();
    pn.addListener('registration', t => { if (t && t.value) { token = t.value; LS.set('odontovoz.pushTok', token); save(); } });
    pn.addListener('registrationError', e => { if (A.logError) A.logError('push', e); });
    pn.addListener('pushNotificationActionPerformed', x => {
      const d = (x && x.notification && x.notification.data) || {};
      setTimeout(() => {
        try {
          if (d.appt) { S.modal = null; A.renderModal(); S.panel = { type: 'appt', id: d.appt }; A.renderPanel(); return; }
          if (d.nf && A.acts.nfGo && A.nfRead) { A.acts.nfGo({ getAttribute: () => d.nf }); }
          if (d.act && A.acts[d.act]) { A.acts[d.act]({ getAttribute: () => null, closest: () => null, value: '' }); return; }
          if (!d.nf && A.acts.nfToggle) A.acts.nfToggle();
        } catch (e) { /* nada */ }
      }, 600);
    });
  }
  A.acts.onlInbox = () => { if (A.acts.nfToggle) A.acts.nfToggle(); };

  /* al cambiar de lugar o de «Avisarme de los pacientes de…», se vuelve a anotar; al cerrar sesión, se borra */
  const prevAR = A.afterRefresh;
  A.afterRefresh = function () { const r = prevAR && prevAR.apply(this, arguments); setTimeout(() => { start(); save(); }, 3500); return r; };
  if (A.notifPrefSave) { const prevSave = A.notifPrefSave; A.notifPrefSave = function () { const r = prevSave.apply(this, arguments); setTimeout(() => save(true), 300); return r; }; }
  if (CL && CL.signOut) {
    const prevOut = CL.signOut;
    CL.signOut = async function () {
      if (A.pushOn()) { try { await Promise.race([CL.api('/rest/v1/rpc/ov_push_unregister', { method: 'POST', body: { p_device: A.devId() } }), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* igual se cierra */ } }
      LS.set('odontovoz.pushReg', null);
      return prevOut.apply(this, arguments);
    };
  }

  /* en «Avisos y sonidos», el estado */
  const prevMF = MF.notif;
  if (prevMF) MF.notif = function () {
    let h = prevMF.apply(this, arguments);
    if (!window.OV_NATIVE) return h;
    const line = A.pushOn() ? '<p class="small-note"><b>✓ Con la app cerrada también te llegan</b> (llegó un paciente, cancelaciones, notas de otros, stock bajo y turnos online).</p>'
      : can() ? '<p class="small-note">Avisos con la app cerrada: falta el permiso de notificaciones o la conexión. Revisá los ajustes del teléfono › Apps › OdontoVoz › Notificaciones.</p>' : '';
    if (line) h = h.replace('<p class="small-note">El aviso se ve', line + '<p class="small-note">El aviso se ve');
    return h;
  };
})();
