/* ===== 1.58: cancelaciones del turnero online: cuando el paciente cancela con su código y DNI, el turno pasa a «Canceló», se libera el horario y se avisa ===== */
(function () {
  'use strict';
  const A = window.App, CL = A.cloud;
  if (!CL || !CL.api || !A.setStatus || !A.tnPublish) return;
  const real = () => !!(CL.session && CL.conf && CL.conf() && !A.DEMO && !CL.readonly);
  let busy = false;
  A.tnClaimCancels = async () => {
    if (busy || !real() || navigator.onLine === false) return;
    busy = true;
    try {
      let rows = []; try { rows = await CL.api('/rest/v1/rpc/ov_booking_claim_cancels', { method: 'POST', body: {} }) || []; } catch (e) { return; }
      if (!rows.length) return;
      rows.forEach(r => {
        const d = r.data || {}, nm = [d.first, d.last].filter(Boolean).join(' ') || 'Un paciente', when = d.date && A.fmtShort ? A.fmtShort(d.date) + ' ' + A.mm(+d.start || 0) : '';
        let hit = null; try { hit = d.date ? (A.day(d.date) || []).filter(a => a && a.code === r.code && a.status !== 'cancelado')[0] : null; } catch (e) { hit = null; }
        if (hit) A.setStatus(hit.id, 'cancelado');
        const why = d.cancel && d.cancel.reason ? ' Motivo: ' + String(d.cancel.reason).slice(0, 120) : '';
        const txt = nm + ' canceló su turno online' + (when ? ' (' + when + ')' : '') + (hit ? ': ya quedó como «Canceló» en la agenda.' : '.') + why;
        if (A.nfAdd) A.nfAdd({ id: 'tncancel:' + r.id, k: 'info', t: 'Canceló un turno: ' + nm, b: txt, act: '' });
        A.toast(txt);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Canceló un turno', { body: nm + (when ? ' · ' + when : ''), icon: 'icon-192.png', tag: 'ov-cancel-' + r.id }); } catch (e) { /* nada */ }
      });
      A.saveNow(); A.refresh(); A.tnPublish(true);
    } finally { busy = false; }
  };
  setInterval(() => { A.tnClaimCancels(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) A.tnClaimCancels(); });
  setTimeout(() => { A.tnClaimCancels(); }, 8000);
})();
