/* ===== 1.57: uso de la aplicación (solo contadores, sin datos de pacientes): se manda de vez en cuando para que ROAN sepa si la cuenta la usa ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, CL = A.cloud;
  if (!CL || !CL.api) return;
  const KEY = 'odontovoz.usage';
  const ld = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const sv = u => { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) { /* nada */ } };
  /* totales actuales de cosas que la persona carga (turnos, pacientes, notas, cobros, fotos, documentos) */
  A.usageSnap = () => {
    const t = { turno: 0, paciente: 0, nota: 0, cobro: 0, foto: 0, doc: 0 };
    try {
      Object.keys(S.days || {}).forEach(k => { (S.days[k] || []).forEach(a => { if (a && a.type !== 'block' && !a.demo) t.turno++; }); });
      t.paciente = (A.PATS || []).length;
      Object.keys(S.pd || {}).forEach(id => { const pd = S.pd[id] || {}; t.nota += (pd.notes || []).length; t.cobro += (pd.ledger || []).filter(e => e && e.type === 'pago' && !e.voided).length; t.foto += (pd.images || []).length; t.doc += (pd.docs || []).length; });
    } catch (e) { /* nada */ }
    return t;
  };
  const bump = k => { const u = ld(); u.ev = u.ev || {}; u.ev[k] = (u.ev[k] || 0) + 1; sv(u); };
  /* cosas que se hacen sin guardar datos: voz, PDF, WhatsApp */
  if (A.cmd && A.cmd.exec) { const p = A.cmd.exec; A.cmd.exec = function () { bump('voz'); return p.apply(this, arguments); }; }
  if (A.saveFile) { const p = A.saveFile; A.saveFile = function () { bump('pdf'); return p.apply(this, arguments); }; }
  if (A.waOpen) { const p = A.waOpen; A.waOpen = function () { bump('wa'); return p.apply(this, arguments); }; }
  let busy = false;
  A.usageFlush = async force => {
    if (busy || !CL.session || A.DEMO || (A.CFG && A.CFG.demo) || (CL.readonly && !force) || navigator.onLine === false) return false;
    const u = ld(), now = A.snapNow ? A.snapNow() : A.usageSnap(), day = A.today(), counts = {};
    if (u.snap) Object.keys(now).forEach(k => { const d = (now[k] || 0) - (u.snap[k] || 0); if (d > 0 && d <= 300) counts[k] = d; });
    Object.keys(u.ev || {}).forEach(k => { if (u.ev[k] > 0) counts[k] = Math.min(u.ev[k], 9999); });
    if (u.day === day && !Object.keys(counts).length && !force) return true;
    busy = true;
    try {
      await CL.api('/rest/v1/rpc/ov_usage_add', { method: 'POST', body: { p_day: day, p_counts: counts } });
      u.snap = now; u.ev = {}; u.day = day; sv(u); return true;
    } catch (e) { if (!u.snap) { u.snap = now; sv(u); } return false; } finally { busy = false; }
  };
  /* un rato después de abrir y cada media hora */
  setTimeout(() => { A.usageFlush(); }, 25000);
  setInterval(() => { A.usageFlush(); }, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') A.usageFlush(); });
})();
