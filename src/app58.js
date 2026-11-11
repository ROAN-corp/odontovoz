/* ===== 1.45.2: los avisos de la casilla también llegan a la barra de notificaciones del teléfono; tocar la notificación abre el aviso ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const NL = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  /* ya avisan solos (llegó, turno online) o no hace falta molestar (novedades, versión nueva, sugerencia de copia) */
  const SKIP = /^(llego|online|news|update|info)$/;
  const pref = () => (A.notifPref ? A.notifPref() : {});
  const away = () => document.hidden || !document.hasFocus();

  const prevAdd = A.nfAdd;
  if (prevAdd) {
    A.nfAdd = n => {
      const isNew = prevAdd(n);
      try {
        if (isNew && A.sysNotify && !SKIP.test(n.k || 'info') && pref().system && away()) {
          const fresh = !n.at || Date.now() - new Date(n.at).getTime() < 6 * 3600e3;
          if (fresh) A.sysNotify(n.t, n.b || 'Tocá para ver el aviso en OdontoVoz.', { nf: n.id });
        }
      } catch (e) { /* nada */ }
      return isNew;
    };
  }

  /* tocar la notificación: se abre la app en ese aviso */
  function onTap(x) {
    const ex = (x && x.notification && x.notification.extra) || {};
    setTimeout(() => {
      try {
        if (ex.appt && A.acts.arrOpen) { S.modal = null; A.renderModal(); S.panel = { type: 'appt', id: ex.appt }; A.renderPanel(); return; }
        if (ex.nf && A.acts.nfGo) { A.acts.nfGo({ getAttribute: () => ex.nf }); return; }
        if (A.acts.nfToggle) A.acts.nfToggle();
      } catch (e) { /* nada */ }
    }, 400);
  }
  const ln = NL();
  if (ln && ln.addListener) { try { ln.addListener('localNotificationActionPerformed', onTap); } catch (e) { /* nada */ } }

  /* en el teléfono, con cuenta: pedir el permiso de notificaciones una sola vez (Android 13+ lo exige) */
  let asked = false;
  const ask = async () => {
    if (asked || !ln || !A.cloud || !A.cloud.session || A.DEMO) return; asked = true;
    if (LS.get('odontovoz.notifAsked', '') === '1') return;
    LS.set('odontovoz.notifAsked', '1');
    try {
      const c = ln.checkPermissions ? await ln.checkPermissions() : null;
      if (!c || c.display !== 'granted') { const r = await ln.requestPermissions(); if (r && r.display !== 'granted') A.toast('Las notificaciones quedaron apagadas. Podés activarlas en Ajustes › Avisos y sonidos.'); }
    } catch (e) { /* nada */ }
  };
  const prevAR = A.afterRefresh;
  A.afterRefresh = function () { const r = prevAR && prevAR.apply(this, arguments); setTimeout(ask, 3000); return r; };
})();
